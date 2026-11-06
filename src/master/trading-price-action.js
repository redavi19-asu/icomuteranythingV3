/**
 * ICA PRIME | PAPER ONLY | Price-action confirmation and opportunity window.
 *
 * No future candles, predicted prices, or user-defined probabilities.
 * "Breakout" means a completed, volume-confirmed 1m candle beyond the prior
 * 10 highs/lows. "Confirmed" requires a DIFFERENT, subsequently completed
 * candle closing beyond that SAME level while the trend still agrees.
 * A 6-minute window tolerates the 5-of-20 ticker scanner's 4-minute rotation.
 * These checks are on underlying prices; they NEVER alter option stop orders.
 */
import {evaluateSymbol,marketTime} from './trading-paper-engine.js';
import {confirmedSwing55} from './trading-swing-levels.js';

export const PRICE_ACTION_WINDOW_MS=6*60000;
const ROUND=x=>Number.isFinite(x)?Number(x.toFixed(4)):null;
const valid=b=>!!b&&[b.time,b.open,b.high,b.low,b.close,b.volume].every(Number.isFinite)&&
 b.time>0&&b.open>0&&b.close>0&&b.high>=Math.max(b.open,b.close)&&
 b.low<=Math.min(b.open,b.close)&&b.volume>=0;
const state=(status,reason,more={})=>({
 status,confirmed:false,hold:true,reason,source:'SCHWAB_COMPLETED_1M',
 breakoutBarTime:null,confirmationBarTime:null,direction:null,
 breakoutLevel:null,entryPrice:null,invalidation:null,atr1m:null,
 target:null,rewardRisk:null,windowMinutes:null,...more
});
const sign=side=>side==='CALL'?1:-1;

/** Realized 1-minute true-range proxy from candles preceding the breakout. */
function recentAtr(bars){
 if(bars.length<15)return null;
 const prior=bars.slice(-16);
 if(!prior.every(valid))return null;
 const ranges=prior.slice(1).map((b,i)=>Math.max(b.high-b.low,
  Math.abs(b.high-prior[i].close),Math.abs(b.low-prior[i].close)));
 const atr=ranges.reduce((sum,v)=>sum+v,0)/ranges.length;
 return atr>0&&Number.isFinite(atr)?atr:null;
}

/** Only genuine, already-confirmed 5/5 opposite pivots count as price targets.
 * An open-air trade has NO fabricated target, no fabricated R:R, and cannot
 * be represented as an R:R-qualified call. */
function nearestUnbrokenBarrier(bars,side,price,atr){
 const prior=bars.slice(-180);
 const pivots=confirmedSwing55(prior);
 const levels=side==='CALL'?pivots.highs:pivots.lows;
 const dir=sign(side);
 const viable=levels.filter(p=>{
  if(!(dir*(p.price-price)>0.1*atr))return false;
  // A pivot becomes observable only after five RIGHT-HAND candles close.
  if(p.confirmedAfter>bars.at(-1).time+60000)return false;
  // Levels already decisively crossed after confirmation aren't barriers.
  return !bars.some(b=>b.time>p.confirmedAfter&&
   dir*(b.close-p.price)>0.25*atr);
 });
 return viable.length?viable.sort((a,b)=>
  dir*(a.price-price)-dir*(b.price-price))[0].price:null;
}

