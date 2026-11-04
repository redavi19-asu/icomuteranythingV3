import React,{useEffect,useRef,useState} from 'react';
const API=import.meta.env.VITE_ICA_MASTER_API_URL||'https://ica-master-platform.ryanedavis.workers.dev';
const money=n=>Number.isFinite(n)?'$'+n.toFixed(2):'—';
const time=n=>n?new Date(n).toLocaleTimeString('en-US',{timeZone:'America/New_York'}):'Not checked yet';
export default function PaperSession({connected}){
 const [s,setS]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());
 const [budgetDraft,setBudgetDraft]=useState('350'),[symbolsDraft,setSymbolsDraft]=useState(''),[settingsDirty,setSettingsDirty]=useState(false);
 const lock=useRef(false);
 async function call(action,id){const token=localStorage.getItem('ica_master_token');const r=await fetch(API+'/platform/paper',{method:action?'POST':'GET',headers:{Authorization:'Bearer '+token,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify({action,...(action==='settings'&&id&&typeof id==='object'?id:{id})})}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Paper server unavailable.');return d}
 async function act(action,id){if(lock.current&&!['pause','close'].includes(action))return;lock.current=true;setBusy(true);setError('');try{setS(await call(action,id));if(action==='settings')setSettingsDirty(false)}catch(e){setError(e.message)}finally{lock.current=false;setBusy(false)}}
 function saveSettings(){
  const list=symbolsDraft.split(/[\s,]+/).map(v=>v.trim().toUpperCase()).filter(Boolean),amount=Number(budgetDraft);
  if(!Number.isFinite(amount)||amount<1||amount>5000){setError('Set paper maximum premium from $1 to $5,000.');return}
  if(list.length>20||list.some(v=>!/^[A-Z][A-Z0-9.-]{0,9}$/.test(v))){setError('Enter up to 20 valid ticker symbols.');return}
  act('settings',{maxPremium:amount,extraSymbols:[...new Set(list)]});
 }
 useEffect(()=>{let active=true,t;async function refresh(){if(!lock.current){try{const data=await call();if(active){setS(data);setError('')}}catch(e){if(active)setError(e.message)}}if(active){setNow(Date.now());t=setTimeout(refresh,5000)}}refresh();return()=>{active=false;clearTimeout(t)}},[]);
 const p=s?.paper?.position,a=s?.pending,stale=!s?.heartbeat||now-s.heartbeat>150000;
 useEffect(()=>{if(s&&!settingsDirty){setBudgetDraft(String(s.maxPremium??350));setSymbolsDraft((s.extraSymbols||[]).join(', '))}},[s,settingsDirty]);
 return <section className="itt-card itt-paper-compact" aria-label="Paper trading control center">
 <div className="itt-eyebrow">ICA MASTER · PAPER TRADING</div><h3>Scanner &amp; trade controls</h3>
 <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
 <button className="itt-wide-button" disabled={busy||!connected||s?.enabled} onClick={()=>act('start')}>▶ START SCAN</button>
 <button className="itt-wide-button" disabled={!s?.enabled} onClick={()=>act('pause')}>PAUSE SCAN</button>
 <button className="itt-wide-button" disabled={!p&&!s?.enabled} style={{background:'#7d2337'}} onClick={()=>act(p?'close':'pause')}>{p?'EMERGENCY STOP & CLOSE':'EMERGENCY STOP SCANNER'}</button>
 <button className="itt-wide-button" disabled={busy} onClick={()=>act('tick')}>Check / manage now</button></div>
 <p><strong>{s?.enabled?'SCANNER ENABLED':'NEW SETUPS PAUSED'} · {p?'SIMULATED POSITION OPEN':'NO SIMULATED POSITION'}</strong></p>
 <div className="itt-scanner-summary"><span><strong>{(s?.scanUniverse||[]).length}</strong> symbols in bounded scan universe</span><span><strong>{s?.lastScan?.symbol||'—'}</strong> last checked</span><span><strong>{time(s?.lastScan?.time||s?.heartbeat)}</strong> last activity ET</span></div>
 <p className="itt-scanner-disclaimer">Checks up to 3 symbols per server tick (approximately 1 minute). This is not a whole-market scan. No guaranteed alerts or profits. Only qualifying, freshly quoted option contracts are proposed.</p>
 <details className="itt-scanner-settings"><summary>Scan coverage &amp; paper contract budget</summary>
  <div className="itt-scanner-settings-grid"><label>Maximum simulated contract premium ($)<input type="number" min="1" max="5000" step="1" value={budgetDraft} onChange={e=>{setBudgetDraft(e.target.value);setSettingsDirty(true)}}/></label>
  <label>Extra tickers (comma-separated, up to 20)<input type="text" value={symbolsDraft} placeholder="e.g. PLTR, COIN, SMH" onChange={e=>{setSymbolsDraft(e.target.value);setSettingsDirty(true)}}/></label></div>
  <button className="itt-wide-button" disabled={busy||!!p||!!a||!settingsDirty} onClick={saveSettings}>Save scan settings</button>
  <p>Budget is the maximum paper premium per contract, not your actual Schwab buying power. Simulated cash starts at $1,500 and is tracked separately. All new symbols must pass the same options liquidity and risk checks.</p>
  <p>Universe: {(s?.scanUniverse||[]).join(', ')||'Loading…'}</p>
 </details>
 <details className="itt-scanner-activity"><summary>Recent scanner activity ({s?.scanHistory?.length||0})</summary>{(s?.scanHistory||[]).map((x,i)=><p key={x.symbol+String(x.time)+i}><strong>{x.symbol}</strong> · {x.state?.replaceAll('_',' ')} · {time(x.time)} ET — {x.reason}</p>)}{!s?.scanHistory?.length&&<p>Nothing scanned yet. Press START SCAN, then Check / manage now.</p>}</details>
 <p>Paper cash {money(s?.paper?.cash)} · Realized paper P/L {money(s?.paper?.realized)} · Daily paper P/L {money(s?.paper?.dayPnl)} · Unrealized estimate {money(s?.mark?.pnl)}</p>
 
 
 {p&&<div style={{padding:16,background:'#152538'}}><h3>{p.symbol} · 1 simulated contract</h3><p>Entry {money(p.fill)} · Bid {money(s.mark?.bid)} · Ask {money(s.mark?.ask)}</p><p>Stop {money(p.fill*0.8)} · Profit target {money(p.fill*1.3)} · Trailing {p.bestBid>=p.fill*1.15?money(p.bestBid*0.9):'activates at '+money(p.fill*1.15)}</p><p>Time exit: {time(p.time+30*60000)} ET · {s.closeRequested?'EMERGENCY CLOSE PENDING — waiting for a valid positive bid':'Protective exits active'}</p></div>}
 
 {s?.lastScan&&<p>Last scan: {s.lastScan.symbol||''} · {s.lastScan.signal?.reason||s.lastScan.note}</p>}
 {(error||s?.lastError)&&<p role="alert" style={{color:'#ffb0ad'}}>{error||s.lastError}</p>}
 <details className="itt-paper-details"><summary>Server checks, action history and exit reasons</summary><p style={{fontSize:12}}>Server check: {time(s?.heartbeat)} ET · Quote: {time(s?.mark?.quoteTime)} ET. This server-polling simulation checks approximately once per minute, not tick-by-tick.</p>{s?.events?.slice(0,12).map((e,i)=><p key={i} style={{fontSize:12}}>{time(e.time)} ET · {e.text}</p>)}</details>
 {s?.paper?.trades?.slice(-5).reverse().map(t=><p key={t.time}>{t.symbol} · {t.reason} · Simulated P/L {money(t.pnl)}</p>)}
 {a&&<div role="dialog" aria-modal="true" aria-label="Paper opportunity approval" style={{position:'fixed',inset:'12% 8%',zIndex:12000,overflow:'auto',padding:28,background:'#102432',border:'2px solid #3be3bb',borderRadius:18,boxShadow:'0 0 0 100vmax #000b'}}><div className="itt-eyebrow">HIGH-PROBABILITY PLAY · RULES-QUALIFIED · PAPER ONLY</div><h2>{a.contract.underlying} {a.contract.side} · {money(a.contract.strike)}</h2><p>{a.contract.symbol} · Expiry {a.contract.expiration}</p><p>{a.signal.reason}</p><p>Reviewed ask {money(a.contract.ask)} · Stop estimate {money((a.contract.ask+0.01)*0.8)} · Target estimate {money((a.contract.ask+0.01)*1.3)}</p><p>Volume {a.contract.volume} · Open interest {a.contract.openInterest} · Delta {a.contract.delta}</p><p>{now>a.expires?'EXPIRED — skip to resume scanning.':'Approval expires '+time(a.expires)+' ET. Entry is rechecked against a fresh quote.'}</p><button className="itt-wide-button" disabled={busy||!connected||!s.enabled||stale||now>a.expires} onClick={()=>act('accept',a.id)}>TAKE IT — approve one PAPER contract</button> <button className="itt-wide-button" disabled={busy} onClick={()=>act('skip',a.id)}>SKIP / close alert</button><p>Technical qualification is a rules-based screen, not a calibrated probability of profit. No real-money order is sent.</p></div>}
 </section>;
}
