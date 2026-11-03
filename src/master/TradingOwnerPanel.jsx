import React, {useMemo,useState} from 'react';
// The trading calculation engine is derived from the private trading-platform repo.
// This panel is mounted only after ICA Master verifies the owner session.
// It contains no API keys, account details, or real order execution.
/* Owner opportunity radar: deterministic market analysis. No brokerage orders or generated quotes. */
const isNum=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v));
function timeMillis(value){
 const s=String(value??'').trim();
 if(/^\d{10}$/.test(s))return Number(s)*1000;
 if(/^\d{13}$/.test(s))return Number(s);
 if(/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d/.test(s)&&!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(s))throw Error('Intraday timestamps need a timezone, such as Z or -05:00.');
 const t=Date.parse(s);
 if(!Number.isFinite(t))throw Error('Invalid timestamp. Use ISO 8601 with a timezone or Unix time.');
 return t;
}
function parseMarketCsv(source){
 if(typeof source!=='string'||!source.trim())throw Error('Choose a CSV with real historical market bars.');
 const lines=source.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(Boolean);
 if(lines.length<2)throw Error('CSV needs a header and data rows.');
 if(lines.length>20001)throw Error('Import limit is 20,000 bars.');
 const names=lines.shift().split(',').map(s=>s.trim().replace(/^"|"$/g,'').toLowerCase());
 const index=(...options)=>names.findIndex(s=>options.includes(s));
 const col={symbol:index('symbol','ticker'),time:index('time','timestamp','datetime','date'),open:index('open'),high:index('high'),low:index('low'),close:index('close'),volume:index('volume','vol')};
 if(Object.values(col).some(n=>n<0))throw Error('Required CSV columns: symbol,time,open,high,low,close,volume.');
 const grouped={};
 for(let i=0;i<lines.length;i++){
  const cells=lines[i].split(',').map(s=>s.trim().replace(/^"|"$/g,''));
  const sym=(cells[col.symbol]||'').toUpperCase(),row=i+2;
  if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(sym))throw Error('Invalid symbol at row '+row+'.');
  for(const k of ['open','high','low','close','volume'])if(!isNum(cells[col[k]]))throw Error('Invalid '+k+' at row '+row+'.');
  const t=timeMillis(cells[col.time]),b={time:t,open:Number(cells[col.open]),high:Number(cells[col.high]),low:Number(cells[col.low]),close:Number(cells[col.close]),volume:Number(cells[col.volume])};
  if(b.open<=0||b.high<=0||b.low<=0||b.close<=0||b.volume<0||b.high<b.low||b.high<Math.max(b.open,b.close)||b.low>Math.min(b.open,b.close))throw Error('OHLC/volume inconsistency at row '+row+'.');
  (grouped[sym]??=[]).push(b);
 }
 if(Object.keys(grouped).length>50)throw Error('Maximum 50 tickers per import.');
 for(const bars of Object.values(grouped)){bars.sort((a,b)=>a.time-b.time);for(let i=1;i<bars.length;i++)if(bars[i].time===bars[i-1].time)throw Error('Duplicate timestamps for a ticker.');}
 return grouped;
}
function ema(values,p){if(values.length<p)return null;let e=values.slice(0,p).reduce((a,b)=>a+b,0)/p;for(let i=p;i<values.length;i++)e+=(values[i]-e)*2/(p+1);return e;}
function rsi(values,p=14){
 if(values.length<=p)return null;
 let gain=0,loss=0;
 for(let i=1;i<=p;i++){const d=values[i]-values[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0);}
 gain/=p;loss/=p;
 for(let i=p+1;i<values.length;i++){const d=values[i]-values[i-1];gain=(gain*(p-1)+Math.max(d,0))/p;loss=(loss*(p-1)+Math.max(-d,0))/p;}
 if(loss===0)return gain===0?50:100;
 return 100-100/(1+gain/loss);
}
const nyDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
function sessionVWAP(bars){
 let total=0,qty=0;const latest=nyDay.format(bars.at(-1).time);
 for(let i=bars.length-1;i>=0;i--){const b=bars[i];if(nyDay.format(b.time)!==latest)break;total+=((b.high+b.low+b.close)/3)*b.volume;qty+=b.volume;}
 return qty>0?total/qty:null;
}
const round=(v,p=2)=>Number.isFinite(v)?Number(v.toFixed(p)):null;
function evaluateSymbol(symbol,bars,{now=Date.now(),staleAfterMinutes=10}={}){
 const count=bars?.length||0;
 if(count<40)return {symbol,count,state:'INSUFFICIENT',direction:null,score:0,reason:'Need at least 40 verified OHLCV bars.',metrics:null};
 const last=bars.at(-1),closes=bars.map(x=>x.close);
 const e9=ema(closes,9),e21=ema(closes,21),rv=rsi(closes),vwap=sessionVWAP(bars);
 const avgVol=bars.slice(-21,-1).reduce((sum,b)=>sum+b.volume,0)/20;
 const volumeMultiple=avgVol>0?last.volume/avgVol:null;
 const previous=bars.slice(-11,-1);
 const highBreak=last.close>Math.max(...previous.map(x=>x.high));
 const lowBreak=last.close<Math.min(...previous.map(x=>x.low));
 const bullish=last.close>e9&&e9>e21&&vwap!==null&&last.close>vwap&&rv>52&&rv<75;
 const bearish=last.close<e9&&e9<e21&&vwap!==null&&last.close<vwap&&rv<48&&rv>25;
 const direction=bullish?'CALL':bearish?'PUT':null;
 const breakout=bullish?highBreak:bearish?lowBreak:false;
 const volumeConfirmed=volumeMultiple!==null&&volumeMultiple>=1.2;
 const stale=last.time>now+60000||last.time<now-staleAfterMinutes*60000;
 const score=(direction?45:0)+(breakout?30:0)+(volumeConfirmed?25:0);
 const state=stale?'HISTORICAL':direction?(breakout&&volumeConfirmed?'TECHNICAL_WATCH':'WATCH'):'WAIT';
 const reason=stale?'Historical bars; not eligible for current entry alerts.':
  !direction?'Trend, VWAP and RSI do not agree.':breakout&&volumeConfirmed?'Momentum and breakout checks align; option-chain and risk confirmation still required.':
  'Trend watch only; breakout and volume confirmation are incomplete.';
 return {symbol,count,state,direction,score,reason,asOf:new Date(last.time).toISOString(),metrics:{
   close:round(last.close,4),ema9:round(e9,4),ema21:round(e21,4),vwap:round(vwap,4),rsi14:round(rv,1),
   volumeMultiple:round(volumeMultiple,2),breakout,volumeConfirmed}};
}
function rankOpportunities(grouped,opts={}){
 return Object.entries(grouped||{}).map(([symbol,bars])=>evaluateSymbol(symbol,bars,opts))
  .sort((a,b)=>b.score-a.score||(a.symbol<b.symbol?-1:1));
}


