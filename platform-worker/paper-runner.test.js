import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
import {paperApi,runPaperTick,freshRunner,ensureDailyPaperAutoStart,scannerUniverse,PAPER_SCAN_UNIVERSE,scannerEngineConfig,scannerEngineUniverse,scannerStreamUniverse,paperOptionEntryEstimate,paperQuoteQualityFailure,paperNeedsPriceConfirmation} from './paper-runner.js';
import {stepPaper,newPaper} from '../src/master/paper-session.js';import {sealTokens} from './schwab-connection.js';import worker from './index.js';
const owner={id:'owner-test',role:'owner'},now=Date.parse('2026-11-04T15:00:00Z');
const req=(action,id)=>new Request('https://test/platform/paper',{method:action?'POST':'GET',headers:{Origin:'https://icomputeranything.com'},...(action?{body:JSON.stringify({action,id})}:{})});
async function fixture(){const db=new DatabaseSync(':memory:');for(const f of ['0007_schwab_market_data.sql','0009_paper_runner.sql'])db.exec(readFileSync(new URL('./migrations/'+f,import.meta.url),'utf8'));const DB={prepare(sql){let a=[];const p={bind(...args){a=args;return p},async first(){return db.prepare(sql).get(...a)},async run(){return {meta:{changes:db.prepare(sql).run(...a).changes}}}};return p}};const env={DB,SCHWAB_TOKEN_ENCRYPTION_KEY:btoa('12345678901234567890123456789012')};const payload=await sealTokens(env,owner.id,{access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:now+86400000});db.prepare('INSERT INTO schwab_connections(owner_id,generation,payload,updated_at) VALUES(?,?,?,?)').run(owner.id,'test',payload,now);return {db,env}}
function pending(){const asOf='2026-11-04T14:59:00.000Z';return {id:'setup',expires:now+120000,signal:{state:'TECHNICAL_WATCH',asOf,direction:'CALL'},qualification:{technical:{confirmed:true,asOf,direction:'CALL'},marketData:{provider:'SCHWAB',realtime:true},confluence:{confirmed:false}},contract:{symbol:'TEST OPTION',underlying:'SPY',bid:1.95,ask:2,quoteTime:now,delta:0.5,volume:200,openInterest:500}}}
test('paper routes deny public access',async()=>{for(const method of ['GET','POST'])assert.equal((await worker.fetch(new Request('https://test/platform/paper',{method}),{})).status,403)});
test('approval is single use, state survives reload, emergency close persists',async()=>{const {db,env}=await fixture();const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:1.95,askPrice:2,quoteTime:now}}});try{
 await paperApi(req(),env,owner);const s=freshRunner();s.enabled=true;s.pending=pending();db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
 assert.equal((await paperApi(req('accept','setup'),env,owner)).status,200);assert.equal((await paperApi(req('accept','setup'),env,owner)).status,409);
 const restored=await(await paperApi(req(),env,owner)).json();assert.ok(restored.paper.position);assert.equal(restored.paper.dayTrades,1);
 const immediate=await(await paperApi(req('close'),env,owner)).json();assert.equal(immediate.paper.position,null);await paperApi(req('close'),env,owner);const closed=await(await paperApi(req(),env,owner)).json();assert.equal(closed.enabled,true);assert.equal(closed.paper.position,null);assert.equal(closed.paper.trades[0].reason,'MANUAL_CLOSE');assert.equal(closed.paper.trades.length,1);
 }finally{Date.now=date;globalThis.fetch=fetcher}});
test('valid paper setup can be approved without paid options-flow confirmation',async()=>{
 const {db,env}=await fixture();const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;
 try{
  await paperApi(req(),env,owner);
  const s=freshRunner();s.enabled=true;s.alerts=[{...pending(),status:'PENDING',qualification:{
   marketData:{provider:'SCHWAB',realtime:true},confluence:{confirmed:false},technical:pending().qualification.technical,
   flow:{confirmed:false,provider:'UNUSUAL_WHALES',reason:'Not subscribed'}
  }}];
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
  globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:1.95,askPrice:2,quoteTime:now}}});
  const accepted=await paperApi(req('accept','setup'),env,owner);
  assert.equal(accepted.status,200,'a paid flow denial must not block a fully verified Schwab paper setup');
  const state=await accepted.json();
  assert.equal(state.paper.positions.length,1);
  assert.equal(state.realOrdersEnabled,false);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});
