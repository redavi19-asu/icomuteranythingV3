import test from 'node:test';
import assert from 'node:assert/strict';
import {schwabQuoteFreshness,selectSchwabDisplayQuote} from '../src/master/schwab-quote-freshness.js';
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

test('Schwab stream without a delay flag cannot erase verified REST quote status',()=>{
 const rest={symbol:'SPY',bid:650.1,ask:650.12,last:650.11,quoteTime:now-1500,realtime:true};
 const stream={symbol:'SPY',bid:650.5,ask:650.52,last:650.51,quoteTime:now,delayed:null};
 const selected=selectSchwabDisplayQuote(rest,stream,true);
 assert.equal(selected,rest,'real-time entitlement and price must come from the same source');
 assert.equal(schwabQuoteFreshness(selected,now).code,'VERIFIED_FRESH');
});
test('explicitly non-delayed stream can provide live bid/ask, delayed stream is not mixed',()=>{
 const rest={symbol:'SPY',bid:650.1,ask:650.12,quoteTime:now-1000,realtime:true};
 const live={symbol:'SPY',bid:650.24,ask:650.27,quoteTime:now,delayed:false};
 const selected=selectSchwabDisplayQuote(rest,live,true);
 assert.equal(selected.ask,650.27);
 assert.equal(selected.realtime,true);
 assert.equal(schwabQuoteFreshness(selected,now).code,'VERIFIED_FRESH');
 const delayed=selectSchwabDisplayQuote(rest,{...live,delayed:true},true);
 assert.equal(delayed,rest);
 assert.equal(selectSchwabDisplayQuote(null,{...live,delayed:null},true).realtime,null);
});

test('missing Schwab quote does not crash the trading dashboard on initial render',()=>{
 assert.equal(schwabQuoteFreshness(null,now).code,'UNCONFIRMED');
 assert.equal(schwabQuoteFreshness(undefined,now).code,'UNCONFIRMED');
 assert.equal(schwabQuoteFreshness(selectSchwabDisplayQuote(null,null,false),now).code,'UNCONFIRMED');
});