/*
 * OWNER-ONLY, OFFLINE PAPER OPTIONS REPLAY V1.
 * Uses imported timestamped underlying bars and option quotes; never fabricates quotes or fills.
 * Does NOT communicate with a brokerage. A quote is an estimate of executable liquidity,
 * not a guarantee of execution at the stop or limit. No tuning on unseen future data.
 */
const PAPER_DEFAULTS=Object.freeze({
 premiumBudget:350,startingCash:1500,maxDailyLoss:100,maxLossPerTrade:80,
 stopLossPct:20,takeProfitPct:30,trailActivatePct:15,trailDistancePct:10,
 maxSpreadPct:8,minVolume:100,minOI:250,deltaMin:0.30,deltaMax:0.75,
 maxTradesPerDay:3,maxConsecutiveLosses:2,cooldownMinutes:10,maxHoldMinutes:30,
 commissionPerContract:0.65,slippagePerShare:0.01,stopAfterDailyGoal:false,dailyGoal:50
});
const paperRound=value=>Math.round((value+Number.EPSILON)*100)/100;
const sessionParts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',weekday:'short'});
function marketTime(ms){
 const p=Object.fromEntries(sessionParts.formatToParts(new Date(ms)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return {day:p.year+'-'+p.month+'-'+p.day,minute:Number(p.hour)*60+Number(p.minute),weekday:p.weekday};
}
const paperNumber=(v,name,min,max)=>{
 const n=Number(v);
 if(!Number.isFinite(n)||n<min||n>max)throw Error('Invalid '+name+'; expected '+min+'–'+max+'.');
 return n;
};
function validatePaperRules(input={}){
 const base={...PAPER_DEFAULTS,...input},out={};
 for(const [key,limits] of Object.entries({
  premiumBudget:[1,50000],startingCash:[100,1000000],maxDailyLoss:[1,100000],
  maxLossPerTrade:[1,100000],stopLossPct:[1,95],takeProfitPct:[1,1000],
  trailActivatePct:[1,1000],trailDistancePct:[1,95],maxSpreadPct:[0.1,100],
  minVolume:[0,1000000],minOI:[0,10000000],deltaMin:[0.05,1],deltaMax:[0.05,1],
  maxTradesPerDay:[1,30],maxConsecutiveLosses:[1,20],cooldownMinutes:[0,1440],
  maxHoldMinutes:[1,1440],commissionPerContract:[0,20],slippagePerShare:[0,1],
  dailyGoal:[0,100000]
 }))out[key]=paperNumber(base[key],key,limits[0],limits[1]);
 if(out.deltaMin>=out.deltaMax)throw Error('Delta minimum must be below maximum.');
 out.stopAfterDailyGoal=base.stopAfterDailyGoal===true;
 return out;
}
function parseOptionQuotesCsv(source){
 if(typeof source!=='string'||!source.trim())throw Error('Choose option quote snapshots CSV.');
 const lines=source.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(x=>x.trim());
 if(lines.length<2||lines.length>20001)throw Error('Options CSV needs 1–20,000 data rows.');
 const names=lines.shift().split(',').map(x=>x.trim().replace(/^"|"$/g,'').toLowerCase());
 const ix=(...aliases)=>names.findIndex(n=>aliases.includes(n));
 const cols={symbol:ix('symbol','underlying','ticker'),contract:ix('contract','contractsymbol','optionsymbol'),time:ix('time','timestamp','datetime'),expiration:ix('expiration','expiry'),strike:ix('strike'),side:ix('side','putcall','type'),bid:ix('bid'),ask:ix('ask'),delta:ix('delta'),volume:ix('volume','vol'),openInterest:ix('openinterest','open_interest','oi')};
 if(Object.values(cols).some(x=>x<0))throw Error('Columns required: symbol,contract,time,expiration,strike,side,bid,ask,delta,volume,openInterest.');
 const output=[],seen=new Set();
 for(let i=0;i<lines.length;i++){
  const data=lines[i].split(',').map(x=>x.trim().replace(/^"|"$/g,''));
  const get=k=>data[cols[k]],symbol=String(get('symbol')||'').toUpperCase(),contract=String(get('contract')||''),s=String(get('side')||'').trim().toUpperCase(),row=i+2;
  if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))throw Error('Bad underlying ticker on row '+row+'.');
  if(!/^[A-Za-z0-9 .:_-]{2,90}$/.test(contract))throw Error('Bad option contract on row '+row+'.');
  const side=s==='C'||s==='CALL'?'CALL':s==='P'||s==='PUT'?'PUT':null;
  if(!side)throw Error('Side must be CALL or PUT on row '+row+'.');
  const expiration=get('expiration');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(expiration)||!Number.isFinite(Date.parse(expiration+'T00:00:00Z')))throw Error('Expiration must be YYYY-MM-DD on row '+row+'.');
  const time=timeMillis(get('time'));
  if(!Number.isFinite(time))throw Error('Bad quote time at row '+row+'.');
  const strike=paperNumber(get('strike'),'strike row '+row,0.01,100000),bid=paperNumber(get('bid'),'bid row '+row,0,100000),ask=paperNumber(get('ask'),'ask row '+row,0.001,100000),delta=paperNumber(get('delta'),'delta row '+row,-1,1),volume=paperNumber(get('volume'),'volume row '+row,0,100000000),openInterest=paperNumber(get('openInterest'),'openInterest row '+row,0,100000000);
  if(bid>ask)throw Error('Bid exceeds ask on row '+row+'.');
  if(expiration<marketTime(time).day)throw Error('Option is expired at quote time on row '+row+'.');
  const id=contract+'|'+time;
  if(seen.has(id))throw Error('Duplicate contract/time quote on row '+row+'.');
  seen.add(id);
  output.push({symbol,contract,time,expiration,strike,side,bid,ask,delta,volume,openInterest});
 }
 return output.sort((a,b)=>a.time-b.time||a.contract.localeCompare(b.contract));
}
const remainingBars=(groups,symbol,asOf,indices)=>{
 const all=groups[symbol]||[];if(!all.length)return [];
 let i=indices.get(symbol)??0;
 while(i<all.length&&all[i].time<=asOf)i++;
 indices.set(symbol,i);
 return all.slice(0,i);
};
const recordBlock=(counts,reason)=>{counts[reason]=(counts[reason]||0)+1;};
function eligiblePaperQuote(q,rules){
 if(!q||!Number.isFinite(q.bid)||!Number.isFinite(q.ask)||q.ask<=0||q.bid<0||q.bid>q.ask)return 'INVALID_QUOTE';
 if(q.ask*100+rules.slippagePerShare*100+rules.commissionPerContract>rules.premiumBudget)return 'PREMIUM_ABOVE_BUDGET';
 if((q.ask-q.bid)/q.ask*100>rules.maxSpreadPct)return 'SPREAD_TOO_WIDE';
 if(Math.abs(q.delta)<rules.deltaMin||Math.abs(q.delta)>rules.deltaMax)return 'DELTA_OUT_OF_RANGE';
 if(q.volume<rules.minVolume||q.openInterest<rules.minOI)return 'LOW_OPTION_LIQUIDITY';
 const entryCost=(q.ask+rules.slippagePerShare)*100+rules.commissionPerContract;
 const riskAtStop=(q.ask+rules.slippagePerShare)*100*(rules.stopLossPct/100)+rules.commissionPerContract*2+rules.slippagePerShare*100;
 if(riskAtStop>rules.maxLossPerTrade)return 'PER_TRADE_RISK_CAP';
 return null;
}
function replayPaperOptions(groups,quotes,config={}){
 const rules=validatePaperRules(config);
 if(!Array.isArray(quotes)||!quotes.length)throw Error('Import actual timestamped option quotes before running a paper replay.');
 if(!groups||!Object.keys(groups).length)throw Error('Import the matching real underlying OHLCV bars before running a paper replay.');
 const sorted=[...quotes].sort((a,b)=>a.time-b.time||a.contract.localeCompare(b.contract));
 const indices=new Map(),cached=new Map(),trades=[],blocked={},usedCandle=new Set(),daily=new Map();
 let cash=rules.startingCash,open=null,lastExitMs=-Infinity,peakCash=cash,maxDrawdown=0;
 const dayState=day=>{if(!daily.has(day))daily.set(day,{trades:0,realized:0,consecutiveLosses:0});return daily.get(day)};
 const evaluate=(symbol,time)=>{
  const b=remainingBars(groups,symbol,time,indices);
  if(b.length<40)return null;
  const last=b.at(-1);
  if(time-last.time>10*60000||time<last.time)return null;
  const saved=cached.get(symbol);
  if(saved?.barTime===last.time)return saved.report;
  const report=evaluateSymbol(symbol,b,{now:last.time,staleAfterMinutes:10});
  cached.set(symbol,{barTime:last.time,report});
  return report;
 };
 const close=(q,reason)=>{
  if(!open)return;
  if(q.bid<=0){recordBlock(blocked,'EXIT_UNAVAILABLE_ZERO_BID');return;}
  const exitFill=Math.max(0,q.bid-rules.slippagePerShare);
  const exitCredit=exitFill*100-rules.commissionPerContract;
  const pnl=paperRound(exitCredit-open.entryCost);
  cash=paperRound(cash+exitCredit);
  const day=marketTime(q.time).day,dayInfo=dayState(day);
  dayInfo.realized=paperRound(dayInfo.realized+pnl);
  dayInfo.consecutiveLosses=pnl<0?dayInfo.consecutiveLosses+1:0;
  peakCash=Math.max(peakCash,cash);
  maxDrawdown=Math.max(maxDrawdown,peakCash-cash);
  trades.push({...open,exitTime:new Date(q.time).toISOString(),exitBid:q.bid,exitFill:paperRound(exitFill),exitCredit:paperRound(exitCredit),pnl,returnPct:paperRound(pnl/open.entryCost*100),exitReason:reason,holdingMinutes:paperRound((q.time-open.entryMs)/60000)});
  lastExitMs=q.time;open=null;
 };
 let i=0;
 while(i<sorted.length){
  const currentTime=sorted[i].time,window=[];
  while(i<sorted.length&&sorted[i].time===currentTime)window.push(sorted[i++]);
  const session=marketTime(currentTime);
  const activeQuote=open?window.find(q=>q.contract===open.contract):null;
  let exited=false;
  if(open&&activeQuote){
   const pos=open;
   if(activeQuote.bid>pos.bestBid)pos.bestBid=activeQuote.bid;
   const stop=pos.entryFill*(1-rules.stopLossPct/100),target=pos.entryFill*(1+rules.takeProfitPct/100);
   const activated=pos.bestBid>=pos.entryFill*(1+rules.trailActivatePct/100);
   const trail=activated?pos.bestBid*(1-rules.trailDistancePct/100):-Infinity;
   const age=(currentTime-pos.entryMs)/60000;
   const reason=session.day!==pos.entryDay?'OVERNIGHT_GAP_EXIT':
    session.minute>=15*60+55?'SESSION_CUTOFF':
    activeQuote.bid<=stop?'STOP_LOSS':
    activeQuote.bid>=target?'TAKE_PROFIT':
    activated&&activeQuote.bid<=trail?'TRAILING_STOP':
    age>=rules.maxHoldMinutes?'MAX_HOLD_TIME':null;
   if(reason){close(activeQuote,reason);exited=!open;}
  }
  if(open||exited)continue;
  if(session.weekday==='Sat'||session.weekday==='Sun'||session.minute<9*60+35||session.minute>=15*60+45){recordBlock(blocked,'OUTSIDE_ENTRY_SESSION');continue;}
  const dayInfo=dayState(session.day);
  if(dayInfo.trades>=rules.maxTradesPerDay){recordBlock(blocked,'MAX_TRADES_PER_DAY');continue;}
  if(dayInfo.realized<=-rules.maxDailyLoss){recordBlock(blocked,'DAILY_LOSS_LOCK');continue;}
  if(dayInfo.consecutiveLosses>=rules.maxConsecutiveLosses){recordBlock(blocked,'LOSS_STREAK_LOCK');continue;}
  if(rules.stopAfterDailyGoal&&dayInfo.realized>=rules.dailyGoal){recordBlock(blocked,'DAILY_GOAL_REACHED');continue;}
  if(currentTime-lastExitMs<rules.cooldownMinutes*60000){recordBlock(blocked,'COOLDOWN');continue;}
  const candidates=[];
  for(const q of window){
   const signal=evaluate(q.symbol,currentTime);
   if(!signal||signal.state!=='TECHNICAL_WATCH'||signal.direction!==q.side){recordBlock(blocked,'NO_CONFIRMED_TECHNICAL_WATCH');continue;}
   const currentBars=groups[q.symbol]||[];
   const idx=indices.get(q.symbol)||0,bar=currentBars[idx-1];
   const candleKey=q.symbol+'|'+(bar?.time??'');
   if(usedCandle.has(candleKey)){recordBlock(blocked,'SIGNAL_ALREADY_TRADED');continue;}
   const reason=eligiblePaperQuote(q,rules);
   if(reason){recordBlock(blocked,reason);continue;}
   const entryFill=q.ask+rules.slippagePerShare,entryCost=entryFill*100+rules.commissionPerContract;
   if(cash<entryCost){recordBlock(blocked,'INSUFFICIENT_PAPER_CASH');continue;}
   const estimatedStopRisk=entryFill*100*(rules.stopLossPct/100)+2*rules.commissionPerContract;
   if(dayInfo.realized-estimatedStopRisk<-rules.maxDailyLoss){recordBlock(blocked,'DAILY_LOSS_BUFFER');continue;}
   candidates.push({q,signal,entryFill,entryCost,candleKey});
  }
  candidates.sort((a,b)=>b.signal.score-a.signal.score||((a.q.ask-a.q.bid)/a.q.ask)-((b.q.ask-b.q.bid)/b.q.ask)||Math.abs(Math.abs(a.q.delta)-0.5)-Math.abs(Math.abs(b.q.delta)-0.5)||b.q.volume-a.q.volume);
  const best=candidates[0];
  if(!best)continue;
  const q=best.q;
  cash=paperRound(cash-best.entryCost);
  open={symbol:q.symbol,contract:q.contract,expiration:q.expiration,strike:q.strike,side:q.side,
   entryTime:new Date(currentTime).toISOString(),entryMs:currentTime,entryDay:session.day,
   entryBid:q.bid,entryAsk:q.ask,entryFill:paperRound(best.entryFill),entryCost:paperRound(best.entryCost),
   delta:q.delta,volume:q.volume,openInterest:q.openInterest,technicalScore:best.signal.score,
   entryReason:best.signal.reason,bestBid:q.bid};
  dayInfo.trades++;usedCandle.add(best.candleKey);
 }
 let marked=null;
 if(open){
  const lastQuote=[...sorted].reverse().find(q=>q.contract===open.contract&&q.time>=open.entryMs);
  if(lastQuote)marked={asOf:new Date(lastQuote.time).toISOString(),lastBid:lastQuote.bid,estimatedLiquidationPnl:lastQuote.bid>0?paperRound((Math.max(0,lastQuote.bid-rules.slippagePerShare)*100-rules.commissionPerContract)-open.entryCost):null,note:lastQuote.bid>0?'Bid-based paper mark, not a confirmed or guaranteed fill.':'No bid: no assumed executable exit. Actual premium is at risk.'};
 }
 const total=trades.reduce((sum,t)=>sum+t.pnl,0),wins=trades.filter(t=>t.pnl>0),losses=trades.filter(t=>t.pnl<0);
 const profitSum=wins.reduce((sum,t)=>sum+t.pnl,0),lossSum=losses.reduce((sum,t)=>sum+t.pnl,0);
 return {mode:'PAPER_REPLAY_ONLY',source:'USER_IMPORTED_UNVERIFIED_HISTORY',ordersEnabled:false,rules,
  summary:{startingCash:rules.startingCash,cashBalance:cash,realizedPnl:paperRound(total),closedTrades:trades.length,wins:wins.length,losses:losses.length,winRate:trades.length?paperRound(wins.length/trades.length*100):null,
  avgPnl:trades.length?paperRound(total/trades.length):null,profitFactor:lossSum<0?paperRound(profitSum/Math.abs(lossSum)):null,maxClosedCashDrawdown:paperRound(maxDrawdown),openPositions:open?1:0,quotesProcessed:sorted.length},
  trades,open,marked,blocked,days:Object.fromEntries(daily)};
}


