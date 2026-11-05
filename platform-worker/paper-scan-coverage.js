/*
 * Paper scanner rotation and durable per-symbol visibility.
 * Streaming events are optional accelerators; the fixed rotating scan must
 * visit every unique configured ticker, including custom watchlist additions.
 * This module never produces brokerage orders or market-data signals.
 */
const validTicker=s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(s);
export function rotatingTickerBatch(symbols,index=0,size=5){
 if(!Array.isArray(symbols))return [];
 const unique=[...new Set(symbols.filter(validTicker))];
 if(!unique.length)return [];
 const start=Number.isInteger(index)&&index>=0?index:0;
 const n=Number.isInteger(size)&&size>0?Math.min(size,unique.length):0;
 return Array.from({length:n},(_,i)=>unique[(start+i)%unique.length]);
}

export function saveSymbolScanCoverage(state,{symbol,checkedAt,day,source,scanState,reason}){
 if(!validTicker(symbol)||!Number.isFinite(checkedAt)||checkedAt<=0||
    typeof day!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(day))return;
 state.scanCoverage??={};
 const prior=state.scanCoverage[symbol];
 const sameDay=prior?.day===day;
 state.scanCoverage[symbol]={
  day,checkedAt,firstCheckedAt:sameDay?prior.firstCheckedAt||checkedAt:checkedAt,
  scansToday:(sameDay?(Number.isInteger(prior.scansToday)?prior.scansToday:0):0)+1,
  state:typeof scanState==='string'?scanState:'UNAVAILABLE',
  reason:String(reason||'').slice(0,400),
  source:source==='STREAM'?'STREAM':'ROTATION'
 };
 // Only keep bounded, compact summaries. The front end displays the current
 // server-configured universe rather than a rolling 30-event history.
 if(Object.keys(state.scanCoverage).length>80){
  const oldest=Object.entries(state.scanCoverage).sort((a,b)=>a[1].checkedAt-b[1].checkedAt);
  for(const [key] of oldest.slice(0,Object.keys(state.scanCoverage).length-80))delete state.scanCoverage[key];
 }
}
