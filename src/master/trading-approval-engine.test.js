// Synthetic market data is only a test fixture, not a historical performance claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {findApprovalOpportunity,approvePaperOpportunity} from './trading-approval-engine.js';
const start=Date.parse('2026-11-03T14:30:00Z');
const bars=Array.from({length:52},(_,i)=>{
 const close=100+i*.025+Math.sin(i*.8)*.15+(i===51?.2:0);
 return {time:start+i*60000,open:close-.06,high:close+.09,low:close-.1,close,volume:i===51?2300:1000};
});
const now=bars.at(-1).time;
const quote=(time,bid,ask,other={})=>({
 symbol:'SPY',contract:'SPY 261103C00100000',time,expiration:'2026-11-03',
 strike:100,side:'CALL',bid,ask,delta:.52,volume:1000,openInterest:2000,...other
});
const groups={SPY:bars},offer=quote(now,1.97,2);
const find=(quotes=[offer],rules={},session={})=>findApprovalOpportunity(groups,quotes,rules,session);
const approve=(quotes=[offer],rules={},session={})=>{
 const found=find(quotes,rules,session);
 assert.ok(found.candidate,found.reason);
 return approvePaperOpportunity(groups,quotes,rules,found.candidate.id,session);
};
test('earliest approval uses historical signal snapshot rather than future quotes',()=>{
 const r=find([offer,quote(now+60000,2.75,2.8)]);
 assert.ok(r.candidate);assert.equal(r.candidate.time,now);assert.equal(r.candidate.side,'CALL');
 assert.equal(r.candidate.stopBid,1.61);assert.equal(r.candidate.targetBid,2.61);
});
test('approved paper entry and automatic target-based exit from later bid',()=>{
 const o=approve([offer,quote(now+60000,2.75,2.8)]);
 assert.equal(o.status,'CLOSED');assert.equal(o.trade.exitReason,'TAKE_PROFIT');
 assert.equal(o.trade.pnl,71.7);assert.equal(o.trade.ordersSentToSchwab,false);
});
test('tight stop does not disguise a gap through stop level',()=>{
 const o=approve([offer,quote(now+60000,1.15,1.2)]);
 assert.equal(o.status,'CLOSED');assert.equal(o.trade.exitReason,'STOP_LOSS');assert.ok(o.trade.pnl<-40);
});
test('trailing exit after historical bid reached profit threshold',()=>{
 const o=approve([offer,quote(now+60000,2.46,2.5),quote(now+120000,2.21,2.25)]);
 assert.equal(o.status,'CLOSED');assert.equal(o.trade.exitReason,'TRAILING_STOP');assert.ok(o.trade.pnl>0);
});
test('missing later quote cannot generate a fake closed trade',()=>{
 const o=approve([offer]);
 assert.equal(o.status,'OPEN');assert.equal(o.trade,null);
 assert.equal(o.open.estimatedMarkPnl,null);
});
test('a zero exit bid does not create a sale',()=>{
 const o=approve([offer,quote(now+60000,0,.15)]);
 assert.equal(o.status,'OPEN');assert.equal(o.trade,null);assert.equal(o.open.lastBid,0);
});
test('skip button advances to a distinct historically confirmed snapshot',()=>{
 const quotes=[offer,quote(now+120000,1.95,2)];
 const first=find(quotes);assert.ok(first.candidate);
 const second=find(quotes,{}, {skippedIds:[first.candidate.id]});
 assert.ok(second.candidate);assert.notEqual(second.candidate.id,first.candidate.id);
});
test('cannot approve a substituted or skipped historical alert',()=>{
 const first=find().candidate;
 assert.throws(()=>approvePaperOpportunity(groups,[offer],{},'FAKE',{}),/no longer/);
 assert.throws(()=>approvePaperOpportunity(groups,[offer],{},first.id,{skippedIds:[first.id]}),/no longer/);
});
test('wide spreads, opposite side and unaffordable contracts are rejected',()=>{
 assert.equal(find([quote(now,1.4,2)]).candidate,null);
 assert.equal(find([quote(now,1.97,2,{side:'PUT'})]).candidate,null);
 assert.equal(find([offer],{startingCash:100}).candidate,null);
});
test('no overlapping entry or double-trade after approved historical exit',()=>{
 const quotes=[offer,quote(now+60000,2.75,2.8),quote(now+120000,1.95,2)];
 const t=approve(quotes).trade;
 assert.equal(find(quotes,{}, {trades:[t]}).candidate,null);
});
test('invalid rules, missing inputs and no option chain fail closed',()=>{
 assert.equal(findApprovalOpportunity({},[],{},{}).candidate,null);
 assert.throws(()=>find([offer],{stopLossPct:0}),/stopLossPct/);
});
