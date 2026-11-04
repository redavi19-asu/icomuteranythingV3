import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
import {paperApi,runPaperTick,freshRunner} from './paper-runner.js';
import {stepPaper,newPaper} from '../src/master/paper-session.js';import {sealTokens} from './schwab-connection.js';import worker from './index.js';
const owner={id:'owner-test',role:'owner'},now=Date.parse('2026-11-04T15:00:00Z');
const req=(action,id)=>new Request('https://test/platform/paper',{method:action?'POST':'GET',headers:{Origin:'https://icomputeranything.com'},...(action?{body:JSON.stringify({action,id})}:{})});
async function fixture(){const db=new DatabaseSync(':memory:');for(const f of ['0007_schwab_market_data.sql','0009_paper_runner.sql'])db.exec(readFileSync(new URL('./migrations/'+f,import.meta.url),'utf8'));const DB={prepare(sql){let a=[];const p={bind(...args){a=args;return p},async first(){return db.prepare(sql).get(...a)},async run(){return {meta:{changes:db.prepare(sql).run(...a).changes}}}};return p}};const env={DB,SCHWAB_TOKEN_ENCRYPTION_KEY:btoa('12345678901234567890123456789012')};const payload=await sealTokens(env,owner.id,{access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:now+86400000});db.prepare('INSERT INTO schwab_connections(owner_id,generation,payload,updated_at) VALUES(?,?,?,?)').run(owner.id,'test',payload,now);return {db,env}}
function pending(){return {id:'setup',expires:now+120000,contract:{symbol:'TEST OPTION',underlying:'SPY',bid:1.95,ask:2,quoteTime:now,delta:0.5,volume:200,openInterest:500}}}
test('paper routes deny public access',async()=>{for(const method of ['GET','POST'])assert.equal((await worker.fetch(new Request('https://test/platform/paper',{method}),{})).status,403)});
test('approval is single use, state survives reload, emergency close persists',async()=>{const {db,env}=await fixture();const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:1.95,askPrice:2,quoteTime:now}}});try{
 await paperApi(req(),env,owner);const s=freshRunner();s.enabled=true;s.pending=pending();db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
 assert.equal((await paperApi(req('accept','setup'),env,owner)).status,200);assert.equal((await paperApi(req('accept','setup'),env,owner)).status,409);
 const restored=await(await paperApi(req(),env,owner)).json();assert.ok(restored.paper.position);assert.equal(restored.paper.dayTrades,1);
 await paperApi(req('close'),env,owner);await runPaperTick(env,owner);const closed=await(await paperApi(req(),env,owner)).json();assert.equal(closed.enabled,false);assert.equal(closed.paper.position,null);assert.equal(closed.paper.trades[0].reason,'MANUAL_CLOSE');
 }finally{Date.now=date;globalThis.fetch=fetcher}});
test('stale quote leaves emergency request pending and never fabricates fill',async()=>{const {db,env}=await fixture();const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:1.95,askPrice:2,quoteTime:now}}});try{await paperApi(req(),env,owner);const s=freshRunner();s.enabled=true;s.pending=pending();db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));await paperApi(req('accept','setup'),env,owner);await paperApi(req('close'),env,owner);globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:1.95,askPrice:2,quoteTime:now-120000}}});const held=await runPaperTick(env,owner);assert.ok(held.paper.position);assert.equal(held.closeRequested,true);assert.match(held.lastError,/fresh/)}finally{Date.now=date;globalThis.fetch=fetcher}});
test('cross-origin controls and expired approval fail closed',async()=>{const {db,env}=await fixture();assert.equal((await paperApi(new Request('https://test',{method:'POST',body:'{}'}),env,owner)).status,403);await paperApi(req(),env,owner);const s=freshRunner();s.enabled=true;s.pending={...pending(),expires:0};db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));assert.equal((await paperApi(req('accept','setup'),env,owner)).status,409)});
test('pause during approval wins over in-flight entry',async()=>{const {db,env}=await fixture();const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;try{await paperApi(req(),env,owner);const s=freshRunner();s.enabled=true;s.pending=pending();db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));globalThis.fetch=async()=>{await paperApi(req('pause'),env,owner);return Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:1.95,askPrice:2,quoteTime:now}}})};assert.equal((await paperApi(req('accept','setup'),env,owner)).status,409);const after=await(await paperApi(req(),env,owner)).json();assert.equal(after.enabled,false);assert.equal(after.paper.position,null)}finally{Date.now=date;globalThis.fetch=fetcher}});

test('paper practice allows entries after daily win, daily loss and three prior trades',()=>{
 const quote={symbol:'SPY PAPER 400 C',bid:1.95,ask:2,quoteTime:now,delta:0.5,volume:200,openInterest:500};
 for(const pnl of [75.70,-150]){
  const initial={...newPaper(),cash:500,day:'2026-11-04',dayPnl:pnl,dayTrades:8};
  const entered=stepPaper(initial,{quote,enter:true,now});
  assert.ok(entered.position,'Paper practice entry should not be blocked by daily P/L or count.');
  assert.equal(entered.dayTrades,9);
  assert.ok(entered.cash<500);
 }
});
test('paper entries still reject insufficient simulated cash',()=>{
 const quote={symbol:'SPY PAPER 400 C',bid:1.95,ask:2,quoteTime:now,delta:0.5,volume:200,openInterest:500};
 const initial={...newPaper(),cash:100,day:'2026-11-04',dayPnl:75.70,dayTrades:8};
 assert.throws(()=>stepPaper(initial,{quote,enter:true,now}),/Insufficient paper cash/);
});


test('independent paper alerts survive reload, expire and can be dismissed one at a time',async()=>{
 const {db,env}=await fixture();const date=Date.now;Date.now=()=>now;
 try{
  await paperApi(req(),env,owner);const s=freshRunner();s.enabled=true;
  s.alerts=[{...pending(),id:'one',status:'PENDING'},{...pending(),id:'two',status:'PENDING',expires:now-1},{...pending(),id:'three',status:'EXPIRED'}];
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
  const first=await(await paperApi(req(),env,owner)).json();assert.equal(first.alerts.length,3);
  const closed=await paperApi(req('dismiss','two'),env,owner);assert.equal(closed.status,200);
  const after=await(await paperApi(req(),env,owner)).json();
  assert.deepEqual(after.alerts.map(a=>a.id),['one','three']);
  assert.equal(after.alerts[0].status,'PENDING');
  assert.equal(after.alerts[1].status,'EXPIRED');
 }finally{Date.now=date}
});
test('approving one alert preserves other opportunities and keeps single position',async()=>{
 const {db,env}=await fixture();const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;
 globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:1.95,askPrice:2,quoteTime:now}}});
 try{
  await paperApi(req(),env,owner);const s=freshRunner();s.enabled=true;s.alerts=[{...pending(),id:'first',status:'PENDING'},{...pending(),id:'second',status:'PENDING'}];
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
  const entry=await paperApi(req('accept','first'),env,owner);assert.equal(entry.status,200);
  const state=await entry.json();assert.ok(state.paper.position);
  assert.equal(state.alerts.find(a=>a.id==='first').status,'TAKEN');
  assert.equal(state.alerts.find(a=>a.id==='second').status,'PENDING');
  assert.equal((await paperApi(req('accept','second'),env,owner)).status,409);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});
