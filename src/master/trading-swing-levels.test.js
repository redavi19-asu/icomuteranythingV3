import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedSwing55,assessSwing55Entry} from './trading-swing-levels.js';

const start=Date.parse('2026-11-05T14:30:00Z');
const candle=(i,{open=99.1,high=99.4,low=98.8,close=99.1}={})=>
 ({time:start+i*60000,open,high,low,close,volume:1000});
const technical=direction=>({state:'TECHNICAL_WATCH',direction});
const putBars=()=>{
 const bars=Array.from({length:55},(_,i)=>candle(i));
 bars[30]=candle(30,{open:99.1,high:99.4,low:98,close:99.1});
 bars[54]=candle(54,{open:98.9,high:99.3,low:98.1,close:98.3});
 return bars;
};
const callBars=()=>{
 const bars=Array.from({length:55},(_,i)=>candle(i,{open:100.5,high:100.8,low:100.2,close:100.5}));
 bars[30]=candle(30,{open:100.5,high:101.6,low:100.2,close:100.5});
 bars[54]=candle(54,{open:100.7,high:101.5,low:100.6,close:101.3});
 return bars;
};

test('5/5 pivot never repaints or uses the fifth right-hand candle before it closes',()=>{
 const bars=Array.from({length:22},(_,i)=>candle(i,{open:100,high:100.4,low:99.6,close:100}));
 bars[12]=candle(12,{open:100,high:102,low:99.6,close:100});
 assert.equal(confirmedSwing55(bars.slice(0,17)).highs.length,0,'four right bars are insufficient');
 const yes=confirmedSwing55(bars.slice(0,18));
 assert.equal(yes.highs.length,1);
 assert.equal(yes.highs[0].pivotTime,bars[12].time);
 assert.equal(yes.highs[0].confirmedAfter,bars[17].time+60000);
 assert.equal(confirmedSwing55(bars.slice(0,18)).highs[0].price,102);
});

test('PUT near a confirmed 5/5 swing low waits instead of chasing support',()=>{
 const x=assessSwing55Entry(putBars(),technical('PUT'));
 assert.equal(x.hold,true);
 assert.equal(x.status,'WAIT_SUPPORT_BREAK');
 assert.equal(x.support,98);
 assert.match(x.reason,/support near \$98\.00/);
});

test('CALL near a confirmed 5/5 swing high waits instead of chasing resistance',()=>{
 const x=assessSwing55Entry(callBars(),technical('CALL'));
 assert.equal(x.hold,true);
 assert.equal(x.status,'WAIT_RESISTANCE_BREAK');
 assert.equal(x.resistance,101.6);
 assert.match(x.reason,/resistance near \$101\.60/);
});

test('two completed closes below the confirmed support can qualify a fresh PUT breakdown',()=>{
 const bars=putBars();
 bars[53]=candle(53,{open:98.7,high:98.8,low:97.55,close:97.7});
 bars[54]=candle(54,{open:98,high:98.2,low:97.45,close:97.6});
 const x=assessSwing55Entry(bars,technical('PUT'));
 assert.equal(x.hold,false);
 assert.equal(x.status,'SUPPORT_BREAK_CONFIRMED');
 assert.equal(x.support,98);
});

test('two completed closes above confirmed resistance can qualify fresh CALL breakout',()=>{
 const bars=callBars();
 bars[53]=candle(53,{open:100.8,high:102,low:100.7,close:101.9});
 bars[54]=candle(54,{open:101.8,high:102.1,low:101.7,close:102});
 const x=assessSwing55Entry(bars,technical('CALL'));
 assert.equal(x.hold,false);
 assert.equal(x.status,'RESISTANCE_BREAK_CONFIRMED');
 assert.equal(x.resistance,101.6);
});

test('new levels do not invent missing data or a lunchtime ban',()=>{
 const short=putBars().slice(0,18);
 assert.equal(assessSwing55Entry(short,technical('PUT')).hold,false);
 assert.equal(assessSwing55Entry(short,technical('PUT')).status,'UNASSESSED');
 const clean=putBars();
 clean[54]=candle(54,{open:99.1,high:99.4,low:98.8,close:99.1});
 const x=assessSwing55Entry(clean,technical('PUT'));
 assert.equal(x.hold,false,'a distant confirmed support level does not block a paper entry');
 assert.equal(x.status,'LEVELS_CHECKED');
 assert.equal(assessSwing55Entry(clean,{state:'WAIT',direction:'PUT'}).hold,false);
});
