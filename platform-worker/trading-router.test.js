import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

for(const [path,method] of [['status','GET'],['chat','POST'],['check-credits','POST']]){
 test(`trading ${path} rejects missing authentication before accessing storage`,async()=>{
  const response=await worker.fetch(new Request(`https://worker.invalid/platform/trading-ai/${path}`,{method}),{});
  assert.equal(response.status,403);
 });
 test(`trading ${path} rejects expired or non-owner sessions`,async()=>{
  for(const row of [null,{id:'customer',role:'customer',status:'active'}]){
   const DB={prepare(){return {bind(){return {first:async()=>row}}}}};
   const response=await worker.fetch(new Request(`https://worker.invalid/platform/trading-ai/${path}`,{method,headers:{Authorization:'Bearer artificial-test-session'}}),{DB});
   assert.equal(response.status,403);
  }
 });
}
test('authenticated owner can read configuration without receiving secrets',async()=>{
 const DB={prepare(){return {bind(){return {first:async()=>({id:'owner-test',role:'owner'})}}}}};
 const response=await worker.fetch(new Request('https://worker.invalid/platform/trading-ai/status',{headers:{Authorization:'Bearer artificial-test-session'}}),{DB,OPENAI_API_KEY:'not-a-real-key'});
 assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.configured,true);assert.equal(data.realOrdersEnabled,false);assert.ok(!JSON.stringify(data).includes('not-a-real-key'));
});
