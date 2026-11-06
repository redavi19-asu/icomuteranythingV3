import test from 'node:test';
import assert from 'node:assert/strict';
import {newPaper,stepPaper,summarizePaperExits,paperPositionExitWarnings} from './paper-session.js';
const now=Date.parse('2026-11-04T15:00:00Z');
const q={symbol:'TEST',underlying:'SPY',bid:1.95,ask:2,quoteTime:now,delta:0.5,volume:200,openInterest:500};
test('paper entry uses ask, slippage and commission without mutating input',()=>{const s=newPaper();const n=stepPaper(s,{quote:q,enter:true,now});assert.equal(n.cash,1298.35);assert.equal(s.cash,1500);assert.equal(n.position.cost,201.65)});
for(const [bid,reason] of [[1.5,'STOP_LOSS'],[2.7,'PROFIT_TARGET']])test(reason+' closes at bid less fees',()=>{let s=stepPaper(newPaper(),{quote:q,enter:true,now});s=stepPaper(s,{quote:{...q,bid,ask:bid+0.05},now});assert.equal(s.position,null);assert.equal(s.trades[0].reason,reason);assert.equal(s.cash,Math.round((1500+s.realized)*100)/100)});
test('stale quotes and zero bid cannot create fake exit fills',()=>{const s=stepPaper(newPaper(),{quote:q,enter:true,now});assert.throws(()=>stepPaper(s,{quote:q,close:true,now:now+61000}),/fresh/);assert.throws(()=>stepPaper(s,{quote:{...q,bid:0},close:true,now}),/positive bid/)});
test('trailing stop tracks peak and closes on retracement',()=>{let s=stepPaper(newPaper(),{quote:q,enter:true,now});s=stepPaper(s,{quote:{...q,bid:2.4,ask:2.45},now});s=stepPaper(s,{quote:{...q,bid:2.1,ask:2.15},now});assert.equal(s.trades[0].reason,'TRAILING_STOP')});
test('paper practice continues beyond old daily count and profit cutoffs',()=>{
 for(const dayPnl of [75.70,-150]){
  const initial={...newPaper(),day:'2026-11-04',dayTrades:8,dayPnl};
  const entered=stepPaper(initial,{quote:q,enter:true,now});
  assert.ok(entered.position);
  assert.equal(entered.dayTrades,9);
  assert.equal(entered.dayPnl,dayPnl);
  assert.equal(initial.position,null);
 }
});
test('incomplete quality still prevents paper entries',()=>{assert.throws(()=>stepPaper(newPaper(),{quote:{...q,delta:null},enter:true,now}),/incomplete/)});

test('classified intraday paper position can remain past 30 minutes while stop and market-close safeguards apply',()=>{
 const entered=stepPaper(newPaper(),{quote:q,enter:true,now});
 entered.position.maxHoldMinutes=390;
 const mid=now+31*60000,hold=stepPaper(entered,{quote:{...q,quoteTime:mid},now:mid});
 assert.ok(hold.position,'classified intraday hold should not close merely because 30 minutes elapsed');
 const closeTime=now+360*60000;
 const exited=stepPaper(hold,{quote:{...q,quoteTime:closeTime},now:closeTime});
 assert.equal(exited.position,null);assert.equal(exited.trades[0].reason,'SESSION_END');
});
test('normal scalp still obeys the original 30-minute protective maximum',()=>{
 const entered=stepPaper(newPaper(),{quote:q,enter:true,now});
 const then=now+31*60000;
 const exited=stepPaper(entered,{quote:{...q,quoteTime:then},now:then});
 assert.equal(exited.position,null);assert.equal(exited.trades[0].reason,'MAX_HOLD');
});

test('cumulative profit stays positive while NY trading-day paper stop losses show negative today P/L',()=>{
 const time=Date.parse('2026-11-05T15:58:00.000Z');
 const records=[
  {symbol:'QQQ',reason:'MANUAL_CLOSE',pnl:140.60,exitTime:Date.parse('2026-11-04T19:50:00.000Z')},
  {id:'xle',symbol:'XLE 261106P00064000',reason:'STOP_LOSS',pnl:-21.30,exitFill:0.55,exitTime:Date.parse('2026-11-05T15:55:44.000Z')},
  {id:'aapl',symbol:'AAPL 261106P00342500',reason:'STOP_LOSS',pnl:-54.30,exitFill:1.93,exitTime:Date.parse('2026-11-05T15:55:44.000Z')}
 ];
 const summary=summarizePaperExits(records,time);
 assert.equal(summary.todayRealized,-75.6);
 assert.equal(summary.todayTrades,2);
 assert.deepEqual(summary.automaticExits.map(t=>t.label),['STOP LOSS TRIGGERED','STOP LOSS TRIGGERED']);
 assert.deepEqual(summary.automaticExits.map(t=>t.pnl),[-21.3,-54.3]);
 assert.equal(records.reduce((sum,t)=>sum+t.pnl,0),65,'all-time cumulative P/L remains +$65');
});

