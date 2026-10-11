import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cleanContractData, contractNumber, validateContract } from '../base44/shared/contracts.js';

const complete={
  client_name:'Comercio Ejemplo SL',tax_id:'B12345678',trade_name:'Mercado Ejemplo',fiscal_address:'Calle Fiscal 1',business_address:'Calle Local 2',representative_name:'Ana Ejemplo',representative_id:'12345678Z',representative_role:'Administradora',contact_phone:'600000000',contact_email:'ana@example.test',display_name:'Mercado Ejemplo',public_phone:'600000000',public_email:'hola@example.test',public_address:'Calle Local 2',weekday_hours:'09:00-20:00',service_area:'Madrid',catalog_material:'excel',approx_products:'120',main_categories:'Fruta y verdura',taxes_included:'yes',billing_name:'Comercio Ejemplo SL',billing_tax_id:'B12345678',billing_address:'Calle Fiscal 1',billing_email:'facturas@example.test',place:'Madrid',client_signer_name:'Ana Ejemplo',client_signer_id:'12345678Z',client_signer_role:'Administradora',rinno_signer_name:'Representante RINNO',rinno_signer_id:'00000000T',rinno_signer_role:'Administración',payment_method:'stripe',authorizations:[true,true,true,true]
};

test('contract number uses the required annual sequence format',()=>{
  assert.equal(contractNumber(2026,1),'RIN-2026-000001');
  assert.equal(contractNumber(2031,712),'RIN-2031-000712');
});

test('contract validation requires every authorization and both signatures at finalization',()=>{
  assert.deepEqual(validateContract(complete),[]);
  assert.deepEqual(validateContract({...complete,authorizations:[true,true,false,true]}),['authorizations']);
  const signed={...complete,client_signature:'data:image/png;base64,AA==',rinno_signature:'data:image/png;base64,AA=='};
  assert.deepEqual(validateContract(signed,{signatures:true}),[]);
});

test('contract data is bounded and does not accept arbitrary binary values',()=>{
  const cleaned=cleanContractData({...complete,observations:'x'.repeat(5000),authorizations:[1,0,1,1,1]});
  assert.equal(cleaned.observations.length,2000);
  assert.deepEqual(cleaned.authorizations,[true,false,true,true]);
});

test('contract storage is private and signed records are immutable',()=>{
  const entity=JSON.parse(fs.readFileSync(new URL('../base44/entities/ClientContract.jsonc',import.meta.url),'utf8'));
  assert.deepEqual(entity.rls,{read:false,create:false,update:false,delete:false});
  const source=fs.readFileSync(new URL('../base44/functions/ManageContract/entry.ts',import.meta.url),'utf8');
  assert.match(source,/isSuperAdmin/);
  assert.match(source,/isCommercial/);
  assert.match(source,/Un contrato firmado no puede modificarse/);
  assert.match(source,/pdf_sha256/);
  assert.match(source,/ContractStatusHistory/);
});

test('official three-page master is bundled and the generator overlays that exact asset',()=>{
  const master=new URL('../public/contracts/Contrato_Alta_RINNO_Completo_Profesional_v3_master.pdf',import.meta.url);
  const bytes=fs.readFileSync(master);
  assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
  assert.ok(bytes.length>800000);
  const source=fs.readFileSync(new URL('../base44/functions/ManageContract/entry.ts',import.meta.url),'utf8');
  assert.match(source,/Contrato_Alta_RINNO_Completo_Profesional_v3_master\.pdf/);
  assert.match(source,/PDFDocument\.load/);
});
