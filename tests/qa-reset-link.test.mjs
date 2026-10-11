import test from 'node:test';
import assert from 'node:assert/strict';
import {readQaResetToken} from '../qa/remote-snapshot/src/lib/qa-reset-link.js';
test('QA recovery accepts only the same QA app and a single token',()=>{
 assert.equal(readQaResetToken('https://rinno-guard-lab.base44.app/reset-password?token=synthetic'),'synthetic');
 for(const url of ['http://rinno-guard-lab.base44.app/reset-password?token=x','https://rinno.es/reset-password?token=x','https://evil.example/reset-password?token=x','https://rinno-guard-lab.base44.app/reset-password?token=x&token=y','https://rinno-guard-lab.base44.app/login?token=x','https://user@rinno-guard-lab.base44.app/reset-password?token=x','https://rinno-guard-lab.base44.app/reset-password']) assert.throws(()=>readQaResetToken(url));
});
