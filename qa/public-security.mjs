import fs from 'node:fs';
const app='6aca8950491b4b2d74f6f62d';
const origin=`https://preview-sandbox--${app}.base44.app`;
const cases=[];
for(const token of [{$ne:null},[], 'qa-nonexistent-token-20261011']) cases.push({case:'T13',fn:'TrackOrder',body:{token},expected:typeof token==='string'?404:400});
for(const order_number of [{$ne:null},[], 'QA-NONEXISTENT-20261011'])cases.push({case:'T13',fn:'GuestOrderLookup',body:{slug:'rinno-qa-a-20261010',order_number,email:'ficticio@example.invalid'},expected:typeof order_number==='string'?404:400});
for(const fn of ['GetStorefront','CreateOrder'])for(const slug of [{$ne:null},[]])cases.push({case:'T14-partial',fn,body:{slug,items:[{product_id:'6acb506c8a5632ab7b03bf9c',quantity:1}]},expected:400});
for(const signature of [undefined,'invalid','t=1,v1='+'0'.repeat(64)])cases.push({case:'T20-partial',fn:'BillingWebhook',body:{id:'evt_qa_invalid_only',type:'checkout.session.completed',data:{object:{payment_status:'unpaid'}}},signature,expected:400});
const results=[];
for(const c of cases){
 const headers={'Content-Type':'application/json'};if(c.signature)headers['stripe-signature']=c.signature;
 const response=await fetch(`${origin}/api/apps/${app}/functions/${c.fn}`,{method:'POST',headers,body:JSON.stringify(c.body),signal:AbortSignal.timeout(25000)});
 const raw=await response.text();const leaked=/(?:sk_live_|sk_test_|whsec_|Bearer\s+)[A-Za-z0-9._-]+/.test(raw);
 results.push({...c,http:response.status,response:raw.replace(/(?:sk_live_|sk_test_|whsec_|Bearer\s+)[A-Za-z0-9._-]+/g,'[REDACTED]').slice(0,1000),secretPatternFound:leaked,status:response.status===c.expected&&!leaked?'APROBADO':'FALLIDO'});
}
fs.writeFileSync('../../outputs/RINNO-QA-PUBLICOS-FINAL.json',JSON.stringify({app,at:new Date().toISOString(),note:'Real unauthenticated HTTP. Partial cases are not full case approval. Invalid signature tests do not prove verification against a configured valid secret.',results},null,2));
console.log(JSON.stringify(results.map(x=>({case:x.case,fn:x.fn,http:x.http,status:x.status}))));
