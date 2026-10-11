import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDispensation } from '../base44/shared/csc.js';

test('CSC dispensation updates monthly usage and stock',()=>{
  assert.deepEqual(calculateDispensation({quantity:5,limit:60,previousTotal:12,stock:25,availability:'available'}),{grams:5,periodTotal:17,remaining:20,nextAvailability:'available'});
  assert.equal(calculateDispensation({quantity:5,limit:60,previousTotal:12,stock:9,availability:'available'}).nextAvailability,'limited');
  assert.equal(calculateDispensation({quantity:5,limit:60,previousTotal:12,stock:5,availability:'limited'}).nextAvailability,'unavailable');
});

test('CSC dispensation rejects invalid quantities, limits and unavailable stock',()=>{
  assert.throws(()=>calculateDispensation({quantity:0,limit:60}),{status:400});
  assert.throws(()=>calculateDispensation({quantity:2,limit:0}),{status:409});
  assert.throws(()=>calculateDispensation({quantity:11,limit:60,previousTotal:50}),{status:409});
  assert.throws(()=>calculateDispensation({quantity:6,limit:60,stock:5}),{status:409});
  assert.throws(()=>calculateDispensation({quantity:1,limit:60,availability:'unavailable'}),{status:409});
});
