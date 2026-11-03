// Artificial unit-test fixtures only; never served as market data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOptionQuotesCsv,replayPaperOptions,validatePaperRules,evaluateSymbol} from './trading-paper-engine.js';

const start=Date.parse('2026-11-03T14:30:00Z');
const bars=Array.from({length:52},(_,i)=>{
 const close=100+i*.025+Math.sin(i*.8)*.15+(i===51?.2:0);
 return {time:start+i*60000,open:close-.06,high:close+.09,low:close-.1,close,volume:i===51?2300:1000};
});
const entryTime=start+51*60000;
const q=(time,bid,ask,extra={})=>({
 symbol:'SPY',contract:'SPY 261103C00100000',time,expiration:'2026-11-03',
 strike:100,side:'CALL',bid,ask,delta:.52,volume:1000,openInterest:2000,...extra
});
const run=(quotes,options)=>replayPaperOptions({SPY:bars},quotes,options);

test('technical watch is based on current real OHLCV bars',()=>{
 const s=evaluateSymbol('SPY',bars,{now:entryTime});
 assert.equal(s.state,'TECHNICAL_WATCH');
 assert.equal(s.direction,'CALL');
 assert.equal(s.score,100);
});

test('a genuine later bid above the profit target exits paper position',()=>{
 const r=run([q(entryTime,1.97,2),q(entryTime+60000,2.75,2.80)]);
 assert.equal(r.trades.length,1);
 assert.equal(r.trades[0].exitReason,'TAKE_PROFIT');
 assert.equal(r.trades[0].pnl,71.7);
 assert.equal(r.ordersEnabled,false);
});

test('stop is evaluated on option bid; falling through it can cause worse loss',()=>{
 const r=run([q(entryTime,1.97,2),q(entryTime+60000,1.15,1.20)]);
 assert.equal(r.trades[0].exitReason,'STOP_LOSS');
 assert.ok(r.trades[0].pnl<-40);
 assert.notEqual(r.trades[0].exitFill,1.6);
});

test('trailing stop locks gain only after a genuine later bid advances',()=>{
 const r=run([q(entryTime,1.97,2),q(entryTime+60000,2.46,2.50),q(entryTime+120000,2.21,2.25)]);
 assert.equal(r.trades.length,1);
 assert.equal(r.trades[0].exitReason,'TRAILING_STOP');
 assert.ok(r.trades[0].pnl>0);
});

test('no bid means no assumed exit fill',()=>{
 const r=run([q(entryTime,1.97,2),q(entryTime+60000,0,2)]);
 assert.equal(r.trades.length,0);
 assert.equal(r.open?.contract,'SPY 261103C00100000');
 assert.equal(r.marked?.estimatedLiquidationPnl,null);
 assert.equal(r.blocked.EXIT_UNAVAILABLE_ZERO_BID,1);
});

test('a wide bid/ask spread blocks the entry even when the signal is good',()=>{
 const r=run([q(entryTime,1.40,2)]);
 assert.equal(r.trades.length,0);
 assert.equal(r.blocked.SPREAD_TOO_WIDE,1);
});

test('an option quote cannot enter before the technical confirmation bar exists',()=>{
 const r=run([q(entryTime-60000,1.97,2)]);
 assert.equal(r.trades.length,0);
 assert.equal(r.blocked.NO_CONFIRMED_TECHNICAL_WATCH,1);
});

test('zero trades for unaffordable contracts; the daily target never forces entries',()=>{
 const r=run([q(entryTime,1.97,2)],{premiumBudget:150,dailyGoal:1000});
 assert.equal(r.trades.length,0);
 assert.equal(r.blocked.PREMIUM_ABOVE_BUDGET,1);
});

test('valid imported bid/ask timeline contains no fake outcome',()=>{
 const csv='symbol,contract,time,expiration,strike,side,bid,ask,delta,volume,openInterest\n'+
 'SPY,SPY 261103C00100000,2026-11-03T15:21:00Z,2026-11-03,100,CALL,1.97,2.00,0.52,1000,2000\n'+
 'SPY,SPY 261103C00100000,2026-11-03T15:22:00Z,2026-11-03,100,CALL,2.75,2.80,0.52,1000,2000';
 const parsed=parseOptionQuotesCsv(csv);
 assert.equal(parsed.length,2);
 const r=run(parsed);
 assert.equal(r.trades[0].exitReason,'TAKE_PROFIT');
});

test('invalid or unsafe inputs fail closed',()=>{
 assert.throws(()=>validatePaperRules({stopLossPct:0}),/stopLossPct/);
 assert.throws(()=>validatePaperRules({deltaMin:.8,deltaMax:.2}),/Delta/);
 assert.throws(()=>parseOptionQuotesCsv('symbol,contract,time,expiration,strike,side,bid,ask,delta,volume,openInterest\nSPY,SPY 261103C00100000,2026-11-03T15:21:00Z,2026-11-03,100,CALL,2.10,2.00,0.52,1000,2000'),/Bid exceeds ask/);
});


test('daily goal blocks subsequent entries after a profitable exit',()=>{
 const r=run([q(entryTime,1.97,2),q(entryTime+60000,2.75,2.80),q(entryTime+120000,1.97,2)],{stopAfterDailyGoal:true,dailyGoal:50,cooldownMinutes:0});
 assert.equal(r.trades.length,1);
 assert.equal(r.open,null);
 assert.equal(r.blocked.DAILY_GOAL_REACHED,1);
});
test('daily loss lock blocks new entries after a stop gaps through the limit',()=>{
 const r=run([q(entryTime,1.97,2),q(entryTime+60000,.5,.55),q(entryTime+120000,1.97,2)],{maxDailyLoss:100,cooldownMinutes:0});
 assert.equal(r.trades.length,1);
 assert.equal(r.trades[0].exitReason,'STOP_LOSS');
 assert.equal(r.open,null);
 assert.equal(r.blocked.DAILY_LOSS_LOCK,1);
});
test('daily loss buffer includes fees and exit slippage',()=>{
 const r=run([q(entryTime,1.97,2)],{maxDailyLoss:42});
 assert.equal(r.open,null);
 assert.equal(r.blocked.DAILY_LOSS_BUFFER,1);
});
test('trade and loss-streak limits must be integers',()=>{
 assert.throws(()=>validatePaperRules({maxTradesPerDay:1.5}),/whole number/);
 assert.throws(()=>validatePaperRules({maxConsecutiveLosses:1.5}),/whole number/);
});
