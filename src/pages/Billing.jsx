import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BadgeEuro, CalendarClock, CheckCircle2, CreditCard, Download, Loader2, ShieldCheck, XCircle } from 'lucide-react';

const money=cents=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format((cents||0)/100);
const date=value=>value?new Date(value).toLocaleDateString('es-ES'):'—';
const upcomingDate=value=>{
  if(!value)return 'Pendiente de sincronización con Stripe';
  const parsed=new Date(value);
  if(Number.isNaN(parsed.getTime())||parsed.getTime()<Date.now())return 'Pendiente de actualización con Stripe';
  return date(parsed);
};

export default function Billing(){
  const[data,setData]=useState(null),[error,setError]=useState('');
  useEffect(()=>{base44.functions.invoke('ManageBilling',{action:'summary'}).then(r=>setData(r.data)).catch(e=>setError(e.response?.data?.error||'No se pudo cargar la facturación'))},[]);
  if(!data&&!error)return <div className="min-h-64 grid place-items-center"><Loader2 className="animate-spin"/></div>;
  const s=data?.subscription;
  const courtesy=s?.billing_exempt===true;
  return <div className="max-w-5xl mx-auto space-y-6">
    <header><p className="text-xs uppercase tracking-[.2em] text-primary font-bold">RINNO · Facturación</p><h1 className="text-3xl md:text-5xl font-heading font-bold mt-2">Suscripción y cobros</h1><p className="text-muted-foreground mt-3">Consulta el estado y las facturas de tu negocio.</p></header>
    {error&&<p className="rounded-xl bg-destructive/10 text-destructive p-4 text-sm">{error}</p>}
    <section className="grid md:grid-cols-3 gap-4"><Card Icon={BadgeEuro} label="Alta" value={courtesy?"0 €":"399 €"} detail={courtesy?"Cortesía activa":"Pago único · IVA incluido"}/><Card Icon={CreditCard} label="Renovación" value={courtesy?"0 €/mes":"24,95 €/mes"} detail={courtesy?"Sin cargos recurrentes":"Mes completo incluido · después prorrateo"}/><Card Icon={CalendarClock} label="Permanencia" value={courtesy?"Exenta":"Sin permanencia"} detail="Gestionada por administración"/></section>
    {!s||s.status==='pending'?<section className="rounded-3xl border bg-card p-6 md:p-9"><ShieldCheck className="w-9 h-9 text-primary"/><h2 className="text-2xl font-bold mt-5">Alta gestionada por RINNO</h2><p className="text-muted-foreground mt-2 max-w-2xl">La contratación y el enlace de pago los prepara exclusivamente el equipo autorizado de RINNO después de revisar los datos del alta. Aquí no se puede contratar ni activar ningún cobro.</p></section>:<>
      <section className="rounded-3xl border bg-card p-6 md:p-8"><p className="text-xs uppercase tracking-wider text-muted-foreground">Estado</p><h2 className="text-2xl font-bold capitalize mt-1">{courtesy?"Cortesía activa":String(s.status).replaceAll('_',' ')}</h2><p className="text-sm text-muted-foreground mt-2">{courtesy?"Este negocio no genera cargos de alta ni cuotas mensuales.":`Próxima fecha: ${upcomingDate(s.cancel_at||s.renewal_date)}`}</p><p className="mt-4 text-sm text-muted-foreground">Cualquier cambio de la suscripción se solicita al equipo de administración de RINNO.</p></section>
      <section className="rounded-3xl border bg-card overflow-hidden"><div className="p-6 border-b"><h2 className="text-xl font-bold">Facturas</h2></div>{data.invoices?.length?<div className="divide-y">{data.invoices.map(inv=><article key={inv.id} className="p-5 flex items-center gap-4"><div className={`rounded-full p-2 ${inv.status==='paid'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{inv.status==='paid'?<CheckCircle2/>:<XCircle/>}</div><div className="flex-1"><strong>{inv.number||'Factura'}</strong><p className="text-sm text-muted-foreground">{date(inv.issued_at)} · {money(inv.amount_due)}</p></div>{inv.invoice_pdf&&<a href={inv.invoice_pdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold"><Download className="w-4 h-4"/>PDF</a>}</article>)}</div>:<p className="p-8 text-center text-muted-foreground">Las facturas aparecerán aquí después del primer cobro.</p>}</section>
    </>}
  </div>;
}
function Card({Icon,label,value,detail}){return <article className="rounded-2xl border bg-card p-5"><Icon className="w-5 h-5 text-primary"/><p className="text-xs text-muted-foreground mt-4">{label}</p><strong className="text-xl block mt-1">{value}</strong><span className="text-xs text-muted-foreground">{detail}</span></article>}
