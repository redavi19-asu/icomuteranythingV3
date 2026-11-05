import test from 'node:test';
import assert from 'node:assert/strict';
import {newPaper,stepPaper} from './paper-session.js';
const now=Date.parse('2026-11-04T15:00:00Z');
const q={symbol:'TEST',underlying:'SPY',bid:1.95,ask:2,quoteTime:now,delta:0.5,volume:200,openInterest:500};
test('paper entry uses ask, slippage and commission without mutating input',()=>{const s=newPaper();const n=stepPaper(s,{quote:q,enter:true,now});assert.equal(n.cash,1298.35);assert.equal(s.cash,1500);assert.equal(n.position.cost,201.65)});
for(const [bid,reason] of [[1.5,'STOP_LOSS'],[2.7,'PROFIT_TARGET']])test(reason+' closes at bid less fees',()=>{let s=stepPaper(newPaper(),{quote:q,enter:true,now});s=stepPaper(s,{quote:{...q,bid,ask:bid+0.05},now});assert.equal(s.position,null);assert.equal(s.trades[0].reason,reason);assert.equal(s.cash,Math.round((1500+s.realized)*100)/100)});
test('stale quotes and zero bid cannot create fake exit fills',()=>{const s=stepPaper(newPaper(),{quote:q,enter:true,now});assert.throws(()=>stepPaper(s,{quote:q,close:true,now:now+61000}),/fresh/);assert.throws(()=>stepPaper(s,{quote:{...q,bid:0},close:true,now}),/positive bid/)});
test('trailing stop tracks peak and closes on retracement',()=>{let s=stepPaper(newPaper(),{quote:q,enter:true,now});s=stepPaper(s,{quote:{...q,bid:2.4,ask:2.45},now});s=stepPaper(s,{quote:{...q,bid:2.1,ask:2.15},now});assert.equal(s.trades[0].reason,'TRAILING_STOP')});
test('paper practice continues beyond old daily count and profit cutoffs',()=>{
 for(const dayPnl of [75.70,-150]){
  const initial={...newPaper(),day:'2026-11-04',dayTrades:8,dayPnl};
  const entered=stepPaper(initial,{quote:q,enter:true,now});
  assert.ok(entered.position);
  assert.equal(entered.dayTrades,9);
  assert.equal(entered.dayPnl,dayPnl);
  assert.equal(initial.position,null);
 }
});
test('incomplete quality still prevents paper entries',()=>{assert.throws(()=>stepPaper(newPaper(),{quote:{...q,delta:null},enter:true,now}),/incomplete/)});

test('classified intraday paper position can remain past 30 minutes while stop and market-close safeguards apply',()=>{
 const entered=stepPaper(newPaper(),{quote:q,enter:true,now});
 entered.position.maxHoldMinutes=390;
 const mid=now+31*60000,hold=stepPaper(entered,{quote:{...q,quoteTime:mid},now:mid});
 assert.ok(hold.position,'classified intraday hold should not close merely because 30 minutes elapsed');
 const closeTime=now+360*60000;
 const exited=stepPaper(hold,{quote:{...q,quoteTime:closeTime},now:closeTime});
 assert.equal(exited.position,null);assert.equal(exited.trades[0].reason,'SESSION_END');
});
test('normal scalp still obeys the original 30-minute protective maximum',()=>{
 const entered=stepPaper(newPaper(),{quote:q,enter:true,now});
 const then=now+31*60000;
 const exited=stepPaper(entered,{quote:{...q,quoteTime:then},now:then});
 assert.equal(exited.position,null);assert.equal(exited.trades[0].reason,'MAX_HOLD');
});
