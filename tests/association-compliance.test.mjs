import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCompliance, meetsMinimumAge, requireMemberCompliance } from '../base44/shared/association-compliance.js';

test('no active required policies preserves current member access',()=>{
 assert.equal(calculateCompliance([],[]).compliant,true);
});

test('only acceptance of the exact active version is valid',()=>{
 const policies=[{id:'p1',version:'2',status:'active',required:true}];
 assert.equal(calculateCompliance(policies,[{policy_id:'p1',policy_version:'1'}]).compliant,false);
 assert.equal(calculateCompliance(policies,[{policy_id:'p1',policy_version:'2'}]).compliant,true);
 assert.equal(calculateCompliance(policies,[{policy_id:'p1',policy_version:'2',revoked_at:'2026-01-01'}]).compliant,false);
});

test('optional policies do not block access',()=>{
 const result=calculateCompliance([{id:'p1',version:'1',status:'active',required:false}],[]);
 assert.equal(result.compliant,true);assert.equal(result.items[0].accepted,false);
});

test('minimum age uses the exact birthday boundary',()=>{
 const now=new Date('2026-09-27T12:00:00Z');
 assert.equal(meetsMinimumAge('2008-09-27',18,now),true);
 assert.equal(meetsMinimumAge('2008-09-28',18,now),false);
 assert.equal(meetsMinimumAge(null,18,now),false);
});

test('required compliance rejects a member with pending documents',async()=>{
 const entities={AssociationLegalPolicy:{filter:async()=>[{id:'p',version:'1',status:'active',required:true}]},MemberConsent:{filter:async()=>[]}};
 await assert.rejects(()=>requireMemberCompliance(entities,'b','m'),e=>e.status===409);
});
