// Isolated test fixtures, never served as market prices or trading results.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './index.js';
import {schwabMarket,schwabPreflight,schwabConnectionStatus,schwabCallback,schwabAuthorize,schwabQuotes,schwabDisconnect,sealTokens,openTokens,SCHWAB_CALLBACK_URL} from './schwab-connection.js';
const owner={id:'test-owner',role:'owner'};
const request=(path,method='GET',origin='https://icomputeranything.com')=>new Request('https://worker.invalid/platform/schwab/'+path,{method,headers:{Authorization:'Bearer artificial-session',Origin:origin}});
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('./migrations/0007_schwab_market_data.sql',import.meta.url),'utf8'));
 sqlite.exec(readFileSync(new URL('./migrations/0008_schwab_connection_diagnostics.sql',import.meta.url),'utf8'));
 sqlite.exec("CREATE TABLE users(id TEXT,role TEXT,status TEXT);CREATE TABLE sessions(id TEXT,user_id TEXT,expires_at INTEGER);INSERT INTO users VALUES('test-owner','owner','active');");
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('artificial-session'))),b=>b.toString(16).padStart(2,'0')).join('');
 sqlite.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash,owner.id,Date.now()+3600000);
 const DB={prepare(sql){let args=[];const stmt={bind(...v){args=v;return stmt},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}};return stmt},async batch(stmts){sqlite.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 return {sqlite,env:{DB,SCHWAB_APP_KEY:'test-client',SCHWAB_APP_SECRET:'test-secret',SCHWAB_TOKEN_ENCRYPTION_KEY:btoa(String.fromCharCode(...new Uint8Array(32).fill(7)))}};
}
async function begin(env){const r=await schwabAuthorize(request('authorize','POST'),env,owner);assert.equal(r.status,200);const d=await r.json();return new URL(d.authorizationUrl).searchParams.get('state')}
const callback=state=>new Request(SCHWAB_CALLBACK_URL+'?state='+state+'&code=artificial-code');
const tokenResponse=()=>Response.json({access_token:'test-access',refresh_token:'test-refresh',expires_in:1800});

