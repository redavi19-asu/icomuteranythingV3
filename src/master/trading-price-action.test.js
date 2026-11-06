import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSymbol} from './trading-paper-engine.js';
import {assessPriceAction,PRICE_ACTION_WINDOW_MS} from './trading-price-action.js';

const start=Date.parse('2026-11-05T14:30:00Z');
const bullish=()=>Array.from({length:52},(_,i)=>{
 const close=100+i*.025+Math.sin(i*.8)*.15+(i===51?.2:0);
 return {time:start+i*60000,open:close-.06,high:close+.09,low:close-.1,
  close,volume:i===51?2300:1000};
});
const next=(bars,{move=.035,extraMinutes=1,volume=1700}={})=>{
 const b=bars.at(-1),close=b.close+move;
 return [...bars,{time:b.time+extraMinutes*60000,open:close-Math.sign(move||1)*.04,
  high:Math.max(close,close-Math.sign(move||1)*.04)+.06,
  low:Math.min(close,close-Math.sign(move||1)*.04)-.06,
  close,volume}];
};
const bearish=()=>bullish().map(b=>({
 ...b,open:200-b.open,high:200-b.low,low:200-b.high,close:200-b.close
}));
const atClose=b=>b.at(-1).time+60000;

test('first volume-backed breakout candle is only a watch, NOT a paper opportunity',()=>{
 const b=bullish(),technical=evaluateSymbol('SPY',b,{now:atClose(b)});
 assert.equal(technical.state,'TECHNICAL_WATCH');
 const result=assessPriceAction('SPY',b,{now:atClose(b),liveSignal:technical});
 assert.equal(result.confirmed,false);
 assert.equal(result.status,'WAIT_NEXT_CANDLE');
});
test('second separately closed candle confirms CALL; no fabricated price target',()=>{
 const first=bullish(),b=next(first);
 const result=assessPriceAction('SPY',b,{now:atClose(b)});
 assert.equal(result.confirmed,true,JSON.stringify(result));
 assert.equal(result.hold,false);
 assert.equal(result.direction,'CALL');
 assert.ok(['CONFIRMED_FOLLOW_THROUGH','CONFIRMED_RETEST'].includes(result.status));
 assert.equal(result.breakoutBarTime,first.at(-1).time);
 assert.equal(result.confirmationBarTime,b.at(-1).time);
 assert.equal(result.target,null,'no verified opposing 5/5 resistance = no target');
 assert.equal(result.rewardRisk,null,'never fabricate the reward/risk');
 assert.equal(result.targetStatus,'OPEN_AIR_UNASSESSED');
});
test('mirrored completed bearish candles confirm a PUT, without looking ahead',()=>{
 const first=bearish(),b=next(first,{move:-.035});
 const s=assessPriceAction('SPY',b,{now:atClose(b)});
 assert.equal(s.confirmed,true,JSON.stringify(s));
 assert.equal(s.direction,'PUT');
 assert.equal(s.breakoutBarTime,first.at(-1).time);
 assert.ok(s.invalidation>s.entryPrice);
});
test('do not confirm second candle until it has actually closed',()=>{
 const b=next(bullish());
 const during=assessPriceAction('SPY',b,{now:b.at(-1).time+30000});
 assert.equal(during.confirmed,false);
 assert.equal(during.status,'BAR_NOT_CURRENT');
});
test('stale underlying and missing intervals cannot create a paper setup',()=>{
 const b=next(bullish());
 assert.equal(assessPriceAction('SPY',b,{now:atClose(b)+4*60000}).confirmed,false);
 assert.equal(assessPriceAction('SPY',next(bullish(),{extraMinutes:4}),{
  now:atClose(next(bullish(),{extraMinutes:4}))}).confirmed,false);
});
test('a reversal below the original breakout cannot be called successful confirmation',()=>{
 const b=next(bullish(),{move:-.40});
 const p=assessPriceAction('SPY',b,{now:atClose(b)});
 assert.equal(p.confirmed,false);
});
test('large follow-through moves do not qualify as fresh low-risk entries',()=>{
 const b=next(bullish(),{move:.80});
 const p=assessPriceAction('SPY',b,{now:atClose(b)});
 assert.equal(p.confirmed,false);
});
test('all scanning qualifications are bounded to a six-minute window',()=>{
 assert.equal(PRICE_ACTION_WINDOW_MS,360000);
 const b=next(bullish(),{move:.035,extraMinutes:8});
 assert.equal(assessPriceAction('SPY',b,{now:atClose(b)}).confirmed,false);
});
test('weekend candles cannot produce a paper setup even with bullish volume',()=>{
 const b=next(bullish()).map(x=>({...x,time:x.time+2*86400000}));
 assert.equal(assessPriceAction('SPY',b,{now:atClose(b)}).confirmed,false);
});

test('a confirmed nearby opposing 5/5 pivot blocks a poor underlying reward/risk entry',()=>{
 const b=next(bullish());
 // The earlier candle is a genuine 5-left / 5-right swing high, visible
 // before the final breakout. It sits barely above the current entry.
 b[25]={...b[25],high:b.at(-1).close+.07};
 const p=assessPriceAction('SPY',b,{now:atClose(b)});
 assert.equal(p.confirmed,false,'near resistance must not be approved blindly');
 assert.equal(p.status,'INSUFFICIENT_PRICE_ROOM',JSON.stringify(p));
 assert.ok(p.rewardRisk<1.5);
 assert.ok(p.target>p.entryPrice);
});