test('Nov 4 momentum alert path still produces a Schwab-verified paper opportunity without 150-bar confluence',async()=>{
 const originalDate=Date.now,originalFetch=globalThis.fetch;Date.now=()=>now;
 const bars=Array.from({length:52},(_,i)=>{
  const close=100+i*.025+Math.sin(i*.8)*.15+(i===51?.2:0);
  return {datetime:now-53*60000+i*60000,open:close-.06,high:close+.09,low:close-.1,close,volume:i===51?2300:1000};
 });
 const breakout=bars.at(-1),confirmationClose=breakout.close+.035;
 const confirm={time:breakout.datetime+60000,datetime:breakout.datetime+60000,
  open:confirmationClose-.04,high:confirmationClose+.06,
  low:confirmationClose-.10,close:confirmationClose,volume:1700};
 let liveLast=confirmationClose;
 const contract='SPY   261106C00100000';
 const chain={isDelayed:false,callExpDateMap:{'2026-11-06:2':{'100':[{symbol:contract,strikePrice:100,
  bid:1.95,ask:2,delta:0.52,totalVolume:220,openInterest:600,quoteTimeInLong:now,nonStandard:false}]}},putExpDateMap:{}};
 globalThis.fetch=async input=>{
  const url=new URL(input);
  if(url.pathname.endsWith('/pricehistory'))return Response.json({candles:bars});
  if(url.pathname.endsWith('/chains'))return Response.json(chain);
  if(url.pathname.endsWith('/quotes')){
   const sym=url.searchParams.get('symbols');
   return Response.json({[sym]:{realtime:true,quote:{lastPrice:liveLast,bidPrice:1.95,askPrice:2,quoteTime:now}}});
  }
  throw Error('Unexpected fixture endpoint: '+url.pathname);
 };
 try{
  const {db,env}=await fixture();
  await paperApi(req(),env,owner); // Create the paper runner row before updating its fixture.
  const state=freshRunner();state.enabled=true;state.scanMode='SINGLE';state.singleTicker='SPY';
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(state));
  const first=await runPaperTick(env,owner,{scan:true,scanSymbol:'SPY'});
  assert.equal(first.lastCheck.newAlerts,0,'initial breakout candle must NOT publish an unconfirmed alert');
  assert.equal(first.priceActionChecks.SPY.status,'WAIT_NEXT_CANDLE');
  bars.push(confirm);
  const result=await runPaperTick(env,owner,{scan:true,scanSymbol:'SPY'});
  assert.equal(result.lastCheck.newAlerts,1,'two completed candles should produce a verified paper opportunity: '+JSON.stringify({lastScan:result.lastScan,check:result.lastCheck,history:result.scanHistory.slice(0,4)}));
  assert.equal(result.alerts.length,1);
  assert.equal(result.alerts[0].qualification.technical.confirmed,true);
  assert.equal(result.alerts[0].qualification.confluence.confirmed,false,'extra MACD/OBV confluence is advisory');
  assert.equal(result.alerts[0].qualification.marketData.provider,'SCHWAB');
  assert.equal(result.scanHistory[0].state,'PRICE_ACTION_SETUP_REVIEW');
  assert.equal(result.alerts[0].qualification.priceAction.confirmed,true);
  assert.equal(result.alerts[0].qualification.priceAction.breakoutBarTime,breakout.datetime);
  const repeat=await runPaperTick(env,owner,{scan:true,scanSymbol:'SPY'});
  assert.equal(repeat.lastCheck.newAlerts,0,'rechecking the same confirmed breakout cannot issue duplicate alerts');
  assert.equal(repeat.alerts.length,1);
  liveLast=confirmationClose-1;
  const invalid=await paperApi(req('accept',result.alerts[0].id),env,owner);
  assert.equal(invalid.status,409,'owner cannot approve when fresh stock price invalidates breakout');
  assert.match((await invalid.json()).error,/invalidated the confirmed breakout/);
  assert.equal((await(await paperApi(req(),env,owner)).json()).paper.positions.length,0);
  liveLast=confirmationClose;
  const accepted=await paperApi(req('accept',result.alerts[0].id),env,owner);
  assert.equal(accepted.status,200,'new fresh underlying and option quotes permit manual PAPER approval');
  const afterApproval=await accepted.json();
  assert.equal(afterApproval.paper.positions.length,1);
  assert.equal(afterApproval.realOrdersEnabled,false);
  assert.equal(result.realOrdersEnabled,false);
 }finally{Date.now=originalDate;globalThis.fetch=originalFetch}
});

test('server scanner does not depend on a paid options-flow API',()=>{
 const code=readFileSync(new URL('./paper-runner.js',import.meta.url),'utf8');
 assert.doesNotMatch(code,/getContractFlow|evaluateVerifiedFlow|FLOW_HOLD|UNUSUAL_WHALES/);
});
test('stale quote leaves emergency request pending and never fabricates fill',async()=>{const {db,env}=await fixture();const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:1.95,askPrice:2,quoteTime:now}}});try{await paperApi(req(),env,owner);const s=freshRunner();s.enabled=true;s.pending=pending();db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));await paperApi(req('accept','setup'),env,owner);globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:1.95,askPrice:2,quoteTime:now-120000}}});const held=await(await paperApi(req('close'),env,owner)).json();assert.ok(held.paper.position);assert.equal(held.closeRequested,true);assert.match(held.lastError,/fresh/)}finally{Date.now=date;globalThis.fetch=fetcher}});
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
test('distinct approvals for the same contract create independent paper lots without duplicate approval',async()=>{
 const {db,env}=await fixture();const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;
 globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:1.95,askPrice:2,quoteTime:now}}});
 try{
  await paperApi(req(),env,owner);const s=freshRunner();s.enabled=true;s.alerts=[{...pending(),id:'first',status:'PENDING'},{...pending(),id:'second',status:'PENDING'}];
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
  const entry=await paperApi(req('accept','first'),env,owner);assert.equal(entry.status,200);
  const state=await entry.json();assert.ok(state.paper.position);
  assert.equal(state.alerts.find(a=>a.id==='first').status,'TAKEN');
  assert.equal(state.alerts.find(a=>a.id==='second').status,'PENDING');
  assert.equal((await paperApi(req('accept','second'),env,owner)).status,200);const lots=await(await paperApi(req(),env,owner)).json();assert.equal(lots.paper.positions.length,2);assert.equal((await paperApi(req('accept','second'),env,owner)).status,409);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});

