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
const riskPlan={stopLossPct:20,takeProfitPct:30,trailActivatePct:15,trailDistancePct:10,maxDailyLoss:100,maxLossPerTrade:80,maxTradesPerDay:3,maxHoldMinutes:30,dailyGoal:100};
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
export default function TradingOwnerPanel(){
 const [tab,setTab]=useState('dashboard');
 const [showDiagnostics,setShowDiagnostics]=useState(false);
 const [schwabStatus,setSchwabStatus]=useState(null);
 const [watchQuotes,setWatchQuotes]=useState([]);
 const [paperSnapshot,setPaperSnapshot]=useState(null);
 const [aiBillingState,setAiBillingState]=useState('not_checked');
 const [selected,setSelected]=useState(()=>{
  const s=new URLSearchParams(window.location.search).get('symbol')?.toUpperCase();
  return s&&Object.hasOwn(tvSymbols,s)?s:'SPY';
 });
 const [group,setGroup]=useState('Favorites');
 const [extraTickers,setExtraTickers]=useState(()=>{try{const v=JSON.parse(localStorage.getItem('ica_trading_extra_tickers')||'[]');return Array.isArray(v)?v.filter(x=>/^[A-Z][A-Z0-9.-]{0,9}$/.test(x)).slice(0,12):[]}catch{return []}});
 const [newTicker,setNewTicker]=useState(''),[tickerError,setTickerError]=useState('');
 const groups={...tickerGroups,Favorites:[...new Set([...tickerGroups.Favorites,...extraTickers])]};
 const addTicker=e=>{e.preventDefault();const ticker=newTicker.trim().toUpperCase();if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)){setTickerError('Use a valid stock/ETF symbol.');return;}if(groups.Favorites.includes(ticker)){setTickerError('Ticker is already in Favorites.');return;}if(extraTickers.length>=12){setTickerError('12 additional symbols maximum.');return;}const next=[...extraTickers,ticker];setExtraTickers(next);try{localStorage.setItem('ica_trading_extra_tickers',JSON.stringify(next))}catch{}setGroup('Favorites');setSelected(ticker);setNewTicker('');setTickerError('')};
 const removeTicker=ticker=>{const next=extraTickers.filter(x=>x!==ticker);setExtraTickers(next);try{localStorage.setItem('ica_trading_extra_tickers',JSON.stringify(next))}catch{}if(selected===ticker)setSelected('SPY')};
 const [interval,setIntervalValue]=useState('5');
 const [chainSide,setChainSide]=useState('CALL');
 const [chainOpen,setChainOpen]=useState(()=>new URLSearchParams(window.location.search).get('panel')==='chain');
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
 const watchlistPanel=(
<section className="itt-card itt-watchlist">
      <div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('radar',18)}</span><div><div className="itt-eyebrow">MARKET RADAR</div><h3>Watchlist</h3></div></div><div className="itt-panel-buttons"><span className="itt-mini-dot">QUOTES</span>{popButton('watchlist')}</div></div>
      <div className="itt-watch-tabs">{Object.keys(groups).map(k=><button type="button" aria-pressed={group===k} key={k} className={group===k?'active':''} onClick={()=>{setGroup(k);if(!groups[k].includes(selected))setSelected(groups[k][0])}}>{k}</button>)}</div>
      <form className="itt-add-ticker" onSubmit={addTicker}><input value={newTicker} onChange={e=>setNewTicker(e.target.value.toUpperCase())} maxLength={10} aria-label="Add ticker" placeholder="Add ticker, e.g. NVDA"/><button type="submit">＋ ADD</button></form>{tickerError&&<p role="alert" className="itt-watch-error">{tickerError}</p>}
       <div className="itt-watch-labels"><span>SYMBOL</span><span>LAST</span><span>SCAN</span></div>
      <div className="itt-watch-rows">{groups[group].map(sym=><button type="button" className={sym===selected?'itt-selected':''} key={sym} onClick={()=>setSelected(sym)}><span><strong>{sym}</strong><small>{descriptions[sym]||"Custom ticker"}</small></span><span className="itt-blank-price">{typeof watchQuotes.find(q=>q.symbol===sym)?.last==='number'?'$'+watchQuotes.find(q=>q.symbol===sym).last.toFixed(2):'—'}</span><span className="itt-ticker-state">{paperSnapshot?.scanHistory?.find(entry=>entry.symbol===sym)?.state?.replaceAll('_',' ')||'NOT CHECKED'}</span></button>)}</div>
      {group==='Favorites'&&extraTickers.length>0&&<div className="itt-custom-tickers">{extraTickers.map(t=><button type="button" onClick={()=>removeTicker(t)} key={t} title={'Remove '+t}>Remove {t} ×</button>)}</div>}
       <div className="itt-watch-foot">Schwab quotes poll every 15 seconds when connected. Select a symbol to update both charts and the options chain.</div>
     </section>
 );
 const chainPanel=(
<section className="itt-card itt-chain-panel"><div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('bolt',17)}</span><div><div className="itt-eyebrow">OPTIONS INTELLIGENCE</div><h3>{selected} Contracts</h3></div></div><div className="itt-panel-buttons"><span className="itt-muted-badge">{schwabStatus?.connected?'SCHWAB':'NO CHAIN'}</span><button type="button" className="itt-popout-button" aria-expanded={chainOpen} onClick={()=>setChainOpen(v=>!v)}>{chainOpen?'Collapse':'Show contracts'}</button>{popButton('chain')}</div></div>
      {(chainOpen)&&<><div className="itt-chain-tabs"><button type="button" className={chainSide==='CALL'?'active':''} aria-pressed={chainSide==='CALL'} onClick={()=>setChainSide('CALL')}>CALLS</button><button type="button" className={chainSide==='PUT'?'active':''} aria-pressed={chainSide==='PUT'} onClick={()=>setChainSide('PUT')}>PUTS</button></div>
      <SchwabOptions symbol={selected} side={chainSide} enabled={!!schwabStatus?.connected}/></>}
     </section>
 );
 const riskPanel=(
<section className="itt-card itt-risk-panel"><div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('shield',18)}</span><div><div className="itt-eyebrow">RISK PROTECTION</div><h3>Trade Rules</h3></div></div><div className="itt-panel-buttons"><span className="itt-muted-badge">PLANNED</span>{popButton('risk')}</div></div>
      <div className="itt-risk-list">{[['Stop-loss',riskPlan.stopLossPct+'%'],['Profit target',riskPlan.takeProfitPct+'%'],['Trailing activation','+'+riskPlan.trailActivatePct+'%'],['Trailing distance',riskPlan.trailDistancePct+'%'],['Daily paper cutoff','None'],['Paper trades / day','Unlimited']].map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
      <div className="itt-rule-checks">{ruleChecks.map(([heading,desc])=><div key={heading}><span>◇</span><div><strong>{heading}</strong><small>{desc}</small></div></div>)}</div>
     </section>
 );
 const standAlone={chart:chartPanel,
  alert:<PaperSession connected={!!schwabStatus?.connected} initialTab="opportunities"/>,
  results:<PaperSession connected={!!schwabStatus?.connected} initialTab="closed"/>,
  watchlist:watchlistPanel,
  scanner:<PaperSession connected={!!schwabStatus?.connected}/>,
  chain:chainPanel,risk:riskPanel};
 if(popPanel)return <section className="ica-trading-terminal itt-expanded itt-popout-window">
  <header className="itt-popout-header">
   <div><span className="itt-eyebrow">ICA PRIME / DETACHED PANEL</span><h2>{popPanel==='chart'?selected+' MARKET CHART':popPanel.toUpperCase()}</h2></div>
   <button type="button" className="itt-wide-button" onClick={()=>{
      if(window.opener){window.close();return;}
      const url=new URL(window.location.href);url.searchParams.delete('panel');window.location.assign(url.toString());
     }}>↙ Return to Trading Dashboard</button>
  </header>
  {popNotice&&<p role="alert" className="itt-pop-notice">{popNotice}</p>}
  {['alert','results','scanner'].includes(popPanel)&&<SchwabConnection symbol={selected} onStatus={setSchwabStatus}/>}
   {standAlone[popPanel]}
 </section>;
 return <section className={'ica-trading-terminal'+(expanded?' itt-expanded itt-monitor-view':'')}>
  <header className="itt-hero">
   <div className="itt-brand">
    <span className="itt-brand-emblem">{icon('radar',27)}</span>
    <div><div className="itt-eyebrow">PRIVATE ICA MASTER / TRADING INTELLIGENCE</div><h2>ICA <span>PRIME</span></h2><p>High-Probability Trading Workstation</p></div>
   </div>
   <div className="itt-status-bar"><div className="itt-trade-mode" role="group" aria-label="Trading mode"><button type="button" className="selected" onClick={()=>document.getElementById('ica-paper-control-center')?.scrollIntoView({behavior:'smooth',block:'start'})} title="Go to the paper scanner controls">PAPER TRADE</button><button disabled title="Live mode requires verified broker routing and safety tests">LIVE TRADE · LOCKED</button></div><span className="itt-status itt-off"><span className="itt-status-dot"/> {schwabStatus?.connected?'SCHWAB AUTHORIZED':'SCHWAB DISCONNECTED'}</span><span className="itt-status itt-off">PAPER CONTROLS ABOVE</span><span className="itt-clock">{icon('clock',15)} {clockText} ET</span><button type="button" className="itt-wide-button" aria-pressed={expanded} onClick={toggleWide}>{expanded?'↙ Exit Expanded View':'⛶ Expand Workstation'}</button></div>
  </header>
  {popNotice&&<p role="alert" className="itt-pop-notice">{popNotice}</p>}
  <PaperSession connected={!!schwabStatus?.connected} onSnapshot={setPaperSnapshot}/>
  <div className="itt-panel-buttons" aria-label="Open separate trading windows" style={{display:'flex',flexWrap:'wrap',gap:9,margin:'10px 0'}}>
   <button type="button" className="itt-popout-button" onClick={()=>openPopout('scanner')}>↗ Scanner window</button>
   <button type="button" className="itt-popout-button" onClick={()=>openPopout('alert')}>↗ Alert Center</button>
   <button type="button" className="itt-popout-button" onClick={()=>openPopout('results')}>↗ Paper Results</button>
  </div>
  <SchwabWatchPrices symbols={groups[group]} enabled={!!schwabStatus?.connected} onQuotes={setWatchQuotes}/>
  <button type="button" className="itt-diagnostics-toggle" onClick={()=>setShowDiagnostics(v=>!v)} aria-expanded={showDiagnostics}>{showDiagnostics?'Hide connections and diagnostics':'Connections and advanced settings'} ▾</button>
  <div className={showDiagnostics?'itt-diagnostics':'itt-diagnostics itt-hidden'}><SchwabConnection symbol={selected} onStatus={setSchwabStatus}/>{showDiagnostics&&<TradingAiBillingPanel billingState={aiBillingState} onStateChange={setAiBillingState}/>}</div>
  <nav className="itt-tabs" aria-label="Trading workspace views">
   <button type="button" className={tab==='dashboard'?'active':''} onClick={()=>setTab('dashboard')}>{icon('chart',16)} Trading Dashboard</button>
   <button type="button" className={tab==='ai'?'active':''} onClick={()=>setTab('ai')}>{icon('bot',16)} Ask ICA Trading AI</button>
  </nav>
  {tab==='dashboard'&&<>
   <section className="itt-ticker-tape" aria-label="Public market prices from TradingView">
    <span className="itt-tape-label">MARKET TAPE</span>
    <TVTickerTape/>
   </section>
   <div className="itt-layout">
    <div className="itt-main">
     {chartPanel}
     <SchwabChart symbol={selected} enabled={!!schwabStatus?.connected}/>
    </div>
    <aside className="itt-side">
     {watchlistPanel}
     {chainPanel}
     <details className="itt-secondary-chart"><summary>Advanced risk rules</summary>{riskPanel}</details>
    </aside>
   </div>
   <section className="itt-card itt-flow-board"><div className="itt-card-heading"><div className="itt-title-group"><span className="itt-title-icon">{icon('bolt',18)}</span><div><div className="itt-eyebrow">OPTIONS ACTIVITY</div><h3>Options Flow &amp; Opportunities</h3></div></div><span className="itt-muted-badge">LIVE FLOW FEED NOT CONNECTED</span></div><p>Real-time unusual options flow requires an authorized options-tape feed. Until then, inspect the options chain on the right. No fabricated alerts or probability labels.</p><div className="itt-flow-legend"><span>● Strong technical/liquidity confirmation</span><span>● Developing setup</span><span>● No qualifying setup</span></div></section>
  </>}
  {tab==='ai'&&<div className="itt-ai-wrapper"><TradingAiAssistant ranked={[]} report={null} rules={riskPlan} quotes={[]} creditBlocked={['credits_exhausted','billing_blocked','spend_limit'].includes(aiBillingState)} onBillingStateChange={setAiBillingState}/></div>}
 </section>;
}
