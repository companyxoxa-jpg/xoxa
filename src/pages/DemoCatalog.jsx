import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { isSuperAdmin } from '@/lib/rinno';
import { TEMPLATES } from '../../base44/shared/templates.js';

const capability = mode => mode === 'ASSOCIATION' ? 'SOCIOS Y ACTIVIDADES' : mode === 'HYBRID' ? 'PEDIDOS Y RESERVAS' : mode === 'COMMERCE' ? 'PEDIDOS' : 'RESERVAS';

export default function DemoCatalog() {
  const { user } = useAuth();
  const [busy,setBusy]=useState(''),[message,setMessage]=useState('');
  async function install(t){setBusy(t.id);setMessage('');try{const r=await base44.functions.invoke('InstallDemo',{template_id:t.id});setMessage(`Demo preparada: /store/${r.data.slug}`)}catch(e){setMessage(e.response?.data?.error||'No se pudo instalar la demo')}finally{setBusy('')}}
  return <main className="min-h-screen bg-[#faf8f4] text-[#252c28] px-5 py-12"><div className="max-w-6xl mx-auto">
    <p className="template-eyebrow">RINNO · Colección de negocios</p><h1 className="text-4xl md:text-6xl font-serif mb-5">Cada negocio, su propia identidad.</h1><p className="max-w-2xl mb-10 text-lg text-stone-600">Seis modelos completos, cada uno con experiencia pública y panel de gestión propios.</p>
    {message&&<p role="status" className="border rounded-xl p-4 mb-6">{message}</p>}
    <div className="demo-grid">{TEMPLATES.map(t=><article className="demo-card" key={t.id}><img src={t.image} alt={t.name} loading="lazy"/><div><p className="text-xs tracking-widest mb-3">DEMO {t.demo} · {capability(t.mode)}</p><h2 className="text-2xl font-serif">{t.name}</h2><p className="text-sm text-stone-600 my-4">{t.subtitle}</p><Link className="underline" to={`/store/rinno-demo-${t.demo}`}>Abrir demo ↗</Link>{isSuperAdmin(user)&&<button disabled={!!busy} className="block w-full border rounded-lg p-3 mt-4 text-sm" onClick={()=>install(t)}>{busy===t.id?'Preparando…':'Preparar demo en RINNO'}</button>}</div></article>)}</div>
    <p className="text-sm text-stone-500 mt-8">Cada demo usa el mismo núcleo seguro de RINNO con una composición visual y operativa propia.</p>
  </div></main>;
}
