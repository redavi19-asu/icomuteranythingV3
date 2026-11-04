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
 const [visibleBars,setVisibleBars]=useState(65),[offset,setOffset]=useState(0),[hover,setHover]=useState(null);
 const [dragStart,setDragStart]=useState(null);
 const {data,error,loading}=useMarket('history?symbol='+symbol+'&frequency='+frequency,enabled,30000);
 const quote=useMarket('quotes?symbols='+symbol,enabled,15000);
 const allCandles=(data?.candles||[]).filter(c=>Number.isFinite(c.open)&&Number.isFinite(c.close)&&Number.isFinite(c.low)&&Number.isFinite(c.high)&&Number.isFinite(new Date(c.time).getTime()));
 const count=Math.min(160,Math.max(15,visibleBars));
 const maxOffset=Math.max(0,allCandles.length-count);
 const clampedOffset=Math.min(offset,maxOffset);
 const endIndex=allCandles.length-clampedOffset;
 const candles=allCandles.slice(Math.max(0,endIndex-count),endIndex);
 const q=quote.data?.quotes?.[0];
 const values=candles.flatMap(c=>[c.low,c.high]),low=values.length?Math.min(...values):0,high=values.length?Math.max(...values):1;
 const pad=Math.max((high-low)*.08,high*.0001,.01),min=low-pad,max=high+pad,span=max-min||1;
 const y=p=>260-(p-min)/span*225;
 const x=i=>20+(i+.5)*705/Math.max(1,candles.length);
 const range=(n)=>{setVisibleBars(n);setOffset(0);setHover(null)};
 const zoom=direction=>{setVisibleBars(v=>Math.max(15,Math.min(160,v+direction*15)));setHover(null)};
 const positionIndex=e=>{
  const bounds=e.currentTarget.getBoundingClientRect();
  if(!bounds.width)return null;
  const px=(e.clientX-bounds.left)/bounds.width*800;
  return Math.max(0,Math.min(candles.length-1,Math.floor((px-20)/705*candles.length)));
 };
 const onMove=e=>{
  if(!candles.length)return;
  if(dragStart){const delta=Math.round((e.clientX-dragStart.x)/Math.max(1,e.currentTarget.getBoundingClientRect().width)*candles.length);
   if(Math.abs(delta)>=1){setOffset(Math.max(0,Math.min(maxOffset,dragStart.offset+delta)));setDragStart({x:e.clientX,offset:Math.max(0,Math.min(maxOffset,dragStart.offset+delta))});}return;}
  setHover(positionIndex(e));
 };
 const focused=hover===null?candles.at(-1):candles[hover];
 return <section className="itt-card itt-schwab-interactive" style={expanded?{position:'fixed',inset:20,zIndex:10000,overflow:'auto',background:'#101722'}:{}} aria-label="Interactive Schwab price chart">
 <div className="itt-card-heading"><div><div className="itt-eyebrow">SCHWAB MARKET DATA · INTERACTIVE</div><h3>{symbol} · Price chart</h3></div><button className="itt-wide-button" onClick={()=>setExpanded(!expanded)}>{expanded?'Close expanded chart':'Expand chart'}</button></div>
 <div className="itt-schwab-chart-content">
 <div className="itt-schwab-quote"><strong>{money(q?.last)} · Bid {money(q?.bid)} · Ask {money(q?.ask)}</strong><span>Quote {stamp(q?.quoteTime)} ET · {q?.realtime===true?'Provider marks real-time':q?.realtime===false?'Delayed':'Delay status unconfirmed'} · Polls every 15s</span></div>
 <div className="itt-schwab-toolbar"><div>{[1,5,15,30,60].map(f=><button type="button" key={f} className={frequency===f?'selected':''} aria-pressed={frequency===f} onClick={()=>{setFrequency(f);range(65)}}>{f}m</button>)}</div><div><button onClick={()=>zoom(-1)} title="Zoom in">＋ Zoom</button><button onClick={()=>zoom(1)} title="Zoom out">－ Zoom</button><button onClick={()=>{setOffset(0);setHover(null)}}>Latest ↦</button></div></div>
 {!enabled?<p>Connect Schwab under Connections & advanced settings to load candles.</p>:error||quote.error?<p role="alert">{error||quote.error}</p>:loading&&!allCandles.length?<p>Loading Schwab candles…</p>:candles.length?<div className="itt-schwab-canvas">
 <svg viewBox="0 0 800 310" role="img" aria-label={symbol+' interactive Schwab candle chart. Hover for values, drag to pan, use zoom buttons.'} className="itt-schwab-svg" onPointerMove={onMove} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);setDragStart({x:e.clientX,offset:clampedOffset})}} onPointerUp={e=>{setDragStart(null);e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>setDragStart(null)} onPointerLeave={()=>{if(!dragStart)setHover(null)}} onWheel={e=>{if(e.deltaY!==0){zoom(e.deltaY>0?1:-1)}}}>
 {[0,1,2,3,4].map(i=>{const p=min+span*i/4;return <g key={i}><line x1="10" x2="725" y1={y(p)} y2={y(p)} stroke="#253246"/><text x="735" y={y(p)+4} fill="#aabbd0" fontSize="11">{p.toFixed(2)}</text></g>})}
 {candles.map((c,i)=>{const cx=x(i),w=Math.max(2,Math.min(12,500/candles.length)),color=c.close>=c.open?'#32d5a0':'#ff6581';return <g key={c.time}><line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color}/><rect x={cx-w/2} y={Math.min(y(c.open),y(c.close))} width={w} height={Math.max(1,Math.abs(y(c.open)-y(c.close)))} fill={color}/></g>})}
 {hover!==null&&candles[hover]&&<g pointerEvents="none"><line x1={x(hover)} x2={x(hover)} y1="20" y2="270" stroke="#b3daef" strokeDasharray="4 4" opacity=".8"/><line x1="12" x2="724" y1={y(candles[hover].close)} y2={y(candles[hover].close)} stroke="#b3daef" strokeDasharray="4 4" opacity=".55"/></g>}
 <text x="15" y="298" fill="#aabbd0" fontSize="11">{stamp(candles[0].time)} ET</text><text x="610" y="298" fill="#aabbd0" fontSize="11">{stamp(candles.at(-1).time)} ET</text>
 </svg>
 <div className="itt-schwab-crosshair" aria-live="off">{focused?<><strong>{new Date(focused.time).toLocaleString('en-US',{timeZone:'America/New_York'})} ET</strong><span>O {money(focused.open)} · H {money(focused.high)} · L {money(focused.low)} · C {money(focused.close)} · Vol {Number(focused.volume||0).toLocaleString()}</span></>:null}</div></div>:<p>No candles returned for this session. Check Schwab authorization and market-data entitlement.</p>}
 <p className="itt-schwab-freshness">Schwab history · Last candle {candles.length?new Date(candles.at(-1).time).toLocaleString('en-US',{timeZone:'America/New_York'}):'Unavailable'} ET · Fetched {stamp(data?.receivedAt)} ET · History refreshes every 30s. Drag to pan, hover for OHLC, zoom to inspect. The latest candle can be incomplete; quotes and candles can update at different times.</p>
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