// Portfolio regressions: real quotes are replaced only inside this in-memory fixture.
async function portfolioFixture(count=3){
 const f=await fixture();await paperApi(req(),f.env,owner);
 const state=freshRunner();state.enabled=true;state.paper.day='2026-11-04';state.paper.dayPnl=75.7;state.paper.realized=75.7;state.paper.dayTrades=8;
 state.alerts=Array.from({length:count},(_,i)=>({...pending(),id:'alert-'+i,status:'PENDING',contract:{...pending().contract,symbol:'OPTION '+i,underlying:'STOCK'+i}}));
 f.db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(state));return f;
}
function portfolioFeed(overrides={}){return async url=>{
 const u=new URL(url);if(u.pathname.endsWith('/pricehistory'))return Response.json({candles:[]});
 const symbol=u.searchParams.get('symbols');
 const q=overrides[symbol];if(q==='unavailable')return Response.json({error:'fixture unavailable'},{status:503});
 return Response.json({[symbol]:{realtime:true,quote:{bidPrice:1.95,askPrice:2,quoteTime:now,...q}}});
}}
async function acceptPortfolio(env,count=3){for(let i=0;i<count;i++)assert.equal((await paperApi(req('accept','alert-'+i),env,owner)).status,200)}
test('three accepted contracts persist with separate marks and shared buying power beyond old cutoffs',async()=>{
 const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;globalThis.fetch=portfolioFeed();
 try{const {env}=await portfolioFixture();await acceptPortfolio(env);const state=await(await paperApi(req(),env,owner)).json();
  assert.equal(state.paper.positions.length,3);assert.equal(state.paper.cash,895.05);assert.equal(state.paper.dayTrades,11);assert.equal(state.paper.dayPnl,75.7);
  assert.equal(state.alerts.filter(a=>a.status==='TAKEN').length,3);assert.ok(state.paper.positions.every(p=>p.mark.pnl===-8.3));
  assert.equal((await paperApi(req('accept','alert-0'),env,owner)).status,409);
  for(let i=0;i<3;i++)await paperApi(req('dismiss','alert-'+i),env,owner);
  const restored=await(await paperApi(req(),env,owner)).json();assert.equal(restored.alerts.length,0);assert.equal(restored.paper.positions.length,3);assert.equal(restored.paper.cash,895.05);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});
test('close one contract leaves the others open and scanning enabled without duplicate fills',async()=>{
 const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;globalThis.fetch=portfolioFeed();
 try{const {env}=await portfolioFixture();await acceptPortfolio(env);const closed=await(await paperApi(req('close','alert-1'),env,owner)).json();
  assert.deepEqual(closed.paper.positions.map(p=>p.id),['alert-0','alert-2']);assert.equal(closed.paper.trades.length,1);assert.equal(closed.paper.trades[0].symbol,'OPTION 1');assert.equal(closed.paper.trades[0].reason,'MANUAL_CLOSE');assert.equal(closed.enabled,true);
  assert.equal((await paperApi(req('close','alert-1'),env,owner)).status,409);assert.equal((await(await paperApi(req(),env,owner)).json()).paper.trades.length,1);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});
test('Close All persists an unavailable exit while closing the other contracts independently',async()=>{
 const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;globalThis.fetch=portfolioFeed();
 try{const {env}=await portfolioFixture();await acceptPortfolio(env);globalThis.fetch=portfolioFeed({'OPTION 1':{quoteTime:now-120000}});
  const partial=await(await paperApi(req('close_all'),env,owner)).json();assert.equal(partial.paper.positions.length,1);assert.equal(partial.paper.positions[0].symbol,'OPTION 1');assert.equal(partial.paper.positions[0].closeRequested,true);assert.match(partial.paper.positions[0].lastError,/fresh/);assert.equal(partial.paper.trades.length,2);assert.equal(partial.entryEpoch,1);
  globalThis.fetch=portfolioFeed();const final=await runPaperTick(env,owner,{scan:false});assert.equal(final.paper.positions.length,0);assert.equal(final.paper.trades.length,3);assert.equal(final.closeRequested,false);assert.equal(final.paper.cash,1475.1);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});
test('a feed failure on one open contract cannot block a protective target exit on another',async()=>{
 const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;globalThis.fetch=portfolioFeed();
 try{const {env}=await portfolioFixture(2);await acceptPortfolio(env,2);globalThis.fetch=portfolioFeed({'OPTION 0':'unavailable','OPTION 1':{bidPrice:2.7,askPrice:2.75}});
  const state=await runPaperTick(env,owner,{scan:false});assert.equal(state.paper.positions.length,1);assert.equal(state.paper.positions[0].symbol,'OPTION 0');assert.equal(state.paper.trades[0].symbol,'OPTION 1');assert.equal(state.paper.trades[0].reason,'PROFIT_TARGET');assert.equal(state.lastCheck.positionsChecked,2);assert.equal(state.lastCheck.positionsUpdated,1);assert.equal(state.lastCheck.positionsClosed,1);assert.equal(state.lastCheck.holds.length,1);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});
test('legacy open position, cash and closed history migrate without reset',async()=>{
 const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;globalThis.fetch=portfolioFeed();
 try{const {env,db}=await portfolioFixture(1);const legacy=freshRunner();legacy.paper=stepPaper(newPaper(),{quote:pending().contract,enter:true,now});legacy.paper.realized=91.7;legacy.paper.trades=[{symbol:'OLD CLOSED',pnl:91.7}];legacy.closeRequested=true;legacy.mark={bid:1.95,ask:2,quoteTime:now,pnl:-8.3};
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(legacy));const migrated=await(await paperApi(req(),env,owner)).json();assert.equal(migrated.paper.positions.length,1);assert.equal(migrated.paper.cash,1298.35);assert.equal(migrated.paper.realized,91.7);assert.equal(migrated.paper.trades[0].symbol,'OLD CLOSED');assert.equal(migrated.paper.positions[0].closeRequested,true);assert.equal(migrated.paper.positions[0].mark.pnl,-8.3);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});
test('available paper cash still gates additional contracts without losing accepted trades',async()=>{
 const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;globalThis.fetch=portfolioFeed();
 try{const {env,db}=await portfolioFixture(2);const state=JSON.parse(db.prepare('SELECT payload FROM paper_runners').get().payload);state.paper.cash=300;db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(state));await acceptPortfolio(env,1);
  const rejected=await paperApi(req('accept','alert-1'),env,owner);assert.equal(rejected.status,409);assert.match((await rejected.json()).error,/Insufficient paper cash/);const after=await(await paperApi(req(),env,owner)).json();assert.equal(after.paper.positions.length,1);assert.equal(after.paper.cash,98.35);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});
test('the scanner continues checking new symbols while a paper contract is open',async()=>{
 const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;const feed=portfolioFeed();let histories=0;globalThis.fetch=async(url,options)=>{if(String(url).includes('/pricehistory'))histories++;return feed(url,options)};
 try{const {env}=await portfolioFixture(1);await acceptPortfolio(env,1);const state=await runPaperTick(env,owner);assert.equal(state.paper.positions.length,1);assert.equal(histories,10);assert.equal(state.scanHistory.length,5);assert.equal(state.lastCheck.positionsChecked,1);assert.equal(state.lastCheck.positionsUpdated,1);assert.equal(state.lastCheck.scannedSymbols.length,5);assert.equal(state.lastCheck.completedAt,now);const restored=await(await paperApi(req(),env,owner)).json();assert.equal(restored.lastCheck.id,state.lastCheck.id)}finally{Date.now=date;globalThis.fetch=fetcher}
});
test('Close All wins an in-flight approval and invalidates approvals queued under an older epoch',async()=>{
 const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;globalThis.fetch=portfolioFeed();
 try{const {env}=await portfolioFixture(2);await acceptPortfolio(env,1);let interrupted=false;const feed=portfolioFeed();globalThis.fetch=async(url,options)=>{if(!interrupted&&String(url).includes('OPTION+1')){interrupted=true;assert.equal((await paperApi(req('close_all'),env,owner)).status,200)}return feed(url,options)};
  assert.equal((await paperApi(req('accept','alert-1'),env,owner)).status,409);assert.equal(interrupted,true);const state=await(await paperApi(req(),env,owner)).json();assert.equal(state.paper.positions.length,0);assert.equal(state.paper.trades.length,1);
  const oldApproval=new Request('https://test/platform/paper',{method:'POST',headers:{Origin:'https://icomputeranything.com'},body:JSON.stringify({action:'accept',id:'alert-1',epoch:0})});const rejected=await paperApi(oldApproval,env,owner);assert.equal(rejected.status,409);assert.match((await rejected.json()).error,/Close All/);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});

test('server-backed 9:30 schedule only enables opted-in PAPER scanner once per ET day',async()=>{
 const {env}=await fixture(),originalNow=Date.now;
 try{
  let time=Date.parse('2026-11-04T14:29:00Z');Date.now=()=>time;
  await paperApi(req(),env,owner);
  assert.equal((await paperApi(req('auto_start'),env,owner)).status,409,'missing boolean must fail');
  const optIn=new Request('https://test/platform/paper',{method:'POST',headers:{Origin:'https://icomputeranything.com'},body:JSON.stringify({action:'auto_start',enabled:true})});
  assert.equal((await paperApi(optIn,env,owner)).status,200);
  let state=await runPaperTick(env,owner,{scan:false,scheduled:true});
  assert.equal(state.enabled,false,'not yet 9:30 AM ET');
  assert.equal(state.autoStart,true);
  time=Date.parse('2026-11-04T14:30:00Z');
  state=await runPaperTick(env,owner,{scan:false,scheduled:true});
  assert.equal(state.enabled,true,'server schedule actually starts scanner at 9:30 ET');
  assert.equal(state.lastAutoStartDay,'2026-11-04');
  assert.equal(state.realOrdersEnabled,false);
  assert.equal((await paperApi(req('pause'),env,owner)).status,200);
  time=Date.parse('2026-11-04T14:31:00Z');
  state=await runPaperTick(env,owner,{scan:false,scheduled:true});
  assert.equal(state.enabled,false,'manual pause must persist for the trading day');
  time=Date.parse('2026-11-05T14:30:00Z');
  state=await runPaperTick(env,owner,{scan:false,scheduled:true});
  assert.equal(state.enabled,true,'opted-in schedule resumes on the next weekday');
  const optOut=new Request('https://test/platform/paper',{method:'POST',headers:{Origin:'https://icomputeranything.com'},body:JSON.stringify({action:'auto_start',enabled:false})});
  assert.equal((await paperApi(optOut,env,owner)).status,200);
  assert.equal((await(await paperApi(req(),env,owner)).json()).autoStart,false);
 }finally{Date.now=originalNow}
});

test('legacy paper alerts without verified Schwab data and technical confluence cannot be approved',async()=>{
 const {env,db}=await fixture(),oldNow=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;
 try{
  await paperApi(req(),env,owner);
  const state=freshRunner();state.enabled=true;state.alerts=[{...pending(),qualification:undefined}];
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(state));
  globalThis.fetch=async()=>{throw Error('Legacy acceptance should not request market data')};
  const response=await paperApi(req('accept','setup'),env,owner);
  assert.equal(response.status,409);assert.match((await response.json()).error,/Verified Schwab quotes|expired|already accepted/i);
  const after=await(await paperApi(req(),env,owner)).json();
  assert.equal(after.paper.positions.length,0);
 }finally{Date.now=oldNow;globalThis.fetch=fetcher}
});

test('Single Ticker mode scans only SPY on scheduler and Run Now, and Multiple Tickers restores rotation',async()=>{
 const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;
 const scopeReq=(mode,symbol)=>new Request('https://test/platform/paper',{method:'POST',headers:{Origin:'https://icomputeranything.com'},body:JSON.stringify({action:'scan_scope',mode,symbol})});
 globalThis.fetch=async url=>{
  if(String(url).includes('/pricehistory'))return Response.json({candles:[]});
  return Response.json({});
 };
 try{
  const {env}=await fixture();
  assert.equal((await paperApi(req('start'),env,owner)).status,200);
  const single=await paperApi(scopeReq('SINGLE','spy'),env,owner);
  assert.equal(single.status,200);
  let state=await single.json();
  assert.equal(state.scanMode,'SINGLE');assert.equal(state.singleTicker,'SPY');assert.deepEqual(state.scanUniverse,['SPY']);
  state=await runPaperTick(env,owner);
  assert.deepEqual(state.lastCheck.scannedSymbols,['SPY'],'Run Now should scan only the requested symbol');
  state=await runPaperTick(env,owner,{scheduled:true});
  assert.deepEqual(state.lastCheck.scannedSymbols,['SPY'],'scheduled checks use the same scope');
  state=await(await paperApi(req(),env,owner)).json();
  assert.equal(state.singleTicker,'SPY','scope is server-persisted across reloads');
  assert.equal((await paperApi(scopeReq('SINGLE','SPY;QQQ'),env,owner)).status,409);
  assert.equal((await paperApi(scopeReq('UNKNOWN','SPY'),env,owner)).status,409);
  const multiple=await paperApi(scopeReq('MULTI'),env,owner);assert.equal(multiple.status,200);
  state=await runPaperTick(env,owner);
  assert.deepEqual(state.lastCheck.scannedSymbols,['SPY','QQQ','IWM','DIA','XLK']);
  assert.ok(state.scanUniverse.length>1);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});
test('Single Ticker scope invalidates unrelated pending setups but preserves open paper positions',async()=>{
 const originalNow=Date.now;Date.now=()=>now;
 try{
 const {env,db}=await fixture();await paperApi(req(),env,owner);
 const state=freshRunner();state.enabled=true;
 state.alerts=[{...pending(),id:'other',status:'PENDING',contract:{...pending().contract,underlying:'QQQ'}}];
 const quote={symbol:'QQQ PAPER 400 C',underlying:'QQQ',bid:1.95,ask:2,quoteTime:now,delta:0.5,volume:200,openInterest:500};
 state.paper=stepPaper(state.paper,{quote,enter:true,now});
 db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(state));
 const request=new Request('https://test/platform/paper',{method:'POST',headers:{Origin:'https://icomputeranything.com'},body:JSON.stringify({action:'scan_scope',mode:'SINGLE',symbol:'SPY'})});
 const updated=await paperApi(request,env,owner);
 assert.equal(updated.status,200);
 const after=await updated.json();
 assert.equal(after.alerts[0].status,'OUT_OF_SCOPE');
 assert.equal(after.paper.positions.length,1);
 assert.equal(after.paper.positions[0].underlying,'QQQ');
 assert.equal((await paperApi(req('accept','other'),env,owner)).status,409,'out-of-scope approvals must fail closed');
 }finally{Date.now=originalNow}
});

test('owner saves adjustable risk for future paper entries without rewriting open positions',async()=>{
 const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;
 const request=id=>new Request('https://test/platform/paper',{method:'POST',
  headers:{Origin:'https://icomputeranything.com'},body:JSON.stringify({action:'stop_settings',id})});
 try{
  const {db,env}=await fixture();
  assert.equal((await paperApi(req(),env,owner)).status,200);
  let result=await paperApi(request(35),env,owner);
  assert.equal(result.status,200);
  assert.equal((await result.json()).stopLossPct,35);
  assert.equal((await paperApi(request(80),env,owner)).status,409,'invalid large loss is rejected');
  const s=JSON.parse(db.prepare('SELECT payload FROM paper_runners').get().payload);
  s.enabled=true;s.pending=pending();db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
  globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,
   quote:{bidPrice:1.95,askPrice:2,quoteTime:now}}});
  const accepted=await paperApi(req('accept','setup'),env,owner);
  assert.equal(accepted.status,200);
  const entered=await accepted.json();
  assert.equal(entered.paper.positions[0].stopLossPct,35);
  result=await paperApi(request(50),env,owner);
  assert.equal(result.status,200,'default may be changed even with a paper trade open');
  const changed=await result.json();
  assert.equal(changed.stopLossPct,50);
  assert.equal(changed.paper.positions[0].stopLossPct,35,'open trade retains saved entry risk');
 }finally{Date.now=date;globalThis.fetch=fetcher}
});

test('stream-origin GOOGL scan is deduplicated across DO restarts using persisted per-symbol coverage',async()=>{
 const originalDate=Date.now,originalFetch=globalThis.fetch;
 // Match the valid, fixture-sealed Schwab token date, not the next day.
 let clock=now,historyRequests=0;
 Date.now=()=>clock;
 globalThis.fetch=async input=>{
  const pathname=new URL(input).pathname;
  if(pathname.endsWith('/pricehistory')){historyRequests++;return Response.json({candles:[]})}
  return Response.json({});
 };
 try{
  const {db,env}=await fixture();
  await paperApi(req(),env,owner);
  const state=freshRunner();state.enabled=true;state.scanMode='MULTI';
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(state));
  const first=await runPaperTick(env,owner,{scan:true,scanSymbol:'GOOGL'});
  assert.deepEqual(first.lastCheck.scannedSymbols,['GOOGL']);
  assert.equal(first.scanCoverage.GOOGL.scansToday,1);
  // First check fetches 1-minute OHLCV and once-per-day daily OHLCV.
  const fetchedFirst=historyRequests;
  assert.ok(fetchedFirst>=1,'first check must request Schwab market history');
  clock+=30000;
  const duplicate=await runPaperTick(env,owner,{scan:true,scanSymbol:'GOOGL'});
  assert.deepEqual(duplicate.lastCheck.scannedSymbols,[],'same completed candles should not be scanned a second time');
  assert.equal(duplicate.scanCoverage.GOOGL.scansToday,1);
  assert.equal(historyRequests,fetchedFirst,'no second Schwab history fetch after 30 seconds');
  clock+=31000;
  const renewed=await runPaperTick(env,owner,{scan:true,scanSymbol:'GOOGL'});
  assert.deepEqual(renewed.lastCheck.scannedSymbols,['GOOGL']);
  assert.equal(renewed.scanCoverage.GOOGL.scansToday,2);
  assert.ok(historyRequests>fetchedFirst,'once the cooldown passes, the fresh-minute scan resumes');
 }finally{Date.now=originalDate;globalThis.fetch=originalFetch}
});

