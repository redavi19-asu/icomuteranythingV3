import {schwabStreamerSession} from './schwab-connection.js';

/* Owner-only, read-only Schwab quote bridge. The access token never reaches the browser.
 * A short-lived signed access ticket authorizes only chart/quote streaming, never orders.
 * This bridge is intentionally separate from the server paper-execution/risk engine.
 */
const te=new TextEncoder();
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-value.length%4)%4)),x=>x.charCodeAt(0));
const secret=env=>String(env.SCHWAB_TOKEN_ENCRYPTION_KEY||'').trim();
async function sign(env,body){
 const bytes=decode(secret(env));
 if(bytes.length!==32)throw Error('Streaming signing configuration unavailable.');
 const key=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
 return encode(new Uint8Array(await crypto.subtle.sign('HMAC',key,te.encode(body))));
}
const validSymbol=s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(s);
function allowed(request){return ['https://icomputeranything.com','https://www.icomputeranything.com','https://redavi19-asu.github.io'].includes(request.headers.get('Origin'))}
export async function issueStreamTicket(request,env,owner){
 if(!owner?.id||owner.role!=='owner')return Response.json({error:'Owner only.'},{status:403});
 if(!allowed(request))return Response.json({error:'Unrecognized origin.'},{status:403});
 const symbol=String(new URL(request.url).searchParams.get('symbol')||'SPY').toUpperCase();
 if(!validSymbol(symbol))return Response.json({error:'Invalid ticker.'},{status:400});
 try{
  // Validate connection and entitlements before issuing an access capability.
  await schwabStreamerSession(env,owner);
  const body=encode(te.encode(JSON.stringify({owner:owner.id,symbol,expires:Date.now()+30000,nonce:crypto.randomUUID()})));
  const ticket=body+'.'+await sign(env,body);
  return Response.json({ticket,symbol,expiresInMs:30000,mode:'QUOTE_STREAM_ONLY',realOrdersEnabled:false},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e.message||'Schwab streamer unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
async function verifyTicket(request,env){
 if(!allowed(request))throw Error('Unrecognized origin.');
 if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')throw Error('Expected WebSocket upgrade.');
 const ticket=new URL(request.url).searchParams.get('ticket')||'',parts=ticket.split('.');
 if(parts.length!==2||parts[0].length>1024||parts[1].length>100)throw Error('Invalid streaming ticket.');
 const key=await crypto.subtle.importKey('raw',decode(secret(env)),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('HMAC',key,decode(parts[1]),te.encode(parts[0])))throw Error('Invalid streaming signature.');
 const value=JSON.parse(new TextDecoder().decode(decode(parts[0])));
 if(!value.owner||!validSymbol(value.symbol)||typeof value.expires!=='number'||Date.now()>value.expires||value.expires-Date.now()>30000)throw Error('Streaming ticket expired.');
 return value;
}
export async function openSchwabStream(request,env){
 let ticket,stream;
 try{
  ticket=await verifyTicket(request,env);
  stream=await schwabStreamerSession(env,{id:ticket.owner,role:'owner'});
 }catch(e){return Response.json({error:e.message||'Unable to authenticate streamer.'},{status:403})}
 // Create one Schwab connection for the visible symbol; never route browser commands to Schwab.
 let upstream;
 try{
  const handshake=await fetch(stream.url,{headers:{Upgrade:'websocket'},redirect:'manual'});
  if(!handshake.webSocket)throw Error('Schwab did not accept streaming connection.');
  upstream=handshake.webSocket;upstream.accept();
 }catch{return Response.json({error:'Schwab streaming socket unavailable.'},{status:503})}
 const [client,server]=Object.values(new WebSocketPair());server.accept();
 let ready=false,seq=10,stopped=false,optionSymbol=null;
 const send=value=>{if(!stopped)try{server.send(JSON.stringify(value))}catch{}};
 const terminate=(reason='Stream disconnected')=>{if(stopped)return;stopped=true;try{upstream.close(1000,reason)}catch{}try{server.close(1000,reason)}catch{}};
 const command=(service,fields,keys)=>({service,requestid:String(++seq),command:'SUBS',SchwabClientCustomerId:stream.customer,SchwabClientCorrelId:stream.correl,parameters:{keys,fields}});
 const login={requests:[{service:'ADMIN',requestid:'1',command:'LOGIN',SchwabClientCustomerId:stream.customer,SchwabClientCorrelId:stream.correl,parameters:{Authorization:stream.token,SchwabClientChannel:stream.channel,SchwabClientFunctionId:stream.functionId}}]};
 upstream.addEventListener('message',event=>{
  try{
   const msg=JSON.parse(event.data);
   if(!ready&&Array.isArray(msg.response)){
    const response=msg.response.find(x=>x.service==='ADMIN'&&x.command==='LOGIN');
    if(response){
     if(response.content?.code!==0){send({type:'error',message:'Schwab streaming login rejected.'});terminate('Login rejected');return}
     ready=true;send({type:'connected',provider:'Schwab',symbol:ticket.symbol});
     upstream.send(JSON.stringify({requests:[
      command('LEVELONE_EQUITIES','0,1,2,3,8,34,35',ticket.symbol),
      command('CHART_EQUITY','0,1,2,3,4,5,6,7,8',ticket.symbol)
     ]}));
    }
   }
   if(Array.isArray(msg.data))for(const packet of msg.data){
    if(!['LEVELONE_EQUITIES','CHART_EQUITY','LEVELONE_OPTIONS'].includes(packet.service))continue;
    for(const item of packet.content||[]){
     if(packet.service==='LEVELONE_OPTIONS'){
      if(item.key===optionSymbol)send({type:'option_quote',symbol:optionSymbol,bid:item['2']??null,ask:item['3']??null,last:item['4']??null,delayed:item.delayed??null,receivedAt:Date.now()});
      continue;
     }
     if(item.key!==ticket.symbol)continue;
     if(packet.service==='LEVELONE_EQUITIES')send({type:'quote',symbol:ticket.symbol,source:'Schwab',delayed:item.delayed??null,bid:item['1']??null,ask:item['2']??null,last:item['3']??null,quoteTime:item['34']??null,tradeTime:item['35']??null,receivedAt:Date.now()});
     if(packet.service==='CHART_EQUITY')send({type:'candle',symbol:ticket.symbol,fields:item,receivedAt:Date.now()});
    }
   }
  }catch{send({type:'error',message:'Malformed Schwab stream message.'})}
 });
 upstream.addEventListener('close',()=>{send({type:'disconnected',message:'Schwab streaming connection ended.'});terminate()});
 upstream.addEventListener('error',()=>{send({type:'error',message:'Schwab streaming connection failed.'});terminate()});
 server.addEventListener('close',()=>terminate('Browser disconnected'));
 server.addEventListener('error',()=>terminate('Browser socket error'));
 // Only a single validated option quote subscription is permitted; no trading commands.
 server.addEventListener('message',event=>{
  if(!ready||stopped||typeof event.data!=='string'||event.data.length>250)return;
  try{
   const data=JSON.parse(event.data),candidate=data.symbol;
   if(data.type!=='watch_option'||typeof candidate!=='string'||!/^[A-Z0-9 .:_-]{2,90}$/.test(candidate))return;
   if(!candidate.startsWith(ticket.symbol))return;
   optionSymbol=candidate;
   upstream.send(JSON.stringify({requests:[command('LEVELONE_OPTIONS','0,1,2,3,4',candidate)]}));
   send({type:'option_selected',symbol:candidate});
  }catch{}
 });
 upstream.send(JSON.stringify(login));
 return new Response(null,{status:101,webSocket:client});
}
