import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { parseGrantInput, saveFreeAccess, revokeFreeAccess, readFreeAccess } from './access-grants.js';
import worker from './index.js';

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('./migrations/0005_email_access_grants.sql', import.meta.url), 'utf8'));
  sqlite.exec(`CREATE TABLE platform_events(id TEXT,event_type TEXT,user_id TEXT,message TEXT,severity TEXT,created_at INTEGER);
    CREATE TABLE users(id TEXT,email TEXT,display_name TEXT,role TEXT,status TEXT,created_at INTEGER,last_login_at INTEGER);
    CREATE TABLE sessions(id TEXT,user_id TEXT,expires_at INTEGER);
    CREATE TABLE user_products(user_id TEXT,plan TEXT,access_status TEXT,source TEXT);
    INSERT INTO user_products VALUES ('paid','pro','active','stripe');`);
  const wrap=(sql,values=[])=>({bind:(...args)=>wrap(sql,args),first:async()=>sqlite.prepare(sql).get(...values),all:async()=>({results:sqlite.prepare(sql).all(...values)}),run:async()=>sqlite.prepare(sql).run(...values)});
  const DB={prepare:sql=>wrap(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const r=await Promise.all(statements.map(s=>s.run()));sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
  return {sqlite,DB};
}

test('email-first all-product grants expire, revoke independently and preserve paid billing', async()=>{
  const {sqlite,DB}=fixture();
  await saveFreeAccess(DB,'owner',{email:' Person@Example.com ',products:'all',expiresAt:2000},1000);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM email_access_grants').get().n,3);
  assert.ok(await readFreeAccess(DB,'PERSON@example.com','scenepilot',1999));
  assert.equal(await readFreeAccess(DB,'person@example.com','scenepilot',2000),null);
  assert.equal(await readFreeAccess(DB,'other@example.com','scenepilot',1001),null);
  await revokeFreeAccess(DB,'owner',{email:'person@example.com',products:['scenepilot']},1001);
  assert.equal(await readFreeAccess(DB,'person@example.com','scenepilot',1002),null);
  assert.ok(await readFreeAccess(DB,'person@example.com','ica-control',1002));
  await saveFreeAccess(DB,'owner',{email:'person@example.com',products:['scenepilot'],expiresAt:null},2100);
  assert.ok(await readFreeAccess(DB,'person@example.com','scenepilot',3000));
  assert.deepEqual({...sqlite.prepare('SELECT * FROM user_products').get()},{user_id:'paid',plan:'pro',access_status:'active',source:'stripe'});
  sqlite.close();
});
test('invalid dates, emails and product identifiers fail before writes',()=>{
  for(const body of [{email:'bad',products:'all'},{email:'x@y.com',products:['owner']},{email:'x@y.com',products:[]},{email:'x@y.com',products:'all',expiresAt:1000},{email:'x@y.com',products:'all',expiresAt:'2030'}]) assert.throws(()=>parseGrantInput(body,1000));
});
test('only an active Master owner can read or mutate grants',async()=>{
  const {sqlite,DB}=fixture();
  const token='unit-owner-session';
  const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
  sqlite.exec("INSERT INTO users VALUES ('owner','owner@example.com','Owner','owner','active',0,0)");
  sqlite.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash,'owner',Date.now()+60000);
  for(const method of ['GET','POST','PATCH']) {
    const r=await worker.fetch(new Request('https://unit.test/platform/free-access',{method, ...(method==='GET'?{}:{body:JSON.stringify({email:'x@y.com',products:'all'})})}),{DB});
    assert.equal(r.status,403);
  }
  const post=await worker.fetch(new Request('https://unit.test/platform/free-access',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({email:'x@y.com',products:'all'})}),{DB});
  assert.equal(post.status,200);
  sqlite.exec("UPDATE users SET role='user'");
  const denied=await worker.fetch(new Request('https://unit.test/platform/free-access',{headers:{Authorization:`Bearer ${token}`}}),{DB});
  assert.equal(denied.status,403);
  sqlite.close();
});
