import { withBusinessMutation } from './business-mutation.js';

export const BILLING_TERMS = Object.freeze({
  currency: 'eur', setup_amount: 39900, monthly_amount: 2495,
  premium_monthly_amount: 3999,
  first_period_months: 1, vat_included: true, commitment_months: 0,
});

export const BILLING_PLANS = Object.freeze({
  standard: { id: 'standard', name: 'Standard', monthly_amount: 2495 },
  premium: { id: 'premium', name: 'Premium', monthly_amount: 3999 },
});

export const SUBSCRIPTION_STATUSES = ['pending','trialing','active','past_due','unpaid','cancel_at_period_end','cancelled'];
export const PAYMENT_STATUSES = ['pending','succeeded','failed','refunded'];

export function addDays(value, days) {
  const date = new Date(value); if (Number.isNaN(date.getTime())) throw new Error('Fecha no válida');
  date.setUTCDate(date.getUTCDate() + days); return date.toISOString();
}

export function addCalendarMonth(value) {
  const source = new Date(value); if (Number.isNaN(source.getTime())) throw new Error('Fecha no válida');
  const targetMonth = source.getUTCMonth() + 1;
  const year = source.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(source.getUTCDate(), lastDay), source.getUTCHours(), source.getUTCMinutes(), source.getUTCSeconds(), source.getUTCMilliseconds()));
}

export function nextMonthStart(value) {
  const source = new Date(value); if (Number.isNaN(source.getTime())) throw new Error('Fecha no válida');
  return new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

export function billingSchedule(contractedAt = new Date()) {
  const contracted = new Date(contractedAt); if (Number.isNaN(contracted.getTime())) throw new Error('Fecha no válida');
  const trialEnd = addCalendarMonth(contracted), billingAnchor = nextMonthStart(trialEnd);
  return { contracted_at:contracted.toISOString(), trial_end:trialEnd.toISOString(), billing_cycle_anchor:billingAnchor.toISOString(), trial_end_unix:Math.floor(trialEnd.getTime()/1000), billing_cycle_anchor_unix:Math.floor(billingAnchor.getTime()/1000) };
}

export function estimateTransitionCharge(monthlyAmount, trialEnd, billingAnchor) {
  const end = new Date(billingAnchor), start = new Date(trialEnd), periodStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth()-1, 1));
  if (![end,start,periodStart].every(x=>Number.isFinite(x.getTime())) || start>end) throw new Error('Periodo proporcional no válido');
  return Math.round(Number(monthlyAmount) * (end-start) / (end-periodStart));
}

export function checkoutDefinition({ business, customerEmail, successUrl, cancelUrl, setupPriceId, monthlyPriceId, planId = 'standard', contractedAt = new Date(), metadata = {} }) {
  if (!business?.id) throw new Error('Negocio requerido');
  if (!customerEmail) throw new Error('Correo de facturación requerido');
  const plan = BILLING_PLANS[planId];
  if (!plan) throw new Error('Tarifa no válida');
  const schedule = billingSchedule(contractedAt), checkoutExpiresAt = Math.floor(new Date(contractedAt).getTime()/1000) + 23*60*60;
  return {
    mode: 'payment', customer_email: customerEmail, customer_creation:'always',
    success_url: successUrl, cancel_url: cancelUrl,
    expires_at: checkoutExpiresAt,
    billing_address_collection: 'required', tax_id_collection: { enabled: true }, managed_payments: { enabled: false },
    invoice_creation:{enabled:true,invoice_data:{metadata:{business_id:business.id,charge_type:'setup'}}},
    line_items: [setupPriceId ? { quantity: 1, price: setupPriceId } : { quantity: 1, price_data: { currency: 'eur', unit_amount: BILLING_TERMS.setup_amount, tax_behavior: 'inclusive', product_data: { name: 'Alta y puesta en marcha RINNO', metadata: { charge_type: 'setup' } } } }],
    payment_intent_data:{setup_future_usage:'off_session',metadata:{business_id:business.id,charge_type:'setup'}},
    metadata: { business_id: business.id, plan_id: plan.id, monthly_price_id:monthlyPriceId||'', trial_end:schedule.trial_end, trial_end_unix:String(schedule.trial_end_unix), billing_cycle_anchor:schedule.billing_cycle_anchor, ...metadata },
  };
}

