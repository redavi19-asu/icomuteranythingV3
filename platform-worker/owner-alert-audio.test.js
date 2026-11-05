import test from 'node:test';
import assert from 'node:assert/strict';
import {ownerMoneyAlertApi,OWNER_MONEY_ALERT_TABLE} from './owner-alert-audio.js';
const owner={id:'authorized-owner',role:'owner'};
const asset=Uint8Array.from([0,0,0,28,102,116,121,112,77,52,65,32,0,0,0,0,77,52,65,32,105,115,111,109]);
function mockDb({stored=true}={}){
 const statements=[],record=stored?{
  audio_base64:btoa(String.fromCharCode(...asset)),mime_type:'audio/mp4'
 }:null;
 const db={prepare(sql){statements.push(sql);
  return {async run(){return {success:true}},
   bind(...params){db.params=params;return this},
   async first(){return record}}
 }};
 return {db,statements};
}
test('owner-only audio is inaccessible without authenticated owner',async()=>{
 const {db,statements}=mockDb();
 const response=await ownerMoneyAlertApi(new Request('https://api.test/platform/personal-money-alert'),{DB:db},null);
 assert.equal(response.status,403);
 assert.equal(statements.length,0);
});
test('owner can securely retrieve binary personal audio with no-cache protection',async()=>{
 const {db,statements}=mockDb();
 const response=await ownerMoneyAlertApi(new Request('https://api.test/platform/personal-money-alert'),{DB:db},owner);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('content-type'),'audio/mp4');
 assert.match(response.headers.get('cache-control'),/no-store/);
 assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[...asset]);
 assert.equal(db.params[0],owner.id);
 assert.ok(statements.includes(OWNER_MONEY_ALERT_TABLE));
});
test('no recording returns 404 without fallback to public audio',async()=>{
 const {db}=mockDb({stored:false});
 const response=await ownerMoneyAlertApi(new Request('https://api.test/platform/personal-money-alert'),{DB:db},owner);
 assert.equal(response.status,404);
});
test('cross-origin destructive access is rejected',async()=>{
 const {db,statements}=mockDb();
 const response=await ownerMoneyAlertApi(new Request('https://api.test/platform/personal-money-alert',{
  method:'DELETE',headers:{Origin:'https://attacker.example'}
 }),{DB:db},owner);
 assert.equal(response.status,403);
 assert.equal(statements.some(x=>x.startsWith('DELETE')),false);
});
test('owner can clear their own audio from approved ICA origin',async()=>{
 const {db,statements}=mockDb();
 const response=await ownerMoneyAlertApi(new Request('https://api.test/platform/personal-money-alert',{
  method:'DELETE',headers:{Origin:'https://icomputeranything.com'}
 }),{DB:db},owner);
 assert.equal(response.status,200);
 assert.equal(db.params[0],owner.id);
 assert.ok(statements.some(x=>x.startsWith('DELETE')));
});
