/*
 * ICA PRIME confirmed 5/5 swing-level context (PAPER ONLY).
 * Uses completed Schwab 1-minute OHLCV candles, never TradingView data.
 * A swing high/low is visible only after FIVE right-hand candles have closed.
 * Levels inform new entry timing; protective option-premium stops are unchanged.
 */
const newYorkDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
const clock=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const minuteOfDay=ms=>{const p=clock.formatToParts(ms);return Number(p.find(x=>x.type==='hour')?.value)*60+Number(p.find(x=>x.type==='minute')?.value)};
const round=(n,d=4)=>Number.isFinite(n)?Number(n.toFixed(d)):null;
const valid=b=>!!b&&[b.time,b.open,b.high,b.low,b.close,b.volume].every(Number.isFinite)&&
 b.open>0&&b.close>0&&b.high>=Math.max(b.open,b.close)&&b.low<=Math.min(b.open,b.close)&&b.volume>=0;

/** Strict 5/5 pivots: ties do not become arbitrary pivot levels. */
export function confirmedSwing55(bars,{left=5,right=5}={}){
 const none={highs:[],lows:[]};
 if(!Array.isArray(bars)||!Number.isInteger(left)||!Number.isInteger(right)||left<1||right<1||left>20||right>20)return none;
 const highs=[],lows=[];
 for(let i=left;i<bars.length-right;i++){
  const b=bars[i];if(!valid(b))continue;
  let high=true,low=true;
  for(let j=i-left;j<=i+right;j++){
   if(j===i)continue;
   if(!valid(bars[j])){high=false;low=false;break}
   if(bars[j].high>=b.high)high=false;
   if(bars[j].low<=b.low)low=false;
   if(!high&&!low)break;
  }
  if(high)highs.push({price:round(b.high),pivotTime:b.time,confirmedAfter:bars[i+right].time+60000});
  if(low)lows.push({price:round(b.low),pivotTime:b.time,confirmedAfter:bars[i+right].time+60000});
 }
 return {highs,lows};
}
const noLevels=(status,reason)=>({status,hold:false,reason,support:null,resistance:null,atr1m:null,zoneSize:null,source:'SCHWAB_CONFIRMED_5_5_1M'});

/** 
 * Conservative, price-level-aware pre-entry check.
 * If a PUT runs into recently confirmed support (or a CALL into resistance),
 * wait for two completed closes beyond the level before accepting a breakdown.
 * No time-based or midday ban; no position or stop-loss modifications.
 */
export function assessSwing55Entry(bars,signal){
 if(signal?.state!=='TECHNICAL_WATCH'||!['CALL','PUT'].includes(signal?.direction))
  return noLevels('NOT_APPLICABLE','A technical entry signal is not under review.');
 if(!Array.isArray(bars)||bars.length<35||!valid(bars.at(-1)))
  return noLevels('UNASSESSED','Insufficient completed OHLCV bars to verify swing support/resistance.');
 const today=newYorkDay.format(bars.at(-1).time);
 const session=bars.slice(-600).filter(b=>newYorkDay.format(b.time)===today&&
  minuteOfDay(b.time)>=570&&minuteOfDay(b.time)<960);
 if(session.length<25||session.slice(-25).some(b=>!valid(b)))
  return noLevels('UNASSESSED','Too few trustworthy regular-session candles for 5/5 swing levels.');
 const previous=session.slice(-22,-1);
 const trueRanges=previous.slice(1).map((b,i)=>
  Math.max(b.high-b.low,Math.abs(b.high-previous[i].close),Math.abs(b.low-previous[i].close)));
 const atr=trueRanges.reduce((sum,v)=>sum+v,0)/trueRanges.length;
 if(!Number.isFinite(atr)||atr<=0)return noLevels('UNASSESSED','Recent one-minute volatility is unavailable.');
 const price=session.at(-1).close,zone=1.25*atr,pivots=confirmedSwing55(session);
 // Exclude stale levels invalidated BEFORE the latest two completed bars.
 const earlier=session.slice(0,-2);
 const unbrokenSupport=pivots.lows.filter(p=>!earlier.some(b=>
  b.time>p.confirmedAfter&&b.close<p.price-0.35*atr));
 const unbrokenResistance=pivots.highs.filter(p=>!earlier.some(b=>
  b.time>p.confirmedAfter&&b.close>p.price+0.35*atr));
 const supports=unbrokenSupport.filter(p=>p.price<=price+zone);
 const resistances=unbrokenResistance.filter(p=>p.price>=price-zone);
 const support=supports.sort((a,b)=>Math.abs(price-a.price)-Math.abs(price-b.price))[0]||null;
 const resistance=resistances.sort((a,b)=>Math.abs(price-a.price)-Math.abs(price-b.price))[0]||null;
 const basic={status:'LEVELS_CHECKED',hold:false,
  reason:'Confirmed 5/5 swing levels checked; no nearby opposing barrier blocks this entry.',
  support:support?.price??null,resistance:resistance?.price??null,
  atr1m:round(atr),zoneSize:round(zone),
  source:'SCHWAB_CONFIRMED_5_5_1M'};
 const isPut=signal.direction==='PUT',barrier=isPut?support:resistance;
 if(!barrier||Math.abs(price-barrier.price)>zone)return basic;
 const lastTwo=session.slice(-2),buffer=.25*atr;
 const confirmedBreak=isPut?lastTwo.every(b=>b.close<barrier.price-buffer):
  lastTwo.every(b=>b.close>barrier.price+buffer);
 if(confirmedBreak)return {...basic,status:isPut?'SUPPORT_BREAK_CONFIRMED':'RESISTANCE_BREAK_CONFIRMED',
  reason:isPut?'Two completed closes confirmed a break below swing support.':
   'Two completed closes confirmed a break above swing resistance.'};
 return {...basic,status:isPut?'WAIT_SUPPORT_BREAK':'WAIT_RESISTANCE_BREAK',hold:true,
  reason:isPut?
   'PUT entry approaching confirmed 5/5 support near $'+barrier.price.toFixed(2)+
   '. Nearby support requires confirmation before a new breakdown signal.':
   'CALL entry approaching confirmed 5/5 resistance near $'+barrier.price.toFixed(2)+
   '. Nearby resistance requires confirmation before a new breakout signal.'};
}
