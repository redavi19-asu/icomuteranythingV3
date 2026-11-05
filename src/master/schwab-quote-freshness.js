// Client-facing freshness label only; server paper-entry checks remain authoritative.
// A "connected" OAuth session, recent HTTP response, or open WebSocket does NOT prove
// the quote itself is real-time. Both provider entitlement and quote timestamp matter.
export function schwabQuoteFreshness({realtime,quoteTime}={},now=Date.now(),maxAgeMs=60000){
 if(realtime===false)return {code:'DELAYED',label:'DELAYED — not for live setups'};
 if(realtime!==true)return {code:'UNCONFIRMED',label:'REAL-TIME STATUS UNCONFIRMED'};
 const at=typeof quoteTime==='number'?quoteTime:typeof quoteTime==='string'&&quoteTime.trim()?Date.parse(quoteTime):NaN;
 if(!Number.isFinite(at)||at<=0)return {code:'UNKNOWN_TIME',label:'QUOTE TIME NOT VERIFIED'};
 const age=now-at;
 if(age < -5000)return {code:'INVALID_TIME',label:'QUOTE CLOCK INVALID'};
 if(age>maxAgeMs)return {code:'STALE',label:'REAL-TIME FEED · QUOTE STALE'};
 return {code:'VERIFIED_FRESH',label:'SCHWAB REAL-TIME · FRESH QUOTE'};
}
