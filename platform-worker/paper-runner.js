import {newPaper,stepPaper,paperRules} from '../src/master/paper-session.js';
import {evaluateSymbol,eligiblePaperQuote,marketTime} from '../src/master/trading-paper-engine.js';
import {schwabMarket,schwabContractQuote} from './schwab-connection.js';
const response=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export const freshRunner=()=>({paper:newPaper(),enabled:false,closeRequested:false,pending:null,seen:[],events:[],heartbeat:null,lastError:null,scanIndex:0});
async function load(env,id){await env.DB.prepare('INSERT OR IGNORE INTO paper_runners(owner_id,payload) VALUES(?,?)').bind(id,JSON.stringify(freshRunner())).run();const row=await env.DB.prepare('SELECT revision,payload FROM paper_runners WHERE owner_id=?').bind(id).first();return {revision:row.revision,state:JSON.parse(row.payload)}}
async function save(env,id,row){const r=await env.DB.prepare('UPDATE paper_runners SET payload=?,revision=revision+1 WHERE owner_id=? AND revision=?').bind(JSON.stringify(row.state),id,row.revision).run();if(r.meta.changes!==1)throw Error('State changed; refresh and retry.');}
function event(s,text){s.events=[{time:Date.now(),text},...s.events].slice(0,100)}
async function data(env,owner,kind,symbol){const r=await schwabMarket(new Request('https://internal/platform/schwab/'+kind+'?symbol='+symbol+'&frequency=1'),env,owner,kind);if(!r.ok)throw Error('Market feed unavailable.');return r.json()}
export async function runPaperTick(env,owner){
 const row=await load(env,owner.id),s=row.state;s.heartbeat=Date.now();s.lastError=null;
 try{
  if(s.paper.position){const p=s.paper.position,q={...p,...await schwabContractQuote(env,owner,p.symbol)};const next=stepPaper(s.paper,{quote:q,close:s.closeRequested});s.mark={bid:q.bid,ask:q.ask,quoteTime:q.quoteTime,pnl:Math.round(((q.bid-0.01)*100-0.65-p.cost)*100)/100};
   if(!next.position){event(s,'SIMULATED EXIT: '+next.trades.at(-1).reason);s.closeRequested=false;s.mark=null}s.paper=next;
  }else if(s.enabled&&!s.pending){
   const now=Date.now(),session=marketTime(now);
   if(!['Sat','Sun'].includes(session.weekday)&&session.minute>=575&&session.minute<945){
    const symbol=['SPY','QQQ','IWM'][s.scanIndex++%3],history=await data(env,owner,'history',symbol);
    const bars=history.candles.filter(c=>c.time+60000<=now&&Number.isFinite(c.volume));
    const signal=evaluateSymbol(symbol,bars,{now,staleAfterMinutes:3});s.lastScan={symbol,time:now,signal};
    if(signal.state==='TECHNICAL_WATCH'){
     const chain=await data(env,owner,'options',symbol);
     if(chain.delayed!==false)throw Error('Options delay status unconfirmed.');
     const candidates=chain.contracts.filter(c=>c.side===signal.direction&&!c.nonStandard&&[c.delta,c.volume,c.openInterest,c.quoteTime].every(Number.isFinite)&&now-c.quoteTime<=60000&&c.quoteTime<=now+5000&&!eligiblePaperQuote(c,paperRules)).sort((a,b)=>(a.ask-a.bid)/a.ask-(b.ask-b.bid)/b.ask);
     const contract=candidates[0],id=symbol+'|'+signal.asOf;
     if(contract&&!s.seen.includes(id)){s.pending={id,created:now,expires:now+120000,contract:{...contract,underlying:symbol},signal};event(s,'SETUP awaiting owner approval: '+contract.symbol)}
    }
   }else s.lastScan={time:now,note:'Outside paper entry session (9:35 AM–3:45 PM ET weekdays).'};
  }
 }catch(e){s.lastError=e.message;event(s,'Data/risk hold: '+e.message)}
 await save(env,owner.id,row);return s;
}
export async function paperApi(request,env,owner){
 if(!owner?.id||owner.role!=='owner')return response({error:'Owner access required.'},403);
 if(request.method==='GET'){const row=await load(env,owner.id);return response({...row.state,serverTime:Date.now(),mode:'PAPER_ONLY',realOrdersEnabled:false})}
 if(!['https://icomputeranything.com','https://www.icomputeranything.com','https://redavi19-asu.github.io'].includes(request.headers.get('Origin')))return response({error:'Unrecognized origin.'},403);
 try{
  const body=await request.text();if(body.length>2048)return response({error:'Request too large.'},413);const {action,id}=JSON.parse(body);
  if(action==='tick')return response(await runPaperTick(env,owner));
  const row=await load(env,owner.id),s=row.state;
  if(action==='start'){s.enabled=true;event(s,'Owner enabled paper setup scanning.')}
  else if(action==='pause'){s.enabled=false;event(s,'Owner paused new setups. Existing position protection continues.')}
  else if(action==='close'){s.enabled=false;s.closeRequested=!!s.paper.position;event(s,'Owner requested emergency simulated close. Awaiting valid bid.')}
  else if(action==='skip'){if(!s.pending||s.pending.id!==id)throw Error('Setup changed.');s.seen=[...s.seen,s.pending.id].slice(-200);s.pending=null;event(s,'Owner skipped setup.')}
  else if(action==='accept'){
   if(!s.enabled||s.paper.position||!s.pending||s.pending.id!==id||s.pending.expires<Date.now())throw Error('Setup expired, changed, paused or position already open.');
   const c=s.pending.contract,quote={...c,...await schwabContractQuote(env,owner,c.symbol)};
   if(s.pending.expires<Date.now())throw Error('Setup expired during quote refresh.');
   if(quote.ask>c.ask*1.02||quote.ask<c.ask*0.98)throw Error('Contract moved over 2%; skip and wait for a fresh setup.');
   s.paper=stepPaper(s.paper,{quote,enter:true});s.seen=[...s.seen,id].slice(-200);s.pending=null;event(s,'OWNER APPROVED simulated entry: '+c.symbol);
  }else throw Error('Unknown action.');
  await save(env,owner.id,row);return response(s);
 }catch(e){return response({error:e.message},409)}
}
export async function scheduledPaper(env){
 const rows=await env.DB.prepare("SELECT p.owner_id FROM paper_runners p JOIN users u ON u.id=p.owner_id WHERE u.role='owner' AND u.status='active'").all();
 for(const row of rows.results||[])try{await runPaperTick(env,{id:row.owner_id,role:'owner'})}catch{}
}
