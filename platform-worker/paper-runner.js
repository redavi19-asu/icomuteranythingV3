import {normalizePaperPortfolio,enterPaperPosition,managePaperPosition} from '../src/master/paper-portfolio.js';
import {newPaper,paperRules} from '../src/master/paper-session.js';
import {evaluateSymbol,eligiblePaperQuote,marketTime} from '../src/master/trading-paper-engine.js';
import {schwabMarket,schwabQuotes,schwabContractQuote} from './schwab-connection.js';
import {schwabQuoteFreshness} from '../src/master/schwab-quote-freshness.js';
import {evaluateAristotleConfluence,evaluateDailySwing,classifyTradeHorizon} from '../src/master/trading-smart-money.js';
const response=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
// Bounded liquid options universe. This is NOT a claim to scan every exchange-listed stock.
export const PAPER_SCAN_UNIVERSE=Object.freeze(['SPY','QQQ','IWM','DIA','XLK','XLF','XLE','USO','BNO','AAPL','NVDA','TSLA','AMZN','META','MSFT','AMD','GOOGL','TLT','GLD','SLV']);
const validTicker=t=>typeof t==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(t);
const scannerUniverse=s=>s.scanMode==='SINGLE'?(validTicker(s.singleTicker)?[s.singleTicker]:[]):
 [...new Set([...PAPER_SCAN_UNIVERSE,...(Array.isArray(s.extraSymbols)?s.extraSymbols:[])])].slice(0,40);
const budget=s=>Number.isFinite(s.maxPremium)?s.maxPremium:paperRules.premiumBudget;
function alertList(s){
 if(!Array.isArray(s.alerts))s.alerts=[];
 if(s.pending){if(!s.alerts.some(a=>a.id===s.pending.id))s.alerts.unshift({...s.pending,status:'PENDING'});s.seen=[...new Set([...(s.seen||[]),s.pending.id])].slice(-200);s.pending=null;}
 return s.alerts;
}
const liveAlert=(a,now=Date.now())=>a.status==='PENDING'&&a.expires>now;
function expireAlerts(s,now=Date.now()){for(const a of alertList(s))if(a.status==='PENDING'&&a.expires<=now){a.status='EXPIRED';event(s,'Approval expired: '+a.contract.symbol);}}
const view=s=>({...normalizePaperPortfolio(s),pending:null,alerts:alertList(s),scanUniverse:scannerUniverse(s),scanMode:s.scanMode==='SINGLE'?'SINGLE':'MULTI',singleTicker:validTicker(s.singleTicker)?s.singleTicker:'SPY',autoStart:s.autoStart===true,mode:'PAPER_ONLY',realOrdersEnabled:false});
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
 flowGate:{status:'DISABLED',provider:'NONE',level2:'NOT_CONNECTED',reason:'Paid options-flow check removed; Schwab data and risk checks still required.'},marketFeed:{code:'UNAVAILABLE',label:'NO VERIFIED LIVE QUOTES YET',symbol:null,checkedAt:null},autoStart:false,lastAutoStartDay:null,maxPremium:paperRules.premiumBudget,extraSymbols:[]});
