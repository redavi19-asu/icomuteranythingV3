import React,{useEffect,useState,useRef} from 'react';
import {request} from './SchwabConnection';
import {newPaper,stepPaper} from './paper-session';
const KEY='ica_owner_paper_v1';
export default function PaperSession({connected}){
 const [state,setState]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY))||newPaper()}catch{return newPaper()}}),[on,setOn]=useState(false),[message,setMessage]=useState(''),[candidate,setCandidate]=useState(null),[busy,setBusy]=useState(false);
 const running=useRef(false);
 const current=useRef(state);current.current=state;
 const save=s=>{localStorage.setItem(KEY,JSON.stringify(s));current.current=s;setState(s)};
 useEffect(()=>{const choose=e=>setCandidate(e.detail);window.addEventListener('ica-paper-candidate',choose);return()=>window.removeEventListener('ica-paper-candidate',choose)},[]);
 async function tick(enter=false,close=false){
  if(running.current)return;
  const s=current.current,c=s.position||candidate;if(!c)return;running.current=true;
  setBusy(true);try{const d=await request('options?symbol='+encodeURIComponent(c.underlying));if(d.delayed!==false)throw Error('Paper trading requires confirmed non-delayed data.');const q=d.contracts.find(x=>x.symbol===c.symbol);const updated=stepPaper(s,{quote:q?{...q,underlying:c.underlying}:null,enter,close});save(updated);setMessage(updated.position?'Simulated position monitored.':'No open simulated position.');if(enter)setCandidate(null)}catch(e){setMessage(e.message)}finally{running.current=false;setBusy(false)}
 }
 useEffect(()=>{if(!state.position||!connected)return;let active=true,t;async function poll(){await tick();if(active)t=setTimeout(poll,15000)}poll();return()=>{active=false;clearTimeout(t)}},[state.position?.symbol,connected]);
 return <section className="itt-card" aria-label="Paper trading controls" style={{padding:18,margin:'12px 0'}}><h3>Paper Money · Simulation only</h3>
 <button className="itt-wide-button" role="switch" aria-checked={on} disabled={!connected||busy} onClick={()=>setOn(!on)}>Paper Trading: {on?'ON':'OFF'}</button>
 <p>Paper cash ${state.cash.toFixed(2)} · Realized simulated P/L ${state.realized.toFixed(2)} · {state.trades.length} closed simulations</p>
 <p style={{fontSize:12}}>Starting paper cash $1,500. Entry at ask + $0.01, exit at bid − $0.01; $0.65 fee per side. These are simulated fills. This tab must stay open for monitoring. Turning off blocks entries; open positions continue being monitored while this tab is open.</p>
 <p style={{fontSize:12}}>Manual contract approval · 20% stop · 30% target · trailing activates at +15%, trails 10% · $100 daily loss limit · $50 daily target · 3 entries/day. Autonomous entries are not enabled.</p>
 {state.position?<><strong>OPEN SIMULATION: {state.position.symbol}</strong><button className="itt-wide-button" disabled={busy||!connected} onClick={()=>{setOn(false);tick(false,true)}}>Stop & Close Simulated Position</button></>:candidate?<><p>Review: {candidate.symbol}</p><button className="itt-wide-button" disabled={!on||busy||!connected} onClick={()=>tick(true)}>Approve one paper contract</button><button className="itt-wide-button" onClick={()=>setCandidate(null)}>Dismiss</button></>:<p>Select “Paper review” beside a contract to review an entry.</p>}
 {message&&<p role="status">{message}</p>}
 {state.trades.slice(-5).reverse().map(t=><p key={t.time}>{t.symbol} · {t.reason} · Simulated P/L ${t.pnl.toFixed(2)}</p>)}
 </section>;
}