/** Analyze completed, strictly increasing provider candles only. */
export function assessPriceAction(symbol,bars,{now=Date.now(),liveSignal=null}={}){
 if(!Array.isArray(bars)||bars.length<42||
    bars.slice(-20).some(b=>!valid(b))||
    bars.slice(-20).some((b,i,a)=>i>0&&b.time<=a[i-1].time))
  return state('UNASSESSED','Insufficient ordered, trustworthy completed 1-minute Schwab candles.');
 const last=bars.at(-1),current=liveSignal||evaluateSymbol(symbol,bars,{now,staleAfterMinutes:3});
 const session=marketTime(last.time);
 if(last.time+60000>now||now-last.time>3*60000||
    session.minute<570||session.minute>=960||['Sat','Sun'].includes(session.weekday)||
    current.state==='HISTORICAL')
  return state('BAR_NOT_CURRENT','Latest one-minute candle is unclosed, stale, or outside the regular market session.');
 let previousHold=null;
 for(let i=bars.length-2;i>=Math.max(39,bars.length-8);i--){
  const first=bars[i];
  if(last.time-first.time>PRICE_ACTION_WINDOW_MS)continue;
  const when=marketTime(first.time);
  if(when.day!==session.day||when.minute<570||when.minute>=960)continue;
  const breakout=evaluateSymbol(symbol,bars.slice(0,i+1),{
   now:first.time+60000,staleAfterMinutes:3});
  if(breakout.state!=='TECHNICAL_WATCH')continue;
  const dir=sign(breakout.direction),atr=recentAtr(bars.slice(0,i+1));
  if(!atr)continue;
  const reference=bars.slice(i-10,i);
  if(reference.length!==10||!reference.every(valid))continue;
  const level=breakout.direction==='CALL'?
   Math.max(...reference.map(b=>b.high)):Math.min(...reference.map(b=>b.low));
  const common={
   breakoutBarTime:first.time,confirmationBarTime:last.time,
   direction:breakout.direction,breakoutLevel:ROUND(level),
   atr1m:ROUND(atr),windowMinutes:ROUND((last.time-first.time)/60000),
   initialSignalScore:breakout.score
  };
  const subsequent=bars.slice(i+1),entry=last.close;
  // The original breakout must be followed by actual completed, trustworthy
  // candles, not a gap in the data or an unclosed streaming quote.
  if(subsequent.some((b,j)=>!valid(b)||
     b.time-(j?subsequent[j-1].time:first.time)>120000)){
   previousHold??=state('CANDLE_GAP','A missing interval prevents verifying the breakout follow-through.',common);
   continue;
  }
  // The initial breakout already qualified on strict RSI and volume.
  // A follow-through candle need only retain directional momentum; do not
  // reject an otherwise valid breakout just because RSI is very strong.
  const m=current.metrics||{};
  const directionalTrend=breakout.direction==='CALL'?
   m.close>m.ema9&&m.ema9>m.ema21&&m.close>m.vwap&&m.rsi14>52:
   m.close<m.ema9&&m.ema9<m.ema21&&m.close<m.vwap&&m.rsi14<48;
  if(!directionalTrend||current.state==='HISTORICAL'){
   previousHold??=state('TREND_LOST','Trend, VWAP, or RSI no longer confirms the breakout direction.',common);
   continue;
  }
  const failed=subsequent.slice(0,-1).some(b=>
   dir*(b.close-level)<-0.55*atr);
  if(failed){
   previousHold??=state('BREAKOUT_INVALIDATED','Price closed decisively back through the breakout level before confirmation.',common);
   continue;
  }
  if(dir*(entry-level)<0.08*atr||dir*(last.close-last.open)<-0.10*atr){
   previousHold??=state('WAIT_CLOSE_CONFIRMATION','Wait for a subsequent completed candle to close beyond the breakout level.',common);
   continue;
  }
  // Extension remains observable for diagnostics, not a hard entry veto.
  // The owner chooses whether an extended price is acceptable.
  const extension=dir*(entry-level)/atr;
  const retest=subsequent.some(b=>dir===1?
   b.low<=level+0.35*atr:b.high>=level-0.35*atr);
  const invalidation=level-dir*0.35*atr;
  const risk=dir*(entry-invalidation);
  if(!(risk>0)){
   previousHold??=state('INVALID_PRICE_RISK','No valid underlying-price invalidation level can be determined.',common);
   continue;
  }
  const target=nearestUnbrokenBarrier(bars,breakout.direction,entry,atr);
  const rr=target===null?null:dir*(target-entry)/risk;
  if(rr!==null&&rr<1.5){
   previousHold??=state('INSUFFICIENT_PRICE_ROOM','A confirmed opposing swing level leaves less than 1.5:1 underlying reward/risk.',{
    ...common,entryPrice:ROUND(entry),invalidation:ROUND(invalidation),
    target:ROUND(target),rewardRisk:ROUND(rr)});
   continue;
  }
  return {
   ...state(retest?'CONFIRMED_RETEST':'CONFIRMED_FOLLOW_THROUGH',
    retest?'Breakout level held a completed-candle retest and was reclaimed.':
     'A second completed candle closed beyond the original volume-backed breakout.'),
   ...common,confirmed:true,hold:false,entryPrice:ROUND(entry),
   invalidation:ROUND(invalidation),target:ROUND(target),rewardRisk:ROUND(rr),
   extensionAtr:ROUND(extension),
   // Do not invent a profit target if no opposing confirmed 5/5 pivot exists.
   targetStatus:target===null?'OPEN_AIR_UNASSESSED':'CONFIRMED_5_5_SWING',
   evidence:{initialBreakoutClose:first.close,initialVolumeMultiple:breakout.metrics?.volumeMultiple,
    confirmationClose:entry,retest,barCount:subsequent.length}
  };
 }
 if(previousHold)return previousHold;
 if(current.state==='TECHNICAL_WATCH')
  return state('WAIT_NEXT_CANDLE',
   'First volume-backed breakout is complete. Wait for a second, distinct candle to close beyond that level.');
 return state('NO_CONFIRMED_BREAKOUT',
  'No recent two-candle confirmed breakout within the six-minute opportunity window.');
}
