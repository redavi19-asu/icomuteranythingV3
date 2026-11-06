import {PAPER_DEFAULTS,eligiblePaperQuote,marketTime} from './trading-paper-engine.js';
import {expiryStatus,paperSessionOpen,paperExpirationCloseDue,PAPER_EXPIRY_EXIT_MINUTE} from './paper-session-clock.js';
export const paperRules={...PAPER_DEFAULTS,stopAfterDailyGoal:false};
export const PAPER_STOP_LOSS_CHOICES=Object.freeze([15,20,35,50]);
export const selectedStopLossPct=(value)=>PAPER_STOP_LOSS_CHOICES.includes(value)?value:20;
export const paperDailyGoal=(value)=>Number.isFinite(value)&&value>=10&&value<=500?value:50;
export const newPaper=()=>({version:1,cash:1500,realized:0,position:null,trades:[],day:'',dayPnl:0,dayTrades:0});
const round=x=>Math.round(x*100)/100;
/** Warnings are informational until the paper engine executes an exit.
 * Dismissing a banner cannot suspend any stop, trailing exit, or deadline. */
export function paperPositionExitWarnings(p,now=Date.now()){
 if(!p||p.closeRequested)return [];
 const warnings=[],session=marketTime(now),expiry=expiryStatus(p.expiration,session.day);
 const fresh=Number.isFinite(p.mark?.quoteTime)&&p.mark.quoteTime<=now&&
  now-p.mark.quoteTime<=30000;
 if(fresh&&Number.isFinite(p.fill)&&p.fill>0&&Number.isFinite(p.mark.bid)){
  const stop=selectedStopLossPct(p.stopLossPct);
  const stopBid=p.fill*(1-stop/100);
  if(p.mark.bid<=stopBid)
   warnings.push({type:'STOP_TRIGGERED',priority:'critical',actionable:false,
    message:'Stop level reached. Automatic exit is due; overriding is no longer available.',
    threshold:round(stopBid)});
  else if(p.mark.bid<=stopBid*1.08)
   warnings.push({type:'STOP_NEAR',priority:'warning',actionable:true,
    message:'Option bid is close to your '+stop+'% stop. The next fresh quote could trigger an exit.',
    threshold:round(stopBid)});
 }
 if(expiry!=='FUTURE'&&p.day===session.day&&Number.isFinite(p.time)){
  const minutes=Math.min(390,Math.max(1,Number(p.maxHoldMinutes)||30));
  const secondsLeft=Math.ceil((p.time+minutes*60000-now)/1000);
  if(secondsLeft<=300)
   warnings.push({type:'TIME_LIMIT',priority:secondsLeft<=0?'critical':'warning',
    actionable:secondsLeft>0,
    secondsLeft:Math.max(0,secondsLeft),maxHoldMinutes:minutes,
    message:secondsLeft<=0?'Timed scalp exit is due.':
     'Timed scalp closes in '+Math.ceil(secondsLeft/60)+' minute(s) unless you extend it.'});
 }
 if(expiry!=='FUTURE'&&session.minute>=950&&session.minute<955&&
   !['Sat','Sun'].includes(session.weekday))
  warnings.push({type:'EXPIRATION_CLOSE',priority:'critical',actionable:false,
   message:'Expiration-day mandatory 3:55 PM ET exit approaches. This safeguard cannot be overridden.'});
 return warnings;
}

