/**
 * Display-only PAPER trade pricing helpers.
 * A standard listed equity-option contract represents 100 shares.
 * This never claims a broker fill, and never changes the actual paper P/L.
 */
const round=(n,d=2)=>Number.isFinite(n)?Number(n.toFixed(d)):null;
export function oneDollarBelowAskPerContract(ask){
 if(!Number.isFinite(ask)||ask<=0)return null;
 return Math.max(0.01,round(ask-0.01));
}
export function optionMidpoint(bid,ask){
 if(!Number.isFinite(bid)||!Number.isFinite(ask)||bid<0||ask<bid)return null;
 return round((bid+ask)/2,4);
}
export function paperMarkPnlAtMid(position){
 const mid=optionMidpoint(position?.mark?.bid,position?.mark?.ask);
 const entry=position?.fill;
 if(mid===null||!Number.isFinite(entry))return null;
 // Thinkorswim-style unrealized mark, BEFORE a hypothetical closing trade.
 // Paper broker accounting continues to use BID less fees/slippage.
 return round((mid-entry)*100*(Number.isInteger(position?.quantity)&&position.quantity>=1?position.quantity:1));
}
