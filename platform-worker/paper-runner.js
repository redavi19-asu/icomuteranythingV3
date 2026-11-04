import {newPaper,stepPaper,paperRules} from '../src/master/paper-session.js';
import {evaluateSymbol,eligiblePaperQuote,marketTime} from '../src/master/trading-paper-engine.js';
import {schwabMarket,schwabContractQuote} from './schwab-connection.js';
const response=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
// Bounded liquid options universe. This is NOT a claim to scan every exchange-listed stock.
export const PAPER_SCAN_UNIVERSE=Object.freeze(['SPY','QQQ','IWM','DIA','XLK','XLF','XLE','USO','BNO','AAPL','NVDA','TSLA','AMZN','META','MSFT','AMD','GOOGL','TLT','GLD','SLV']);
const scannerUniverse=s=>[...new Set([...PAPER_SCAN_UNIVERSE,...(Array.isArray(s.extraSymbols)?s.extraSymbols:[])])].slice(0,40);
const budget=s=>Number.isFinite(s.maxPremium)?s.maxPremium:paperRules.premiumBudget;
// Migrate a legacy single pending setup into persistent, individually dismissible alerts.
function alertList(s){
 if(!Array.isArray(s.alerts))s.alerts=[];
 if(s.pending){if(!s.alerts.some(a=>a.id===s.pending.id))s.alerts.unshift({...s.pending,status:'PENDING'});s.pending=null;}
 return s.alerts;
}
const isLiveAlert=(a,now=Date.now())=>a.status==='PENDING'&&a.expires>now;
function expireAlerts(s,now=Date.now()){for(const a of alertList(s))if(a.status==='PENDING'&&a.expires<=now){a.status='EXPIRED';event(s,'Approval expired: '+a.contract.symbol);}}
const view=s=>({...s,pending:null,alerts:alertList(s),scanUniverse:scannerUniverse(s),mode:'PAPER_ONLY',realOrdersEnabled:false});
async function notifyPaperOpportunity(env,owner,alert){
 const api=String(env.RESEND_API_KEY||'').trim(),from=String(env.ICA_TRADING_ALERT_FROM||'').trim();
 if(!api||!from)return;
 const row=await env.DB.prepare("SELECT email FROM users WHERE id=? AND role='owner' AND status='active'").bind(owner.id).first();
 const to=String(row?.email||'').trim();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))return;
 const c=alert.contract,body=['A new paper trading setup was detected.','',c.underlying+' '+c.side+' '+c.symbol,'Ask at scan: 
export const freshRunner=()=>({paper:newPaper(),enabled:false,closeRequested:false,pending:null,alerts:[],seen:[],events:[],heartbeat:null,lastError:null,scanIndex:0,scanHistory:[],maxPremium:paperRules.premiumBudget,extraSymbols:[]});
async function load(env,id){await env.DB.prepare('INSERT OR IGNORE INTO paper_runners(owner_id,payload) VALUES(?,?)').bind(id,JSON.stringify(freshRunner())).run();const row=await env.DB.prepare('SELECT revision,payload FROM paper_runners WHERE owner_id=?').bind(id).first();return {revision:row.revision,state:JSON.parse(row.payload)}}
async function save(env,id,row){const r=await env.DB.prepare('UPDATE paper_runners SET payload=?,revision=revision+1 WHERE owner_id=? AND revision=?').bind(JSON.stringify(row.state),id,row.revision).run();if(r.meta.changes!==1)throw Error('State changed; refresh and retry.');}
function event(s,text){s.events=[{time:Date.now(),text},...s.events].slice(0,100)}
async function data(env,owner,kind,symbol){const r=await schwabMarket(new Request('https://internal/platform/schwab/'+kind+'?symbol='+symbol+'&frequency=1'),env,owner,kind);if(!r.ok)throw Error('Market feed unavailable.');return r.json()}
export async function runPaperTick(env,owner){
 const row=await load(env,owner.id),s=row.state;s.heartbeat=Date.now();s.lastError=null;
 expireAlerts(s);
 try{
  if(s.paper.position){const p=s.paper.position,q={...p,...await schwabContractQuote(env,owner,p.symbol)};const next=stepPaper(s.paper,{quote:q,close:s.closeRequested,maxPremium:budget(s)});s.mark={bid:q.bid,ask:q.ask,quoteTime:q.quoteTime,pnl:Math.round(((q.bid-0.01)*100-0.65-p.cost)*100)/100};
   if(!next.position){event(s,'SIMULATED EXIT: '+next.trades.at(-1).reason);s.closeRequested=false;s.mark=null}s.paper=next;
  }else if(s.enabled){
   const now=Date.now(),session=marketTime(now);
   if(!['Sat','Sun'].includes(session.weekday)&&session.minute>=575&&session.minute<945){
    const universe=scannerUniverse(s),attempts=Math.min(3,universe.length);
   for(let i=0;i<attempts;i++){
    const symbol=universe[(s.scanIndex++%universe.length)],checkedAt=Date.now();
    try{
     const history=await data(env,owner,'history',symbol);
     const bars=(history.candles||[]).filter(c=>c.time+60000<=checkedAt&&Number.isFinite(c.volume));
     const signal=evaluateSymbol(symbol,bars,{now:checkedAt,staleAfterMinutes:3});
     s.lastScan={symbol,time:checkedAt,signal};
     s.scanHistory=[{symbol,time:checkedAt,state:signal.state,reason:signal.reason},...(s.scanHistory||[])].slice(0,30);
     if(signal.state!=='TECHNICAL_WATCH')continue;
     const chain=await data(env,owner,'options',symbol);
     if(chain.delayed!==false)throw Error('Options delay status unconfirmed; skipping setup.');
     const candidates=(chain.contracts||[]).filter(c=>c.side===signal.direction&&!c.nonStandard&&[c.delta,c.volume,c.openInterest,c.quoteTime].every(Number.isFinite)&&checkedAt-c.quoteTime<=60000&&c.quoteTime<=checkedAt+5000&&!eligiblePaperQuote(c,{...paperRules,premiumBudget:budget(s)})).sort((a,b)=>(a.ask-a.bid)/a.ask-(b.ask-b.bid)/b.ask);
     const contract=candidates[0],id=symbol+'|'+signal.asOf;
     if(contract&&!s.seen.includes(id)){const alert={id,created:checkedAt,expires:checkedAt+120000,contract:{...contract,underlying:symbol},signal,status:'PENDING'};alertList(s).unshift(alert);s.alerts=s.alerts.slice(0,60);s.seen=[...s.seen,id].slice(-200);event(s,'SETUP awaiting owner approval: '+contract.symbol);try{await notifyPaperOpportunity(env,owner,alert)}catch(e){event(s,'Email notification unavailable: '+e.message)}}
    }catch(error){
     s.lastError=error.message;
     s.scanHistory=[{symbol,time:checkedAt,state:'DATA_HOLD',reason:error.message},...(s.scanHistory||[])].slice(0,30);
     event(s,'SCAN HOLD '+symbol+': '+error.message);
    }
   }
   }else s.lastScan={time:now,note:'Outside paper entry session (9:35 AM–3:45 PM ET weekdays).'};
  }
 }catch(e){s.lastError=e.message;event(s,'Data/risk hold: '+e.message)}
 await save(env,owner.id,row);return view(s);
}
export async function paperApi(request,env,owner){
 if(!owner?.id||owner.role!=='owner')return response({error:'Owner access required.'},403);
 if(request.method==='GET'){const row=await load(env,owner.id);return response({...view(row.state),serverTime:Date.now()})}
 if(!['https://icomputeranything.com','https://www.icomputeranything.com','https://redavi19-asu.github.io'].includes(request.headers.get('Origin')))return response({error:'Unrecognized origin.'},403);
 try{
  const body=await request.text();if(body.length>2048)return response({error:'Request too large.'},413);const {action,id}=JSON.parse(body);
  if(action==='tick')return response(await runPaperTick(env,owner));
  const row=await load(env,owner.id),s=row.state;expireAlerts(s);
  if(action==='start'){s.enabled=true;event(s,'Owner enabled paper setup scanning.')}
  else if(action==='settings'){
   if(s.paper.position)throw Error('Change paper scan settings only when no position is active.');
   const input=JSON.parse(body),amount=Number(input.maxPremium);
   if(!Number.isFinite(amount)||amount<1||amount>5000)throw Error('Paper max premium must be between $1 and $5,000.');
   if(!Array.isArray(input.extraSymbols)||input.extraSymbols.length>20||!input.extraSymbols.every(v=>typeof v==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(v)))throw Error('Up to 20 valid uppercase symbols are allowed.');
   s.maxPremium=Math.round(amount*100)/100;s.extraSymbols=[...new Set(input.extraSymbols)];
   event(s,'Paper scan settings updated.');
  }
    else if(action==='pause'){s.enabled=false;event(s,'Owner paused new setups. Existing position protection continues.')}
  else if(action==='close'){s.enabled=false;s.closeRequested=!!s.paper.position;event(s,'Owner requested emergency simulated close. Awaiting valid bid.')}
  else if(action==='skip'||action==='dismiss'){
   const alerts=alertList(s),target=alerts.find(a=>a.id===id);
   if(!target)throw Error('Alert already dismissed or changed.');
   s.alerts=alerts.filter(a=>a.id!==id);event(s,'Owner dismissed '+target.contract.symbol+' ('+target.status+').');
  }
  else if(action==='accept'){
   const alerts=alertList(s),a=alerts.find(a=>a.id===id);
   if(!s.enabled||s.paper.position||!a||!isLiveAlert(a))throw Error('Setup expired, changed, paused or position already open.');
   const c=a.contract,quote={...c,...await schwabContractQuote(env,owner,c.symbol)};
   if(a.expires<Date.now())throw Error('Setup expired during quote refresh.');
   if(!Number.isFinite(quote.ask)||quote.ask<=0||Math.abs(quote.ask/c.ask-1)>0.02){
    a.status='REPRICED';event(s,'Alert repriced, not entered: '+c.symbol);
    await save(env,owner.id,row);return response({error:'Contract price moved beyond 2%. This alert is no longer actionable; review a fresh setup.',status:view(s),code:'CONTRACT_REPRICED'},409);
   }
   s.paper=stepPaper(s.paper,{quote,enter:true,maxPremium:budget(s)});a.status='TAKEN';a.enteredAt=Date.now();event(s,'OWNER APPROVED simulated entry: '+c.symbol);
  }  }else throw Error('Unknown action.');
  await save(env,owner.id,row);return response(view(s));
 }catch(e){return response({error:e.message},409)}
}
export async function scheduledPaper(env){
 const rows=await env.DB.prepare("SELECT p.owner_id FROM paper_runners p JOIN users u ON u.id=p.owner_id WHERE u.role='owner' AND u.status='active'").all();
 for(const row of rows.results||[])try{await runPaperTick(env,{id:row.owner_id,role:'owner'})}catch{}
}+c.ask.toFixed(2),'Approval expires: '+new Date(alert.expires).toISOString(),'','Open ICA Master to review. Quotes may move; approval rechecks the contract.','https://icomputeranything.com/master?view=trading','', 'PAPER ONLY — no live orders.'].join('\n');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+api,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject:'ICA Master Paper Alert: '+c.underlying+' '+c.side,text:body}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Notification delivery not accepted (HTTP '+response.status+').');
}
export const freshRunner=()=>({paper:newPaper(),enabled:false,closeRequested:false,pending:null,seen:[],events:[],heartbeat:null,lastError:null,scanIndex:0,scanHistory:[],maxPremium:paperRules.premiumBudget,extraSymbols:[]});
async function load(env,id){await env.DB.prepare('INSERT OR IGNORE INTO paper_runners(owner_id,payload) VALUES(?,?)').bind(id,JSON.stringify(freshRunner())).run();const row=await env.DB.prepare('SELECT revision,payload FROM paper_runners WHERE owner_id=?').bind(id).first();return {revision:row.revision,state:JSON.parse(row.payload)}}
async function save(env,id,row){const r=await env.DB.prepare('UPDATE paper_runners SET payload=?,revision=revision+1 WHERE owner_id=? AND revision=?').bind(JSON.stringify(row.state),id,row.revision).run();if(r.meta.changes!==1)throw Error('State changed; refresh and retry.');}
function event(s,text){s.events=[{time:Date.now(),text},...s.events].slice(0,100)}
async function data(env,owner,kind,symbol){const r=await schwabMarket(new Request('https://internal/platform/schwab/'+kind+'?symbol='+symbol+'&frequency=1'),env,owner,kind);if(!r.ok)throw Error('Market feed unavailable.');return r.json()}
export async function runPaperTick(env,owner){
 const row=await load(env,owner.id),s=row.state;s.heartbeat=Date.now();s.lastError=null;
 if(s.pending&&s.pending.expires<Date.now()){event(s,'Previous approval expired; scanning resumed.');s.pending=null;}
 try{
  if(s.paper.position){const p=s.paper.position,q={...p,...await schwabContractQuote(env,owner,p.symbol)};const next=stepPaper(s.paper,{quote:q,close:s.closeRequested,maxPremium:budget(s)});s.mark={bid:q.bid,ask:q.ask,quoteTime:q.quoteTime,pnl:Math.round(((q.bid-0.01)*100-0.65-p.cost)*100)/100};
   if(!next.position){event(s,'SIMULATED EXIT: '+next.trades.at(-1).reason);s.closeRequested=false;s.mark=null}s.paper=next;
  }else if(s.enabled&&!s.pending){
   const now=Date.now(),session=marketTime(now);
   if(!['Sat','Sun'].includes(session.weekday)&&session.minute>=575&&session.minute<945){
    const universe=scannerUniverse(s),attempts=Math.min(3,universe.length);
   for(let i=0;i<attempts&&!s.pending;i++){
    const symbol=universe[(s.scanIndex++%universe.length)],checkedAt=Date.now();
    try{
     const history=await data(env,owner,'history',symbol);
     const bars=(history.candles||[]).filter(c=>c.time+60000<=checkedAt&&Number.isFinite(c.volume));
     const signal=evaluateSymbol(symbol,bars,{now:checkedAt,staleAfterMinutes:3});
     s.lastScan={symbol,time:checkedAt,signal};
     s.scanHistory=[{symbol,time:checkedAt,state:signal.state,reason:signal.reason},...(s.scanHistory||[])].slice(0,30);
     if(signal.state!=='TECHNICAL_WATCH')continue;
     const chain=await data(env,owner,'options',symbol);
     if(chain.delayed!==false)throw Error('Options delay status unconfirmed; skipping setup.');
     const candidates=(chain.contracts||[]).filter(c=>c.side===signal.direction&&!c.nonStandard&&[c.delta,c.volume,c.openInterest,c.quoteTime].every(Number.isFinite)&&checkedAt-c.quoteTime<=60000&&c.quoteTime<=checkedAt+5000&&!eligiblePaperQuote(c,{...paperRules,premiumBudget:budget(s)})).sort((a,b)=>(a.ask-a.bid)/a.ask-(b.ask-b.bid)/b.ask);
     const contract=candidates[0],id=symbol+'|'+signal.asOf;
     if(contract&&!s.seen.includes(id)){s.pending={id,created:checkedAt,expires:checkedAt+120000,contract:{...contract,underlying:symbol},signal};event(s,'SETUP awaiting owner approval: '+contract.symbol)}
    }catch(error){
     s.lastError=error.message;
     s.scanHistory=[{symbol,time:checkedAt,state:'DATA_HOLD',reason:error.message},...(s.scanHistory||[])].slice(0,30);
     event(s,'SCAN HOLD '+symbol+': '+error.message);
    }
   }
   }else s.lastScan={time:now,note:'Outside paper entry session (9:35 AM–3:45 PM ET weekdays).'};
  }
 }catch(e){s.lastError=e.message;event(s,'Data/risk hold: '+e.message)}
 await save(env,owner.id,row);return s;
}
export async function paperApi(request,env,owner){
 if(!owner?.id||owner.role!=='owner')return response({error:'Owner access required.'},403);
 if(request.method==='GET'){const row=await load(env,owner.id);return response({...row.state,scanUniverse:scannerUniverse(row.state),serverTime:Date.now(),mode:'PAPER_ONLY',realOrdersEnabled:false})}
 if(!['https://icomputeranything.com','https://www.icomputeranything.com','https://redavi19-asu.github.io'].includes(request.headers.get('Origin')))return response({error:'Unrecognized origin.'},403);
 try{
  const body=await request.text();if(body.length>2048)return response({error:'Request too large.'},413);const {action,id}=JSON.parse(body);
  if(action==='tick')return response(await runPaperTick(env,owner));
  const row=await load(env,owner.id),s=row.state;
  if(action==='start'){s.enabled=true;event(s,'Owner enabled paper setup scanning.')}
  else if(action==='settings'){
   if(s.paper.position||s.pending)throw Error('Change paper scan settings only when no position or setup is active.');
   const input=JSON.parse(body),amount=Number(input.maxPremium);
   if(!Number.isFinite(amount)||amount<1||amount>5000)throw Error('Paper max premium must be between $1 and $5,000.');
   if(!Array.isArray(input.extraSymbols)||input.extraSymbols.length>20||!input.extraSymbols.every(v=>typeof v==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(v)))throw Error('Up to 20 valid uppercase symbols are allowed.');
   s.maxPremium=Math.round(amount*100)/100;s.extraSymbols=[...new Set(input.extraSymbols)];
   event(s,'Paper scan settings updated.');
  }
    else if(action==='pause'){s.enabled=false;event(s,'Owner paused new setups. Existing position protection continues.')}
  else if(action==='close'){s.enabled=false;s.closeRequested=!!s.paper.position;event(s,'Owner requested emergency simulated close. Awaiting valid bid.')}
  else if(action==='skip'){if(!s.pending||s.pending.id!==id)throw Error('Setup changed.');s.seen=[...s.seen,s.pending.id].slice(-200);s.pending=null;event(s,'Owner skipped setup.')}
  else if(action==='accept'){
   if(!s.enabled||s.paper.position||!s.pending||s.pending.id!==id||s.pending.expires<Date.now())throw Error('Setup expired, changed, paused or position already open.');
   const c=s.pending.contract,quote={...c,...await schwabContractQuote(env,owner,c.symbol)};
   if(s.pending.expires<Date.now())throw Error('Setup expired during quote refresh.');
   if(quote.ask>c.ask*1.02||quote.ask<c.ask*0.98)throw Error('Contract moved over 2%; skip and wait for a fresh setup.');
   s.paper=stepPaper(s.paper,{quote,enter:true,maxPremium:budget(s)});s.seen=[...s.seen,id].slice(-200);s.pending=null;event(s,'OWNER APPROVED simulated entry: '+c.symbol);
  }else throw Error('Unknown action.');
  await save(env,owner.id,row);return response({...s,scanUniverse:scannerUniverse(s),mode:'PAPER_ONLY',realOrdersEnabled:false});
 }catch(e){return response({error:e.message},409)}
}
export async function scheduledPaper(env){
 const rows=await env.DB.prepare("SELECT p.owner_id FROM paper_runners p JOIN users u ON u.id=p.owner_id WHERE u.role='owner' AND u.status='active'").all();
 for(const row of rows.results||[])try{await runPaperTick(env,{id:row.owner_id,role:'owner'})}catch{}
}