export function stepPaper(state,{quote,enter=false,close=false,maxPremium=paperRules.premiumBudget,stopLossPct=paperRules.stopLossPct,dailyGoal=50,now=Date.now()}){
 const s=structuredClone(state),session=marketTime(now);
 if(s.day!==session.day){s.day=session.day;s.dayPnl=0;s.dayTrades=0}
 if(!quote||!Number.isFinite(quote.quoteTime)||now-quote.quoteTime>60000||quote.quoteTime>now+5000)throw Error('Waiting for a fresh contract quote.');
 if(!Number.isFinite(quote.bid)||!Number.isFinite(quote.ask)||quote.bid<0||quote.ask<quote.bid)throw Error('Invalid contract market.');
 if(s.position){
  const p=s.position;if(p.symbol!==quote.symbol)throw Error('Waiting for the open contract quote.');
  p.bestBid=Math.max(p.bestBid,quote.bid);
  // The stop is locked to the position at entry. Changing the dashboard
  // preference never silently widens a currently open paper trade.
  const stop=selectedStopLossPct(p.stopLossPct);
  const expiry=expiryStatus(p.expiration,session.day);
  // Only same-session, non-future-expiry scalps have the default 30-minute cap.
  // Later-expiring positions can carry overnight; their stop/target/trail rules
  // remain active and they must still close by 3:55 on expiration day.
  const timedScalp=expiry!=='FUTURE'&&p.day===session.day&&
   now-p.time>=Math.min(390,Math.max(1,Number(p.maxHoldMinutes)||30))*60000;
  const reason=close?'MANUAL_CLOSE':
   quote.bid<=p.fill*(1-stop/100)?'STOP_LOSS':
   quote.bid>=p.fill*1.3?'PROFIT_TARGET':
   p.bestBid>=p.fill*1.15&&quote.bid<=p.bestBid*0.9?'TRAILING_STOP':
   paperExpirationCloseDue(p.expiration,session)?'SESSION_END':
   timedScalp?'MAX_HOLD':null;
  if(reason){if(quote.bid<=0)throw Error('No positive bid available; simulated position remains open.');const credit=round(Math.max(0,quote.bid-0.01)*100-0.65),pnl=round(credit-p.cost);s.cash=round(s.cash+credit);s.realized=round(s.realized+pnl);s.dayPnl=round(s.dayPnl+pnl);s.trades.push({...p,exitTime:now,exitFill:quote.bid-0.01,pnl,reason});s.position=null}
 }else if(enter){
  if(!paperSessionOpen(session))throw Error('Paper entries run 9:30 AM–4:00 PM ET on regular market weekdays.');
  const contractExpiry=expiryStatus(quote.expiration,session.day);
  if(contractExpiry==='EXPIRED'||(session.minute>=PAPER_EXPIRY_EXIT_MINUTE&&contractExpiry!=='FUTURE'))
   throw Error('Same-day/unknown-expiration options cannot open after 3:55 PM ET.');
  // Paper practice has no daily trade-count, profit, or loss cutoffs.
  if(quote.nonStandard)throw Error('Nonstandard contracts are excluded.');
  if(![quote.delta,quote.volume,quote.openInterest].every(Number.isFinite))throw Error('Contract quality data is incomplete.');
  const blocked=eligiblePaperQuote(quote,{...paperRules,premiumBudget:maxPremium});if(blocked)throw Error(blocked.replaceAll('_',' '));
  const cost=round((quote.ask+0.01)*100+0.65);if(cost>s.cash)throw Error('Insufficient paper cash.');
  // Simulated cash, premium, liquidity and quote freshness still gate entries.
  if(!PAPER_STOP_LOSS_CHOICES.includes(stopLossPct))throw Error('Choose a supported paper stop loss: 15%, 20%, 35%, or 50%.');
  s.cash=round(s.cash-cost);s.dayTrades++;s.position={...quote,fill:quote.ask+0.01,cost,time:now,day:session.day,bestBid:quote.bid,stopLossPct};
 }
 return s;
}


/** Reconstruct today's realized P/L and persistent automatic-exit notices from
 *  settled trade history. No browser timer, transient alert or market-data
 *  call can erase an exit explanation; overnight rollover changes only the
 *  "today" subtotal, not the historical exit records. */
export function summarizePaperExits(trades,now=Date.now()){
 const history=Array.isArray(trades)?trades:[];
 const day=marketTime(now).day;
 const today=history.filter(t=>Number.isFinite(t?.exitTime)&&Number.isFinite(t?.pnl)&&marketTime(t.exitTime).day===day);
 const todayRealized=round(today.reduce((total,t)=>total+t.pnl,0));
 const reasonLabel={
  STOP_LOSS:'STOP LOSS TRIGGERED',
  PROFIT_TARGET:'PROFIT TARGET HIT',
  TRAILING_STOP:'TRAILING STOP TRIGGERED',
  MAX_HOLD:'MAXIMUM HOLD REACHED',
  SESSION_END:'SESSION CLOSE EXIT',
  OVERNIGHT_GAP_EXIT:'OVERNIGHT PROTECTION EXIT'
 };
 const automaticExits=history.filter(t=>t&&reasonLabel[t.reason]&&Number.isFinite(t.exitTime))
  .sort((a,b)=>b.exitTime-a.exitTime).slice(0,3)
  .map(t=>({id:t.id||t.symbol+'|'+t.exitTime,symbol:t.symbol,reason:t.reason,
   label:reasonLabel[t.reason],exitTime:t.exitTime,exitFill:t.exitFill,pnl:t.pnl}));
 return {todayRealized,todayTrades:today.length,automaticExits};
}
