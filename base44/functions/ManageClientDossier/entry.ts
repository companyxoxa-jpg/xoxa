import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isSuperAdmin, createAuditLog } from '../../shared/rinno.ts';

const mail=v=>String(v||'').trim().toLowerCase();
const clean=v=>String(v||'').trim();
const same=(a,b)=>clean(a)&&clean(a).toUpperCase()===clean(b).toUpperCase();
const safeBusiness=b=>({id:b.id,business_name:b.business_name,legal_name:b.legal_name,tax_id:b.tax_id,contact_email:b.contact_email,contact_phone:b.contact_phone,address:b.address,city:b.city,province:b.province,postal_code:b.postal_code,country:b.country,status:b.status,subscription_status:b.subscription_status,launch_review_status:b.launch_review_status,slug:b.slug,business_type:b.business_type,business_mode:b.business_mode,created_date:b.created_date,published_at:b.published_at,archived_at:b.archived_at});
const safeContract=c=>({id:c.id,contract_number:c.contract_number,status:c.status,client_name:c.client_name,trade_name:c.trade_name,tax_id:c.tax_id,representative_name:c.representative_name,contact_email:c.contact_email,contact_phone:c.contact_phone,commercial_email:c.commercial_email,created_date:c.created_date,signed_at:c.signed_at});
const safeDocument=d=>({id:d.id,document_number:d.document_number,document_type:d.document_type,status:d.status,signed_at:d.signed_at,effective_date:d.effective_date,annulled_at:d.annulled_at});
const safeSubscription=s=>({id:s.id,status:s.status,plan_id:s.plan_id,start_date:s.start_date,renewal_date:s.renewal_date,trial_end:s.trial_end,billing_cycle_anchor:s.billing_cycle_anchor,cancel_at:s.cancel_at,cancel_at_period_end:s.cancel_at_period_end,ended_at:s.ended_at,last_payment_status:s.last_payment_status,last_payment_at:s.last_payment_at,payment_retry_count:s.payment_retry_count,setup_amount:s.setup_amount,monthly_amount:s.monthly_amount,currency:s.currency,first_month_included:s.first_month_included,vat_included:s.vat_included,billing_exempt:s.billing_exempt===true,exemption_reason:s.billing_exempt===true?s.exemption_reason||null:null,exempted_at:s.billing_exempt===true?s.exempted_at||null:null,attributed_commercial_email:s.attributed_commercial_email,checkout_url:s.checkout_url,checkout_expires_at:s.checkout_expires_at});
const safePayment=p=>({id:p.id,kind:p.kind,amount:p.amount,currency:p.currency,status:p.status,attempt_count:p.attempt_count,paid_at:p.paid_at,failure_code:p.failure_code,failure_message:p.failure_message,created_date:p.created_date});
const safeInvoice=i=>({id:i.id,number:i.number,status:i.status,amount_due:i.amount_due,amount_paid:i.amount_paid,currency:i.currency,hosted_invoice_url:i.hosted_invoice_url,invoice_pdf:i.invoice_pdf,issued_at:i.issued_at,paid_at:i.paid_at});
const safeLead=l=>({id:l.id,name:l.name,business_name:l.business_name,email:l.email,phone:l.phone,status:l.status,assigned_to:l.assigned_to,source:l.source,converted_at:l.converted_at,delivery_status:l.delivery_status});

