import React,{useEffect,useRef,useState} from 'react';
import TradingAiAssistant from './TradingAiAssistant';
import './TradingTerminal.css';

/* Owner-only market workstation. Public TradingView charts are for visual research
 * and are NOT a Schwab data feed, execution signal or options chain.
 * No simulated account balances, trades, price quotes or scanner status. */
const tickerGroups={
  Favorites:['SPY','QQQ','TQQQ','IWM','XLE','XLF','BNO','BAC','SOFI'],
  Indexes:['SPY','QQQ','IWM','DIA','TQQQ'],
  Energy:['XLE','BNO','USO','XOM','CVX'],
  Financials:['XLF','BAC','JPM','SOFI']
};
const descriptions={SPY:'S&P 500 ETF',QQQ:'Nasdaq 100 ETF',TQQQ:'3× Nasdaq ETF',IWM:'Russell 2000 ETF',XLE:'Energy sector ETF',XLF:'Financials sector ETF',BNO:'Brent oil ETF',BAC:'Bank of America',SOFI:'SoFi Technologies',DIA:'Dow Jones ETF',USO:'US Oil Fund',XOM:'Exxon Mobil',CVX:'Chevron',JPM:'JPMorgan'};
const tvSymbols={SPY:'AMEX:SPY',QQQ:'NASDAQ:QQQ',TQQQ:'NASDAQ:TQQQ',IWM:'AMEX:IWM',DIA:'AMEX:DIA',XLE:'AMEX:XLE',XLF:'AMEX:XLF',BNO:'AMEX:BNO',USO:'AMEX:USO',BAC:'NYSE:BAC',SOFI:'NASDAQ:SOFI',XOM:'NYSE:XOM',CVX:'NYSE:CVX',JPM:'NYSE:JPM'};
const riskPlan={stopLossPct:20,takeProfitPct:30,trailActivatePct:15,trailDistancePct:10,maxDailyLoss:100,maxLossPerTrade:80,maxTradesPerDay:3,maxHoldMinutes:30,dailyGoal:50};
function TVMarketChart({symbol,interval}){
 const ref=useRef(null);
 useEffect(()=>{
  const host=ref.current;if(!host)return;
  host.replaceChildren();
  const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';widget.style.height='100%';widget.style.width='100%';host.appendChild(widget);
  const script=document.createElement('script');
  script.type='text/javascript';script.async=true;
  script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.textContent=JSON.stringify({
   autosize:true,symbol:tvSymbols[symbol]||symbol,interval:String(interval),
   timezone:'America/New_York',theme:'dark',style:'1',locale:'en',
   enable_publishing:false,hide_top_toolbar:false,hide_side_toolbar:false,
   hide_legend:false,allow_symbol_change:true,save_image:false,withdateranges:true,
   hide_volume:false,backgroundColor:'#0b1423',gridColor:'rgba(81,111,148,0.12)',
   support_host:'https://www.tradingview.com'
  });
  host.appendChild(script);
  return ()=>{host.replaceChildren()};
 },[symbol,interval]);
 return <div className="itv-embed" ref={ref} aria-label={'TradingView market chart for '+symbol}/>;
}
function TVTickerTape(){
 const ref=useRef(null);
 useEffect(()=>{
  const host=ref.current;if(!host)return;
  host.replaceChildren();
  const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';host.appendChild(widget);
  const script=document.createElement('script');script.async=true;
  script.src='https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
  script.type='text/javascript';
  script.textContent=JSON.stringify({symbols:[
   {proName:'AMEX:SPY',title:'SPY'},{proName:'NASDAQ:QQQ',title:'QQQ'},
   {proName:'AMEX:IWM',title:'IWM'},{proName:'AMEX:XLE',title:'XLE'},
   {proName:'AMEX:BNO',title:'BNO'},{proName:'NYSE:BAC',title:'BAC'}
  ],showSymbolLogo:false,colorTheme:'dark',isTransparent:true,displayMode:'adaptive',locale:'en'});
  host.appendChild(script);
  return ()=>host.replaceChildren();
 },[]);
 return <div className="itv-tape" ref={ref} aria-label="Third-party TradingView public market ticker tape"/>;
}
const icon=(type,size=18)=>{
 const shared={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true};
 if(type==='radar')return <svg {...shared}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 12L19 6"/><path d="M12 3v2M3 12h2"/></svg>;
 if(type==='shield')return <svg {...shared}><path d="M12 2 20 6v6c0 5-3.3 8.2-8 10-4.7-1.8-8-5-8-10V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>;
 if(type==='chart')return <svg {...shared}><path d="M3 20V4M3 20h18M6 15l4-4 4 2 5-7"/><path d="M16 6h3v3"/></svg>;
 if(type==='clock')return <svg {...shared}><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>;
 if(type==='bolt')return <svg {...shared}><path d="m13 2-9 12h7l-1 8 10-12h-7z"/></svg>;
 if(type==='crosshair')return <svg {...shared}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>;
 if(type==='bot')return <svg {...shared}><rect x="3" y="7" width="18" height="13" rx="4"/><path d="M12 3v4M9 3h6M7 13h2M15 13h2M8 17h8"/></svg>;
 return <svg {...shared}><path d="M4 12h16M14 6l6 6-6 6"/></svg>;
};
const statRows=[
 {label:'Scanner Engine',value:'OFFLINE',helper:'Awaiting Schwab market data',type:'radar'},
 {label:'Positions',value:'—',helper:'Brokerage account not synced',type:'crosshair'},
 {label:"Today’s Realized P/L",value:'—',helper:'Actual results after connection',type:'chart'},
 {label:'Trade Automation',value:'LOCKED',helper:'Approval and execution pending',type:'shield'}
];
const ruleChecks=[
 ['Market direction','VWAP, trend and price action'],
 ['Momentum confirmation','Breakout, RSI and volume'],
 ['Option liquidity','Spread, delta, volume and OI'],
 ['Risk checks','Stops, profit targets and daily limits']
];
function readAutoStart(){
 try{return localStorage.getItem('ica_trading_pref_autostart930')==='true'}
 catch{return false}
}
export default function TradingOwnerPanel(){
 const [tab,setTab]=useState('dashboard');
 const [selected,setSelected]=useState('SPY');
 const [group,setGroup]=useState('Favorites');
 const [interval,setIntervalValue]=useState('5');
 const [chainSide,setChainSide]=useState('CALL');
 const [autoStart,setAutoStart]=useState(readAutoStart);
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30000);return ()=>clearInterval(id)},[]);
 const clockText=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',hour12:true}).format(now);
 const toggleAuto=()=>{
  setAutoStart(v=>{const next=!v;try{localStorage.setItem('ica_trading_pref_autostart930',String(next))}catch{}return next});
 };
 const chartUrl='https://www.tradingview.com/chart/?symbol='+encodeURIComponent(tvSymbols[selected]||selected);
 return <section className="ica-trading-terminal">
  <header className="itt-hero">
   <div className="itt-brand">
    <span className="itt-brand-emblem">{icon('radar',27)}</span>
    <div><div className="itt-eyebrow">PRIVATE ICA MASTER / TRADING INTELLIGENCE</div><h2>ICA <span>PRIME</span></h2><p>High-Probability Trading Workstation</p></div>
   </div>
   <div className="itt-status-bar"><span className="itt-status itt-off"><span className="itt-status-dot"/> SCHWAB DISCONNECTED</span><span className="itt-status itt-off">SCANNER OFF</span><span className="itt-clock">{icon('clock',15)} {clockText} ET</span></div>
  </header>
  <nav className="itt-tabs" aria-label="Trading workspace views">
   <button type="button" className={tab==='dashboard'?'active':''} onClick={()=>setTab('dashboard')}>{icon('chart',16)} Trading Dashboard</button>
   <button type="button" className={tab==='ai'?'active':''} onClick={()=>setTab('ai')}>{icon('bot',16)} Ask ICA Trading AI</button>
  </nav>
  {tab==='dashboard'&&<>
   <section className="itt-ticker-tape" aria-label="Public market prices from TradingView">
    <span className="itt-tape-label">MARKET TAPE</span>
    <TVTickerTape/>
   </section>
   <div className="itt-stats">
    {statRows.map(s=><div className="itt-stat" key={s.label}><div className="itt-stat-heading"><span className="itt-stat-icon">{icon(s.type,17)}</span><small>{s.label}</small></div><strong>{s.value}</strong><p>{s.helper}</p></div>)}
   </div>
   <div className="itt-layout">
    <div className="itt-main">
     <section className="itt-card itt-chart-panel">
      <div className="itt-card-heading">
       <div className="itt-title-group"><span className="itt-title-icon">{icon('chart',19)}</span><div><div className="itt-eyebrow">MARKET WORKSTATION / PUBLIC CHART</div><h3>{selected} <span>{descriptions[selected]||'Market symbol'}</span></h3></div></div>
       <div className="itt-intervals" aria-label="Chart timeframe">
        {[['1','1m'],['5','5m'],['15','15m'],['60','1h'],['D','1D']].map(([val,name])=><button key={val} className={interval===val?'active':''} type="button" aria-pressed={interval===val} onClick={()=>setIntervalValue(val)}>{name}</button>)}
       </div>
      </div>
      <div className="itt-chart-embed"><TVMarketChart symbol={selected} interval={interval}/></div>
      <div className="itt-chart-footer"><span>TradingView public chart · exchange data may be delayed · not ICA’s broker feed</span><a href={chartUrl} target="_blank" rel="noopener noreferrer">Open full chart ↗</a></div>
     </section>
     <section className="itt-card itt-alert-panel" aria-live="polite">
      <div className="itt-alert-top"><div className="itt-alert-heading"><span className="itt-alert-flash">{icon('bolt',21)}</span><div><div className="itt-eyebrow">HIGH-PROBABILITY ENGINE</div><h3>Trade Opportunity Alert</h3></div></div><span className="itt-alert-label">NO VERIFIED SETUP</span></div>
      <div className="itt-alert-body"><div className="itt-radar-viz"><span/><span/><span/>{icon('crosshair',32)}</div><div><h4>Waiting for our first qualifying play</h4><p>When ICA finds a confirmed option setup, the exact contract, entry, stop-loss and profit target will fill this alert. You make the decision.</p><div className="itt-signal-tags"><span>LIQUIDITY</span><span>MOMENTUM</span><span>RISK GATES</span></div></div></div>
      <div className="itt-alert-actions"><button type="button" disabled title="Unlocks after a verified Schwab-connected signal">✓ TRADE THIS</button><button type="button" disabled title="No verified trade to skip yet">✕ SKIP TRADE</button></div>
      <div className="itt-alert-foot">{icon('shield',15)} Approved entry → automatic stop/target management → exit → realized result. Inactive until integration.</div>
     </section>
     <section className="itt-card itt-activity-panel"><div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('chart',18)}</span><div><div className="itt-eyebrow">TRADE PERFORMANCE</div><h3>Today's Results</h3></div></div><span className="itt-muted-badge">BROKER SYNC PENDING</span></div>
      <div className="itt-pnl-grid"><div><small>Realized P/L</small><strong>—</strong></div><div><small>Trades Closed</small><strong>—</strong></div><div><small>Win Rate</small><strong>—</strong></div><div><small>Open Position</small><strong>—</strong></div></div>
      <div className="itt-empty-log"><span>{icon('clock',22)}</span><div><strong>No verified trade history yet</strong><p>Completed approved trades and actual account results will appear here after the Schwab integration is operational.</p></div></div>
     </section>
    </div>
    <aside className="itt-side">
     <section className="itt-card itt-watchlist">
      <div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('radar',18)}</span><div><div className="itt-eyebrow">MARKET RADAR</div><h3>Watchlist</h3></div></div><span className="itt-mini-dot">● OFF</span></div>
      <div className="itt-watch-tabs">{Object.keys(tickerGroups).map(k=><button type="button" aria-pressed={group===k} key={k} className={group===k?'active':''} onClick={()=>{setGroup(k);if(!tickerGroups[k].includes(selected))setSelected(tickerGroups[k][0])}}>{k}</button>)}</div>
      <div className="itt-watch-labels"><span>SYMBOL</span><span>LAST</span><span>SCAN</span></div>
      <div className="itt-watch-rows">{tickerGroups[group].map(sym=><button type="button" className={sym===selected?'itt-selected':''} key={sym} onClick={()=>setSelected(sym)}><span><strong>{sym}</strong><small>{descriptions[sym]}</small></span><span className="itt-blank-price">—</span><span className="itt-ticker-state">WAIT</span></button>)}</div>
      <div className="itt-watch-foot">Tap a symbol to open its public chart. Actual option signals require the Schwab feed.</div>
     </section>
     <section className="itt-card itt-scan-panel"><div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('crosshair',18)}</span><div><div className="itt-eyebrow">SCANNER CONTROLS</div><h3>High-Probability Scan</h3></div></div></div>
      <div className="itt-scanner-center"><span className="itt-large-status"><i/> OFFLINE</span><p>Brokerage market-data connection pending.</p><button type="button" disabled className="itt-start-scan">{icon('radar',20)} START SCAN</button></div>
      <label className="itt-autostart"><span><strong>Auto-start at 9:30 AM ET</strong><small>Preference saved on this device. Activates when the server scanner is ready.</small></span><input type="checkbox" checked={autoStart} onChange={toggleAuto}/><span className="itt-switch" aria-hidden="true"/></label>
      <div className="itt-scan-note">{icon('clock',14)} Planned scanner runs server-side when connected, even if you close ICA Master.</div>
     </section>
     <section className="itt-card itt-chain-panel"><div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('bolt',17)}</span><div><div className="itt-eyebrow">OPTIONS INTELLIGENCE</div><h3>{selected} Contracts</h3></div></div><span className="itt-muted-badge">NO CHAIN</span></div>
      <div className="itt-chain-tabs"><button type="button" className={chainSide==='CALL'?'active':''} aria-pressed={chainSide==='CALL'} onClick={()=>setChainSide('CALL')}>CALLS</button><button type="button" className={chainSide==='PUT'?'active':''} aria-pressed={chainSide==='PUT'} onClick={()=>setChainSide('PUT')}>PUTS</button></div>
      <div className="itt-chain-header"><span>STRIKE</span><span>BID</span><span>ASK</span><span>DELTA</span></div>
      <div className="itt-chain-empty">{icon('chart',24)}<strong>Options feed not connected</strong><p>Verified {chainSide.toLowerCase()} contracts, spreads, volume and open interest will populate this panel.</p></div>
     </section>
     <section className="itt-card itt-risk-panel"><div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('shield',18)}</span><div><div className="itt-eyebrow">RISK PROTECTION</div><h3>Trade Rules</h3></div></div><span className="itt-muted-badge">PLANNED</span></div>
      <div className="itt-risk-list">{[['Stop-loss',riskPlan.stopLossPct+'%'],['Profit target',riskPlan.takeProfitPct+'%'],['Trailing activation','+'+riskPlan.trailActivatePct+'%'],['Trailing distance',riskPlan.trailDistancePct+'%'],['Daily max loss','$'+riskPlan.maxDailyLoss],['Max trades / day',String(riskPlan.maxTradesPerDay)]].map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
      <div className="itt-rule-checks">{ruleChecks.map(([heading,desc])=><div key={heading}><span>◇</span><div><strong>{heading}</strong><small>{desc}</small></div></div>)}</div>
     </section>
    </aside>
   </div>
  </>}
  {tab==='ai'&&<div className="itt-ai-wrapper"><TradingAiAssistant ranked={[]} report={null} rules={riskPlan} quotes={[]}/></div>}
 </section>;
}
