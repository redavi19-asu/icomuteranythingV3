import React,{useEffect,useRef,useState} from 'react';
import {summarizePaperExits} from './paper-session.js';
import './PaperExitNotice.css';
const API=import.meta.env.VITE_ICA_MASTER_API_URL||'https://ica-master-platform.ryanedavis.workers.dev';
const money=n=>Number.isFinite(n)?(n<0?'-$':'$')+Math.abs(n).toFixed(2):'—';
const time=n=>n?new Date(n).toLocaleTimeString('en-US',{timeZone:'America/New_York'}):'Not checked yet';
// Original three-strike exchange-style bell (no downloaded sound or copyrighted recording).
function ringOpportunityBell(ctx){
 if(!ctx||ctx.state!=='running')return;
 const start=ctx.currentTime+0.02;
 [0,0.9,1.8,2.7].forEach((offset,i)=>{
  const note=start+offset;
  [[740,0.45],[1120,0.26],[1660,0.10]].forEach(([frequency,volume])=>{
   const oscillator=ctx.createOscillator(),gain=ctx.createGain();
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency*(i===1?1.018:1),note);
   gain.gain.setValueAtTime(0,note);
   gain.gain.linearRampToValueAtTime(volume*0.22,note+0.007);
   gain.gain.exponentialRampToValueAtTime(0.0001,note+0.55);
   oscillator.connect(gain);gain.connect(ctx.destination);
   oscillator.start(note);oscillator.stop(note+0.56);
  });
 });
}
const positionsOf=data=>Array.isArray(data?.paper?.positions)?data.paper.positions:data?.paper?.position?[{...data.paper.position,id:data.paper.position.id||data.paper.position.symbol,mark:data.mark,closeRequested:data.closeRequested}]:[];
const percent=(pnl,cost)=>Number.isFinite(pnl)&&Number.isFinite(cost)&&cost>0?(pnl>=0?'+':'')+(pnl/cost*100).toFixed(2)+'%':'—';
const signed=n=>Number.isFinite(n)?(n>0?'+':'')+money(n):'—';
export default function PaperSession({connected,initialTab=null,onSnapshot}){
 const [s,setS]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());
 const [showWindow,setShowWindow]=useState(Boolean(initialTab)),[windowTab,setWindowTab]=useState(initialTab||'opportunities'),[selected,setSelected]=useState(null);
 const [feedback,setFeedback]=useState({}),[queued,setQueued]=useState({}),[exitFeedback,setExitFeedback]=useState('');
 const [budgetDraft,setBudgetDraft]=useState('350'),[symbolsDraft,setSymbolsDraft]=useState(''),[settingsDirty,setSettingsDirty]=useState(false);
 const [singleTickerDraft,setSingleTickerDraft]=useState('SPY'),[singleTickerDirty,setSingleTickerDirty]=useState(false);
 const [soundOn,setSoundOn]=useState(false),[soundWarning,setSoundWarning]=useState(''),[soundLoading,setSoundLoading]=useState(false);
 const [scanStatus,setScanStatus]=useState({phase:'idle'}),[operationNotice,setOperationNotice]=useState('');
 const audioRef=useRef(null),bellBuffer=useRef(null),soundEnabledRef=useRef(false),scanRequested=useRef(false),seenAlerts=useRef(null),requests=useRef(0),queue=useRef(Promise.resolve()),queueEpoch=useRef(0),latestRevision=useRef(-1),pendingAccepts=useRef(new Set());
 function applyState(data){const revision=data.revision??0;if(revision>=latestRevision.current){latestRevision.current=revision;setS(data);onSnapshot?.(data)}}
 function warnIfAudioPaused(){
   if(soundEnabledRef.current&&document.visibilityState==='visible'&&audioRef.current?.state!=='running'){
    setSoundWarning('The phone paused browser audio. Tap Test Bell to restore sound. Background alerts need notifications, not a web-page bell.');
   }
  }
  async function loadBellRecording(ctx){
   if(bellBuffer.current)return;
   try{
    const response=await fetch('/audio/nyse-opening-bell.wav',{cache:'force-cache'});
    if(!response.ok)throw Error('Bell recording unavailable');
    const decoded=await ctx.decodeAudioData(await response.arrayBuffer());
    if(decoded.duration<=0)throw Error('Invalid bell recording');
    bellBuffer.current=decoded;
   }catch{
    if(soundEnabledRef.current)setSoundWarning('Recorded bell unavailable. Backup bell remains active.');
   }
  }
  async function toggleAlertSound(){
   if(soundOn){soundEnabledRef.current=false;setSoundOn(false);setSoundWarning('');return}
   if(soundLoading)return;
   setSoundLoading(true);
   try{
    const Constructor=window.AudioContext||window.webkitAudioContext;
    if(!Constructor)throw Error('Audio is unavailable in this browser.');
    if(!audioRef.current){audioRef.current=new Constructor();audioRef.current.onstatechange=warnIfAudioPaused}
    const ctx=audioRef.current;
    await ctx.resume();
    if(ctx.state!=='running')throw Error('Sound was blocked. Tap Enable Alert Bell again and check device volume.');
    soundEnabledRef.current=true;
    setSoundOn(true);
    setSoundWarning('');
    // Unlock audio on tap without playing a different preview sound.
    if(!bellBuffer.current)void loadBellRecording(ctx);
   }catch(e){
    soundEnabledRef.current=false;setSoundOn(false);setSoundWarning(e.message);
   }finally{setSoundLoading(false)}
  }
  function playAlertBell(){
   const ctx=audioRef.current;
   if(!ctx||ctx.state!=='running'){
    setSoundWarning('The phone paused browser audio. Tap Test Bell to restore sound.');
    return;
   }
   try{
    if(bellBuffer.current){
     const source=ctx.createBufferSource(),gain=ctx.createGain(),start=ctx.currentTime;
     // Keep the recognizable WAV, but a real alert finishes in at most 3.5 seconds.
     const duration=Math.min(bellBuffer.current.duration,3.5);
     source.buffer=bellBuffer.current;source.connect(gain);gain.connect(ctx.destination);
     gain.gain.setValueAtTime(1,start);
     gain.gain.setValueAtTime(1,start+Math.max(0,duration-0.32));
     gain.gain.linearRampToValueAtTime(0,start+duration);
     source.onended=()=>{source.disconnect();gain.disconnect()};
     source.start(start,0,duration);
    }else ringOpportunityBell(ctx);
   }catch{
    ringOpportunityBell(ctx);
    setSoundWarning('Recorded bell could not play. Backup bell is active.');
   }
  }
  async function testAlertBell(){
   try{
    if(!soundEnabledRef.current||!audioRef.current)throw Error('Enable Alert Bell first.');
    if(audioRef.current.state!=='running')await audioRef.current.resume();
    if(audioRef.current.state!=='running')throw Error('Browser audio is still paused. Check silent mode and tap again.');
    setSoundWarning('');
    if(!bellBuffer.current)await loadBellRecording(audioRef.current);
    playAlertBell();
   }catch(e){setSoundWarning(e.message||'Tap Enable Alert Bell again and check device volume.')}
  }
  useEffect(()=>{
   document.addEventListener('visibilitychange',warnIfAudioPaused);
   window.addEventListener('pageshow',warnIfAudioPaused);
   return ()=>{
    document.removeEventListener('visibilitychange',warnIfAudioPaused);
    window.removeEventListener('pageshow',warnIfAudioPaused);
    soundEnabledRef.current=false;
    if(audioRef.current){
     audioRef.current.onstatechange=null;
     audioRef.current.close().catch(()=>{});
     audioRef.current=null;
    }
   };
  },[]);
  async function call(action,id,epoch){
  const token=localStorage.getItem('ica_master_token');
  const body=['settings','scan_scope'].includes(action)?{action,...id}:action==='auto_start'?{action,enabled:id}:{action,id,...(epoch!==undefined?{epoch}:{})};
  const r=await fetch(API+'/platform/paper',{method:action?'POST':'GET',headers:{Authorization:'Bearer '+token,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify(body)}:{})});
  const data=await r.json();if(!r.ok){const e=Error(data.error||'Paper server unavailable.');e.code=data.code;e.serverState=data.status;throw e}return data;
 }
 function act(action,id){
  if(action==='tick'&&scanRequested.current)return;
  if(action==='tick'){scanRequested.current=true;setScanStatus({phase:'queued',message:'Scan request received — starting…'})}
  if(action==='accept'&&pendingAccepts.current.has(id))return;
  if(action==='accept')pendingAccepts.current.add(id);
  const epoch=queueEpoch.current,serverEpoch=s?.entryEpoch??0;
  if(action==='accept'){setQueued(v=>({...v,[id]:true}));setFeedback(v=>({...v,[id]:{kind:'checking',message:'Queued for fresh-price and paper buying-power checks…'}}))}
  if(action==='close_all')queueEpoch.current++;
  async function run(){
   if(action==='accept'&&epoch!==queueEpoch.current){pendingAccepts.current.delete(id);setQueued(v=>({...v,[id]:false}));setFeedback(v=>({...v,[id]:{kind:'error',message:'Approval cancelled by Close All. Review and accept again if wanted.'}}));return}
   requests.current++;setBusy(true);setError('');
   if(action==='tick')setScanStatus({phase:'checking',message:s?.enabled?'Checking fresh quotes and the next scanner batch…':'Updating open paper trades — scanner is paused…'});
   if(action==='close'||action==='close_all')setExitFeedback('Close requested. Checking fresh bids…');
   try{
    let data;
    for(let attempt=0;attempt<3;attempt++){
     try{data=await call(action,id,action==='accept'?serverEpoch:undefined);break}catch(e){if(e.code!=='STATE_CHANGED'||attempt===2)throw e;applyState(await call())}
    }
    applyState(data);
    if(action==='tick'){
     const check=data.lastCheck;
     setScanStatus({phase:check?.holds?.length?'warning':'done',message:check?.holds?.length?'Check finished — some quotes need attention':'Check complete',check,completedAt:check?.completedAt||Date.now()});
    }
    if(action==='start')setOperationNotice('Scanner started. Scheduled setup checks are enabled.');
    if(action==='pause')setOperationNotice('Scanner paused. Open paper trades remain under protective management.');
     if(action==='auto_start')setOperationNotice(data.autoStart?'Automatic PAPER scans scheduled at/after 9:30 AM ET on market weekdays.':'Automatic paper scanner start disabled.');
    if(action==='settings')setOperationNotice('Scan settings saved.');
    if(action==='scan_scope')setOperationNotice(data.scanMode==='SINGLE'?
     'Single Ticker active: '+data.singleTicker+'. Only this ticker is eligible for NEW paper setups. Existing positions stay protected.':
     'Multiple Tickers active: broader watchlist scanning restored.');
    if(action==='accept')setFeedback(v=>({...v,[id]:{kind:'success',message:'Accepted into Open Trades. Select Open Trade to see profit/loss and close controls.'}}));
    if(action==='settings')setSettingsDirty(false);
    if(action==='scan_scope')setSingleTickerDirty(false);
    if(action==='close'||action==='close_all'){
     const left=positionsOf(data).filter(p=>action==='close_all'||p.id===id);
     setExitFeedback(left.length?'Close pending for '+left.length+' contract(s). '+(left.map(p=>p.lastError).filter(Boolean).join(' · ')||'Waiting for fresh positive bids.'):'Paper close completed. See Closed Trades for final profit/loss.');
    }
   }catch(e){setError(e.message);if(action==='tick')setScanStatus({phase:'error',message:'Check failed: '+e.message});if(action==='accept')setFeedback(v=>({...v,[id]:{kind:'error',message:e.message}}));if(action==='close'||action==='close_all')setExitFeedback(e.message);if(e.serverState)applyState(e.serverState);else try{applyState(await call())}catch{}}
   finally{if(action==='tick')scanRequested.current=false;requests.current--;setBusy(requests.current>0);if(action==='accept'){pendingAccepts.current.delete(id);setQueued(v=>({...v,[id]:false}))}}
  }
  if(['close','close_all','pause'].includes(action))return run();
  queue.current=queue.current.then(run,run);return queue.current;
 }
 useEffect(()=>{let active=true,t;async function refresh(){if(!requests.current)try{const data=await call();if(active){applyState(data);setError('')}}catch(e){if(active)setError(e.message)}if(active){setNow(Date.now());t=setTimeout(refresh,5000)}}refresh();return()=>{active=false;clearTimeout(t)}},[]);
 const positions=positionsOf(s),alerts=s?.alerts||[],history=s?.paper?.trades||[],liveAlerts=alerts.filter(a=>a.status==='PENDING'&&a.expires>now);
 const {todayRealized,todayTrades,automaticExits}=summarizePaperExits(history,now);
 const stale=!s?.heartbeat||now-s.heartbeat>150000;
 const marked=positions.filter(p=>Number.isFinite(p.mark?.pnl)),totalPnl=positions.length?marked.length===positions.length?marked.reduce((sum,p)=>sum+p.mark.pnl,0):null:0;
 function openWindow(tab=positions.length?'open':liveAlerts.length?'opportunities':history.length?'closed':'opportunities',id=null){setWindowTab(tab);setSelected(id);setShowWindow(true)}
 useEffect(()=>{
  if(!s?.alerts)return;const ids=new Set(s.alerts.map(a=>a.id));
  if(seenAlerts.current&&s.alerts.some(a=>a.status==='PENDING'&&a.expires>Date.now()&&!seenAlerts.current.has(a.id))){openWindow('opportunities');if(soundOn&&document.visibilityState==='visible')playAlertBell()}seenAlerts.current=ids;
 },[s?.alerts,soundOn]);
 useEffect(()=>{if(s&&!settingsDirty){setBudgetDraft(String(s.maxPremium??350));setSymbolsDraft((s.extraSymbols||[]).join(', '))}},[s,settingsDirty]);
 useEffect(()=>{if(s&&!singleTickerDirty)setSingleTickerDraft(s.singleTicker||'SPY')},[s,singleTickerDirty]);
 const clock=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 const minute=Number(clock.hour)*60+Number(clock.minute),marketWindow=!['Sat','Sun'].includes(clock.weekday)&&minute>=575&&minute<945;
 const radarActive=!stale&&(positions.length>0||s?.enabled&&marketWindow);
 const recent=s?.scanHistory||[],latest=recent[0],elapsed=latest?.time?Math.max(0,Math.floor((now-latest.time)/1000)):null;
 const swingChecks=Object.entries(s?.swingLevels||{}).filter(([,x])=>Number.isFinite(x?.checkedAt)&&now-x.checkedAt<30*60000).sort((a,b)=>b[1].checkedAt-a[1].checkedAt);
 const phase=!s?'CONNECTING':stale?'SERVER STALE':s.enabled&&marketWindow?'SCANNING'+(positions.length?' · '+positions.length+' OPEN':''):positions.length?'MANAGING '+positions.length+' OPEN':!s.enabled?'PAUSED':'OUTSIDE SESSION';
 function saveSettings(){const maxPremium=Number(budgetDraft),extraSymbols=[...new Set(symbolsDraft.split(/[\s,]+/).map(x=>x.trim().toUpperCase()).filter(Boolean))];if(!Number.isFinite(maxPremium)||maxPremium<1||maxPremium>5000||extraSymbols.length>20||extraSymbols.some(x=>!/^[A-Z][A-Z0-9.-]{0,9}$/.test(x))){setError('Use a $1–$5,000 premium budget and up to 20 valid tickers.');return}act('settings',{maxPremium,extraSymbols})}
 function setScope(mode){
  const symbol=singleTickerDraft.trim().toUpperCase();
  if(mode==='SINGLE'&&!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)){
   setError('Enter a valid stock or ETF ticker (for example SPY) before activating Single Ticker.');return;
  }
  act('scan_scope',{mode,...(mode==='SINGLE'?{symbol}:{})});
 }
 function pnlBlock(p,closed=false){const pnl=closed?p.pnl:p.mark?.pnl;return <div className={'itt-trade-pnl '+(pnl>0?'gain':pnl<0?'loss':'')}><small>{closed?'FINAL NET PAPER PROFIT / LOSS':!p.mark?.quoteTime||now-p.mark.quoteTime>60000?'LAST ESTIMATE · QUOTE STALE':'ESTIMATED NET PAPER PROFIT / LOSS'}</small><strong>{signed(pnl)}</strong><span>{percent(pnl,p.cost)}</span><small>{closed?'After simulated fees and fills':'Estimated liquidation at bid less slippage and exit commission'}</small></div>}
 function positionCard(p){const quoteStale=!p.mark?.quoteTime||now-p.mark.quoteTime>60000;return <article key={p.id} className={'itt-opportunity-card itt-managed-trade '+(selected===p.id?'selected':'')}>
  <div className="itt-opportunity-top"><div><span className="itt-eyebrow">OPEN PAPER CONTRACT</span><h3>{p.underlying||p.symbol} · {p.side||'OPTION'}</h3></div><span className="itt-opportunity-status ready">{p.closeRequested?'CLOSE PENDING':'OPEN'}</span></div>
  <button type="button" className="itt-trade-symbol" onClick={()=>setSelected(selected===p.id?null:p.id)}>{p.symbol} · {selected===p.id?'Hide details':'View details'}</button>
  {pnlBlock(p)}
  {p.style&&<p className="itt-play-style"><strong>{p.style.label}</strong> · {p.style.window}. {p.style.reason}</p>}
  <button type="button" className="itt-wide-button itt-position-exit" onClick={()=>act('close',p.id)}>{p.closeRequested?'RETRY CLOSE CONTRACT':'CLOSE CONTRACT · PAPER'}</button>
  <div className="itt-opportunity-numbers"><span>Entry cost · 1 contract<strong>{money(p.cost)}</strong></span><span>Entry fill / share<strong>{money(p.fill)}</strong></span><span>Current bid / ask<strong>{money(p.mark?.bid)} / {money(p.mark?.ask)}</strong></span><span>Quote timestamp<strong>{time(p.mark?.quoteTime)} ET · {quoteStale?'STALE / UNAVAILABLE':'FRESH'}</strong></span></div>
  {selected===p.id&&<div className="itt-position-details"><p>Strike {money(p.strike)} · Expiration {p.expiration||'—'} · Opened {time(p.time)} ET</p><p>Stop {money(p.fill*.8)} · Profit target {money(p.fill*1.3)} · Trailing {p.bestBid>=p.fill*1.15?money(p.bestBid*.9):'activates at '+money(p.fill*1.15)} · Maximum duration {p.maxHoldMinutes||30} min · protective session exit by 3:55 PM ET; whichever comes first</p></div>}
  {(p.lastError||p.closeRequested)&&<p role="status" className="itt-paper-approval-error">{p.lastError||'Manual close requested. Waiting for a fresh positive bid.'}</p>}

 </article>}
 return <section id="ica-paper-control-center" className="itt-card itt-paper-compact" aria-label="Paper trading control center">
  <div className="itt-paper-top-grid"><div className="itt-paper-command"><div className="itt-eyebrow">ICA MASTER · PAPER TRADING</div><h3>Scanner &amp; paper trades</h3>
   <div className="itt-scan-buttons"><button type="button" className={'itt-wide-button itt-scan-start '+(s?.enabled?'is-active':'')} aria-pressed={!!s?.enabled} disabled={busy||!connected||s?.enabled} onClick={()=>act('start')}>START SCAN</button><button type="button" className={'itt-wide-button itt-scan-pause '+(s&&!s.enabled?'is-paused':'')} aria-pressed={!!s&&!s.enabled} disabled={!s?.enabled} onClick={()=>act('pause')}>PAUSE SCAN</button><button type="button" className={'itt-wide-button itt-run-now '+(['queued','checking'].includes(scanStatus.phase)?'checking':'')} disabled={busy||['queued','checking'].includes(scanStatus.phase)} aria-busy={['queued','checking'].includes(scanStatus.phase)} onClick={()=>act('tick')}>{['queued','checking'].includes(scanStatus.phase)?<><span className="itt-action-spinner" aria-hidden="true"/> CHECKING…</>:'RUN SCAN & UPDATE TRADES NOW'}</button></div>
   {scanStatus.phase!=='idle'&&<div className={'itt-check-feedback '+scanStatus.phase} role={scanStatus.phase==='error'?'alert':'status'} aria-live="polite"><strong>{scanStatus.message}</strong>{scanStatus.check&&<><span>Updated {scanStatus.check.positionsUpdated} of {scanStatus.check.positionsChecked} open contracts · Checked {scanStatus.check.scannedSymbols?.length||0} tickers{scanStatus.check.scannedSymbols?.length?' ('+scanStatus.check.scannedSymbols.join(', ')+')':''} · {scanStatus.check.newAlerts} new opportunities</span>{scanStatus.check.positionsClosed>0&&<span>{scanStatus.check.positionsClosed} paper contract(s) closed by exit rules.</span>}{!scanStatus.check.scannedSymbols?.length&&<span>{s?.enabled?'No ticker scans were due during this check.':'Scanner paused; only open trades were checked.'}</span>}{scanStatus.check.holds?.length>0&&<details><summary>Quote holds ({scanStatus.check.holds.length})</summary>{scanStatus.check.holds.map((h,i)=><p key={i}>{h.symbol||'Check'}: {h.reason}</p>)}</details>}</>}{scanStatus.completedAt&&<small>Completed {time(scanStatus.completedAt)} ET</small>}</div>}
   {operationNotice&&<p role="status" className="itt-operation-notice">{operationNotice}</p>}
   <p><strong>{s?.enabled?'SCANNER ENABLED':'SCANNER PAUSED'} · {positions.length} OPEN PAPER CONTRACT{positions.length===1?'':'S'}</strong></p>

   <div className="itt-paper-summary"><div><small>PAPER BUYING POWER</small><strong>{money(s?.paper?.cash)}</strong></div><div><small>ALL-TIME REALIZED P/L</small><strong className={s?.paper?.realized<0?'itt-pnl-negative':'itt-pnl-positive'}>{signed(s?.paper?.realized)}</strong><small>All previously closed paper trades</small></div><div><small>TODAY'S REALIZED P/L · ET</small><strong className={todayRealized<0?'itt-pnl-negative':'itt-pnl-positive'}>{signed(todayRealized)}</strong><small>{todayTrades} paper trade{todayTrades===1?'':'s'} closed today</small></div><div><small>OPEN PROFIT / LOSS</small><strong className={totalPnl<0?'itt-pnl-negative':'itt-pnl-positive'}>{signed(totalPnl)}</strong><small>{marked.length!==positions.length?'Some quotes unavailable; see each trade':''}</small></div></div>
   {automaticExits.length>0&&<section className="itt-paper-automatic-exits" aria-label="Saved automatic paper-trade exit notices">
    <div className="itt-paper-automatic-exits-header"><strong>AUTOMATIC TRADE EXITS · SAVED</strong><small>These notices are recorded in Closed Trades and remain here after refresh.</small></div>
    {automaticExits.map(t=><div key={t.id} className={'itt-paper-auto-exit'+(t.pnl<0?' loss':' gain')}>
     <strong>{t.label}</strong><span>{t.symbol} · {time(t.exitTime)} ET</span>
     <span>Simulated exit {money(t.exitFill)} · Final realized P/L <b>{signed(t.pnl)}</b></span>
    </div>)}
   </section>}
   <div className="itt-bell-controls"><button type="button" className="itt-wide-button" onClick={toggleAlertSound} disabled={soundLoading} aria-busy={soundLoading} aria-pressed={soundOn}>{soundLoading?'Preparing sound…':soundOn?'🔔 ALERT BELL ON':'ENABLE ALERT BELL'}</button><button type="button" className="itt-wide-button" disabled={!soundOn} onClick={testAlertBell}>Test Bell</button><small>{soundWarning||'Recorded alert lasts up to 3.5 seconds while the page is active. Background alerts need notifications.'}</small></div>
   <button type="button" className="itt-wide-button itt-trade-center-button" onClick={()=>openWindow()}>TRADING OPPORTUNITIES &amp; TRADES · {liveAlerts.length} awaiting · {positions.length} open · {history.length} closed</button>
  </div><aside className="itt-paper-radar" aria-label="Scanner live status and recent ticker checks"><div className="itt-paper-radar-heading"><div><span className="itt-eyebrow">ICA MARKET RADAR</span><h3>Scanner Activity</h3></div><span className={'itt-radar-state '+(radarActive?'active':'')}>{phase}</span></div>
   <div className="itt-scan-scope" role="group" aria-label="Scan only one ticker or multiple tickers">
    <div className="itt-scope-heading"><strong>SCAN SCOPE · {s?.scanMode==='SINGLE'?(s.singleTicker||'SPY')+' ONLY':'MULTIPLE TICKERS'}</strong></div>
    <div className="itt-scope-switch">
     <button type="button" className={'itt-wide-button '+(s?.scanMode==='SINGLE'?'selected':'')} aria-pressed={s?.scanMode==='SINGLE'} disabled={!s||busy} onClick={()=>setScope('SINGLE')}>◎ Single Ticker</button>
     <button type="button" className={'itt-wide-button '+(s?.scanMode!=='SINGLE'?'selected':'')} aria-pressed={s?.scanMode!=='SINGLE'} disabled={!s||busy} onClick={()=>setScope('MULTI')}>▦ Multiple Tickers</button>
    </div>
    {s?.scanMode==='SINGLE'&&<form className="itt-scope-ticker" onSubmit={e=>{e.preventDefault();setScope('SINGLE')}}>
     <label htmlFor="itt-single-ticker-input">Single ticker symbol</label>
     <input id="itt-single-ticker-input" name="singleTicker" value={singleTickerDraft} maxLength={10} autoCapitalize="characters" spellCheck={false}
      onChange={e=>{setSingleTickerDraft(e.target.value.toUpperCase());setSingleTickerDirty(true)}} placeholder="SPY" aria-label="Single ticker symbol, for example SPY"/>
     <button className="itt-wide-button" type="submit" disabled={!s||busy}>Apply Ticker</button>
    </form>}
    <small className="itt-scope-footnote">Server setting. Existing paper positions stay monitored.</small>
   </div>
    <label className="itt-autostart" style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
     <span><strong>Auto-start paper scanner at 9:30 AM ET</strong><small style={{display:'block'}}>Saved on the server for this owner. Trading weekdays only; no real orders. A manual Pause stays paused for the day.</small></span>
     <input type="checkbox" checked={!!s?.autoStart} disabled={!s||busy} onChange={e=>act('auto_start',e.target.checked)} aria-label="Automatically start paper scanner at 9:30 AM Eastern"/>
     <span className="itt-switch" aria-hidden="true"/>
    </label>
   <div className="itt-radar-dashboard"><div className={'itt-radar-visual '+(radarActive?'running':'')} aria-hidden="true"><div className="itt-radar-rings"/><div className="itt-radar-sweep"/><div className="itt-radar-core">⌖</div></div><div className="itt-radar-primary"><small>LAST RECORDED SCAN</small><strong>{latest?.symbol||'—'}</strong><span>{latest?.state?.replaceAll('_',' ')||'NO SCANS YET'}</span><p>{latest?.reason||'Waiting for the next scheduled scan.'}</p></div></div>
   <div className="itt-radar-metrics"><div><small>UNIVERSE</small><strong>{s?.scanUniverse?.length??'—'} tickers</strong></div><div><small>OPEN TRADES</small><strong>{positions.length} managed separately</strong></div><div><small>SERVER</small><strong>{stale?'STALE':'RESPONDING'}</strong></div></div>
   <div className="itt-radar-cycle"><div className="itt-radar-cycle-title"><span>{radarActive?'Next scheduled check (approx.)':'Checks paused / outside session'}</span><span>{radarActive&&elapsed!==null?Math.max(0,60-elapsed)+'s':'—'}</span></div><div className="itt-radar-track"><span style={{width:radarActive&&elapsed!==null?Math.min(100,elapsed/60*100)+'%':'0%'}}/></div></div>
   <div className="itt-radar-recent"><strong>RECENT TICKER CHECKS</strong>{recent.slice(0,4).map((r,i)=><div className="itt-radar-recent-item" key={r.symbol+String(r.time)+i}><span>{r.symbol}</span><span>{r.state?.replaceAll('_',' ')}</span><time>{time(r.time)}</time></div>)}</div><p className="itt-radar-foot"><strong>DON'T CHASE · ACTIVE</strong> — New CALLS and PUTS are held if today's move is already stretched without a fresh pullback or consolidation breakout. No 11 AM or lunch trading ban. The radar keeps showing WAIT FOR BOUNCE / WAIT FOR PULLBACK while it waits. Existing trades keep their stop-loss protection.</p>
  </aside></div>
  <details className="itt-scanner-settings">
   <summary>Confirmed 5/5 support &amp; resistance · Schwab (30-minute lookback)</summary>
   <p>Levels use completed one-minute Schwab candles and require five bars on either side of each swing. They may differ from your TradingView indicator. They improve NEW paper entries only; the 20% protective option stop stays unchanged.</p>
   {swingChecks.length?swingChecks.map(([sym,x])=><p key={sym}><strong>{sym} · Support {money(x.support)} · Resistance {money(x.resistance)}</strong> — {x.status?.replaceAll('_',' ')} · Checked {time(x.checkedAt)} ET. {x.hold?x.reason:''}</p>):
    <p>No confirmed support/resistance checks in the last 30 minutes of scanner activity.</p>}
  </details>
  <details className="itt-scanner-settings">
   <summary>Trade style &amp; multi-day swing watchlist ({Object.values(s?.dailySignals||{}).filter(x=>x.status==='SWING_WATCH').length})</summary>
   <p>Scalp: short momentum attempt. Intraday hold: session trend with paper exits controlled by stops, targets, trailing rules and closing time. Multi-day swing: information only; no overnight paper trades.</p>
   {Object.entries(s?.dailySignals||{}).filter(([,x])=>x.status==='SWING_WATCH').length?
     Object.entries(s.dailySignals).filter(([,x])=>x.status==='SWING_WATCH').map(([symbol,x])=>
      <p key={symbol}><strong>{symbol} · {x.direction} · MULTI-DAY WATCH</strong> — {x.reason} Contract affordability, live bid/ask and gap risk not yet validated.</p>):
     <p>No confirmed multi-day daily-chart watches yet. Each ticker gets its daily check once per market day while scanning is enabled.</p>}
  </details>
  <details className="itt-scanner-settings"><summary>Scan coverage &amp; paper contract budget</summary><div className="itt-scanner-settings-grid"><label>Maximum premium per contract ($)<input type="number" min="1" max="5000" value={budgetDraft} onChange={e=>{setBudgetDraft(e.target.value);setSettingsDirty(true)}}/></label><label>Extra tickers (up to 20)<input value={symbolsDraft} onChange={e=>{setSymbolsDraft(e.target.value);setSettingsDirty(true)}}/></label></div><button type="button" className="itt-wide-button" disabled={busy||positions.length>0||!settingsDirty} onClick={saveSettings}>Save scan settings</button><p>Universe: {(s?.scanUniverse||[]).join(', ')}</p><p>Multiple paper contracts can be open at once. Each accepted opportunity rechecks price, quote quality and available simulated cash. No daily paper profit or trade-count cutoff.</p></details>
  {(error||s?.lastError)&&<p role="alert" className="itt-paper-approval-error">{error||s.lastError}</p>}
  {exitFeedback&&<p role="status" className="itt-paper-exit-feedback">{exitFeedback}</p>}
  <details className="itt-paper-details"><summary>Server checks and trade history</summary><p>Server check {time(s?.heartbeat)} ET. Paper controls only.</p>{s?.events?.slice(0,12).map((e,i)=><p key={i}>{time(e.time)} ET · {e.text}</p>)}</details>
  <details className="itt-closed-history"><summary>Completed paper trades · History / Archive ({history.length})</summary><p>Completed trades stay saved here. They are hidden from the main trading screen.</p><button type="button" className="itt-wide-button" onClick={()=>openWindow('closed')}>OPEN COMPLETE TRADE HISTORY</button></details>
  {positions.length>0&&<aside className="itt-position-bar" aria-label="Always available paper trade controls"><button type="button" className="itt-position-open" onClick={()=>openWindow('open')}><strong>OPEN PAPER TRADES · {positions.length}</strong><span>Profit / loss {signed(totalPnl)} · Tap to reopen</span></button><button type="button" className="itt-wide-button itt-position-exit" onClick={()=>act('close_all')}>CLOSE ALL PAPER TRADES</button></aside>}
  {showWindow&&<div className="itt-opportunities-overlay"><section className="itt-opportunities-window itt-trade-center" role="dialog" aria-modal="true" aria-label="Trading opportunities and paper trades"><header className="itt-opportunities-header"><div><div className="itt-eyebrow">ICA MASTER · PAPER ONLY</div><h2>Trading Opportunities &amp; Trades</h2></div><button type="button" className="itt-opportunity-x" onClick={()=>setShowWindow(false)}>Minimize</button></header>
   <nav className="itt-trade-tabs" aria-label="Trade window tabs">{[['opportunities','Opportunities',liveAlerts.length],['open','Open Trades',positions.length],['closed','Closed Trades',history.length]].map(([key,label,count])=><button type="button" key={key} aria-pressed={windowTab===key} onClick={()=>{setWindowTab(key);setSelected(null)}}>{label} ({count})</button>)}</nav>
   {positions.length>0&&<div className="itt-trade-window-summary"><span>{positions.length} open · Estimated net P/L {signed(totalPnl)}</span><button type="button" className="itt-wide-button itt-position-exit" onClick={()=>act('close_all')}>CLOSE ALL PAPER TRADES</button></div>}
   {exitFeedback&&<p role="status" className="itt-paper-exit-feedback">{exitFeedback}</p>}
   <div className="itt-opportunities-grid">
    {windowTab==='opportunities'&&<>{!alerts.length&&<p>No saved opportunities. Accepted contracts remain in Open Trades; completed contracts remain in Closed Trades.</p>}{alerts.map(item=>{const c=item.contract,ready=item.status==='PENDING'&&item.expires>now,open=positions.find(p=>p.alertId===item.id||p.id===item.id),state=item.status==='PENDING'&&!ready?'EXPIRED':item.status;return <article className="itt-opportunity-card" key={item.id}><div className="itt-opportunity-top"><div><span className="itt-eyebrow">{c.underlying} · {c.side}</span><h3>{money(c.strike)} <small>{c.expiration}</small></h3></div><button type="button" className="itt-opportunity-x" disabled={queued[item.id]} aria-label={'Dismiss '+c.symbol} onClick={()=>act('dismiss',item.id)}>✕</button></div><p className="itt-opportunity-symbol">{c.symbol}</p><span className={'itt-opportunity-status '+(ready?'ready':'inactive')}>{open?'ACCEPTED · OPEN TRADE':state}</span>{item.style&&<div className="itt-play-style"><strong>{item.style.label}</strong><p>Monitoring horizon: {item.style.window}</p><p>{item.style.reason}</p><p><strong>Invalidation:</strong> {item.style.invalidation}</p></div>}<p>{item.signal?.reason||'Rules-qualified paper setup.'}</p>{item.qualification?.swing55&&<p><strong>Confirmed swing 5/5 levels (Schwab):</strong> Support {money(item.qualification.swing55.support)} · Resistance {money(item.qualification.swing55.resistance)} · {item.qualification.swing55.status?.replaceAll('_',' ')}.</p>}{item.qualification?.entryTiming&&<p><strong>Entry quality:</strong> {item.qualification.entryTiming.status.replaceAll('_',' ')} · {item.qualification.entryTiming.reason}</p>}<p>Alert ask {money(c.ask)} · Volume {c.volume??'—'} · OI {c.openInterest??'—'} · Delta {c.delta??'—'}</p><p>Approval expires {time(item.expires)} ET. Price and simulated cash are rechecked.</p>{feedback[item.id]&&<p role={feedback[item.id].kind==='error'?'alert':'status'} className={'itt-opportunity-inline-feedback '+feedback[item.id].kind}>{feedback[item.id].message}</p>}{open?<button type="button" className="itt-wide-button" onClick={()=>openWindow('open',open.id)}>OPEN TRADE · P/L &amp; CLOSE</button>:item.status==='TAKEN'?<button type="button" className="itt-wide-button" onClick={()=>openWindow('closed',item.id)}>VIEW CLOSED TRADE</button>:<button type="button" className="itt-wide-button" disabled={queued[item.id]||!ready||!connected||!s?.enabled} aria-busy={!!queued[item.id]} onClick={()=>act('accept',item.id)}>{queued[item.id]?'ACCEPTANCE QUEUED…':ready?'ACCEPT PAPER CONTRACT':'EXPIRED · NOT ACTIONABLE'}</button>}</article>})}</>}
    {windowTab==='open'&&<>{!positions.length&&<p>No open paper contracts. Accepted trades appear here automatically and remain here until closed.</p>}{positions.map(positionCard)}</>}
    {windowTab==='closed'&&<>{!history.length&&<p>No closed paper trades yet.</p>}{history.slice().reverse().map((t,i)=>{const id=t.id||t.symbol+t.exitTime;return <article className="itt-opportunity-card" key={id+i}><span className="itt-eyebrow">CLOSED PAPER TRADE · {t.reason==='STOP_LOSS'?'STOP LOSS TRIGGERED':t.reason?.replaceAll('_',' ')}</span><button type="button" className="itt-trade-symbol" onClick={()=>setSelected(selected===id?null:id)}>{t.symbol} · View trade details</button>{pnlBlock(t,true)}<p>Entry cost {money(t.cost)} · Entry fill {money(t.fill)} · Exit fill {money(t.exitFill)}</p><p>Opened {time(t.time)} ET · Closed {time(t.exitTime)} ET</p>{selected===id&&<p>Strike {money(t.strike)} · Expiration {t.expiration||'—'} · Exit reason {t.reason?.replaceAll('_',' ')}. This contract is closed; there is no open position to exit.</p>}</article>})}</>}
   </div><p className="itt-opportunity-help">Minimize keeps trades open. Close Contract exits one; Close All exits every open paper contract and cancels queued approvals. A fresh positive bid is required. Paper only.</p>
  </section></div>}
 </section>;
}
