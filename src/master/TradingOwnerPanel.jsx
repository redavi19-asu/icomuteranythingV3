import React,{useState} from 'react';
import TradingAiAssistant from './TradingAiAssistant';

/**
 * Private ICA Trading owner dashboard.
 * Intentionally NO historical CSV upload, duplicate paper simulator, fabricated
 * live prices, or mock trade approvals. Keep the eventual approval workflow
 * visible but fail-closed until authenticated Schwab brokerage integration.
 */
const riskPlan={stopLossPct:20,takeProfitPct:30,trailActivatePct:15,trailDistancePct:10,maxDailyLoss:100,maxLossPerTrade:80,maxTradesPerDay:3,maxHoldMinutes:30,dailyGoal:50};
const surface={background:'linear-gradient(120deg,#102a3c,#101d30)',border:'1px solid #31566a',borderRadius:16,padding:19,marginBottom:16};
const metricBox={padding:14,borderRadius:12,border:'1px solid #375a6e',background:'#102e41',flex:'1 1 150px',minWidth:0};
const actions={fontWeight:850,fontSize:15,padding:'17px 14px',borderRadius:11,border:'1px solid #3c6076',width:'100%'};
const watching=['SPY','QQQ','TQQQ','IWM','XLE','XLF','BNO','BAC','SOFI'];

function TradingOwnerPanel(){
 const [tab,setTab]=useState('dashboard');
 const tabStyle=active=>({padding:'11px 15px',borderRadius:10,fontWeight:800,fontSize:12,cursor:'pointer',border:'1px solid #327e83',background:active?'#087874':'#142e45',color:'#e7fffc'});
 return <section className="ica-owner-trading" style={{maxWidth:1250}}>
  <section style={{...surface,borderColor:'#2d938b',background:'linear-gradient(115deg,#113e3b,#142139)'}}>
   <p className="master-eyebrow">PRIVATE ICA MASTER · TRADING</p>
   <h2 style={{fontSize:24,color:'#e3fff5',margin:'7px 0'}}>ICA Trading Dashboard</h2>
   <p style={{fontSize:13,lineHeight:1.65,color:'#bad4db',maxWidth:800}}>
    Your future trading command center: ICA finds an opportunity, you approve or skip, and the execution engine manages the approved trade and reports the result.
   </p>
   <div style={{display:'flex',gap:9,flexWrap:'wrap',marginTop:16}}>
    <button type="button" onClick={()=>setTab('dashboard')} aria-pressed={tab==='dashboard'} style={tabStyle(tab==='dashboard')}>Trading Dashboard</button>
    <button type="button" onClick={()=>setTab('ai')} aria-pressed={tab==='ai'} style={tabStyle(tab==='ai')}>Ask ICA Trading AI</button>
   </div>
  </section>
  {tab==='dashboard'&&<>
   <section style={surface}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
     <h3 style={{fontSize:17,color:'#dcf9f5',margin:0}}>Trading overview</h3>
     <span style={{fontSize:11,color:'#ffcb91',border:'1px solid #ad8254',borderRadius:20,padding:'5px 11px'}}>SCHWAB API CONNECTION PENDING</span>
    </div>
    <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:15}}>
     {[['Market scanner','Awaiting data feed'],['Open positions','Not synced'],['Today’s realized P/L','Not synced'],['Auto execution','Not activated']].map(([name,value])=><div key={name} style={metricBox}><small style={{display:'block',fontSize:11,color:'#a4c2cf'}}>{name}</small><strong style={{display:'block',fontSize:16,color:'#eafff8',marginTop:7}}>{value}</strong></div>)}
    </div>
   </section>
   <section style={surface}>
    <h3 style={{color:'#e2f9ff',fontSize:17,margin:'0 0 8px'}}>Options watchlist</h3>
    <p style={{color:'#a4c0ca',fontSize:12,lineHeight:1.6}}>These are symbols ICA will scan after its approved market-data connection is active. No prices or signals are invented.</p>
    <div style={{display:'flex',gap:9,flexWrap:'wrap',marginTop:14}}>
     {watching.map(symbol=><span key={symbol} style={{border:'1px solid #38677a',borderRadius:11,background:'#103244',color:'#e5ffff',padding:'10px 15px',fontWeight:800,fontSize:13}}>{symbol}</span>)}
    </div>
   </section>
   <section aria-live="polite" style={{...surface,border:'2px solid #3c8e82',background:'linear-gradient(115deg,#123e40,#14283f)'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:9,flexWrap:'wrap'}}>
     <strong style={{fontSize:17,color:'#a5ffe0'}}>⚡ TRADE OPPORTUNITY ALERT</strong>
     <span style={{color:'#accbd0',fontSize:11}}>WAITING FOR A VERIFIED SIGNAL</span>
    </div>
    <h3 style={{color:'#f0fffa',fontSize:25,margin:'16px 0 7px'}}>No trade selected</h3>
    <p style={{color:'#bbd8dd',fontSize:13,lineHeight:1.7}}>
     When ICA confirms an options setup, its contract, entry quote, stop-loss and profit target will appear here for your approval.
    </p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12,marginTop:18}}>
     <button disabled type="button" style={{...actions,background:'#205547',color:'#9ebdb4',cursor:'not-allowed'}} title="Requires a verified opportunity and approved Schwab trading connection">✓ TRADE THIS</button>
     <button disabled type="button" style={{...actions,background:'#223749',color:'#a9bdc7',cursor:'not-allowed'}} title="No opportunity to skip yet">✕ SKIP TRADE</button>
    </div>
    <p style={{fontSize:11,color:'#8fb6c6',margin:'14px 0 0'}}>The buttons activate only for a genuine broker-connected opportunity. Nothing is being traded right now.</p>
   </section>
   <section style={surface}>
    <h3 style={{fontSize:17,color:'#d9fff4',margin:'0 0 8px'}}>Risk controls for the trading engine</h3>
    <p style={{fontSize:12,color:'#a9c6cd'}}>Planned strategy defaults. These are not active broker orders until the execution engine is connected and tested.</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:9,marginTop:14}}>
     {[['Stop-loss',riskPlan.stopLossPct+'%'],['Profit target',riskPlan.takeProfitPct+'%'],['Trail after',riskPlan.trailActivatePct+'% gain'],['Trail distance',riskPlan.trailDistancePct+'%'],['Daily loss cap','$'+riskPlan.maxDailyLoss],['Trades per day',riskPlan.maxTradesPerDay]].map(([name,value])=><div key={name} style={{border:'1px solid #37556b',background:'#112c40',borderRadius:10,padding:'11px 13px',minWidth:115}}><small style={{display:'block',fontSize:10,color:'#98b8c4'}}>{name}</small><strong style={{display:'block',color:'#e9ffff',fontSize:14,marginTop:5}}>{value}</strong></div>)}
    </div>
   </section>
  </>}
  {tab==='ai'&&<TradingAiAssistant ranked={[]} report={null} rules={riskPlan} quotes={[]}/>}
 </section>;
}
export default TradingOwnerPanel;
