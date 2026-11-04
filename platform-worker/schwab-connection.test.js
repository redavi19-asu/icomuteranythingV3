import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';
import {schwabConnectionStatus,SCHWAB_CALLBACK_URL} from './schwab-connection.js';
test('callback rejects unsolicited authorization codes without reflecting or storing them',async()=>{
 const r=await worker.fetch(new Request(SCHWAB_CALLBACK_URL+'?code=private-test-code&state=untrusted'),{});
 assert.equal(r.status,400);assert.ok(!(await r.text()).includes('private-test-code'));
 assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');
});
test('connection status requires existing owner authentication',async()=>{
 const r=await worker.fetch(new Request('https://worker.invalid/platform/schwab/status'),{});assert.equal(r.status,403);
});
test('credentials alone never claim authorized market data or permit execution',async()=>{
 const r=schwabConnectionStatus({SCHWAB_APP_KEY:'private-key',SCHWAB_APP_SECRET:'private-secret'});const d=await r.json();
 assert.equal(d.appCredentialsConfigured,true);assert.equal(d.connected,false);assert.equal(d.authorizationReady,false);assert.equal(d.realOrdersEnabled,false);assert.ok(!JSON.stringify(d).includes('private-secret'));
});
