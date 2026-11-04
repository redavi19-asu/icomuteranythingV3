import React,{useEffect,useRef,useState} from 'react';
const API=import.meta.env.VITE_ICA_MASTER_API_URL||'https://ica-master-platform.ryanedavis.workers.dev';
const money=n=>Number.isFinite(n)?'$'+n.toFixed(2):'—';
const time=n=>n?new Date(n).toLocaleTimeString('en-US',{timeZone:'America/New_York'}):'Not checked yet';
export default function PaperSession({connected}){
 const [s,setS]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());const lock=useRef(false);
 async function call(action,id){const token=localStorage.getItem('ica_master_token');const r=await fetch(API+'/platform/paper',{method:action?'POST':'GET',headers:{Authorization:'Bearer '+token,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify({action,id})}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'Paper server unavailable.');return d}
 async function act(action,id){if(lock.current&&!['pause','close'].includes(action))return;lock.current=true;setBusy(true);setError('');try{setS(await call(action,id))}catch(e){setError(e.message)}finally{lock.current=false;setBusy(false)}}
 useEffect(()=>{let active=true,t;async function refresh(){if(!lock.current){try{const data=await call();if(active){setS(data);setError('')}}catch(e){if(active)setError(e.message)}}if(active){setNow(Date.now());t=setTimeout(refresh,5000)}}refresh();return()=>{active=false;clearTimeout(t)}},[]);
 const p=s?.paper?.position,a=s?.pending,stale=!s?.heartbeat||now-s.heartbeat>150000;
 return <section className="itt-card" aria-label="Paper trading control center" style={{padding:20,margin:'14px 0',border:'1px solid #40cbb1'}}>
 <div className="itt-eyebrow">PRIVATE · SERVER PAPER MONEY</div><h3>You approve the entry. ICA manages the simulation.</h3>
 <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
 <button className="itt-wide-button" disabled={busy||!connected||s?.enabled} onClick={()=>act('start')}>Start paper setup scanner</button>
 <button className="itt-wide-button" disabled={!s?.enabled} onClick={()=>act('pause')}>Pause new setups</button>
 <button className="itt-wide-button" disabled={!p} style={{background:'#7d2337'}} onClick={()=>act('close')}>EMERGENCY: Stop & close paper position</button>
 <button className="itt-wide-button" disabled={busy} onClick={()=>act('tick')}>Check / manage now</button></div>
 <p><strong>{s?.enabled?'SCANNER ENABLED':'NEW SETUPS PAUSED'} · {p?'SIMULATED POSITION OPEN':'NO SIMULATED POSITION'}</strong></p>
 <p>Paper cash {money(s?.paper?.cash)} · Realized paper P/L {money(s?.paper?.realized)} · Daily paper P/L {money(s?.paper?.dayPnl)} · Unrealized estimate {money(s?.mark?.pnl)}</p>
 <p style={{color:stale?'#ffb36b':'#60dfb8'}}>Server check: {time(s?.heartbeat)} ET {stale?'— waiting or stale; verify before approving':''} · Contract quote: {time(s?.mark?.quoteTime)} ET</p>
 <p style={{fontSize:12}}>Server checks approximately once per minute, including when this page is closed. This is a polling paper test, not tick-by-tick execution. Quote gaps can delay exits. Refreshing this page does not reset server positions.</p>
 {p&&<div style={{padding:16,background:'#152538'}}><h3>{p.symbol} · 1 simulated contract</h3><p>Entry {money(p.fill)} · Bid {money(s.mark?.bid)} · Ask {money(s.mark?.ask)}</p><p>Stop {money(p.fill*0.8)} · Profit target {money(p.fill*1.3)} · Trailing {p.bestBid>=p.fill*1.15?money(p.bestBid*0.9):'activates at '+money(p.fill*1.15)}</p><p>Time exit: {time(p.time+30*60000)} ET · {s.closeRequested?'EMERGENCY CLOSE PENDING — waiting for a valid positive bid':'Protective exits active'}</p></div>}
 <p style={{fontSize:12}}>Entry approval is required for every trade. $1,500 starting simulated cash; $350 premium cap; $100 daily loss limit; $50 daily target; 3 entries/day. Ask + $0.01 entry, bid − $0.01 exit, $0.65 commission each side. Stops do not guarantee a loss cap.</p>
 {s?.lastScan&&<p>Last scan: {s.lastScan.symbol||''} · {s.lastScan.signal?.reason||s.lastScan.note}</p>}
 {(error||s?.lastError)&&<p role="alert" style={{color:'#ffb0ad'}}>{error||s.lastError}</p>}
 <details open><summary>Actions and exit reasons</summary>{s?.events?.slice(0,12).map((e,i)=><p key={i} style={{fontSize:12}}>{time(e.time)} ET · {e.text}</p>)}</details>
 {s?.paper?.trades?.slice(-5).reverse().map(t=><p key={t.time}>{t.symbol} · {t.reason} · Simulated P/L {money(t.pnl)}</p>)}
 {a&&<div role="dialog" aria-modal="true" aria-label="Paper opportunity approval" style={{position:'fixed',inset:'12% 8%',zIndex:12000,overflow:'auto',padding:28,background:'#102432',border:'2px solid #3be3bb',borderRadius:18,boxShadow:'0 0 0 100vmax #000b'}}><div className="itt-eyebrow">QUALIFYING TECHNICAL SETUP · PAPER ONLY</div><h2>{a.contract.underlying} {a.contract.side} · {money(a.contract.strike)}</h2><p>{a.contract.symbol} · Expiry {a.contract.expiration}</p><p>{a.signal.reason}</p><p>Reviewed ask {money(a.contract.ask)} · Stop estimate {money((a.contract.ask+0.01)*0.8)} · Target estimate {money((a.contract.ask+0.01)*1.3)}</p><p>Volume {a.contract.volume} · Open interest {a.contract.openInterest} · Delta {a.contract.delta}</p><p>{now>a.expires?'EXPIRED — skip to resume scanning.':'Approval expires '+time(a.expires)+' ET. Entry is rechecked against a fresh quote.'}</p><button className="itt-wide-button" disabled={busy||!connected||!s.enabled||stale||now>a.expires} onClick={()=>act('accept',a.id)}>TAKE IT — approve one PAPER contract</button> <button className="itt-wide-button" disabled={busy} onClick={()=>act('skip',a.id)}>SKIP / close alert</button><p>Technical qualification is a rules-based screen, not a calibrated probability of profit. No real-money order is sent.</p></div>}
 </section>;
}
