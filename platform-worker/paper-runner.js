import {normalizePaperPortfolio,enterPaperPosition,managePaperPosition} from '../src/master/paper-portfolio.js';
import {newPaper,paperRules,PAPER_STOP_LOSS_CHOICES,selectedStopLossPct} from '../src/master/paper-session.js';
import {evaluateSymbol,eligiblePaperQuote,marketTime} from '../src/master/trading-paper-engine.js';
import {schwabMarket,schwabQuotes,schwabContractQuote} from './schwab-connection.js';
import {schwabQuoteFreshness} from '../src/master/schwab-quote-freshness.js';
import {evaluateAristotleConfluence,evaluateDailySwing,classifyTradeHorizon} from '../src/master/trading-smart-money.js';
import {assessEntryChase} from '../src/master/trading-entry-chase.js';
import {assessSwing55Entry} from '../src/master/trading-swing-levels.js';
import {assessPriceAction} from '../src/master/trading-price-action.js';
import {PAPER_LIMIT_MAX_ORDERS,paperLimitDeadline,validatePaperLimitAsk,paperLimitMeetsPrice} from '../src/master/paper-limit-orders.js';
import {rotatingTickerBatch,saveSymbolScanCoverage} from './paper-scan-coverage.js';
import {paperEntryEligible,paperSessionOpen,PAPER_MARKET_CLOSE_MINUTE,expiryStatus,paperExpirationCloseDue} from '../src/master/paper-session-clock.js';
const response=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
// Bounded liquid options universe. This is NOT a claim to scan every exchange-listed stock.
// Every built-in ICA PRIME watchlist ticker is scanned automatically.
 // Custom Favorites and manually entered scanner extras share extraSymbols.
export const PAPER_SCAN_UNIVERSE=Object.freeze(['SPY','QQQ','IWM','DIA','XLK','XLF','XLE','USO','BNO','AAPL','NVDA','TSLA','AMZN','META','MSFT','AMD','GOOGL','TLT','GLD','SLV',
 'TQQQ','BAC','SOFI','XOM','CVX','JPM']);
const DEFAULT_WATCHLIST_FAVORITES=Object.freeze(['SPY','QQQ','TQQQ','IWM','XLE','XLF','BNO','BAC','SOFI']);
const validTicker=t=>typeof t==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(t);
export const scannerUniverse=s=>s.scanMode==='SINGLE'?(validTicker(s.singleTicker)?[s.singleTicker]:[]):
 [...new Set([...PAPER_SCAN_UNIVERSE,...(Array.isArray(s.extraSymbols)?s.extraSymbols:[])])].slice(0,60);
// Two independent, configurable PAPER scanner lanes. Both share the
// existing owner coordinator and safety / quote validation.
export const PAPER_SCAN_ENGINES=Object.freeze(['MAIN','FOCUS']);
export function scannerEngineConfig(s,engine){
 if(!PAPER_SCAN_ENGINES.includes(engine))throw Error('Unknown scanner engine.');
 const saved=s?.scannerEngines?.[engine]||{};
 return {
  enabled:typeof saved.enabled==='boolean'?saved.enabled:engine==='MAIN',
  scope:saved.scope==='CUSTOM'?'CUSTOM':saved.scope==='ALL'?'ALL':engine==='MAIN'?'ALL':'CUSTOM',
  symbols:[...new Set((Array.isArray(saved.symbols)?saved.symbols:[]).filter(validTicker))].slice(0,60)
 };
}
export function scannerEngineUniverse(s,engine){
 const config=scannerEngineConfig(s,engine);
 const all=[...new Set([...PAPER_SCAN_UNIVERSE,...(Array.isArray(s.extraSymbols)?s.extraSymbols:[])])].slice(0,60);
 // Retain legacy Single Ticker operation until both new engine cards are
 // configured; editing a new card switches the old global mode to MULTI.
 return config.scope==='CUSTOM'?config.symbols:
  s.scanMode==='SINGLE'&&!(s.scannerEngines&&s.scannerEngines[engine])?
   scannerUniverse(s):all;
}
export function scannerStreamUniverse(s){
 // Focus gets streaming priority when provider's 40-symbol subscription
 // allowance is reached; the main engine still receives REST rotation.
 return [...new Set(['FOCUS','MAIN'].flatMap(engine=>
  scannerEngineConfig(s,engine).enabled?scannerEngineUniverse(s,engine):[]))];
}
const budget=s=>Number.isFinite(s.maxPremium)?s.maxPremium:paperRules.premiumBudget;
const stopLossPct=s=>selectedStopLossPct(s.stopLossPct);
export const PAPER_SCALP_MAX_SPREAD_PCT=3;
/** Explicitly show the bid/ask drag on ONE paper option contract (100 shares). */
export function paperOptionEntryEstimate(q){
 if(!Number.isFinite(q?.ask)||!Number.isFinite(q?.bid)||q.ask<=0||q.bid<0||q.bid>q.ask)return null;
 const cost=Math.round(((q.ask+0.01)*100+0.65)*100)/100;
 const immediateExit=Math.round(((Math.max(0,q.bid-0.01))*100-0.65)*100)/100;
 return {cost,immediateExit,immediatePnl:Math.round((immediateExit-cost)*100)/100,
  spreadPct:Math.round((q.ask-q.bid)/q.ask*10000)/100,
  spreadDollars:Math.round((q.ask-q.bid)*10000)/100,
  breakevenBid:Math.round((q.ask+0.033)*1000)/1000};
}
export function paperQuoteQualityFailure(quote,premiumBudget){
 const base=eligiblePaperQuote(quote,{...paperRules,premiumBudget,
  maxSpreadPct:Math.min(PAPER_SCALP_MAX_SPREAD_PCT,paperRules.maxSpreadPct)});
 if(base)return base;
 const estimate=paperOptionEntryEstimate(quote);
 if(!estimate||estimate.cost<=0)return 'INVALID_QUOTE';
 if(-estimate.immediatePnl/estimate.cost>0.05)return 'EXCESSIVE_ENTRY_DRAG';
 return null;
}
export function paperNeedsPriceConfirmation(originalAsk,freshAsk,maxApprovedAsk){
 // An improved ask is never rejected merely because the original quote was
 // different; a materially WORSE ask requires explicit owner acknowledgement.
 return Number.isFinite(originalAsk)&&Number.isFinite(freshAsk)&&freshAsk>originalAsk*1.02&&
  !(Number.isFinite(maxApprovedAsk)&&maxApprovedAsk>=freshAsk);
}

