import {DurableObject} from 'cloudflare:workers';
import {schwabStreamerSession} from './schwab-connection.js';
import {runPaperTick} from './paper-runner.js';
import {marketTime} from '../src/master/trading-paper-engine.js';
import {isStreamTicker,isStreamContract,chooseFreshStreamSymbol} from './paper-stream-policy.js';
import {paperSessionOpen,PAPER_MARKET_CLOSE_MINUTE} from '../src/master/paper-session-clock.js';

// Private, owner-scoped server-side Schwab WebSocket. Streaming events accelerate
// paper-only scan evaluation; all candidate quotes are STILL independently
// entitlement-checked against Schwab REST before any alert or paper entry.
// No broker orders, browser-supplied prices, account tokens, or live fills.
export class PaperQuoteStream extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  this.ownerId=null;this.symbols=[];this.mode='MULTI';
  this.socket=null;this.session=null;this.ready=false;this.connecting=false;
  this.active=false;this.retryAt=0;this.failures=0;this.error='';
  this.lastQuoteAt=0;this.lastScanAt=0;this.scanning=false;
  // Keep all per-owner scan writes serialized through this Durable Object.
  // Cron rotation takes priority over faster stream-triggered checks.
  this.streamScanPromise=null;this.rotationPromise=null;this.rotationActive=false;
  this.symbolScanAt=new Map();this.quoteActivity=new Map();this.watched=new Map();this.watchTimes=new Map();
 }
 status(){
  const age=this.lastQuoteAt?Date.now()-this.lastQuoteAt:null;
  return {connected:this.ready&&this.socket?.readyState===1&&age!==null&&age<20000,
   transport:this.ready?'STREAM_OPEN':this.connecting?'CONNECTING':this.error?'STREAM_UNAVAILABLE':'NOT_CONNECTED',
   quoteAgeMs:age,watchedContracts:this.watched.size,
   lastScanAt:this.lastScanAt||null,error:this.error.slice(0,160),
   realOrdersEnabled:false,quoteEntitlementVerified:false};
 }
 async enable(ownerId,symbols,mode='MULTI'){
  if(typeof ownerId!=='string'||!ownerId||ownerId.length>160)throw Error('Invalid owner.');
  if(!Array.isArray(symbols)||symbols.length>40||!symbols.length||!symbols.every(isStreamTicker))throw Error('Invalid stream watchlist.');
  if(mode!=='SINGLE'&&mode!=='MULTI')throw Error('Invalid stream scope.');
  this.ownerId=ownerId;this.active=true;this.mode=mode;
  const next=[...new Set(symbols)];
  const changed=next.join(',')!==this.symbols.join(',');
  this.symbols=next;
  await this.ctx.storage.put('config',{ownerId,symbols:next,mode});
  await this.ctx.storage.setAlarm(Date.now()+30000);
  if(this.ready&&changed)this.subscribe();
  if(!this.socket&&!this.connecting&&Date.now()>=this.retryAt)await this.connect();
  return this.status();
 }
 async disable(){
  this.active=false;this.ready=false;this.ownerId=null;this.symbols=[];
  this.watched.clear();this.watchTimes.clear();this.symbolScanAt.clear();this.quoteActivity.clear();
  const socket=this.socket;this.socket=null;
  try{socket?.close(1000,'Scanner inactive')}catch{}
  await this.ctx.storage.delete('config');
  await this.ctx.storage.deleteAlarm();
  return {connected:false};
 }
 async alarm(){
  const config=await this.ctx.storage.get('config');
  const session=marketTime(Date.now());
  if(!config||['Sat','Sun'].includes(session.weekday)||session.minute<565||session.minute>=PAPER_MARKET_CLOSE_MINUTE){
   await this.disable();return;
  }
  this.ownerId=config.ownerId;this.active=true;this.mode=config.mode;
  this.symbols=config.symbols;
  if(!this.socket&&!this.connecting&&Date.now()>=this.retryAt)await this.connect();
  // Independent 30-second alarm backup: the Cloudflare scheduled handler
  // may not complete its rotation under ongoing event traffic. One owner DO
  // owns both triggers, and runRotation's persistent time guard permits at
  // most one full-universe sweep per minute across restarts or cron overlap.
  try{
   if(paperSessionOpen(session))
    await this.runRotation(config.ownerId,null,true);
  }catch(e){
   this.error='Scheduled paper rotation held: '+String(e?.message||'unknown error').slice(0,115);
  }finally{
   // Always rearm even when the market feed or a scan request fails.
   await this.ctx.storage.setAlarm(Date.now()+30000);
  }
 }
 command(service,fields,keys){
  return {service,requestid:String(++this.seq),command:'SUBS',
   SchwabClientCustomerId:this.session.customer,
   SchwabClientCorrelId:this.session.correl,parameters:{keys,fields}};
 }
 subscribe(){
  if(!this.ready||!this.session||!this.socket)return;
  try{
   this.socket.send(JSON.stringify({requests:[
    this.command('LEVELONE_EQUITIES','0,1,2,3,8,34,35',this.symbols.join(','))
   ]}));
   if(this.watched.size)this.subscribeOptions();
  }catch{this.error='Unable to subscribe to Schwab quotes.'}
 }
 subscribeOptions(){
  if(!this.ready||!this.socket||!this.watched.size)return;
  try{this.socket.send(JSON.stringify({requests:[
   this.command('LEVELONE_OPTIONS','0,1,2,3,4',[...this.watched.keys()].join(','))
  ]}))}catch{this.error='Unable to subscribe to Schwab options.'}
 }
 async watchOption(contract,underlying){
  if(!isStreamContract(contract)||!isStreamTicker(underlying)||!contract.startsWith(underlying))return false;
  if(!this.active||!this.symbols.includes(underlying))return false;
  if(!this.watched.has(contract)&&this.watched.size>=8){
   this.watched.delete(this.watched.keys().next().value);
  }
  const changed=!this.watched.has(contract);
  this.watched.set(contract,underlying);
  if(changed)this.subscribeOptions();
  return this.ready;
 }
 async connect(){
  if(!this.active||!this.ownerId||this.connecting||this.socket)return;
  this.connecting=true;this.error='';
  try{
   // This fails closed if the Schwab Trader preference/stream entitlement is missing.
   const session=await schwabStreamerSession(this.env,{id:this.ownerId,role:'owner'});
   const u=new URL(session.url);u.protocol='https:';
   const response=await fetch(u.toString(),{headers:{Upgrade:'websocket'},redirect:'manual',
    signal:AbortSignal.timeout(12000)});
   if(!response.webSocket)throw Error('Schwab streaming socket unavailable.');
   if(!this.active)return;
   this.session=session;this.seq=10;this.ready=false;this.lastQuoteAt=0;
   const socket=response.webSocket;socket.accept();this.socket=socket;
   socket.addEventListener('message',event=>{
    this.ctx.waitUntil(this.onMessage(event.data).catch(()=>{this.error='Invalid Schwab streaming payload.'}));
   });
   const disconnected=()=>{
    if(this.socket!==socket)return;
    this.socket=null;this.ready=false;this.session=null;this.lastQuoteAt=0;
    this.error='Schwab stream disconnected. Using timed REST scan fallback.';
    this.retryAt=Date.now()+Math.min(60000,2000*2**Math.min(5,++this.failures));
   };
   socket.addEventListener('close',disconnected);
   socket.addEventListener('error',disconnected);
   socket.send(JSON.stringify({requests:[{service:'ADMIN',requestid:'1',command:'LOGIN',
    SchwabClientCustomerId:session.customer,SchwabClientCorrelId:session.correl,
    parameters:{Authorization:session.token,SchwabClientChannel:session.channel,
     SchwabClientFunctionId:session.functionId}}]}));
  }catch(e){
   this.ready=false;this.socket=null;this.session=null;
   this.error=String(e?.message||'Schwab streamer is unavailable.').slice(0,160);
   this.retryAt=Date.now()+Math.min(120000,15000*2**Math.min(3,++this.failures));
  }finally{this.connecting=false}
 }
 async onMessage(raw){
  if(!this.active||typeof raw!=='string'||raw.length>2000000)return;
  const packet=JSON.parse(raw);
  for(const response of packet.response||[]){
   if(response.service!=='ADMIN'||response.command!=='LOGIN')continue;
   if(response.content?.code!==0){
    this.error='Schwab streaming login rejected. Using timed REST fallback.';
    this.socket?.close(1000,'Login refused');return;
   }
   this.ready=true;this.failures=0;this.error='';this.subscribe();
  }
  if(!this.ready)return;
  for(const msg of packet.data||[]){
   if(msg.service==='LEVELONE_OPTIONS'){
    for(const item of msg.content||[]){
     const underlying=this.watched.get(item.key);
     if(!underlying)continue;
     const v=Number(item['2']??item['3']??item['4']);
     if(!Number.isFinite(v)||v<=0)continue;
     this.watchTimes.set(item.key,Date.now());
     this.onQuote(underlying,Date.now());
    }
   }else if(msg.service==='LEVELONE_EQUITIES'){
    for(const item of msg.content||[]){
     if(!this.symbols.includes(item.key))continue;
     const last=Number(item['3']??item['1']??item['2']);
     if(!Number.isFinite(last)||last<=0)continue;
     this.lastQuoteAt=Date.now();
     this.onQuote(item.key,this.lastQuoteAt);
    }
   }
  }
 }
 onQuote(symbol,receivedAt){
  if(!this.active||!this.ready||!this.symbols.includes(symbol))return;
  // Record *all* ticker activity, even during an in-flight scan. The previous
  // first-arrival scan never queued the rest, starving the broad watchlist.
  this.quoteActivity.set(symbol,receivedAt);
  this.pumpQueuedScan();
 }
 /**
  * One durable coordinator per owner. Cron and manual full-universe scans
  * wait for any in-flight streamed symbol before starting, then temporarily
  * prevent new streaming evaluations until their database save completes.
  * This avoids optimistic-revision conflicts that had silently discarded
  * rotation results whenever GOOGL or another busy ticker updated.
  */
 async runRotation(ownerId,streamHealth=null,scheduled=false){
  if(typeof ownerId!=='string'||!ownerId||ownerId.length>160)throw Error('Invalid owner.');
  if(this.ownerId&&this.ownerId!==ownerId)throw Error('Scan coordinator owner mismatch.');
  if(this.rotationPromise)return this.rotationPromise;
  this.rotationActive=true;
  const work=(async()=>{
   // Durable alarm/cron rate limit. A DO restart must not erase the
   // most recent completed full-universe rotation timestamp.
   if(scheduled){
    const last=Number(await this.ctx.storage.get('lastRotationAt'))||0;
    if(Date.now()-last<55000)return {skipped:true,reason:'ROTATION_RECENT'};
   }
   if(this.streamScanPromise)await this.streamScanPromise.catch(()=>{});
   const result=await runPaperTick(this.env,{id:ownerId,role:'owner'},
    {scan:true,scheduled,streamHealth});
   if(scheduled)await this.ctx.storage.put('lastRotationAt',Date.now());
   return result;
  })();
  this.rotationPromise=work.finally(()=>{
   this.rotationActive=false;
   this.rotationPromise=null;
   this.pumpQueuedScan();
  });
  return this.rotationPromise;
 }
 pumpQueuedScan(){
  if(!this.active||!this.ready||this.scanning||this.rotationActive)return;
  const now=Date.now(),session=marketTime(now);
  // Continue paper setup scanning through 3:59 PM ET; block 0DTE entries at 3:55 separately.
  if(!paperSessionOpen(session))return;
  const symbol=chooseFreshStreamSymbol(this.symbols,this.quoteActivity,this.symbolScanAt,
   {now,lastScanAt:this.lastScanAt,mode:this.mode});
  if(!symbol)return;
  this.lastScanAt=now;this.symbolScanAt.set(symbol,now);this.scanning=true;
  // Streaming ticks trigger evaluation only. Existing independent REST checks
  // still validate real-time entitlement, fresh underlying/contract quotes,
  // liquidity and risk before the owner receives an actionable setup.
  const scan=runPaperTick(this.env,{id:this.ownerId,role:'owner'},{scan:true,scanSymbol:symbol})
   .catch(e=>{this.error='Live-triggered paper scan held: '+String(e?.message||'unavailable').slice(0,110)})
   .finally(()=>{
    this.scanning=false;
    this.streamScanPromise=null;
    this.pumpQueuedScan();
   });
  this.streamScanPromise=scan;
  this.ctx.waitUntil(scan);
 }
}