test('manual Run Scan uses the same owner Durable Object scan coordinator as streaming',async()=>{
 const {env}=await fixture(),calls=[];
 env.PAPER_QUOTE_STREAM={getByName:key=>({
  runRotation:async(...args)=>{calls.push({key,args});return {source:'COORDINATED',scannedSymbols:['SPY']}}
 })};
 const result=await paperApi(req('tick'),env,owner);
 assert.equal(result.status,200);
 assert.equal((await result.json()).source,'COORDINATED');
 assert.deepEqual(calls,[{key:owner.id,args:[owner.id,null,false]}]);
});

test('Friday Nov 6 9:30 cron persists auto-start independently of Schwab feed and protects manual pause',async()=>{
 const {env,db}=await fixture();
 await paperApi(req(),env,owner);
 const s=freshRunner();
 s.autoStart=true;
 s.enabled=false;
 s.lastAutoStartDay='2026-11-05';
 db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
 const fridayPre=Date.parse('2026-11-06T14:29:59Z');
 const fridayOpen=Date.parse('2026-11-06T14:30:00Z');
 assert.equal(await ensureDailyPaperAutoStart(env,owner,fridayPre),false);
 assert.equal((await(await paperApi(req(),env,owner)).json()).enabled,false);
 assert.equal(await ensureDailyPaperAutoStart(env,owner,fridayOpen),true);
 const started=await(await paperApi(req(),env,owner)).json();
 assert.equal(started.enabled,true,'scanner persisted ENABLED before any remote Schwab connection');
 assert.equal(started.autoStart,true);
 assert.equal(started.lastAutoStartDay,'2026-11-06');
 assert.equal(started.lastAutoStartAt,fridayOpen);
 assert.equal(started.realOrdersEnabled,false,'never enable live Schwab brokerage orders');
 assert.equal(await ensureDailyPaperAutoStart(env,owner,fridayOpen+20000),false,'same day starts only once');
 // A paused scanner should remain paused through the rest of Friday.
 const paused={...started,enabled:false,lastAutoStartDay:'2026-11-06'};
 db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(paused));
 assert.equal(await ensureDailyPaperAutoStart(env,owner,Date.parse('2026-11-06T14:35:00Z')),false);
 assert.equal((await(await paperApi(req(),env,owner)).json()).enabled,false);
 // No weekend auto-start. Next market day resumes without browser interaction.
 assert.equal(await ensureDailyPaperAutoStart(env,owner,Date.parse('2026-11-07T14:30:00Z')),false);
 assert.equal(await ensureDailyPaperAutoStart(env,owner,Date.parse('2026-11-09T14:30:00Z')),true);
 const monday=await(await paperApi(req(),env,owner)).json();
 assert.equal(monday.lastAutoStartDay,'2026-11-09');
 assert.equal(monday.enabled,true);
});