export default async function(req){
  try{
    const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44);
    if(!user)return Response.json({error:'No autenticado'},{status:401});
    if(!isSuperAdmin(user))return Response.json({error:'Solo Super Admin puede consultar expedientes de clientes'},{status:403});
    const body=await req.json(),e=base44.asServiceRole.entities;
    const [businesses,contracts,documents,subscriptions,payments,invoices,leads,plans,commercials,audit]=await Promise.all([
      e.Business.list('-created_date',1000),e.ClientContract.list('-created_date',1000),e.ClientDocument.list('-created_date',2000),e.Subscription.list('-created_date',1000),e.BillingPayment.list('-created_date',2000),e.BillingInvoice.list('-issued_at',2000),e.SalesLead.list('-created_date',1000),e.Plan.list('-created_date',100),e.CommercialAccess.list('-invited_at',500),e.AuditLog.list('-created_date',100)
    ]);
    const real=businesses.filter(b=>!b.demo_key);
    const build=b=>{
      const linkedContracts=contracts.filter(c=>same(c.tax_id,b.tax_id)||mail(c.contact_email)===mail(b.contact_email));
      const contractIds=new Set(linkedContracts.map(c=>c.id));
      const linkedDocs=documents.filter(d=>d.business_id===b.id||contractIds.has(d.contract_id));
      const linkedSubs=subscriptions.filter(s=>s.business_id===b.id);
      const linkedPayments=payments.filter(p=>p.business_id===b.id);
      const linkedInvoices=invoices.filter(i=>i.business_id===b.id);
      const linkedLeads=leads.filter(l=>l.converted_business_id===b.id||mail(l.email)===mail(b.contact_email));
      const current=linkedSubs[0]||null,plan=current?plans.find(p=>p.id===current.plan_id):null;
      const hasDoc=type=>linkedDocs.some(d=>d.document_type===type&&['signed','cancellation_requested','cancellation_effective'].includes(d.status));
      const activationSteps=[
        {id:'business',label:'Alta del negocio',complete:true},
        {id:'contract',label:'Contrato firmado',complete:linkedContracts.some(c=>['signed','active'].includes(c.status))},
        {id:'checkout',label:current?.billing_exempt?'Exención de cortesía registrada':'Enlace de pago generado',complete:current?.billing_exempt===true||!!current?.checkout_url||['trial','trialing','active','past_due','cancel_at_period_end'].includes(current?.status)},
        {id:'setup_paid',label:current?.billing_exempt?'Alta de cortesía a 0 €':'Alta de 399 € confirmada',complete:current?.billing_exempt===true||linkedPayments.some(p=>p.kind==='setup'&&p.status==='succeeded')},
        {id:'sepa',label:'Mandato SEPA firmado',complete:hasDoc('sepa')},
        {id:'rgpd',label:'Acuerdo RGPD firmado',complete:hasDoc('rgpd')},
        {id:'delivery',label:'Acta de entrega firmada',complete:hasDoc('delivery')},
        {id:'published',label:'Negocio publicado',complete:b.launch_review_status==='published'||!!b.published_at}
      ];
      const completed=activationSteps.filter(x=>x.complete).length;
      return {business:safeBusiness(b),contract:linkedContracts[0]?safeContract(linkedContracts[0]):null,contracts:linkedContracts.map(safeContract),documents:linkedDocs.map(safeDocument),subscription:current?safeSubscription(current):null,plan:plan?{id:plan.id,name:plan.name}:null,payments:linkedPayments.map(safePayment),invoices:linkedInvoices.map(safeInvoice),lead:linkedLeads[0]?safeLead(linkedLeads[0]):null,activation:{steps:activationSteps,completed,total:activationSteps.length,percent:Math.round(completed/activationSteps.length*100),ready:completed===activationSteps.length,blockers:activationSteps.filter(x=>!x.complete).map(x=>x.label)},summary:{documents:linkedDocs.length,successful_payments:linkedPayments.filter(p=>p.status==='succeeded').length,failed_payments:linkedPayments.filter(p=>p.status==='failed').length,collected_cents:linkedPayments.filter(p=>p.status==='succeeded').reduce((n,p)=>n+Number(p.amount||0),0),has_signed_contract:linkedContracts.some(c=>['signed','active'].includes(c.status)),billing_status:current?.status||b.subscription_status||'none',commercial_email:current?.attributed_commercial_email||linkedLeads[0]?.assigned_to||linkedContracts[0]?.commercial_email||null}};
    };
    if(body.action==='metrics'){
      const now=new Date(),dayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(),monthStart=new Date(now.getFullYear(),now.getMonth(),1).getTime();
      const since=(row,start,field='created_date')=>Date.parse(row[field]||0)>=start;
      const successful=payments.filter(p=>p.status==='succeeded');
      return Response.json({metrics:{
        generated_at:now.toISOString(),businesses:{total:real.filter(b=>!b.archived_at).length,active:real.filter(b=>!b.archived_at&&b.status==='active').length,onboarding:real.filter(b=>!b.archived_at&&['onboarding','trial'].includes(b.status)).length,suspended:real.filter(b=>!b.archived_at&&b.status==='suspended').length,archived:real.filter(b=>!!b.archived_at).length,created_today:real.filter(b=>since(b,dayStart)).length,created_month:real.filter(b=>since(b,monthStart)).length},
        contracts:{total:contracts.length,signed:contracts.filter(c=>['signed','active'].includes(c.status)).length,drafts:contracts.filter(c=>['draft','pending_signature'].includes(c.status)).length,signed_today:contracts.filter(c=>['signed','active'].includes(c.status)&&since(c,dayStart,'signed_at')).length,signed_month:contracts.filter(c=>['signed','active'].includes(c.status)&&since(c,monthStart,'signed_at')).length},
        sales:{requests:leads.length,new:leads.filter(l=>l.status==='new').length,interested:leads.filter(l=>l.status==='interested').length,closed:leads.filter(l=>l.status==='closed').length,commercials_active:commercials.filter(c=>c.status==='active').length},
        billing:{collected_today:successful.filter(p=>since(p,dayStart,'paid_at')).reduce((n,p)=>n+Number(p.amount||0),0),collected_month:successful.filter(p=>since(p,monthStart,'paid_at')).reduce((n,p)=>n+Number(p.amount||0),0),failed:payments.filter(p=>p.status==='failed').length,past_due:subscriptions.filter(s=>['past_due','unpaid'].includes(s.status)).length,cancellations:documents.filter(d=>d.document_type==='cancellation'&&['signed','cancellation_requested','cancellation_effective'].includes(d.status)).length},
        documents:{total:documents.length,signed:documents.filter(d=>d.status==='signed').length,pending:documents.filter(d=>['draft','pending_signature'].includes(d.status)).length},
        recent_activity:audit.slice(0,12).map(x=>({id:x.id,action:x.action,actor_role:x.actor_role,entity_type:x.entity_type,created_date:x.created_date}))
      }});
    }
    if(body.action==='list')return Response.json({dossiers:real.filter(b=>!b.archived_at).map(build)});
    if(body.action==='get'){
      const business=real.find(b=>b.id===body.business_id);if(!business)return Response.json({error:'Cliente no encontrado'},{status:404});
      await createAuditLog(base44,user,'client_dossier.viewed',{business_id:business.id,entity_type:'Business',entity_id:business.id});
      return Response.json({dossier:build(business)});
    }
    return Response.json({error:'Acción no válida'},{status:400});
  }catch(error){return Response.json({error:error?.message||'No se pudo cargar el expediente'},{status:Number(error?.status)||500})}
}
