import test from 'node:test';
import assert from 'node:assert/strict';
import {assessEntryChase} from './trading-entry-chase.js';

const start=Date.parse('2026-11-05T14:30:00Z');
const barsFrom=(closes,t0=start)=>closes.map((close,i)=>{
 const open=close+.01;
 return {time:t0+i*60_000,open,high:Math.max(open,close)+.08,
  low:Math.min(open,close)-.08,close,volume:1100};
});
const signal=(side,vwap,rsi=side==='PUT'?33:69)=>({
 state:'TECHNICAL_WATCH',direction:side,
 metrics:{vwap,rsi14:rsi,breakout:true,volumeConfirmed:true}
});
const fall=Array.from({length:126},(_,i)=>100-i*.06);
const rise=fall.map(v=>200-v);

test('do not chase an already-extended intraday PUT even when technical breakout is confirmed',()=>{
 const r=assessEntryChase(barsFrom(fall),signal('PUT',96,33));
 assert.equal(r.hold,true);
 assert.equal(r.status,'WAIT_FOR_BOUNCE');
 assert.ok(r.metrics.sessionMoveAtr>7.5);
 assert.match(r.reason,/bounce.*fresh bearish break/i);
});
test('symmetric filter prevents buying extended CALLS after a long rally',()=>{
 const r=assessEntryChase(barsFrom(rise),signal('CALL',104,69));
 assert.equal(r.hold,true);
 assert.equal(r.status,'WAIT_FOR_PULLBACK');
 assert.match(r.reason,/pullback.*bullish break/i);
});
test('a late-morning catalyst after a tight fresh base is not blocked just because of the clock',()=>{
 const trending=Array.from({length:110},(_,i)=>100-i*.055);
 const last=trending.at(-1),closes=[...trending,...Array(10).fill(last),last-.70];
 const r=assessEntryChase(barsFrom(closes),signal('PUT',97,33));
 assert.equal(r.hold,false);
 assert.equal(r.status,'FRESH_BASE_BREAKOUT');
 assert.equal(r.metrics.consolidation,true);
});
test('a genuine bounce followed by renewed breakdown permits the extended PUT',()=>{
 const lead=Array.from({length:110},(_,i)=>100-i*.05);
 const closes=[...lead,94.47,94.39,94.29,94.4,94.5,94.6,94.55,94.45,94.33,94.2,94.1];
 const r=assessEntryChase(barsFrom(closes),signal('PUT',97,33));
 assert.equal(r.hold,false);
 assert.equal(r.status,'RETEST_CONFIRMED');
 assert.equal(r.metrics.retest,true);
});
test('ordinary early/midday technical continuation is not rejected by a blanket 11 am limit',()=>{
 const base=Array.from({length:65},(_,i)=>100-i*.008);
 const r=assessEntryChase(barsFrom(base),signal('PUT',99.8,40));
 assert.equal(r.hold,false);
 assert.equal(r.status,'CLEAR');
});
test('insufficient current-session data does not invent a chase decision or prohibit all setups',()=>{
 const data=barsFrom(Array.from({length:41},(_,i)=>100-i*.03),Date.parse('2026-11-05T13:00:00Z'));
 const r=assessEntryChase(data,signal('PUT',99,38));
 assert.equal(r.hold,false);
 assert.equal(r.status,'UNASSESSED');
});
test('the filter never guesses a direction without a qualifying existing technical setup',()=>{
 const r=assessEntryChase(barsFrom(fall),{state:'WAIT',direction:'PUT'});
 assert.equal(r.hold,false);
 assert.equal(r.status,'NOT_APPLICABLE');
});