export function normalizeProviderStatus(status, cancelAtPeriodEnd = false) {
  if (cancelAtPeriodEnd && ['trialing','active'].includes(status)) return 'cancel_at_period_end';
  const map = { trialing:'trialing', active:'active', past_due:'past_due', unpaid:'unpaid', canceled:'cancelled', incomplete:'pending', incomplete_expired:'cancelled', paused:'past_due' };
  return map[status] || 'pending';
}

export function paymentKind(invoice) {
  if(invoice?.metadata?.charge_type==='setup')return 'setup';
  if (invoice?.lines?.data?.some(line=>line.proration || line.parent?.subscription_item_details?.proration)) return 'proration';
  return invoice?.billing_reason === 'subscription_create' ? 'setup' : 'renewal';
}

export function subscriptionBusinessState(status) {
  const access=status==='trialing'?'trial':['active','cancel_at_period_end'].includes(status)?'active':'suspended';
  return {subscription_status:status==='trialing'?'trial':status==='cancel_at_period_end'?'active':status,status:access};
}

export function invoicePaymentRecord(invoice, businessId, status) {
  return {
    business_id: businessId, provider: 'stripe', external_payment_id: invoice.payment_intent || invoice.charge || invoice.id,
    external_invoice_id: invoice.id, kind: paymentKind(invoice), amount: Number(invoice.amount_paid || invoice.amount_due || 0),
    currency: String(invoice.currency || 'eur').toUpperCase(), status,
    attempt_count: Number(invoice.attempt_count || 0), paid_at: status === 'succeeded' ? new Date((invoice.status_transitions?.paid_at || Math.floor(Date.now()/1000))*1000).toISOString() : null,
    failure_code: invoice.last_finalization_error?.code || null,
    failure_message: invoice.last_finalization_error?.message || null,
  };
}