test('all built-in watchlist categories are included in server-managed multiple ticker scanner',()=>{
 const state=freshRunner();
 for(const ticker of ['SPY','QQQ','TQQQ','BAC','SOFI','XOM','CVX','JPM','USO','BNO'])
  assert.ok(scannerUniverse(state).includes(ticker),ticker+' watchlist ticker missing from scanner');
 assert.equal(scannerUniverse(state).length,PAPER_SCAN_UNIVERSE.length);
 assert.ok(PAPER_SCAN_UNIVERSE.length>20);
 state.scanMode='SINGLE';state.singleTicker='BAC';
 assert.deepEqual(scannerUniverse(state),['BAC'],'Single Ticker still intentionally scans just one');
});

test('watchlist add/merge/remove updates exactly the same durable server scanner extras even with an open paper position',async()=>{
 const {env,db}=await fixture();
 await paperApi(req(),env,owner);
 const runner=freshRunner();runner.enabled=true;runner.autoStart=true;
 runner.paper.positions=[{id:'existing',symbol:'FAKE 261106C',time:now,closeRequested:false}];
 db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(runner));
 const request=(operation,{symbol,symbols}={})=>new Request('https://test/platform/paper',{
  method:'POST',headers:{Origin:'https://icomputeranything.com','Content-Type':'application/json'},
  body:JSON.stringify({action:'watchlist_update',operation,...(symbol?{symbol}:{}),...(symbols?{symbols}:{})})
 });
 let result=await paperApi(request('add',{symbol:'SMCI'}),env,owner);
 assert.equal(result.status,200);
 let s=await result.json();
 assert.deepEqual(s.extraSymbols,['SMCI']);
 assert.ok(s.scanUniverse.includes('SMCI'),'user-added Favorite is in the scheduled scan universe');
 assert.equal(s.paper.positions.length,1,'existing open paper position survives watchlist addition');
 assert.equal(s.autoStart,true,'9:30 auto-start remains enabled');
 result=await paperApi(request('merge',{symbols:['SMCI','UBER','BAC']}),env,owner);
 assert.equal(result.status,200);
 s=await result.json();
 assert.deepEqual(s.extraSymbols,['SMCI','UBER'],'already covered base tickers are not duplicated');
 assert.ok(s.scanUniverse.includes('UBER'));
 assert.equal((await paperApi(request('add',{symbol:'SMCI'}),env,owner)).status,200,'duplicate add is idempotent');
 result=await paperApi(request('remove',{symbol:'SMCI'}),env,owner);
 assert.equal(result.status,200);
 s=await result.json();
 assert.deepEqual(s.extraSymbols,['UBER']);
 assert.equal(s.scanUniverse.includes('SMCI'),false);
 const persisted=await(await paperApi(req(),env,owner)).json();
 assert.deepEqual(persisted.extraSymbols,['UBER']);
 assert.equal(persisted.paper.positions.length,1);
 assert.equal(persisted.autoStart,true);
 assert.equal(persisted.realOrdersEnabled,false);
 const invalid=await paperApi(request('merge',{symbols:['AA$']}),env,owner);
 assert.equal(invalid.status,409,'invalid symbols must be rejected');
 assert.deepEqual((await(await paperApi(req(),env,owner)).json()).extraSymbols,['UBER']);
});

