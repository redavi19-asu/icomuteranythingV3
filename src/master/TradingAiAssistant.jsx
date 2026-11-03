import React, {useEffect,useMemo,useRef,useState} from 'react';

/**
 * Owner-only Trading AI front end. Routes through the existing ICA Master
 * authorization token; API keys and model calls live ONLY in the Worker.
 * Chat messages stay in React memory for the current view session.
 */
const MASTER_API = import.meta.env.VITE_ICA_MASTER_API_URL || 'https://ica-master-platform.ryanedavis.workers.dev';

async function privateTradingRequest(path, payload=null){
  const token = localStorage.getItem('ica_master_token') || '';
  if(!token)throw new Error('Sign in through ICA Master to use the Trading AI Assistant.');
  const response = await fetch(MASTER_API+path,{
    method:payload?'POST':'GET',
    headers:{
      Authorization:'Bearer '+token,
      ...(payload?{'Content-Type':'application/json'}:{})
    },
    ...(payload?{body:JSON.stringify(payload)}:{})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const error = new Error(data.error||'The private trading assistant is unavailable.');
    error.status=response.status;
    throw error;
  }
  return data;
}
const darkPanel={background:'linear-gradient(130deg,#102638,#0a1a2f)',border:'1px solid #31576a',borderRadius:16,padding:19};
const muted={fontSize:12,color:'#9fbacb',lineHeight:1.6};
const btn={padding:'10px 14px',borderRadius:9,border:'1px solid #40889c',color:'#e9f9ff',background:'#17485e',fontSize:12,fontWeight:800,cursor:'pointer'};

export default function TradingAiAssistant({ranked=[],report=null,rules={},quotes=[],barName='',quoteName=''}) {
  const [status,setStatus]=useState(null);
  const [statusError,setStatusError]=useState('');
  const [question,setQuestion]=useState('');
  const [messages,setMessages]=useState([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [checking,setChecking]=useState(true);
  const [verified,setVerified]=useState(false);
  const end=useRef(null);
  const inFlight=useRef(false);

  const refresh=async()=>{
    setChecking(true);setStatusError('');setVerified(false);
    try{const data=await privateTradingRequest('/platform/trading-ai/status');setStatus(data)}
    catch(err){setStatus(null);setStatusError(err.message)}
    finally{setChecking(false)}
  };
  useEffect(()=>{refresh()},[]);
  useEffect(()=>{end.current?.scrollIntoView?.({behavior:'smooth',block:'end'})},[messages]);

  const context=useMemo(()=>{
    const options=[...quotes].sort((a,b)=>b.time-a.time).slice(0,8).map(q=>({
      symbol:q.symbol,contract:q.contract,side:q.side,expiry:q.expiration,
      strike:q.strike,bid:q.bid,ask:q.ask,delta:q.delta,volume:q.volume,
      openInterest:q.openInterest,asOf:new Date(q.time).toISOString()
    }));
    const relevant=ranked.slice(0,8).map(x=>({
      symbol:x.symbol,state:x.state,direction:x.direction,score:x.score,
      reason:x.reason,asOf:x.asOf||''
    }));
    const keys=['premiumBudget','startingCash','stopLossPct','takeProfitPct','trailActivatePct','trailDistancePct','maxDailyLoss','maxLossPerTrade','maxTradesPerDay','maxHoldMinutes','dailyGoal'];
    const safeRules=Object.fromEntries(keys.filter(k=>Number.isFinite(rules[k])).map(k=>[k,rules[k]]));
    return {
      source:'USER_IMPORTED_UNVERIFIED_CSV_OR_NO_DATA',
      asOf:new Date().toISOString(),
      note:(barName?'Bars file: '+barName+'. ':'')+(quoteName?'Option snapshots file: '+quoteName+'. ':'')+'This is NOT a live or licensed market feed.',
      rules:safeRules,opportunities:relevant,optionQuotes:options,paper:report?.summary||null
    };
  },[ranked,report,rules,quotes,barName,quoteName]);

  const ask=async(event)=>{
    event?.preventDefault?.();
    const message=question.trim();
    if(busy||inFlight.current||!status?.configured||!message||message.length>1800)return;
    setBusy(true);inFlight.current=true;setError('');setQuestion('');
    setMessages(prev=>[...prev,{id:crypto.randomUUID(),role:'user',content:message}]);
    try{
      const payload={message,history:messages.slice(-6).map(x=>({role:x.role,content:x.content})),context};
      const reply=await privateTradingRequest('/platform/trading-ai/chat',payload);
      setMessages(prev=>[...prev,{id:crypto.randomUUID(),role:'assistant',content:reply.answer}]);
      setVerified(true);
    }catch(err){
      setError(err.message);
      setQuestion(message);
    }finally{setBusy(false);inFlight.current=false}
  };
  const ready=status?.configured===true;
  const hasData=Boolean(ranked.length||quotes.length||report);
  const examples=[
    'Review my paper results and explain the stop-loss and profit-target performance.',
    'Which imported setups should I skip because confirmation is incomplete?',
    'How do bid-ask spread and delta affect a quick SPY options scalp?',
    'What would make a trade worth waiting for rather than entering early?'
  ];
  return <div className="ica-trading-ai" style={{maxWidth:1200,display:'grid',gap:14}}>
    <section style={{...darkPanel,background:'linear-gradient(120deg,#103f43,#16233c)',borderColor:'#3b9d98'}}>
      <div style={{display:'flex',gap:14,flexWrap:'wrap',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <p className="master-eyebrow">PRIVATE OWNER · OPENAI-POWERED RESEARCH</p>
          <h3 style={{fontSize:20,color:'#dafff6',margin:'8px 0'}}>Ask ICA Trading AI</h3>
          <p style={{...muted,margin:'6px 0 0',maxWidth:750}}>
            Discuss market conditions, options contract liquidity, entries, stops and paper trades.
            The assistant receives only the selected imported research summary; it does not see your brokerage account or control orders.
          </p>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:7}}>
          <strong style={{color:ready?'#8ef5c8':'#f9c38c',fontSize:12}}>
            {checking?'CHECKING CONNECTION…':ready?(verified?'AI RESPONSE VERIFIED':'API KEY CONFIGURED · SEND A TEST'):'AI CONNECTION PENDING'}
          </strong>
          <small style={{fontSize:10,color:'#a6c3d1'}}>NO LIVE DATA · NO REAL ORDERS</small>
          <button type="button" onClick={refresh} disabled={checking} style={{...btn,padding:'6px 11px'}}>Check connection</button>
        </div>
      </div>
      {(statusError||!ready&&!checking)&&<div style={{marginTop:17,padding:13,border:'1px solid #a87e50',borderRadius:10,background:'#4e362844',color:'#f5d7b9',fontSize:12,lineHeight:1.6}} role="status">
        {statusError||'The AI interface is installed, but ICA Master does not yet have its own OpenAI API key. Add OPENAI_API_KEY securely to the ica-master-platform Worker to activate answers. Never put an API key in this chat or browser form.'}
      </div>}
    </section>
    <section style={darkPanel}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <strong style={{color:'#daf7f3',fontSize:13}}>Private conversation</strong>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <small style={{fontSize:11,color:'#94b1c2'}}>{hasData?'Imported research summary ready':'No imported quotes attached'}</small>
          {messages.length>0&&<button type="button" onClick={()=>{setMessages([]);setError('')}} style={{...btn,padding:'5px 10px',background:'#183247'}}>Clear</button>}
        </div>
      </div>
      <div aria-live="polite" style={{display:'flex',flexDirection:'column',gap:12,minHeight:190,maxHeight:440,overflowY:'auto',padding:'17px 2px',marginTop:8}}>
        {messages.length===0&&<p style={{...muted,margin:'10px auto',maxWidth:660,textAlign:'center'}}>Ask about a technical setup, why to WAIT, contract spreads, stop loss, trailing profit, or your latest Paper Money replay. Without verified market quotes, the correct decision may be WAIT.</p>}
        {messages.map(item=><article key={item.id} style={{
          whiteSpace:'pre-wrap',overflowWrap:'anywhere',alignSelf:item.role==='user'?'flex-end':'flex-start',
          background:item.role==='user'?'#164a4c':'#142c43',border:'1px solid '+(item.role==='user'?'#3a8b83':'#375671'),
          padding:'12px 14px',borderRadius:13,color:'#e9f9ff',maxWidth:'90%',fontSize:12,lineHeight:1.65
        }}>
          <small style={{display:'block',color:item.role==='user'?'#88f2d3':'#80b8d7',marginBottom:5,fontWeight:800}}>{item.role==='user'?'YOU':'ICA TRADING AI'}</small>
          {item.content}
        </article>)}
        {busy&&<p style={{...muted,margin:0}}>Analyzing your question…</p>}
        <div ref={end}/>
      </div>
      {error&&<p role="alert" style={{fontSize:12,color:'#ffb0ad',margin:0}}>{error}</p>}
      <form onSubmit={ask} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',alignItems:'end',gap:9,marginTop:12}}>
        <label style={{display:'flex',flexDirection:'column',gap:7,fontSize:11,color:'#a5c3d0'}}>
          Your question
          <textarea aria-label="Question for the Trading AI" value={question} onChange={e=>setQuestion(e.target.value)}
            maxLength={1800} rows={3} placeholder={ready?'Ask about SPY, BNO, your risk plan or paper results…':'AI connection pending. OpenAI API key required.'}
            style={{background:'#0b2032',border:'1px solid #366377',borderRadius:10,color:'#ebfaff',padding:13,resize:'vertical',font:'inherit',fontSize:12,minWidth:0,width:'100%'}}/>
        </label>
        <button type="submit" disabled={!ready||busy||!question.trim()} style={{...btn,opacity:ready&&!busy&&question.trim()?1:.4,marginBottom:0}}>Send</button>
      </form>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:13}}>
        {examples.map(item=><button type="button" key={item} onClick={()=>setQuestion(item)} style={{...btn,padding:'7px 9px',background:'#142f42',fontSize:10,fontWeight:650,maxWidth:270,textAlign:'left'}}>{item}</button>)}
      </div>
    </section>
    <p style={{...muted,fontSize:11}}>OpenAI model replies are explanatory research, not trading signals or guaranteed results. This conversation lasts only until you leave this view. No background monitoring, paper order placement or Schwab order execution is enabled. The AI provider is called with response storage disabled.</p>
  </div>;
}
