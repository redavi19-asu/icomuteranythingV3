import test from 'node:test';
import assert from 'node:assert/strict';
import {schwabQuoteFreshness} from '../src/master/schwab-quote-freshness.js';
const now=Date.parse('2026-11-04T15:00:00Z');
test('only marked real-time quotes with fresh timestamps receive a live label',()=>{
 const fresh=schwabQuoteFreshness({realtime:true,quoteTime:now-2500},now);
 assert.equal(fresh.code,'VERIFIED_FRESH');
 assert.equal(schwabQuoteFreshness({realtime:false,quoteTime:now},now).code,'DELAYED');
 assert.equal(schwabQuoteFreshness({realtime:null,quoteTime:now},now).code,'UNCONFIRMED');
 assert.equal(schwabQuoteFreshness({realtime:true,quoteTime:now-120000},now).code,'STALE');
 assert.equal(schwabQuoteFreshness({realtime:true,quoteTime:0},now).code,'UNKNOWN_TIME');
 assert.equal(schwabQuoteFreshness({realtime:true,quoteTime:now+120000},now).code,'INVALID_TIME');
});
test('a fresh HTTP response alone does not prove quotes are current',()=>{
 assert.equal(schwabQuoteFreshness({realtime:true,receivedAt:now,quoteTime:now-180000},now).code,'STALE');
 assert.equal(schwabQuoteFreshness({realtime:true,receivedAt:now},now).code,'UNKNOWN_TIME');
});
