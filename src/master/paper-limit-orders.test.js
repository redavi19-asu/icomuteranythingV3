import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePaperLimitAsk,paperLimitDeadline,paperLimitMeetsPrice,validatePaperQuantity,paperMaximumEntryCost} from './paper-limit-orders.js';

const now=Date.parse('2026-11-06T15:00:00Z');
const alert={qualification:{priceAction:{
 confirmed:true,confirmationBarTime:now-2*60000
}}};

test('limit is a maximum fresh ASK, not stock price, bid, or midpoint',()=>{
 assert.equal(paperLimitMeetsPrice(1.78,1.80),true);
 assert.equal(paperLimitMeetsPrice(1.80,1.80),true);
 assert.equal(paperLimitMeetsPrice(1.81,1.80),false);
 assert.equal(paperLimitMeetsPrice(0,1.80),false);
 assert.equal(paperLimitMeetsPrice(NaN,1.80),false);
});
test('user limit must be cents-priced and affordable including slippage and entry fee',()=>{
 assert.equal(validatePaperLimitAsk(1.80,350),1.8);
 assert.throws(()=>validatePaperLimitAsk(3.5,350),/budget/);
 assert.throws(()=>validatePaperLimitAsk(1.801,350),/increments/);
 assert.throws(()=>validatePaperLimitAsk(-1,350),/valid/);
});
test('paper limit can last beyond two-minute alert but not beyond original setup',()=>{
 assert.equal(paperLimitDeadline(alert,now,5),now+4*60000);
 assert.equal(paperLimitDeadline(alert,now,3),now+3*60000);
 assert.throws(()=>paperLimitDeadline(alert,now,30),/1-, 3-, or 5/);
 assert.throws(()=>paperLimitDeadline({qualification:{priceAction:{confirmed:false}}},now,3),/verified/);
 assert.throws(()=>paperLimitDeadline(alert,now+4*60000-5000,3),/expired/);
});


test('owner manually chooses quantity; max modeled cost includes ALL contracts, fees and penny slippage',()=>{
 assert.equal(validatePaperQuantity(1),1);
 assert.equal(validatePaperQuantity(2),2);
 assert.equal(paperMaximumEntryCost(2,2),403.30);
 assert.equal(validatePaperLimitAsk(2,500,2),2);
 assert.throws(()=>validatePaperLimitAsk(2,350,2),/budget/);
 for(const bad of [0,-1,11,1.5,'',NaN])assert.throws(()=>validatePaperQuantity(bad),/whole option contracts/);
});