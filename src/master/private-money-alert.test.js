import test from 'node:test';
import assert from 'node:assert/strict';
import {
 PERSONAL_ALERT_START_SECONDS,PERSONAL_ALERT_END_SECONDS,
 trimPersonalAudio,encodePersonalClipWav,preparePersonalMoneyClip,
 decodePersonalMoneyClip,playPersonalMoneyClip,savePersonalMoneyClip
} from './private-money-alert.js';

const rate=8000,frames=112*rate;
function decoded(duration=112){
 const samples=new Float32Array(Math.ceil(duration*rate));
 samples[108*rate]=.8;
 samples[112*rate-1]=-.5;
 return {duration,sampleRate:rate,numberOfChannels:1,
  getChannelData:()=>samples};
}
function ctx(){
 return {createBuffer:(channels,length,sampleRate)=>{
  const samples=Array.from({length:channels},()=>new Float32Array(length));
  return {numberOfChannels:channels,length,sampleRate,duration:length/sampleRate,
   getChannelData:index=>samples[index]};
 }};
}
test('personal clip uses exact user requested 1:48 through 1:52 boundaries',()=>{
 assert.equal(PERSONAL_ALERT_START_SECONDS,108);
 assert.equal(PERSONAL_ALERT_END_SECONDS,112);
 const audio=trimPersonalAudio(ctx(),decoded());
 assert.equal(audio.length,4*rate);
 assert.equal(audio.getChannelData(0)[0],Math.fround(.8));
 assert.equal(audio.getChannelData(0).at(-1),Math.fround(-.5));
});
test('only four seconds are retained in a compact standalone WAV',()=>{
 const audio=trimPersonalAudio(ctx(),decoded());
 const bytes=encodePersonalClipWav(audio),view=new DataView(bytes);
 assert.equal(bytes.byteLength,44+4*rate*2);
 assert.equal(view.getUint32(4,true),bytes.byteLength-8);
 assert.equal(view.getUint16(22,true),1);
 assert.equal(view.getUint32(24,true),rate);
 assert.equal(view.getUint32(40,true),4*rate*2);
 assert.equal(view.getInt16(44,true),Math.round(.8*32767));
});
test('slightly shortened full source gets requested 1:48 section, padded to four seconds',()=>{
 const audio=trimPersonalAudio(ctx(),decoded(111.9));
 assert.equal(audio.length,4*rate);
 assert.equal(audio.getChannelData(0)[0],Math.fround(.8));
 assert.equal(audio.getChannelData(0).at(-1),0);
});
test('already-cut four-second file is accepted directly with no 1:48 requirement',async()=>{
 const samples=new Float32Array(4*rate);
 samples[0]=.75;samples.at(-1);samples[samples.length-1]=-.6;
 const source={duration:4,sampleRate:rate,numberOfChannels:1,getChannelData:()=>samples};
 const methods={...ctx(),decodeAudioData:async()=>source};
 const file={name:'my-money-alert.m4a',type:'audio/mp4',size:12000,
  arrayBuffer:async()=>new ArrayBuffer(12000)};
 const bytes=await preparePersonalMoneyClip(methods,file);
 const view=new DataView(bytes);
 assert.equal(view.getUint32(40,true),4*rate*2);
 assert.equal(view.getInt16(44,true),Math.round(.75*32767));
 assert.equal(view.getInt16(bytes.byteLength-2,true),Math.round(-.6*32768));
});
test('MP3 length rounding to 3.97 seconds does not reject a pre-cut clip',async()=>{
 const samples=new Float32Array(Math.floor(3.97*rate));
 samples[0]=.85;
 const audio={duration:3.97,sampleRate:rate,numberOfChannels:1,getChannelData:()=>samples};
 const methods={...ctx(),decodeAudioData:async()=>audio};
 const file={name:'snippet.mp3',type:'audio/mpeg',size:6000,
  arrayBuffer:async()=>new ArrayBuffer(6000)};
 const bytes=await preparePersonalMoneyClip(methods,file);
 const view=new DataView(bytes);
 assert.equal(view.getUint32(40,true),4*rate*2);
 assert.equal(view.getInt16(44,true),Math.round(.85*32767));
 assert.equal(view.getInt16(bytes.byteLength-2,true),0);
});
test('longer pre-edited clip under 1:48 uses its first four seconds',async()=>{
 const samples=new Float32Array(6*rate);
 samples[0]=.6;
 samples[5*rate]=-.8;
 const source={duration:6,sampleRate:rate,numberOfChannels:1,getChannelData:()=>samples};
 const methods={...ctx(),decodeAudioData:async()=>source};
 const bytes=await preparePersonalMoneyClip(methods,{
  name:'separated-sound.wav',type:'audio/wav',size:24000,
  arrayBuffer:async()=>new ArrayBuffer(24000)
 });
 const view=new DataView(bytes);
 assert.equal(view.getInt16(44,true),Math.round(.6*32767));
 assert.equal(view.getInt16(bytes.byteLength-2,true),0);
});
test('unusable tiny audio is rejected with a clear error',async()=>{
 const methods={...ctx(),decodeAudioData:async()=>({
  duration:.2,sampleRate:rate,numberOfChannels:1,getChannelData:()=>new Float32Array(1600)
 })};
 await assert.rejects(preparePersonalMoneyClip(methods,{
  name:'tiny.m4a',type:'audio/mp4',size:1300,
  arrayBuffer:async()=>new ArrayBuffer(1300)
 }),/too short/);
});
test('local audio chooser decodes the file, extracts clip and never uploads it',async()=>{
 const audio=decoded(),methods={
  ...ctx(),decodeAudioData:async value=>{
   assert.ok(value instanceof ArrayBuffer);
   return audio;
  }
 };
 const file={name:'personal-reference.mp3',type:'audio/mpeg',size:20000,
  arrayBuffer:async()=>new ArrayBuffer(20000)};
 const bytes=await preparePersonalMoneyClip(methods,file);
 assert.equal(new DataView(bytes).getUint32(40,true),4*rate*2);
});
test('files over size limit and non-audio types are rejected',async()=>{
 await assert.rejects(preparePersonalMoneyClip(ctx(),{
  name:'huge.mp3',size:60*1024*1024+1,type:'audio/mpeg'
 }),/under 60 MB/);
 await assert.rejects(preparePersonalMoneyClip(ctx(),{
  name:'notes.txt',size:20000,type:'text/plain'
 }),/Choose an audio file/);
});
test('saved clip is decoded into a four-second AudioBuffer',async()=>{
 const decodedClip=await decodePersonalMoneyClip({
  decodeAudioData:async bytes=>({duration:4,bytes})
 },new ArrayBuffer(44+4*rate*2));
 assert.equal(decodedClip.duration,4);
 await assert.rejects(decodePersonalMoneyClip({
  decodeAudioData:async()=>({duration:9})
 },new ArrayBuffer(5000)),/invalid/);
});
test('personal clip playback requires unlocked audio and decoded sample',()=>{
 assert.equal(playPersonalMoneyClip(null,null),false);
 assert.equal(playPersonalMoneyClip({state:'suspended'},{duration:4}),false);
 assert.equal(playPersonalMoneyClip({state:'running'},null),false);
});
test('personal clip uses recorded sample only (no generated synth)',()=>{
 let recorded=null;
 const fakeNode=()=>({connect(){},disconnect(){}});
 const fakeGain=()=>({...fakeNode(),gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}}});
 const audio={
  state:'running',currentTime:9,destination:{},
  createOscillator(){throw Error('No synth on custom clip')},
  createBufferSource(){return {...fakeNode(),start:(...args)=>recorded=args,stop(){}}},
  createGain:fakeGain,
  createDynamicsCompressor:()=>({...fakeNode(),threshold:{},ratio:{},knee:{},attack:{},release:{}})
 };
 const samples=new Float32Array(4*rate);samples[0]=.5;
 const buffer={duration:4,numberOfChannels:1,getChannelData:()=>samples};
 assert.equal(playPersonalMoneyClip(audio,buffer),true);
 assert.equal(recorded[1],0);
 assert.equal(recorded[2],4);
});
test('refuse to store invalid tiny audio payloads',()=>{
 assert.throws(()=>savePersonalMoneyClip(new ArrayBuffer(12)),/Invalid personal alert/);
});

