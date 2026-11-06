import {marketTime} from '../src/master/trading-paper-engine.js';
import {paperSessionOpen} from '../src/master/paper-session-clock.js';
import {paperLimitMeetsPrice} from '../src/master/paper-limit-orders.js';
import {enterPaperPosition} from '../src/master/paper-portfolio.js';
import {schwabContractQuote} from './schwab-connection.js';
import {schwabQuoteFreshness} from '../src/master/schwab-quote-freshness.js';

export function paperLimitOrders(s){
 if(!Array.isArray(s.paperLimitOrders))s.paperLimitOrders=[];
 return s.paperLimitOrders;
}
export function finalizePaperLimit(s,order,alert,status,reason,event){
 order.status=status;order.lastStatus=reason;order.closedAt=Date.now();
 if(alert?.status==='LIMIT_WAITING')
  alert.status=status==='FILLED'?'TAKEN':status==='EXPIRED'?'LIMIT_EXPIRED':'LIMIT_'+status;
 event(s,'PAPER LIMIT '+status+': '+order.contractSymbol+' · '+reason);
}
export function cancelPaperLimits(s,reason,event){
 for(const order of paperLimitOrders(s)){
  if(order.status!=='WAITING')continue;
  const a=(s.alerts||[]).find(a=>a.id===order.alertId);
  finalizePaperLimit(s,order,a,'CANCELLED',reason,event);
 }
}

/** All simulated limit buys are checked by the SAME server-side coordinator.
 * A limit is NOT an exchange-resting broker order. Transient ask touches may
 * be missed between actual quote polls. No real trading capability. */
export async function processRestingPaperLimits({
 env,owner,s,verifySetup,quoteQuality,premiumBudget,stopLossPct,event
}){
 const orders=paperLimitOrders(s),summary={checked:0,filled:0,expired:0,held:0};
 for(const order of orders.filter(o=>o.status==='WAITING')){
  const alert=(s.alerts||[]).find(a=>a.id===order.alertId),now=Date.now();
  const finish=(status,message)=>{
   finalizePaperLimit(s,order,alert,status,message,event);
   if(status==='FILLED')summary.filled++;
   else if(status==='EXPIRED')summary.expired++;
  };
  if(now>=order.expires){
   finish('EXPIRED','Price did not qualify before the limit or confirmed setup expired.');continue;
  }
  if(!s.enabled){finish('CANCELLED','Scanner paused before paper entry.');continue}
  if(!paperSessionOpen(marketTime(now))){
   finish('EXPIRED','Outside regular paper trading session.');continue;
  }
  if(!alert||alert.status!=='LIMIT_WAITING'||alert.contract?.symbol!==order.contractSymbol){
   finish('CANCELLED','Original paper alert no longer available.');continue;
  }
  if(s.paper.positions.some(p=>p.id===alert.id)){
   finish('FILLED','Already present in Open Paper Trades.');continue;
  }
  order.checks=(order.checks||0)+1;order.lastCheckedAt=now;summary.checked++;
  try{
   // A live bid/ask is essential: never use LAST, MID, chart prices or a
   // synthetic quote to decide whether a paper order should fill.
   const quote={...alert.contract,...await schwabContractQuote(env,owner,order.contractSymbol)};
   const fresh=()=>schwabQuoteFreshness({...quote,realtime:true},Date.now(),10000).code==='VERIFIED_FRESH';
   if(!fresh()){order.lastStatus='WAITING_FRESH_SCHWAB_QUOTE';summary.held++;continue}
   order.lastAsk=quote.ask;order.lastBid=quote.bid;order.lastQuoteAt=quote.quoteTime;
   if(!paperLimitMeetsPrice(quote.ask,order.maxAsk)){
    order.lastStatus='WAITING_FOR_ASK_AT_OR_BELOW_LIMIT';summary.held++;continue;
   }
   const quality=quoteQuality(quote,premiumBudget);
   if(quality){order.lastStatus='RISK_OR_SPREAD_HOLD: '+quality;summary.held++;continue}
   try{await verifySetup(env,owner,alert,Date.now())}
   catch(error){
    const reason=String(error?.message||'Price-action verification failed.');
    if(/expired|invalidated|changed|insufficient price reward\/risk|extended beyond/i.test(reason)){
     finish('INVALIDATED','Original price-action setup was invalidated or expired: '+reason);
    }else{
     order.lastStatus='WAITING_UNDERLYING_VERIFICATION: '+reason.slice(0,100);summary.held++;
    }
    continue;
   }
   // Underlying validation may take time; no fills on an expired order or a
   // quote that became stale during this independent provider check.
   if(Date.now()>=order.expires){finish('EXPIRED','Limit expired during quote recheck.');continue}
   if(!fresh()){order.lastStatus='WAITING_FRESH_SCHWAB_QUOTE';summary.held++;continue}
   if(!paperLimitMeetsPrice(quote.ask,order.maxAsk)||!paperSessionOpen(marketTime(Date.now()))){
    order.lastStatus='WAITING_VALID_ENTRY';summary.held++;continue;
   }
   enterPaperPosition(s,alert,quote,{maxPremium:premiumBudget,stopLossPct,quantity:order.quantity??1});
   order.filledAsk=quote.ask;order.filledAt=Date.now();
   finish('FILLED','Simulated buy at observed ask $'+quote.ask.toFixed(2)+
    ' (owner limit $'+order.maxAsk.toFixed(2)+').');
  }catch(error){
   const reason=String(error?.message||'Cannot check resting limit.');
   if(/insufficient paper cash|paper max|premium above budget|nonstandard|expired option|per trade risk|daily/i.test(reason))
    finish('REJECTED','Simulated paper buying-power/risk check: '+reason);
   else {order.lastStatus='QUOTE_UNAVAILABLE: '+reason.slice(0,100);summary.held++}
  }
 }
 const waiting=orders.filter(o=>o.status==='WAITING');
 s.paperLimitOrders=[...waiting,...orders.filter(o=>o.status!=='WAITING').slice(-25)];
 return summary;
}
