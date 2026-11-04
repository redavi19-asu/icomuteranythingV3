import React,{useEffect,useRef,useState} from 'react';
import TradingAiAssistant, {TradingAiBillingPanel} from './TradingAiAssistant';
import './TradingTerminal.css';
import SchwabConnection from './SchwabConnection';
import PaperSession from './PaperSession';
import {SchwabChart,SchwabOptions,SchwabWatchPrices} from './SchwabMarket';

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
 const [ready,setReady]=useState(()=>Boolean(window.customElements?.get('tv-advanced-chart')));
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  let active=true;
  if(window.customElements?.get('tv-advanced-chart')){setReady(true);setFailed(false);return}
  let script=document.querySelector('script[data-ica-tv-advanced-chart]');
  if(!script){
   script=document.createElement('script');
   script.type='module';
   script.async=true;
   script.dataset.icaTvAdvancedChart='true';
   script.src='https://widgets.tradingview-widget.com/w/en/tv-advanced-chart.js';
   document.head.appendChild(script);
  }
  const onError=()=>{if(active)setFailed(true)};
  script.addEventListener('error',onError);
  const timeout=window.setTimeout(()=>{if(active&&!window.customElements?.get('tv-advanced-chart'))setFailed(true)},9500);
  if(window.customElements?.whenDefined){
   window.customElements.whenDefined('tv-advanced-chart').then(()=>{
    if(active){setReady(true);setFailed(false)}
   }).catch(onError);
  }
  return ()=>{active=false;script.removeEventListener('error',onError);window.clearTimeout(timeout)};
 },[]);
 const url='https://www.tradingview.com/chart/?symbol='+encodeURIComponent(tvSymbols[symbol]||symbol);
 return <div className="itv-embed" aria-label={'TradingView market chart for '+symbol}>
  <tv-advanced-chart
   symbol={tvSymbols[symbol]||symbol}
   interval={interval==='D'?'1D':interval}
   theme="dark" timezone="America/New_York"
   width="100%" height="100%"
   style={{display:'block',width:'100%',height:'100%'}}
  ></tv-advanced-chart>
  {!ready&&<div className="itv-widget-status" role="status">
   {failed?<><strong>Embedded chart could not load</strong><span>Your browser may be restricting the TradingView widget.</span><a href={url} target="_blank" rel="noopener noreferrer">Open full chart ↗</a></>:<span>Loading TradingView chart…</span>}
  </div>}
 </div>;
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
 const [schwabStatus,setSchwabStatus]=useState(null);
 const [watchQuotes,setWatchQuotes]=useState([]);
 const [aiBillingState,setAiBillingState]=useState('not_checked');
 const [selected,setSelected]=useState(()=>{
  const s=new URLSearchParams(window.location.search).get('symbol')?.toUpperCase();
  return s&&Object.hasOwn(tvSymbols,s)?s:'SPY';
 });
 const [group,setGroup]=useState('Favorites');
 const [interval,setIntervalValue]=useState('5');
 const [chainSide,setChainSide]=useState('CALL');
 const [autoStart,setAutoStart]=useState(readAutoStart);
 const [expanded,setExpanded]=useState(()=>{try{return localStorage.getItem('ica_trading_fullscreen')==='true'}catch{return false}});
 const [popPanel]=useState(()=>{
  const p=new URLSearchParams(window.location.search).get('panel');
  return ['chart','alert','results','watchlist','scanner','chain','risk'].includes(p)?p:null;
 });
 const [popNotice,setPopNotice]=useState('');
 const showWide=expanded||Boolean(popPanel);
 useEffect(()=>{
  if(!showWide)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return ()=>{document.body.style.overflow=previous};
 },[showWide]);
 useEffect(()=>{
  if(!expanded||popPanel)return;
  const onKey=e=>{if(e.key==='Escape')setExpanded(false)};
  window.addEventListener('keydown',onKey);
  return ()=>window.removeEventListener('keydown',onKey);
 },[expanded,popPanel]);
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30000);return ()=>clearInterval(id)},[]);
 const clockText=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',hour12:true}).format(now);
 const toggleAuto=()=>{
  setAutoStart(v=>{const next=!v;try{localStorage.setItem('ica_trading_pref_autostart930',String(next))}catch{}return next});
 };
 const chartUrl='https://www.tradingview.com/chart/?symbol='+encodeURIComponent(tvSymbols[selected]||selected);
 const toggleWide=()=>setExpanded(v=>{
  const next=!v;
  try{localStorage.setItem('ica_trading_fullscreen',String(next))}catch{}
  return next;
 });
 const openPopout=name=>{
  const u=new URL(window.location.href);
  u.searchParams.set('view','trading');
  u.searchParams.set('panel',name);
  u.searchParams.set('symbol',selected);
  const popup=window.open(u.toString(),'ica-trading-'+name,'popup=yes,width=1160,height=850,resizable=yes,scrollbars=yes');
  if(popup){popup.focus();setPopNotice('')}
  else setPopNotice('Pop-up blocked. Allow pop-ups for this site and try again.');
 };
 const popButton=name=><button type="button" className="itt-popout-button" onClick={()=>openPopout(name)} title={'Open '+name+' in its own window'}>↗ Pop out</button>;
 const chartPanel=(
<section className="itt-card itt-chart-panel">
      <div className="itt-card-heading">
       <div className="itt-title-group"><span className="itt-title-icon">{icon('chart',19)}</span><div><div className="itt-eyebrow">MARKET WORKSTATION / PUBLIC CHART</div><h3>{selected} <span>{descriptions[selected]||'Market symbol'}</span></h3></div></div>
       <div className="itt-intervals" aria-label="Chart timeframe">
        {[['1','1m'],['5','5m'],['15','15m'],['60','1h'],['D','1D']].map(([val,name])=><button key={val} className={interval===val?'active':''} type="button" aria-pressed={interval===val} onClick={()=>setIntervalValue(val)}>{name}</button>)}
       </div>
      </div>
      {popButton('chart')}
      <div className="itt-chart-embed"><TVMarketChart symbol={selected} interval={interval}/></div>
      <div className="itt-chart-footer"><span>TradingView public chart · exchange data may be delayed · not ICA’s broker feed</span><a href={chartUrl} target="_blank" rel="noopener noreferrer">Open full chart ↗</a></div>
     </section>
 );
 const alertPanel=(
<section className="itt-card itt-alert-panel" aria-live="polite">
      <div className="itt-alert-top"><div className="itt-alert-heading"><span className="itt-alert-flash">{icon('bolt',21)}</span><div><div className="itt-eyebrow">HIGH-PROBABILITY ENGINE</div><h3>Trade Opportunity Alert</h3></div></div><div className="itt-panel-buttons"><span className="itt-alert-label">NO VERIFIED SETUP</span>{popButton('alert')}</div></div>
      <div className="itt-alert-body"><div className="itt-radar-viz"><span/><span/><span/>{icon('crosshair',32)}</div><div><h4>Waiting for our first qualifying play</h4><p>When ICA finds a confirmed option setup, the exact contract, entry, stop-loss and profit target will fill this alert. You make the decision.</p><div className="itt-signal-tags"><span>LIQUIDITY</span><span>MOMENTUM</span><span>RISK GATES</span></div></div></div>
      <div className="itt-alert-actions"><button type="button" disabled title="Unlocks after a verified Schwab-connected signal">✓ TRADE THIS</button><button type="button" disabled title="No verified trade to skip yet">✕ SKIP TRADE</button></div>
      <div className="itt-alert-foot">{icon('shield',15)} Approved entry → automatic stop/target management → exit → realized result. Inactive until integration.</div>
     </section>
 );
 const resultsPanel=(
<section className="itt-card itt-activity-panel"><div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('chart',18)}</span><div><div className="itt-eyebrow">TRADE PERFORMANCE</div><h3>Today's Results</h3></div></div><div className="itt-panel-buttons"><span className="itt-muted-badge">BROKER SYNC PENDING</span>{popButton('results')}</div></div>
      <div className="itt-pnl-grid"><div><small>Realized P/L</small><strong>—</strong></div><div><small>Trades Closed</small><strong>—</strong></div><div><small>Win Rate</small><strong>—</strong></div><div><small>Open Position</small><strong>—</strong></div></div>
      <div className="itt-empty-log"><span>{icon('clock',22)}</span><div><strong>No verified trade history yet</strong><p>Completed approved trades and actual account results will appear here after the Schwab integration is operational.</p></div></div>
     </section>
 );
 const watchlistPanel=(
<section className="itt-card itt-watchlist">
      <div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('radar',18)}</span><div><div className="itt-eyebrow">MARKET RADAR</div><h3>Watchlist</h3></div></div><div className="itt-panel-buttons"><span className="itt-mini-dot">● OFF</span>{popButton('watchlist')}</div></div>
      <div className="itt-watch-tabs">{Object.keys(tickerGroups).map(k=><button type="button" aria-pressed={group===k} key={k} className={group===k?'active':''} onClick={()=>{setGroup(k);if(!tickerGroups[k].includes(selected))setSelected(tickerGroups[k][0])}}>{k}</button>)}</div>
      <div className="itt-watch-labels"><span>SYMBOL</span><span>LAST</span><span>SCAN</span></div>
      <div className="itt-watch-rows">{tickerGroups[group].map(sym=><button type="button" className={sym===selected?'itt-selected':''} key={sym} onClick={()=>setSelected(sym)}><span><strong>{sym}</strong><small>{descriptions[sym]}</small></span><span className="itt-blank-price">{typeof watchQuotes.find(q=>q.symbol===sym)?.last==='number'?'$'+watchQuotes.find(q=>q.symbol===sym).last.toFixed(2):'—'}</span><span className="itt-ticker-state">WAIT</span></button>)}</div>
      <div className="itt-watch-foot">Schwab quotes refresh every 15 seconds. Select a symbol to update both charts. SCAN remains inactive.</div>
     </section>
 );
 const scannerPanel=(
<section className="itt-card itt-scan-panel"><div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('crosshair',18)}</span><div><div className="itt-eyebrow">SCANNER CONTROLS</div><h3>High-Probability Scan</h3></div></div>{popButton('scanner')}</div>
      <div className="itt-scanner-center"><span className="itt-large-status"><i/> OFFLINE</span><p>Brokerage market-data connection pending.</p><button type="button" disabled className="itt-start-scan">{icon('radar',20)} START SCAN</button></div>
      <label className="itt-autostart"><span><strong>Auto-start at 9:30 AM ET</strong><small>Preference saved on this device. Activates when the server scanner is ready.</small></span><input type="checkbox" checked={autoStart} onChange={toggleAuto}/><span className="itt-switch" aria-hidden="true"/></label>
      <div className="itt-scan-note">{icon('clock',14)} Planned scanner runs server-side when connected, even if you close ICA Master.</div>
     </section>
 );
 const chainPanel=(
<section className="itt-card itt-chain-panel"><div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('bolt',17)}</span><div><div className="itt-eyebrow">OPTIONS INTELLIGENCE</div><h3>{selected} Contracts</h3></div></div><div className="itt-panel-buttons"><span className="itt-muted-badge">{schwabStatus?.connected?'SCHWAB':'NO CHAIN'}</span>{popButton('chain')}</div></div>
      <div className="itt-chain-tabs"><button type="button" className={chainSide==='CALL'?'active':''} aria-pressed={chainSide==='CALL'} onClick={()=>setChainSide('CALL')}>CALLS</button><button type="button" className={chainSide==='PUT'?'active':''} aria-pressed={chainSide==='PUT'} onClick={()=>setChainSide('PUT')}>PUTS</button></div>
      <SchwabOptions symbol={selected} side={chainSide} enabled={!!schwabStatus?.connected}/>
     </section>
 );
 const riskPanel=(
<section className="itt-card itt-risk-panel"><div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('shield',18)}</span><div><div className="itt-eyebrow">RISK PROTECTION</div><h3>Trade Rules</h3></div></div><div className="itt-panel-buttons"><span className="itt-muted-badge">PLANNED</span>{popButton('risk')}</div></div>
      <div className="itt-risk-list">{[['Stop-loss',riskPlan.stopLossPct+'%'],['Profit target',riskPlan.takeProfitPct+'%'],['Trailing activation','+'+riskPlan.trailActivatePct+'%'],['Trailing distance',riskPlan.trailDistancePct+'%'],['Daily max loss','$'+riskPlan.maxDailyLoss],['Max trades / day',String(riskPlan.maxTradesPerDay)]].map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
      <div className="itt-rule-checks">{ruleChecks.map(([heading,desc])=><div key={heading}><span>◇</span><div><strong>{heading}</strong><small>{desc}</small></div></div>)}</div>
     </section>
 );
 const standAlone={chart:chartPanel,alert:alertPanel,results:resultsPanel,watchlist:watchlistPanel,scanner:scannerPanel,chain:chainPanel,risk:riskPanel};
 if(popPanel)return <section className="ica-trading-terminal itt-expanded itt-popout-window">
  <header className="itt-popout-header">
   <div><span className="itt-eyebrow">ICA PRIME / DETACHED PANEL</span><h2>{popPanel==='chart'?selected+' MARKET CHART':popPanel.toUpperCase()}</h2></div>
   <button type="button" className="itt-wide-button" onClick={()=>window.close()}>✕ Close Window</button>
  </header>
  {popNotice&&<p role="alert" className="itt-pop-notice">{popNotice}</p>}
  {standAlone[popPanel]}
 </section>;
 return <section className={'ica-trading-terminal'+(expanded?' itt-expanded itt-monitor-view':'')}>
  <header className="itt-hero">
   <div className="itt-brand">
    <span className="itt-brand-emblem">{icon('radar',27)}</span>
    <div><div className="itt-eyebrow">PRIVATE ICA MASTER / TRADING INTELLIGENCE</div><h2>ICA <span>PRIME</span></h2><p>High-Probability Trading Workstation</p></div>
   </div>
   <div className="itt-status-bar"><span className="itt-status itt-off"><span className="itt-status-dot"/> {schwabStatus?.connected?'SCHWAB AUTHORIZED':'SCHWAB DISCONNECTED'}</span><span className="itt-status itt-off">SCANNER OFF</span><span className="itt-clock">{icon('clock',15)} {clockText} ET</span><button type="button" className="itt-wide-button" aria-pressed={expanded} onClick={toggleWide}>{expanded?'↙ Exit Expanded View':'⛶ Expand Workstation'}</button></div>
  </header>
  {popNotice&&<p role="alert" className="itt-pop-notice">{popNotice}</p>}
  <SchwabConnection symbol={selected} onStatus={setSchwabStatus}/>
  <PaperSession connected={!!schwabStatus?.connected}/>
  <SchwabWatchPrices symbols={tickerGroups[group]} enabled={!!schwabStatus?.connected} onQuotes={setWatchQuotes}/>
  <TradingAiBillingPanel billingState={aiBillingState} onStateChange={setAiBillingState}/>
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
     <SchwabChart symbol={selected} enabled={!!schwabStatus?.connected}/>
     {chartPanel}
     {alertPanel}
     {resultsPanel}
    </div>
    <aside className="itt-side">
     {watchlistPanel}
     {scannerPanel}
     {chainPanel}
     {riskPanel}
    </aside>
   </div>
  </>}
  {tab==='ai'&&<div className="itt-ai-wrapper"><TradingAiAssistant ranked={[]} report={null} rules={riskPlan} quotes={[]} creditBlocked={['credits_exhausted','billing_blocked','spend_limit'].includes(aiBillingState)} onBillingStateChange={setAiBillingState}/></div>}
 </section>;
}
