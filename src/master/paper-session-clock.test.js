import test from 'node:test';
import assert from 'node:assert/strict';
import {expiryStatus,paperSessionOpen,paperExpirationCloseDue,paperEntryEligible,scheduledRotationDue,PAPER_SCAN_OPEN_MINUTE} from './paper-session-clock.js';
import {marketTime} from './trading-paper-engine.js';
import {newPaper,stepPaper} from './paper-session.js';
const nyTime=utc=>Date.parse(utc);
const quote=(now,expiration)=>({symbol:'GLD 261106C00355000',underlying:'GLD',strike:355,side:'CALL',
 expiration,bid:1.95,ask:2,quoteTime:now,delta:.5,volume:500,openInterest:1000});
test('scanner remains open through 3:59, including Friday, and closes at 4:00 ET',()=>{
 const friday='2026-11-06';
 for(const hhmm of ['20:45','20:54','20:55','20:59']){
  const s=marketTime(nyTime(friday+'T'+hhmm+':00Z'));
  assert.equal(paperSessionOpen(s),true,hhmm);
 }
 assert.equal(paperSessionOpen(marketTime(nyTime(friday+'T21:00:00Z'))),false);
});
test('expiration-specific entry checks reject late Friday 0DTE and allow valid next-week expiry',()=>{
 const s=marketTime(nyTime('2026-11-06T20:56:00Z'));
 assert.equal(paperEntryEligible('2026-11-06',s),false);
 assert.equal(paperEntryEligible('2026-11-09',s),true);
 assert.equal(paperEntryEligible('2026-11-05',s),false);
 assert.equal(paperEntryEligible(undefined,s),false);
 assert.equal(expiryStatus('2026-11-09',s.day),'FUTURE');
});
test('same-day Friday GLD option is closed at 3:55 PM, not 4 PM',()=>{
 const entry=nyTime('2026-11-06T20:54:00Z'),cutoff=nyTime('2026-11-06T20:55:00Z');
 const entered=stepPaper(newPaper(),{quote:quote(entry,'2026-11-06'),enter:true,now:entry});
 const exited=stepPaper(entered,{quote:quote(cutoff,'2026-11-06'),now:cutoff});
 assert.equal(exited.position,null);
 assert.equal(exited.trades[0].reason,'SESSION_END');
});
test('Friday later-dated GLD paper option survives 3:55 and 4:00, then expires Monday at 3:55',()=>{
 const entry=nyTime('2026-11-06T20:54:00Z'),expiry='2026-11-09';
 let state=stepPaper(newPaper(),{quote:quote(entry,expiry),enter:true,now:entry});
 for(const when of ['2026-11-06T20:55:00Z','2026-11-06T21:00:00Z','2026-11-09T15:00:00Z']){
  const now=nyTime(when);
  state=stepPaper(state,{quote:quote(now,expiry),now});
  assert.ok(state.position,'must remain open at '+when);
 }
 const end=nyTime('2026-11-09T20:55:00Z');
 state=stepPaper(state,{quote:quote(end,expiry),now:end});
 assert.equal(state.position,null);
 assert.equal(state.trades[0].reason,'SESSION_END');
});
test('next-day expiry contract can enter at 3:59 but no new paper entries at 4:00',()=>{
 const before=nyTime('2026-11-05T20:59:00Z'),after=nyTime('2026-11-05T21:00:00Z');
 const q=quote(before,'2026-11-06');
 assert.ok(stepPaper(newPaper(),{quote:q,enter:true,now:before}).position);
 assert.throws(()=>stepPaper(newPaper(),{quote:quote(after,'2026-11-06'),enter:true,now:after}),/4:00 PM/);
});
test('same-day 0DTE paper options cannot open at 3:55',()=>{
 const cutoff=nyTime('2026-11-06T20:55:00Z');
 assert.throws(()=>stepPaper(newPaper(),{quote:quote(cutoff,'2026-11-06'),enter:true,now:cutoff}),/3:55/);
});
test('later-expiry entry is not forcibly closed by a 30 minute scalp timer',()=>{
 const entry=nyTime('2026-11-05T18:00:00Z');
 const option=quote(entry,'2026-11-09');
 let s=stepPaper(newPaper(),{quote:option,enter:true,now:entry});
 s.position.maxHoldMinutes=30;
 const hold=nyTime('2026-11-05T18:45:00Z');
 s=stepPaper(s,{quote:quote(hold,'2026-11-09'),now:hold});
 assert.ok(s.position);
});
test('legacy unknown-expiration position exits conservatively at 3:55; no synthetic bid',()=>{
 const entry=nyTime('2026-11-06T20:54:00Z'),end=nyTime('2026-11-06T20:55:00Z');
 const q={...quote(entry,'2026-11-06')};delete q.expiration;
 const entered=stepPaper(newPaper(),{quote:q,enter:true,now:entry});
 assert.throws(()=>stepPaper(entered,{quote:{...q,quoteTime:end,bid:0},now:end}),/positive bid/);
 const exited=stepPaper(entered,{quote:{...q,quoteTime:end},now:end});
 assert.equal(exited.trades[0].reason,'SESSION_END');
 assert.equal(paperExpirationCloseDue(undefined,marketTime(end)),true);
});

test('Friday November 6 paper scanner eligibility opens exactly at 9:30 AM ET, not 9:35',()=>{
 assert.equal(PAPER_SCAN_OPEN_MINUTE,570);
 const before=marketTime(Date.parse('2026-11-06T14:29:59Z'));
 const opening=marketTime(Date.parse('2026-11-06T14:30:00Z'));
 const afternoon=marketTime(Date.parse('2026-11-06T20:59:00Z'));
 assert.equal(paperSessionOpen(before),false);
 assert.equal(paperSessionOpen(opening),true);
 assert.equal(paperSessionOpen(afternoon),true);
 assert.equal(paperEntryEligible('2026-11-06',opening),true);
 assert.equal(paperSessionOpen(marketTime(Date.parse('2026-11-07T14:30:00Z'))),false);
});
test('9:30 AM cron is never suppressed by a recent 9:29 pre-open rotation',()=>{
 const last=Date.parse('2026-11-06T14:29:45Z');
 const opening=Date.parse('2026-11-06T14:30:00Z');
 assert.equal(scheduledRotationDue(opening,last,marketTime(opening),marketTime(last)),true);
 const repeat=Date.parse('2026-11-06T14:30:20Z');
 assert.equal(scheduledRotationDue(repeat,opening,marketTime(repeat),marketTime(opening)),false);
 const next=Date.parse('2026-11-06T14:31:00Z');
 assert.equal(scheduledRotationDue(next,opening,marketTime(next),marketTime(opening)),true);
 const saturday=Date.parse('2026-11-07T14:30:00Z');
 const saturdayPre=Date.parse('2026-11-07T14:29:45Z');
 assert.equal(scheduledRotationDue(saturday,saturdayPre,marketTime(saturday),marketTime(saturdayPre)),false);
});