function alertList(s){
 if(!Array.isArray(s.alerts))s.alerts=[];
 if(s.pending){if(!s.alerts.some(a=>a.id===s.pending.id))s.alerts.unshift({...s.pending,status:'PENDING'});s.seen=[...new Set([...(s.seen||[]),s.pending.id])].slice(-200);s.pending=null;}
 return s.alerts;
}
const liveAlert=(a,now=Date.now())=>a.status==='PENDING'&&a.expires>now;
function expireAlerts(s,now=Date.now()){for(const a of alertList(s))if(a.status==='PENDING'&&a.expires<=now){a.status='EXPIRED';event(s,'Approval expired: '+a.contract.symbol);}}
const view=s=>({...normalizePaperPortfolio(s),pending:null,alerts:alertList(s),
 scanUniverse:s.scanMode==='SINGLE'?scannerUniverse(s):scannerStreamUniverse(s),
 scanEngines:Object.fromEntries(PAPER_SCAN_ENGINES.map(engine=>[engine,{
  ...scannerEngineConfig(s,engine),universe:scannerEngineUniverse(s,engine),
  coverage:s.engineCoverage?.[engine]||{},last:s.engineLast?.[engine]||null
 }])),
 scanMode:s.scanMode==='SINGLE'?'SINGLE':'MULTI',singleTicker:validTicker(s.singleTicker)?s.singleTicker:'SPY',autoStart:s.autoStart===true,mode:'PAPER_ONLY',realOrdersEnabled:false});
// Optional outbound notification. Requires sender domain and API key in server secrets.
async function notifyPaperOpportunity(env,owner,alert){
 const api=String(env.RESEND_API_KEY||'').trim(),from=String(env.ICA_TRADING_ALERT_FROM||'').trim();
 if(!api||!from)return;
 const row=await env.DB.prepare("SELECT email FROM users WHERE id=? AND role='owner' AND status='active'").bind(owner.id).first();
 const to=String(row?.email||'').trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))return;
 const c=alert.contract;
 const body=['New paper trading setup detected.',c.underlying+' '+c.side+' '+c.symbol,'Ask: USD '+c.ask.toFixed(2),'Approval expires: '+new Date(alert.expires).toISOString(),'Open ICA Master to review. Quotes are rechecked before approval.','https://icomputeranything.com/master?view=trading','PAPER ONLY - no real-money orders.'].join('\n');
 const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+api,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject:'ICA Master Paper Setup: '+c.underlying+' '+c.side,text:body}),signal:AbortSignal.timeout(8000)});
 if(!sent.ok)throw Error('Notification not accepted (HTTP '+sent.status+').');
}
export const freshRunner=()=>({paper:newPaper(),enabled:false,closeRequested:false,pending:null,alerts:[],seen:[],events:[],heartbeat:null,lastError:null,scanIndex:0,scanHistory:[],scanMode:'MULTI',singleTicker:'SPY',dailySignals:{},dailyCheckedDay:{},
 flowGate:{status:'DISABLED',provider:'NONE',level2:'NOT_CONNECTED',reason:'Paid options-flow check removed; Schwab data and risk checks still required.'},marketFeed:{code:'UNAVAILABLE',label:'NO VERIFIED LIVE QUOTES YET',symbol:null,checkedAt:null},autoStart:false,lastAutoStartDay:null,lastAutoStartAt:null,maxPremium:paperRules.premiumBudget,stopLossPct:20,extraSymbols:[],paperLimitOrders:[],scannerEngines:{MAIN:{enabled:true,scope:'ALL',symbols:[]},FOCUS:{enabled:false,scope:'CUSTOM',symbols:[]}},focusScanIndex:0,engineCoverage:{MAIN:{},FOCUS:{}},engineLast:{},swingLevels:{},priceActionChecks:{},scanCoverage:{}});
async function load(env,id){await env.DB.prepare('INSERT OR IGNORE INTO paper_runners(owner_id,payload) VALUES(?,?)').bind(id,JSON.stringify(freshRunner())).run();const row=await env.DB.prepare('SELECT revision,payload FROM paper_runners WHERE owner_id=?').bind(id).first();return {revision:row.revision,state:{...normalizePaperPortfolio(JSON.parse(row.payload)),revision:row.revision}}}
async function save(env,id,row){const r=await env.DB.prepare('UPDATE paper_runners SET payload=?,revision=revision+1 WHERE owner_id=? AND revision=?').bind(JSON.stringify(row.state),id,row.revision).run();if(r.meta.changes!==1)throw Error('State changed; refresh and retry.');row.revision++;row.state.revision=row.revision;}
function event(s,text){s.events=[{time:Date.now(),text},...s.events].slice(0,100)}
/** Commit tomorrow's opt-in scanner start immediately, before any slow Schwab
 * stream connection or quote fetch. Retry D1 revision conflicts, while respecting
 * an owner Pause for that day (lastAutoStartDay is already the current day). */
export async function ensureDailyPaperAutoStart(env,owner,now=Date.now()){
 const session=marketTime(now);
 if(!owner?.id||owner.role!=='owner'||['Sat','Sun'].includes(session.weekday)||
  session.minute<570||session.minute>=PAPER_MARKET_CLOSE_MINUTE)return false;
 for(let attempt=0;attempt<3;attempt++){
  const row=await load(env,owner.id),s=row.state;
  if(s.autoStart!==true||s.lastAutoStartDay===session.day)return false;
  s.enabled=true;
  s.lastAutoStartDay=session.day;
  s.lastAutoStartAt=now;
  event(s,'Scheduled paper scanner enabled at/after 9:30 AM ET for '+session.day+'.');
  try{await save(env,owner.id,row);return true}
  catch(error){
   if(error?.message!=='State changed; refresh and retry.'||attempt===2)throw error;
  }
 }
 return false;
}

