// ICA PRIME: strict, auditable evidence gate. Not a win-probability estimator.
// An options chain's daily volume/open interest is NOT institutional order flow.
export const FLOW_RULES=Object.freeze({
 lookbackMs:5*60_000, minPrintPremium:25_000, minTotalPremium:250_000,
 minDistinctPrints:2, requireSweep:true
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
  if(!e||typeof e!=='object'||yes(e.canceled)||yes(e.is_multi_leg)||yes(e.is_multileg)||yes(e.is_spread))continue;
  const at=stamp(e.executed_at),premium=finite(e.premium);
  const ask=finite(e.ask_vol),bid=finite(e.bid_vol);
  if(!Number.isFinite(at)||at>now+5_000||now-at>rules.lookbackMs||at>now)continue;
  if(premium===null||premium<rules.minPrintPremium||ask===null||ask<=0||bid===null||ask<=bid)continue;
  const isSweep=yes(e.is_sweep)||finite(e.sweep_vol)>0||String(e.trade_type||'').toUpperCase()==='SWEEP';
  const key=String(e.id??e.tracking_id??[at,premium,ask,bid,e.exchange||''].join('|'));
  if(seen.has(key))continue;
  seen.add(key);qualifying.push({premium,isSweep});
 }
 const total=qualifying.reduce((a,b)=>a+b.premium,0);
 const sweeps=qualifying.filter(x=>x.isSweep).length;
 const confirmed=qualifying.length>=rules.minDistinctPrints&&total>=rules.minTotalPremium&&(!rules.requireSweep||sweeps>=1);
 return {...base,status:confirmed?'CONFIRMED':'INSUFFICIENT',confirmed,printCount:qualifying.length,
  premium:total,sweepCount:sweeps,reason:confirmed?
   'Same-contract, recent, ask-dominant repeated prints with sweep evidence; buyer identity and opening intent are unverified.':
   'Flow is connected, but same-contract ask-side sweep, count, recency or premium thresholds did not all pass.'};
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
