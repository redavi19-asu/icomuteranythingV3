import React, {useMemo,useState} from 'react';
import TradingAiAssistant from './TradingAiAssistant';
import TradingApprovalConsole from './TradingApprovalConsole.jsx';
// The trading calculation engine is derived from the private trading-platform repo.
// This panel is mounted only after ICA Master verifies the owner session.
// It contains no API keys, account details, or real order execution.
import {parseMarketCsv,rankOpportunities,PAPER_DEFAULTS,parseOptionQuotesCsv,replayPaperOptions} from './trading-paper-engine.js';


function TradingOwnerPanel(){
 const [tab,setTab]=useState('approvals'),[bars,setBars]=useState(null),[quotes,setQuotes]=useState(null);
 const [names,setNames]=useState({bars:'',quotes:''}),[rules,setRules]=useState({...PAPER_DEFAULTS}),[report,setReport]=useState(null),[error,setError]=useState('');
 const [journal,setJournal]=useState(()=>{try{const v=JSON.parse(localStorage.getItem('ica-trading-owner-paper-v1')||'[]');return Array.isArray(v)?v.slice(0,20):[]}catch{return[]}});
 const ranked=useMemo(()=>rankOpportunities(bars||{},{now:Date.now()}),[bars]);
 const bg={background:'linear-gradient(120deg,#102438,#0a1b2e)',border:'1px solid #31536a',borderRadius:16,padding:19,marginBottom:16};
 const label={display:'flex',flexDirection:'column',gap:7,fontSize:12,color:'#b6d0de',fontWeight:700};
 const field={background:'#0b1c2d',color:'#eaf7fd',border:'1px solid #375a70',borderRadius:9,padding:'9px 11px',width:'100%',minWidth:0};
 const button={padding:'11px 15px',borderRadius:10,border:'1px solid #328d95',background:'#105762',color:'#e8ffff',fontWeight:750,cursor:'pointer'};
 const format=v=>Number.isFinite(v)?(v<0?'−':'')+'$'+Math.abs(v).toFixed(2):'—';
 const upload=async(e,kind)=>{
  const f=e.target.files?.[0];if(!f)return;
  setError('');setReport(null);
  if(f.size>2500000){setError('The CSV file exceeds 2.5 MB.');return;}
  try{
   const text=await f.text();
   if(kind==='bars')setBars(parseMarketCsv(text));
   else setQuotes(parseOptionQuotesCsv(text));
   setNames(prev=>({...prev,[kind]:f.name}));
  }catch(err){setError(err.message||'Cannot parse market file.');if(kind==='bars')setBars(null);else setQuotes(null);}
 };
 const run=()=>{
  try{
   const r=replayPaperOptions(bars,quotes,rules);
   setReport(r);setError('');
   const record={id:crypto.randomUUID(),date:new Date().toISOString(),summary:r.summary};
   setJournal(prev=>{const next=[record,...prev].slice(0,20);try{localStorage.setItem('ica-trading-owner-paper-v1',JSON.stringify(next))}catch{}return next});
  }catch(err){setError(err.message||'Paper session failed.');setReport(null)}
 };
 const controls=[['dailyGoal','Daily paper profit target ($)',5],['premiumBudget','Maximum option premium ($)',25],['startingCash','Starting paper cash ($)',100],['stopLossPct','Stop loss (%)',1],['takeProfitPct','Take profit (%)',5],['trailActivatePct','Activate trailing stop at gain (%)',1],['trailDistancePct','Trailing distance (%)',1],['maxDailyLoss','Daily loss limit ($)',10],['maxLossPerTrade','Maximum estimated risk per trade ($)',5],['maxTradesPerDay','Maximum trades per day',1],['maxConsecutiveLosses','Pause after losing streak',1],['cooldownMinutes','Cooldown (minutes)',5],['maxHoldMinutes','Maximum holding minutes',5]];
 return <section className="ica-owner-trading" style={{maxWidth:1250}}>
  <div style={{...bg,borderColor:'#278d84',background:'linear-gradient(120deg,#133a3d,#101c37)'}}>
   <p className="master-eyebrow">OWNER VERIFIED THROUGH ICA MASTER</p><h2 style={{fontSize:23,color:'#d5fff3',margin:'7px 0'}}>My Trading Platform</h2>
   <p style={{fontSize:13,lineHeight:1.65,color:'#b0c8d4'}}>Use your existing ICA Master email, password and Cloudflare Turnstile. This is your private market-research and Paper Money workspace. Schwab and live order execution are not connected.</p>
   <div style={{display:'flex',gap:9,flexWrap:'wrap',marginTop:18}}>
    {['approvals','paper','radar','ai','roadmap'].map(t=><button key={t} type="button" onClick={()=>setTab(t)} style={{...button,background:tab===t?'#087f7c':'#142e45'}}>{t==='approvals'?'Approval Desk':t==='paper'?'Paper Money Lab':t==='radar'?'Opportunity Radar':t==='ai'?'Ask ICA Trading AI':'AI Trader Roadmap'}</button>)}
   </div>
  </div>
  {error&&<div className="master-error wide" role="alert">{error}</div>}
  {(tab==='paper'||tab==='radar'||tab==='approvals')&&<div style={bg}>
   <h3 style={{fontSize:17,color:'#dff7fe',margin:'0 0 12px'}}>Import actual historical market data</h3>
   <p style={{fontSize:12,lineHeight:1.65,color:'#a2bbc8'}}>No fabricated quotes or trades. Historical bars must contain real timestamped OHLCV values. Option quote snapshots must include actual bid, ask, delta, volume and open interest.</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(225px,1fr))',gap:14}}>
    <label style={label}>Underlying OHLCV bars CSV<input style={field} type="file" accept=".csv,text/csv" onChange={e=>upload(e,'bars')}/><small>{names.bars||'symbol,time,open,high,low,close,volume'}</small></label>
    {(tab==='paper'||tab==='approvals')&&<label style={label}>Option quote timeline CSV<input style={field} type="file" accept=".csv,text/csv" onChange={e=>upload(e,'quotes')}/><small>{names.quotes||'symbol,contract,time,expiration,strike,side,bid,ask,delta,volume,openInterest'}</small></label>}
   </div>
  </div>}
  {(tab==='paper'||tab==='approvals')&&<div style={bg}>
   <h3 style={{fontSize:17,color:'#dff7fe'}}>Stops, profit targets & risk limits</h3>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(205px,1fr))',gap:13}}>
    {controls.map(([key,name,step])=><label key={key} style={label}>{name}<input style={field} type="number" min="0" step={step} value={rules[key]} onChange={e=>{setRules(old=>({...old,[key]:Number(e.target.value)}));setReport(null)}}/></label>)}
   </div>
   <label style={{display:'flex',alignItems:'center',gap:9,fontSize:12,color:'#c4dce6',marginTop:16}}><input type="checkbox" checked={rules.stopAfterDailyGoal} onChange={e=>setRules(old=>({...old,stopAfterDailyGoal:e.target.checked}))}/> Stop new paper entries after reaching daily profit target</label>
   <p style={{fontSize:12,color:'#a9bfcc',lineHeight:1.6,marginTop:15}}>Simulated entries use option ASK + slippage and fees; exits use option BID − slippage and fees. A stop trigger cannot guarantee an execution price, especially across gaps or zero-bid markets.</p>
   <button style={{...button,marginTop:12,opacity:bars&&quotes?.length?1:.5}} disabled={!bars||!quotes?.length} onClick={run}>Run Paper Money Replay</button>
  </div>}
  {tab==='paper'&&report&&<div style={bg}>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:9}}>
    {[['Realized paper P/L',format(report.summary.realizedPnl)],['Closed trades',report.summary.closedTrades],['Win rate',report.summary.winRate===null?'—':report.summary.winRate+'%'],['Open positions',report.summary.openPositions],['Paper cash',format(report.summary.cashBalance)]].map(([k,v])=><div key={k} style={{border:'1px solid #36576a',borderRadius:11,padding:14,background:'#0d2a3c'}}><small style={{fontSize:11,color:'#99bbca'}}>{k}</small><div style={{fontSize:19,fontWeight:800,color:'#dffcff',marginTop:7}}>{v}</div></div>)}
   </div>
   {report.open&&<p style={{color:'#ffcb91',fontSize:12}}>Position still open: {report.open.contract}. Insufficient later executable quotes for a confirmed exit.</p>}
   <h3 style={{color:'#dff7fe',fontSize:17,marginTop:20}}>Paper trade journal</h3>
   {report.trades.length?report.trades.slice(-25).reverse().map(t=><article key={t.contract+t.entryTime} style={{borderBottom:'1px solid #2c4b60',padding:'11px 0',display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><strong style={{fontSize:13,color:'#f0ffff'}}>{t.symbol} {t.side} {t.strike}</strong><p style={{color:'#94b4c4',fontSize:11,margin:'5px 0'}}>Entry {new Date(t.entryTime).toLocaleString()} · Exit {new Date(t.exitTime).toLocaleString()}</p><small style={{color:'#9bbcc8'}}>{t.exitReason.replaceAll('_',' ')} · Model entry {format(t.entryFill)}, exit {format(t.exitFill)}</small></div><strong style={{color:t.pnl>=0?'#70e0b7':'#ff9395'}}>{format(t.pnl)}</strong></article>):<p className="master-empty">No completed paper trades. No setup means WAIT.</p>}
   <p style={{fontSize:12,color:'#adc3cf'}}>Blocked candidate checks: {Object.entries(report.blocked).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>k.replaceAll('_',' ')+' '+v).join(' · ')||'None'}</p>
  </div>}
  {tab==='radar'&&<div style={bg}><h3 style={{fontSize:17,color:'#dff7fe'}}>Ranked technical opportunities</h3><p style={{fontSize:12,color:'#a1becf'}}>This radar evaluates only the historical bar data you import. No licensed live feed is connected.</p>
   {ranked.length?ranked.slice(0,25).map((x,i)=><article key={x.symbol} style={{borderBottom:'1px solid #30566b',padding:'11px 0',display:'flex',justifyContent:'space-between',gap:13,alignItems:'center',flexWrap:'wrap'}}><div><strong style={{color:'#c9f8e9'}}>{i+1}. {x.symbol}</strong><p style={{fontSize:11,color:'#a9c1cf',margin:'5px 0'}}>{x.reason}</p><small style={{fontSize:10,color:'#a7c5cc'}}>RSI {x.metrics?.rsi14??'—'} · VWAP {x.metrics?.vwap??'—'} · volume {x.metrics?.volumeMultiple??'—'}×</small></div><div style={{textAlign:'right'}}><strong style={{color:'#d9fbff'}}>{x.score}/100</strong><p style={{color:x.state==='TECHNICAL_WATCH'?'#6bf0cb':'#e8ba89',fontSize:11,margin:'4px 0'}}>{x.state.replaceAll('_',' ')}</p></div></article>):<p className="master-empty">Import underlying bars to scan them.</p>}
  </div>}
  {tab==='approvals'&&<TradingApprovalConsole bars={bars} quotes={quotes} rules={rules} barName={names.bars} quoteName={names.quotes}/>}
  {tab==='ai'&&<TradingAiAssistant ranked={ranked} report={report} rules={rules} quotes={quotes||[]} barName={names.bars} quoteName={names.quotes}/>}
  {tab==='roadmap'&&<div style={bg}><h3 style={{color:'#d9fff4'}}>AI trading system — paper first</h3><p style={{fontSize:13,color:'#b2cad6',lineHeight:1.7}}>First, use historical data and paper fills to test the stop-loss and gain rules. Next, connect approved Schwab real-time data, scan the market and run a live paper brokerage simulator. Only after extensive forward testing, safety validation and your explicit approval will we consider real orders. AI explanations will never bypass hard risk limits.</p><p style={{fontSize:12,color:'#cbdce6'}}>The original separately protected owner console remains available as a backup while we verify this ICA Master entrance.</p><a href="https://trading-platform-owner.ryanedavis.workers.dev/" target="_blank" rel="noreferrer" style={{color:'#7de3d8',fontSize:12}}>Alternate Owner Console (Cloudflare email-code login)</a></div>}
  <p style={{fontSize:12,color:'#86a5b6'}}>Your latest paper session is stored in this browser only. Saved sessions: {journal.length}. No actual financial data, orders, API credentials or account balances are exposed by this panel.</p>
 </section>
}
export default TradingOwnerPanel;
