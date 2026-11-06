/**
 * PAPER-ONLY conditional simulated limit entries.
 * An option ask must be <= the owner's limit on a fresh provider snapshot.
 * This is NOT an exchange-resting order: server checks can miss short ticks.
 */
export const PAPER_LIMIT_MINUTES=Object.freeze([1,3,5]);
export const PAPER_LIMIT_MAX_ORDERS=8;

/** Reject invalid prices rather than silently rounding a larger limit up. */
export function validatePaperLimitAsk(value,budget){
 const n=Number(value);
 if(!Number.isFinite(n)||n<0.01||n>50||Math.abs(n*100-Math.round(n*100))>1e-6)
  throw Error('Enter a valid maximum option ask in $0.01 increments.');
 if(!Number.isFinite(budget)||budget<=0||
    (n+0.01)*100+0.65>budget+1e-6)
  throw Error('Limit plus simulated $0.01 slippage and $0.65 commission exceeds your paper premium budget.');
 return n;
}
/** Resting paper order never survives the original setup's six-minute window. */
export function paperLimitDeadline(alert,createdAt,minutes){
 if(!PAPER_LIMIT_MINUTES.includes(minutes))
  throw Error('Choose a 1-, 3-, or 5-minute paper limit hold.');
 const priceAction=alert?.qualification?.priceAction;
 if(!priceAction?.confirmed||!Number.isFinite(priceAction.confirmationBarTime))
  throw Error('A verified current price-action setup is required for a resting paper limit.');
 const deadline=Math.min(createdAt+minutes*60000,
  priceAction.confirmationBarTime+6*60000);
 if(deadline-createdAt<10000)
  throw Error('This setup is almost expired. Wait for a fresh confirmed breakout.');
 return deadline;
}
export function paperLimitMeetsPrice(freshAsk,maxAsk){
 return Number.isFinite(freshAsk)&&freshAsk>0&&Number.isFinite(maxAsk)&&maxAsk>0&&
  Math.round(freshAsk*100)<=Math.round(maxAsk*100);
}
