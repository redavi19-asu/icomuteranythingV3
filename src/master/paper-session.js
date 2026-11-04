import {PAPER_DEFAULTS,eligiblePaperQuote,marketTime} from './trading-paper-engine.js';
export const paperRules={...PAPER_DEFAULTS,stopAfterDailyGoal:true};
export const paperDailyGoal=(value)=>Number.isFinite(value)&&value>=10&&value<=500?value:50;
export const newPaper=()=>({version:1,cash:1500,realized:0,position:null,trades:[],day:'',dayPnl:0,dayTrades:0});
const round=x=>Math.round(x*100)/100;
export function stepPaper(state,{quote,enter=false,close=false,maxPremium=paperRules.premiumBudget,dailyGoal=50,now=Date.now()}){
 const s=structuredClone(state),session=marketTime(now);
 if(s.day!==session.day){s.day=session.day;s.dayPnl=0;s.dayTrades=0}
 if(!quote||!Number.isFinite(quote.quoteTime)||now-quote.quoteTime>60000||quote.quoteTime>now+5000)throw Error('Waiting for a fresh contract quote.');
 if(!Number.isFinite(quote.bid)||!Number.isFinite(quote.ask)||quote.bid<0||quote.ask<quote.bid)throw Error('Invalid contract market.');
 if(s.position){
  const p=s.position;if(p.symbol!==quote.symbol)throw Error('Waiting for the open contract quote.');
  p.bestBid=Math.max(p.bestBid,quote.bid);
  const reason=close?'MANUAL_CLOSE':quote.bid<=p.fill*0.8?'STOP_LOSS':quote.bid>=p.fill*1.3?'PROFIT_TARGET':p.bestBid>=p.fill*1.15&&quote.bid<=p.bestBid*0.9?'TRAILING_STOP':now-p.time>=30*60000?'MAX_HOLD':session.day!==p.day||session.minute>=955?'SESSION_END':null;
  if(reason){if(quote.bid<=0)throw Error('No positive bid available; simulated position remains open.');const credit=round(Math.max(0,quote.bid-0.01)*100-0.65),pnl=round(credit-p.cost);s.cash=round(s.cash+credit);s.realized=round(s.realized+pnl);s.dayPnl=round(s.dayPnl+pnl);s.trades.push({...p,exitTime:now,exitFill:quote.bid-0.01,pnl,reason});s.position=null}
 }else if(enter){
  if(['Sat','Sun'].includes(session.weekday)||session.minute<575||session.minute>=945)throw Error('Paper entries run 9:35 AM–3:45 PM ET on weekdays.');
  if(s.dayTrades>=3||s.dayPnl<=-100||s.dayPnl>=paperDailyGoal(dailyGoal))throw Error('Daily paper limit reached.');
  if(quote.nonStandard)throw Error('Nonstandard contracts are excluded.');
  if(![quote.delta,quote.volume,quote.openInterest].every(Number.isFinite))throw Error('Contract quality data is incomplete.');
  const blocked=eligiblePaperQuote(quote,{...paperRules,premiumBudget:maxPremium});if(blocked)throw Error(blocked.replaceAll('_',' '));
  const cost=round((quote.ask+0.01)*100+0.65);if(cost>s.cash)throw Error('Insufficient paper cash.');
  if(s.dayPnl-((quote.ask+0.01)*100*0.2+2*0.65+1)<-100)throw Error('Daily loss buffer exceeded.');
  s.cash=round(s.cash-cost);s.dayTrades++;s.position={...quote,fill:quote.ask+0.01,cost,time:now,day:session.day,bestBid:quote.bid};
 }
 return s;
}
