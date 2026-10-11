import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyStripeEvent, createStripeSubscriptionFromCheckout, retrieveStripeSubscription, retrieveStripeInvoice } from '../../shared/stripe-billing.ts';
import { processBillingEvent } from '../../shared/billing.js';
export default async function(req){
  if(req.method!=='POST')return Response.json({error:'Método no permitido'},{status:405});
  let event;
  try{
    event=await verifyStripeEvent(await req.text(),req.headers.get('stripe-signature'));
  }catch{return Response.json({error:'Webhook rechazado'},{status:400})}
  try{
    if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
      const object=event.data.object;
      if(object?.mode==='payment'&&object?.payment_status==='paid')object.subscription=(await createStripeSubscriptionFromCheckout(object,event.id)).id;
    }
    if(event.type.startsWith('customer.subscription.'))event.data.object=await retrieveStripeSubscription(event.data.object.id);
    if(['invoice.paid','invoice.payment_failed'].includes(event.type)){event.data.object=await retrieveStripeInvoice(event.data.object.id);if(event.data.object.status==='paid')event.type='invoice.paid';}
    const base44=createClientFromRequest(req);
    return Response.json(await processBillingEvent(base44,event));
  }catch{
    // Do not expose provider errors or secret configuration through this public endpoint.
    console.error('RINNO billing webhook processing failed');
    return Response.json({error:'No se pudo procesar el evento'},{status:500});
  }
}
