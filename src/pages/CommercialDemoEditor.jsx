import { useEffect,useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import TemplateAppearancePanel from '@/components/admin/TemplateAppearancePanel';
import { ArrowLeft,ExternalLink,Loader2 } from 'lucide-react';

export default function CommercialDemoEditor(){const{id}=useParams();const[business,setBusiness]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=()=>base44.functions.invoke('CommercialDemos',{action:'get',business_id:id}).then(r=>setBusiness(r.data.business)).catch(()=>setError('Demo no encontrada o acceso denegado.')).finally(()=>setLoading(false));
  useEffect(()=>{load()},[id]);
  if(loading)return <div className="min-h-screen bg-[hsl(var(--rinno-nav))] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white"/></div>;
  if(!business)return <div className="min-h-screen bg-[hsl(var(--rinno-nav))] text-white p-10">{error}<br/><Link to="/command-center">Volver</Link></div>;
  return <main className="min-h-screen bg-[hsl(var(--rinno-nav))] text-white p-4 md:p-8"><div className="max-w-5xl mx-auto space-y-5"><header className="flex items-center gap-3"><Link to="/command-center" className="p-2 rounded-lg border border-white/10"><ArrowLeft className="w-4 h-4"/></Link><div className="flex-1"><p className="text-xs text-primary uppercase tracking-wider">Edición de demo</p><h1 className="text-2xl font-bold">{business.business_name}</h1></div><a href={`/store/${business.slug}`} target="_blank" rel="noreferrer" className="text-sm flex gap-2 items-center"><ExternalLink className="w-4 h-4"/>Abrir</a></header><TemplateAppearancePanel key={business.id+JSON.stringify(business.appearance_config)} business={business} onSaved={load}/></div></main>}
