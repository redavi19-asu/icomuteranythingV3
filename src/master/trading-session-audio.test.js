import test from 'node:test';
import assert from 'node:assert/strict';
import {marketBellEvent,playMoneyCountingAlert} from './trading-session-audio.js';
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
