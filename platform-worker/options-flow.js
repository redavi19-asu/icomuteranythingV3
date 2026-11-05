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
  const endpoint='https://api.unusualwhales.com/api/option-contract/'+encodeURIComponent(raw)+'/flow?limit=100&min_premium=25000';
  const result=await fetch(endpoint,{method:'GET',headers:{Authorization:'Bearer '+key,Accept:'application/json'},
   redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!result.ok)return {...base,reason:'Options-flow provider rejected the request (HTTP '+result.status+').'};
  const length=Number(result.headers.get('content-length')||0);
  if(length>750_000)return {...base,reason:'Options-flow response exceeded size limit.'};
  const json=await result.json();
  if(!Array.isArray(json?.data))return {...base,reason:'Options-flow provider returned an unexpected schema.'};
  // Only whitelisted quote/print fields are passed to the evidence engine.
  return {...base,available:true,reason:'',events:json.data.slice(0,100).map(r=>({
   id:r.id,executed_at:r.executed_at,premium:r.premium,
   option_chain_id:r.option_chain_id,option_type:String(r.option_type||'').toUpperCase(),
   ask_vol:r.ask_vol,bid_vol:r.bid_vol,mid_vol:r.mid_vol,
   multi_vol:r.multi_vol,stock_multi_vol:r.stock_multi_vol,
   canceled:r.canceled,exchange:r.exchange
  }))};
 }catch{return {...base,reason:'Options-flow provider unavailable or request timed out.'}}
}
