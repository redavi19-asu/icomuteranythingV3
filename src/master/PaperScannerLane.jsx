import React,{useEffect,useState} from 'react';
import PaperScanCoverage from './PaperScanCoverage.jsx';

const goodSymbol=s=>/^[A-Z][A-Z0-9.-]{0,9}$/.test(s);
const fmt=n=>n?new Date(n).toLocaleTimeString('en-US',{
 timeZone:'America/New_York',hour:'numeric',minute:'2-digit',second:'2-digit'}):'—';

/** The same paper-only scanner card is used for both independent engines. */
export default function PaperScannerLane({engineId,snapshot,now=Date.now(),busy=false,onSave,serverStale=false}){
 const second=engineId==='FOCUS',saved=snapshot?.scanEngines?.[engineId]||{
  enabled:!second,scope:second?'CUSTOM':'ALL',symbols:[],universe:[],
  coverage:{},last:null};
 const [enabled,setEnabled]=useState(saved.enabled),[scope,setScope]=useState(saved.scope);
 const [text,setText]=useState((saved.symbols||[]).join(', '));
 const [dirty,setDirty]=useState(false),[error,setError]=useState('');
 const serverSymbols=(saved.symbols||[]).join(', ');
 useEffect(()=>{
  if(dirty)return;
  setEnabled(saved.enabled);setScope(saved.scope);setText(serverSymbols);
 },[saved.enabled,saved.scope,serverSymbols,dirty]);
 const symbols=[...new Set(text.toUpperCase().split(/[\s,]+/).map(x=>x.trim()).filter(Boolean))];
 const bad=symbols.find(x=>!goodSymbol(x));
 const universe=saved.universe||[];
 const coverage=saved.coverage||{};
 const save=e=>{
  e.preventDefault();setError('');
  if(bad){setError('Invalid symbol: '+bad+'. Use stock/ETF ticker symbols.');return}
  if(symbols.length>40){setError('Maximum 40 symbols in one custom scanner.');return}
  if(enabled&&scope==='CUSTOM'&&!symbols.length){
   setError('Add at least one ticker to start this scanner.');return;
  }
  setDirty(false);
  onSave({engine:engineId,enabled,scope,symbols});
 };
 const latest=saved.last,active=!!snapshot?.enabled&&saved.enabled&&!serverStale;
 return <section className="itt-paper-radar itt-scanner-lane" aria-label={(second?'Scanner 2':'Scanner 1')+' paper activity'}>
  <header className="itt-paper-radar-heading">
   <div><span className="itt-eyebrow">ICA PRIME · PAPER SCANNER {second?'02':'01'}</span>
    <h3>{second?'Scanner 2':'Scanner 1'}</h3></div>
   <span className={'itt-radar-state '+(active?'active':'')}>{!saved.enabled?'OFF':serverStale?'SERVER STALE':snapshot?.enabled?'ON':'PAUSED'}</span>
  </header>
  <p className="itt-scanner-engine-help">{second?
   'Independent focused ticker rotation · up to 5 checks each 30-second alarm, plus fresh stream-triggered checks when available.':
   'Independent broad-market rotation · up to 5 checks each scheduled minute, plus fresh stream-triggered checks when available.'}</p>
  <form className="itt-scanner-engine-form" onSubmit={save}>
   <label className="itt-scanner-engine-switch">
    <input type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);setDirty(true)}} disabled={!snapshot||busy}/>
    <strong>{enabled?'ENGINE ENABLED':'ENGINE DISABLED'}</strong>
   </label>
   <label className="itt-scanner-engine-label">Ticker selection
    <select value={scope} disabled={!snapshot||busy} onChange={e=>{setScope(e.target.value);setDirty(true)}}>
     <option value="ALL">Entire linked watchlist</option>
     <option value="CUSTOM">My selected tickers</option>
    </select>
   </label>
   {scope==='CUSTOM'&&<label className="itt-scanner-engine-label">Custom stock and ETF symbols
    <textarea rows={2} value={text} disabled={!snapshot||busy} maxLength={420}
     onChange={e=>{setText(e.target.value.toUpperCase());setDirty(true)}}
     placeholder="SPY, TSLA" spellCheck={false} autoCapitalize="characters"
     aria-label={(second?'Scanner 2':'Scanner 1')+' comma separated ticker list'}/>
    <small>{symbols.length} tickers · separate with commas or spaces · change anytime</small>
   </label>}
   <button className="itt-wide-button itt-engine-save" type="submit" disabled={!snapshot||busy||!dirty}>
    {busy?'SAVING…':'SAVE SCANNER '+(second?'2':'1')}</button>
   {error&&<p role="alert" className="itt-paper-approval-error">{error}</p>}
  </form>
  <div className="itt-scanner-engine-live">
   <div className={'itt-radar-visual '+(active?'running':'')} aria-hidden="true">
    <div className="itt-radar-rings"/><div className="itt-radar-sweep"/>
    <div className="itt-radar-blips"><span className="itt-radar-blip green"/>
     <span className="itt-radar-blip red"/><span className="itt-radar-blip green"/></div>
    <div className="itt-radar-core">⌖</div>
   </div>
   <div className="itt-scanner-engine-latest">
    <small>LAST RECORDED {second?'FOCUSED':'MAIN'} SCAN</small>
    <strong>{latest?.symbol||'—'}</strong>
    <span>{latest?.state?.replaceAll('_',' ')||'AWAITING CHECK'}</span>
    <p>{latest?.reason||(!saved.enabled?'Enable this scanner and save.':'No ticker checks recorded by this engine yet.')}</p>
    <small>{fmt(latest?.checkedAt)} ET · {universe.length} configured tickers</small>
   </div>
  </div>
  <div className="itt-radar-recent"><PaperScanCoverage
   snapshot={{scanUniverse:universe,scanCoverage:coverage,scanMode:scope==='CUSTOM'?'CUSTOM':'MULTI'}}
   embedded now={now}/></div>
  <p className="itt-radar-foot">Price-action close confirmation, fresh Schwab quotes and existing paper risk protections apply to BOTH engines. Trade exits are coordinated separately.</p>
 </section>;
}
