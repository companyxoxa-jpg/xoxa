import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { checkoutDefinition, BILLING_PLANS } from '../../shared/billing.js';
import { createStripeCheckout } from '../../shared/stripe-billing.ts';
import { isSuperAdmin, isCommercial, createAuditLog } from '../../shared/rinno.ts';
import { withBusinessMutation } from '../../shared/business-mutation.js';
import { billingReturnOrigin } from '../../shared/billing-origin.js';

const email=value=>String(value||'').trim().toLowerCase();
const requiredBusinessFields=['business_name','business_type','contact_email','contact_phone','address','city','province','postal_code','plan_id'];
const fail=(message,status=400)=>Object.assign(new Error(message),{status});

export default async function(req){
  try{
    const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44);
    if(!user)return Response.json({error:'No autenticado'},{status:401});
    const PUBLIC_APP_ORIGIN=billingReturnOrigin(Deno.env.get('BASE44_APP_ID')||req.headers.get('Base44-App-Id'),Deno.env.get('BILLING_APP_ORIGIN'));
    const body=await req.json(),bid=String(body.business_id||'').trim();
    if(!bid)return Response.json({error:'Selecciona un negocio'},{status:400});
    const admin=isSuperAdmin(user),commercial=!admin&&await isCommercial(base44,user);
    if(!admin&&!commercial)return Response.json({error:'Solo Super Admin o el comercial asignado pueden generar el enlace de pago'},{status:403});

    const result=await withBusinessMutation(base44,bid,async()=>{
      const business=await base44.asServiceRole.entities.Business.get(bid);
      if(!business||business.demo_key)throw fail('El negocio no es facturable',409);
      const leads=await base44.asServiceRole.entities.SalesLead.filter({converted_business_id:bid}),lead=leads[0];
      if(commercial&&(!lead||email(lead.assigned_to)!==email(user.email)))throw fail('El alta no está asignada a tu cuenta comercial',403);

      const missing=requiredBusinessFields.filter(key=>!String(business[key]||'').trim());
      if(commercial&&!lead)missing.push('solicitud_comercial');
      if(missing.length)throw fail(`Completa y valida el alta antes de generar el pago: ${missing.join(', ')}`,409);

      const current=await base44.asServiceRole.entities.Subscription.filter({business_id:bid});
      if(current.some(s=>s.billing_exempt===true))throw fail('Este negocio tiene una exención de cortesía y no admite cobros Stripe',409);
      const live=current.find(s=>['trialing','active','past_due','unpaid','cancel_at_period_end'].includes(s.status));
      if(live)throw fail('El negocio ya tiene una suscripción en curso',409);
      const pending=current.find(s=>s.status==='pending');
      if(pending?.checkout_url&&Date.parse(pending.checkout_expires_at)>Date.now()+60_000)return {url:pending.checkout_url,session_id:pending.checkout_session_id,reused:true};

      const planRecord=await base44.asServiceRole.entities.Plan.get(business.plan_id);
      const planId=Number(planRecord?.monthly_price)>=BILLING_PLANS.premium.monthly_amount?'premium':'standard',plan=BILLING_PLANS[planId];
      const setupPriceId=Deno.env.get('STRIPE_SETUP_PRICE_ID'),monthlyPriceId=Deno.env.get(planId==='premium'?'STRIPE_PREMIUM_PRICE_ID':'STRIPE_MONTHLY_PRICE_ID');
      if(!setupPriceId||!monthlyPriceId)throw new Error('Precios de Stripe no configurados');
      const definition=checkoutDefinition({business,customerEmail:business.contact_email,successUrl:`${PUBLIC_APP_ORIGIN}/?payment=success`,cancelUrl:`${PUBLIC_APP_ORIGIN}/?payment=cancelled`,setupPriceId,monthlyPriceId,planId,metadata:{sales_lead_id:lead?.id||'',commercial_email:lead?.assigned_to||''}});
      const generation=Math.floor(Date.now()/(23*60*60*1000));
      const session=await createStripeCheckout(definition,`rinno-checkout-${bid}-${generation}`);
      const checkoutExpiresAt=new Date(Number(session.expires_at||definition.expires_at)*1000).toISOString();
      const patch={provider:'stripe',plan_id:plan.id,status:'pending',checkout_session_id:session.id,checkout_url:session.url,checkout_expires_at:checkoutExpiresAt,setup_amount:39900,monthly_amount:plan.monthly_amount,currency:'EUR',first_month_included:true,vat_included:true,sales_lead_id:lead?.id||null,attributed_commercial_email:lead?.assigned_to||null};
      if(pending)await base44.asServiceRole.entities.Subscription.update(pending.id,patch);else await base44.asServiceRole.entities.Subscription.create({business_id:bid,...patch});
      await createAuditLog(base44,user,'billing.checkout_link_generated',{business_id:bid,entity_type:'Business',entity_id:bid,metadata:{checkout_session_id:session.id,plan_id:planId,lead_id:lead?.id||null,generated_by:admin?'super_admin':'commercial'}});
      return {url:session.url,session_id:session.id,reused:false};
    });
    return Response.json(result);
  }catch(e){return Response.json({error:e.message||'No se pudo generar el enlace de pago'},{status:e.status||500})}
}
