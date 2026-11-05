// ICA PRIME: strict, auditable evidence gate. Not a win-probability estimator.
// An options chain's daily volume/open interest is NOT institutional order flow.
export const FLOW_RULES=Object.freeze({
 lookbackMs:5*60_000, minPrintPremium:25_000, minTotalPremium:250_000,
 minDistinctPrints:2, requireSweep:false
});
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const stamp=v=>{
 if(typeof v==='number'&&Number.isFinite(v))return v<1e11?v*1000:v;
 if(typeof v!=='string'||!/(?:Z|[+-]\d\d:?\d\d)$/i.test(v))return NaN;
 return Date.parse(v);
};
const code=v=>String(v||'').replace(/\s+/g,'').toUpperCase();
const sourceReady=flow=>flow?.available===true&&flow?.provider==='UNUSUAL_WHALES'&&Array.isArray(flow.events);
const yes=v=>v===true||v===1||v==='true';
export function evaluateVerifiedFlow(flow,{contractSymbol,side,now=Date.now(),rules=FLOW_RULES}={}){
 const base={status:'UNAVAILABLE',confirmed:false,provider:'UNUSUAL_WHALES',level2:'NOT_CONNECTED',printCount:0,premium:0,sweepCount:0,reason:'Licensed real-time options-flow feed is not connected.'};
 if(!sourceReady(flow))return {...base,reason:flow?.reason||base.reason};
 if(code(flow.contractSymbol)!==code(contractSymbol)||!['CALL','PUT'].includes(side))
  return {...base,status:'INVALID',reason:'Provider evidence is not scoped to this exact option contract and side.'};
 const qualifying=[],seen=new Set();
 for(const e of flow.events.slice(0,150)){
  if(!e||typeof e!=='object'||yes(e.canceled))continue;
  // Official contract flow REST returns multi_vol and stock_multi_vol;
  // never mistake a multi-leg hedge for an outright ask-side option buy.
  if(finite(e.multi_vol)>0||finite(e.stock_multi_vol)>0)continue;
  if(code(e.option_chain_id)!==code(contractSymbol)||code(e.option_type)!==side)continue;
  const at=stamp(e.executed_at),premium=finite(e.premium);
  const ask=finite(e.ask_vol),bid=finite(e.bid_vol);
  if(!Number.isFinite(at)||at>now+5_000||now-at>rules.lookbackMs||at>now)continue;
  if(premium===null||premium<rules.minPrintPremium||ask===null||ask<=0||bid===null||ask<=bid)continue;
  // This endpoint has no documented 'is_sweep' field. Do not invent a sweep.
  const isSweep=false;
  const key=String(e.id??[at,premium,ask,bid,e.exchange||''].join('|'));
  if(seen.has(key))continue;
  seen.add(key);qualifying.push({premium,isSweep});
 }
 const total=qualifying.reduce((a,b)=>a+b.premium,0);
 const sweeps=qualifying.filter(x=>x.isSweep).length;
 const confirmed=qualifying.length>=rules.minDistinctPrints&&total>=rules.minTotalPremium&&(!rules.requireSweep||sweeps>=1);
 return {...base,status:confirmed?'CONFIRMED':'INSUFFICIENT',confirmed,printCount:qualifying.length,
  premium:total,sweepCount:sweeps,reason:confirmed?
   'Same-contract, recent, repeated ask-dominant prints; no sweep or opening position verified.':
   'Flow is connected, but same-contract ask-dominant, single-leg activity, count, recency or premium thresholds did not all pass.'};
}
// MACD, OBV and multi-timeframe trend are additional evidence, separate from the
// existing VWAP/RSI/breakout/volume technical gate.
const ema=(a,p)=>{if(a.length<p)return null;let v=a.slice(0,p).reduce((x,y)=>x+y,0)/p;for(const x of a.slice(p))v+=(x-v)*2/(p+1);return v};
const groupedBars=(bars,ms)=>{
 const grouped=[];let bucket=null;
 for(const b of bars){
  const key=Math.floor(b.time/ms);
  if(!bucket||bucket.key!==key){bucket={key,open:b.open,high:b.high,low:b.low,close:b.close,volume:b.volume};grouped.push(bucket)}
  else {bucket.high=Math.max(bucket.high,b.high);bucket.low=Math.min(bucket.low,b.low);bucket.close=b.close;bucket.volume+=b.volume}
 }
 return grouped;
};
export function evaluateAristotleConfluence(bars,direction){
 const base={confirmed:false,macd:false,obv:false,fiveMinute:false,fifteenMinute:false,reason:''};
 if(!['CALL','PUT'].includes(direction))return {...base,reason:'Technical direction not confirmed.'};
 if(!Array.isArray(bars)||bars.length<150)return {...base,reason:'Need 150 completed 1-minute bars for multi-timeframe checks.'};
 if(bars.some(b=>![b.time,b.open,b.high,b.low,b.close,b.volume].every(Number.isFinite)))return {...base,reason:'Incomplete market candles.'};
 const prices=bars.map(b=>b.close),up=direction==='CALL';
 const macdSeries=[];
 for(let i=26;i<=prices.length;i++){
  const subset=prices.slice(0,i),short=ema(subset,12),long=ema(subset,26);
  if(short!==null&&long!==null)macdSeries.push(short-long);
 }
 const signal=ema(macdSeries,9),histogram=macdSeries.at(-1)-signal;
 let obv=0,obvPrior=0;
 for(let i=1;i<bars.length;i++){
  if(i===bars.length-10)obvPrior=obv;
  obv+=(bars[i].close>bars[i-1].close?1:bars[i].close<bars[i-1].close?-1:0)*bars[i].volume;
 }
 const five=groupedBars(bars,300_000),fifteen=groupedBars(bars,900_000);
 const trend=(b,p,require21)=>{
  if(b.length<(require21?22:10))return false;
  const c=b.map(v=>v.close),e9=ema(c,9),e21=require21?ema(c,21):null,last=c.at(-1);
  return up?(last>e9&&(!require21||e9>e21)):(last<e9&&(!require21||e9<e21));
 };
 const macd=up?histogram>0:histogram<0,obvPass=up?obv>obvPrior:obv<obvPrior;
 const fiveMinute=trend(five,9,true),fifteenMinute=trend(fifteen,9,false);
 const confirmed=macd&&obvPass&&fiveMinute&&fifteenMinute;
 return {...base,confirmed,macd,obv:obvPass,fiveMinute,fifteenMinute,
  reason:confirmed?'MACD, OBV, 5-minute and 15-minute direction all agree.':
   'MACD, OBV or 5-/15-minute trend confirmation is missing.'};
}