test('protective-exit explanation persists after page refresh and past the NY day boundary',()=>{
 const trade={symbol:'XLE',reason:'STOP_LOSS',pnl:-21.30,exitFill:0.55,exitTime:Date.parse('2026-11-05T15:55:44Z')};
 const first=summarizePaperExits([trade],Date.parse('2026-11-05T16:00:00Z'));
 const tomorrow=summarizePaperExits([trade],Date.parse('2026-11-06T16:00:00Z'));
 assert.equal(first.todayRealized,-21.3);
 assert.equal(tomorrow.todayRealized,0,'new trading day starts at zero');
 assert.deepEqual(tomorrow.automaticExits,first.automaticExits,'stored closure notice is never timer-dismissed');
});

test('selected paper stop choices behave independently for new positions',()=>{
 for(const pct of [15,20,35,50]){
  const entered=stepPaper(newPaper(),{quote:q,enter:true,now,stopLossPct:pct});
  assert.equal(entered.position.stopLossPct,pct);
  const mid={...q,bid:1.5,ask:1.6};
  const managed=stepPaper(entered,{quote:mid,now});
  assert.equal(Boolean(managed.position),pct>=35,'wider stops remain active on this exact bid for '+pct);
  if(pct<=20)assert.equal(managed.trades.at(-1).reason,'STOP_LOSS');
 }
});

test('changing the saved default NEVER silently widens a currently open position',()=>{
 const entry=stepPaper(newPaper(),{quote:q,enter:true,now,stopLossPct:15});
 const evaluated=stepPaper(entry,{quote:{...q,bid:1.60,ask:1.70},now,stopLossPct:50});
 assert.equal(evaluated.position,null);
 assert.equal(evaluated.trades[0].reason,'STOP_LOSS');
 assert.equal(evaluated.trades[0].stopLossPct,15);
 const legacy=stepPaper(newPaper(),{quote:q,enter:true,now});
 delete legacy.position.stopLossPct;
 const prior=stepPaper(legacy,{quote:{...q,bid:1.6,ask:1.7},now});
 assert.equal(prior.trades.at(-1).reason,'STOP_LOSS','old saved positions keep 20 percent rule');
});

test('unsupported paper stop choice is rejected when creating a position',()=>{
 for(const pct of [0,10,60,100,NaN]){
  assert.throws(()=>stepPaper(newPaper(),{quote:q,enter:true,now,stopLossPct:pct}),/supported paper stop/);
 }
});

test('open paper scalp warns five minutes before forced time exit and near selected stop',()=>{
 const position={symbol:'TEST',expiration:'2026-11-04',day:'2026-11-04',
  time:now-25*60000,maxHoldMinutes:30,fill:2.01,stopLossPct:20,
  mark:{bid:1.66,ask:1.71,quoteTime:now}};
 const warnings=paperPositionExitWarnings(position,now);
 assert.deepEqual(warnings.map(w=>w.type),['STOP_NEAR','TIME_LIMIT']);
 assert.equal(warnings[0].actionable,true);
 assert.equal(warnings[1].secondsLeft,300);
 assert.equal(warnings[1].actionable,true);
 position.mark.bid=1.5;
 const triggered=paperPositionExitWarnings(position,now);
 assert.equal(triggered[0].type,'STOP_TRIGGERED');
 assert.equal(triggered[0].actionable,false,'no override after stop has triggered');
 position.mark.quoteTime=now-60000;
 assert.equal(paperPositionExitWarnings(position,now).some(w=>w.type.startsWith('STOP')),false,'stale option marks must not generate false stop warnings');
 position.maxHoldMinutes=40;
 assert.equal(paperPositionExitWarnings(position,now).some(w=>w.type==='TIME_LIMIT'),false,'extension removes imminent timed exit warning');
});
test('mandatory same-day expiration exit warning is never overrideable',()=>{
 const nearClose=Date.parse('2026-11-04T20:52:00Z');
 const position={symbol:'TEST',expiration:'2026-11-04',day:'2026-11-04',
  time:nearClose-30*60000,maxHoldMinutes:390,fill:2,stopLossPct:20,
  mark:{bid:2,ask:2.05,quoteTime:nearClose}};
 const warnings=paperPositionExitWarnings(position,nearClose);
 const session=warnings.find(w=>w.type==='EXPIRATION_CLOSE');
 assert.ok(session);
 assert.equal(session.actionable,false);
});


test('manual paper ticket quantity correctly changes entry cash and full exit P&L',()=>{
 const opened=stepPaper(newPaper(),{quote:q,enter:true,now,quantity:2,maxPremium:500});
 assert.equal(opened.position.quantity,2);
 assert.equal(opened.position.cost,403.30);
 assert.equal(opened.cash,1096.70);
 const closed=stepPaper(opened,{quote:{...q,bid:2.70,ask:2.75},now});
 assert.equal(closed.position,null);
 assert.equal(closed.trades.at(-1).quantity,2);
 assert.equal(closed.trades.at(-1).pnl,133.40);
 assert.equal(closed.cash,1633.40);
 assert.throws(()=>stepPaper(newPaper(),{quote:q,enter:true,now,quantity:2,maxPremium:350}),/premium budget/);
 assert.throws(()=>stepPaper(newPaper(),{quote:q,enter:true,now,quantity:1.5,maxPremium:500}),/whole option contracts/);
});