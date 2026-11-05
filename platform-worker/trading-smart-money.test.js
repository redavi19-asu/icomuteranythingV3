import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateVerifiedFlow,evaluateAristotleConfluence,evaluateDailySwing,classifyTradeHorizon} from '../src/master/trading-smart-money.js';
import {getContractFlow} from './options-flow.js';
const now=Date.parse('2026-11-04T15:00:00Z'),contract='SPY261106C00580000';
const print=(id,premium,minutes=2)=>({id,option_chain_id:contract,option_type:'CALL',
 executed_at:new Date(now-minutes*60000).toISOString(),premium:String(premium),
 ask_vol:100,bid_vol:0,mid_vol:0,multi_vol:0,stock_multi_vol:0,canceled:false,exchange:'CBOE'});
const flow=events=>({provider:'UNUSUAL_WHALES',available:true,contractSymbol:contract,events});
test('unlicensed options flow fails closed, without inventing institutional trades',()=>{
 const check=evaluateVerifiedFlow(null,{contractSymbol:contract,side:'CALL',now});
 assert.equal(check.confirmed,false);assert.equal(check.status,'UNAVAILABLE');
 assert.equal(check.level2,'NOT_CONNECTED');
});
test('repeated recent ask-side single-leg premiums qualify as aggressive flow, not a verified sweep',()=>{
 const r=evaluateVerifiedFlow(flow([print('one',125000),print('two',150000)]),{contractSymbol:contract,side:'CALL',now});
 assert.equal(r.confirmed,true);assert.equal(r.premium,275000);assert.equal(r.sweepCount,0);
 assert.equal(r.printCount,2);assert.match(r.reason,/no sweep/i);
});
test('wrong option, repeated IDs, stale tape, bid-side or multi-leg cannot qualify',()=>{
 const base=[print('one',125000),print('two',150000)];
 for(const items of [
  [base[0],base[0]],
  [{...base[0],option_chain_id:'QQQ261106C00580000'},base[1]],
  [print('one',125000,8),print('two',150000,8)],
  [{...base[0],bid_vol:150,ask_vol:0},{...base[1],multi_vol:200}],
  [{...base[0],canceled:true},base[1]]
 ])assert.equal(evaluateVerifiedFlow(flow(items),{contractSymbol:contract,side:'CALL',now}).confirmed,false);
});
const minutes=Array.from({length:300},(_,i)=>{const close=100+i*.025;return {time:now-(300-i)*60000,open:close-.012,high:close+.02,low:close-.02,close,volume:1000+(i%3)*100}});
test('technical confluence reads MACD OBV 5- and 15-minute bars separately',()=>{
 const x=evaluateAristotleConfluence(minutes,'CALL');
 assert.equal(x.macd,true);assert.equal(x.obv,true);assert.equal(x.fiveMinute,true);assert.equal(x.fifteenMinute,true);
 assert.equal(x.confirmed,true);
 const reversed=evaluateAristotleConfluence(minutes,'PUT');
 assert.equal(reversed.confirmed,false);
});
const days=Array.from({length:80},(_,i)=>{
 const close=100+i*.5+(i===79?8:0);
 return {time:Date.parse('2026-07-01T00:00:00Z')+i*86400000,open:close-.4,high:close+.3,low:close-.7,close,volume:i===79?2600:1000};
});
test('completed daily bars identify multi-day candidate, never convert into automatic order',()=>{
 const s=evaluateDailySwing(days);
 assert.equal(s.status,'SWING_WATCH');assert.equal(s.confirmed,true);assert.equal(s.direction,'CALL');
 assert.equal(evaluateDailySwing(days.slice(0,20)).status,'UNASSESSED');
});
test('intraday style is conditional with no overnight promise; 0DTE is scalp',()=>{
 const signal={state:'TECHNICAL_WATCH',direction:'CALL',metrics:{volumeMultiple:1.8}};
 const x=classifyTradeHorizon({bars:minutes,signal,contract:{expiration:'2026-11-06'},now});
 assert.equal(x.type,'INTRADAY_HOLD');assert.match(x.window,/closing bell/);
 const scalp=classifyTradeHorizon({bars:minutes,signal,contract:{expiration:'2026-11-04'},now});
 assert.equal(scalp.type,'SCALP');
 const supported=classifyTradeHorizon({bars:minutes,signal,contract:{expiration:'2026-11-27'},
  dailySignal:evaluateDailySwing(days),now});
 assert.equal(supported.type,'INTRADAY_HOLD');
 assert.match(supported.reason,/overnight|Multi-day/i);
});
test('flow connector does not call external API without owner-configured key',async()=>{
 const s=await getContractFlow({},contract);
 assert.equal(s.available,false);assert.match(s.reason,/key not configured/);
});
test('flow connector only returns source-documented fields',async()=>{
 const fetcher=globalThis.fetch;
 globalThis.fetch=async (url,init)=>{
  assert.match(String(url),/api\/option-contract\/SPY261106C00580000\/flow/);
  assert.equal(init.headers.Authorization,'Bearer fixture-secret');
  return Response.json({data:[{...print('one',125000),password:'never-expose'}]});
 };
 try{
  const result=await getContractFlow({UNUSUAL_WHALES_API_KEY:'fixture-secret'},contract);
  assert.equal(result.available,true);assert.equal(result.events.length,1);
  assert.equal(result.events[0].password,undefined);
  assert.equal(result.events[0].option_chain_id,contract);
 }finally{globalThis.fetch=fetcher}
});
