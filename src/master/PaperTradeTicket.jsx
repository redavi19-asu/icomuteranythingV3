import React,{useEffect,useMemo,useState} from 'react';
import {useSchwabQuoteStream} from './SchwabMarket.jsx';
import {schwabQuoteFreshness,selectSchwabDisplayQuote} from './schwab-quote-freshness.js';
import {oneDollarBelowAskPerContract} from './paper-entry-display.js';
import {paperMaximumEntryCost,PAPER_MAX_CONTRACT_QUANTITY} from './paper-limit-orders.js';
import './PaperTradeTicket.css';

const API=import.meta.env.VITE_ICA_MASTER_API_URL||'https://ica-master-platform.ryanedavis.workers.dev';
const dollars=n=>Number.isFinite(n)?'$'+n.toFixed(2):'—';
const etTime=n=>Number.isFinite(n)?new Date(n).toLocaleTimeString('en-US',{
 timeZone:'America/New_York',hour:'numeric',minute:'2-digit',second:'2-digit'}):'—';
const cents=v=>Number.isFinite(v)?Number(v.toFixed(2)):null;
const validNumber=s=>typeof s==='string'&&s.trim()!==''&&Number.isFinite(Number(s));
const validLimit=s=>validNumber(s)&&Number(s)>=0.01&&Number(s)<=50&&
 Math.abs(Number(s)*100-Math.round(Number(s)*100))<0.000001;
const setPrice=(x)=>cents(Math.min(50,Math.max(0.01,x))).toFixed(2);
const stockPrice=n=>Number.isFinite(n)?'$'+n.toFixed(3):'—';

/** An SVG of genuine quote observations collected WHILE THE TICKET IS OPEN.
 * No invented candles, no fabricated earlier price history. */
function ObservedSparkline({samples}){
 if(samples.length<2)return <div className="itt-order-spark-empty">Waiting for live option price changes…</div>;
 const values=samples.map(x=>x.price),low=Math.min(...values),high=Math.max(...values);
 const span=high-low||0.01;
 const points=samples.map((p,i)=>{
  const x=4+292*i/Math.max(1,samples.length-1);
  const y=60-54*(p.price-low)/span;
  return x.toFixed(1)+','+y.toFixed(1);
 }).join(' ');
 const up=samples.at(-1).price>=samples[0].price;
 return <svg className="itt-order-spark" viewBox="0 0 300 66" role="img"
  aria-label={'Observed option '+(up?'rising':'falling')+' price changes since opening this ticket'}>
  <polyline fill="none" stroke={up?'#43d68d':'#fc7184'} strokeWidth="2.4"
   strokeLinejoin="round" strokeLinecap="round" points={points}/>
  <circle cx={4+292*(samples.length-1)/Math.max(1,samples.length-1)} cy={60-54*(samples.at(-1).price-low)/span}
   r="3.5" fill={up?'#43d68d':'#fc7184'}/>
 </svg>;
}

/** The scanner recommends the contract; the owner exclusively chooses price,
 * quantity and whether to submit a PAPER order after a separate review page. */
