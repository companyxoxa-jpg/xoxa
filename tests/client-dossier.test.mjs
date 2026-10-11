import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadHandler} from './load-handler.mjs';

const source=fs.readFileSync(new URL('../base44/functions/ManageClientDossier/entry.ts',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../src/components/admin/ClientDossierCenter.jsx',import.meta.url),'utf8');
const command=fs.readFileSync(new URL('../src/pages/CommandCenter.jsx',import.meta.url),'utf8');
const req=body=>new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const rows={Business:[{id:'b1',business_name:'Cliente Uno',legal_name:'Cliente Uno SL',tax_id:'B1',contact_email:'uno@example.test',status:'active'}],ClientContract:[{id:'c1',contract_number:'RIN-2026-1',tax_id:'B1',contact_email:'uno@example.test',status:'signed',commercial_email:'venta@example.test'}],ClientDocument:[{id:'d1',business_id:'b1',contract_id:'c1',document_type:'rgpd',status:'signed'}],Subscription:[{id:'s1',business_id:'b1',plan_id:'p1',status:'active',setup_amount:39900,monthly_amount:2495,currency:'EUR'}],BillingPayment:[{id:'pay1',business_id:'b1',status:'succeeded',amount:39900,currency:'EUR',kind:'setup'}],BillingInvoice:[{id:'i1',business_id:'b1',status:'paid',amount_due:39900,amount_paid:39900,currency:'EUR'}],SalesLead:[{id:'l1',converted_business_id:'b1',assigned_to:'venta@example.test'}],Plan:[{id:'p1',name:'RINNO'}],CommercialAccess:[],AuditLog:[]};
function client(user){const entities=Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,{list:async()=>v,filter:async q=>v.filter(x=>Object.entries(q).every(([a,b])=>x[a]===b)),create:async x=>x}]));return{auth:{me:async()=>user},asServiceRole:{entities}}}

test('client dossier is denied to commercial and business accounts',async()=>{
  const handler=await loadHandler('ManageClientDossier');
  for(const user of [{email:'venta@example.test',role:'user'},{email:'owner@example.test',role:'admin'}]){
    const response=await handler(req({action:'list'}),client(user));
    assert.equal(response.status,403);
  }
  assert.doesNotMatch(source,/isCommercial/);
});

test('Super Admin dossier joins contract, documents, subscription, payments and attribution',async()=>{
  const handler=await loadHandler('ManageClientDossier'),response=await handler(req({action:'list'}),client({id:'u1',email:'ax.network.hub@gmail.com',role:'admin'})),body=await response.json(),d=body.dossiers[0];
  assert.equal(response.status,200);
  assert.equal(d.business.id,'b1');
  assert.equal(d.contract.contract_number,'RIN-2026-1');
  assert.equal(d.documents.length,1);
  assert.equal(d.subscription.status,'active');
  assert.equal(d.summary.collected_cents,39900);
  assert.equal(d.summary.commercial_email,'venta@example.test');
  assert.equal(d.activation.completed,5);
  assert.deepEqual(d.activation.blockers,['Mandato SEPA firmado','Acta de entrega firmada','Negocio publicado']);
});

test('client center exposes the complete private operational dossier in Command Center',()=>{
  for(const text of ['Expedientes de clientes','Control de activación','Suscripción y cobros','Documentación','Facturas y pagos','Comercial'])assert.match(ui,new RegExp(text));
  for(const text of ['Contrato firmado','Alta de 399 € confirmada','Mandato SEPA firmado','Acuerdo RGPD firmado','Acta de entrega firmada','Negocio publicado'])assert.match(source,new RegExp(text));
  assert.match(command,/id: "clients", label: "Clientes"/);
  assert.match(command,/<ClientDossierCenter/);
});
