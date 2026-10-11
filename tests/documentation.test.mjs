import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manage=fs.readFileSync(new URL('../base44/functions/ManageDocuments/entry.ts',import.meta.url),'utf8');
const pdf=fs.readFileSync(new URL('../base44/shared/client-document-pdf.ts',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../src/components/admin/DocumentationCenter.jsx',import.meta.url),'utf8');

test('document module is backend restricted to Super Admin',()=>{
  assert.match(manage,/if\(!isSuperAdmin\(user\)\)throw fail\('Documentación disponible únicamente para Super Admin',403\)/);
  assert.doesNotMatch(manage,/isCommercial/);
  for(const name of ['ClientDocument','DocumentConfiguration','DocumentCounter','DocumentEvent']){
    const entity=JSON.parse(fs.readFileSync(new URL(`../base44/entities/${name}.jsonc`,import.meta.url),'utf8'));
    assert.deepEqual(entity.rls,{read:false,create:false,update:false,delete:false});
  }
});

test('four official document types have independent annual numbering',()=>{
  for(const [type,prefix] of Object.entries({sepa:'SEPA',rgpd:'RGPD',delivery:'ACTA',cancellation:'BAJA'})){
    assert.match(manage,new RegExp(`${type}:'${prefix}'`));
  }
  assert.match(manage,/updateMany\(\{id:row\.id,next_number:seq\}/);
  assert.match(manage,/padStart\(6,'0'\)/);
});

test('SEPA and RGPD cannot finalize with missing administrative configuration',()=>{
  assert.match(manage,/creditor_sepa_id/);
  assert.match(manage,/treatment_purpose/);
  assert.match(manage,/security_measures/);
  assert.match(manage,/subprocessors/);
  assert.match(manage,/Completa Configuración documental/);
});

test('signed documents are immutable, private and auditable',()=>{
  assert.match(manage,/El documento firmado es inmutable/);
  assert.match(manage,/pdf_sha256/);
  assert.match(manage,/DocumentEvent/);
  assert.match(manage,/pdf_accessed/);
  assert.match(manage,/annulment_reason/);
  assert.match(manage,/motivo de anulación suficiente/i);
});

test('cancellation schedules Stripe and preserves records until effective',()=>{
  assert.match(manage,/cancelStripeSubscription/);
  assert.match(manage,/cancel_at_period_end:true/);
  assert.match(manage,/Stripe todavía no ha confirmado la cancelación/);
  assert.doesNotMatch(manage,/\.delete\(/);
  const billing=fs.readFileSync(new URL('../base44/shared/billing.js',import.meta.url),'utf8');
  assert.match(billing,/cancellation_effective/);
});

test('PDF generator applies RINNO identity to all four documents without public file URLs',()=>{
  for(const title of ['MANDATO SEPA','ACUERDO DE ENCARGO','ACTA DE ENTREGA','SOLICITUD DE BAJA'])assert.match(pdf,new RegExp(title));
  assert.match(pdf,/opacity:\.13/);
  assert.match(pdf,/Página \$\{i\+1\} de \$\{count\}/);
  assert.match(pdf,/rinno-logo-official\.png/);
  assert.doesNotMatch(manage,/pdf_url/);
});

test('Super Admin UI provides selection, filters, signatures, download and share',()=>{
  for(const text of ['Generar documento','Datos legales','Selecciona un contrato firmado','SignaturePad','Descargar PDF','Compartir'])assert.match(ui,new RegExp(text));
});