export default function PaperTradeTicket({alert,maxPremium=350,cash=0,onCancel,onConfirm}){
 const contract=alert.contract;
 const [step,setStep]=useState('ticket');
 const [limit,setLimit]=useState(()=>setPrice(oneDollarBelowAskPerContract(contract.ask)??contract.ask));
 const [quantity,setQuantity]=useState(1);
 const [holdMinutes,setHoldMinutes]=useState(3);
 const [now,setNow]=useState(Date.now());
 const [poll,setPoll]=useState(null);
 const [streamOption,setStreamOption]=useState(null);
 const [samples,setSamples]=useState([]);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const stream=useSchwabQuoteStream(contract.underlying,true);

 useEffect(()=>{
  const id=setInterval(()=>setNow(Date.now()),1000);
  return()=>clearInterval(id);
 },[]);
 useEffect(()=>{
  const onOption=e=>{
   const q=e.detail;
   if(q?.symbol!==contract.symbol)return;
   setStreamOption(v=>({...v,...q,
    bid:Number.isFinite(q.bid)?q.bid:v?.bid??null,
    ask:Number.isFinite(q.ask)?q.ask:v?.ask??null,
    last:Number.isFinite(q.last)?q.last:v?.last??null
   }));
  };
  window.addEventListener('ica-option-quote-stream',onOption);
  window.dispatchEvent(new CustomEvent('ica-watch-option-stream',{
   detail:{symbol:contract.symbol}}));
  return()=>window.removeEventListener('ica-option-quote-stream',onOption);
 },[contract.symbol]);
 useEffect(()=>{
  let closed=false,handle;
  async function check(){
   try{
    if(document.visibilityState==='hidden')return;
    const token=localStorage.getItem('ica_master_token');
    if(!token)throw Error('Sign in to ICA PRIME for Schwab quotes.');
    const response=await fetch(API+'/platform/paper?ticketQuote='+encodeURIComponent(alert.id),{
     headers:{Authorization:'Bearer '+token},cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'Current option quote unavailable.');
    if(!closed){setPoll(data);setError('')}
   }catch(e){if(!closed)setError(e.message||'Live Schwab quote unavailable.')}
  }
  void check();handle=setInterval(check,4000);
  return()=>{closed=true;clearInterval(handle)};
 },[alert.id]);

 const rest=poll?.option||null;
 const streamRecent=Number.isFinite(streamOption?.receivedAt)&&now-streamOption.receivedAt<10000;
 const displayed=useMemo(()=>{
  if(streamRecent&&streamOption)return {
   bid:Number.isFinite(streamOption.bid)?streamOption.bid:rest?.bid??contract.bid,
   ask:Number.isFinite(streamOption.ask)?streamOption.ask:rest?.ask??contract.ask,
   last:Number.isFinite(streamOption.last)?streamOption.last:rest?.last??null,
   bidSize:rest?.bidSize??null,askSize:rest?.askSize??null
  };
  return {bid:rest?.bid??contract.bid,ask:rest?.ask??contract.ask,
   last:rest?.last??null,bidSize:rest?.bidSize??null,askSize:rest?.askSize??null};
 },[streamRecent,streamOption,rest,contract]);
 const currentUnderlying=selectSchwabDisplayQuote(poll?.underlying,stream.quote,stream.status==='connected');
 const stockStatus=schwabQuoteFreshness(currentUnderlying,now,12000);
 const providerStatus=schwabQuoteFreshness(rest,now,12000);
 const verified=providerStatus.code==='VERIFIED_FRESH';
 const visualStream=streamRecent&&stream.status==='connected';
 const quoteChanged=Number.isFinite(displayed.ask)&&
  displayed.ask!==contract.ask;
 useEffect(()=>{
  const value=Number.isFinite(displayed.last)?displayed.last:
   Number.isFinite(displayed.bid)&&Number.isFinite(displayed.ask)?
    (displayed.bid+displayed.ask)/2:null;
  if(!Number.isFinite(value))return;
  setSamples(old=>{
   const recent=old.at(-1);
   if(recent&&Math.abs(recent.price-value)<0.000001)return old;
   return [...old,{price:value,time:Date.now()}].slice(-36);
  });
 },[displayed.last,displayed.bid,displayed.ask]);

 const numericLimit=Number(limit),budgetCost=validLimit(limit)?
  paperMaximumEntryCost(numericLimit,quantity):null;
 const usableCash=Number.isFinite(cash)?cash:0;
 const usableBudget=Number.isFinite(maxPremium)?maxPremium:350;
 const capacityOK=budgetCost!==null&&budgetCost<=usableBudget&&budgetCost<=usableCash;
 const alertActive=alert.status==='PENDING'&&alert.expires>now;
 const midpoint=Number.isFinite(displayed.bid)&&Number.isFinite(displayed.ask)?
  cents((displayed.bid+displayed.ask)/2):null;
 const spread=Number.isFinite(displayed.bid)&&Number.isFinite(displayed.ask)?
  cents((displayed.ask-displayed.bid)*100):null;
 const reviewable=alertActive&&validLimit(limit)&&capacityOK&&verified;
 const selectedPrice=validLimit(limit)?Number(limit):null;
 const maxReviewCost=budgetCost;
 function changeQuantity(next){setQuantity(Math.min(PAPER_MAX_CONTRACT_QUANTITY,Math.max(1,next)))}
 function changeLimit(next){setLimit(setPrice(next))}
 async function submit(){
  if(!reviewable||busy)return;
  setBusy(true);setError('');
  try{
   const result=await onConfirm({alertId:alert.id,limitAsk:selectedPrice,quantity,holdMinutes});
   if(result?.ok===false){setError(result.error||'Paper order was not accepted.');return}
   if(result?.ok!==true){setError('Paper server did not confirm acceptance. Check your orders.');return}
   onCancel();
  }catch(e){setError(e?.message||'Paper order was not accepted.')}
  finally{setBusy(false)}
 }
 useEffect(()=>{
  const onKey=e=>{if(e.key==='Escape'&&!busy)onCancel()};
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[busy,onCancel]);

 return <div className="itt-order-backdrop" onClick={e=>{if(e.target===e.currentTarget&&!busy)onCancel()}}>
  <section className="itt-order-ticket" role="dialog" aria-modal="true"
   aria-label={contract.underlying+' live paper option trade ticket'}>
   <header className="itt-order-heading">
    <button type="button" onClick={onCancel} disabled={busy}>Close</button>
    <strong>{contract.underlying}</strong>
    <span aria-label="Paper trade only">PAPER</span>
   </header>
   <div className="itt-order-stock-price">
    <div><small>UNDERLYING · {contract.underlying}</small>
     <strong>{stockPrice(currentUnderlying?.last)}</strong>
     <span className={stockStatus.code==='VERIFIED_FRESH'?'itt-order-good':'itt-order-dim'}>
      {stockStatus.code==='VERIFIED_FRESH'?'SCHWAB REAL-TIME':stockStatus.label}</span></div>
    <div><div><small>Bid</small><strong>{stockPrice(currentUnderlying?.bid)}</strong></div>
     <div><small>Ask</small><strong>{stockPrice(currentUnderlying?.ask)}</strong></div></div>
   </div>
   <div className="itt-order-option">
    <div><span className="itt-order-overline">ICA PRIME SELECTED CONTRACT</span>
     <h2>{contract.underlying} · {dollars(contract.strike)} {contract.side}</h2>
     <p>{contract.expiration} · {contract.symbol}</p></div>
    <span className={verified?'itt-order-live':'itt-order-stale'}>
     {verified?'FRESH SCHWAB QUOTE':visualStream?'STREAMING · VERIFYING':'QUOTE NOT VERIFIED'}
    </span>
   </div>
   <div className="itt-order-quote-head">
    <div><span>Last</span><strong>{dollars(displayed.last)}</strong></div>
    <div><span>Bid</span><strong>{dollars(displayed.bid)}</strong><small>Size {displayed.bidSize??'—'}</small></div>
    <div><span>Ask</span><strong className={quoteChanged?'itt-order-price-change':''}>{dollars(displayed.ask)}</strong>
     <small>Size {displayed.askSize??'—'}</small></div>
   </div>
   <div className="itt-order-chart-wrap">
    <ObservedSparkline samples={samples}/>
    <div className="itt-order-chart-meta">
     <span>Option observations since ticket opened</span>
     <span>Spread {spread===null?'—':spread+'¢'} · {visualStream?'Streaming':'Polling'}</span>
    </div>
   </div>
   {step==='ticket'?<>
    <div className="itt-order-selectors">
     <span className="itt-order-buy-tag">BUY · PAPER</span>
     <span className="itt-order-select-tag">LIMIT</span>
     <label>Expiry <select value={holdMinutes} onChange={e=>setHoldMinutes(Number(e.target.value))}
      aria-label="Paper limit hold duration">
      {[1,3,5].map(n=><option key={n} value={n}>{n} min</option>)}
     </select></label>
    </div>
    <div className="itt-order-price-control">
     <label htmlFor="itt-order-price-input">Your maximum limit price</label>
     <div>
      <button type="button" onClick={()=>changeLimit((selectedPrice||0.01)-0.01)} aria-label="Lower limit by one cent">−</button>
      <input id="itt-order-price-input" type="number" step="0.01" min="0.01" max="50"
       inputMode="decimal" value={limit} onChange={e=>setLimit(e.target.value)}
       aria-label="Maximum option premium per share"/>
      <button type="button" onClick={()=>changeLimit((selectedPrice||0.01)+0.01)} aria-label="Raise limit by one cent">＋</button>
     </div>
     <p><strong>YOUR LIMIT STAYS FIXED.</strong> Quotes can move without changing your price.</p>
    </div>
    <div className="itt-order-slider">
     <div><span>MID {dollars(midpoint)}</span><span>ASK {dollars(displayed.ask)}</span></div>
     {Number.isFinite(midpoint)&&Number.isFinite(displayed.ask)&&displayed.ask>midpoint&&
      <input aria-label="Choose limit between current midpoint and ask" type="range" step="0.01"
       min={midpoint.toFixed(2)} max={displayed.ask.toFixed(2)}
       value={Math.max(midpoint,Math.min(displayed.ask,numericLimit||midpoint))}
       onChange={e=>changeLimit(Number(e.target.value))}/>}
     <small>Slider is optional. Type any supported lower limit directly above.</small>
    </div>
    <div className="itt-order-qty">
     <span>Quantity · contracts</span>
     <div><button type="button" aria-label="One fewer option contract" onClick={()=>changeQuantity(quantity-1)}>−</button>
      <strong>{quantity}</strong>
      <button type="button" aria-label="One more option contract" onClick={()=>changeQuantity(quantity+1)}>＋</button></div>
    </div>
    <div className="itt-order-cost">
     <span>Maximum modeled entry cost</span><strong>{dollars(maxReviewCost)}</strong>
     <small>Includes 100 shares/contract, modeled penny slippage and $0.65 entry fee per contract. Paper cash {dollars(usableCash)} · Per-trade cap {dollars(usableBudget)}.</small>
    </div>
    {(!capacityOK&&validLimit(limit))&&<p className="itt-order-error">This quantity/price exceeds available paper cash or your per-trade premium cap.</p>}
    <div className="itt-order-actions">
     <button type="button" className="itt-order-review" disabled={!reviewable||busy}
      onClick={()=>setStep('review')}>REVIEW</button>
     <button type="button" className="itt-order-cancel" disabled={busy} onClick={onCancel}>CANCEL</button>
    </div>
   </>:<>
    <div className="itt-order-review-body">
     <h3>Review your PAPER limit buy</h3>
     <p><strong>{quantity} × {contract.underlying} {dollars(contract.strike)} {contract.side}</strong> · {contract.expiration}</p>
     <dl>
      <div><dt>Order type</dt><dd>BUY · LIMIT · PAPER</dd></div>
      <div><dt>Quantity</dt><dd>{quantity} contract{quantity===1?'':'s'}</dd></div>
      <div><dt>Your fixed maximum ask</dt><dd>{dollars(selectedPrice)}</dd></div>
      <div><dt>Fresh displayed ask</dt><dd>{dollars(displayed.ask)}</dd></div>
      <div><dt>Maximum modeled cost</dt><dd>{dollars(maxReviewCost)}</dd></div>
      <div><dt>Expires</dt><dd>{holdMinutes} min or original setup deadline, whichever is sooner</dd></div>
     </dl>
     <p>A live ask at or below <strong>{dollars(selectedPrice)}</strong> is required.
      The server rechecks the quote, spread, original breakout and buying power.
      If the limit is not reached, it waits until expiry; no broker order is submitted.</p>
    </div>
    <div className="itt-order-actions itt-order-confirm-actions">
     <button type="button" className="itt-order-review" disabled={!reviewable||busy}
      onClick={submit}>{busy?'VERIFYING…':'CONFIRM PAPER LIMIT BUY'}</button>
     <button type="button" className="itt-order-cancel" disabled={busy} onClick={()=>setStep('ticket')}>BACK</button>
    </div>
    <button type="button" className="itt-order-abandon" disabled={busy} onClick={onCancel}>Cancel without submitting</button>
   </>}
   {error&&<p className="itt-order-error" role="alert">{error}</p>}
   <footer className="itt-order-foot">
    {verified?'Latest verified quote '+etTime(rest.quoteTime)+' ET':'Quote not verified · Order review held'}
    {' · '}Alert expires {etTime(alert.expires)} ET. No real trading.
   </footer>
  </section>
 </div>;
}
