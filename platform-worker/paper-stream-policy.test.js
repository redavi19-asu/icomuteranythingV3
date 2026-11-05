import test from 'node:test';
import assert from 'node:assert/strict';
import {isStreamTicker,isStreamContract,streamScanAllowed,chooseFreshStreamSymbol} from './paper-stream-policy.js';

test('only bounded real ticker and option symbols can reach Schwab subscriptions',()=>{
 for(const symbol of ['SPY','QQQ','BNO','BRK.B'])assert.equal(isStreamTicker(symbol),true);
 for(const symbol of ['SPY/PUT','../admin',' spy ','A'.repeat(40)])assert.equal(isStreamTicker(symbol),false);
 assert.equal(isStreamContract('SPY   261106C00600000'),true);
 assert.equal(isStreamContract('<script>'),false);
 assert.equal(isStreamContract('B'.repeat(91)),false);
});
test('only recent stream events may trigger paper signal work',()=>{
 const now=1793889000000;
 const valid={now,receivedAt:now,lastScanAt:now-10000,lastSymbolAt:now-90000};
 assert.equal(streamScanAllowed(valid),true);
 assert.equal(streamScanAllowed({...valid,receivedAt:now-5001}),false);
 assert.equal(streamScanAllowed({...valid,receivedAt:now+5001}),false);
 assert.equal(streamScanAllowed({...valid,receivedAt:0}),false);
 assert.equal(streamScanAllowed({...valid,lastScanAt:now-4000,mode:'MULTI'}),false);
 assert.equal(streamScanAllowed({...valid,lastSymbolAt:now-11000,mode:'MULTI'}),false);
 assert.equal(streamScanAllowed({...valid,lastSymbolAt:now-59000,mode:'MULTI'}),false,'do not re-scan GOOGL from each partial tick');
 assert.equal(streamScanAllowed({...valid,lastSymbolAt:now-61000,mode:'MULTI'}),true,'allow fresh one-minute continuation');
 assert.equal(streamScanAllowed({...valid,lastScanAt:now-3500,lastSymbolAt:now-3500,mode:'SINGLE'}),true);
 assert.equal(streamScanAllowed({...valid,lastScanAt:now-2000,lastSymbolAt:now-2000,mode:'SINGLE'}),false);
});

test('stream rotates across all watched symbols instead of starving all but the earliest quote',()=>{
 const now=1793890000000, symbols=['SPY','QQQ','IWM','NVDA','META','GOOGL'];
 const quotes=new Map(symbols.map(s=>[s,now])), scanned=new Map();
 let lastScanAt=0;
 for(let i=0;i<symbols.length;i++){
  const time=now+i*5100;
  for(const sym of symbols)quotes.set(sym,time);
  const next=chooseFreshStreamSymbol(symbols,quotes,scanned,{now:time,lastScanAt,mode:'MULTI'});
  assert.equal(next,symbols[i],`stream should reach ${symbols[i]} fairly`);
  scanned.set(next,time);lastScanAt=time;
 }
 assert.equal(chooseFreshStreamSymbol(symbols,new Map([['SPY',now-6000]]),new Map(),
  {now,lastScanAt:0,mode:'MULTI'}),null,'stale stream events never trigger a scan');
 assert.equal(chooseFreshStreamSymbol(symbols,quotes,scanned,{now:now+symbols.length*5100,lastScanAt,mode:'MULTI'}),null,
  'quotes older than five seconds cannot be reused for another scan');
});