test('adding NVDA to Favorites persists even though base scanner already covers it',async()=>{
 const {env}=await fixture();await paperApi(req(),env,owner);
 const post=operation=>new Request('https://test/platform/paper',{method:'POST',
  headers:{Origin:'https://icomputeranything.com','Content-Type':'application/json'},
  body:JSON.stringify({action:'watchlist_update',operation,symbol:'NVDA'})});
 const added=await paperApi(post('add'),env,owner);
 assert.equal(added.status,200);
 const state=await added.json();
 assert.deepEqual(state.extraSymbols,['NVDA']);
 assert.equal(state.scanUniverse.filter(v=>v==='NVDA').length,1);
 assert.deepEqual((await(await paperApi(req(),env,owner)).json()).extraSymbols,['NVDA']);
 const removed=await paperApi(post('remove'),env,owner);
 assert.equal(removed.status,200);
 const after=await removed.json();
 assert.deepEqual(after.extraSymbols,[]);
 assert.ok(after.scanUniverse.includes('NVDA'),'core scanner remains independent of custom Favorite membership');
});

test('twin scanner cards can select any independent custom ticker list with separate, persisted engine settings',async()=>{
 const {env,db}=await fixture();await paperApi(req(),env,owner);
 const s=freshRunner();s.enabled=true;s.autoStart=true;
 s.paper.positions=[{id:'held',symbol:'HELD OPTION',time:now,closeRequested:false}];
 db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
 const change=payload=>new Request('https://test/platform/paper',{method:'POST',
  headers:{Origin:'https://icomputeranything.com','Content-Type':'application/json'},
  body:JSON.stringify({action:'scanner_engine',...payload})});
 let resp=await paperApi(change({engine:'FOCUS',enabled:true,scope:'CUSTOM',symbols:['SPY','TSLA']}),env,owner);
 assert.equal(resp.status,200);let state=await resp.json();
 assert.deepEqual(state.scanEngines.FOCUS.universe,['SPY','TSLA']);
 assert.equal(state.scanEngines.FOCUS.enabled,true);
 assert.equal(state.scanEngines.MAIN.enabled,true);
 assert.ok(state.scanEngines.MAIN.universe.includes('AMD'));
 assert.ok(scannerStreamUniverse(state).includes('SPY'));
 assert.equal(state.paper.positions.length,1);
 assert.equal(state.autoStart,true);
 resp=await paperApi(change({engine:'MAIN',enabled:true,scope:'CUSTOM',symbols:['GOOGL','BAC','NVDA']}),env,owner);
 assert.equal(resp.status,200);state=await resp.json();
 assert.deepEqual(state.scanEngines.MAIN.universe,['GOOGL','BAC','NVDA']);
 assert.deepEqual(state.scanEngines.FOCUS.universe,['SPY','TSLA']);
 assert.deepEqual(state.scanUniverse,['SPY','TSLA','GOOGL','BAC','NVDA']);
 assert.equal(state.realOrdersEnabled,false);
 const persisted=await(await paperApi(req(),env,owner)).json();
 assert.deepEqual(persisted.scanEngines.FOCUS.universe,['SPY','TSLA']);
 assert.equal(persisted.paper.positions.length,1);
 assert.equal((await paperApi(change({engine:'FOCUS',enabled:true,scope:'CUSTOM',symbols:[]}),env,owner)).status,409);
 assert.deepEqual((await(await paperApi(req(),env,owner)).json()).scanEngines.FOCUS.universe,['SPY','TSLA']);
});
test('fast scalp uses honest bid/ask P&L and refuses wide bid/ask spread',()=>{
 const q={symbol:'SPY TEST',bid:1.95,ask:2,delta:.5,volume:500,openInterest:1200};
 const estimate=paperOptionEntryEstimate(q);
 assert.equal(estimate.spreadPct,2.5);
 assert.equal(estimate.cost,201.65);
 assert.equal(estimate.immediatePnl,-8.30);
 assert.equal(estimate.breakevenBid,2.033);
 assert.equal(paperQuoteQualityFailure(q,350),null);
 assert.equal(paperQuoteQualityFailure({...q,bid:1.84},350),'SPREAD_TOO_WIDE');
 assert.equal(paperNeedsPriceConfirmation(2,2.08,null),true);
 assert.equal(paperNeedsPriceConfirmation(2,1.90,null),false);
 assert.equal(paperNeedsPriceConfirmation(2,2.08,2.08),false);
 assert.equal(paperNeedsPriceConfirmation(2,2.09,2.08),true);
});
test('a 2% higher ask becomes explicit fresh paper reprice review, not a discarded alert',async()=>{
 const {env,db}=await fixture();const date=Date.now,fetcher=globalThis.fetch;Date.now=()=>now;
 try{
  await paperApi(req(),env,owner);
  const s=freshRunner();s.enabled=true;s.alerts=[{...pending(),status:'PENDING'}];
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
  globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:2.05,askPrice:2.10,quoteTime:now}}});
  const review=await paperApi(req('accept','setup'),env,owner);
  assert.equal(review.status,409);
  const info=await review.json();
  assert.equal(info.code,'REQUOTE_REVIEW');
  assert.equal(info.requote.ask,2.1);
  assert.equal(info.requote.estimate.cost,211.65);
  assert.equal((await(await paperApi(req(),env,owner)).json()).alerts[0].status,'PENDING','alert stays actionable');
  const confirm=new Request('https://test/platform/paper',{method:'POST',
   headers:{Origin:'https://icomputeranything.com'},
   body:JSON.stringify({action:'accept',id:'setup',maxApprovedAsk:2.10})});
  const approved=await paperApi(confirm,env,owner);
  assert.equal(approved.status,200,JSON.stringify(await approved.clone().json()));
  const state=await approved.json();
  assert.equal(state.paper.positions.length,1);
  assert.equal(state.paper.positions[0].cost,211.65);
  assert.equal(state.realOrdersEnabled,false);
 }finally{Date.now=date;globalThis.fetch=fetcher;}
});
test('manual stop/time override requires explicit confirmation and cannot evade reached stop',async()=>{
 const {env,db}=await fixture();const date=Date.now,fetcher=globalThis.fetch;
 Date.now=()=>now;let bid=1.95;
 try{
  await paperApi(req(),env,owner);
  const s=freshRunner();s.enabled=true;s.paper.positions=[{
   id:'active',symbol:'TEST OPTION',underlying:'SPY',time:now-25*60000,
   day:'2026-11-04',expiration:'2026-11-04',fill:2.01,stopLossPct:20,
   maxHoldMinutes:30,closeRequested:false,mark:{bid,ask:2,quoteTime:now},cost:201.65
  }];
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
  globalThis.fetch=async()=>Response.json({'TEST OPTION':{realtime:true,quote:{bidPrice:bid,askPrice:bid+0.05,quoteTime:now}}});
  const command=(operation,more={})=>new Request('https://test/platform/paper',{method:'POST',
   headers:{Origin:'https://icomputeranything.com'},
   body:JSON.stringify({action:'position_override',id:'active',operation,...more})});
  assert.equal((await paperApi(command('EXTEND_TIME'),env,owner)).status,409);
  let response=await paperApi(command('EXTEND_TIME',{confirmOverride:true}),env,owner);
  assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
  assert.equal((await response.json()).paper.positions[0].maxHoldMinutes,40);
  response=await paperApi(command('CHANGE_STOP',{stopLossPct:35,confirmOverride:true}),env,owner);
  assert.equal(response.status,200);
  assert.equal((await response.json()).paper.positions[0].stopLossPct,35);
  bid=1.2; // already crosses 35% stop on 2.01 fill.
  response=await paperApi(command('CHANGE_STOP',{stopLossPct:50,confirmOverride:true}),env,owner);
  assert.equal(response.status,409,'cannot override a stop after the bid already crosses it');
  assert.equal((await(await paperApi(req(),env,owner)).json()).paper.positions[0].stopLossPct,35);
 }finally{Date.now=date;globalThis.fetch=fetcher}
});

