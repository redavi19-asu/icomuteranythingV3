import test from 'node:test';
import assert from 'node:assert/strict';
import {spreadCents,normalizePaperSpreadCents,absoluteSpreadFailure,rankPaperContracts} from './paper-contract-selection.js';

test('absolute bid/ask cents cap defaults to two and is configurable',()=>{
 assert.equal(normalizePaperSpreadCents(undefined),2);
 assert.equal(normalizePaperSpreadCents(5),5);
 assert.equal(absoluteSpreadFailure({ask:2,bid:1.98}),null);
 assert.equal(absoluteSpreadFailure({ask:2,bid:1.97}),'SPREAD_TOO_WIDE_IN_CENTS');
 assert.equal(absoluteSpreadFailure({ask:2,bid:1.95},5),null);
 assert.equal(absoluteSpreadFailure({ask:2,bid:1.95},2),'SPREAD_TOO_WIDE_IN_CENTS');
 assert.equal(spreadCents({ask:2.56,bid:2.55}).toFixed(2),'1.00');
});
test('rank by actual dollar spread before percent, then volume/liquidity',()=>{
 const contracts=[
  {symbol:'WIDE',bid:2.90,ask:3,volume:9000,openInterest:9000,delta:.5},
  {symbol:'TIGHT',bid:0.99,ask:1,volume:1000,openInterest:800,delta:.5},
  {symbol:'TIGHT_LIQUID',bid:1.99,ask:2,volume:3000,openInterest:1200,delta:.5}
 ];
 const ranked=rankPaperContracts(contracts);
 assert.deepEqual(ranked.map(x=>x.symbol),['TIGHT_LIQUID','TIGHT','WIDE']);
 assert.equal(contracts[0].symbol,'WIDE','input ordering is not mutated');
});
