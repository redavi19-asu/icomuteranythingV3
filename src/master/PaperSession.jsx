import React,{useEffect,useRef,useState} from 'react';
const API=import.meta.env.VITE_ICA_MASTER_API_URL||'https://ica-master-platform.ryanedavis.workers.dev';
const money=n=>Number.isFinite(n)?'$'+n.toFixed(2):'—';
const time=n=>n?new Date(n).toLocaleTimeString('en-US',{timeZone:'America/New_York'}):'Not checked yet';
// Original three-strike exchange-style bell (no downloaded sound or copyrighted recording).
function ringOpportunityBell(ctx){
 if(!ctx||ctx.state!=='running')return;
 const start=ctx.currentTime+0.02;
 [0,0.34,0.68].forEach((offset,i)=>{
  const note=start+offset;
  [[740,0.45],[1120,0.26],[1660,0.10]].forEach(([frequency,volume])=>{
   const oscillator=ctx.createOscillator(),gain=ctx.createGain();
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency*(i===1?1.018:1),note);
   gain.gain.setValueAtTime(0,note);
   gain.gain.linearRampToValueAtTime(volume*0.22,note+0.014);
   gain.gain.exponentialRampToValueAtTime(0.0001,note+1.1);
   oscillator.connect(gain);gain.connect(ctx.destination);
   oscillator.start(note);oscillator.stop(note+1.12);
  });
 });
}
export default function PaperSession({connected}){
 const [s,setS]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());
 const [budgetDraft,setBudgetDraft]=useState('350'),[symbolsDraft,setSymbolsDraft]=useState(''),[settingsDirty,setSettingsDirty]=useState(false);
 const lock=useRef(false);
 const [showAlerts,setShowAlerts]=useState(true);
 const [showPosition,setShowPosition]=useState(false),[exitFeedback,setExitFeedback]=useState('');
 const [tradeFeedback,setTradeFeedback]=useState(null);
 const seenAlerts=useRef(null);
 const audioRef=useRef(null);
 const [soundOn,setSoundOn]=useState(false);
 const [soundWarning,setSoundWarning]=useState('');
 async function toggleAlertSound(){
  if(soundOn){setSoundOn(false);setSoundWarning('');return;}
  try{
   const Constructor=window.AudioContext||window.webkitAudioContext;
   if(!Constructor)throw Error('This browser does not support audio alerts.');
   if(!audioRef.current)audioRef.current=new Constructor();
   await audioRef.current.resume();
   if(audioRef.current.state!=='running')throw Error('Sound blocked. Tap Enable Bell again and check device volume.');
   setSoundOn(true);setSoundWarning('');ringOpportunityBell(audioRef.current);
  }catch(e){setSoundOn(false);setSoundWarning(e.message||'Could not enable audio.');}
 }
 useEffect(()=>()=>{audioRef.current?.close().catch(()=>{});audioRef.current=null},[]);
 async function call(action,id){const token=localStorage.getItem('ica_master_token');const r=await fetch(API+'/platform/paper',{method:action?'POST':'GET',headers:{Authorization:'Bearer '+token,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify({action,...(action==='settings'&&id&&typeof id==='object'?id:{id})})}:{})});const d=await r.json();if(!r.ok){const ex=Error(d.error||'Paper server unavailable.');ex.code=d.code||null;ex.serverState=d.status||null;throw ex;}return d}
 async function act(action,id){
  if(lock.current&&!['pause','close'].includes(action))return;
  lock.current=true;setBusy(true);setError('');
  if(action==='accept')setTradeFeedback({id,message:'Refreshing contract quote and checking paper entry…',kind:'checking'});
  if(action==='close')setExitFeedback('Requesting a fresh bid and simulated exit…');
  try{
   const data=await call(action,id);setS(data);
   if(action==='settings')setSettingsDirty(false);
   if(action==='accept'){setTradeFeedback({id,message:'Paper entry accepted. The simulated position is now being managed.',kind:'success'});setShowAlerts(false);setShowPosition(true);setExitFeedback('')}
   if(action==='close')setExitFeedback(data.paper?.position?'Paper exit requested. '+(data.lastError||'Waiting for a valid fresh positive bid. Protective management continues.'):'Paper position closed. New setup scanning is paused.');
   if(action==='dismiss'||action==='skip')setTradeFeedback(current=>current?.id===id?null:current);
  }catch(e){
   setError(e.message);
   if(action==='accept')setTradeFeedback({id,message:e.message,kind:'error'});
   if(action==='close')setExitFeedback('Exit request: '+e.message+' Check the position status and retry if needed.');
   if(e.serverState)setS(e.serverState);
   else if(['accept','skip','close'].includes(action)){try{setS(await call())}catch{}}
  }finally{lock.current=false;setBusy(false)}
 }
 function saveSettings(){
  const list=symbolsDraft.split(/[\s,]+/).map(v=>v.trim().toUpperCase()).filter(Boolean),amount=Number(budgetDraft);
  if(!Number.isFinite(amount)||amount<1||amount>5000){setError('Set paper maximum premium from $1 to $5,000.');return}
  if(list.length>20||list.some(v=>!/^[A-Z][A-Z0-9.-]{0,9}$/.test(v))){setError('Enter up to 20 valid ticker symbols.');return}
  act('settings',{maxPremium:amount,extraSymbols:[...new Set(list)]});
 }
 useEffect(()=>{let active=true,t;async function refresh(){if(!lock.current){try{const data=await call();if(active){setS(data);setError('')}}catch(e){if(active)setError(e.message)}}if(active){setNow(Date.now());t=setTimeout(refresh,5000)}}refresh();return()=>{active=false;clearTimeout(t)}},[]);
 const p=s?.paper?.position,alerts=s?.alerts||[],liveAlerts=alerts.filter(x=>x.status==='PENDING'&&x.expires>now),a=liveAlerts.length>0,stale=!s?.heartbeat||now-s.heartbeat>150000;
 useEffect(()=>{
  if(!s?.alerts)return;
  const ids=new Set(s.alerts.map(x=>x.id));
  const fresh=seenAlerts.current&&s.alerts.some(x=>x.status==='PENDING'&&x.expires>Date.now()&&!seenAlerts.current.has(x.id));
  if(fresh){
   setShowAlerts(true);
   if(soundOn&&document.visibilityState==='visible')ringOpportunityBell(audioRef.current);
  }
  seenAlerts.current=ids;
 },[s?.alerts,soundOn]);
 const recent=s?.scanHistory||[],latest=recent[0]||(s?.lastScan?{symbol:s.lastScan.symbol,time:s.lastScan.time,state:s.lastScan.signal?.state||'WAIT',reason:s.lastScan.signal?.reason||s.lastScan.note}:null);
 const marketClock=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const clockParts=Object.fromEntries(marketClock.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 const marketMinute=Number(clockParts.hour)*60+Number(clockParts.minute);
 const marketWindow=!['Sat','Sun'].includes(clockParts.weekday)&&marketMinute>=575&&marketMinute<945;
 const scanActive=Boolean(s?.enabled&&!stale&&!p&&marketWindow);
 const radarActive=Boolean(!stale&&!error&&!s?.lastError&&(p||scanActive));
 const scannedAt=latest?.time||null;
 const elapsed=scannedAt?Math.max(0,Math.floor((now-scannedAt)/1000)):null;
 const scanPhase=!s?'CONNECTING':p?'MANAGING POSITION':error||s?.lastError?'DATA HOLD':a?'AWAITING APPROVAL':!s.enabled?'PAUSED':stale?'SERVER STALE':!marketWindow?'OUTSIDE SESSION':scanActive?'MONITORING':'WAITING';
 const scanEligible=Boolean(scanActive);
 const scanProgress=scanEligible&&scannedAt?Math.min(100,Math.round(Math.min(elapsed||0,60)/60*100)):0;
 useEffect(()=>{if(s&&!settingsDirty){setBudgetDraft(String(s.maxPremium??350));setSymbolsDraft((s.extraSymbols||[]).join(', '))}},[s,settingsDirty]);
 return <section className="itt-card itt-paper-compact" aria-label="Paper trading control center">
 <div className="itt-paper-top-grid"><div className="itt-paper-command">
 <div className="itt-eyebrow">ICA MASTER · PAPER TRADING</div><h3>Scanner &amp; trade controls</h3>
 <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
 <button className="itt-wide-button" disabled={busy||!connected||s?.enabled} onClick={()=>act('start')}>▶ START SCAN</button>
 <button className="itt-wide-button" disabled={!s?.enabled} onClick={()=>act('pause')}>PAUSE SCAN</button>
 <button className="itt-wide-button" disabled={!p&&!s?.enabled} style={{background:'#7d2337'}} onClick={()=>act(p?'close':'pause')}>{p?'EMERGENCY STOP & CLOSE':'EMERGENCY STOP SCANNER'}</button>
 <button className="itt-wide-button" disabled={busy} onClick={()=>act('tick')}>Check / manage now</button></div>
 <p><strong>{s?.enabled?'SCANNER ENABLED':'NEW SETUPS PAUSED'} · {p?'SIMULATED POSITION OPEN':'NO SIMULATED POSITION'}</strong></p>
 <p className="itt-paper-balance">Paper cash <strong>{money(s?.paper?.cash)}</strong> · Realized paper P/L <strong>{money(s?.paper?.realized)}</strong> · Daily paper P/L <strong>{money(s?.paper?.dayPnl)}</strong> · Unrealized <strong>{money(s?.mark?.pnl)}</strong></p>
 <p className="itt-scanner-disclaimer">Checks up to three symbols per scheduled server tick (approximately one minute). No fabricated alerts or guaranteed outcomes.</p>
 <div className="itt-bell-controls"><button className="itt-wide-button" type="button" onClick={toggleAlertSound} aria-pressed={soundOn}>{soundOn?'🔔 Alert Bell ON · Turn Off':'🔕 Enable Alert Bell'}</button><button className="itt-wide-button" type="button" disabled={!soundOn} onClick={()=>ringOpportunityBell(audioRef.current)}>Test Bell</button><small>{soundWarning||'Tap Enable Alert Bell once on each device. Plays when a new setup arrives while this page is open and active; background or locked-screen alerts require push notifications.'}</small></div>
 <button className="itt-wide-button" type="button" onClick={()=>setShowAlerts(v=>!v)}>Trading opportunities · {alerts.length} saved · {liveAlerts.length} actionable · {showAlerts?'Hide window':'Show cards'}</button>
 </div>
 <aside className="itt-paper-radar" aria-label="Scanner live status and recent ticker checks">
  <div className="itt-paper-radar-heading"><div><span className="itt-eyebrow">ICA MARKET RADAR</span><h3>Scanner Activity</h3></div><span className={'itt-radar-state '+(radarActive?'active':scanPhase==='DATA HOLD'||scanPhase==='SERVER STALE'?'warning':'')}>{scanPhase}</span></div>
  <div className="itt-radar-dashboard">
   <div className={'itt-radar-visual '+(radarActive?'running':'')} aria-hidden="true"><div className="itt-radar-rings"/><div className="itt-radar-sweep"/><div className="itt-radar-core">⌖</div></div>
   <div className="itt-radar-primary"><small>LAST RECORDED CHECK</small><strong>{latest?.symbol||'—'}</strong><span>{latest?.state?.replaceAll('_',' ')||'NO SCANS YET'}</span><p>{latest?.reason||'Waiting for the first market-data evaluation.'}</p></div>
  </div>
  <div className="itt-radar-metrics"><div><small>UNIVERSE</small><strong>{s?.scanUniverse?.length??'—'} tickers</strong></div><div><small>LAST CHECK</small><strong>{time(scannedAt)} ET</strong></div><div><small>SERVER</small><strong>{stale?'STALE':s?.heartbeat?'RESPONDING':'WAITING'}</strong></div></div>
  <div className="itt-radar-cycle"><div className="itt-radar-cycle-title"><span>{p?'Managing open paper position · new-entry scan waiting':scanEligible?'Next scheduled check (approx.)':scanPhase==='MONITORING'?'Waiting':'Scan cycle not running'}</span><span>{scanEligible&&elapsed!==null?Math.max(0,60-elapsed)+'s':'—'}</span></div><div className="itt-radar-track"><span style={{width:scanProgress+'%'}}/></div></div>
  <div className="itt-radar-recent"><strong>RECENT TICKER CHECKS</strong><div>{recent.slice(0,4).map((item,i)=><div className="itt-radar-recent-item" key={item.symbol+String(item.time)+i}><span>{item.symbol}</span><span>{(item.state||'WAIT').replaceAll('_',' ')}</span><time>{time(item.time)}</time></div>)}{!recent.length&&<p>No checks recorded. Start the scanner or use Check / manage now.</p>}</div></div>
  <div className="itt-radar-foot">The radar turns while scanning for setups or managing an open paper position with a fresh server heartbeat. The status above identifies the current activity; checks run approximately once per minute.</div>
 </aside></div>
  <details className="itt-scanner-settings"><summary>Scan coverage &amp; paper contract budget</summary>
  <div className="itt-scanner-settings-grid"><label>Maximum simulated contract premium ($)<input type="number" min="1" max="5000" step="1" value={budgetDraft} onChange={e=>{setBudgetDraft(e.target.value);setSettingsDirty(true)}}/></label>
  <label>Extra tickers (comma-separated, up to 20)<input type="text" value={symbolsDraft} placeholder="e.g. PLTR, COIN, SMH" onChange={e=>{setSymbolsDraft(e.target.value);setSettingsDirty(true)}}/></label></div>
  <button className="itt-wide-button" disabled={busy||!!p||!!a||!settingsDirty} onClick={saveSettings}>Save scan settings</button>
  <p>Budget is the maximum paper premium per contract, not your actual Schwab buying power. Paper practice has no daily trade count, profit target or daily loss cutoff. Simulated buying power, option quality, and automatic per-position exits are still checked. All new symbols must pass liquidity and risk checks.</p>
  <p>Universe: {(s?.scanUniverse||[]).join(', ')||'Loading…'}</p>
 </details>
 <details className="itt-scanner-activity"><summary>Recent scanner activity ({s?.scanHistory?.length||0})</summary>{(s?.scanHistory||[]).map((x,i)=><p key={x.symbol+String(x.time)+i}><strong>{x.symbol}</strong> · {x.state?.replaceAll('_',' ')} · {time(x.time)} ET — {x.reason}</p>)}{!s?.scanHistory?.length&&<p>Nothing scanned yet. Press START SCAN, then Check / manage now.</p>}</details>

 
 
 {p&&<section className="itt-open-position" aria-label="Open paper position"><h3>{p.symbol} · 1 simulated contract</h3><p>Entry {money(p.fill)} · Bid {money(s.mark?.bid)} · Ask {money(s.mark?.ask)} · Unrealized paper P/L {money(s.mark?.pnl)}</p><button type="button" className="itt-wide-button" onClick={()=>setShowPosition(true)}>OPEN TRADE / EXIT CONTROLS</button><button type="button" className="itt-wide-button itt-position-exit" onClick={()=>act('close')}>EXIT PAPER TRADE NOW</button><p>Time exit: {time(p.time+30*60000)} ET · {s.closeRequested?'EMERGENCY CLOSE PENDING — waiting for a valid positive bid':'Protective exits active'}</p></section>}
 {exitFeedback&&<p role="status" className="itt-paper-exit-feedback">{exitFeedback}</p>}
 {p&&<aside className="itt-position-bar" aria-label="Always available paper exit"><button type="button" className="itt-position-open" onClick={()=>setShowPosition(true)}><strong>OPEN PAPER TRADE · {p.underlying||p.symbol}</strong><span>P/L {money(s.mark?.pnl)} · Tap to reopen</span></button><button type="button" className="itt-wide-button itt-position-exit" onClick={()=>act('close')}>{s.closeRequested?'PAPER EXIT PENDING · RETRY':'EXIT PAPER TRADE NOW'}</button></aside>}
 {p&&showPosition&&<div className="itt-opportunities-overlay itt-position-overlay"><section className="itt-opportunities-window" role="dialog" aria-modal="true" aria-label="Open paper trade and emergency exit"><header className="itt-opportunities-header"><div><div className="itt-eyebrow">OPEN POSITION · PAPER ONLY</div><h2>{p.underlying||p.symbol} · Trade &amp; Exit</h2></div><button type="button" className="itt-opportunity-x" onClick={()=>setShowPosition(false)}>Minimize trade</button></header><div className="itt-position-details"><p>{p.symbol} · 1 simulated contract</p><h3>Unrealized paper P/L {money(s.mark?.pnl)}</h3><p>Entry {money(p.fill)} · Bid {money(s.mark?.bid)} · Ask {money(s.mark?.ask)}</p><p>Stop {money(p.fill*0.8)} · Profit target {money(p.fill*1.3)} · Trailing {p.bestBid>=p.fill*1.15?money(p.bestBid*0.9):'activates at '+money(p.fill*1.15)}</p><p>Quote {time(s.mark?.quoteTime)} ET · Time exit {time(p.time+30*60000)} ET</p><button type="button" className="itt-wide-button itt-position-exit" onClick={()=>act('close')}>{s.closeRequested?'PAPER EXIT PENDING · RETRY':'EXIT PAPER TRADE NOW'}</button><p role="status">{exitFeedback||(s.closeRequested?'Exit requested; waiting for a fresh positive bid.':'Protective exits active. You can request a manual paper exit at any time.')}</p><p>A paper exit pauses new setups and requests a simulated fill using a fresh positive bid. If a quote is unavailable, the request stays pending. No real-money order is sent.</p></div></section></div>}
 

 {(error||s?.lastError)&&<p role="alert" className="itt-paper-approval-error">{error||s.lastError}</p>}
 <details className="itt-paper-details"><summary>Server checks, action history and exit reasons</summary><p style={{fontSize:12}}>Server check: {time(s?.heartbeat)} ET · Quote: {time(s?.mark?.quoteTime)} ET. This server-polling simulation checks approximately once per minute, not tick-by-tick.</p>{s?.events?.slice(0,12).map((e,i)=><p key={i} style={{fontSize:12}}>{time(e.time)} ET · {e.text}</p>)}</details>
 {s?.paper?.trades?.slice(-5).reverse().map(t=><p key={t.time}>{t.symbol} · {t.reason} · Simulated P/L {money(t.pnl)}</p>)}

 {showAlerts&&alerts.length>0&&<div className="itt-opportunities-overlay" role="region" aria-label="Paper trading opportunities">
  <div className="itt-opportunities-window">
   <div className="itt-opportunities-header"><div><div className="itt-eyebrow">ICA MARKET RADAR · PAPER ONLY</div><h2>Trading Opportunities <small>({liveAlerts.length} actionable / {alerts.length} saved)</small></h2></div><button className="itt-opportunity-x" type="button" onClick={()=>setShowAlerts(false)} title="Minimize window without dismissing alerts">Minimize</button></div>
   <p className="itt-opportunity-help">Individual opportunities stay in this window until you dismiss them with X. An alert is only actionable for two minutes; the card remains visible afterward. New signals can be added while older cards wait.</p>
   {tradeFeedback&&<div className={'itt-opportunity-feedback '+tradeFeedback.kind} role={tradeFeedback.kind==='error'?'alert':'status'}><strong>{tradeFeedback.kind==='error'?'PAPER ENTRY NOT ACCEPTED':tradeFeedback.kind==='success'?'PAPER ENTRY ACCEPTED':'CHECKING PAPER ENTRY'}</strong><span>{tradeFeedback.message}</span><button type="button" className="itt-opportunity-x" onClick={()=>setTradeFeedback(null)} aria-label="Dismiss trade message">✕</button></div>}
   {error&&!tradeFeedback&&<p role="alert" className="itt-paper-approval-error">{error}</p>}
   <div className="itt-opportunities-grid">{alerts.map(item=>{
    const ready=item.status==='PENDING'&&now<item.expires;
    const state=item.status==='PENDING'&&!ready?'EXPIRED':item.status;
    const c=item.contract;
    return <article className="itt-opportunity-card" key={item.id}>
     <div className="itt-opportunity-top"><div><span className="itt-eyebrow">{c.underlying} · {c.side}</span><h3>{money(c.strike)} <small>{c.expiration}</small></h3></div><button type="button" className="itt-opportunity-x" aria-label={'Dismiss '+c.symbol} title="Dismiss this alert" disabled={busy} onClick={()=>act('dismiss',item.id)}>✕</button></div>
     <p className="itt-opportunity-symbol">{c.symbol}</p>
     <span className={'itt-opportunity-status '+(ready?'ready':'inactive')}>{state==='PENDING'?'READY TO REVIEW':state}</span>
     <p className="itt-opportunity-reason">{item.signal?.reason||'Rules-qualified technical setup.'}</p>
     <div className="itt-opportunity-numbers"><span>Alert ask <strong>{money(c.ask)}</strong></span><span>Vol / OI <strong>{c.volume??'—'} / {c.openInterest??'—'}</strong></span><span>Delta <strong>{c.delta??'—'}</strong></span><span>Created <strong>{time(item.created)} ET</strong></span></div>
     <p className="itt-opportunity-expiry">{ready?'Approval expires '+time(item.expires)+' ET':'Review only — original approval is no longer available.'}</p>
     {tradeFeedback?.id===item.id&&<div role={tradeFeedback.kind==='error'?'alert':'status'} className={'itt-opportunity-inline-feedback '+tradeFeedback.kind}>{tradeFeedback.message}</div>}
     {p?.symbol===c.symbol&&state==='TAKEN'?<button className="itt-wide-button" type="button" onClick={()=>setShowPosition(true)}>OPEN POSITION / EXIT</button>:<button className="itt-wide-button" type="button" disabled={busy||!connected||!s.enabled||stale||!!p||!ready} onClick={()=>act('accept',item.id)}>{ready?'TAKE IT — approve PAPER contract':state==='TAKEN'?'SIMULATED TRADE ACCEPTED':'NOT ACTIONABLE'}</button>}
    </article>
   })}</div>
   <p className="itt-opportunity-help">Every entry rechecks market price, liquidity and simulated cash. One simulated position at a time. Email alerts require a configured sender and email delivery credentials; they are not automatically active.</p>
  </div>
 </div>}
 </section>;
}