function TradingOwnerPanel(){
 const [tab,setTab]=useState('paper'),[bars,setBars]=useState(null),[quotes,setQuotes]=useState(null);
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
 const controls=[['premiumBudget','Maximum option premium ($)',25],['startingCash','Starting paper cash ($)',100],['stopLossPct','Stop loss (%)',1],['takeProfitPct','Take profit (%)',5],['trailActivatePct','Activate trailing stop at gain (%)',1],['trailDistancePct','Trailing distance (%)',1],['maxDailyLoss','Daily loss limit ($)',10],['maxLossPerTrade','Maximum estimated risk per trade ($)',5],['maxTradesPerDay','Maximum trades per day',1],['maxConsecutiveLosses','Pause after losing streak',1],['cooldownMinutes','Cooldown (minutes)',5],['maxHoldMinutes','Maximum holding minutes',5]];
 return <section className="ica-owner-trading" style={{maxWidth:1250}}>
  <div style={{...bg,borderColor:'#278d84',background:'linear-gradient(120deg,#133a3d,#101c37)'}}>
   <p className="master-eyebrow">OWNER VERIFIED THROUGH ICA MASTER</p><h2 style={{fontSize:23,color:'#d5fff3',margin:'7px 0'}}>My Trading Platform</h2>
   <p style={{fontSize:13,lineHeight:1.65,color:'#b0c8d4'}}>Use your existing ICA Master email, password and Cloudflare Turnstile. This is your private market-research and Paper Money workspace. Schwab and live order execution are not connected.</p>
   <div style={{display:'flex',gap:9,flexWrap:'wrap',marginTop:18}}>
    {['paper','radar','roadmap'].map(t=><button key={t} type="button" onClick={()=>setTab(t)} style={{...button,background:tab===t?'#087f7c':'#142e45'}}>{t==='paper'?'Paper Money Lab':t==='radar'?'Opportunity Radar':'AI Trader Roadmap'}</button>)}
   </div>
  </div>
  {error&&<div className="master-error wide" role="alert">{error}</div>}
  {(tab==='paper'||tab==='radar')&&<div style={bg}>
   <h3 style={{fontSize:17,color:'#dff7fe',margin:'0 0 12px'}}>Import actual historical market data</h3>
   <p style={{fontSize:12,lineHeight:1.65,color:'#a2bbc8'}}>No fabricated quotes or trades. Historical bars must contain real timestamped OHLCV values. Option quote snapshots must include actual bid, ask, delta, volume and open interest.</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(225px,1fr))',gap:14}}>
    <label style={label}>Underlying OHLCV bars CSV<input style={field} type="file" accept=".csv,text/csv" onChange={e=>upload(e,'bars')}/><small>{names.bars||'symbol,time,open,high,low,close,volume'}</small></label>
    {tab==='paper'&&<label style={label}>Option quote timeline CSV<input style={field} type="file" accept=".csv,text/csv" onChange={e=>upload(e,'quotes')}/><small>{names.quotes||'symbol,contract,time,expiration,strike,side,bid,ask,delta,volume,openInterest'}</small></label>}
   </div>
  </div>}
  {tab==='paper'&&<div style={bg}>
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
  {tab==='roadmap'&&<div style={bg}><h3 style={{color:'#d9fff4'}}>AI trading system — paper first</h3><p style={{fontSize:13,color:'#b2cad6',lineHeight:1.7}}>First, use historical data and paper fills to test the stop-loss and gain rules. Next, connect approved Schwab real-time data, scan the market and run a live paper brokerage simulator. Only after extensive forward testing, safety validation and your explicit approval will we consider real orders. AI explanations will never bypass hard risk limits.</p><p style={{fontSize:12,color:'#cbdce6'}}>The original separately protected owner console remains available as a backup while we verify this ICA Master entrance.</p><a href="https://trading-platform-owner.ryanedavis.workers.dev/" target="_blank" rel="noreferrer" style={{color:'#7de3d8',fontSize:12}}>Alternate Owner Console (Cloudflare email-code login)</a></div>}
  <p style={{fontSize:12,color:'#86a5b6'}}>Your latest paper session is stored in this browser only. Saved sessions: {journal.length}. No actual financial data, orders, API credentials or account balances are exposed by this panel.</p>
 </section>
}
export default TradingOwnerPanel;