test('two scanner lanes rotate actual different ticker batches, dedupe overlaps and retain independent per-engine coverage',async()=>{
 const originalDate=Date.now,originalFetch=globalThis.fetch;
 Date.now=()=>now;
 try{
  const {db,env}=await fixture();await paperApi(req(),env,owner);
  const s=freshRunner();s.enabled=true;s.scanMode='MULTI';
  s.scannerEngines={MAIN:{enabled:true,scope:'CUSTOM',symbols:['SPY','QQQ','AAPL']},
   FOCUS:{enabled:true,scope:'CUSTOM',symbols:['SPY','TSLA']}};
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
  // A provider hold must be reported, never fabricated as a positive setup.
  globalThis.fetch=async()=>Response.json({candles:[]});
  const first=await runPaperTick(env,owner,{scan:true,scanLane:'BOTH'});
  assert.deepEqual(first.lastCheck.scannedSymbols,['SPY','QQQ','AAPL','TSLA']);
  assert.deepEqual(first.lastCheck.enginePasses.MAIN,['SPY','QQQ','AAPL']);
  assert.deepEqual(first.lastCheck.enginePasses.FOCUS,['SPY','TSLA']);
  assert.equal(first.scanIndex,3);
  assert.equal(first.focusScanIndex,2);
  assert.ok(first.scanEngines.MAIN.coverage.SPY);
  assert.ok(first.scanEngines.FOCUS.coverage.SPY);
  assert.ok(first.scanEngines.FOCUS.coverage.TSLA);
  assert.equal(first.scanEngines.MAIN.coverage.TSLA,undefined,
   'focus-only stock must not appear as visited by MAIN');
  const focusOnly=await runPaperTick(env,owner,{scan:true,scanLane:'FOCUS'});
  assert.deepEqual(focusOnly.lastCheck.scannedSymbols,['SPY','TSLA']);
  assert.equal(focusOnly.scanIndex,3,'focused pass cannot advance main rotation cursor');
  assert.equal(focusOnly.focusScanIndex,4);
  assert.equal(focusOnly.realOrdersEnabled,false);
 }finally{Date.now=originalDate;globalThis.fetch=originalFetch}
});