test('callback rejects unsolicited codes without reflection or persistence',async()=>{
 const r=await worker.fetch(new Request(SCHWAB_CALLBACK_URL+'?code=private-test-code&state=untrusted'),{});
 assert.equal(r.status,400);assert.ok(!(await r.text()).includes('private-test-code'));assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');
});
for(const [path,method] of [['history','GET'],['options','GET'],['preflight','POST'],['status','GET'],['authorize','POST'],['quotes','GET'],['disconnect','POST']])test(path+' denies unauthenticated access',async()=>{
 assert.equal((await worker.fetch(new Request('https://worker.invalid/platform/schwab/'+path,{method}),{})).status,403);
});
test('credentials alone never claim an authorized data connection',async()=>{
 const {env}=await fixture();const d=await(await schwabConnectionStatus(env,owner)).json();assert.equal(d.authorizationReady,true);assert.equal(d.connected,false);assert.equal(d.realOrdersEnabled,false);assert.ok(!JSON.stringify(d).includes('test-secret'));
});
test('cross-origin initiation is denied and state is tied to active owner session',async()=>{
 const {env,sqlite}=await fixture();assert.equal((await schwabAuthorize(request('authorize','POST','https://attacker.invalid'),env,owner)).status,403);
 const state=await begin(env);const row=sqlite.prepare('SELECT * FROM schwab_oauth_states').get();assert.notEqual(row.state_hash,state);assert.equal(row.owner_id,owner.id);assert.equal(row.state_hash.length,64);
 const url=new URL((await(await schwabAuthorize(request('authorize','POST'),env,owner)).json()).authorizationUrl);assert.equal(url.searchParams.get('scope'),'readonly');assert.equal(url.searchParams.get('redirect_uri'),SCHWAB_CALLBACK_URL);
});
test('valid callback exchanges once, encrypts tokens, and redirects only to ICA Master',async()=>{
 const {env,sqlite}=await fixture();const state=await begin(env);const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.schwabapi.com/v1/oauth/token');assert.equal(new URLSearchParams(options.body).get('code'),'artificial-code');return tokenResponse()};
 try{const r=await schwabCallback(callback(state),env);assert.equal(r.status,303);assert.equal(new URL(r.headers.get('Location')).origin,'https://icomputeranything.com');const payload=sqlite.prepare('SELECT payload FROM schwab_connections').get().payload;assert.ok(!payload.includes('test-access'));assert.equal((await openTokens(env,owner.id,payload)).refresh_token,'test-refresh');assert.equal((await schwabCallback(callback(state),env)).status,400);assert.equal(calls,1)}finally{globalThis.fetch=original}
});
test('expired state and revoked owner session cannot exchange a code',async()=>{
 for(const reason of ['expired','revoked']){const {env,sqlite}=await fixture();const state=await begin(env);if(reason==='expired')sqlite.exec('UPDATE schwab_oauth_states SET expires_at=0');else sqlite.exec('DELETE FROM sessions');const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Provider must not be called')};try{assert.equal((await schwabCallback(callback(state),env)).status,400)}finally{globalThis.fetch=original}}
});
test('tokens are authenticated to the owner and tampering is rejected',async()=>{
 const {env}=await fixture();const encrypted=await sealTokens(env,owner.id,{access_token:'private-test'});await assert.rejects(()=>openTokens(env,'other-owner',encrypted));const d=JSON.parse(encrypted);d.data='AAAA'+d.data.slice(4);await assert.rejects(()=>openTokens(env,owner.id,JSON.stringify(d)));
});
test('disconnect during token exchange prevents the callback from reconnecting it',async()=>{
 const {env,sqlite}=await fixture();const state=await begin(env);const original=globalThis.fetch;
 globalThis.fetch=async()=>{await schwabDisconnect(request('disconnect','POST'),env,owner);return tokenResponse()};
 try{assert.equal((await schwabCallback(callback(state),env)).status,409);assert.equal(sqlite.prepare('SELECT payload FROM schwab_connections').get().payload,null)}finally{globalThis.fetch=original}
});
test('quotes use only market data GET and return no credentials',async()=>{
 const {env}=await fixture();const state=await begin(env);const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{if(String(url).includes('/oauth/token'))return tokenResponse();assert.equal(new URL(url).pathname,'/marketdata/v1/quotes');assert.equal(options.method,undefined);return Response.json({SPY:{realtime:false,quote:{lastPrice:100,bidPrice:99.99,askPrice:100.01,quoteTime:1700000000000}}})};
 try{await schwabCallback(callback(state),env);const r=await schwabQuotes(request('quotes?symbols=SPY'),env,owner);const d=await r.json();assert.equal(d.quotes[0].last,100);assert.equal(d.quotes[0].realtime,false);assert.ok(!JSON.stringify(d).includes('test-access'));assert.equal(d.realOrdersEnabled,false)}finally{globalThis.fetch=original}
});
test('expired access token refresh is serialized and rotation is persisted',async()=>{
 const {env,sqlite}=await fixture();await begin(env);const expired=await sealTokens(env,owner.id,{access_token:'old-access',refresh_token:'old-refresh',expires_at:0,authorized_at:1});sqlite.prepare('UPDATE schwab_connections SET payload=?').run(expired);const original=globalThis.fetch;let refreshed=0;
 globalThis.fetch=async(url,options)=>{if(String(url).includes('/oauth/token')){refreshed++;assert.equal(new URLSearchParams(options.body).get('refresh_token'),'old-refresh');return Response.json({access_token:'new-access',refresh_token:'new-refresh',expires_in:1800})}return Response.json({})};
 try{assert.equal((await schwabQuotes(request('quotes'),env,owner)).status,200);assert.equal(refreshed,1);const row=sqlite.prepare('SELECT * FROM schwab_connections').get();assert.equal((await openTokens(env,owner.id,row.payload)).refresh_token,'new-refresh');assert.equal(row.refresh_lock_until,0)}finally{globalThis.fetch=original}
});


test('rejected refresh clears the stored authorization rather than reporting connected',async()=>{
 const {env,sqlite}=await fixture();await begin(env);const expired=await sealTokens(env,owner.id,{access_token:'old-access',refresh_token:'old-refresh',expires_at:0});sqlite.prepare('UPDATE schwab_connections SET payload=?').run(expired);const original=globalThis.fetch;globalThis.fetch=async()=>new Response('rejected',{status:400});
 try{assert.equal((await schwabQuotes(request('quotes'),env,owner)).status,503);assert.equal(sqlite.prepare('SELECT payload FROM schwab_connections').get().payload,null);assert.equal((await(await schwabConnectionStatus(env,owner)).json()).connected,false)}finally{globalThis.fetch=original}
});


test('token exchange records only safe diagnostic codes, never provider messages',async()=>{
 const {env,sqlite}=await fixture();const state=await begin(env);const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({error:'invalid_client',error_description:'private-test-token'}, {status:401});
 try{const r=await schwabCallback(callback(state),env);assert.equal(r.status,502);const text=await r.text();assert.match(text,/HTTP 401, invalid_client/);assert.ok(!text.includes('private-test-token'));const row=sqlite.prepare('SELECT * FROM schwab_connection_diagnostics').get();assert.equal(row.stage,'token_exchange');assert.equal(row.error_code,'invalid_client');assert.ok(!JSON.stringify(row).includes('private-test-token'))}finally{globalThis.fetch=original}
});

test('preflight uses manual redirects and invalid code without storing tokens',async()=>{
 const {env,sqlite}=await fixture();const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{assert.equal(options.redirect,'manual');assert.equal(new URLSearchParams(options.body).get('refresh_token'),'ica-connection-test-invalid-refresh-token');return Response.json({error:'invalid_grant'},{status:400})};
 try{const r=await schwabPreflight(request('preflight','POST'),env,owner);assert.equal(r.status,200);assert.equal((await r.json()).ready,true);assert.equal(sqlite.prepare('SELECT count(*) n FROM schwab_connections').get().n,0)}finally{globalThis.fetch=original}
});
test('preflight fails closed on redirects and bad client credentials',async()=>{
 const {env}=await fixture();const original=globalThis.fetch;
 for(const response of [new Response(null,{status:302,headers:{Location:'https://untrusted.invalid'}}),Response.json({error:'invalid_client'},{status:401})]){
 globalThis.fetch=async(url,options)=>{assert.equal(options.redirect,'manual');return response};
 try{assert.equal((await schwabPreflight(request('preflight','POST'),env,owner)).status,503)}finally{globalThis.fetch=original}
 }
});

test('market adapters constrain destinations and strip provider fields',async()=>{
 const {env}=await fixture();const state=await begin(env);const original=globalThis.fetch;
 globalThis.fetch=async()=>tokenResponse();await schwabCallback(callback(state),env);
 globalThis.fetch=async(url,opts)=>{assert.equal(opts.redirect,'manual');assert.equal(new URL(url).origin,'https://api.schwabapi.com');return Response.json({candles:[{datetime:1,open:2,high:3,low:1,close:2,volume:5}],callExpDateMap:{'2026-11-06:2':{'100':[{symbol:'TEST',strikePrice:100,bid:1,ask:2,privateField:'never-return'}]}}})};
 try{const h=await(await schwabMarket(request('history?symbol=SPY'),env,owner,'history')).json();assert.equal(h.candles.length,1);const c=await(await schwabMarket(request('options?symbol=SPY'),env,owner,'options')).json();assert.equal(c.contracts[0].side,'CALL');assert.ok(!JSON.stringify(c).includes('never-return'));assert.equal((await schwabMarket(request('history?frequency=999'),env,owner,'history')).status,400)}finally{globalThis.fetch=original}
});
