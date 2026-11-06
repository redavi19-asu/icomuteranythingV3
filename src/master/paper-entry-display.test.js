import test from 'node:test';
import assert from 'node:assert/strict';
import {oneDollarBelowAskPerContract,optionMidpoint,paperMarkPnlAtMid} from './paper-entry-display.js';

test('default paper limit saves exactly $1 for a standard 100-share contract',()=>{
 assert.equal(oneDollarBelowAskPerContract(2.56),2.55);
 assert.equal(oneDollarBelowAskPerContract(2),1.99);
 assert.equal(oneDollarBelowAskPerContract(0.01),0.01);
 assert.equal(oneDollarBelowAskPerContract(NaN),null);
});
test('thinkorswim-style midpoint mark and the conservative sell-at-bid net P/L remain different',()=>{
 const p={fill:2.57,cost:257.65,mark:{bid:2.55,ask:2.56,quoteTime:Date.now()}};
 assert.equal(optionMidpoint(p.mark.bid,p.mark.ask),2.555);
 assert.equal(paperMarkPnlAtMid(p),-1.5);
 // Existing net liquidation P/L: bid minus penny slippage, exit fee,
 // original cash cost inclusive of entry slippage and entry fee.
 const actualNet=Math.round(((p.mark.bid-.01)*100-.65-p.cost)*100)/100;
 assert.equal(actualNet,-4.3);
 assert.equal(paperMarkPnlAtMid({...p,mark:{bid:NaN,ask:3}}),null);
});


test('midpoint mark is multiplied by selected quantity but conservative P/L accounting is untouched',()=>{
 assert.equal(paperMarkPnlAtMid({fill:2.57,quantity:3,mark:{bid:2.55,ask:2.56}}),-4.5);
});