export async function processBillingEvent(client, event) {
  if (!event?.id || !event?.type) throw new Error('Evento de pago no válido');
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed'].includes(event.type)) return {ignored:true};
  // A completed Checkout can still be awaiting payment. It grants no service.
  if (['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type) && event.data?.object?.payment_status !== 'paid') return { ignored: true };
  const object = event.data?.object || {};
  const subscriptionId = object.subscription || object.parent?.subscription_details?.subscription || (event.type.startsWith('customer.subscription.') ? object.id : null);
  const subscriptions = subscriptionId ? await client.asServiceRole.entities.Subscription.filter({external_subscription_id:subscriptionId}) : [];
  const businessId = subscriptions[0]?.business_id || object.metadata?.business_id || object.subscription_details?.metadata?.business_id || object.parent?.subscription_details?.metadata?.business_id;
  if (!businessId) throw new Error('El evento requiere reconciliación de su negocio');
  return withBusinessMutation(client, businessId, () => processBillingEventLocked(client,event));
}

async function processBillingEventLocked(client, event) {
  const seen = await client.asServiceRole.entities.BillingWebhookEvent.filter({ provider:'stripe', external_event_id:event.id });
  if (seen.some(row=>row.status==='processed')) return { duplicate:true };
  if (seen.some(row=>row.status==='processing')) throw Object.assign(new Error('Evento todavía en proceso; requiere reconciliación'),{status:409});
  const object = event.data?.object || {};
  const businessId = object.metadata?.business_id || object.subscription_details?.metadata?.business_id || object.parent?.subscription_details?.metadata?.business_id || null;
  const eventData = { provider:'stripe', external_event_id:event.id, event_type:event.type, business_id:businessId, status:'processing', received_at:new Date().toISOString(),error:null,processed_at:null };
  const eventRow = seen[0] ? await client.asServiceRole.entities.BillingWebhookEvent.update(seen[0].id,eventData) : await client.asServiceRole.entities.BillingWebhookEvent.create(eventData);
  try {
    if (['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) {
      const bid = businessId; if (!bid) throw new Error('El checkout no contiene business_id');
      const subs = await client.asServiceRole.entities.Subscription.filter({ business_id:bid });
      const planId = object.metadata?.plan_id || 'standard', plan = BILLING_PLANS[planId] || BILLING_PLANS.standard;
      const patch = { provider:'stripe', plan_id:plan.id, external_customer_id:object.customer, external_subscription_id:object.subscription, checkout_session_id:object.id, status:'trialing', start_date:new Date().toISOString(), trial_end:object.metadata?.trial_end||null, billing_cycle_anchor:object.metadata?.billing_cycle_anchor||null, renewal_date:object.metadata?.billing_cycle_anchor||object.metadata?.trial_end||null, setup_amount:BILLING_TERMS.setup_amount, monthly_amount:plan.monthly_amount, currency:'EUR', first_month_included:true, vat_included:true, attributed_commercial_email:object.metadata?.commercial_email || null, sales_lead_id:object.metadata?.sales_lead_id || null };
      if(subs[0]?.checkout_session_id===object.id&&subs[0].status!=='pending'){patch.status=subs[0].status;patch.start_date=subs[0].start_date||patch.start_date;}
      if (subs[0]) await client.asServiceRole.entities.Subscription.update(subs[0].id,patch); else await client.asServiceRole.entities.Subscription.create({business_id:bid,...patch});
      const setupPayments=await client.asServiceRole.entities.BillingPayment.filter({external_payment_id:object.payment_intent});
      if(object.payment_status==='paid'&&typeof object.payment_intent==='string'&&!setupPayments.length)await client.asServiceRole.entities.BillingPayment.create({business_id:bid,provider:'stripe',external_payment_id:object.payment_intent,external_invoice_id:object.invoice||object.id,kind:'setup',amount:Number(object.amount_total||BILLING_TERMS.setup_amount),currency:String(object.currency||'eur').toUpperCase(),status:'succeeded',attempt_count:1,paid_at:new Date().toISOString(),failure_code:null,failure_message:null});
      await client.asServiceRole.entities.Business.update(bid,subscriptionBusinessState(patch.status));
    }
    if (event.type.startsWith('customer.subscription.')) {
      const subs = await client.asServiceRole.entities.Subscription.filter({ external_subscription_id:object.id }); const sub=subs[0];
      if(!sub) throw Object.assign(new Error('La suscripción todavía no está vinculada'),{status:409});
      if (sub) { const status=normalizeProviderStatus(object.status,object.cancel_at_period_end); const price=object.items?.data?.[0]?.price; const tariff=price?.currency==='eur'&&price?.recurring?.interval==='month'&&price?.recurring?.interval_count===1?Object.values(BILLING_PLANS).find(plan=>plan.monthly_amount===price.unit_amount):null; const planPatch=tariff?{plan_id:tariff.id,monthly_amount:tariff.monthly_amount}:{}; await client.asServiceRole.entities.Subscription.update(sub.id,{...planPatch,status,cancel_at_period_end:!!object.cancel_at_period_end,cancel_at:object.cancel_at?new Date(object.cancel_at*1000).toISOString():null,renewal_date:(object.current_period_end||object.items?.data?.[0]?.current_period_end)?new Date((object.current_period_end||object.items.data[0].current_period_end)*1000).toISOString():sub.renewal_date,ended_at:object.ended_at?new Date(object.ended_at*1000).toISOString():null}); await client.asServiceRole.entities.Business.update(sub.business_id,subscriptionBusinessState(status)); if(status==='cancelled'&&client.asServiceRole.entities.ClientDocument?.updateMany)await client.asServiceRole.entities.ClientDocument.updateMany({business_id:sub.business_id,document_type:'cancellation',status:'cancellation_requested'},{$set:{status:'cancellation_effective',effective_date:new Date().toISOString()}}); }
    }
    if (['invoice.paid','invoice.payment_failed'].includes(event.type)) {
      const externalSubscription = object.subscription || object.parent?.subscription_details?.subscription;
      const subs = externalSubscription ? await client.asServiceRole.entities.Subscription.filter({ external_subscription_id:externalSubscription }) : businessId ? await client.asServiceRole.entities.Subscription.filter({business_id:businessId}) : []; const sub=subs[0];
      if (!sub?.external_subscription_id) throw Object.assign(new Error('La suscripción todavía no está vinculada'),{status:409});
      if (sub) {
        const status=event.type==='invoice.paid'?'succeeded':'failed'; const existing=await client.asServiceRole.entities.BillingPayment.filter({external_invoice_id:object.id}); const record=invoicePaymentRecord(object,sub.business_id,status);
        if(status==='failed'&&existing.some(payment=>payment.status==='succeeded')) {
          await client.asServiceRole.entities.BillingWebhookEvent.update(eventRow.id,{status:'processed',processed_at:new Date().toISOString()});
          return {ok:true,stale:true};
        }
        if(existing[0]) await client.asServiceRole.entities.BillingPayment.update(existing[0].id,record); else await client.asServiceRole.entities.BillingPayment.create(record);
        const invoices=await client.asServiceRole.entities.BillingInvoice.filter({external_invoice_id:object.id}); const inv={business_id:sub.business_id,provider:'stripe',external_invoice_id:object.id,number:object.number||null,status:object.status||status,amount_due:Number(object.amount_due||0),amount_paid:Number(object.amount_paid||0),currency:String(object.currency||'eur').toUpperCase(),hosted_invoice_url:object.hosted_invoice_url||null,invoice_pdf:object.invoice_pdf||null,issued_at:new Date((object.created||Math.floor(Date.now()/1000))*1000).toISOString(),paid_at:status==='succeeded'?new Date().toISOString():null};
        if(invoices[0]) await client.asServiceRole.entities.BillingInvoice.update(invoices[0].id,inv); else await client.asServiceRole.entities.BillingInvoice.create(inv);
        const nextStatus=object.metadata?.charge_type==='setup'?sub.status:sub.status==='cancelled'?'cancelled':status==='failed'?'past_due':Number(object.amount_paid)===0&&sub.status==='trialing'?'trialing':sub.cancel_at_period_end?'cancel_at_period_end':'active';
        await client.asServiceRole.entities.Subscription.update(sub.id,{status:nextStatus,last_payment_status:status,last_payment_at:status==='succeeded'?new Date().toISOString():sub.last_payment_at,payment_retry_count:status==='failed'?Number(object.attempt_count||1):0});
        await client.asServiceRole.entities.Business.update(sub.business_id,subscriptionBusinessState(nextStatus));
      }
    }
    await client.asServiceRole.entities.BillingWebhookEvent.update(eventRow.id,{status:'processed',processed_at:new Date().toISOString()});
    return {ok:true};
  } catch(error) { await client.asServiceRole.entities.BillingWebhookEvent.update(eventRow.id,{status:'failed',error:'Procesamiento fallido; revisar y reintentar mediante el flujo de reconciliación',processed_at:new Date().toISOString()}); throw error; }
}

export function billingMetrics({subscriptions=[],payments=[],businesses=[]}) {
  const live=subscriptions.filter(s=>['trialing','active','past_due','cancel_at_period_end'].includes(s.status));
  return { active_subscriptions:subscriptions.filter(s=>s.status==='active').length, trialing:subscriptions.filter(s=>s.status==='trialing').length, past_due:subscriptions.filter(s=>['past_due','unpaid'].includes(s.status)).length, scheduled_cancellations:subscriptions.filter(s=>s.status==='cancel_at_period_end').length, mrr_cents:live.filter(s=>!['past_due','unpaid'].includes(s.status)).reduce((n,s)=>n+Number(s.monthly_amount||0),0), collected_cents:payments.filter(p=>p.status==='succeeded').reduce((n,p)=>n+Number(p.amount||0),0), failed_payments:payments.filter(p=>p.status==='failed').length, paying_businesses:new Set(live.map(s=>s.business_id)).size, total_businesses:businesses.filter(b=>!b.demo_key).length };
}
