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
