/**
 * Select *paper* option contracts for low absolute bid/ask friction.
 * Only use provider quotes, volume, OI and delta; no predicted performance.
 */
export const PAPER_SPREAD_CENT_CHOICES=Object.freeze([1,2,3,5,10]);
export const DEFAULT_PAPER_SPREAD_CENTS=2;
export function spreadCents(quote){
 if(!quote||!Number.isFinite(quote.ask)||!Number.isFinite(quote.bid)||
   quote.ask<=0||quote.bid<0||quote.bid>quote.ask)return Infinity;
 return (quote.ask-quote.bid)*100;
}
export function normalizePaperSpreadCents(value){
 return PAPER_SPREAD_CENT_CHOICES.includes(value)?value:DEFAULT_PAPER_SPREAD_CENTS;
}
export function absoluteSpreadFailure(quote,maximumCents=DEFAULT_PAPER_SPREAD_CENTS){
 const spread=spreadCents(quote);
 if(!Number.isFinite(spread))return 'INVALID_QUOTE';
 return spread>normalizePaperSpreadCents(maximumCents)+1e-6?'SPREAD_TOO_WIDE_IN_CENTS':null;
}
/** Low *dollar* spread first; then relative spread, real contract liquidity
 * and closeness to a conventional 0.50-delta paper scalp. */
export function rankPaperContracts(contracts){
 return [...contracts].sort((a,b)=>{
  const ac=spreadCents(a),bc=spreadCents(b);
  if(Math.abs(ac-bc)>1e-6)return ac-bc;
  const ar=(a.ask-a.bid)/a.ask,br=(b.ask-b.bid)/b.ask;
  if(Math.abs(ar-br)>1e-8)return ar-br;
  const av=(a.volume||0),bv=(b.volume||0);
  if(av!==bv)return bv-av;
  const ao=(a.openInterest||0),bo=(b.openInterest||0);
  if(ao!==bo)return bo-ao;
  return Math.abs(Math.abs(a.delta||0)-.50)-Math.abs(Math.abs(b.delta||0)-.50);
 });
}
