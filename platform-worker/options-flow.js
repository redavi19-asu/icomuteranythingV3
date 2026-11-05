// Optional server-only licensed contract tape. Never trust browser flow payloads
// and never use a simulated print for production opportunity alerts.
// Official endpoint: https://api.unusualwhales.com/api/option-contract/{id}/flow
const OCC=/^[A-Z]{1,6}\d{6}[CP]\d{8}$/;
export async function getContractFlow(env,schwabSymbol){
 const raw=String(schwabSymbol||'').replace(/\s+/g,'').toUpperCase();
 const base={available:false,provider:'UNUSUAL_WHALES',contractSymbol:raw,events:[],
  reason:'Unusual Whales API key not configured; verified options flow unavailable.'};
 const key=String(env.UNUSUAL_WHALES_API_KEY||'').trim();
 if(!key)return base;
 if(!OCC.test(raw))return {...base,reason:'Contract code did not pass OCC format validation; no flow query sent.'};
 try{
  const endpoint='https://api.unusualwhales.com/api/option-contract/'+encodeURIComponent(raw)+'/flow?limit=100';
  const result=await fetch(endpoint,{method:'GET',headers:{Authorization:'Bearer '+key,Accept:'application/json'},
   redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!result.ok)return {...base,reason:'Options-flow provider rejected the request (HTTP '+result.status+').'};
  const length=Number(result.headers.get('content-length')||0);
  if(length>750_000)return {...base,reason:'Options-flow response exceeded size limit.'};
  const json=await result.json();
  if(!Array.isArray(json?.data))return {...base,reason:'Options-flow provider returned an unexpected schema.'};
  // Only whitelisted quote/print fields are passed to the evidence engine.
  return {...base,available:true,reason:'',events:json.data.slice(0,100).map(r=>({
   id:r.id??r.tracking_id,executed_at:r.executed_at,premium:r.premium,
   ask_vol:r.ask_vol,bid_vol:r.bid_vol,is_sweep:r.is_sweep,
   sweep_vol:r.sweep_vol,trade_type:r.trade_type,canceled:r.canceled,
   is_multi_leg:r.is_multi_leg,is_multileg:r.is_multileg,is_spread:r.is_spread,
   exchange:r.exchange
  }))};
 }catch{return {...base,reason:'Options-flow provider unavailable or request timed out.'}}
}
