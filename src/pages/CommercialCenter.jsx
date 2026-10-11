import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, ExternalLink, Palette, Presentation, ShieldCheck, Play, ContactRound, FilePlus2, Files } from 'lucide-react';
import SalesLeadsPanel from '@/components/admin/SalesLeadsPanel';
import ContractCenter from '@/components/admin/ContractCenter';

export default function CommercialCenter() {
  const [demos,setDemos]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [section,setSection]=useState('leads');
  useEffect(()=>{base44.functions.invoke('CommercialDemos',{action:'list'}).then(r=>setDemos(r.data.demos||[])).catch(()=>setError('No se pudieron cargar las demos.')).finally(()=>setLoading(false))},[]);
  if(loading)return <div className="min-h-screen bg-[hsl(var(--rinno-nav))] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white"/></div>;
  return <main className="min-h-screen bg-[hsl(var(--rinno-nav))] text-white p-5 md:p-10"><div className="max-w-6xl mx-auto space-y-7">
    <header><p className="text-xs uppercase tracking-[.22em] text-primary mb-2">RINNO · Área comercial</p><h1 className="text-3xl md:text-5xl font-heading font-bold">Venta y demostración</h1><p className="text-muted-foreground mt-3 max-w-2xl">Presenta RINNO y completa únicamente tus oportunidades asignadas. Cuando todos los datos estén validados podrás entregar el enlace de pago en el acto, sin acceso a métricas, ingresos ni datos internos de otros negocios.</p></header>
    <div className="grid sm:grid-cols-3 gap-3"><Info icon={Presentation} text="Enseñar modelos"/><Info icon={Palette} text="Preparar el alta"/><Info icon={ShieldCheck} text="Pago seguro en Stripe"/></div>
    <div className="flex gap-2 overflow-x-auto pb-1"><button onClick={()=>setSection('leads')} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${section==='leads'?'bg-primary text-primary-foreground':'bg-white/5 text-white/60'}`}><ContactRound className="mr-2 inline h-4 w-4"/>Mis solicitudes</button><button onClick={()=>setSection('contract-form')} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${section==='contract-form'?'bg-primary text-primary-foreground':'bg-white/5 text-white/60'}`}><FilePlus2 className="mr-2 inline h-4 w-4"/>Formulario de alta</button><button onClick={()=>setSection('contracts')} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${section==='contracts'?'bg-primary text-primary-foreground':'bg-white/5 text-white/60'}`}><Files className="mr-2 inline h-4 w-4"/>Contratos</button><button onClick={()=>setSection('demos')} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${section==='demos'?'bg-primary text-primary-foreground':'bg-white/5 text-white/60'}`}><Presentation className="mr-2 inline h-4 w-4"/>Demos</button></div>
    {section==='leads'&&<SalesLeadsPanel/>}
    {section==='contract-form'&&<ContractCenter initialView="form"/>}
    {section==='contracts'&&<ContractCenter/>}
    {section==='demos'&&<>
    {error&&<p className="text-rose-300">{error}</p>}
    <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{demos.map(d=><article key={d.id} className="bg-white/5 border border-white/10 rounded-2xl p-5"><p className="text-xs text-primary uppercase tracking-wider">{d.business_mode}</p><h2 className="text-xl font-semibold mt-2">{d.business_name}</h2><p className="text-sm text-muted-foreground mt-1">{d.slug}</p><div className="flex flex-wrap gap-2 mt-5"><a href={`/store/${d.slug}`} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg border border-white/10 text-sm flex items-center gap-2"><ExternalLink className="w-4 h-4"/>Ver demo</a><Link to={`/command-center/demos/${d.id}`} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2"><Palette className="w-4 h-4"/>Editar demo</Link>{d.business_mode==='ASSOCIATION'&&<Link to="/command-center/showcase/association" className="w-full px-3 py-2 rounded-lg bg-emerald-300 text-emerald-950 text-sm font-semibold flex justify-center items-center gap-2"><Play className="w-4 h-4"/>Presentar tres perfiles</Link>}</div></article>)}</section>
    </>}
  </div></main>;
}
function Info({icon:Icon,text}){return <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3"><Icon className="w-5 h-5 text-primary"/><span className="text-sm">{text}</span></div>}
