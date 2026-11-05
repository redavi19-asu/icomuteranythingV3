import test from 'node:test';
import assert from 'node:assert/strict';
import {marketBellEvent,playMoneyCountingAlert,loadMoneyRecordings,MONEY_ALERT_ASSETS} from './trading-session-audio.js';
const at=s=>Date.parse(s);
test('market bell sounds when weekday Eastern clock crosses 9:30',()=>{
 assert.equal(marketBellEvent(at('2026-11-05T14:29:59Z'),at('2026-11-05T14:30:00Z')),'OPEN');
});
test('market bell sounds at 4:00 PM ET, not at 3:55',()=>{
 assert.equal(marketBellEvent(at('2026-11-05T20:54:59Z'),at('2026-11-05T20:55:00Z')),null);
 assert.equal(marketBellEvent(at('2026-11-05T20:59:59Z'),at('2026-11-05T21:00:00Z')),'CLOSE');
});
test('market bell does not replay while checking the rest of the same minute',()=>{
 assert.equal(marketBellEvent(at('2026-11-05T21:00:00Z'),at('2026-11-05T21:00:01Z')),null);
});
test('market bell does not play on Saturday or Sunday',()=>{
 assert.equal(marketBellEvent(at('2026-11-07T14:29:59Z'),at('2026-11-07T14:30:00Z')),null);
 assert.equal(marketBellEvent(at('2026-11-08T20:59:59Z'),at('2026-11-08T21:00:00Z')),null);
});
test('market bell does not backfill after an inactive tab skips the boundary',()=>{
 assert.equal(marketBellEvent(at('2026-11-05T20:59:59Z'),at('2026-11-05T21:05:00Z')),null);
 assert.equal(marketBellEvent(at('2026-11-05T14:30:50Z'),at('2026-11-05T14:31:00Z')),null);
});
test('cash-counting alert respects browser audio lock and does not fabricate a sound event',()=>{
 assert.equal(playMoneyCountingAlert(null),false);
 assert.equal(playMoneyCountingAlert({state:'suspended'}),false);
});

// A real decoded recording is required; the legacy fake bill noise is gone.
test('money alert cannot pretend to play without recorded samples',()=>{
 assert.equal(playMoneyCountingAlert({state:'running'}),false);
});
test('licensed recorded MP3 assets are decoded from local website paths',async()=>{
 const calls=[];
 const ctx={decodeAudioData:async bytes=>({duration:bytes.byteLength>10000?3:.5,numberOfChannels:1})};
 const fetchAudio=async(path,options)=>{
  calls.push(path);
  assert.equal(options.cache,'force-cache');
  return {ok:true,arrayBuffer:async()=>new ArrayBuffer(path.includes('counter')?18000:10000)};
 };
 const result=await loadMoneyRecordings(ctx,fetchAudio);
 assert.equal(result.money.duration,3);
 assert.equal(result.beep.duration,.5);
 assert.deepEqual(calls,[MONEY_ALERT_ASSETS.money,MONEY_ALERT_ASSETS.beep]);
});
test('real recording plays once before two sampled beeps; no noise oscillator',()=>{
 const started=[];
 const audioBuffer=duration=>({
  duration,numberOfChannels:1,sampleRate:1000,
  getChannelData:()=>Float32Array.from({length:Math.ceil(duration*1000)},(_,i)=>Math.sin(i*.2)*.5)
 });
 const makeNode=()=>({connect(){},disconnect(){},gain:{
  value:0,setValueAtTime(){},linearRampToValueAtTime(){}
 }});
 const ctx={
  state:'running',currentTime:7,destination:{},
  createOscillator(){throw Error('synthetic oscillator must not be used')},
  createBufferSource(){return {...makeNode(),start:(at,offset,duration)=>started.push({at,offset,duration}),stop(){}}},
  createGain:makeNode,
  createDynamicsCompressor:()=>({
   ...makeNode(),
   threshold:{value:0},knee:{value:0},ratio:{value:0},
   attack:{value:0},release:{value:0}
  })
 };
 assert.equal(playMoneyCountingAlert(ctx,{money:audioBuffer(3),beep:audioBuffer(.6)}),true);
 assert.equal(started.length,3);
 assert.equal(started[0].duration,3);
 assert.ok(started[1].at>started[0].at+3);
 assert.ok(started[2].at>started[1].at);
 assert.ok(started[2].at-started[1].at<.5);
});
