import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarDays, MapPin, ArrowRight, ShieldCheck, CreditCard, QrCode, Bell, Scale, Clock3, Leaf, ScanLine, Sparkles } from 'lucide-react';
import { resolveBranding, templateFor } from '@/lib/templates';

const fmt = value => new Intl.DateTimeFormat('es', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' }).format(new Date(value));
const features = [
  {Icon:QrCode,no:'01',title:'Carné digital seguro',text:'Identificación QR revocable, membresía y estado de cuota siempre disponibles.'},
  {Icon:Leaf,no:'02',title:'Catálogo de variedades',text:'Flores, extractos, perfiles y disponibilidad en un espacio exclusivo para socios.'},
  {Icon:Scale,no:'03',title:'Consumo responsable',text:'Historial de dispensaciones y límites personales para una gestión interna rigurosa.'},
  {Icon:Clock3,no:'04',title:'Visitas sin esperas',text:'Reserva de acceso a la sede con aforo y horarios organizados.'},
  {Icon:Bell,no:'05',title:'La vida del club',text:'Actividades, asambleas, novedades y avisos en un único canal privado.'},
  {Icon:CreditCard,no:'06',title:'Cuotas transparentes',text:'Estado de membresía y aportaciones internas con trazabilidad para cada socio.'},
];

function CannabisIntro({ name, done, reduce }) {
  return <motion.div className="csc-intro" initial={{opacity:1}} animate={done ? {opacity:0,visibility:'hidden'} : {opacity:1}} transition={{duration:reduce?.15:.65}} aria-hidden={done}>
    <div className="csc-intro-grain"/>
    <motion.div className="csc-intro-leaf" initial={{scale:.45,rotate:-18,opacity:0}} animate={{scale:1,rotate:0,opacity:1}} transition={{duration:reduce?.05:1.15,ease:[.16,1,.3,1]}}><Leaf/></motion.div>
    <motion.p initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:reduce?0:.35,duration:.7}}>{name}</motion.p>
    <div className="csc-intro-line"><motion.span initial={{scaleX:0}} animate={{scaleX:1}} transition={{duration:reduce?.1:1.6,ease:'easeInOut'}}/></div>
    <small>PRIVATE MEMBERS CLUB</small>
  </motion.div>;
}

