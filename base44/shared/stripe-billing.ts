const api='https://api.stripe.com/v1';
const secret=()=>{const value=Deno.env.get('STRIPE_SECRET_KEY')||'';if(Deno.env.get('STRIPE_TEST_ONLY')==='true'&&!/^(sk|rk)_test_/.test(value))throw new Error('QA requiere credenciales de Stripe Test');return value;};
function flatten(value:any,prefix='',out:URLSearchParams=new URLSearchParams()){for(const [key,item] of Object.entries(value||{})){const name=prefix?`${prefix}[${key}]`:key;if(item===null||item===undefined)continue;if(Array.isArray(item))item.forEach((v,i)=>typeof v==='object'?flatten(v,`${name}[${i}]`,out):out.append(`${name}[${i}]`,String(v)));else if(typeof item==='object')flatten(item,name,out);else out.append(name,String(item));}return out}
async function call(path:string,data:any,options:any={}){if(!secret())throw new Error('Servicio de pagos no configurado');const headers:any={Authorization:`Bearer ${secret()}`,'Content-Type':'application/x-www-form-urlencoded'};if(options.idempotencyKey)headers['Idempotency-Key']=options.idempotencyKey;const res=await fetch(`${api}${path}`,{method:'POST',headers,body:flatten(data)});const json=await res.json();if(!res.ok)throw new Error('El proveedor de pagos rechazó la operación');return json}
async function retrieve(path:string){if(!secret())throw new Error('Servicio de pagos no configurado');const res=await fetch(`${api}${path}`,{headers:{Authorization:`Bearer ${secret()}`}});const json=await res.json();if(!res.ok)throw new Error('El proveedor de pagos rechazó la operación');return json}
async function configuredTaxRates(){
  secret();
  const id=Deno.env.get('STRIPE_INCLUSIVE_TAX_RATE_ID');
  if(!id)return [];
  if(!/^txr_[A-Za-z0-9]+$/.test(id))throw new Error('Configuración fiscal no válida');
  const rate=await retrieve(`/tax_rates/${id}`);
  if(!rate.active||!rate.inclusive||!Number.isFinite(rate.percentage)||rate.percentage<0||rate.percentage>100||(Deno.env.get('STRIPE_TEST_ONLY')==='true'&&rate.livemode!==false))throw new Error('Configuración fiscal no válida');
  return [id];
}
export async function createStripeCheckout(data:any,idempotencyKey?:string){
  const rates=await configuredTaxRates();
  const payload=rates.length?{...data,line_items:data.line_items.map((item:any)=>({...item,tax_rates:rates}))}:data;
  return call('/checkout/sessions',payload,idempotencyKey?{idempotencyKey}:{});
}
export async function createStripeSubscriptionFromCheckout(session:any,_eventId:string){
  if(typeof session.id!=='string'||!session.id.startsWith('cs_')||session.mode!=='payment'||session.payment_status!=='paid'||session.currency!=='eur'||session.amount_total!==39900)throw new Error('Alta pagada no válida');
  if(!session.customer||!session.payment_intent||!session.metadata?.business_id)throw new Error('Alta sin referencia de facturación');
  // Stripe can prune idempotency keys after 24h. Reconcile the logical checkout first.
  let after='';
  do {
    const page=await retrieve(`/subscriptions?customer=${encodeURIComponent(session.customer)}&status=all&limit=100${after?'&starting_after='+encodeURIComponent(after):''}`);
    const existing=page.data?.find((sub:any)=>sub.metadata?.checkout_session_id===session.id);
    if(existing)return existing;
    after=page.has_more?page.data?.at(-1)?.id:'';
    if(page.has_more&&!after)throw new Error('No se pudo reconciliar la suscripción');
  }while(after);
  const paymentIntent=await retrieve(`/payment_intents/${encodeURIComponent(session.payment_intent)}`);
  if(paymentIntent.status!=='succeeded'||paymentIntent.amount_received!==39900||paymentIntent.currency!=='eur'||paymentIntent.customer!==session.customer||!paymentIntent.payment_method)throw new Error('El pago del alta no está confirmado');
  const metadata={...session.metadata,checkout_session_id:session.id},price=metadata.monthly_price_id||Deno.env.get('STRIPE_MONTHLY_PRICE_ID');
  if(!price||!Number(metadata.trial_end_unix))throw new Error('Calendario mensual de Stripe incompleto');
  const taxRates=await configuredTaxRates();
  return call('/subscriptions',{customer:session.customer,items:[{price}],...(taxRates.length?{default_tax_rates:taxRates}:{}),default_payment_method:paymentIntent.payment_method,trial_end:Number(metadata.trial_end_unix),billing_cycle_anchor_config:{day_of_month:1,hour:0,minute:0,second:0},proration_behavior:'create_prorations',payment_settings:{save_default_payment_method:'on_subscription'},metadata},{idempotencyKey:`rinno-subscription-${session.id}`});
}
export const retrieveStripeSubscription=(id:string)=>retrieve(`/subscriptions/${encodeURIComponent(id)}`);
export const retrieveStripeInvoice=(id:string)=>retrieve(`/invoices/${encodeURIComponent(id)}`);
export const cancelStripeSubscription=(id:string)=>call(`/subscriptions/${encodeURIComponent(id)}`,{cancel_at_period_end:true});
export const resumeStripeSubscription=(id:string)=>call(`/subscriptions/${encodeURIComponent(id)}`,{cancel_at_period_end:false});
export async function changeStripeSubscriptionPlan(id:string,planId:string){
  const amount=planId==='standard'?2495:planId==='premium'?3999:null;
  if(amount===null)throw Object.assign(new Error('Tarifa no válida'),{status:400});
  const priceId=Deno.env.get(planId==='premium'?'STRIPE_PREMIUM_PRICE_ID':'STRIPE_MONTHLY_PRICE_ID');
  if(!priceId||!/^price_[A-Za-z0-9]+$/.test(priceId))throw new Error('Precios de Stripe no configurados');
  const price=await retrieve(`/prices/${priceId}`);
  if(!price.active||price.currency!=='eur'||price.unit_amount!==amount||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1||(Deno.env.get('STRIPE_TEST_ONLY')==='true'&&price.livemode!==false))throw new Error('Tarifa del proveedor no válida');
  const sub=await retrieve(`/subscriptions/${encodeURIComponent(id)}`),items=sub.items?.data;
  if(!['trialing','active'].includes(sub.status)||sub.cancel_at_period_end||items?.length!==1||items[0].quantity!==1)throw Object.assign(new Error('La suscripción requiere revisión antes de cambiar de tarifa'),{status:409});
  if(items[0].price?.id===priceId)return sub;
  return call(`/subscriptions/${encodeURIComponent(id)}`,{items:[{id:items[0].id,price:priceId,quantity:1}],proration_behavior:'create_prorations',payment_behavior:'pending_if_incomplete'});
}
export const retryStripeInvoice=(id:string)=>call(`/invoices/${encodeURIComponent(id)}/pay`,{});

