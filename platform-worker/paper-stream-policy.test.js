import test from 'node:test';
import assert from 'node:assert/strict';
import {isStreamTicker,isStreamContract,streamScanAllowed} from './paper-stream-policy.js';

test('only bounded real ticker and option symbols can reach Schwab subscriptions',()=>{
 for(const symbol of ['SPY','QQQ','BNO','BRK.B'])assert.equal(isStreamTicker(symbol),true);
 for(const symbol of ['SPY/PUT','../admin',' spy ','A'.repeat(40)])assert.equal(isStreamTicker(symbol),false);
 assert.equal(isStreamContract('SPY   261106C00600000'),true);
 assert.equal(isStreamContract('<script>'),false);
 assert.equal(isStreamContract('B'.repeat(91)),false);
});
test('only recent stream events may trigger paper signal work',()=>{
 const now=1793889000000;
 const valid={now,receivedAt:now,lastScanAt:now-10000,lastSymbolAt:now-20000};
 assert.equal(streamScanAllowed(valid),true);
 assert.equal(streamScanAllowed({...valid,receivedAt:now-5001}),false);
 assert.equal(streamScanAllowed({...valid,receivedAt:now+5001}),false);
 assert.equal(streamScanAllowed({...valid,receivedAt:0}),false);
 assert.equal(streamScanAllowed({...valid,lastScanAt:now-4000,mode:'MULTI'}),false);
 assert.equal(streamScanAllowed({...valid,lastSymbolAt:now-11000,mode:'MULTI'}),false);
 assert.equal(streamScanAllowed({...valid,lastScanAt:now-3500,lastSymbolAt:now-3500,mode:'SINGLE'}),true);
 assert.equal(streamScanAllowed({...valid,lastScanAt:now-2000,lastSymbolAt:now-2000,mode:'SINGLE'}),false);
});