async function load(env,id){await env.DB.prepare('INSERT OR IGNORE INTO paper_runners(owner_id,payload) VALUES(?,?)').bind(id,JSON.stringify(freshRunner())).run();const row=await env.DB.prepare('SELECT revision,payload FROM paper_runners WHERE owner_id=?').bind(id).first();return {revision:row.revision,state:{...normalizePaperPortfolio(JSON.parse(row.payload)),revision:row.revision}}}
async function save(env,id,row){const r=await env.DB.prepare('UPDATE paper_runners SET payload=?,revision=revision+1 WHERE owner_id=? AND revision=?').bind(JSON.stringify(row.state),id,row.revision).run();if(r.meta.changes!==1)throw Error('State changed; refresh and retry.');row.revision++;row.state.revision=row.revision;}
function event(s,text){s.events=[{time:Date.now(),text},...s.events].slice(0,100)}
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
export async function runPaperTick(env,owner,{scan=true,scheduled=false,scanSymbol=null,streamHealth=null}={}){
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
 }
 // Server-side opt-in schedule: a real setting, not a browser-local checkbox.
 // Only start the PAPER scanner during the market session, once per NY trading day.
 if(scheduled&&s.autoStart===true){
  const session=marketTime(Date.now());
  if(!['Sat','Sun'].includes(session.weekday)&&session.minute>=570&&session.minute<945&&s.lastAutoStartDay!==session.day){
   s.enabled=true;s.lastAutoStartDay=session.day;event(s,'Scheduled paper scanner enabled for '+session.day+' at/after 9:30 AM ET.');
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
   if(!['Sat','Sun'].includes(session.weekday)&&session.minute>=575&&session.minute<945){
    const allowed=scannerUniverse(s);
    const universe=scanSymbol===null?allowed:allowed.filter(t=>t===scanSymbol);
    const attempts=scanSymbol===null?Math.min(3,universe.length):universe.length;
   for(let i=0;i<attempts;i++){
    const symbol=universe[(s.scanIndex++%universe.length)],checkedAt=Date.now();check.scannedSymbols.push(symbol);
    try{
     const history=await data(env,owner,'history',symbol);
     const bars=(history.candles||[]).filter(c=>c.time+60000<=checkedAt&&Number.isFinite(c.volume));
     const signal=evaluateSymbol(symbol,bars,{now:checkedAt,staleAfterMinutes:3});
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
         reason:swing.reason+' Informational only; option contract, affordability, flow and overnight risks not confirmed.'});
        s.scanHistory=s.scanHistory.slice(0,30);
       }
      }catch{s.dailySignals[symbol]={status:'UNAVAILABLE',confirmed:false,reason:'Daily Schwab bars unavailable.'}}
     }
     if(signal.state!=='TECHNICAL_WATCH')continue;
     if(s.marketFeed?.code!=='VERIFIED_FRESH'){
      s.scanHistory.unshift({symbol,time:checkedAt,state:'FEED_HOLD',reason:'Real-time Schwab underlying quote was not freshly verified: '+(s.marketFeed?.label||'UNAVAILABLE')});
      s.scanHistory=s.scanHistory.slice(0,30);continue;
     }
     const confluence=evaluateAristotleConfluence(bars,signal.direction);
     if(!confluence.confirmed){
      s.scanHistory.unshift({symbol,time:checkedAt,state:'CONFLUENCE_WATCH',reason:confluence.reason});
      s.scanHistory=s.scanHistory.slice(0,30);continue;
     }
     const chain=await data(env,owner,'options',symbol);
     if(chain.delayed!==false)throw Error('Options delay status unconfirmed; skipping setup.');
     const candidates=(chain.contracts||[]).filter(c=>c.side===signal.direction&&!c.nonStandard&&[c.delta,c.volume,c.openInterest,c.quoteTime].every(Number.isFinite)&&checkedAt-c.quoteTime<=60000&&c.quoteTime<=checkedAt+5000&&!eligiblePaperQuote(c,{...paperRules,premiumBudget:budget(s)})).sort((a,b)=>(a.ask-a.bid)/a.ask-(b.ask-b.bid)/b.ask);
     const contract=candidates[0],id=symbol+'|'+signal.asOf;
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
     if(exactFreshness.code!=='VERIFIED_FRESH'||!eligiblePaperQuote(actionable,{...paperRules,premiumBudget:budget(s)})){
      s.scanHistory.unshift({symbol,time:checkedAt,state:'CONTRACT_HOLD',
       reason:'Exact Schwab option quote was stale, unavailable or failed live spread/risk checks.'});
      s.scanHistory=s.scanHistory.slice(0,30);continue;
     }
     const style=classifyTradeHorizon({bars,signal,contract:actionable,
      dailySignal:s.dailySignals?.[symbol],now:checkedAt});
     if(!s.seen.includes(id)){
      const alert={id,created:Date.now(),expires:Date.now()+120000,
       contract:{...actionable,underlying:symbol},signal,style,
       qualification:{confluence,marketData:{provider:'SCHWAB',realtime:true,underlyingQuoteTime:s.marketFeed.quoteTime,optionQuoteTime:exact.quoteTime}},status:'PENDING'};
      check.newAlerts++;alertList(s).unshift(alert);s.alerts=s.alerts.slice(0,60);
      s.seen=[...s.seen,id].slice(-200);
      s.scanHistory.unshift({symbol,time:checkedAt,state:'HIGH_CONFLUENCE_REVIEW',
       reason:style.label+': Schwab quote freshness, technical confluence and option-contract liquidity/risk checks aligned. No paid options-flow feed required; not a measured win probability.'});
      s.scanHistory=s.scanHistory.slice(0,30);
      event(s,'SCHWAB-VERIFIED TECHNICAL PAPER SETUP awaiting owner approval: '+contract.symbol+' · '+style.label);
      try{await notifyPaperOpportunity(env,owner,alert)}catch(e){event(s,'Email notification unavailable: '+e.message)}
     }
    }catch(error){
     check.holds.push({symbol,reason:error.message});s.lastError=error.message;
     s.scanHistory=[{symbol,time:checkedAt,state:'DATA_HOLD',reason:error.message},...(s.scanHistory||[])].slice(0,30);
     event(s,'SCAN HOLD '+symbol+': '+error.message);
    }
   }
   }else s.lastScan={time:now,note:'Outside paper entry session (9:35 AM–3:45 PM ET weekdays).'};
  }
 }catch(e){s.lastError=e.message;check.holds.push({reason:e.message});event(s,'Data/risk hold: '+e.message)}
 check.completedAt=Date.now();s.lastCheck=check;
 await save(env,owner.id,row);return view(s);
}
export async function paperApi(request,env,owner){
 if(!owner?.id||owner.role!=='owner')return response({error:'Owner access required.'},403);
 if(request.method==='GET'){const row=await load(env,owner.id);return response({...view(row.state),serverTime:Date.now()})}
 if(!['https://icomputeranything.com','https://www.icomputeranything.com','https://redavi19-asu.github.io'].includes(request.headers.get('Origin')))return response({error:'Unrecognized origin.'},403);
 try{
  const body=await request.text();if(body.length>2048)return response({error:'Request too large.'},413);const {action,id}=JSON.parse(body);
  if(action==='tick')return response(await runPaperTick(env,owner));
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
   else if(action==='start'){s.enabled=true;event(s,'Owner enabled paper setup scanning.')}
  else if(action==='settings'){
   if(s.paper.positions.length)throw Error('Change paper scan settings only when no positions are active.');
   const input=JSON.parse(body),amount=Number(input.maxPremium);
   if(!Number.isFinite(amount)||amount<1||amount>5000)throw Error('Paper max premium must be between $1 and $5,000.');
   if(!Array.isArray(input.extraSymbols)||input.extraSymbols.length>20||!input.extraSymbols.every(v=>typeof v==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(v)))throw Error('Up to 20 valid uppercase symbols are allowed.');
   s.maxPremium=Math.round(amount*100)/100;s.extraSymbols=[...new Set(input.extraSymbols)];
   event(s,'Paper scan settings updated.');
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
  else if(action==='accept'){
   const a=alertList(s).find(x=>x.id===id);
   if(!s.enabled)throw Error('Scanner is paused. Start Scan before accepting a new paper setup.');
   if(s.scanMode==='SINGLE'&&a?.contract?.underlying!==s.singleTicker)throw Error('This setup is outside the selected Single Ticker scope.');
   const input=JSON.parse(body);
   if(input.epoch!==undefined&&input.epoch!==s.entryEpoch)throw Error('Approval cancelled by Close All. Review the opportunity again before accepting.');
   if(!a||!liveAlert(a))throw Error('This opportunity is expired or already accepted. Check Open Trades and Closed Trades.');
   if(a.qualification?.confluence?.confirmed!==true||a.qualification?.marketData?.provider!=='SCHWAB'||a.qualification?.marketData?.realtime!==true)
    throw Error('Verified Schwab market data and multi-timeframe evidence required. Historical alerts must be re-screened.');
   const c=a.contract,quote={...c,...await schwabContractQuote(env,owner,c.symbol)};
   if(a.expires<Date.now())throw Error('Setup expired during quote refresh.');
   if(!Number.isFinite(quote.ask)||quote.ask<=0||Math.abs(quote.ask/c.ask-1)>0.02){
    a.status='REPRICED';event(s,'Contract repriced; alert no longer actionable: '+c.symbol);
    await save(env,owner.id,row);
    return response({error:'Contract price moved over 2%. This alert was marked repriced. Wait for a fresh setup.',code:'CONTRACT_REPRICED',status:view(s)},409);
   }
   enterPaperPosition(s,a,quote,{maxPremium:budget(s)});
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
  let streamConnected=false,streamHealth={connected:false,transport:'NOT_CONNECTED',error:'',quoteAgeMs:null};
  if(env.PAPER_QUOTE_STREAM){
   const previous=(await load(env,owner.id)).state;
   const sessionActive=!['Sat','Sun'].includes(session.weekday)&&session.minute>=570&&session.minute<945;
   const scannerWanted=previous.enabled===true||(previous.autoStart===true&&previous.lastAutoStartDay!==session.day);
   const stub=env.PAPER_QUOTE_STREAM.getByName(owner.id);
   if(sessionActive&&scannerWanted){
    try{const health=await stub.enable(owner.id,scannerUniverse(previous),previous.scanMode);
     streamHealth=health;
     streamConnected=health.connected===true&&Number.isFinite(health.quoteAgeMs)&&health.quoteAgeMs<20000;
    }catch{streamHealth={connected:false,transport:'ERROR',error:'Schwab stream coordinator unavailable.',quoteAgeMs:null}}
   }else try{await stub.disable();streamHealth={connected:false,transport:'STOPPED',error:'',quoteAgeMs:null}}catch{}
  }
  // A denied, broken or stale stream never stops the legacy scheduled scanner.
  await runPaperTick(env,owner,{scheduled:true,scan:!streamConnected,streamHealth:env.PAPER_QUOTE_STREAM?streamHealth:null});
 }catch{}
}
