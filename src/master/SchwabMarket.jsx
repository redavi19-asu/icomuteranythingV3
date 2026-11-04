import React,{useEffect,useState} from 'react';
import {request} from './SchwabConnection';
const stamp=v=>v?new Date(v).toLocaleTimeString('en-US',{timeZone:'America/New_York'}):'Unavailable';
const money=v=>typeof v==='number'?'$'+v.toFixed(2):'—';
function useMarket(path,enabled,period=30000){
 const [state,setState]=useState({data:null,error:'',loading:false});
 useEffect(()=>{let cancelled=false,timer;
  setState({data:null,error:'',loading:enabled});
  async function load(){try{const data=await request(path);if(!cancelled)setState({data,error:'',loading:false})}catch(e){if(!cancelled)setState({data:null,error:e.message,loading:false})}finally{if(!cancelled)timer=setTimeout(load,period)}}
  if(enabled)load();return()=>{cancelled=true;clearTimeout(timer)};
 },[path,enabled,period]);return state;
}
export function SchwabChart({symbol,enabled}){
 const [frequency,setFrequency]=useState(5),[expanded,setExpanded]=useState(false);
 const {data,error,loading}=useMarket('history?symbol='+symbol+'&frequency='+frequency,enabled);
 const quote=useMarket('quotes?symbols='+symbol,enabled,15000);
 const candles=(data?.candles||[]).slice(-100),q=quote.data?.quotes?.[0];
 const values=candles.flatMap(c=>[c.low,c.high]),low=Math.min(...values),high=Math.max(...values),span=high-low||1;
 const y=p=>270-(p-low)/span*230;
 return <section className="itt-card" style={expanded?{position:'fixed',inset:20,zIndex:10000,overflow:'auto',background:'#101722'}:{}} aria-label="Schwab price chart">
 <div className="itt-card-heading"><div><div className="itt-eyebrow">SCHWAB MARKET DATA</div><h3>{symbol} · Price chart</h3></div><button className="itt-wide-button" onClick={()=>setExpanded(!expanded)}>{expanded?'Close expanded chart':'Expand chart'}</button></div>
 <div style={{padding:'0 18px 18px'}}><strong>{money(q?.last)} · Bid {money(q?.bid)} · Ask {money(q?.ask)}</strong>
 <p style={{fontSize:12}}>Quote {stamp(q?.quoteTime)} ET · {q?.realtime===true?'Schwab marks quote real-time':q?.realtime===false?'Delayed quote':'Quote status unconfirmed'} · Quotes refresh every 15 seconds.</p>
 <div className="itt-chain-tabs">{[1,5,15,30,60].map(f=><button key={f} aria-pressed={frequency===f} onClick={()=>setFrequency(f)}>{f}m</button>)}</div>
 {!enabled?<p>Connect Schwab to load candles.</p>:error||quote.error?<p role="alert">{error||quote.error}</p>:loading?<p>Loading Schwab candles…</p>:candles.length?<svg viewBox="0 0 800 310" role="img" aria-label={symbol+' Schwab candlestick chart'} style={{width:'100%',minHeight:260,background:'#0a101b'}}>
 {[0,1,2,3,4].map(i=>{const price=low+span*i/4;return <g key={i}><line x1="0" x2="730" y1={y(price)} y2={y(price)} stroke="#253246"/><text x="735" y={y(price)+4} fill="#aabbd0" fontSize="11">{price.toFixed(2)}</text></g>})}
 {candles.map((c,i)=>{const x=10+i*710/candles.length,w=Math.max(2,500/candles.length),color=c.close>=c.open?'#32d5a0':'#ff6581';return <g key={c.time}><title>{stamp(c.time)} ET · O {c.open} H {c.high} L {c.low} C {c.close}</title><line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color}/><rect x={x-w/2} y={Math.min(y(c.open),y(c.close))} width={w} height={Math.max(1,Math.abs(y(c.open)-y(c.close)))} fill={color}/></g>})}
 <text x="10" y="300" fill="#aabbd0" fontSize="11">{stamp(candles[0].time)} ET</text><text x="610" y="300" fill="#aabbd0" fontSize="11">{stamp(candles.at(-1).time)} ET</text>
 </svg>:<p>No candles returned for this session.</p>}
 {data&&<p style={{fontSize:11}}>Historical candles from Schwab · Last candle {candles.length?new Date(candles.at(-1).time).toLocaleString('en-US',{timeZone:'America/New_York'}):'Unavailable'} ET · Fetched {stamp(data.receivedAt)} ET. Candles refresh every 30 seconds; the current candle may be incomplete. Extended hours included.</p>}
 </div></section>;
}
export function SchwabOptions({symbol,side,enabled}){
 const {data,error,loading}=useMarket('options?symbol='+symbol,enabled,60000);
 const rows=(data?.contracts||[]).filter(c=>c.side===side);
 return <div style={{padding:12,overflow:'auto',maxHeight:520}}>{!enabled?<p>Connect Schwab to load contracts.</p>:error?<p role="alert">{error}</p>:loading?<p>Loading contracts…</p>:<>
 <p style={{fontSize:11}}>Schwab · {data?.delayed===true?'Delayed':data?.delayed===false?'Provider reports no delay':'Delay status unconfirmed'} · Fetched {stamp(data?.receivedAt)} ET. Refreshes every 60 seconds. Contract timestamps appear below.</p>
 <table style={{width:'100%',fontSize:11,borderCollapse:'collapse'}}><thead><tr>{['Expiry / strike','Bid / ask','Δ','Vol / OI','Quote ET'].map(v=><th key={v} style={{textAlign:'left',padding:5}}>{v}</th>)}</tr></thead><tbody>{rows.map(c=><tr key={c.symbol} title={c.symbol} style={{borderTop:'1px solid #273347'}}><td>{c.expiration}<br/>{money(c.strike)}{c.nonStandard?' *':''}</td><td>{money(c.bid)}<br/>{money(c.ask)}</td><td>{c.delta?.toFixed(2)??'—'}</td><td>{c.volume??'—'} / {c.openInterest??'—'}</td><td>{stamp(c.quoteTime)}</td></tr>)}</tbody></table>
 {!rows.length&&<p>No contracts returned.</p>}<p style={{fontSize:11}}>Contract data for review; no trade recommendation. * Nonstandard contract.</p></>}</div>;
}
export function SchwabWatchPrices({symbols,enabled,onQuotes}){
 const {data}=useMarket('quotes?symbols='+symbols.slice(0,8).join(','),enabled,15000);
 const extra=useMarket('quotes?symbols='+symbols.slice(8).join(','),enabled&&symbols.length>8,15000);
 useEffect(()=>{onQuotes([...(data?.quotes||[]),...(extra.data?.quotes||[])])},[data,extra.data,onQuotes]);return null;
}
