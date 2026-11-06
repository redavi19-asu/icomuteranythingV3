import React,{useEffect,useRef,useState} from 'react';
import {summarizePaperExits,paperPositionExitWarnings} from './paper-session.js';
import {marketTime} from './trading-paper-engine.js';
import {marketBellEvent,playMoneyCountingAlert,loadMoneyRecordings} from './trading-session-audio.js';
import {readPersonalMoneyClip,savePersonalMoneyClip,clearPersonalMoneyClip,preparePersonalMoneyClip,decodePersonalMoneyClip,playPersonalMoneyClip} from './private-money-alert.js';
import './PaperExitNotice.css';
import PaperScannerLane from './PaperScannerLane.jsx';
import './PaperStopSettings.css';
const API=import.meta.env.VITE_ICA_MASTER_API_URL||'https://ica-master-platform.ryanedavis.workers.dev';
const money=n=>Number.isFinite(n)?(n<0?'-$':'$')+Math.abs(n).toFixed(2):'—';
const time=n=>n?new Date(n).toLocaleTimeString('en-US',{timeZone:'America/New_York'}):'Not checked yet';
// Original three-strike exchange-style bell (no downloaded sound or copyrighted recording).
function ringOpportunityBell(ctx){
 if(!ctx||ctx.state!=='running')return;
 const start=ctx.currentTime+0.02;
 [0,0.9,1.8,2.7].forEach((offset,i)=>{
  const note=start+offset;
  [[740,0.45],[1120,0.26],[1660,0.10]].forEach(([frequency,volume])=>{
   const oscillator=ctx.createOscillator(),gain=ctx.createGain();
   oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency*(i===1?1.018:1),note);
   gain.gain.setValueAtTime(0,note);
   gain.gain.linearRampToValueAtTime(volume*0.22,note+0.007);
   gain.gain.exponentialRampToValueAtTime(0.0001,note+0.55);
   oscillator.connect(gain);gain.connect(ctx.destination);
   oscillator.start(note);oscillator.stop(note+0.56);
  });
 });
}
const positionsOf=data=>Array.isArray(data?.paper?.positions)?data.paper.positions:data?.paper?.position?[{...data.paper.position,id:data.paper.position.id||data.paper.position.symbol,mark:data.mark,closeRequested:data.closeRequested}]:[];
const percent=(pnl,cost)=>Number.isFinite(pnl)&&Number.isFinite(cost)&&cost>0?(pnl>=0?'+':'')+(pnl/cost*100).toFixed(2)+'%':'—';
const signed=n=>Number.isFinite(n)?(n>0?'+':'')+money(n):'—';
export default function PaperSession({connected,initialTab=null,onSnapshot}){
 const [s,setS]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());
 const [showWindow,setShowWindow]=useState(Boolean(initialTab)),[windowTab,setWindowTab]=useState(initialTab||'opportunities'),[selected,setSelected]=useState(null);
 const [feedback,setFeedback]=useState({}),[queued,setQueued]=useState({}),[exitFeedback,setExitFeedback]=useState('');
 const [requotes,setRequotes]=useState({}),[dismissedExitWarnings,setDismissedExitWarnings]=useState({}),[activeStopDrafts,setActiveStopDrafts]=useState({});
 const [budgetDraft,setBudgetDraft]=useState('350'),[symbolsDraft,setSymbolsDraft]=useState(''),[settingsDirty,setSettingsDirty]=useState(false);
 const [stopLossDraft,setStopLossDraft]=useState('20'),[stopLossDirty,setStopLossDirty]=useState(false);
 const [singleTickerDraft,setSingleTickerDraft]=useState('SPY'),[singleTickerDirty,setSingleTickerDirty]=useState(false);
 const [soundOn,setSoundOn]=useState(false),[soundWarning,setSoundWarning]=useState(''),[soundLoading,setSoundLoading]=useState(false);
 const [privateClipReady,setPrivateClipReady]=useState(false),[privateClipBusy,setPrivateClipBusy]=useState(false);
 const [personalPreviewUrl,setPersonalPreviewUrl]=useState(''),[personalPreviewPlaying,setPersonalPreviewPlaying]=useState(false);
 const [scanStatus,setScanStatus]=useState({phase:'idle'}),[operationNotice,setOperationNotice]=useState('');
 const audioRef=useRef(null),bellBuffer=useRef(null),moneyRecordingsRef=useRef(null),moneyLoadRef=useRef(null),personalClipRef=useRef(null),ownerMoneyBytesRef=useRef(null),personalFileInputRef=useRef(null),personalPreviewUrlRef=useRef(null),personalPreviewAudioRef=useRef(null),soundEnabledRef=useRef(false),scanRequested=useRef(false),seenAlerts=useRef(null),requests=useRef(0),queue=useRef(Promise.resolve()),queueEpoch=useRef(0),latestRevision=useRef(-1),pendingAccepts=useRef(new Set());
 function applyState(data){const revision=data.revision??0;if(revision>=latestRevision.current){latestRevision.current=revision;setS(data);onSnapshot?.(data)}}
 function warnIfAudioPaused(){
   if(soundEnabledRef.current&&document.visibilityState==='visible'&&audioRef.current?.state!=='running'){
    setSoundWarning('Browser audio paused. Tap Money Alert to play your saved clip and re-enable options sounds. Background alerts need phone notifications.');
   }
  }
  async function loadBellRecording(ctx){
   if(bellBuffer.current)return;
   try{
    const response=await fetch('/audio/nyse-opening-bell.wav',{cache:'force-cache'});
    if(!response.ok)throw Error('Bell recording unavailable');
    const decoded=await ctx.decodeAudioData(await response.arrayBuffer());
    if(decoded.duration<=0)throw Error('Invalid bell recording');
    bellBuffer.current=decoded;
   }catch{
    if(soundEnabledRef.current)setSoundWarning('Recorded bell unavailable. Backup bell remains active.');
   }
  }
  async function ensureMoneyRecordings(ctx){
   if(moneyRecordingsRef.current)return moneyRecordingsRef.current;
   if(moneyLoadRef.current)return moneyLoadRef.current;
   const loading=loadMoneyRecordings(ctx).then(value=>{
    moneyRecordingsRef.current=value;
    return value;
   });
   moneyLoadRef.current=loading;
   try{return await loading}
   finally{if(moneyLoadRef.current===loading)moneyLoadRef.current=null}
  }
  function updatePersonalPreviewSource(bytes,mime='audio/wav'){
   if(personalPreviewAudioRef.current)personalPreviewAudioRef.current.pause();
   if(personalPreviewUrlRef.current)URL.revokeObjectURL(personalPreviewUrlRef.current);
   const url=bytes?URL.createObjectURL(new Blob([bytes],{type:mime})):'';
   personalPreviewUrlRef.current=url;
   setPersonalPreviewUrl(url);
  }
  async function ensurePersonalClip(ctx){
   if(personalClipRef.current)return personalClipRef.current;
   // The owner's uploaded recording is loaded only over the authenticated
   // API. It is never included in the public GitHub Pages build.
   if(ownerMoneyBytesRef.current){
    const decoded=await decodePersonalMoneyClip(ctx,ownerMoneyBytesRef.current);
    personalClipRef.current=decoded;
    return decoded;
   }
   const saved=await readPersonalMoneyClip();
   if(!saved)return null;
   const decoded=await decodePersonalMoneyClip(ctx,saved);
   personalClipRef.current=decoded;
   return decoded;
  }
  async function choosePersonalClip(event){
   const file=event.target.files?.[0];
   event.target.value='';
   if(!file)return;
   setPrivateClipBusy(true);
   try{
    const Constructor=window.AudioContext||window.webkitAudioContext;
    if(!Constructor)throw Error('This browser cannot prepare audio clips.');
    if(!audioRef.current){
     audioRef.current=new Constructor();
     audioRef.current.onstatechange=warnIfAudioPaused;
    }
    const ctx=audioRef.current;
    await ctx.resume();
    const trimmed=await preparePersonalMoneyClip(ctx,file);
    const decoded=await decodePersonalMoneyClip(ctx,trimmed);
    await savePersonalMoneyClip(trimmed);
    personalClipRef.current=decoded;
    ownerMoneyBytesRef.current=null;
    updatePersonalPreviewSource(trimmed,'audio/wav');
    setPrivateClipReady(true);
    if(ctx.state==='running'){
     soundEnabledRef.current=true;
     setSoundOn(true);
     if(playPersonalMoneyClip(ctx,decoded,()=>setPersonalPreviewPlaying(false))){
      setPersonalPreviewPlaying(true);
      setSoundWarning('Money Alert saved, enabled and preview playing. New options opportunities will use this sound.');
     }else setSoundWarning('Money Alert saved. Tap Money Alert to play it and enable sound.');
    }else setSoundWarning('Money Alert saved. Tap Money Alert to play it and enable options sounds.');
   }catch(e){setSoundWarning(e.message||'Could not prepare your personal sound.')}
   finally{setPrivateClipBusy(false)}
  }
  async function removePersonalClip(){
   try{
    // Remove a server-stored personal clip only through the owner's login.
    if(ownerMoneyBytesRef.current){
     const token=localStorage.getItem('ica_master_token');
     const response=await fetch(API+'/platform/personal-money-alert',{
      method:'DELETE',headers:{Authorization:'Bearer '+token}
     });
     if(!response.ok)throw Error('Could not remove owner-only audio.');
    }
    await clearPersonalMoneyClip();
    personalClipRef.current=null;ownerMoneyBytesRef.current=null;
    updatePersonalPreviewSource(null);
    setPersonalPreviewPlaying(false);
    setPrivateClipReady(false);
    setSoundWarning('Personal clip removed. The licensed cash-counter sound is restored.');
   }catch(e){setSoundWarning(e.message||'Could not remove the personal clip.')}
  }
  async function handleMoneyAlertClick(){
   if(!privateClipReady){
    personalFileInputRef.current?.click();
    return;
   }
   try{
    const Constructor=window.AudioContext||window.webkitAudioContext;
    if(!Constructor)throw Error('Audio playback is unavailable. Use the player below.');
    if(!audioRef.current){
     audioRef.current=new Constructor();
     audioRef.current.onstatechange=warnIfAudioPaused;
    }
    const ctx=audioRef.current;
    await ctx.resume();
    if(ctx.state!=='running')throw Error('The browser blocked Web Audio. Try the audio player below, and check device volume.');
    const decoded=await ensurePersonalClip(ctx);
    if(!decoded)throw Error('Your personal clip could not be read. Use Change Clip to replace it.');
    soundEnabledRef.current=true;
    setSoundOn(true);
    if(!playPersonalMoneyClip(ctx,decoded,()=>setPersonalPreviewPlaying(false)))
     throw Error('Playback failed. Try the audio player below or Change Clip.');
    setPersonalPreviewPlaying(true);
    setSoundWarning('Playing your saved Money Alert. Options alerts are ON and will use this same sound.');
   }catch(e){
    setPersonalPreviewPlaying(false);
    setSoundWarning(e.message||'Money Alert preview unavailable. Try the audio player below.');
   }
  }
  async function toggleAlertSound(){
   if(soundOn){soundEnabledRef.current=false;setSoundOn(false);setSoundWarning('');return}
   if(soundLoading)return;
   setSoundLoading(true);
   try{
    const Constructor=window.AudioContext||window.webkitAudioContext;
    if(!Constructor)throw Error('Audio is unavailable in this browser.');
    if(!audioRef.current){audioRef.current=new Constructor();audioRef.current.onstatechange=warnIfAudioPaused}
    const ctx=audioRef.current;
    await ctx.resume();
    if(ctx.state!=='running')throw Error('Sound was blocked. Tap Enable Alert Sounds again and check device volume.');
    soundEnabledRef.current=true;
    setSoundOn(true);
    setSoundWarning('');
    // Unlock audio on tap without playing a different preview sound.
    if(!bellBuffer.current)void loadBellRecording(ctx);
    if(privateClipReady){
     void ensurePersonalClip(ctx).catch(()=>setSoundWarning('Personal alert could not be loaded. Choose your clip again.'));
    }else void ensureMoneyRecordings(ctx).catch(()=>setSoundWarning('The default cash-counter audio could not load. The market bell is unchanged.'));
   }catch(e){
    soundEnabledRef.current=false;setSoundOn(false);setSoundWarning(e.message);
   }finally{setSoundLoading(false)}
  }
  function playAlertBell(){
   const ctx=audioRef.current;
   if(!ctx||ctx.state!=='running'){
    setSoundWarning('The phone paused browser audio. Tap Opening and Closing Bell to restore it.');
    return;
   }
   try{
    if(bellBuffer.current){
     const source=ctx.createBufferSource(),gain=ctx.createGain(),start=ctx.currentTime;
     // Keep the recognizable WAV, but a real alert finishes in at most 3.5 seconds.
     const duration=Math.min(bellBuffer.current.duration,3.5);
     source.buffer=bellBuffer.current;source.connect(gain);gain.connect(ctx.destination);
     gain.gain.setValueAtTime(1,start);
     gain.gain.setValueAtTime(1,start+Math.max(0,duration-0.32));
     gain.gain.linearRampToValueAtTime(0,start+duration);
     source.onended=()=>{source.disconnect();gain.disconnect()};
     source.start(start,0,duration);
    }else ringOpportunityBell(ctx);
   }catch{
    ringOpportunityBell(ctx);
    setSoundWarning('Recorded bell could not play. Backup bell is active.');
   }
  }
  async function playTradeOpportunitySound(){
   const ctx=audioRef.current;
   if(!soundEnabledRef.current||document.visibilityState!=='visible'||ctx?.state!=='running')return;
   try{
    if(privateClipReady){
     const personal=await ensurePersonalClip(ctx);
     if(!soundEnabledRef.current||document.visibilityState!=='visible')return;
     if(!playPersonalMoneyClip(ctx,personal))throw Error('Saved Money Alert could not play. Tap Money Alert or Change Clip.');
    }else{
     const recordings=await ensureMoneyRecordings(ctx);
     if(!soundEnabledRef.current||document.visibilityState!=='visible')return;
     if(!playMoneyCountingAlert(ctx,recordings))throw Error('Default cash-counter alert could not play.');
    }
    setSoundWarning('');
   }catch(e){setSoundWarning(e.message||'Recorded money alert unavailable.')}
  }
  async function testMoneyAlert(){
   try{
    const ctx=audioRef.current;
    if(!soundEnabledRef.current||!ctx)throw Error('Enable Alert Sounds first.');
    if(ctx.state!=='running')await ctx.resume();
    if(ctx.state!=='running')throw Error('Browser audio paused. Check device volume.');
    if(privateClipReady){
     const personal=await ensurePersonalClip(ctx);
     if(!playPersonalMoneyClip(ctx,personal))throw Error('Personal 1:48–1:52 clip could not play.');
    }else{
     const recordings=await ensureMoneyRecordings(ctx);
     if(!playMoneyCountingAlert(ctx,recordings))throw Error('Recorded money alert could not play.');
    }
    setSoundWarning('');
   }catch(e){setSoundWarning(e.message||'Recorded money alert unavailable.')}
  }
  async function testAlertBell(){
   try{
    if(!soundEnabledRef.current||!audioRef.current)throw Error('Enable Alert Bell first.');
    if(audioRef.current.state!=='running')await audioRef.current.resume();
    if(audioRef.current.state!=='running')throw Error('Browser audio is still paused. Check silent mode and tap again.');
    setSoundWarning('');
    if(!bellBuffer.current)await loadBellRecording(audioRef.current);
    playAlertBell();
   }catch(e){setSoundWarning(e.message||'Tap Enable Alert Bell again and check device volume.')}
  }
  useEffect(()=>{
   let alive=true;
   async function loadOwnerAlert(){
    try{
     const token=localStorage.getItem('ica_master_token');
     if(token){
      const response=await fetch(API+'/platform/personal-money-alert',{
       headers:{Authorization:'Bearer '+token},cache:'no-store'
      });
      if(response.ok){
       const bytes=await response.arrayBuffer();
       if(alive&&bytes.byteLength>2000&&bytes.byteLength<400000){
        ownerMoneyBytesRef.current=bytes;
        personalClipRef.current=null;
        setPrivateClipReady(true);
        updatePersonalPreviewSource(bytes,'audio/mp4');
        return;
       }
      }
     }
     const saved=await readPersonalMoneyClip();
     if(alive){
      setPrivateClipReady(!!saved);
      if(saved)updatePersonalPreviewSource(saved,'audio/wav');
     }
    }catch{
     const saved=await readPersonalMoneyClip().catch(()=>null);
     if(alive){
      setPrivateClipReady(!!saved);
      if(saved)updatePersonalPreviewSource(saved,'audio/wav');
     }
    }
   }
   void loadOwnerAlert();
   return ()=>{alive=false};
  },[]);
  useEffect(()=>{
   document.addEventListener('visibilitychange',warnIfAudioPaused);
   window.addEventListener('pageshow',warnIfAudioPaused);
   return ()=>{
    document.removeEventListener('visibilitychange',warnIfAudioPaused);
    window.removeEventListener('pageshow',warnIfAudioPaused);
    soundEnabledRef.current=false;
    if(personalPreviewUrlRef.current){
     URL.revokeObjectURL(personalPreviewUrlRef.current);
     personalPreviewUrlRef.current=null;
    }
    if(audioRef.current){
     audioRef.current.onstatechange=null;
     audioRef.current.close().catch(()=>{});
     audioRef.current=null;
    }
   };
  },[]);
  useEffect(()=>{
   // Market bell is separate from opportunity notifications. Browsers require
   // a prior user gesture and cannot promise sound while locked/backgrounded.
   if(!soundOn)return;
   let previous=Date.now();
   const timer=setInterval(()=>{
    const current=Date.now(),bell=marketBellEvent(previous,current);
    previous=current;
    if(bell&&document.visibilityState==='visible'&&audioRef.current?.state==='running')playAlertBell();
   },1000);
   return ()=>clearInterval(timer);
  },[soundOn]);
  async function call(action,id,epoch,extra={}){
  const token=localStorage.getItem('ica_master_token');
  const body=['settings','scan_scope','scanner_engine','position_override'].includes(action)?
   {action,...id}:action==='auto_start'?{action,enabled:id}:
   {action,id,...extra,...(epoch!==undefined?{epoch}:{})};
  const r=await fetch(API+'/platform/paper',{method:action?'POST':'GET',headers:{Authorization:'Bearer '+token,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify(body)}:{})});
  const data=await r.json();if(!r.ok){const e=Error(data.error||'Paper server unavailable.');
   e.code=data.code;e.serverState=data.status;e.requote=data.requote;throw e}
  return data;
 }
 function act(action,id,extra={}){
  if(action==='tick'&&scanRequested.current)return;
  if(action==='tick'){scanRequested.current=true;setScanStatus({phase:'queued',message:'Scan request received — starting…'})}
  if(action==='accept'&&pendingAccepts.current.has(id))return;
  if(action==='accept')pendingAccepts.current.add(id);
  const epoch=queueEpoch.current,serverEpoch=s?.entryEpoch??0;
  if(action==='accept'){setQueued(v=>({...v,[id]:true}));setFeedback(v=>({...v,[id]:{kind:'checking',message:'Queued for fresh-price and paper buying-power checks…'}}))}
  if(action==='close_all')queueEpoch.current++;
  async function run(){
   if(action==='accept'&&epoch!==queueEpoch.current){pendingAccepts.current.delete(id);setQueued(v=>({...v,[id]:false}));setFeedback(v=>({...v,[id]:{kind:'error',message:'Approval cancelled by Close All. Review and accept again if wanted.'}}));return}
   requests.current++;setBusy(true);setError('');
   if(action==='tick')setScanStatus({phase:'checking',message:s?.enabled?'Checking fresh quotes and the next scanner batch…':'Updating open paper trades — scanner is paused…'});
   if(action==='close'||action==='close_all')setExitFeedback('Close requested. Checking fresh bids…');
   try{
    let data;
    for(let attempt=0;attempt<3;attempt++){
     try{data=await call(action,id,action==='accept'?serverEpoch:undefined,extra);break}catch(e){if(e.code!=='STATE_CHANGED'||attempt===2)throw e;applyState(await call())}
    }
    applyState(data);
    if(action==='tick'){
     const check=data.lastCheck;
     setScanStatus({phase:check?.holds?.length?'warning':'done',message:check?.holds?.length?'Check finished — some quotes need attention':'Check complete',check,completedAt:check?.completedAt||Date.now()});
    }
    if(action==='start')setOperationNotice('Scanner started. Scheduled setup checks are enabled.');
    if(action==='pause')setOperationNotice('Scanner paused. Open paper trades remain under protective management.');
     if(action==='auto_start')setOperationNotice(data.autoStart?'Automatic PAPER scans scheduled at/after 9:30 AM ET on market weekdays.':'Automatic paper scanner start disabled.');
    if(action==='settings')setOperationNotice('Scan settings saved.');
    if(action==='stop_settings')setOperationNotice('New paper trades will use a '+data.stopLossPct+'% stop. Open trades keep their entry-time stop.');
    if(action==='scan_scope')setOperationNotice(data.scanMode==='SINGLE'?
     'Single Ticker active: '+data.singleTicker+'. Only this ticker is eligible for NEW paper setups. Existing positions stay protected.':
     'Multiple Tickers active: broader watchlist scanning restored.');
    if(action==='accept'){
     setRequotes(v=>{const next={...v};delete next[id];return next});
     setFeedback(v=>({...v,[id]:{kind:'success',message:'Accepted into Open Trades. Select Open Trade to see profit/loss and close controls.'}}));
    }
    if(action==='settings')setSettingsDirty(false);
    if(action==='stop_settings')setStopLossDirty(false);
    if(action==='scan_scope')setSingleTickerDirty(false);
    if(action==='close'||action==='close_all'){
     const left=positionsOf(data).filter(p=>action==='close_all'||p.id===id);
     setExitFeedback(left.length?'Close pending for '+left.length+' contract(s). '+(left.map(p=>p.lastError).filter(Boolean).join(' · ')||'Waiting for fresh positive bids.'):'Paper close completed. See Closed Trades for final profit/loss.');
    }
   }catch(e){setError(e.message);if(action==='tick')setScanStatus({phase:'error',message:'Check failed: '+e.message});if(action==='accept'){
      if(e.code==='REQUOTE_REVIEW'&&e.requote){
       setRequotes(v=>({...v,[id]:e.requote}));
       setFeedback(v=>({...v,[id]:{kind:'warning',message:e.message}}));
      }else setFeedback(v=>({...v,[id]:{kind:'error',message:e.message}}));
     }if(action==='close'||action==='close_all')setExitFeedback(e.message);if(e.serverState)applyState(e.serverState);else try{applyState(await call())}catch{}}
   finally{if(action==='tick')scanRequested.current=false;requests.current--;setBusy(requests.current>0);if(action==='accept'){pendingAccepts.current.delete(id);setQueued(v=>({...v,[id]:false}))}}
  }
  if(['close','close_all','pause'].includes(action))return run();
  queue.current=queue.current.then(run,run);return queue.current;
 }
 useEffect(()=>{let active=true,t;async function refresh(){if(!requests.current)try{const data=await call();if(active){applyState(data);setError('')}}catch(e){if(active)setError(e.message)}if(active){setNow(Date.now());t=setTimeout(refresh,5000)}}refresh();return()=>{active=false;clearTimeout(t)}},[]);
 const positions=positionsOf(s),alerts=s?.alerts||[],history=s?.paper?.trades||[],liveAlerts=alerts.filter(a=>a.status==='PENDING'&&a.expires>now);
 const {todayRealized,todayTrades,automaticExits}=summarizePaperExits(history,now);
 const stale=!s?.heartbeat||now-s.heartbeat>150000;
 const marked=positions.filter(p=>Number.isFinite(p.mark?.pnl)),totalPnl=positions.length?marked.length===positions.length?marked.reduce((sum,p)=>sum+p.mark.pnl,0):null:0;
 function openWindow(tab=positions.length?'open':liveAlerts.length?'opportunities':history.length?'closed':'opportunities',id=null){setWindowTab(tab);setSelected(id);setShowWindow(true)}
 useEffect(()=>{
  if(!s?.alerts)return;const ids=new Set(s.alerts.map(a=>a.id));
  if(seenAlerts.current&&s.alerts.some(a=>a.status==='PENDING'&&a.expires>Date.now()&&!seenAlerts.current.has(a.id))){openWindow('opportunities');if(soundOn&&document.visibilityState==='visible')playTradeOpportunitySound()}seenAlerts.current=ids;
 },[s?.alerts,soundOn]);
 useEffect(()=>{if(s&&!settingsDirty){setBudgetDraft(String(s.maxPremium??350));setSymbolsDraft((s.extraSymbols||[]).join(', '))}},[s,settingsDirty]);
 useEffect(()=>{if(s&&!stopLossDirty)setStopLossDraft(String([15,20,35,50].includes(s.stopLossPct)?s.stopLossPct:20))},[s,stopLossDirty]);
 useEffect(()=>{if(s&&!singleTickerDirty)setSingleTickerDraft(s.singleTicker||'SPY')},[s,singleTickerDirty]);
 const clock=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 const minute=Number(clock.hour)*60+Number(clock.minute),marketWindow=!['Sat','Sun'].includes(clock.weekday)&&minute>=570&&minute<960;
 const radarActive=!stale&&(positions.length>0||s?.enabled&&marketWindow);
 const recent=s?.scanHistory||[],latest=recent[0],elapsed=latest?.time?Math.max(0,Math.floor((now-latest.time)/1000)):null;
 // The sidebar renders the full configured universe and latest durable check
 // per ticker, not the truncated rolling event stream.
 const priceActionLatest=latest?.symbol?s?.priceActionChecks?.[latest.symbol]:null;
 const swingChecks=Object.entries(s?.swingLevels||{}).filter(([,x])=>Number.isFinite(x?.checkedAt)&&now-x.checkedAt<30*60000).sort((a,b)=>b[1].checkedAt-a[1].checkedAt);
 const phase=!s?'CONNECTING':stale?'SERVER STALE':s.enabled&&marketWindow?'SCANNING'+(positions.length?' · '+positions.length+' OPEN':''):positions.length?'MANAGING '+positions.length+' OPEN':!s.enabled?'PAUSED':'OUTSIDE SESSION';
 function saveSettings(){const maxPremium=Number(budgetDraft),extraSymbols=[...new Set(symbolsDraft.split(/[\s,]+/).map(x=>x.trim().toUpperCase()).filter(Boolean))];if(!Number.isFinite(maxPremium)||maxPremium<1||maxPremium>5000||extraSymbols.length>20||extraSymbols.some(x=>!/^[A-Z][A-Z0-9.-]{0,9}$/.test(x))){setError('Use a $1–$5,000 premium budget and up to 20 valid tickers.');return}act('settings',{maxPremium,extraSymbols})}
 function setScope(mode){
  const symbol=singleTickerDraft.trim().toUpperCase();
  if(mode==='SINGLE'&&!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)){
   setError('Enter a valid stock or ETF ticker (for example SPY) before activating Single Ticker.');return;
  }
  act('scan_scope',{mode,...(mode==='SINGLE'?{symbol}:{})});
 }
 function pnlBlock(p,closed=false){const pnl=closed?p.pnl:p.mark?.pnl;return <div className={'itt-trade-pnl '+(pnl>0?'gain':pnl<0?'loss':'')}><small>{closed?'FINAL NET PAPER PROFIT / LOSS':!p.mark?.quoteTime||now-p.mark.quoteTime>60000?'LAST ESTIMATE · QUOTE STALE':'ESTIMATED NET PAPER PROFIT / LOSS'}</small><strong>{signed(pnl)}</strong><span>{percent(pnl,p.cost)}</span><small>{closed?'After simulated fees and fills':'Estimated liquidation at bid less slippage and exit commission'}</small></div>}
 function positionCard(p){const quoteStale=!p.mark?.quoteTime||now-p.mark.quoteTime>60000;
  const warnings=paperPositionExitWarnings(p,now).filter(w=>!dismissedExitWarnings[p.id+'|'+w.type]);
  const stopDraft=activeStopDrafts[p.id]??String(p.stopLossPct??20);
  const changeStop=()=>act('position_override',{id:p.id,operation:'CHANGE_STOP',
   stopLossPct:Number(stopDraft),confirmOverride:true});
  return <article key={p.id} className={'itt-opportunity-card itt-managed-trade '+(selected===p.id?'selected':'')}>
  <div className="itt-opportunity-top"><div><span className="itt-eyebrow">OPEN PAPER CONTRACT</span><h3>{p.underlying||p.symbol} · {p.side||'OPTION'}</h3></div><span className="itt-opportunity-status ready">{p.closeRequested?'CLOSE PENDING':'OPEN'}</span></div>
  <button type="button" className="itt-trade-symbol" onClick={()=>setSelected(selected===p.id?null:p.id)}>{p.symbol} · {selected===p.id?'Hide details':'View details'}</button>
  {pnlBlock(p)}
  <p className="itt-spread-entry-explain">An option enters at ask plus simulated slippage and fees, but is immediately valued at the bid minus exit costs. An initial red P/L is the actual estimated spread cost—not evidence that the stock moved against you. Current net paper P/L is never artificially increased.</p>
  {warnings.length>0&&<div className="itt-exit-warning-list" aria-label="Automatic paper trade exit warnings">
   {warnings.map(w=><section key={w.type} className={'itt-exit-warning '+(w.priority==='critical'?'critical':'')}>
    <div><strong>⚠ {w.type==='STOP_NEAR'?'STOP-LOSS APPROACHING':
     w.type==='STOP_TRIGGERED'?'STOP TRIGGERED':
     w.type==='TIME_LIMIT'?'TIMED EXIT APPROACHING':'MANDATORY SESSION EXIT'}</strong>
     <p>{w.message}{Number.isFinite(w.threshold)?' · Stop bid '+money(w.threshold):''}</p></div>
    {w.actionable&&<div className="itt-exit-warning-actions">
     {w.type==='TIME_LIMIT'&&<button type="button" className="itt-wide-button" disabled={busy} onClick={()=>act('position_override',{id:p.id,operation:'EXTEND_TIME',confirmOverride:true})}>KEEP HOLDING · +10 MIN</button>}
     {w.type==='STOP_NEAR'&&<>
      <label>Change THIS trade’s option stop
       <select value={stopDraft} onChange={e=>setActiveStopDrafts(v=>({...v,[p.id]:e.target.value}))}>
        {[15,20,35,50].map(n=><option value={n} key={n}>{n}% stop</option>)}
       </select></label>
      <button type="button" className="itt-wide-button" disabled={busy||Number(stopDraft)===(p.stopLossPct??20)} onClick={changeStop}>CONFIRM NEW STOP</button>
     </>}
    </div>}
    <button type="button" className="itt-exit-warning-dismiss" onClick={()=>setDismissedExitWarnings(v=>({...v,[p.id+'|'+w.type]:true}))}>Dismiss warning only</button>
    <small>Dismissal does NOT pause the stop, trailing stop, profit target, timed exit or mandatory session close. Override changes affect this paper trade only and must be made before its exit triggers.</small>
   </section>)}
  </div>}
  {p.style&&<p className="itt-play-style"><strong>{p.style.label}</strong> · {p.style.window}. {p.style.reason}</p>}
  <button type="button" className="itt-wide-button itt-position-exit" onClick={()=>act('close',p.id)}>{p.closeRequested?'RETRY CLOSE CONTRACT':'CLOSE CONTRACT · PAPER'}</button>
  <div className="itt-opportunity-numbers"><span>Entry cost · 1 contract<strong>{money(p.cost)}</strong></span><span>Entry fill / share<strong>{money(p.fill)}</strong></span><span>Current bid / ask<strong>{money(p.mark?.bid)} / {money(p.mark?.ask)}</strong></span><span>Quote timestamp<strong>{time(p.mark?.quoteTime)} ET · {quoteStale?'STALE / UNAVAILABLE':'FRESH'}</strong></span></div>
  {selected===p.id&&<div className="itt-position-details"><p>Strike {money(p.strike)} · Expiration {p.expiration||'—'} · Opened {time(p.time)} ET</p><p>Stop {money(p.fill*(1-(p.stopLossPct??20)/100))} ({p.stopLossPct??20}%) · Profit target {money(p.fill*1.3)} · Trailing {p.bestBid>=p.fill*1.15?money(p.bestBid*.9):'activates at '+money(p.fill*1.15)} · {p.expiration&&p.expiration>marketTime(now).day?'OVERNIGHT ELIGIBLE · no automatic 30-minute exit · expiry-day exit at 3:55 PM ET':'Maximum duration '+(p.maxHoldMinutes??30)+' min · expiry-day exit at 3:55 PM ET'} · stop/target/trail protection remains active</p></div>}
  {(p.lastError||p.closeRequested)&&<p role="status" className="itt-paper-approval-error">{p.lastError||'Manual close requested. Waiting for a fresh positive bid.'}</p>}

 </article>}
 return <section id="ica-paper-control-center" className="itt-card itt-paper-compact" aria-label="Paper trading control center">
  <div className="itt-paper-top-grid"><div className="itt-paper-command"><div className="itt-eyebrow">ICA MASTER · PAPER TRADING</div><h3>Scanner &amp; paper trades</h3>
   <div className="itt-scan-buttons"><button type="button" className={'itt-wide-button itt-scan-start '+(s?.enabled?'is-active':'')} aria-pressed={!!s?.enabled} disabled={busy||!connected||s?.enabled} onClick={()=>act('start')}>START SCAN</button><button type="button" className={'itt-wide-button itt-scan-pause '+(s&&!s.enabled?'is-paused':'')} aria-pressed={!!s&&!s.enabled} disabled={!s?.enabled} onClick={()=>act('pause')}>PAUSE SCAN</button><button type="button" className={'itt-wide-button itt-run-now '+(['queued','checking'].includes(scanStatus.phase)?'checking':'')} disabled={busy||['queued','checking'].includes(scanStatus.phase)} aria-busy={['queued','checking'].includes(scanStatus.phase)} onClick={()=>act('tick')}>{['queued','checking'].includes(scanStatus.phase)?<><span className="itt-action-spinner" aria-hidden="true"/> CHECKING…</>:'RUN SCAN & UPDATE TRADES NOW'}</button></div>
   {scanStatus.phase!=='idle'&&<div className={'itt-check-feedback '+scanStatus.phase} role={scanStatus.phase==='error'?'alert':'status'} aria-live="polite"><strong>{scanStatus.message}</strong>{scanStatus.check&&<><span>Updated {scanStatus.check.positionsUpdated} of {scanStatus.check.positionsChecked} open contracts · Checked {scanStatus.check.scannedSymbols?.length||0} tickers{scanStatus.check.scannedSymbols?.length?' ('+scanStatus.check.scannedSymbols.join(', ')+')':''} · {scanStatus.check.newAlerts} new opportunities</span>{scanStatus.check.positionsClosed>0&&<span>{scanStatus.check.positionsClosed} paper contract(s) closed by exit rules.</span>}{!scanStatus.check.scannedSymbols?.length&&<span>{s?.enabled?'No ticker scans were due during this check.':'Scanner paused; only open trades were checked.'}</span>}{scanStatus.check.holds?.length>0&&<details><summary>Quote holds ({scanStatus.check.holds.length})</summary>{scanStatus.check.holds.map((h,i)=><p key={i}>{h.symbol||'Check'}: {h.reason}</p>)}</details>}</>}{scanStatus.completedAt&&<small>Completed {time(scanStatus.completedAt)} ET</small>}</div>}
   {operationNotice&&<p role="status" className="itt-operation-notice">{operationNotice}</p>}
   <p><strong>{s?.enabled?'SCANNER ENABLED':'SCANNER PAUSED'} · {positions.length} OPEN PAPER CONTRACT{positions.length===1?'':'S'}</strong></p>

   <div className="itt-paper-summary"><div><small>PAPER BUYING POWER</small><strong>{money(s?.paper?.cash)}</strong></div><div><small>ALL-TIME REALIZED P/L</small><strong className={s?.paper?.realized<0?'itt-pnl-negative':'itt-pnl-positive'}>{signed(s?.paper?.realized)}</strong><small>All previously closed paper trades</small></div><div><small>TODAY'S REALIZED P/L · ET</small><strong className={todayRealized<0?'itt-pnl-negative':'itt-pnl-positive'}>{signed(todayRealized)}</strong><small>{todayTrades} paper trade{todayTrades===1?'':'s'} closed today</small></div><div><small>OPEN PROFIT / LOSS</small><strong className={totalPnl<0?'itt-pnl-negative':'itt-pnl-positive'}>{signed(totalPnl)}</strong><small>{marked.length!==positions.length?'Some quotes unavailable; see each trade':''}</small></div></div>
   {automaticExits.length>0&&<details className="itt-paper-automatic-exits" aria-label="Saved automatic paper-trade exit notices">
    <summary className="itt-paper-automatic-exits-header"><strong>AUTOMATIC TRADE EXITS · SAVED ({automaticExits.length})</strong><small>Tap to view or hide completed exit notices · saved in Closed Trades.</small></summary>
    <div className="itt-paper-auto-exit-list">
     {automaticExits.map(t=><div key={t.id} className={'itt-paper-auto-exit'+(t.pnl<0?' loss':' gain')}>
      <strong>{t.label}</strong><span>{t.symbol} · {time(t.exitTime)} ET</span>
      <span>Simulated exit {money(t.exitFill)} · Final realized P/L <b>{signed(t.pnl)}</b></span>
     </div>)}
    </div>
   </details>}
   <details className="itt-sound-card">
    <summary className="itt-sound-card-summary">
     <span className="itt-sound-card-head"><span className="itt-sound-card-icon" aria-hidden="true">🔔</span><strong>Sound Alerts</strong></span>
     <span className="itt-sound-card-status">{soundOn?'Sounds on':'Sounds off'} · {privateClipReady?'Money clip loaded':'Default money sound'}</span>
     <span className="itt-sound-card-toggle" aria-hidden="true">⌄</span>
    </summary>
   <div className="itt-bell-controls"><button type="button" className="itt-wide-button" onClick={toggleAlertSound} disabled={soundLoading} aria-busy={soundLoading} aria-pressed={soundOn}>{soundLoading?'Preparing sound…':soundOn?'🔔 SOUNDS ON':'ENABLE ALERT SOUNDS'}</button><button type="button" className="itt-wide-button" disabled={!soundOn} onClick={testAlertBell}>Opening and Closing Bell</button><button type="button" className="itt-wide-button" disabled={privateClipBusy} onClick={handleMoneyAlertClick} aria-label={privateClipReady?'Play saved Money Alert and enable options sounds':'Choose a money alert clip'}>Money Alert</button>{privateClipReady&&<button type="button" className="itt-wide-button" disabled={privateClipBusy} onClick={()=>personalFileInputRef.current?.click()}>Change Clip</button>}<input ref={personalFileInputRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.aac" onChange={choosePersonalClip} style={{display:'none'}} aria-label="Choose your already-edited four-second money alert, or a full song"/>{privateClipReady&&<button type="button" className="itt-wide-button" disabled={privateClipBusy} onClick={removePersonalClip}>Remove My Clip</button>}<div role="status" aria-live="polite" style={{flexBasis:'100%',fontWeight:700,fontSize:13,color:privateClipReady&&soundOn?'#79efaa':'#ffcb83'}}>{privateClipReady?(soundOn?'● MONEY ALERT LOADED · OPTIONS SOUND ON':'● MONEY ALERT LOADED · SOUND OFF — tap Money Alert to listen and enable'): '● NO PERSONAL CLIP — tap Money Alert to choose one'}{personalPreviewPlaying?' · PLAYING NOW':''}</div><small>{soundWarning||(privateClipReady?'Tap Money Alert to hear your saved clip; Change Clip replaces it. New options setups will trigger the same sound when alerts are on.':'Choose your already-edited clip or the full song. The clip stays on this device.')}</small>{privateClipReady&&personalPreviewUrl&&<div style={{flexBasis:'100%',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}><span style={{fontSize:12,color:'#d7d7d9'}}>iPhone audio player (backup):</span><audio ref={personalPreviewAudioRef} controls preload="metadata" src={personalPreviewUrl} aria-label="Play your saved Money Alert with the iPhone native audio player" style={{maxWidth:'100%',width:290,height:38}} /></div>}<small>Market bell remains at 9:30 AM and 4:00 PM ET. Alerts need the page active, sound enabled and device volume turned up.</small><small><a href="https://orangefreesounds.com/money-counting-machine/" target="_blank" rel="noopener noreferrer">Cash counter sound credit</a> · <a href="https://orangefreesounds.com/security-beep-sound/" target="_blank" rel="noopener noreferrer">Beep sound credit</a> (CC BY 4.0)</small></div>
   </details>
   <button type="button" className="itt-wide-button itt-trade-center-button" onClick={()=>openWindow()}>TRADING OPPORTUNITIES &amp; TRADES · {liveAlerts.length} awaiting · {positions.length} open · {history.length} closed</button>
  </div><div className="itt-scanner-duo" aria-label="Two independently configurable ICA PRIME paper scanners">
   {['MAIN','FOCUS'].map(engine=><PaperScannerLane key={engine} engineId={engine}
    snapshot={s} now={now} busy={busy} serverStale={stale}
    onSave={config=>act('scanner_engine',config)}/>)}
  </div></div>
  <section className="itt-scanner-settings itt-stop-settings" aria-label="Paper stop loss control">
   <h4>STOP LOSS CONTROL · NEXT PAPER TRADE</h4>
   <label htmlFor="itt-stop-pct">Protective stop on option premium</label>
   <div className="itt-stop-settings-row">
    <select id="itt-stop-pct" aria-label="Paper stop loss percentage" value={stopLossDraft}
     onChange={e=>{setStopLossDraft(e.target.value);setStopLossDirty(true)}}>
     {[15,20,35,50].map(pct=><option key={pct} value={pct}>{pct}%</option>)}
    </select>
    <button type="button" className="itt-wide-button" disabled={!s||busy||!stopLossDirty}
     onClick={()=>act('stop_settings',Number(stopLossDraft))}>SAVE STOP LOSS</button>
   </div>
   <p><strong>Saved for new entries: {s?.stopLossPct??20}%.</strong> Changing this does not alter any open contract; each trade retains its entry-time stop. A 35% or 50% stop allows a much larger loss, and fast prices can gap through the threshold. Applies to both CALL and PUT paper trades.</p>
  </section>
   <details className="itt-scanner-settings">
   <summary>Confirmed 5/5 support &amp; resistance · Schwab (30-minute lookback)</summary>
   <p>Levels use completed one-minute Schwab candles and require five bars on either side of each swing. They may differ from your TradingView indicator. They improve NEW paper entries only; the chosen per-trade protective option stop remains unchanged.</p>
   {swingChecks.length?swingChecks.map(([sym,x])=><p key={sym}><strong>{sym} · Support {money(x.support)} · Resistance {money(x.resistance)}</strong> — {x.status?.replaceAll('_',' ')} · Checked {time(x.checkedAt)} ET. {x.hold?x.reason:''}</p>):
    <p>No confirmed support/resistance checks in the last 30 minutes of scanner activity.</p>}
  </details>
  <details className="itt-scanner-settings">
   <summary>Trade style &amp; multi-day swing watchlist ({Object.values(s?.dailySignals||{}).filter(x=>x.status==='SWING_WATCH').length})</summary>
   <p>Scalp: short momentum attempt. Intraday hold: session trend with paper exits controlled by stops, targets, trailing rules and closing time. Multi-day swing: information only; no overnight paper trades.</p>
   {Object.entries(s?.dailySignals||{}).filter(([,x])=>x.status==='SWING_WATCH').length?
     Object.entries(s.dailySignals).filter(([,x])=>x.status==='SWING_WATCH').map(([symbol,x])=>
      <p key={symbol}><strong>{symbol} · {x.direction} · MULTI-DAY WATCH</strong> — {x.reason} Contract affordability, live bid/ask and gap risk not yet validated.</p>):
     <p>No confirmed multi-day daily-chart watches yet. Each ticker gets its daily check once per market day while scanning is enabled.</p>}
  </details>
  <details className="itt-scanner-settings"><summary>Scan coverage &amp; paper contract budget</summary><div className="itt-scanner-settings-grid"><label>Maximum premium per contract ($)<input type="number" min="1" max="5000" value={budgetDraft} onChange={e=>{setBudgetDraft(e.target.value);setSettingsDirty(true)}}/></label><label>Shared Watchlist / scanner extras (up to 20)<input value={symbolsDraft} onChange={e=>{setSymbolsDraft(e.target.value);setSettingsDirty(true)}}/></label></div><button type="button" className="itt-wide-button" disabled={busy||positions.length>0||!settingsDirty} onClick={saveSettings}>Save scan settings</button><p>This list is linked to Watchlist Favorites. Adding or removing a ticker here also changes the Watchlist. You can add tickers directly through Watchlist without opening these settings.</p><p>Universe: {(s?.scanUniverse||[]).join(', ')}</p><p>Multiple paper contracts can be open at once. Each accepted opportunity rechecks price, quote quality and available simulated cash. No daily paper profit or trade-count cutoff.</p></details>
  {(error||s?.lastError)&&<p role="alert" className="itt-paper-approval-error">{error||s.lastError}</p>}
  {exitFeedback&&<p role="status" className="itt-paper-exit-feedback">{exitFeedback}</p>}
  <details className="itt-paper-details"><summary>Server checks and trade history</summary><p>Server check {time(s?.heartbeat)} ET. Paper controls only.</p>{s?.events?.slice(0,12).map((e,i)=><p key={i}>{time(e.time)} ET · {e.text}</p>)}</details>
  <details className="itt-closed-history"><summary>Completed paper trades · History / Archive ({history.length})</summary><p>Completed trades stay saved here. They are hidden from the main trading screen.</p><button type="button" className="itt-wide-button" onClick={()=>openWindow('closed')}>OPEN COMPLETE TRADE HISTORY</button></details>
  {positions.length>0&&<aside className="itt-position-bar" aria-label="Always available paper trade controls"><button type="button" className="itt-position-open" onClick={()=>openWindow('open')}><strong>OPEN PAPER TRADES · {positions.length}</strong><span>Profit / loss {signed(totalPnl)} · Tap to reopen</span></button><button type="button" className="itt-wide-button itt-position-exit" onClick={()=>act('close_all')}>CLOSE ALL PAPER TRADES</button></aside>}
  {showWindow&&<div className="itt-opportunities-overlay"><section className="itt-opportunities-window itt-trade-center" role="dialog" aria-modal="true" aria-label="Trading opportunities and paper trades"><header className="itt-opportunities-header"><div><div className="itt-eyebrow">ICA MASTER · PAPER ONLY</div><h2>Trading Opportunities &amp; Trades</h2></div><button type="button" className="itt-opportunity-x" onClick={()=>setShowWindow(false)}>Minimize</button></header>
   <nav className="itt-trade-tabs" aria-label="Trade window tabs">{[['opportunities','Opportunities',liveAlerts.length],['open','Open Trades',positions.length],['closed','Closed Trades',history.length]].map(([key,label,count])=><button type="button" key={key} aria-pressed={windowTab===key} onClick={()=>{setWindowTab(key);setSelected(null)}}>{label} ({count})</button>)}</nav>
   {positions.length>0&&<div className="itt-trade-window-summary"><span>{positions.length} open · Estimated net P/L {signed(totalPnl)}</span><button type="button" className="itt-wide-button itt-position-exit" onClick={()=>act('close_all')}>CLOSE ALL PAPER TRADES</button></div>}
   {exitFeedback&&<p role="status" className="itt-paper-exit-feedback">{exitFeedback}</p>}
   <div className="itt-opportunities-grid">
    {windowTab==='opportunities'&&<>{!alerts.length&&<p>No saved opportunities. Accepted contracts remain in Open Trades; completed contracts remain in Closed Trades.</p>}{alerts.map(item=>{const c=item.contract,ready=item.status==='PENDING'&&item.expires>now,open=positions.find(p=>p.alertId===item.id||p.id===item.id),state=item.status==='PENDING'&&!ready?'EXPIRED':item.status;return <article className="itt-opportunity-card" key={item.id}><div className="itt-opportunity-top"><div><span className="itt-eyebrow">{c.underlying} · {c.side}</span><h3>{money(c.strike)} <small>{c.expiration}</small></h3></div><button type="button" className="itt-opportunity-x" disabled={queued[item.id]} aria-label={'Dismiss '+c.symbol} onClick={()=>act('dismiss',item.id)}>✕</button></div><p className="itt-opportunity-symbol">{c.symbol}</p><span className={'itt-opportunity-status '+(ready?'ready':'inactive')}>{open?'ACCEPTED · OPEN TRADE':state}</span>{item.style&&<div className="itt-play-style"><strong>{item.style.label}</strong><p>Monitoring horizon: {item.style.window}</p><p>{item.style.reason}</p><p><strong>Invalidation:</strong> {item.style.invalidation}</p></div>}<p>{item.signal?.reason||'Rules-qualified paper setup.'}</p>{item.qualification?.priceAction&&<p><strong>Price action:</strong> {item.qualification.priceAction.status.replaceAll('_',' ')} · Break level {money(item.qualification.priceAction.breakoutLevel)} · Confirmed {time(item.qualification.priceAction.confirmationBarTime)} ET · Underlying invalidation {money(item.qualification.priceAction.invalidation)} · {item.qualification.priceAction.target!==null?'Opposing 5/5 swing target '+money(item.qualification.priceAction.target)+' · Underlying reward/risk '+item.qualification.priceAction.rewardRisk+':1':'No verified opposing swing target; reward/risk not established'}. These stock-price levels are context only; your separate option-premium stop remains unchanged.</p>}{item.qualification?.swing55&&<p><strong>Confirmed swing 5/5 levels (Schwab):</strong> Support {money(item.qualification.swing55.support)} · Resistance {money(item.qualification.swing55.resistance)} · {item.qualification.swing55.status?.replaceAll('_',' ')}.</p>}{item.qualification?.entryTiming&&<p><strong>Entry quality:</strong> {item.qualification.entryTiming.status.replaceAll('_',' ')} · {item.qualification.entryTiming.reason}</p>}<p>Alert ask {money(c.ask)} · Volume {c.volume??'—'} · OI {c.openInterest??'—'} · Delta {c.delta??'—'}</p>
    {item.entryEstimate&&<p className="itt-entry-spread-preview"><strong>Up-front paper scalp costs:</strong> Ask {money(c.ask)} · Bid {money(c.bid)} · Spread {item.entryEstimate.spreadPct}% · Expected immediate net P/L if closed at bid <strong>{signed(item.entryEstimate.immediatePnl)}</strong> · Break-even exit bid about {money(item.entryEstimate.breakevenBid)}. Quotes can move; not a prediction of trade profit.</p>}
    <p>Approval expires {time(item.expires)} ET. Price and simulated cash are rechecked.</p>
    {requotes[item.id]&&<div className="itt-requote-review">
     <strong>FRESH OPTION PRICE · REVIEW BEFORE BUYING</strong>
     <p>Old ask {money(requotes[item.id].oldAsk)} → new ask {money(requotes[item.id].ask)} · {requotes[item.id].originalPriceChangePct}% · Bid {money(requotes[item.id].bid)} · Entry cost {money(requotes[item.id].estimate?.cost)} · Estimated immediate net exit {signed(requotes[item.id].estimate?.immediatePnl)}.</p>
     <p>Press Confirm to allow a paper buy at this ask <strong>or cheaper</strong>. If the ask rises again, ICA PRIME will ask you to review it again. Existing safety checks remain active.</p>
     <button type="button" className="itt-wide-button" disabled={queued[item.id]||!ready||!connected||!s?.enabled} onClick={()=>act('accept',item.id,{maxApprovedAsk:requotes[item.id].ask})}>CONFIRM PAPER BUY · MAX ASK {money(requotes[item.id].ask)}</button>
    </div>}
    {feedback[item.id]&&<p role={feedback[item.id].kind==='error'?'alert':'status'} className={'itt-opportunity-inline-feedback '+feedback[item.id].kind}>{feedback[item.id].message}</p>}{open?<button type="button" className="itt-wide-button" onClick={()=>openWindow('open',open.id)}>OPEN TRADE · P/L &amp; CLOSE</button>:item.status==='TAKEN'?<button type="button" className="itt-wide-button" onClick={()=>openWindow('closed',item.id)}>VIEW CLOSED TRADE</button>:<button type="button" className="itt-wide-button" disabled={queued[item.id]||!ready||!connected||!s?.enabled} aria-busy={!!queued[item.id]} onClick={()=>act('accept',item.id)}>{queued[item.id]?'ACCEPTANCE QUEUED…':ready?'ACCEPT PAPER CONTRACT':'EXPIRED · NOT ACTIONABLE'}</button>}</article>})}</>}
    {windowTab==='open'&&<>{!positions.length&&<p>No open paper contracts. Accepted trades appear here automatically and remain here until closed.</p>}{positions.map(positionCard)}</>}
    {windowTab==='closed'&&<>{!history.length&&<p>No closed paper trades yet.</p>}{history.slice().reverse().map((t,i)=>{const id=t.id||t.symbol+t.exitTime;return <article className="itt-opportunity-card" key={id+i}><span className="itt-eyebrow">CLOSED PAPER TRADE · {t.reason==='STOP_LOSS'?'STOP LOSS TRIGGERED':t.reason?.replaceAll('_',' ')}</span><button type="button" className="itt-trade-symbol" onClick={()=>setSelected(selected===id?null:id)}>{t.symbol} · View trade details</button>{pnlBlock(t,true)}<p>Entry cost {money(t.cost)} · Entry fill {money(t.fill)} · Exit fill {money(t.exitFill)}</p><p>Opened {time(t.time)} ET · Closed {time(t.exitTime)} ET</p>{selected===id&&<p>Strike {money(t.strike)} · Expiration {t.expiration||'—'} · Exit reason {t.reason?.replaceAll('_',' ')}. This contract is closed; there is no open position to exit.</p>}</article>})}</>}
   </div><p className="itt-opportunity-help">Minimize keeps trades open. Close Contract exits one; Close All exits every open paper contract and cancels queued approvals. A fresh positive bid is required. Paper only.</p>
  </section></div>}
 </section>;
}
