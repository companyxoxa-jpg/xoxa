import test from 'node:test';
import assert from 'node:assert/strict';
import {billingReturnOrigin} from '../base44/shared/billing-origin.js';
test('QA never returns a checkout to production even with a production origin setting',()=>{
  assert.equal(billingReturnOrigin('6aca8950491b4b2d74f6f62d','https://rinno.es'),'https://preview-sandbox--6aca8950491b4b2d74f6f62d.base44.app');
});
test('billing origin rejects userinfo, insecure URLs and appended paths',()=>{
  for(const value of ['http://example.com','https://user:password@example.com','https://example.com/path','https://example.com#fragment'])assert.throws(()=>billingReturnOrigin('other',value));
  assert.equal(billingReturnOrigin('other',undefined),'https://rinno.es');
});
