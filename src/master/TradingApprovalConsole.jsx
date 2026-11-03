import React,{useMemo,useState,useEffect} from 'react';
import {findApprovalOpportunity,approvePaperOpportunity} from './trading-approval-engine.js';
const card={background:'linear-gradient(110deg,#102b3e,#0d2032)',color:'#dff7ff',border:'1px solid #355b6c',borderRadius:16,padding:18,marginBottom:16};
const button={fontWeight:800,borderRadius:11,border:'1px solid #579a87',padding:'14px 18px',fontSize:15,cursor:'pointer'};
const money=n=>Number.isFinite(n)?(n<0?'−':'')+'$'+Math.abs(n).toFixed(2):'—';
export default function TradingApprovalConsole({bars,quotes,rules,barName='',quoteName=''}) {
 const [state,setState]=useState({trades:[],skippedIds:[],open:null});
 const [message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{setState({trades:[],skippedIds:[],open:null});setError('');setMessage('Practice session reset for the selected data and rules.')},[bars,quotes,rules]);
 const found=useMemo(()=>{try{return findApprovalOpportunity(bars,quotes,rules,state)}catch(e){return {candidate:null,reason:e.message}}},[bars,quotes,rules,state]);
 const c=found.candidate;
 const realized=state.trades.reduce((a,t)=>a+t.pnl,0);
 const reset=()=>{setState({trades:[],skippedIds:[],open:null});setError('');setMessage('New practice session started.')};
 const approve=()=>{
  try{
   const result=approvePaperOpportunity(bars,quotes,rules,c?.id,state);
   if(result.status==='CLOSED'){
    setState(s=>({...s,trades:[...s.trades,result.trade]}));
    setMessage('Paper entry, automated management, and recorded exit complete.');
   }else{
    setState(s=>({...s,open:result.open}));
    setMessage('Paper trade entered; no later executable bid confirmed a close.');
   }
   setError('');
  }catch(e){setError(e.message||'Cannot approve this opportunity.')}
 };
 const skip=()=>{if(c){setState(s=>({...s,skippedIds:[...s.skippedIds,c.id]}));setMessage('Skipped. Checking the next historical opportunity.')}};
 const metric=(name,value)=><div style={{flex:1,minWidth:116,padding:12,borderRadius:10,background:'#112f42',border:'1px solid #3e6072'}}><small style={{display:'block',color:'#a4c0cc',fontSize:11}}>{name}</small><strong style={{fontSize:21,color:'#efffff'}}>{value}</strong></div>;
 return <div style={{maxWidth:1150}}>
  <section style={{...card,background:'linear-gradient(110deg,#14403e,#16243b)',borderColor:'#318c80'}}>
   <p className="master-eyebrow">OWNER PRIVATE · ICA APPROVAL DESK</p>
   <h3 style={{fontSize:23,color:'#eafff7'}}>Find → Approve → Manage → Close</h3>
   <p style={{fontSize:12,color:'#afd0d5'}}>One approval workflow. Currently testing with real imported historical option quotes; Schwab thinkorswim paperMoney is separate.</p>
   <div style={{display:'flex',gap:9,flexWrap:'wrap',marginBottom:13}}>
    <button type="button" aria-pressed="true" style={{...button,background:'#0a7965',color:'#fff',fontSize:12,padding:'8px 14px'}}>PAPER REPLAY</button>
    <button type="button" disabled title="Requires approved Schwab API integration and separate owner activation" style={{...button,background:'#263b4c',color:'#94a8b4',fontSize:12,padding:'8px 14px',cursor:'not-allowed'}}>LIVE · NOT CONNECTED</button>
   </div>
   <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{metric('Realized paper P/L',money(realized))}{metric('Closed trades',state.trades.length)}{metric('Skipped alerts',state.skippedIds.length)}{metric('Position',state.open?'OPEN':'NONE')}</div>
   <small style={{fontSize:10,color:'#99bbc7',display:'block',marginTop:12}}>Imported: {barName||'no stock bars'} · {quoteName||'no option quotes'} · No live prices or brokerage orders</small>
  </section>
  {error&&<section style={{...card,color:'#ffb7b7',borderColor:'#a75555'}} role="alert">{error}</section>}
  {message&&<p role="status" style={{fontSize:12,color:'#9be2d0'}}>{message}</p>}
  {state.open?<section style={{...card,borderColor:'#bfa162'}}>
   <h3 style={{color:'#ffe5b4'}}>PAPER POSITION OPEN — EXIT NOT CONFIRMED</h3>
   <p>{state.open.symbol} {state.open.side} · {state.open.contract}</p>
   <p style={{fontSize:12}}>Entry {money(state.open.entryCost)} · Last bid {state.open.lastBid??'—'} · Unrealized mark {money(state.open.estimatedMarkPnl)}</p>
   <p style={{fontSize:11}}>Historical quotes ended before a confirmed exit. No realized profit is recorded.</p>
   <button type="button" onClick={reset} style={{...button,color:'#fff',background:'#254259',fontSize:12}}>Start new practice session</button>
  </section>:c?<section aria-live="polite" style={{...card,border:'2px solid #4ac99e',background:'linear-gradient(120deg,#104745,#162944)',boxShadow:'0 0 25px #4ac99e20'}}>
   <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:7}}><strong style={{fontSize:17,color:'#b1ffe2'}}>⚡ TRADE OPPORTUNITY DETECTED</strong><small style={{color:'#b0dace'}}>HISTORICAL PAPER ALERT</small></div>
   <h3 style={{fontSize:31,color:'#effff8',margin:'14px 0 4px'}}>{c.symbol} {c.side}</h3>
   <p style={{fontSize:13,overflowWrap:'anywhere'}}>{c.contract} · Strike {'$'}{c.strike} · Expires {c.expiration}</p>
   <p style={{fontSize:11,color:'#b6d6dc'}}>At {new Date(c.time).toLocaleString()} · Technical score {c.technicalScore}/100</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:9,margin:'16px 0'}}>
    {[['Option ask',money(c.ask*100)],['Entry including fees',money(c.entryCost)],['Bid / ask',c.bid.toFixed(2)+' / '+c.ask.toFixed(2)],['Spread',c.spreadPct.toFixed(2)+'%'],['Stop trigger','$'+c.stopBid.toFixed(2)],['Profit trigger','$'+c.targetBid.toFixed(2)],['Estimated stop risk',money(c.estimatedStopRisk)]].map(([name,val])=><div key={name} style={{padding:12,background:'#10364b',border:'1px solid #3d6773',borderRadius:10}}><small style={{color:'#aacbd2',display:'block',fontSize:10}}>{name}</small><strong style={{fontSize:16,color:'#eaffff'}}>{val}</strong></div>)}
   </div>
   <p style={{fontSize:12,color:'#b9dadd'}}>{c.technicalReason}</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginTop:16}}>
    <button type="button" onClick={approve} style={{...button,padding:18,background:'#087f5c',color:'#fff'}}>✓ TRADE THIS</button>
    <button type="button" onClick={skip} style={{...button,padding:18,background:'#1c3248',color:'#fff',borderColor:'#6a8a97'}}>✕ SKIP TRADE</button>
   </div>
   <p style={{fontSize:11,color:'#acd3d8',marginTop:12}}>Approve enters one historical paper contract and automatically checks subsequent imported bids for stops, targets and exit conditions. Does not access Schwab.</p>
  </section>:<section style={{...card,padding:'32px 20px',textAlign:'center'}}>
   <strong style={{fontSize:17,color:'#e4fff8'}}>{bars&&quotes?.length?'NO QUALIFIED TRADE — WAIT':'IMPORT HISTORICAL DATA TO BEGIN'}</strong>
   <p style={{fontSize:12,color:'#a8c8d1'}}>{found.reason}</p>
  </section>}
  {state.trades.length>0&&<section style={card}>
   <h3 style={{color:'#d9fff4'}}>Automatic paper trade results</h3>
   {state.trades.slice().reverse().map(t=><article key={t.approvalId} style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',padding:'13px 0',borderTop:'1px solid #385b6c'}}>
    <div><strong style={{color:'#d6fff4'}}>{t.symbol} {t.side} · {t.contract}</strong><p style={{fontSize:11,color:'#a3c9d1'}}>Entry {new Date(t.entryTime).toLocaleString()} · Exit {new Date(t.exitTime).toLocaleString()}</p><small style={{fontSize:11,color:'#aed2db'}}>{money(t.entryCost)} → {money(t.exitCredit)} · {t.exitReason.replaceAll('_',' ')}</small></div>
    <strong style={{fontSize:22,color:t.pnl>=0?'#76e5b9':'#ff9b9b'}}>{money(t.pnl)}</strong>
   </article>)}
  </section>}
  {(state.trades.length>0||state.skippedIds.length>0)&&!state.open&&<button type="button" onClick={reset} style={{...button,color:'#fff',background:'#234052',fontSize:12}}>Reset practice session</button>}
 </div>;
}
