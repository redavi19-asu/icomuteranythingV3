import React from 'react';
import './PaperScanCoverage.css';

const dayOf=now=>{const parts=new Intl.DateTimeFormat('en-US',{
 timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'
}).formatToParts(now);const field=key=>parts.find(p=>p.type===key)?.value;
 return field('year')+'-'+field('month')+'-'+field('day');};
const timeOf=ms=>new Date(ms).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',second:'2-digit'});

export default function PaperScanCoverage({snapshot,now=Date.now(),embedded=false}){
 const universe=snapshot?.scanUniverse||[],coverage=snapshot?.scanCoverage||{},day=dayOf(now);
 const covered=universe.filter(symbol=>coverage[symbol]?.day===day).length;
 const contents=<>
  <p className="itt-coverage-intro">{snapshot?.scanMode==='SINGLE'?
   'Single Ticker mode: only the selected ticker is scanned. Choose Multiple Tickers to scan your full watchlist.':
   'All scanner tickers appear below, including Watchlist Favorites. The server checks five at a time and retains each ticker’s most recent status. A HOLD means the check ran, not that a trade occurred.'}</p>
  <div className="itt-coverage-list" role="list" aria-label="Scrollable full scanner ticker coverage">
   {universe.map(symbol=>{
    const record=coverage[symbol],checked=record?.day===day;
    return <div role="listitem" key={symbol} className={'itt-coverage-row'+(!checked?' pending':'')}>
     <strong>{symbol}</strong>
     <span>{checked?record.state?.replaceAll('_',' ')||'UNAVAILABLE':'AWAITING CHECK'}</span>
     <time>{checked?timeOf(record.checkedAt)+' ET':'—'}</time>
     <small>{checked?record.scansToday+' today · '+(record.source==='STREAM'?'Live stream':'Rotation'):'Not tracked yet today'}</small>
     {checked&&record.reason&&<small className="itt-coverage-reason">{record.reason}</small>}
    </div>
   })}
  </div>
 </>;
 if(embedded)return <section className="itt-coverage-embedded" aria-label="All configured scanner tickers">
  <div className="itt-coverage-embedded-heading"><strong>ALL SCANNER TICKER CHECKS</strong><span>{covered} / {universe.length} checked today</span></div>
  {contents}
 </section>;
 return <details className="itt-scanner-settings itt-coverage">
  <summary>Full scan coverage · {covered} / {universe.length} tickers checked today</summary>
  {contents}
 </details>;
}
