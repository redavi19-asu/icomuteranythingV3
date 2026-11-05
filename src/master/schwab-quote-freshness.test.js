import test from 'node:test';
import assert from 'node:assert/strict';
import {schwabQuoteFreshness} from './schwab-quote-freshness.js';

const now=Date.parse('2026-11-04T15:00:00.000Z');
test('Schwab explicitly real-time and <= 60s quote is verified fresh',()=>{
 assert.equal(schwabQuoteFreshness({realtime:true,quoteTime:now-30000},now).code,'VERIFIED_FRESH');
 assert.equal(schwabQuoteFreshness({realtime:true,quoteTime:now-60000},now).code,'VERIFIED_FRESH');
});
test('delayed entitlement never becomes real-time because time is recent',()=>{
 assert.equal(schwabQuoteFreshness({realtime:false,quoteTime:now},now).code,'DELAYED');
 assert.equal(schwabQuoteFreshness({realtime:null,quoteTime:now},now).code,'UNCONFIRMED');
});
test('stale, absent and future quote timestamps fail closed',()=>{
 assert.equal(schwabQuoteFreshness({realtime:true,quoteTime:now-61000},now).code,'STALE');
 assert.equal(schwabQuoteFreshness({realtime:true},now).code,'UNKNOWN_TIME');
 assert.equal(schwabQuoteFreshness({realtime:true,quoteTime:now+8000},now).code,'INVALID_TIME');
});
