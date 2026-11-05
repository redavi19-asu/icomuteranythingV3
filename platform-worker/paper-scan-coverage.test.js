import test from 'node:test';
import assert from 'node:assert/strict';
import {rotatingTickerBatch,saveSymbolScanCoverage} from './paper-scan-coverage.js';
import {scannerUniverse,freshRunner} from './paper-runner.js';

test('26 unique tickers really include the manually added BAC, TQQQ and SOFI',()=>{
 const s=freshRunner();
 s.extraSymbols=['TQQQ','BAC','SOFI','BNO','XOM','CVX','JPM'];
 const names=scannerUniverse(s);
 assert.equal(names.length,26);
 assert.equal(names.filter(t=>t==='BNO').length,1,'existing default BNO is not scanned twice');
 for(const ticker of ['TQQQ','BAC','SOFI','XOM','CVX','JPM'])assert.ok(names.includes(ticker));
});

test('the entire 26-symbol universe receives a visit before any rotating ticker repeats',()=>{
 const s=freshRunner();s.extraSymbols=['TQQQ','BAC','SOFI','BNO','XOM','CVX','JPM'];
 const universe=scannerUniverse(s),actual=[];
 for(let index=0;index<universe.length;index+=5)actual.push(...rotatingTickerBatch(universe,index,5));
 assert.deepEqual(actual.slice(0,26),universe);
 assert.deepEqual(actual.slice(26),universe.slice(0,4));
 assert.equal(new Set(actual.slice(0,26)).size,26);
 assert.deepEqual(rotatingTickerBatch(['SPY','SPY','QQQ','BAC'],0,5),['SPY','QQQ','BAC']);
});

test('every checked symbol remains in durable coverage after 30-event history overflow',()=>{
 const s=freshRunner(),now=Date.parse('2026-11-05T16:40:00Z'),day='2026-11-05';
 const symbols=['GOOGL','TQQQ','BAC','SOFI','XOM','CVX','JPM','SPY'];
 for(let i=0;i<78;i++){
  const symbol=symbols[i%symbols.length];
  const checkedAt=now+i*15000;
  saveSymbolScanCoverage(s,{symbol,checkedAt,day,source:i%2?'STREAM':'ROTATION',
   scanState:i%9?'WAIT':'DATA_HOLD',reason:'Recorded full scan '+i});
  s.scanHistory=[{symbol,time:checkedAt,state:'WAIT'},...(s.scanHistory||[])].slice(0,30);
 }
 assert.equal(s.scanHistory.length,30);
 assert.equal(Object.keys(s.scanCoverage).length,8);
 for(const sym of symbols){assert.ok(s.scanCoverage[sym].scansToday>=9);assert.equal(s.scanCoverage[sym].day,day)}
 assert.ok(s.scanCoverage.GOOGL.checkedAt>now);
});

test('coverage resets the daily count but preserves every new session scan independently',()=>{
 const s=freshRunner();
 saveSymbolScanCoverage(s,{symbol:'GOOGL',checkedAt:100,day:'2026-11-05',source:'STREAM',scanState:'WAIT'});
 saveSymbolScanCoverage(s,{symbol:'GOOGL',checkedAt:200,day:'2026-11-05',source:'ROTATION',scanState:'WATCH'});
 assert.equal(s.scanCoverage.GOOGL.scansToday,2);
 assert.equal(s.scanCoverage.GOOGL.firstCheckedAt,100);
 saveSymbolScanCoverage(s,{symbol:'GOOGL',checkedAt:300,day:'2026-11-06',source:'ROTATION',scanState:'WAIT'});
 assert.equal(s.scanCoverage.GOOGL.scansToday,1);
 assert.equal(s.scanCoverage.GOOGL.firstCheckedAt,300);
 assert.equal(s.scanCoverage.GOOGL.day,'2026-11-06');
});

test('invalid records cannot masquerade as a real completed ticker check',()=>{
 const state={};
 saveSymbolScanCoverage(state,{symbol:'GOOGL',checkedAt:100,day:'bad',source:'ROTATION',scanState:'WAIT'});
 saveSymbolScanCoverage(state,{symbol:'../G',checkedAt:100,day:'2026-11-05',source:'STREAM',scanState:'WAIT'});
 assert.equal(state.scanCoverage,undefined);
});
