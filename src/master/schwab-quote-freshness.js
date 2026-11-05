// Client-facing freshness label only; server paper-entry checks remain authoritative.
// A "connected" OAuth session, recent HTTP response, or open WebSocket does NOT prove
// the quote itself is real-time. Both provider entitlement and quote timestamp matter.
export function schwabQuoteFreshness(quote={},now=Date.now(),maxAgeMs=60000){
 const {realtime,quoteTime}=quote??{};
 if(realtime===false)return {code:'DELAYED',label:'DELAYED — not for live setups'};
 if(realtime!==true)return {code:'UNCONFIRMED',label:'REAL-TIME STATUS UNCONFIRMED'};
 const at=typeof quoteTime==='number'?quoteTime:typeof quoteTime==='string'&&quoteTime.trim()?Date.parse(quoteTime):NaN;
 if(!Number.isFinite(at)||at<=0)return {code:'UNKNOWN_TIME',label:'QUOTE TIME NOT VERIFIED'};
 const age=now-at;
 if(age < -5000)return {code:'INVALID_TIME',label:'QUOTE CLOCK INVALID'};
 if(age>maxAgeMs)return {code:'STALE',label:'REAL-TIME FEED · QUOTE STALE'};
 return {code:'VERIFIED_FRESH',label:'SCHWAB REAL-TIME · FRESH QUOTE'};
}

// Keep independently verified Schwab REST quotes authoritative when stream payloads
// omit a delay flag (Schwab LEVELONE messages may omit it). Do not combine a
// stream's unverified bid/ask/time with the REST quote's real-time entitlement.
export function selectSchwabDisplayQuote(rest,stream,streamConnected=false){
 if(!streamConnected||!stream)return rest||null;
 if(stream.delayed===false&&stream.quoteTime&&Number.isFinite(Number(stream.quoteTime)))
  return {...(rest||{}),...stream,realtime:true};
 if(rest)return rest;
 return {...stream,realtime:stream.delayed===true?false:null};
}