export default function AssociationStorefront({ data, slug }) {
  const { business, activities = [] } = data;
  const branding = resolveBranding(business); const template = templateFor(business);
  const accent = branding.storefront.tokens.accent || branding.shared.secondaryColor || '#caa76b';
  const legacyCover = business.cover_image?.includes('csc-club-hero.png');
  const hero = legacyCover ? template.image : (business.cover_image || template.image);
  const reduce = useReducedMotion();
  const [introDone,setIntroDone] = useState(false);
  useEffect(()=>{ const seen=sessionStorage.getItem(`csc-intro:${slug}`); if(seen){setIntroDone(true);return;} const id=setTimeout(()=>{setIntroDone(true);sessionStorage.setItem(`csc-intro:${slug}`,'1')},reduce?150:2200); return()=>clearTimeout(id)},[slug,reduce]);
  const reveal = reduce ? {} : { initial:{opacity:0,y:28}, whileInView:{opacity:1,y:0}, viewport:{once:true,amount:.2}, transition:{duration:.7,ease:[.16,1,.3,1]} };

  return <div className="csc-site" style={{'--csc-accent':accent}}>
    <CannabisIntro name={business.business_name} done={introDone} reduce={reduce}/>
    <header className="csc-header">
      <div className="csc-brand">
        {business.logo ? <img src={business.logo} alt={business.business_name}/> : <div className="csc-monogram"><Leaf/><span>{business.business_name?.[0]}</span></div>}
        {branding.storefront.logoPlacement !== 'hero' && <strong>{business.business_name}</strong>}
      </div>
      <nav><a href="#experiencia">Experiencia</a><a href="#club">El club</a><a href="#actividades">Agenda</a><Link className="csc-login" to={`/store/${slug}/login`}><ScanLine/> Acceso privado</Link></nav>
      <Link className="csc-login csc-mobile-login" to={`/store/${slug}/login`}>Socios</Link>
    </header>

    <section className="csc-hero">
      <motion.img initial={reduce?{}:{scale:1.08}} animate={{scale:1}} transition={{duration:2.1,ease:[.16,1,.3,1]}} src={hero} alt="Flor de cannabis en un club social privado"/>
      <div className="csc-hero-shade"/><div className="csc-orbit csc-orbit-one"/><div className="csc-orbit csc-orbit-two"/>
      <div className="csc-hero-content">
        <motion.div initial={reduce?{}:{opacity:0,y:26}} animate={{opacity:1,y:0}} transition={{delay:.25,duration:.9}}>
          <p className="csc-kicker"><span/> Cannabis Social Club · Solo socios</p>
          <h1>{business.headline || 'El club que tus socios quieren llevar en el bolsillo.'}</h1>
          <p className="csc-lead">{business.tagline || 'Credencial, variedades, límites, reservas y comunidad en una experiencia privada creada alrededor de la cultura del cannabis.'}</p>
          <div className="csc-hero-actions"><Link to={`/store/${slug}/login`} className="csc-primary">Entrar en mi club <ArrowRight/></Link><a href="#experiencia" className="csc-secondary">Descubrir la experiencia</a></div>
        </motion.div>
        <motion.div className="csc-specimen" initial={reduce?{}:{opacity:0,x:40}} animate={{opacity:1,x:0}} transition={{delay:.55,duration:.9}}>
          <span><Sparkles/> Selección del club</span><strong>Genética, perfil y trazabilidad</strong><small>Información privada para miembros autorizados</small>
        </motion.div>
      </div>
      <a className="csc-scroll" href="#experiencia"><span>Explorar</span><i/></a>
    </section>

    <main>
      <section id="experiencia" className="csc-manifesto">
        <motion.div {...reveal}><p className="csc-label">Diseñada para la cultura del club</p><h2>Cannabis, comunidad y control.<br/><em>Todo conectado.</em></h2></motion.div>
        <motion.div className="csc-manifesto-copy" {...reveal}><p>{data.settings?.store_description || 'Una experiencia digital con carácter propio para que cada socio consulte el catálogo, organice su visita y lleve su credencial siempre consigo.'}</p><div><span>100%</span><small>privada para socios</small></div></motion.div>
      </section>

      <section id="club" className="csc-features">
        <div className="csc-section-head"><p className="csc-label">El club en una sola app</p><h2>Todo lo que importa,<br/>sin perder la esencia.</h2></div>
        <div className="csc-feature-grid">{features.map(({Icon,no,title,text},index)=><motion.article key={title} {...reveal} transition={{duration:.65,delay:(index%3)*.08}}><div><span>{no}</span><Icon/></div><h3>{title}</h3><p>{text}</p><i/></motion.article>)}</div>
      </section>

      <section className="csc-membership"><div className="csc-membership-image"><img src="/images/csc-aurora-verde.webp" alt="Detalle macro de una variedad de cannabis" loading="lazy"/><span>TRICHOME<br/>DETAIL</span></div><motion.div className="csc-membership-copy" {...reveal}><p className="csc-label">Experiencia de socio</p><h2>Una credencial que abre todo el universo del club.</h2><p>El socio se identifica desde su móvil y accede a su membresía, catálogo, límites responsables, visitas y actividades desde un entorno coherente y seguro.</p><Link to={`/store/${slug}/login`} className="csc-primary">Ver mi área privada <ArrowRight/></Link></motion.div></section>

      <section id="actividades" className="csc-agenda"><div className="csc-section-head"><p className="csc-label">La comunidad también sucede aquí</p><h2>Próximas actividades</h2></div>
        {activities.length ? <div className="csc-activity-grid">{activities.map((a,index)=><motion.article key={a.id} {...reveal}><span className="csc-activity-number">0{index+1}</span><CalendarDays/><p>{fmt(a.start_at)}</p><h3>{a.title}</h3><div className="csc-activity-description">{a.description}</div>{a.location&&<small><MapPin/>{a.location}</small>}<strong>{a.enrollment_open?'Inscripción abierta':'Información disponible'}</strong></motion.article>)}</div> : <div className="csc-empty">La próxima programación del club aparecerá aquí.</div>}
      </section>
    </main>

    <footer className="csc-footer"><div><Leaf/><strong>{business.business_name}</strong><p>{business.city}</p></div><div><p><ShieldCheck/> Acceso privado y datos separados por asociación</p><small>Herramienta de gestión para entidades privadas. Cada club debe adaptar su operativa a sus estatutos y al asesoramiento jurídico aplicable.</small></div></footer>
  </div>;
}