test('disabled focus lane cannot erase last real ticker scan and original verified coverage migrates to main',async()=>{
 const {env,db}=await fixture(),originalDate=Date.now,originalFetch=globalThis.fetch;
 Date.now=()=>now;
 try{
  await paperApi(req(),env,owner);
  const s=freshRunner();s.enabled=true;s.scanMode='MULTI';
  s.lastCheck={id:'genuine',scannedSymbols:['SPY','QQQ'],completedAt:now-1000};
  s.scanCoverage={SPY:{day:'2026-11-04',checkedAt:now-30000,state:'WAIT',source:'ROTATION',scansToday:3},
   QQQ:{day:'2026-11-04',checkedAt:now-30000,state:'WATCH',source:'ROTATION',scansToday:2}};
  s.engineCoverage={MAIN:{},FOCUS:{}};
  db.prepare('UPDATE paper_runners SET payload=?').run(JSON.stringify(s));
  globalThis.fetch=async()=>Response.json({candles:[]});
  const state=await runPaperTick(env,owner,{scan:true,scanLane:'FOCUS'});
  assert.deepEqual(state.lastCheck.scannedSymbols,['SPY','QQQ']);
  assert.equal(state.lastCheck.id,'genuine');
  assert.deepEqual(state.lastProtectionCheck.scannedSymbols,[]);
  assert.equal(state.scanEngines.MAIN.coverage.SPY.scansToday,3);
  assert.equal(state.scanEngines.MAIN.coverage.QQQ.scansToday,2);
  assert.equal(state.scanEngines.FOCUS.coverage.SPY,undefined);
  assert.equal(state.realOrdersEnabled,false);
 }finally{Date.now=originalDate;globalThis.fetch=originalFetch}
});
