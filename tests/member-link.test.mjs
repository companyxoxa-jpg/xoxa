import test from 'node:test';
import assert from 'node:assert/strict';
import { findLinkableMember } from '../base44/shared/member-link.js';

test('verified member email links case-insensitively within the supplied tenant list',()=>{
  const member={id:'m1',email:' SOCIO@Example.com ',user_id:null};
  assert.equal(findLinkableMember([member],{id:'u1',email:'socio@example.com',is_verified:true}),member);
});

test('member auto-link requires verified account evidence, not merely a matching email',()=>{
  for(const is_verified of [undefined,false])assert.equal(findLinkableMember([{email:'qa@example.invalid'}],{id:'u',email:'qa@example.invalid',is_verified}),null);
});

test('member auto-link is denied for ambiguity or an existing different user',()=>{
  assert.equal(findLinkableMember([{id:'a',email:'x@test.es'},{id:'b',email:'X@test.es'}],{id:'u',email:'x@test.es',is_verified:true}),null);
  assert.equal(findLinkableMember([{id:'a',email:'x@test.es',user_id:'other'}],{id:'u',email:'x@test.es',is_verified:true}),null);
  assert.equal(findLinkableMember([{id:'a',email:'x@test.es'}],{id:'u',email:'no@test.es',is_verified:true}),null);
});
