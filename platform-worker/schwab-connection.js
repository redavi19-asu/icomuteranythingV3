// Owner-only Schwab market-data adapter. No account, position or order endpoints.
export const SCHWAB_CALLBACK_URL='https://ica-master-platform.ryanedavis.workers.dev/platform/schwab/callback';
const TOKEN_URL='https://api.schwabapi.com/v1/oauth/token';
const AUTH_URL='https://api.schwabapi.com/v1/oauth/authorize';
const MARKET_URL='https://api.schwabapi.com/marketdata/v1';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
const clean=v=>typeof v==='string'?v.trim():'';
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const sha=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))),b=>b.toString(16).padStart(2,'0')).join('');
const to64=b=>btoa(String.fromCharCode(...b));
const from64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const configured=env=>Boolean(clean(env.SCHWAB_APP_KEY)&&clean(env.SCHWAB_APP_SECRET)&&clean(env.SCHWAB_TOKEN_ENCRYPTION_KEY)&&env.DB);
function originAllowed(request){return ['https://icomputeranything.com','https://www.icomputeranything.com','https://redavi19-asu.github.io'].includes(request.headers.get('Origin'));}
async function cipherKey(env){const bytes=from64(clean(env.SCHWAB_TOKEN_ENCRYPTION_KEY));if(bytes.length!==32)throw Error('Invalid encryption configuration');return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);}
export async function sealTokens(env,ownerId,value){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(ownerId)},await cipherKey(env),new TextEncoder().encode(JSON.stringify(value)));
 return JSON.stringify({v:1,iv:to64(iv),data:to64(new Uint8Array(data))});
}
export async function openTokens(env,ownerId,value){
 const blob=JSON.parse(value);if(blob.v!==1)throw Error('Unsupported token format');
 const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(blob.iv),additionalData:new TextEncoder().encode(ownerId)},await cipherKey(env),from64(blob.data));
 return JSON.parse(new TextDecoder().decode(bytes));
}
async function boundedJson(response,max=1000000){
 if(!response.body)throw Error('Empty provider response');const reader=response.body.getReader();let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('Provider response too large')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let i=0;for(const c of chunks){bytes.set(c,i);i+=c.byteLength}return JSON.parse(new TextDecoder().decode(bytes));
}
async function exchange(env,body,previous=null){
 const r=await fetch(TOKEN_URL,{method:'POST',headers:{Authorization:'Basic '+btoa(clean(env.SCHWAB_APP_KEY)+':'+clean(env.SCHWAB_APP_SECRET)),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body),signal:AbortSignal.timeout(15000),redirect:'manual'});
 if(!r.ok){
  const error=Error('Schwab authorization was not completed. Reconnect from ICA Master.');error.providerStatus=r.status;error.safeCode='provider_http_error';
  error.providerFormat=(r.headers.get('Content-Type')||'').includes('json')?'json':'non_json';
  try{
   const detail=await boundedJson(r,16000);
   error.responseShape='error_'+typeof detail?.error;
   // Recognize only fixed OAuth categories, including nested/vendor formatting.
   const categories=['invalid_client','invalid_grant','invalid_request','unauthorized_client','unsupported_grant_type','invalid_scope','access_denied'];
   const values=[];const visit=(v,depth=0)=>{if(depth>3)return;if(typeof v==='string')values.push(v.toLowerCase().replace(/[^a-z]/g,''));else if(v&&typeof v==='object')for(const x of Object.values(v))visit(x,depth+1)};visit(detail);
   for(const category of categories)if(values.some(v=>v.includes(category.replaceAll('_','')))){error.safeCode=category;break}
  }catch(parseError){error.responseShape=parseError.name==='SyntaxError'?'invalid_json':'unreadable_response'}
  throw error;
 }
 const t=await boundedJson(r,32000);const expires=Number(t.expires_in);
 if(!clean(t.access_token)||!Number.isFinite(expires)||expires<=0||expires>86400)throw Error('Invalid authorization response');
 const refresh=clean(t.refresh_token)||previous?.refresh_token;
 if(!refresh)throw Error('Refresh token not supplied');
 return {access_token:t.access_token,refresh_token:refresh,expires_at:Date.now()+expires*1000,authorized_at:previous?.authorized_at||Date.now()};
}
// A deliberately invalid code tests server reachability/client authentication only.
// It cannot authorize an account, store tokens, or execute orders.
export async function schwabPreflight(request,env,owner){
 if(!owner?.id||owner.role!=='owner')return json({error:'Owner access required.'},403);
 if(!originAllowed(request))return json({error:'Unrecognized origin.'},403);
 if(!configured(env))return json({error:'Schwab setup is incomplete.'},503);
 try{await exchange(env,{grant_type:'refresh_token',refresh_token:'ica-connection-test-invalid-refresh-token'})}
 catch(error){
  if(error.providerStatus===400&&error.safeCode==='invalid_grant')return json({ready:true,note:'Schwab token endpoint reached; invalid test token rejected as expected. Owner authorization is still required.'});
  return json({error:'Schwab setup test failed.',providerStatus:error.providerStatus||null,errorCode:error.safeCode||'network_or_response_error',providerFormat:error.providerFormat||null,responseShape:error.responseShape||null},503);
 }
 return json({error:'Unexpected provider test response.'},503);
}
export async function schwabConnectionStatus(env,owner){
 if(!owner?.id||owner.role!=='owner')return json({error:'Owner access required.'},403);
 const hasKeys=Boolean(clean(env.SCHWAB_APP_KEY)&&clean(env.SCHWAB_APP_SECRET));
 let connected=false,expiresAt=null,lastError=null;
 if(configured(env)){
  try{await cipherKey(env);lastError=await env.DB.prepare('SELECT stage,provider_status,error_code,occurred_at FROM schwab_connection_diagnostics WHERE owner_id=?').bind(owner.id).first();const row=await env.DB.prepare('SELECT payload FROM schwab_connections WHERE owner_id=?').bind(owner.id).first();if(row?.payload){const t=await openTokens(env,owner.id,row.payload);connected=Boolean(t.refresh_token);expiresAt=new Date(t.expires_at).toISOString()}}
  catch{return json({error:'Schwab connection storage unavailable. Please try again later.'},503)}
 }
 return json({service:'schwab-market-data',appCredentialsConfigured:hasKeys,callbackUrl:SCHWAB_CALLBACK_URL,lastError,authorizationReady:configured(env),connected,accessExpiresAt:expiresAt,marketDataConnected:connected,realOrdersEnabled:false,stage:connected?'AUTHORIZED':configured(env)?'OWNER_AUTHORIZATION_REQUIRED':'CONFIGURATION_PENDING'});
}
export async function schwabAuthorize(request,env,owner){
 if(!owner?.id||owner.role!=='owner')return json({error:'Owner access required.'},403);
 if(!originAllowed(request))return json({error:'Unrecognized origin.'},403);
 if(!configured(env))return json({error:'Schwab connection is not configured yet.'},503);
 const bearer=request.headers.get('Authorization')||'';if(!bearer.startsWith('Bearer '))return json({error:'Owner session required.'},403);
 const now=Date.now(),state=random(),stateHash=await sha(state),sessionHash=await sha(bearer.slice(7));
 await env.DB.batch([
  env.DB.prepare('DELETE FROM schwab_connection_diagnostics WHERE owner_id=?').bind(owner.id),
  env.DB.prepare('DELETE FROM schwab_oauth_states WHERE owner_id=? OR expires_at<?').bind(owner.id,now),
  env.DB.prepare('INSERT INTO schwab_oauth_states(state_hash,owner_id,session_hash,expires_at) VALUES(?,?,?,?)').bind(stateHash,owner.id,sessionHash,now+600000),
  env.DB.prepare('INSERT INTO schwab_connections(owner_id,generation,payload,updated_at) VALUES(?,?,NULL,?) ON CONFLICT(owner_id) DO UPDATE SET generation=excluded.generation,payload=NULL,updated_at=excluded.updated_at,refresh_lock_until=0,refresh_lock_id=NULL').bind(owner.id,stateHash,now)
 ]);
 const url=new URL(AUTH_URL);url.searchParams.set('response_type','code');url.searchParams.set('client_id',clean(env.SCHWAB_APP_KEY));url.searchParams.set('redirect_uri',SCHWAB_CALLBACK_URL);url.searchParams.set('scope','readonly');url.searchParams.set('state',state);
 return json({authorizationUrl:url.toString(),realOrdersEnabled:false});
}
export async function schwabCallback(request,env){
 const url=new URL(request.url),state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||'';
 const fail=(msg='Schwab authorization could not be verified. Start again from ICA Master.',status=400)=>new Response(msg,{status,headers:{...headers,'Content-Type':'text/plain; charset=utf-8'}});
 if(!configured(env)||!/^\w{64}$/.test(state))return fail();
 const hash=await sha(state);
 // Atomic single-use state consumption. A still-active owner session is checked
 // again at callback time. Codes, state, secrets and tokens are never logged.
 const pending=await env.DB.prepare('DELETE FROM schwab_oauth_states WHERE state_hash=? RETURNING owner_id,session_hash,expires_at').bind(hash).first();
 if(!pending||pending.expires_at<Date.now())return fail();
 const owner=await env.DB.prepare("SELECT u.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.user_id=? AND s.expires_at>? AND u.role='owner' AND u.status='active'").bind(pending.session_hash,pending.owner_id,Date.now()).first();
 if(!owner||url.searchParams.has('error')||!code||code.length>4096)return fail();
 let stage='token_exchange';
 try{
  const tokens=await exchange(env,{grant_type:'authorization_code',code,redirect_uri:SCHWAB_CALLBACK_URL});
  stage='token_encryption';
  const encrypted=await sealTokens(env,pending.owner_id,tokens);
  stage='token_storage';
  const saved=await env.DB.prepare('UPDATE schwab_connections SET payload=?,updated_at=? WHERE owner_id=? AND generation=?').bind(encrypted,Date.now(),pending.owner_id,hash).run();
  if(saved.meta?.changes!==1)return fail('The connection was cancelled or replaced. Return to ICA Master.',409);
  return new Response(null,{status:303,headers:{...headers,Location:'https://icomputeranything.com/master?view=trading&schwab=connected'}});
 }catch(error){
  const status=Number.isInteger(error.providerStatus)?error.providerStatus:null;
  const safeCode=error.safeCode||(['DataError','OperationError','InvalidCharacterError'].includes(error.name)?'encryption_configuration_error':'connection_error');
  try{await env.DB.prepare('INSERT INTO schwab_connection_diagnostics(owner_id,stage,provider_status,error_code,occurred_at) VALUES(?,?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET stage=excluded.stage,provider_status=excluded.provider_status,error_code=excluded.error_code,occurred_at=excluded.occurred_at').bind(pending.owner_id,stage,status,safeCode,Date.now()).run()}catch{}
  const reason=stage==='token_exchange'?'The Schwab token exchange failed'+(status?' (HTTP '+status+', '+safeCode+')':' (network or response error)'):stage==='token_encryption'?'ICA could not encrypt the connection securely':'ICA could not save the connection securely';
  return fail(reason+'. Return to ICA Master and reconnect. No authorization code or token is shown on this page.',502);
 }
}
export async function schwabDisconnect(request,env,owner){
 if(!owner?.id||owner.role!=='owner')return json({error:'Owner access required.'},403);
 if(!originAllowed(request))return json({error:'Unrecognized origin.'},403);
 await env.DB.batch([
  env.DB.prepare('DELETE FROM schwab_oauth_states WHERE owner_id=?').bind(owner.id),
  env.DB.prepare('UPDATE schwab_connections SET payload=NULL,generation=?,refresh_lock_until=0,refresh_lock_id=NULL,updated_at=? WHERE owner_id=?').bind(random(),Date.now(),owner.id)
 ]);
 return json({connected:false,realOrdersEnabled:false,note:'Local authorization removed. Provider access can also be revoked in Schwab.'});
}
async function accessToken(env,owner){
 const row=await env.DB.prepare('SELECT payload,generation FROM schwab_connections WHERE owner_id=?').bind(owner.id).first();
 if(!row?.payload)throw Error('Connect Schwab market data first.');
 const t=await openTokens(env,owner.id,row.payload);
 if(t.expires_at>Date.now()+60000)return {token:t.access_token,generation:row.generation};
 const lease=random(),now=Date.now();
 const lock=await env.DB.prepare('UPDATE schwab_connections SET refresh_lock_id=?,refresh_lock_until=? WHERE owner_id=? AND generation=? AND refresh_lock_until<?').bind(lease,now+20000,owner.id,row.generation,now).run();
 if(lock.meta?.changes!==1)throw Error('Schwab authorization is refreshing. Try again shortly.');
 try{
  const fresh=await exchange(env,{grant_type:'refresh_token',refresh_token:t.refresh_token},t);
  const encrypted=await sealTokens(env,owner.id,fresh);
  const saved=await env.DB.prepare('UPDATE schwab_connections SET payload=?,updated_at=? WHERE owner_id=? AND generation=? AND refresh_lock_id=?').bind(encrypted,Date.now(),owner.id,row.generation,lease).run();
  if(saved.meta?.changes!==1)throw Error('Connection changed. Please reconnect.');
  return {token:fresh.access_token,generation:row.generation};
 }catch(error){
  if([400,401,403].includes(error.providerStatus))await env.DB.prepare('UPDATE schwab_connections SET payload=NULL WHERE owner_id=? AND generation=? AND refresh_lock_id=?').bind(owner.id,row.generation,lease).run();
  throw error;
 }finally{await env.DB.prepare('UPDATE schwab_connections SET refresh_lock_until=0,refresh_lock_id=NULL WHERE owner_id=? AND refresh_lock_id=?').bind(owner.id,lease).run()}
}
export async function schwabQuotes(request,env,owner){
 if(!owner?.id||owner.role!=='owner')return json({error:'Owner access required.'},403);
 const symbols=(new URL(request.url).searchParams.get('symbols')||'SPY').split(',').map(x=>x.trim().toUpperCase());
 if(symbols.length>8||symbols.some(x=>! /^[A-Z][A-Z0-9.\-]{0,9}$/.test(x)))return json({error:'Use 1–8 valid stock symbols.'},400);
 try{
  const auth=await accessToken(env,owner);
  const url=new URL(MARKET_URL+'/quotes');url.searchParams.set('symbols',symbols.join(','));
  const r=await fetch(url,{headers:{Authorization:'Bearer '+auth.token,Accept:'application/json'},signal:AbortSignal.timeout(12000),redirect:'manual'});
  if(r.status===401){await env.DB.prepare('UPDATE schwab_connections SET payload=NULL WHERE owner_id=? AND generation=?').bind(owner.id,auth.generation).run();return json({error:'Schwab authorization expired. Please reconnect.'},401)}
  if(!r.ok)return json({error:'Schwab market data unavailable.',providerStatus:r.status},503);
  const data=await boundedJson(r);
  const num=n=>typeof n==='number'&&Number.isFinite(n)?n:null;
  const quotes=symbols.flatMap(symbol=>{const item=data[symbol],q=item?.quote;if(!q)return [];return [{symbol,last:num(q.lastPrice),bid:num(q.bidPrice),ask:num(q.askPrice),mark:num(q.mark),netChange:num(q.netChange),totalVolume:num(q.totalVolume),quoteTime:num(q.quoteTime),tradeTime:num(q.tradeTime),realtime:typeof item.realtime==='boolean'?item.realtime:null}]});
  return json({provider:'Schwab',receivedAt:new Date().toISOString(),quotes,realOrdersEnabled:false});
 }catch{return json({error:'Schwab market data is not ready. Connect or reconnect the owner session, then retry.'},503)}
}