function bytesToHex(bytes:ArrayBuffer){return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function timingSafeEqual(a:string,b:string){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
export async function verifyStripeEvent(raw:string,header:string|null){
  const webhookSecret=Deno.env.get('STRIPE_WEBHOOK_SECRET')||'';
  if(!webhookSecret)throw new Error('STRIPE_WEBHOOK_SECRET no configurada');
  const parts=String(header||'').split(',').map(x=>x.trim().split('='));
  const timestamps=parts.filter(x=>x[0]==='t');
  const timestamp=timestamps[0]?.[1];
  const signatures=parts.filter(x=>x[0]==='v1' && /^[a-f0-9]{64}$/.test(x[1]||'')).map(x=>x[1]);
  if(timestamps.length!==1 || !/^\d+$/.test(timestamp||'') || !Number.isSafeInteger(Number(timestamp)) || !signatures.length)throw new Error('Firma de webhook no válida');
  if(Math.abs(Date.now()/1000-Number(timestamp))>300)throw new Error('Webhook expirado');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(webhookSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=bytesToHex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${raw}`)));
  if(!signatures.some(sig=>timingSafeEqual(sig,digest)))throw new Error('Firma de webhook no válida');
  const event=JSON.parse(raw);
  if(Deno.env.get('STRIPE_TEST_ONLY')==='true'&&event?.livemode!==false)throw new Error('Solo eventos Stripe Test');
  if(!event || typeof event.id!=='string' || !event.id || typeof event.type!=='string' || !event.type || !event.data?.object || typeof event.data.object!=='object' || Array.isArray(event.data.object))throw new Error('Evento de pago no válido');
  return event;
}
