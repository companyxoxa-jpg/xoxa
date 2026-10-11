export const CONTRACT_STATUSES = ['draft','pending_signature','signed','active','cancelled'];
export const PAYMENT_METHODS = ['stripe','direct_debit','transfer','other'];
export const REQUIRED_CONTRACT_FIELDS = [
  'client_name','tax_id','trade_name','fiscal_address','business_address','representative_name',
  'representative_id','representative_role','contact_phone','contact_email','display_name',
  'public_phone','public_email','public_address','weekday_hours','service_area','catalog_material',
  'approx_products','main_categories','taxes_included','billing_name','billing_tax_id',
  'billing_address','billing_email','place','client_signer_name','client_signer_id','client_signer_role',
  'rinno_signer_name','rinno_signer_id','rinno_signer_role'
];

export function cleanContractData(input={}) {
  const out={};
  for(const [key,value] of Object.entries(input||{})){
    if(key==='authorizations') out.authorizations=Array.isArray(value)?value.map(Boolean).slice(0,4):[];
    else if(typeof value==='boolean') out[key]=value;
    else out[key]=String(value??'').trim().slice(0,key==='observations'?2000:500);
  }
  return out;
}

export function validateContract(data,{signatures=false}={}){
  const missing=REQUIRED_CONTRACT_FIELDS.filter(key=>!String(data?.[key]||'').trim());
  if(!PAYMENT_METHODS.includes(data?.payment_method))missing.push('payment_method');
  if(!/^\S+@\S+\.\S+$/.test(String(data?.contact_email||'')))missing.push('contact_email');
  if(!/^\S+@\S+\.\S+$/.test(String(data?.billing_email||'')))missing.push('billing_email');
  if(!Array.isArray(data?.authorizations)||data.authorizations.length!==4||data.authorizations.some(x=>x!==true))missing.push('authorizations');
  if(signatures&&!String(data?.client_signature||'').startsWith('data:image/png;base64,'))missing.push('client_signature');
  if(signatures&&!String(data?.rinno_signature||'').startsWith('data:image/png;base64,'))missing.push('rinno_signature');
  return [...new Set(missing)];
}

export function contractNumber(year,sequence){return `RIN-${year}-${String(sequence).padStart(6,'0')}`}