// Swing data must be DAILY completed bars, not fabricated from a couple hours.
export function evaluateDailySwing(bars,direction=null){
 const base={status:'UNASSESSED',direction:null,confirmed:false,reason:'Insufficient completed daily candles for multi-day swing analysis.'};
 if(!Array.isArray(bars)||bars.length<55)return base;
 const valid=bars.slice(-90).filter(b=>b&&[b.open,b.high,b.low,b.close,b.volume,b.time].every(Number.isFinite));
 if(valid.length<55)return base;
 const prices=valid.map(b=>b.close),e9=ema(prices,9),e21=ema(prices,21),e50=ema(prices,50);
 const last=valid.at(-1),prev=valid.at(-2);
 const up=last.close>e9&&e9>e21&&e21>e50;
 const down=last.close<e9&&e9<e21&&e21<e50;
 const dir=up?'CALL':down?'PUT':null;
 const volAvg=valid.slice(-21,-1).reduce((sum,b)=>sum+b.volume,0)/20;
 const relativeVolume=volAvg>0?last.volume/volAvg:0;
 const bullBreak=last.close>Math.max(...valid.slice(-21,-1).map(b=>b.high));
 const bearBreak=last.close<Math.min(...valid.slice(-21,-1).map(b=>b.low));
 const confirmed=!!dir&&relativeVolume>=1.2&&(up?bullBreak:bearBreak);
 const aligned=direction===null||direction===dir;
 return {status:confirmed?'SWING_WATCH':'NO_SWING',direction:dir,confirmed:confirmed&&aligned,
  relativeVolume:Number(relativeVolume.toFixed(2)),asOf:last.time,
  reason:confirmed?(aligned?'Daily EMA 9/21/50, 20-session breakout and relative volume support a multi-day watch.':'Daily direction conflicts with the intraday setup.'):
   'Daily EMA alignment, 20-session breakout and relative volume do not all confirm.'};
}
export function classifyTradeHorizon({bars,signal,contract,dailySignal,now=Date.now()}={}){
 const unassessed={type:'UNASSESSED',label:'Trade style not assessed',window:'No reliable holding-window estimate',reason:'More confirmed price and contract data required.',invalidation:'Follow predefined paper risk controls.'};
 if(!signal||signal.state!=='TECHNICAL_WATCH'||!Array.isArray(bars)||bars.length<40)return unassessed;
 const expiry=contract?.expiration&&Date.parse(String(contract.expiration)+'T23:59:59Z');
 const dte=Number.isFinite(expiry)?(expiry-now)/86400000:null;
 const context=dailySignal?.confirmed&&dailySignal.direction===signal.direction;
 const common={invalidation:'Monitor loss of VWAP/EMA alignment, momentum reversal, poor liquidity, and the planned stop; re-evaluate before the close.',dte: dte===null?null:Number(dte.toFixed(1))};
 if(context&&dte!==null&&dte>=14)return {...common,type:'INTRADAY_HOLD',label:'Intraday hold · daily trend support',
  window:'Tens of minutes through today’s session (conditional; no overnight holding)',
  reason:'Completed daily candles reinforce intraday momentum. Multi-day swing is a separate information-only watch; paper position still closes at session end.'};
 const barsFor15=groupedBars(bars.slice(-150),900_000);
 const up=signal.direction==='CALL',trend15=barsFor15.length>=9?(()=>{
  const p=barsFor15.map(x=>x.close),e=ema(p,9),last=p.at(-1);
  return up?last>e:last<e;
 })():false;
 if(trend15&&signal.metrics?.volumeMultiple>=1.5&&(dte===null||dte>=1))return {...common,type:'INTRADAY_HOLD',label:'Intraday trend / hold candidate',
  window:'Tens of minutes to the closing bell (conditional, not a promise)',
  reason:'Aligned 15-minute direction plus stronger relative volume favor monitoring a sustained session move. Must be managed or closed according to existing paper rules.'};
 return {...common,type:'SCALP',label:'Momentum scalp candidate',
  window:'Minutes (conditional; exit at invalidation rather than a fixed time)',
  reason:'Confirmed short-term momentum without enough sustained-session evidence for a longer hold.'};
}