export async function schwabMarket(request,env,owner,kind){
 if(!owner?.id||owner.role!=='owner')return json({error:'Owner access required.'},403);
 const input=new URL(request.url),symbol=(input.searchParams.get('symbol')||'SPY').toUpperCase();
 if(!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(symbol))return json({error:'Invalid symbol.'},400);
 const frequency=Number(input.searchParams.get('frequency')||5);
 if(kind==='history'&&![1,5,15,30,60].includes(frequency))return json({error:'Invalid interval.'},400);
 try{
  const auth=await accessToken(env,owner),url=new URL(MARKET_URL+(kind==='history'?'/pricehistory':'/chains'));
  url.searchParams.set('symbol',symbol);
  const params=kind==='history'?{periodType:'day',period:'1',frequencyType:'minute',frequency:String(frequency),needExtendedHoursData:'true'}:{contractType:'ALL',strikeCount:'12',strategy:'SINGLE',range:'NTM',fromDate:new Date().toISOString().slice(0,10),toDate:new Date(Date.now()+14*86400000).toISOString().slice(0,10)};
  for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
  const r=await fetch(url,{headers:{Authorization:'Bearer '+auth.token,Accept:'application/json'},signal:AbortSignal.timeout(12000),redirect:'manual'});
  if(!r.ok)return json({error:'Schwab market data unavailable.',providerStatus:r.status},503);
  const d=await boundedJson(r,4000000),num=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
  if(kind==='history')return json({symbol,provider:'Schwab',receivedAt:new Date().toISOString(),candles:(d.candles||[]).filter(c=>[c.datetime,c.open,c.high,c.low,c.close].every(v=>num(v)!==null)).map(c=>({time:c.datetime,open:c.open,high:c.high,low:c.low,close:c.close,volume:num(c.volume)})),realOrdersEnabled:false});
  const contracts=[];
  for(const [side,map] of [['CALL',d.callExpDateMap],['PUT',d.putExpDateMap]])for(const [expiration,strikes] of Object.entries(map||{}))for(const list of Object.values(strikes))for(const c of list){
   if(typeof c.symbol!=='string')continue;
   contracts.push({symbol:c.symbol,side,expiration:expiration.split(':')[0],strike:num(c.strikePrice),bid:num(c.bid),ask:num(c.ask),delta:num(c.delta),volume:num(c.totalVolume),openInterest:num(c.openInterest),quoteTime:num(c.quoteTimeInLong),nonStandard:c.nonStandard===true});
  }
  return json({symbol,provider:'Schwab',receivedAt:new Date().toISOString(),delayed:typeof d.isDelayed==='boolean'?d.isDelayed:null,contracts:contracts.slice(0,500),realOrdersEnabled:false});
 }catch{return json({error:'Schwab data could not be loaded. Retry or check the connection.'},503)}
}
