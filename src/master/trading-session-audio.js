/* Private ICA PRIME browser-only alert sounds: no third-party audio files. */
const ny = new Intl.DateTimeFormat('en-US',{
 timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',
 weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
});
function parts(ms){
 const p=Object.fromEntries(ny.formatToParts(ms).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return {day:p.year+'-'+p.month+'-'+p.day,weekday:p.weekday,minute:Number(p.hour)*60+Number(p.minute)};
}
/**
 * Only emit a bell when an active, foreground clock crosses the exact minute
 * boundary; never replay missed alerts after a long background pause/refresh.
 */
export function marketBellEvent(previousMs,currentMs){
 if(!Number.isFinite(previousMs)||!Number.isFinite(currentMs)||currentMs<=previousMs||currentMs-previousMs>90000)return null;
 const prev=parts(previousMs),next=parts(currentMs);
 if(prev.day!==next.day||['Sat','Sun'].includes(next.weekday))return null;
 if(prev.minute<570&&next.minute===570)return 'OPEN';
 if(prev.minute<960&&next.minute===960)return 'CLOSE';
 return null;
}
/** Original cash-counter-like paper-opportunity sound: quick bill flips, then two short dings. */
export function playMoneyCountingAlert(ctx){
 if(!ctx||ctx.state!=='running')return false;
 const start=ctx.currentTime+0.015,rate=ctx.sampleRate;
 // A stack of short bright filtered transients sounds like paper notes flicking
 // through a counting machine. Self-generated noise: no recorded/licensed asset.
 const length=Math.max(1,Math.floor(rate*0.047));
 const buffer=ctx.createBuffer(1,length,rate);
 const samples=buffer.getChannelData(0);
 let seed=0x1234ab;
 for(let i=0;i<length;i++){seed=(1664525*seed+1013904223)>>>0;samples[i]=((seed/4294967296)*2-1)*(1-i/length);}
 for(let i=0;i<12;i++){
  const at=start+i*0.074,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  source.buffer=buffer;filter.type='highpass';filter.frequency.value=1250+(i%3)*280;
  gain.gain.setValueAtTime(0,at);
  gain.gain.linearRampToValueAtTime(i%3===0?.19:.14,at+.004);
  gain.gain.exponentialRampToValueAtTime(.0001,at+.048);
  source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
  source.start(at);source.stop(at+.048);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};
 }
 for(const [offset,frequency] of [[1.00,1080],[1.29,1400]]){
  const at=start+offset;
  for(const [ratio,level] of [[1,.15],[1.5,.055],[2.02,.025]]){
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(frequency*ratio,at);
   gain.gain.setValueAtTime(0,at);
   gain.gain.linearRampToValueAtTime(level,at+.006);
   gain.gain.exponentialRampToValueAtTime(.0001,at+.40);
   osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+.42);
   osc.onended=()=>{osc.disconnect();gain.disconnect()};
  }
 }
 return true;
}
