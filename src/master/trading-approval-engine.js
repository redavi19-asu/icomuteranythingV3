/**
 * Private ICA approval engine: historical paper-only one-click entry and automatic exit.
 * Uses imported real bid/ask snapshots. No Schwab or actual broker order capability.
 */
import {evaluateSymbol,validatePaperRules,eligiblePaperQuote,marketTime} from './trading-paper-engine.js';
const money=n=>Math.round((n+Number.EPSILON)*100)/100;
const ms=s=>typeof s==='number'?s:Date.parse(s||'');
const idFor=q=>q.contract+'|'+q.time;
function safeSession(s={}){
 return {skippedIds:Array.isArray(s.skippedIds)?s.skippedIds.slice(0,500):[],trades:Array.isArray(s.trades)?s.trades.slice(0,100):[],open:s.open||null};
}
function findApprovalOpportunity(groups,quotes,inputRules={},inputSession={}){
 const rules=validatePaperRules(inputRules),session=safeSession(inputSession);
 if(session.open)return {candidate:null,reason:'Previous paper position still open. Import longer data or start a new practice session.'};
 if(!groups||!Object.keys(groups).length||!Array.isArray(quotes)||!quotes.length)return {candidate:null,reason:'Import historical stock bars and option quote CSV files above.'};
 const excluded=new Set([...session.skippedIds,...session.trades.map(t=>t.approvalId)]);
 const sorted=[...quotes].sort((a,b)=>a.time-b.time||a.contract.localeCompare(b.contract));
 const indices=new Map(),cached=new Map();
 for(const q of sorted){
  const id=idFor(q),clock=marketTime(q.time);
  if(excluded.has(id)||clock.weekday==='Sat'||clock.weekday==='Sun'||clock.minute<575||clock.minute>=945||q.expiration<clock.day)continue;
  const completed=session.trades.filter(t=>ms(t.exitTime)<=q.time);
  if(session.trades.some(t=>ms(t.entryTime)<=q.time&&ms(t.exitTime)>q.time))continue;
  const last=completed.at(-1);
  if(last&&q.time-ms(last.exitTime)<rules.cooldownMinutes*60000)continue;
  const today=completed.filter(t=>marketTime(ms(t.entryTime)).day===clock.day);
  if(today.length>=rules.maxTradesPerDay)continue;
  const dayPnl=today.reduce((n,t)=>n+t.pnl,0);
  if(dayPnl<=-rules.maxDailyLoss||(rules.stopAfterDailyGoal&&dayPnl>=rules.dailyGoal))continue;
  let streak=0;for(let i=today.length-1;i>=0&&today[i].pnl<0;i--)streak++;
  if(streak>=rules.maxConsecutiveLosses)continue;
  const source=groups[q.symbol];
  if(!Array.isArray(source)||source.length<40)continue;
  let i=indices.get(q.symbol)||0;
  while(i<source.length&&source[i].time<=q.time)i++;
  indices.set(q.symbol,i);
  if(i<40)continue;
  const lastBar=source[i-1];
  if(q.time-lastBar.time>600000)continue;
  const barId=q.symbol+'|'+lastBar.time;
  let signal=cached.get(barId);
  if(!signal){signal=evaluateSymbol(q.symbol,source.slice(0,i),{now:q.time,staleAfterMinutes:10});cached.set(barId,signal);}
  if(signal.state!=='TECHNICAL_WATCH'||signal.direction!==q.side)continue;
  if(today.some(t=>t.signalBarId===barId))continue;
  if(eligiblePaperQuote(q,rules))continue;
  const fill=q.ask+rules.slippagePerShare,cost=fill*100+rules.commissionPerContract;
  const balance=rules.startingCash+completed.reduce((sum,t)=>sum+t.pnl,0);
  if(cost>balance)continue;
  const stopRisk=fill*100*rules.stopLossPct/100+2*rules.commissionPerContract+rules.slippagePerShare*100;
  if(dayPnl-stopRisk < -rules.maxDailyLoss)continue;
  return {candidate:{
   id,symbol:q.symbol,contract:q.contract,expiration:q.expiration,strike:q.strike,side:q.side,
   time:q.time,asOf:new Date(q.time).toISOString(),bid:q.bid,ask:q.ask,delta:q.delta,
   volume:q.volume,openInterest:q.openInterest,entryFill:money(fill),entryCost:money(cost),
   estimatedStopRisk:money(stopRisk),spreadPct:money((q.ask-q.bid)/q.ask*100),
   technicalScore:signal.score,technicalReason:signal.reason,signalBarId:barId,
   stopBid:money(fill*(1-rules.stopLossPct/100)),targetBid:money(fill*(1+rules.takeProfitPct/100))
  },reason:null};
 }
 return {candidate:null,reason:'No qualified opportunity in the imported history. No trade.'};
}
function approvePaperOpportunity(groups,quotes,inputRules,candidateId,inputSession={}){
 const rules=validatePaperRules(inputRules);
 const chosen=findApprovalOpportunity(groups,quotes,rules,inputSession).candidate;
 if(!chosen||chosen.id!==candidateId)throw Error('Opportunity is no longer the next qualified paper setup.');
 const entryTime=chosen.time,day=marketTime(entryTime).day;
 const later=quotes.filter(q=>q.contract===chosen.contract&&q.time>entryTime).sort((a,b)=>a.time-b.time);
 let bestBid=chosen.bid,zeroBidAlerts=0;
 const base={
  mode:'HISTORICAL_PAPER_APPROVAL',approvalId:chosen.id,signalBarId:chosen.signalBarId,
  ordersSentToSchwab:false,symbol:chosen.symbol,contract:chosen.contract,
  expiration:chosen.expiration,strike:chosen.strike,side:chosen.side,quantity:1,
  entryTime:chosen.asOf,entryBid:chosen.bid,entryAsk:chosen.ask,
  entryFill:chosen.entryFill,entryCost:chosen.entryCost,
  stopLossPct:rules.stopLossPct,takeProfitPct:rules.takeProfitPct
 };
 for(const q of later){
  if(!Number.isFinite(q.bid)||!Number.isFinite(q.ask)||q.bid<0||q.bid>q.ask)continue;
  bestBid=Math.max(bestBid,q.bid);
  const trailingActive=bestBid>=chosen.entryFill*(1+rules.trailActivatePct/100);
  const trail=trailingActive?bestBid*(1-rules.trailDistancePct/100):-Infinity;
  const clock=marketTime(q.time);
  const reason=clock.day!==day?'OVERNIGHT_GAP_EXIT':
   clock.minute>=955?'SESSION_CUTOFF':
   q.bid<=chosen.entryFill*(1-rules.stopLossPct/100)?'STOP_LOSS':
   q.bid>=chosen.entryFill*(1+rules.takeProfitPct/100)?'TAKE_PROFIT':
   trailingActive&&q.bid<=trail?'TRAILING_STOP':
   q.time-entryTime>=rules.maxHoldMinutes*60000?'MAX_HOLD_TIME':null;
  if(!reason)continue;
  if(q.bid===0){zeroBidAlerts++;continue;}
  const fill=Math.max(0,q.bid-rules.slippagePerShare);
  const proceeds=fill*100-rules.commissionPerContract;
  const pnl=money(proceeds-chosen.entryCost);
  return {status:'CLOSED',trade:{
   ...base,exitTime:new Date(q.time).toISOString(),exitReason:reason,exitBid:q.bid,
   exitFill:money(fill),exitCredit:money(proceeds),pnl,
   returnPct:money(pnl/chosen.entryCost*100),holdingMinutes:money((q.time-entryTime)/60000),
   zeroBidAlerts
  },open:null};
 }
 const last=later.at(-1);
 return {status:'OPEN',trade:null,open:{
  ...base,status:'OPEN_AWAITING_EXIT_QUOTE',lastBid:last?.bid??null,
  lastQuoteTime:last?new Date(last.time).toISOString():null,
  estimatedMarkPnl:last&&last.bid>0?money((Math.max(0,last.bid-rules.slippagePerShare)*100-rules.commissionPerContract)-chosen.entryCost):null,
  note:'No later executable quote confirmed an exit. Nothing realized.',zeroBidAlerts
 }};
}
export {findApprovalOpportunity,approvePaperOpportunity};