test('owner uploaded five-second audio plays in full without four-second truncation',()=>{
 let played;
 const fakeNode=()=>({connect(){},disconnect(){}});
 const gainNode=()=>({...fakeNode(),gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}}});
 const ctx={
  state:'running',currentTime:10,destination:{},
  createBufferSource(){return {...fakeNode(),start:(at,offset,duration)=>{played={at,offset,duration}}}},
  createDynamicsCompressor(){return {...fakeNode(),threshold:{},ratio:{},knee:{},attack:{},release:{}}},
  createGain:gainNode
 };
 const samples=new Float32Array(24000);samples[10]=.45;
 const buffer={duration:5,numberOfChannels:1,getChannelData:()=>samples};
 assert.equal(playPersonalMoneyClip(ctx,buffer),true);
 assert.equal(played.duration,5);
});

test('user-edited 4.928-second money alert retains final beep instead of truncating at 4 seconds',async()=>{
 const duration=4.928,frames=Math.floor(duration*rate),samples=new Float32Array(frames);
 samples[frames-1]=.95;
 const audio={duration,sampleRate:rate,numberOfChannels:1,getChannelData:()=>samples};
 const methods={...ctx(),decodeAudioData:async()=>audio};
 const bytes=await preparePersonalMoneyClip(methods,{
  name:'Money gucci.m4a',type:'audio/mp4',size:180000,
  arrayBuffer:async()=>new ArrayBuffer(180000)
 });
 const view=new DataView(bytes);
 assert.equal(view.getUint32(40,true),frames*2);
 assert.equal(view.getInt16(bytes.byteLength-2,true),Math.round(.95*32767));
});
