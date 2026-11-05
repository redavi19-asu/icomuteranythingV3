// Strict, bounded market-stream event policy. A message is a scan trigger,
// NOT proof of Schwab's real-time market-data entitlement.
export const isStreamTicker=s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(s);
export const isStreamContract=s=>typeof s==='string'&&s.length<=90&&/^[A-Z0-9 .:_-]{2,90}$/.test(s);
export function streamScanAllowed({now=Date.now(),receivedAt=0,lastScanAt=0,lastSymbolAt=0,mode='MULTI'}={}){
 if(!Number.isFinite(now)||!Number.isFinite(receivedAt)||receivedAt<=0||receivedAt>now+5000||now-receivedAt>5000)return false;
 const globalMs=mode==='SINGLE'?3000:5000;
 const symbolMs=mode==='SINGLE'?3000:12000;
 return now-lastScanAt>=globalMs&&now-lastSymbolAt>=symbolMs;
}

/**
 * Select the least-recently scanned ticker with a fresh Schwab streaming event.
 * Avoids a fast but incomplete loop where the same first three symbols monopolize
 * event-driven scans while the remaining watchlist is never evaluated.
 * lastTickAt and lastSymbolAt are Maps; provider data is used ONLY to wake a
 * fresh server-side REST/technical scan, never to establish quote entitlement.
 */
export function chooseFreshStreamSymbol(symbols,lastTickAt,lastSymbolAt,{now=Date.now(),lastScanAt=0,mode='MULTI'}={}){
 if(!Array.isArray(symbols)||!lastTickAt||!lastSymbolAt)return null;
 let selected=null,oldest=Infinity;
 for(const symbol of symbols){
  if(!isStreamTicker(symbol))continue;
  const receivedAt=lastTickAt.get(symbol)||0,lastAt=lastSymbolAt.get(symbol)||0;
  if(!streamScanAllowed({now,receivedAt,lastScanAt,lastSymbolAt:lastAt,mode}))continue;
  if(lastAt<oldest){oldest=lastAt;selected=symbol;}
 }
 return selected;
}
