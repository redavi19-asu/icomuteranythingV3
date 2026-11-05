/**
 * Owner-selected personal opportunity alert.
 * Converts 1:48–1:52 of a file explicitly chosen on this device into a
 * standalone four-second WAV. Only that trimmed excerpt is saved in IndexedDB.
 * No YouTube ripping, external upload, or song asset in public deployment.
 */
export const PERSONAL_ALERT_START_SECONDS=108;
export const PERSONAL_ALERT_END_SECONDS=112;
const DB_NAME='ica-prime-owner-personal-alert-v1';
const STORE='audio';
const KEY='money-clip';
const MAX_FILE_BYTES=60*1024*1024;
function openDatabase(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(Error('Private device audio storage is unavailable.'));
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{
   if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('Private device audio storage unavailable.'));
 });
}
async function operation(mode,action){
 const db=await openDatabase();
 try{
  return await new Promise((resolve,reject)=>{
   const txn=db.transaction(STORE,mode),request=action(txn.objectStore(STORE));
   let result;
   request.onsuccess=()=>{result=request.result};
   request.onerror=()=>reject(request.error||Error('Private clip storage failed.'));
   txn.oncomplete=()=>resolve(result);
   txn.onerror=()=>reject(txn.error||Error('Private clip storage failed.'));
   txn.onabort=()=>reject(txn.error||Error('Private clip storage aborted.'));
  });
 }finally{db.close()}
}
export const readPersonalMoneyClip=()=>operation('readonly',store=>store.get(KEY));
export const savePersonalMoneyClip=bytes=>{
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<1000||bytes.byteLength>4000000)
  throw Error('Invalid personal alert audio.');
 return operation('readwrite',store=>store.put(bytes,KEY));
};
export const clearPersonalMoneyClip=()=>operation('readwrite',store=>store.delete(KEY));
export function trimPersonalAudio(ctx,decoded,start=PERSONAL_ALERT_START_SECONDS,end=PERSONAL_ALERT_END_SECONDS){
 if(!ctx?.createBuffer||!decoded||!Number.isFinite(decoded.duration)||
    decoded.duration<end||!Number.isFinite(decoded.sampleRate)||decoded.sampleRate<8000)
  throw Error('Select an audio file lasting at least 1 minute 52 seconds.');
 if(!(start>=0&&end>start&&end<=decoded.duration))throw Error('Invalid clip boundaries.');
 const rate=decoded.sampleRate,from=Math.floor(start*rate),
  frames=Math.floor((end-start)*rate),count=Math.min(decoded.numberOfChannels,2);
 if(count<1||frames<1)throw Error('Audio could not be decoded.');
 const result=ctx.createBuffer(count,frames,rate);
 for(let ch=0;ch<count;ch++){
  const source=decoded.getChannelData(ch),dest=result.getChannelData(ch);
  if(source.length<from+frames)throw Error('The audio file ends before 1:52.');
  dest.set(source.subarray(from,from+frames));
 }
 return result;
}
export function encodePersonalClipWav(buffer){
 if(!buffer||buffer.numberOfChannels<1||buffer.numberOfChannels>2||buffer.length<1)
  throw Error('Invalid trimmed audio.');
 const channels=buffer.numberOfChannels,frames=buffer.length,
  rate=buffer.sampleRate,bytes=frames*channels*2;
 const result=new ArrayBuffer(44+bytes),data=new DataView(result);
 const str=(at,value)=>{for(let i=0;i<value.length;i++)data.setUint8(at+i,value.charCodeAt(i))};
 str(0,'RIFF');data.setUint32(4,36+bytes,true);str(8,'WAVE');
 str(12,'fmt ');data.setUint32(16,16,true);data.setUint16(20,1,true);
 data.setUint16(22,channels,true);data.setUint32(24,rate,true);
 data.setUint32(28,rate*channels*2,true);data.setUint16(32,channels*2,true);
 data.setUint16(34,16,true);str(36,'data');data.setUint32(40,bytes,true);
 const tracks=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
 let offset=44;
 for(let i=0;i<frames;i++)for(let ch=0;ch<channels;ch++){
  const raw=tracks[ch][i],value=Number.isFinite(raw)?Math.max(-1,Math.min(1,raw)):0;
  data.setInt16(offset,value<0?Math.round(value*32768):Math.round(value*32767),true);offset+=2;
 }
 return result;
}
export async function preparePersonalMoneyClip(ctx,file){
 if(!file||!Number.isFinite(file.size)||file.size<10000||file.size>MAX_FILE_BYTES)
  throw Error('Choose a local MP3, M4A, WAV or AAC audio file under 60 MB.');
 if(!/\.(mp3|m4a|mp4|wav|aac)$/i.test(String(file.name||''))&&
    !/^audio\//i.test(String(file.type||'')))
  throw Error('Choose an audio file (MP3, M4A, WAV or AAC).');
 if(!ctx||typeof ctx.decodeAudioData!=='function')throw Error('This browser cannot decode audio.');
 const decoded=await ctx.decodeAudioData(await file.arrayBuffer());
 return encodePersonalClipWav(trimPersonalAudio(ctx,decoded));
}
export async function decodePersonalMoneyClip(ctx,bytes){
 if(!ctx||!bytes||!(bytes instanceof ArrayBuffer))return null;
 const decoded=await ctx.decodeAudioData(bytes.slice(0));
 if(!decoded||decoded.duration<3.9||decoded.duration>4.1)
  throw Error('The saved personal clip is invalid. Choose the file again.');
 return decoded;
}
export function playPersonalMoneyClip(ctx,buffer){
 if(!ctx||ctx.state!=='running'||!buffer||buffer.duration<3.9)return false;
 const duration=Math.min(4,buffer.duration);
 const compressor=ctx.createDynamicsCompressor(),master=ctx.createGain(),
  gain=ctx.createGain(),source=ctx.createBufferSource(),at=ctx.currentTime+.02;
 compressor.threshold.value=-16;compressor.ratio.value=5;
 compressor.knee.value=6;compressor.attack.value=.002;compressor.release.value=.15;
 master.gain.value=.98;
 let peak=0;
 for(let ch=0;ch<buffer.numberOfChannels;ch++){
  const data=buffer.getChannelData(ch);
  for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]));
 }
 const boost=Math.min(3,Math.max(.8,.92/Math.max(peak,.15)));
 source.buffer=buffer;source.connect(gain);gain.connect(compressor);
 compressor.connect(master);master.connect(ctx.destination);
 gain.gain.setValueAtTime(0,at);
 gain.gain.linearRampToValueAtTime(boost,at+.012);
 gain.gain.setValueAtTime(boost,at+duration-.055);
 gain.gain.linearRampToValueAtTime(0,at+duration);
 source.start(at,0,duration);
 source.onended=()=>{source.disconnect();gain.disconnect();compressor.disconnect();master.disconnect()};
 return true;
}
