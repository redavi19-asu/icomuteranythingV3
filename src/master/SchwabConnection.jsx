import React,{useEffect,useState} from 'react';
const API=import.meta.env.VITE_ICA_MASTER_API_URL||'https://ica-master-platform.ryanedavis.workers.dev';
export async function request(path,post=false){
 const token=localStorage.getItem('ica_master_token')||'';if(!token)throw Error('Sign in to ICA Master first.');
 const r=await fetch(API+'/platform/schwab/'+path,{method:post?'POST':'GET',headers:{Authorization:'Bearer '+token,...(post?{'Content-Type':'application/json'}:{})},...(post?{body:'{}'}:{})});
 const d=await r.json();if(!r.ok)throw Error((d.error||'Schwab connection unavailable.')+(d.providerStatus?' HTTP '+d.providerStatus:'')+(d.errorCode?' · '+d.errorCode.replaceAll('_',' '):'')+(d.providerFormat?' · '+d.providerFormat:'')+(d.responseShape?' · '+d.responseShape:''));return d;
}
export default function SchwabConnection({symbol='SPY',onStatus}){
 const [status,setStatus]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[snapshot,setSnapshot]=useState(null),[setup,setSetup]=useState('');
 const refresh=async()=>{setBusy(true);setError('');try{const d=await request('status');setStatus(d);onStatus?.(d);if(!d.connected)setSnapshot(null)}catch(e){setError(e.message)}finally{setBusy(false)}};
 useEffect(()=>{refresh()},[]);
 useEffect(()=>{setSnapshot(null)},[symbol]);
 const connect=async()=>{setBusy(true);setError('');try{const d=await request('authorize',true);const u=new URL(d.authorizationUrl);if(u.origin!=='https://api.schwabapi.com'||u.pathname!=='/v1/oauth/authorize')throw Error('Invalid authorization destination');window.location.assign(u.toString())}catch(e){setError(e.message);setBusy(false)}};
 const testSetup=async()=>{setBusy(true);setError('');setSetup('');try{const d=await request('preflight',true);setSetup(d.note)}catch(e){setError(e.message)}finally{setBusy(false)}};
 const disconnect=async()=>{setBusy(true);setError('');try{await request('disconnect',true);setSnapshot(null);await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}};
 const quote=async()=>{setBusy(true);setError('');setSnapshot(null);try{const d=await request('quotes?symbols='+encodeURIComponent(symbol));setSnapshot(d)}catch(e){setError(e.message)}finally{setBusy(false)}};
 const q=snapshot?.quotes?.find(x=>x.symbol===symbol);
 const price=v=>typeof v==='number'?'$'+v.toFixed(2):'Unavailable';
 return <section className="itt-panel" aria-label="Private Schwab market-data connection" style={{padding:16,margin:'12px 0'}}>
  <strong>Schwab market data · {status?.connected?'Authorized':status?.appCredentialsConfigured?'App credentials installed':'Checking setup'}</strong>
  <p style={{fontSize:12,margin:'8px 0'}}>Owner-only quotes. Scanner and trade execution remain inactive. Authorization is completed directly at Schwab.</p>
  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
   <button className="itt-wide-button" disabled={busy} onClick={testSetup}>Test Schwab setup</button>
   <button className="itt-wide-button" disabled={busy} onClick={refresh}>Check Schwab connection</button>
   <button className="itt-wide-button" disabled={busy||!status?.authorizationReady} onClick={connect}>{status?.connected?'Reconnect Schwab market data':'Connect Schwab market data'}</button>
   {status?.connected&&<><button className="itt-wide-button" disabled={busy} onClick={quote}>Read {symbol} quote</button><button className="itt-wide-button" disabled={busy} onClick={disconnect}>Disconnect Schwab</button></>}
  </div>
  {status?.lastError&&<p role="status" style={{color:'#ffb0ad',fontSize:12}}>Last connection attempt: {status.lastError.error_code.replaceAll('_',' ')}{status.lastError.provider_status?' · Schwab HTTP '+status.lastError.provider_status:''}. Reconnect after the configuration issue is resolved.</p>}
  {setup&&<p role="status">{setup}</p>}
  {error&&<p role="alert" style={{color:'#ffb0ad',fontSize:12}}>{error}</p>}
  {q&&<div role="status" style={{marginTop:12,fontSize:13}}><strong>{q.symbol} · Last {price(q.last)} · Bid {price(q.bid)} · Ask {price(q.ask)}</strong><p style={{fontSize:11}}>Schwab quote timestamp: {q.quoteTime?new Date(q.quoteTime).toLocaleString('en-US',{timeZone:'America/New_York'})+' ET':'Not supplied'} · {q.realtime===true?'Provider marks this quote real-time':q.realtime===false?'Provider marks this quote delayed':'Real-time entitlement not confirmed'}. Received {new Date(snapshot.receivedAt).toLocaleTimeString('en-US',{timeZone:'America/New_York'})} ET.</p></div>}
  {snapshot&&!q&&<p role="status">Schwab returned no quote for {symbol}.</p>}
 </section>;
}
