/*
 * ICA PRIME / PAPER ONLY — Don't Chase entry-timing context.
 *
 * A trend can remain bearish or bullish long after a favorable entry has gone.
 * This is a transparent, deterministic *heuristic*, not a measured win-rate or
 * claim of detecting institution activity. It does not use clock-time cutoffs,
 * news sentiment, or artificial prices. Input is verified, completed Schwab
 * OHLCV candles and the current technical signal.
 */
const newYorkDay=new Intl.DateTimeFormat('en-CA',{
 timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'
});
const marketClock=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
 hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const marketMinute=ms=>{const parts=marketClock.formatToParts(ms);
 const h=Number(parts.find(x=>x.type==='hour')?.value),
  m=Number(parts.find(x=>x.type==='minute')?.value);
 return h*60+m;
};
const round=n=>Number.isFinite(n)?Math.round(n*100)/100:null;
const valid=b=>b&&[b.time,b.open,b.high,b.low,b.close,b.volume].every(Number.isFinite)&&
 b.open>0&&b.close>0&&b.high>=Math.max(b.open,b.close)&&
 b.low<=Math.min(b.open,b.close)&&b.high>=b.low&&b.volume>=0;
const result=(status,hold,reason,metrics={})=>({status,hold,reason,metrics});

/**
 * Return a watch/hold when today's directional move has become stretched
 * relative to recent *one-minute* volatility AND is far from session VWAP,
 * unless the immediate breakout follows a tight base or a pullback/rejection.
 *
 * Crucially, a new 11:45 a.m. or 2:00 p.m. catalyst can still qualify after
 * a recent base or retracement. There is NO time-of-day trading ban.
 */
export function assessEntryChase(bars,signal){
 if(signal?.state!=='TECHNICAL_WATCH'||!['PUT','CALL'].includes(signal?.direction))
  return result('NOT_APPLICABLE',false,'No confirmed technical entry is being evaluated.');
 if(!Array.isArray(bars)||bars.length<40||!bars.slice(-45).every(valid))
  return result('UNASSESSED',false,'Too few trustworthy completed candles to assess a stretched entry.');
 const last=bars.at(-1),day=newYorkDay.format(last.time);
 // Only count regular-session moves from the 9:30 opening print.
 // Premarket movement must not be mistaken for a late morning chase.
 const session=bars.slice(-500).filter(b=>newYorkDay.format(b.time)===day&&
  marketMinute(b.time)>=570&&marketMinute(b.time)<960);
 if(session.length<35||!session.slice(-35).every(valid))
  return result('UNASSESSED',false,'Need sufficient completed candles from today to evaluate session extension.');
 const prior=session.slice(-22,-1);
 const ranges=prior.slice(1).map((bar,i)=>
  Math.max(bar.high-bar.low,Math.abs(bar.high-prior[i].close),Math.abs(bar.low-prior[i].close)));
 const atr=ranges.reduce((sum,n)=>sum+n,0)/ranges.length;
 const vwap=signal.metrics?.vwap;
 if(!Number.isFinite(atr)||atr<=0||!Number.isFinite(vwap)||vwap<=0)
  return result('UNASSESSED',false,'Reliable intraday volatility or VWAP is unavailable.');
 const bearish=signal.direction==='PUT',dir=bearish?-1:1;
 const sessionMoveAtr=dir*(last.close-session[0].open)/atr;
 const vwapGapAtr=dir*(last.close-vwap)/atr;
 const rsi=signal.metrics?.rsi14;
 const extremeRsi=Number.isFinite(rsi)&&(bearish?rsi<=35:rsi>=68);
 // Calibratable, intentionally conservative *entry context*, not a profit forecast.
 const stretched=(sessionMoveAtr>=7.5&&vwapGapAtr>=2.0)||
  (sessionMoveAtr>=11&&extremeRsi)||(sessionMoveAtr>=4&&vwapGapAtr>=4.5);
 const metrics={sessionMoveAtr:round(sessionMoveAtr),vwapGapAtr:round(vwapGapAtr),
  atr1m:round(atr),rsi14:Number.isFinite(rsi)?round(rsi):null,
  signalDirection:signal.direction,consolidation:false,retest:false};
 if(!stretched)return result('CLEAR',false,'The current breakout is not overextended by the session-move and VWAP checks.',metrics);

 // Fresh event breakout after a narrow base: do not impose a lunch/late-day
 // ban merely because the stock made a large earlier directional move.
 const preBreak=session.slice(-11,-1);
 const range=Math.max(...preBreak.map(b=>b.high))-Math.min(...preBreak.map(b=>b.low));
 const drift=Math.abs(preBreak.at(-1).close-preBreak[0].open);
 metrics.consolidation=range<=2.3*atr&&drift<=1.0*atr;
 if(metrics.consolidation)
  return result('FRESH_BASE_BREAKOUT',false,
   'New breakout followed a tight recent base; a prior directional move alone does not disqualify it.',metrics);

 // For a stretched PUT, require evidence of a price bounce away from a
 // previous low before renewed bearish breakdown. Mirror the idea for CALLS.
 const search=session.slice(-23,-2);
 if(search.length>=8){
  const extremum=search.reduce((chosen,b,i)=>
   bearish?(b.low<search[chosen].low?i:chosen):(b.high>search[chosen].high?i:chosen),0);
  const after=search.slice(extremum+1);
  if(after.length>=2){
   const excursion=bearish?
    Math.max(...after.map(b=>b.high))-search[extremum].low:
    search[extremum].high-Math.min(...after.map(b=>b.low));
   const newestTwo=session.slice(-2),rejection=bearish?
    last.close<newestTwo[0].low:last.close>newestTwo[0].high;
   metrics.retest=excursion>=1.2*atr&&rejection;
  }
 }
 if(metrics.retest)
  return result('RETEST_CONFIRMED',false,bearish?
   'A bounce and renewed downside break provide a fresh PUT entry context.':
   'A dip and renewed upside break provide a fresh CALL entry context.',metrics);

 return result(bearish?'WAIT_FOR_BOUNCE':'WAIT_FOR_PULLBACK',true,bearish?
  'PUT chase hold: today\'s decline is extended versus recent volatility and VWAP. Wait for a bounce, lower high and fresh bearish break.':
  'CALL chase hold: today\'s rise is extended versus recent volatility and VWAP. Wait for a pullback, higher low and fresh bullish break.',metrics);
}