async function data(env,owner,kind,symbol){const r=await schwabMarket(new Request('https://internal/platform/schwab/'+kind+'?symbol='+symbol+'&frequency=1'),env,owner,kind);if(!r.ok)throw Error('Market feed unavailable.');return r.json()}
async function validateUnderlyingQuote(env,owner,symbol,now=Date.now()){
 const empty={symbol,checkedAt:now,code:'UNAVAILABLE',label:'SCHWAB QUOTE UNAVAILABLE',quoteTime:null};
 try{
  const res=await schwabQuotes(new Request('https://internal/platform/schwab/quotes?symbols='+encodeURIComponent(symbol)),env,owner);
  if(!res.ok)return empty;
  const payload=await res.json(),quote=payload.quotes?.find(q=>q.symbol===symbol);
  if(!quote)return empty;
  const status=schwabQuoteFreshness(quote,now);
  return {...status,symbol,quoteTime:quote.quoteTime??null,checkedAt:now};
 }catch{return empty}
}
/** New confirmed-price-action alerts must still be in their opportunity
 * window when the owner presses Approve. The scanner's earlier quote cannot
 * justify a later paper fill after the underlying loses its setup level. */
export async function verifyPaperPriceWindow(env,owner,alert,now=Date.now()){
 const p=alert?.qualification?.priceAction;
 if(!p)return true; // Legacy alerts retain existing exact-contract checks.
 if(p.confirmed!==true||!['CALL','PUT'].includes(p.direction)||
   !Number.isFinite(p.confirmationBarTime)||
   !Number.isFinite(p.breakoutLevel)||!Number.isFinite(p.invalidation)||
   !Number.isFinite(p.atr1m)||p.atr1m<=0||
   now<p.confirmationBarTime+60000||
   now-p.confirmationBarTime>6*60000)
  throw Error('Paper entry window expired or price-action evidence is incomplete. Wait for a new setup.');
 const symbol=alert?.contract?.underlying,side=alert?.contract?.side;
 if(!validTicker(symbol)||side!==p.direction)
  throw Error('Paper setup symbol or direction was changed. Wait for a fresh setup.');
 const r=await schwabQuotes(new Request(
  'https://internal/platform/schwab/quotes?symbols='+encodeURIComponent(symbol)),env,owner);
 if(!r.ok)throw Error('Cannot verify a current underlying price. Paper entry held.');
 const payload=await r.json(),q=payload.quotes?.find(x=>x.symbol===symbol);
 if(schwabQuoteFreshness(q,Date.now(),10000).code!=='VERIFIED_FRESH'||
    !Number.isFinite(q?.last)||q.last<=0)
  throw Error('Underlying Schwab quote is unavailable, delayed or stale. Paper entry held.');
 const dir=p.direction==='CALL'?1:-1;
 if(dir*(q.last-p.invalidation)<=0)
  throw Error('Underlying invalidated the confirmed breakout before approval. Wait for a new setup.');
 if(dir*(q.last-p.breakoutLevel)/p.atr1m>2.0)
  throw Error('Underlying already extended beyond the two-ATR opportunity window. Do not chase.');
 if(Number.isFinite(p.target)){
  const risk=dir*(q.last-p.invalidation),reward=dir*(p.target-q.last);
  if(!(risk>0&&reward/risk>=1.5))
   throw Error('Opposing swing level leaves insufficient price reward/risk for this entry.');
 }
 return true;
}
export async function runPaperTick(env,owner,{scan=true,scheduled=false,scanSymbol=null,streamHealth=null,scanLane='BOTH'}={}){
 const row=await load(env,owner.id),s=row.state;s.heartbeat=Date.now();s.lastError=null;
 s.flowGate={status:'DISABLED',provider:'NONE',level2:'NOT_CONNECTED',reason:'No paid options-flow feed required; Schwab technical, quote and contract checks remain active.'};
 if(streamHealth){
  // Status is diagnostic only. No streamer metadata is accepted as a quote entitlement.
  s.marketStream={transport:String(streamHealth.transport||'NOT_CONNECTED').slice(0,50),
   connected:streamHealth.connected===true,quoteAgeMs:Number.isFinite(streamHealth.quoteAgeMs)?streamHealth.quoteAgeMs:null,
   error:String(streamHealth.error||'').slice(0,160),checkedAt:Date.now(),
   realOrdersEnabled:false,quoteEntitlementVerified:false};
 }
 if(scanSymbol!==null){
  if(!validTicker(scanSymbol))throw Error('Invalid live scan symbol.');
  s.lastStreamTriggeredAt=Date.now();
  // Durable cooldown: the DO's in-memory map can reset on a restart.
  // Never repeatedly re-evaluate a symbol's same closed 1-minute candles.
  // Existing open positions remain managed by this tick regardless.
  const previous=s.scanCoverage?.[scanSymbol],now=Date.now(),day=marketTime(now).day;
  if(s.scanMode!=='SINGLE'&&previous?.day===day&&
   Number.isFinite(previous.checkedAt)&&now-previous.checkedAt<60000){
   scan=false;
  }
 }
 // Server-side opt-in schedule: a real setting, not a browser-local checkbox.
 // Only start the PAPER scanner during the market session, once per NY trading day.
 if(scheduled&&s.autoStart===true){
  const session=marketTime(Date.now());
  if(!['Sat','Sun'].includes(session.weekday)&&session.minute>=570&&session.minute<PAPER_MARKET_CLOSE_MINUTE&&s.lastAutoStartDay!==session.day){
   s.enabled=true;s.lastAutoStartDay=session.day;s.lastAutoStartAt=Date.now();event(s,'Scheduled paper scanner enabled for '+session.day+' at/after 9:30 AM ET.');
  }
 }
 const check={id:crypto.randomUUID(),startedAt:Date.now(),completedAt:null,positionsChecked:0,positionsUpdated:0,positionsClosed:0,scannedSymbols:[],newAlerts:0,holds:[]};
 expireAlerts(s);
 try{
  // Fetch independently so one unavailable contract cannot block another exit.
  const positions=[...s.paper.positions];check.positionsChecked=positions.length;
  for(let offset=0;offset<positions.length;offset+=8){
   const results=await Promise.all(positions.slice(offset,offset+8).map(async p=>{
    try{return {id:p.id,quote:{...p,...await schwabContractQuote(env,owner,p.symbol)}}}catch(error){return {id:p.id,error}}
   }));
   for(const result of results){
    const position=s.paper.positions.find(p=>p.id===result.id);if(!position)continue;
    try{
     if(result.error)throw result.error;
     const open=managePaperPosition(s,result.id,result.quote,{maxPremium:budget(s)});check.positionsUpdated++;
     if(!open){check.positionsClosed++;event(s,'SIMULATED EXIT '+position.symbol+': '+s.paper.trades.at(-1).reason)}
    }catch(error){check.holds.push({symbol:position.symbol,reason:error.message});position.lastError=error.message;s.lastError=position.symbol+': '+error.message;event(s,'POSITION HOLD '+position.symbol+': '+error.message)}
   }
  }
  if(scan&&s.enabled){
   const now=Date.now(),session=marketTime(now);
   if(paperSessionOpen(session)){
    // Two owner-configurable engines, separately rotating up to five tickers
    // per pass. Both feed one serial D1 coordinator to protect live paper P/L.
    const selections=new Map();
    for(const engine of PAPER_SCAN_ENGINES){
     const conf=scannerEngineConfig(s,engine);
     if(!conf.enabled||(scanLane!=='BOTH'&&scanLane!==engine))continue;
     const allowed=scannerEngineUniverse(s,engine);
     const batch=scanSymbol===null?rotatingTickerBatch(allowed,
      engine==='MAIN'?s.scanIndex:(s.focusScanIndex||0),5):
      allowed.includes(scanSymbol)?[scanSymbol]:[];
     if(scanSymbol===null){
      if(engine==='MAIN')s.scanIndex+=batch.length;
      else s.focusScanIndex=(s.focusScanIndex||0)+batch.length;
     }
     for(const symbol of batch){
      const list=selections.get(symbol)||[];
      list.push(engine);selections.set(symbol,list);
     }
    }
    check.enginePasses={MAIN:[],FOCUS:[]};
    s.engineCoverage??={MAIN:{},FOCUS:{}};
    s.engineCoverage.MAIN??={};s.engineCoverage.FOCUS??={};
    // Preserve verified checks recorded by the original single scanner.
    // On migration, only seed symbols that actually belong to Scanner 1;
    // never pretend a focus-only symbol was scanned by the main engine.
    if(!s.engineCoverageMigrated){
     const mainSymbols=new Set(scannerEngineUniverse(s,'MAIN'));
     for(const [symbol,record] of Object.entries(s.scanCoverage||{}))
      if(mainSymbols.has(symbol)&&!s.engineCoverage.MAIN[symbol])
       s.engineCoverage.MAIN[symbol]=record;
     s.engineCoverageMigrated=true;
    }
    s.engineLast??={};
    for(const [symbol,engines] of selections){
     const checkedAt=Date.now();check.scannedSymbols.push(symbol);
     engines.forEach(engine=>check.enginePasses[engine].push(symbol));
     try{
     const history=await data(env,owner,'history',symbol);
     const bars=(history.candles||[]).filter(c=>c.time+60000<=checkedAt&&Number.isFinite(c.volume));
     const technical=evaluateSymbol(symbol,bars,{now:checkedAt,staleAfterMinutes:3});
     // The first breakout candle only creates a WATCH. A separate, already
     // closed follow-through/retest candle must confirm the same price level.
     // Historical breakouts are re-evaluated using only candles available at
     // their original timestamp, not future price information.
     const priceAction=assessPriceAction(symbol,bars,{now:checkedAt,liveSignal:technical});
     const signal=priceAction.confirmed?{
      ...technical,state:'TECHNICAL_WATCH',direction:priceAction.direction,
      score:priceAction.initialSignalScore,
      reason:'Price-action breakout and second candle confirmed. '+priceAction.reason,
      asOf:new Date(priceAction.confirmationBarTime).toISOString(),
      metrics:{...technical.metrics,breakout:true,volumeConfirmed:true}
     }:technical;
     s.priceActionChecks||={};
     s.priceActionChecks[symbol]={...priceAction,checkedAt};
     // Bound stored diagnostics to avoid unbounded D1 growth.
     if(Object.keys(s.priceActionChecks).length>45){
      const oldest=Object.entries(s.priceActionChecks).sort((a,b)=>
       (a[1].checkedAt||0)-(b[1].checkedAt||0));
      for(const [ticker] of oldest.slice(0,-40))delete s.priceActionChecks[ticker];
     }
     s.marketFeed=await validateUnderlyingQuote(env,owner,symbol,Date.now());
     s.lastScan={symbol,time:checkedAt,signal};
     s.scanHistory=[{symbol,time:checkedAt,state:signal.state,reason:signal.reason},...(s.scanHistory||[])].slice(0,30);
     // Daily OHLCV is independent of minute-breakout alerts; scan each
     // symbol only once per NY trading day, including if no scalp is present.
     s.dailySignals||={};s.dailyCheckedDay||={};
     if(s.dailyCheckedDay[symbol]!==session.day){
      s.dailyCheckedDay[symbol]=session.day;
      try{
       const daily=await data(env,owner,'daily',symbol);
       const today=Date.parse(new Date(checkedAt).toISOString().slice(0,10)+'T00:00:00Z');
       const completed=(daily.candles||[]).filter(c=>c.time<today&&Number.isFinite(c.volume));
       const swing=evaluateDailySwing(completed);
       s.dailySignals[symbol]=swing;
       if(swing.status==='SWING_WATCH'){
        s.scanHistory.unshift({symbol,time:checkedAt,state:'MULTIDAY_SWING_WATCH',
         reason:swing.reason+' Informational only; option contract, affordability and overnight risks not confirmed.'});
        s.scanHistory=s.scanHistory.slice(0,30);
       }
      }catch{s.dailySignals[symbol]={status:'UNAVAILABLE',confirmed:false,reason:'Daily Schwab bars unavailable.'}}
     }
     if(!priceAction.confirmed){
      if(technical.state==='TECHNICAL_WATCH'||
       !['NO_CONFIRMED_BREAKOUT','UNASSESSED'].includes(priceAction.status)){
       s.scanHistory.unshift({symbol,time:checkedAt,state:priceAction.status,
        reason:priceAction.reason});
       s.scanHistory=s.scanHistory.slice(0,30);
      }
      continue; // Never request an option chain on an unconfirmed breakout.
     }
     if(s.marketFeed?.code!=='VERIFIED_FRESH'){
      s.scanHistory.unshift({symbol,time:checkedAt,state:'FEED_HOLD',reason:'Real-time Schwab underlying quote was not freshly verified: '+(s.marketFeed?.label||'UNAVAILABLE')});
      s.scanHistory=s.scanHistory.slice(0,30);continue;
     }
     // Completed 5/5 swing levels are structural context for entry decisions.
     // Preserve them for dashboard diagnostics even when Don't Chase holds.
     // Do not modify stops or open positions based on underlying stock levels.
     const swing55=assessSwing55Entry(bars,signal);
     s.swingLevels||={};
     s.swingLevels[symbol]={...swing55,checkedAt};
     // Keep detection and execution timing separate: yesterday's XLE/AAPL
     // puts found technical bearish momentum, but a mature morning decline
     // can be too stretched for a favorable *new* entry. This guard is
     // independent of clock time and never changes existing open positions.
     const entryTiming=assessEntryChase(bars,signal);
     if(entryTiming.hold){
      s.scanHistory.unshift({symbol,time:checkedAt,state:entryTiming.status,
       reason:entryTiming.reason});
      s.scanHistory=s.scanHistory.slice(0,30);
      continue; // No option chain, alert bell or new paper entry from a chase.
     }
     if(swing55.hold){
      s.scanHistory.unshift({symbol,time:checkedAt,state:swing55.status,
       reason:swing55.reason});
      s.scanHistory=s.scanHistory.slice(0,30);
      continue; // Wait for a support break / resistance break; no new paper entry.
     }
     const confluence=evaluateAristotleConfluence(bars,signal.direction);
     // Nov 4 paper-scanner behavior: a verified technical breakout may
     // generate a reviewable setup without a mandatory 150-bar MACD/OBV +
     // 5/15-minute confirmation. Preserve this stronger evidence as a tier,
     // never imply a measured win probability when it is absent.
     const chain=await data(env,owner,'options',symbol);
     if(chain.delayed!==false)throw Error('Options delay status unconfirmed; skipping setup.');
     const candidates=(chain.contracts||[]).filter(c=>paperEntryEligible(c.expiration,session)&&c.side===signal.direction&&!c.nonStandard&&[c.delta,c.volume,c.openInterest,c.quoteTime].every(Number.isFinite)&&checkedAt-c.quoteTime<=60000&&c.quoteTime<=checkedAt+5000&&!paperQuoteQualityFailure(c,budget(s))).sort((a,b)=>(a.ask-a.bid)/a.ask-(b.ask-b.bid)/b.ask);
     // The stable breakout timestamp is the setup identity. Repeated checks
     // over its 6-minute confirmation window cannot generate duplicate alerts.
     const contract=candidates[0],id=symbol+'|'+new Date(priceAction.breakoutBarTime).toISOString();
     if(!contract){
      s.scanHistory.unshift({symbol,time:checkedAt,state:'CONTRACT_HOLD',reason:'No fresh, liquid contract passed premium, spread, delta and risk checks.'});
      s.scanHistory=s.scanHistory.slice(0,30);continue;
     }
     // Pre-subscribe candidate to live option updates. This cannot override the
     // independently verified real-time contract bid/ask checks on paper entry.
     if(env.PAPER_QUOTE_STREAM&&scanSymbol!==null)try{
      await env.PAPER_QUOTE_STREAM.getByName(owner.id).watchOption(contract.symbol,symbol);
     }catch{}
     // A chain snapshot can be seconds old. Reprice the exact option contract
     // immediately before publishing any scalp setup, with provider-proven
     // real-time entitlement and a sub-10s quote timestamp.
     const exact=await schwabContractQuote(env,owner,contract.symbol);
     const exactFreshness=schwabQuoteFreshness({...exact,realtime:true},Date.now(),10000);
     const actionable={...contract,bid:exact.bid,ask:exact.ask,quoteTime:exact.quoteTime};
     const contractRiskFailure=paperQuoteQualityFailure(actionable,budget(s));
     // eligiblePaperQuote returns NULL for a valid contract and a reason code
     // for a rejected contract. Never negate it: that inverted check was
     // rejecting every otherwise-qualified November 5 scalp opportunity.
     if(exactFreshness.code!=='VERIFIED_FRESH'||contractRiskFailure!==null){
      s.scanHistory.unshift({symbol,time:checkedAt,state:'CONTRACT_HOLD',
       reason:'Exact Schwab option quote held: '+(exactFreshness.code!=='VERIFIED_FRESH'?exactFreshness.code:contractRiskFailure)+'.'});
      s.scanHistory=s.scanHistory.slice(0,30);continue;
     }
     const style=classifyTradeHorizon({bars,signal,contract:actionable,
      dailySignal:s.dailySignals?.[symbol],now:checkedAt});
     if(!s.seen.includes(id)){
      const alert={id,created:Date.now(),expires:Date.now()+120000,
       contract:{...actionable,underlying:symbol},entryEstimate:paperOptionEntryEstimate(actionable),signal,style,
       qualification:{technical:{confirmed:true,asOf:signal.asOf,direction:signal.direction},priceAction,confluence,entryTiming,swing55,marketData:{provider:'SCHWAB',realtime:true,underlyingQuoteTime:s.marketFeed.quoteTime,optionQuoteTime:exact.quoteTime}},status:'PENDING'};
      check.newAlerts++;alertList(s).unshift(alert);s.alerts=s.alerts.slice(0,60);
      s.seen=[...s.seen,id].slice(-200);
      s.scanHistory.unshift({symbol,time:checkedAt,state:confluence.confirmed?'HIGH_CONFLUENCE_REVIEW':'PRICE_ACTION_SETUP_REVIEW',
       reason:style.label+': '+priceAction.status.replaceAll('_',' ').toLowerCase()+
        ', '+(priceAction.targetStatus==='CONFIRMED_5_5_SWING'?
         'confirmed opposite swing target and '+priceAction.rewardRisk+':1 underlying reward/risk.':
         'no verified opposite swing target; underlying reward/risk is unassessed.')+
        ' Fresh Schwab option checks passed. Review manually; no win probability is implied.'});
      s.scanHistory=s.scanHistory.slice(0,30);
      event(s,(confluence.confirmed?'HIGH-CONFLUENCE':'CONFIRMED PRICE ACTION')+
       ' SCHWAB PAPER SETUP awaiting owner approval: '+contract.symbol+' · '+style.label+
       ' · Candle: '+priceAction.status+' · Entry timing: '+entryTiming.status+
       ' · 5/5 levels: '+swing55.status);
      try{await notifyPaperOpportunity(env,owner,alert)}catch(e){event(s,'Email notification unavailable: '+e.message)}
     }
    }catch(error){
     check.holds.push({symbol,reason:error.message});s.lastError=error.message;
     s.scanHistory=[{symbol,time:checkedAt,state:'DATA_HOLD',reason:error.message},...(s.scanHistory||[])].slice(0,30);
     event(s,'SCAN HOLD '+symbol+': '+error.message);
    }finally{
     // Keep per-symbol status by engine rather than allowing busy stream
     // tickers to hide the rest of the market's actual check history.
     const latest=s.scanHistory?.find(item=>item.symbol===symbol&&item.time>=checkedAt);
     const finished=Date.now(),result={
      symbol,checkedAt:finished,state:latest?.state||'DATA_HOLD',
      reason:latest?.reason||'Scan did not return a final status.'
     };
     saveSymbolScanCoverage(s,{
      symbol,checkedAt:finished,day:session.day,
      source:scanSymbol===null?'ROTATION':'STREAM',
      scanState:result.state,reason:result.reason
     });
     for(const engine of engines){
      const laneState={scanCoverage:s.engineCoverage[engine]||{}};
      saveSymbolScanCoverage(laneState,{
       symbol,checkedAt:finished,day:session.day,
       source:scanSymbol===null?'ROTATION':'STREAM',
       scanState:result.state,reason:result.reason
      });
      s.engineCoverage[engine]=laneState.scanCoverage;
      s.engineLast[engine]=result;
     }
    }
   }
   }else s.lastScan={time:now,note:'Outside regular paper scanning session (9:30 AM–4:00 PM ET weekdays).'};
  }
 }catch(e){s.lastError=e.message;check.holds.push({reason:e.message});event(s,'Data/risk hold: '+e.message)}
 check.completedAt=Date.now();
 // When Scanner 2 is OFF, its 30-second alarm still protects open trades.
 // That is not a ticker scan: do not erase the last genuine ticker batch
 // with an empty "scannedSymbols: []" record on the main dashboard.
 if(scanLane==='FOCUS'&&check.scannedSymbols.length===0)
  s.lastProtectionCheck=check;
 else s.lastCheck=check;
 await save(env,owner.id,row);return view(s);
}
export async function paperApi(request,env,owner){
 if(!owner?.id||owner.role!=='owner')return response({error:'Owner access required.'},403);
 if(request.method==='GET'){const row=await load(env,owner.id);return response({...view(row.state),serverTime:Date.now()})}
 if(!['https://icomputeranything.com','https://www.icomputeranything.com','https://redavi19-asu.github.io'].includes(request.headers.get('Origin')))return response({error:'Unrecognized origin.'},403);
 try{
  const body=await request.text();if(body.length>2048)return response({error:'Request too large.'},413);const {action,id}=JSON.parse(body);
  if(action==='tick'){
   // A manual full-universe check must use the SAME coordinator as the
   // streaming scanner and cron, otherwise its final D1 save can collide.
   if(env.PAPER_QUOTE_STREAM){
    const stub=env.PAPER_QUOTE_STREAM.getByName(owner.id);
    return response(await stub.runRotation(owner.id,null,false));
   }
   return response(await runPaperTick(env,owner));
  }
  const row=await load(env,owner.id),s=row.state;expireAlerts(s);
  if(action==='auto_start'){
    const input=JSON.parse(body);
    if(typeof input.enabled!=='boolean')throw Error('Auto-start must be enabled or disabled.');
    s.autoStart=input.enabled;
    event(s,input.enabled?'Owner scheduled daily paper-only scanner start at 9:30 AM ET.':'Owner disabled scheduled paper scanner start.');
   }
   else if(action==='scan_scope'){
    const input=JSON.parse(body),mode=input.mode;
    if(mode!=='SINGLE'&&mode!=='MULTI')throw Error('Select Single Ticker or Multiple Tickers.');
    const symbol=String(input.symbol??s.singleTicker??'SPY').trim().toUpperCase();
    if(mode==='SINGLE'&&!validTicker(symbol))throw Error('Single ticker must be a valid stock or ETF symbol.');
    if(mode==='SINGLE')s.singleTicker=symbol;
    s.scanMode=mode;s.scanIndex=0;
    s.scannerEngines??={};
    s.scannerEngines.MAIN={enabled:true,scope:mode==='SINGLE'?'CUSTOM':'ALL',
     symbols:mode==='SINGLE'?[symbol]:[]};
    s.scannerEngines.FOCUS={...scannerEngineConfig(s,'FOCUS'),enabled:false};
    // Existing open positions remain independently protected regardless of scanning scope.
    if(mode==='SINGLE')for(const alert of alertList(s)){
     if(alert.status==='PENDING'&&alert.contract?.underlying!==symbol){
      alert.status='OUT_OF_SCOPE';event(s,'Pending setup invalidated by Single Ticker mode: '+alert.contract.symbol);
     }
    }
    s.scanHistory=[];
    s.lastScan={time:Date.now(),note:mode==='SINGLE'?'Scanner restricted to '+symbol:'Multiple Tickers scanner restored.'};
    event(s,mode==='SINGLE'?'Owner selected Single Ticker PAPER scanner: '+symbol:'Owner selected Multiple Tickers PAPER scanner.');
   }
   else if(action==='scanner_engine'){
    const input=JSON.parse(body),engine=input.engine;
    if(!PAPER_SCAN_ENGINES.includes(engine))throw Error('Choose Scanner 1 or Scanner 2.');
    if(typeof input.enabled!=='boolean'||!['ALL','CUSTOM'].includes(input.scope))
     throw Error('Choose enabled or disabled and all or custom ticker scope.');
    if(!Array.isArray(input.symbols)||input.symbols.length>40||
       !input.symbols.every(validTicker))
     throw Error('Enter up to 40 unique stock or ETF ticker symbols.');
    const symbols=[...new Set(input.symbols)];
    if(input.enabled&&input.scope==='CUSTOM'&&!symbols.length)
     throw Error('Add at least one ticker before starting a custom scanner.');
    s.scannerEngines??={};
    s.scannerEngines[engine]={enabled:input.enabled,scope:input.scope,symbols};
    s.scanMode='MULTI'; // New independent per-engine selection supersedes legacy global Single mode.
    if(engine==='MAIN')s.scanIndex=0;
    else s.focusScanIndex=0;
    event(s,'Owner configured '+(engine==='MAIN'?'Scanner 1':'Scanner 2')+
     ': '+(input.enabled?'ON':'OFF')+' · '+(input.scope==='ALL'?'full watchlist':symbols.join(', ')));
   }
   else if(action==='watchlist_update'){
    // Same server-backed custom symbols for Watchlist Favorites AND the paper
    // scanner. Supports changes while open paper trades remain protected.
    const input=JSON.parse(body),op=input.operation;
    if(!['add','remove','merge'].includes(op))throw Error('Choose add, remove or merge for the watchlist.');
    const clean=value=>typeof value==='string'&&validTicker(value)?value:null;
    const symbol=clean(input.symbol);
    if(op!=='merge'&&!symbol)throw Error('Invalid watchlist ticker symbol.');
    if(op==='merge'&&(!Array.isArray(input.symbols)||input.symbols.length>20||
       input.symbols.some(x=>!clean(x))))
     throw Error('Up to 20 valid ticker symbols may be imported.');
    const existing=[...new Set((Array.isArray(s.extraSymbols)?s.extraSymbols:[]).filter(validTicker))];
    // A base-universe ticker is already part of the scanner and needs no
    // second custom entry.
    const additions=op==='merge'?input.symbols:op==='add'?[symbol]:[];
    const next=op==='remove'?existing.filter(x=>x!==symbol):
     [...new Set([...existing,...additions.filter(x=>!DEFAULT_WATCHLIST_FAVORITES.includes(x))])];
    if(next.length>20)throw Error('Scanner supports 20 extra watchlist tickers. Remove unused custom symbols first.');
    s.extraSymbols=next;
    event(s,'Owner '+(op==='merge'?'synchronized':op==='add'?'added to':'removed from')+
     ' shared paper watchlist'+(symbol?': '+symbol:'.'));
   }
   else if(action==='start'){s.enabled=true;event(s,'Owner enabled paper setup scanning.')}
  else if(action==='settings'){
   if(s.paper.positions.length)throw Error('Change paper scan settings only when no positions are active.');
   const input=JSON.parse(body),amount=Number(input.maxPremium);
   if(!Number.isFinite(amount)||amount<1||amount>5000)throw Error('Paper max premium must be between $1 and $5,000.');
   if(!Array.isArray(input.extraSymbols)||input.extraSymbols.length>20||!input.extraSymbols.every(v=>typeof v==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(v)))throw Error('Up to 20 valid uppercase symbols are allowed.');
   s.maxPremium=Math.round(amount*100)/100;s.extraSymbols=[...new Set(input.extraSymbols)];
   event(s,'Paper scan settings updated.');
  }
   else if(action==='stop_settings'){
   // User may alter the default for NEXT entries even if a trade is open.
   // Each existing position retains its own entry-time risk percentage.
   if(!PAPER_STOP_LOSS_CHOICES.includes(id))throw Error('Choose 15, 20, 35 or 50 percent.');
   s.stopLossPct=id;
   event(s,'Owner selected '+id+' percent protective stop for future paper trades.');
  }
   else if(action==='pause'){
    s.enabled=false;
    // An explicit pause must not be undone by the next minute's cron run.
    s.lastAutoStartDay=marketTime(Date.now()).day;
    event(s,'Owner paused new setups. Existing position protection continues.');
   }
  else if(action==='close'||action==='close_all'){
   const selected=action==='close'&&id?s.paper.positions.filter(p=>p.id===id):s.paper.positions;
   if(action==='close'&&id&&!selected.length)throw Error('This contract is already closed. See Closed Trades.');
   if(action==='close_all'||!id)s.entryEpoch++;
   for(const position of selected)position.closeRequested=true;
   normalizePaperPortfolio(s);event(s,selected.length?'Owner requested simulated close: '+selected.map(p=>p.symbol).join(', '):'No open paper contracts to close.');
  }
  else if(action==='skip'||action==='dismiss'){
   const alerts=alertList(s),a=alerts.find(x=>x.id===id);
   if(!a)throw Error('Alert already dismissed or changed.');
   s.alerts=alerts.filter(x=>x.id!==id);event(s,'Owner dismissed '+a.contract.symbol+' ('+a.status+').');
  }
  else if(action==='position_override'){
   const input=JSON.parse(body),position=s.paper.positions.find(p=>p.id===input.id);
   if(!position||position.closeRequested)throw Error('Position already closed or closing. Override not available.');
   if(!['EXTEND_TIME','CHANGE_STOP'].includes(input.operation)||input.confirmOverride!==true)
    throw Error('Select and explicitly confirm a paper-trade override.');
   const currentSession=marketTime(Date.now());
   if(!paperSessionOpen(currentSession)||paperExpirationCloseDue(position.expiration,currentSession))
    throw Error('Market or expiration-day exit is due. Mandatory closing rules cannot be overridden.');
   const quote=await schwabContractQuote(env,owner,position.symbol);
   if(schwabQuoteFreshness({...quote,realtime:true},Date.now(),10000).code!=='VERIFIED_FRESH')
    throw Error('Cannot override with a stale or unavailable option bid.');
   if(!Number.isFinite(quote.bid)||quote.bid<=0)
    throw Error('No valid option bid. Paper override held.');
   const currentPct=selectedStopLossPct(position.stopLossPct);
   if(quote.bid<=position.fill*(1-currentPct/100))
    throw Error('Existing stop has already been reached. Cannot override an exit after the trigger.');
   if(input.operation==='EXTEND_TIME'){
    if(expiryStatus(position.expiration,currentSession.day)==='FUTURE')
     throw Error('Overnight-eligible positions have no mandatory 30-minute scalp cap.');
    const existing=Math.min(390,Math.max(1,Number(position.maxHoldMinutes)||30));
    if(Date.now()>=position.time+existing*60000)
     throw Error('Timed exit is already due. Extend before the deadline.');
    if(existing>=390)throw Error('Maximum 390-minute intraday cap reached.');
    position.maxHoldMinutes=Math.min(390,existing+10);
    event(s,'Owner manually extended '+position.symbol+' time exit by 10 minutes to '+
     position.maxHoldMinutes+' minutes; stop and session safeguards remain active.');
   }else{
    const newStop=Number(input.stopLossPct);
    if(!PAPER_STOP_LOSS_CHOICES.includes(newStop))throw Error('Choose a 15%, 20%, 35%, or 50% option-premium stop.');
    if(newStop===currentPct)throw Error('Choose a different stop percentage.');
    position.stopLossPct=newStop;
    event(s,'Owner deliberately changed OPEN paper stop for '+position.symbol+
     ' from '+currentPct+'% to '+newStop+'%; live-trade risk explicitly acknowledged.');
   }
   normalizePaperPortfolio(s);
  }
  else if(action==='accept'){
   const a=alertList(s).find(x=>x.id===id);
   if(!s.enabled)throw Error('Scanner is paused. Start Scan before accepting a new paper setup.');
   if(s.scanMode==='SINGLE'&&a?.contract?.underlying!==s.singleTicker)throw Error('This setup is outside the selected Single Ticker scope.');
   const input=JSON.parse(body);
   if(input.epoch!==undefined&&input.epoch!==s.entryEpoch)throw Error('Approval cancelled by Close All. Review the opportunity again before accepting.');
   if(!a||!liveAlert(a))throw Error('This opportunity is expired or already accepted. Check Open Trades and Closed Trades.');
   if(a.signal?.state!=='TECHNICAL_WATCH'||a.qualification?.technical?.confirmed!==true||a.qualification.technical.asOf!==a.signal.asOf||a.qualification?.marketData?.provider!=='SCHWAB'||a.qualification?.marketData?.realtime!==true)
    throw Error('Verified Schwab quotes and current technical-breakout evidence required. Historical alerts must be re-screened.');
   // Recheck both the underlying thesis and the exact option quote AT
   // APPROVAL, never rely on a previously displayed but expired setup.
   await verifyPaperPriceWindow(env,owner,a);
   const c=a.contract,quote={...c,...await schwabContractQuote(env,owner,c.symbol)};
   if(a.expires<Date.now())throw Error('Setup expired during quote refresh.');
   if(schwabQuoteFreshness({...quote,realtime:true},Date.now(),10000).code!=='VERIFIED_FRESH')
    throw Error('Fresh real-time option bid/ask was not verified. Wait for a current quote.');
   const quality=paperQuoteQualityFailure(quote,budget(s));
   if(quality)throw Error('Updated option quote no longer meets scalp quality: '+quality.replaceAll('_',' '));
   // Quotes that improve can fill immediately. An increased ask over 2%
   // opens an explicit review rather than permanently cancelling the trade.
   if(paperNeedsPriceConfirmation(c.ask,quote.ask,input.maxApprovedAsk)){
    return response({code:'REQUOTE_REVIEW',
      error:'Option ask moved higher. Review the fresh cost and spread, then explicitly confirm your paper scalp.',
      requote:{symbol:c.symbol,oldAsk:c.ask,ask:quote.ask,bid:quote.bid,
       quoteTime:quote.quoteTime,originalPriceChangePct:Math.round((quote.ask/c.ask-1)*10000)/100,
       estimate:paperOptionEntryEstimate(quote),expires:a.expires},
      status:view(s)},409);
   }
   // Never treat a prior acknowledgement as permission for a still-higher ask.
   if(input.maxApprovedAsk!==undefined&&(!Number.isFinite(input.maxApprovedAsk)||
      input.maxApprovedAsk<=0||quote.ask>input.maxApprovedAsk))
    throw Error('Option ask increased again. Refresh the setup and review the updated cost.');
   enterPaperPosition(s,a,quote,{maxPremium:budget(s),stopLossPct:stopLossPct(s)});
   a.status='TAKEN';a.enteredAt=Date.now();event(s,'OWNER APPROVED simulated entry: '+c.symbol);
  }else throw Error('Unknown action.');
  await save(env,owner.id,row);
  // Persist emergency intent before any network request, then try the exit immediately.
  if(['close','close_all'].includes(action)&&s.closeRequested)return response(await runPaperTick(env,owner,{scan:false}));
  return response(view(s));
 }catch(e){return response({error:e.message,code:e.message==='State changed; refresh and retry.'?'STATE_CHANGED':'PAPER_ACTION_REJECTED'},409)}
}
export async function scheduledPaper(env){
 const rows=await env.DB.prepare("SELECT p.owner_id FROM paper_runners p JOIN users u ON u.id=p.owner_id WHERE u.role='owner' AND u.status='active'").all();
 for(const row of rows.results||[])try{
  const owner={id:row.owner_id,role:'owner'},session=marketTime(Date.now());
  // Save the 9:30 transition BEFORE attempting a streaming connection, so
  // network latency cannot leave the scanner visibly paused at the opening bell.
  try{await ensureDailyPaperAutoStart(env,owner)}
  catch(error){console.error('PAPER_AUTO_START_RETRY',String(error?.message||error))}
  let streamHealth={connected:false,transport:'NOT_CONNECTED',error:'',quoteAgeMs:null};
  if(env.PAPER_QUOTE_STREAM){
   const previous=(await load(env,owner.id)).state;
   const sessionActive=!['Sat','Sun'].includes(session.weekday)&&session.minute>=570&&session.minute<PAPER_MARKET_CLOSE_MINUTE;
   const scannerWanted=previous.enabled===true||(previous.autoStart===true&&previous.lastAutoStartDay!==session.day);
   const stub=env.PAPER_QUOTE_STREAM.getByName(owner.id);
   if(sessionActive&&scannerWanted){
    try{const health=await stub.enable(owner.id,scannerStreamUniverse(previous).slice(0,40),previous.scanMode);
     streamHealth=health;
    }catch{streamHealth={connected:false,transport:'ERROR',error:'Schwab stream coordinator unavailable.',quoteAgeMs:null}}
   }else try{await stub.disable();streamHealth={connected:false,transport:'STOPPED',error:'',quoteAgeMs:null}}catch{}
  }
  // Keep scheduled full-universe scanning even during healthy streaming.
  // Both paths MUST share the DO coordinator: without serialized database
  // writes, rapid GOOGL stream ticks can continuously win the optimistic
  // revision race and silently discard every scheduled rotation result.
  if(env.PAPER_QUOTE_STREAM){
   const stub=env.PAPER_QUOTE_STREAM.getByName(owner.id);
   try{await stub.runRotation(owner.id,streamHealth,true,'BOTH')}
   catch(error){
    console.error('PAPER_SCHEDULED_ROTATION_RETRY',String(error?.message||error));
    // A failed Durable Object rotation must not prevent the cron's paper
    // scanner attempt; retry using the existing quote/risk checks.
    await runPaperTick(env,owner,{scheduled:true,scan:true,streamHealth});
   }
  }else await runPaperTick(env,owner,{scheduled:true,scan:true});
 }catch(error){console.error('PAPER_SCHEDULED_TICK_FAILED',String(error?.message||error))}
}
