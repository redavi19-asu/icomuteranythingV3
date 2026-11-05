import React from 'react';
import './PaperScanCoverage.css';

const dayOf=now=>new Intl.DateTimeFormat('en-CA',{
 timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'
}).format(now);
const timeOf=ms=>new Date(ms).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',second:'2-digit'});

export default function PaperScanCoverage({snapshot,now=Date.now()}){
 const universe=snapshot?.scanUniverse||[],coverage=snapshot?.scanCoverage||{},day=dayOf(now);
 const covered=universe.filter(symbol=>coverage[symbol]?.day===day).length;
 return <details className="itt-scanner-settings itt-coverage">
  <summary>Full scan coverage · {covered} / {universe.length} tickers checked today</summary>
  <p>All configured tickers appear here, even after they leave the recent 30-event feed. Rotation checks five distinct tickers per scheduled pass; streaming adds faster checks. A data hold is a completed check, not a trade signal. Tracking begins with the next actual scan after this upgrade.</p>
  <div className="itt-coverage-list" role="list">
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
 </details>;
}
