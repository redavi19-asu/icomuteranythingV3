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
/** Recorded, licensed samples are bundled into the GitHub Pages build.
 * No fake bill-flip synthesis and no sound file is fetched from third parties
 * by the user's browser.
 */
export const MONEY_ALERT_ASSETS = Object.freeze({
 money:'/audio/ica-real-money-counter.mp3',
 beep:'/audio/ica-real-machine-beep.mp3'
});
export async function loadMoneyRecordings(ctx, fetchAudio=fetch){
 if(!ctx||typeof ctx.decodeAudioData!=='function')throw Error('Audio decoder unavailable.');
 const load=async(path)=>{
  const response=await fetchAudio(path,{cache:'force-cache'});
  if(!response.ok)throw Error('Recorded money-alert asset unavailable.');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength<5000||bytes.byteLength>2500000)throw Error('Invalid recorded money-alert asset.');
  const buffer=await ctx.decodeAudioData(bytes);
  if(!buffer||buffer.duration<0.15||buffer.duration>15||buffer.numberOfChannels<1)
   throw Error('Recorded money-alert sample could not be decoded.');
  return buffer;
 };
 const [money,beep]=await Promise.all([load(MONEY_ALERT_ASSETS.money),load(MONEY_ALERT_ASSETS.beep)]);
 return {money,beep};
}
function peakGain(buffer){
 // Raise quiet recording levels without asking Web Audio to go beyond safe
 // output level; the shared dynamics compressor limits transients.
 let peak=0;
 for(let ch=0;ch<buffer.numberOfChannels;ch++){
  const a=buffer.getChannelData(ch);
  for(let i=0;i<a.length;i++)peak=Math.max(peak,Math.abs(a[i]));
 }
 return Math.min(3.4,Math.max(0.9,0.96/Math.max(peak,0.1)));
}
function loudBeepStart(buffer,duration){
 // Some recorded beeps contain a short gap before the actual tone. Locate
 // its loudest brief window instead of accidentally playing silence.
 const a=buffer.getChannelData(0),sr=buffer.sampleRate;
 const len=Math.min(a.length,Math.max(1,Math.floor(duration*sr)));
 const maxStart=Math.max(0,a.length-len),step=Math.max(1,Math.floor(sr*.025));
 let best=0,bestEnergy=-1;
 for(let start=0;start<=maxStart;start+=step){
  let energy=0;
  for(let i=start;i<start+len;i+=4)energy+=a[i]*a[i];
  if(energy>bestEnergy){bestEnergy=energy;best=start;}
 }
 return best/sr;
}
/** Real money-counter machine recording, followed by two sampled machine beeps.
 * Sound is browser-opt-in only; the playback level cannot override device volume.
 */
export function playMoneyCountingAlert(ctx,recordings){
 if(!ctx||ctx.state!=='running'||!recordings?.money||!recordings?.beep)return false;
 const {money,beep}=recordings;
 if(money.duration<.2||beep.duration<.15)return false;
 const now=ctx.currentTime+.02;
 const compressor=ctx.createDynamicsCompressor(),master=ctx.createGain();
 compressor.threshold.value=-15;compressor.knee.value=8;compressor.ratio.value=5;
 compressor.attack.value=.002;compressor.release.value=.14;
 master.gain.value=.98;
 compressor.connect(master);master.connect(ctx.destination);
 const machineDuration=Math.min(money.duration,3.2),beepDuration=Math.min(.23,beep.duration);
 const beepOffset=loudBeepStart(beep,beepDuration),beepGain=peakGain(beep);
 const play=(buffer,at,offset,duration,inputGain)=>{
  const source=ctx.createBufferSource(),gain=ctx.createGain();
  source.buffer=buffer;
  gain.gain.setValueAtTime(0,at);
  gain.gain.linearRampToValueAtTime(inputGain,at+.014);
  gain.gain.setValueAtTime(inputGain,at+Math.max(.015,duration-.07));
  gain.gain.linearRampToValueAtTime(0,at+duration);
  source.connect(gain);gain.connect(compressor);
  source.start(at,offset,duration);
  source.onended=()=>{source.disconnect();gain.disconnect()};
 };
 try{
  play(money,now,0,machineDuration,peakGain(money));
  const first=now+machineDuration+.10;
  play(beep,first,beepOffset,beepDuration,beepGain);
  play(beep,first+.34,beepOffset,beepDuration,beepGain);
  return true;
 }catch{return false;}
}
