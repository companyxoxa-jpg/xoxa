import { resolveBranding } from '@/lib/templates';

// Isolated appearance preview. Reads ONLY from the draft (never writes).
// Renders a lightweight stylized mockup of the selected face (storefront or
// dashboard) at the selected device size, reflecting the resolved branding
// (colors, logo placement/size, density, hero/navigation variant, typography).
// This is a visual mock — it does not render the live storefront/dashboard.
function LogoMark({ src, name, size }) {
  const px = { sm: 28, md: 40, lg: 56 }[size] || 40;
  if (src) return <img src={src} alt={name} className="rounded-lg object-contain" style={{ width: px, height: px }} />;
  return (
    <div className="rounded-lg flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: px, height: px, background: 'rgba(255,255,255,0.18)' }}>
      {(name || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function AppearancePreview({ business, face, device }) {
  const b = resolveBranding(business);
  const primary = b.shared.primaryColor || '#16A34A';
  const secondary = b.shared.secondaryColor || '#0284C7';
  const accent = (b[face].tokens && b[face].tokens.accent) || secondary;
  const overlay = (b[face].tokens && b[face].tokens.heroOverlay) || 0;
  const dense = b[face].density === 'compact' ? 'gap-1.5' : b[face].density === 'spacious' ? 'gap-5' : 'gap-3';
  const isMobile = device === 'mobile';

  const Frame = ({ children }) => (
    <div className={isMobile ? 'mx-auto w-[280px]' : 'w-full'}>
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-[hsl(var(--background))] shadow-2xl">
        {children}
      </div>
    </div>
  );

  if (face === 'storefront') {
    if (b.storefront.skin === 'association') {
      const hero = business.cover_image || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80';
      return <Frame><div className="relative h-48 bg-cover bg-center" style={{backgroundImage:`linear-gradient(to top,rgba(16,47,53,.95),rgba(16,47,53,.15)),url('${hero}')`}}><div className="absolute top-3 left-3"><LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.storefront.logoSize}/></div><div className="absolute inset-x-4 bottom-4 text-white"><p className="text-[8px] uppercase tracking-[.2em]" style={{color:accent}}>Comunidad</p><p className="font-editorial text-2xl leading-tight mt-1">{business.headline || 'Una comunidad que avanza unida.'}</p><p className="text-[9px] text-white/80 mt-1">{business.tagline || 'Socios, actividades y vida asociativa.'}</p></div></div><div className="p-4 grid grid-cols-3 gap-2">{['Socios','Actividades','Comunidad'].map(x=><div key={x} className="bg-muted rounded-xl p-3 text-[9px] font-bold text-center">{x}</div>)}</div></Frame>;
    }
    if (b.storefront.skin === 'butcher') {
      const compact = b.storefront.headerVariant === 'compact';
      const headFont = b.storefront.typography.heading === 'display' ? 'font-display' : 'font-heading';
      return (
        <Frame>
          <div className={`flex items-center gap-2.5 px-4 ${compact ? 'py-2' : 'py-3'}`} style={{ borderBottom: '2px solid rgba(255,255,255,0.12)' }}>
            <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.storefront.logoSize} />
            <div className="min-w-0">
              <p className={`${headFont} font-bold text-foreground truncate leading-none`} style={{ fontSize: 13 }}>{b.shared.businessName || 'Carnicería'}</p>
              <p className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wide">Cortes · Charcutería</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-muted" />
              <div className="w-6 h-6 rounded-full" style={{ background: accent }} />
            </div>
          </div>
          {b.storefront.heroVariant === 'plaque' ? (
            <div className="mx-3 mt-3 rounded-xl border-2 border-border p-3 text-center">
              <p className={`${headFont} font-bold text-foreground text-xs`}>{business.headline || 'Buen origen. Mejor mesa.'}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{business.tagline || 'Cortes seleccionados'}</p>
              <div className="mt-2 inline-block px-2.5 py-1 rounded-md text-white text-[10px] font-semibold" style={{ background: accent }}>Ver el mostrador</div>
            </div>
          ) : (
            <div className="flex mx-3 mt-3 rounded-xl overflow-hidden" style={{ minHeight: 70 }}>
              <div className="w-[55%] p-2.5 flex flex-col justify-center" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                <p className="text-white font-bold text-[11px] leading-tight">{business.headline || 'Buen origen. Mejor mesa.'}</p>
                <p className="text-white/80 text-[9px] mt-1">{business.tagline || 'Cortes seleccionados'}</p>
              </div>
              <div className="flex-1" style={{ background: `linear-gradient(135deg, ${primary}33, ${secondary}33)` }} />
            </div>
          )}
          <div className="flex mt-3">
            <div className="w-[84px] shrink-0 p-2 space-y-1" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
              {['Todas', 'Cortes', 'Aves', 'Charc.'].map((n, i) => (
                <div key={n} className="text-[9px] px-1.5 py-1 rounded" style={i === 0 ? { background: accent, color: '#fff' } : { color: 'hsl(var(--muted-foreground))' }}>{n}</div>
              ))}
            </div>
            <div className="flex-1 p-2 space-y-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-card border border-border p-1.5">
                  <div className="w-7 h-7 rounded shrink-0" style={{ background: `linear-gradient(135deg, ${primary}22, ${secondary}22)` }} />
                  <div className="flex-1 min-w-0"><div className="h-1.5 rounded bg-muted w-2/3 mb-1" /><div className="h-1 rounded bg-muted w-1/3" /></div>
                  <div className="w-5 h-5 rounded-full shrink-0" style={{ background: accent }} />
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 py-2.5 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] text-muted-foreground">Tecnología de <span className="font-semibold" style={{ color: accent }}>RINNO</span></p>
          </div>
        </Frame>
      );
    }
    if (b.storefront.skin === 'barber') {
      const compact = b.storefront.headerVariant === 'compact';
      const headFont = b.storefront.typography.heading === 'editorial' ? 'font-editorial' : 'font-display';
      const ov = (b.storefront.tokens && b.storefront.tokens.heroOverlay) || 35;
      return (
        <Frame>
          <div className={`flex items-center gap-2.5 px-4 ${compact ? 'py-2' : 'py-3'}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.storefront.logoSize} />
            <span className={`${headFont} font-bold text-foreground text-sm truncate`}>{b.shared.businessName || 'Barbería'}</span>
            <div className="ml-auto"><div className="px-2 py-0.5 rounded-full text-white text-[9px] font-semibold" style={{ background: primary }}>Reservar</div></div>
          </div>
          {b.storefront.heroVariant === 'feature' ? (
            <div className="relative" style={{ height: 96, background: `linear-gradient(180deg, rgba(0,0,0,${ov / 100}), rgba(0,0,0,${(ov + 20) / 100})), url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=70') center/cover` }}>
              <div className="absolute bottom-2 left-0 right-0 text-center px-2">
                <p className={`${headFont} font-bold text-white text-[13px] leading-tight`}>{business.headline || 'Tu estilo. Nuestro oficio.'}</p>
                <div className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-white text-[8px] font-semibold" style={{ background: accent }}>Reservar cita</div>
              </div>
            </div>
          ) : (
            <div className="flex" style={{ minHeight: 84 }}>
              <div className="w-[52%] p-2.5 flex flex-col justify-center" style={{ background: primary }}>
                <p className={`${headFont} font-bold text-white text-[12px] leading-tight`}>{business.headline || 'Tu estilo. Nuestro oficio.'}</p>
                <p className="text-white/80 text-[8px] mt-1">{business.tagline || 'Cortes precisos'}</p>
                <div className="mt-1.5 inline-block self-start px-2 py-0.5 rounded-full bg-white text-[8px] font-semibold" style={{ color: primary }}>Reservar</div>
              </div>
              <div className="flex-1" style={{ background: `url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=500&q=70') center/cover` }} />
            </div>
          )}
          {/* Services as rows */}
          <div className="p-2.5 space-y-1.5">
            {[0, 1].map(i => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-card border border-border p-1.5">
                <div className="w-9 h-9 rounded shrink-0" style={{ background: `linear-gradient(135deg, ${primary}33, ${secondary}33)` }} />
                <div className="flex-1 min-w-0"><div className="h-1.5 rounded bg-muted w-2/3 mb-1" /><div className="h-1 rounded bg-muted w-1/3" /></div>
                <div className="text-[9px] font-bold" style={{ color: accent }}>€</div>
              </div>
            ))}
          </div>
          {/* Professionals row */}
          <div className="flex gap-1.5 px-2.5 pb-2.5 overflow-hidden">
            {[0, 1, 2].map(i => <div key={i} className="w-12 h-14 rounded-lg shrink-0" style={{ background: `linear-gradient(135deg, ${primary}22, ${secondary}22)` }} />)}
          </div>
          <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] text-muted-foreground">Tecnología de <span className="font-semibold" style={{ color: accent }}>RINNO</span></p>
          </div>
        </Frame>
      );
    }
    if (b.storefront.skin === 'spa') {
      const minimal = b.storefront.headerVariant === 'minimal';
      const headFont = b.storefront.typography.heading === 'editorial' ? 'font-editorial' : 'font-display';
      const ov = (b.storefront.tokens && b.storefront.tokens.heroOverlay) || 30;
      const placement = b.storefront.logoPlacement;
      const spaImg = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=70';
      return (
        <Frame>
          {placement === 'top' && <div className="flex justify-center pt-3"><LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.storefront.logoSize} /></div>}
          <div className={`flex items-center gap-2 px-4 ${minimal ? 'py-1.5' : 'py-2.5'} ${placement === 'center' ? 'justify-center' : ''}`}>
            {placement === 'header' && <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.storefront.logoSize} />}
            <span className={`${headFont} font-semibold text-foreground text-sm truncate`} style={{ letterSpacing: '-0.01em' }}>{b.shared.businessName || 'Spa'}</span>
            {(placement === 'header' || placement === 'top') && <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-medium" style={{ border: `1px solid ${accent}`, color: accent }}>Reservar</span>}
          </div>
          <div className="h-px bg-border" />
          {b.storefront.heroVariant === 'split' ? (
            <div className="flex" style={{ minHeight: 82 }}>
              <div className="w-1/2" style={{ background: `url('${spaImg}') center/cover` }} />
              <div className="w-1/2 p-3 flex flex-col justify-center">
                <p className="text-[8px] uppercase tracking-wide" style={{ color: accent }}>Belleza · Spa</p>
                <p className={`${headFont} font-semibold text-foreground text-[12px] leading-tight mt-1`} style={{ letterSpacing: '-0.01em' }}>{business.headline || 'Un momento para ti.'}</p>
                <div className="mt-1.5 inline-block self-start px-2 py-0.5 rounded-full text-white text-[8px] font-medium" style={{ background: primary }}>Reservar</div>
              </div>
            </div>
          ) : (
            <div className="relative" style={{ height: 100, background: `linear-gradient(180deg, rgba(0,0,0,${Math.max(ov - 12, 0) / 100}) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 55%, rgba(0,0,0,${ov / 100}) 100%), url('${spaImg}') center/cover` }}>
              <div className="absolute bottom-2 left-0 right-0 text-center px-2">
                <p className={`${headFont} font-semibold text-white text-[13px] leading-tight`} style={{ letterSpacing: '-0.01em' }}>{business.headline || 'Un momento para ti.'}</p>
                <div className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-white text-[8px] font-medium" style={{ background: primary }}>Reservar</div>
              </div>
            </div>
          )}
          {/* service cards grid */}
          <div className="p-2.5 grid grid-cols-2 gap-2">
            {[0, 1].map(i => (
              <div key={i} className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="h-8" style={{ background: `linear-gradient(135deg, ${primary}22, ${secondary}22)` }} />
                <div className="p-1.5">
                  <div className="h-1.5 rounded bg-muted w-2/3 mb-1" />
                  <div className="h-1 rounded bg-muted w-1/3" />
                  <div className="mt-1 h-1.5 w-1/3 rounded" style={{ background: accent }} />
                </div>
              </div>
            ))}
          </div>
          {/* professionals portrait tiles */}
          <div className="flex gap-1.5 px-2.5 pb-2.5 overflow-hidden">
            {[0, 1, 2].map(i => <div key={i} className="w-10 h-14 rounded-lg shrink-0" style={{ background: `linear-gradient(180deg, ${primary}22, ${secondary}44)` }} />)}
          </div>
          <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] text-muted-foreground">Tecnología de <span className="font-semibold" style={{ color: accent }}>RINNO</span></p>
          </div>
        </Frame>
      );
    }
    if (b.storefront.skin === 'retail') {
      const compact = b.storefront.headerVariant === 'compact';
      const headFont = b.storefront.typography.heading === 'heading' ? 'font-heading' : 'font-display';
      const placement = b.storefront.logoPlacement;
      const retailImg = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=70';
      const cats = ['Todo', 'Novedades', 'Más vendido', 'Especial'];
      return (
        <Frame>
          {/* utility bar */}
          <div className="hidden sm:flex items-center justify-between px-3 py-1 text-[8px] text-muted-foreground" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span>Tu tienda de confianza</span><span style={{ color: accent }}>Seguir pedido</span>
          </div>
          {placement === 'top' && <div className="flex justify-center pt-2.5"><LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.storefront.logoSize} /></div>}
          {/* brand row */}
          <div className={`flex items-center gap-2 px-3 ${compact ? 'py-1.5' : 'py-2.5'}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {placement === 'header' && <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.storefront.logoSize} />}
            <span className={`${headFont} font-semibold text-foreground text-xs truncate`} style={{ letterSpacing: '-0.01em' }}>{b.shared.businessName || 'Tienda'}</span>
            <div className="ml-auto flex items-center gap-1">
              <div className="hidden sm:block w-10 h-5 rounded-full bg-muted" />
              <div className="w-5 h-5 rounded-full bg-muted" />
              <div className="relative w-5 h-5 rounded-full" style={{ background: accent }}><span className="absolute -top-1 -right-1 text-[6px] font-bold text-white bg-amber-500 rounded-full px-0.5">2</span></div>
            </div>
          </div>
          {/* category pills */}
          <div className="flex items-center gap-1 px-3 py-1.5 overflow-hidden">
            {cats.map((n, i) => <div key={n} className="text-[8px] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0" style={i === 0 ? { background: accent, color: '#fff' } : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>{n}</div>)}
          </div>
          {/* hero */}
          {b.storefront.heroVariant === 'collection' ? (
            <div className="flex gap-1.5 px-3 pt-1">
              <div className="w-3/5 relative rounded-xl overflow-hidden" style={{ minHeight: 74, background: `linear-gradient(90deg, rgba(0,0,0,0.6), rgba(0,0,0,0.1)), url('${retailImg}') center/cover` }}>
                <div className="absolute bottom-1.5 left-2 right-2">
                  <p className={`${headFont} font-semibold text-white text-[11px] leading-tight`}>{business.headline || 'Tu tienda, online.'}</p>
                  <div className="mt-1 inline-block px-1.5 py-0.5 rounded-full text-white text-[7px] font-medium" style={{ background: primary }}>Ver catálogo</div>
                </div>
              </div>
              <div className="w-2/5 grid grid-cols-2 gap-1">
                {[0, 1, 2, 3].map(i => <div key={i} className="rounded-lg" style={{ background: `linear-gradient(135deg, ${primary}44, ${accent}44)` }} />)}
              </div>
            </div>
          ) : (
            <div className="relative mx-3 mt-1 rounded-xl overflow-hidden" style={{ minHeight: 88, background: `linear-gradient(90deg, rgba(0,0,0,0.66) 0%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0.05) 100%), url('${retailImg}') center/cover` }}>
              <div className="absolute inset-0 p-3 flex flex-col justify-center max-w-[60%]">
                <p className="text-[7px] uppercase tracking-wide text-white/75 mb-1">Nueva colección</p>
                <p className={`${headFont} font-semibold text-white text-[12px] leading-tight`} style={{ letterSpacing: '-0.01em' }}>{business.headline || 'Tu tienda, online.'}</p>
                <div className="mt-1.5 inline-block self-start px-2 py-0.5 rounded-full text-white text-[7px] font-medium" style={{ background: primary }}>Ver catálogo</div>
              </div>
            </div>
          )}
          {/* product grid — portrait cards */}
          <div className="p-2.5 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="relative" style={{ background: `linear-gradient(135deg, ${primary}22, ${secondary}22)`, aspectRatio: '4/5' }}>
                  {i === 1 && <div className="absolute top-1 left-1 text-[6px] font-bold px-1 py-0.5 rounded-full text-white" style={{ background: accent }}>Oferta</div>}
                </div>
                <div className="p-1.5">
                  <div className="h-1 w-1/3 rounded mb-1" style={{ background: accent }} />
                  <div className="h-1.5 rounded bg-muted w-2/3 mb-1" />
                  <div className="flex items-center justify-between">
                    <div className="h-1.5 w-1/3 rounded bg-muted" />
                    <div className="w-3 h-3 rounded-full" style={{ background: accent }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[8px] text-muted-foreground">Tecnología de <span className="font-semibold" style={{ color: accent }}>RINNO</span></p>
          </div>
        </Frame>
      );
    }
    const heroBg = `linear-gradient(135deg, ${primary}, ${secondary})`;
    const placement = b.storefront.logoPlacement;
    const compact = b.storefront.headerVariant === 'compact';
    return (
      <Frame>
        {/* Header */}
        {placement === 'top' && (
          <div className="flex justify-center pt-4">
            <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.storefront.logoSize} />
          </div>
        )}
        <div className={`flex items-center gap-2.5 px-4 ${compact ? 'py-2' : 'py-3.5'} ${placement === 'center' ? 'justify-center' : ''}`}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {placement === 'header' && <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.storefront.logoSize} />}
          <span className="font-heading font-bold text-sm text-foreground truncate">{b.shared.businessName || 'Mi comercio'}</span>
        </div>
        {b.storefront.skin === 'freshmarket' && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
              <div className="h-1.5 flex-1 rounded bg-muted-foreground/20" />
            </div>
          </div>
        )}
        {/* Hero */}
        <div className="relative" style={{
          background: heroBg,
          minHeight: b.storefront.heroVariant === 'banner' ? 48 : b.storefront.heroVariant === 'feature' ? 120 : b.storefront.heroVariant === 'minimal' ? 70 : b.storefront.heroVariant === 'editorial' ? 150 : 110,
          padding: b.storefront.heroVariant === 'banner' ? '10px 14px' : b.storefront.heroVariant === 'split' ? '14px 16px' : '18px 16px',
        }}>
          {overlay > 0 && <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay / 100})` }} />}
          <div className={`relative ${b.storefront.heroVariant === 'editorial' ? 'max-w-[60%]' : ''} ${b.storefront.heroVariant === 'split' ? 'max-w-[55%]' : ''}`}>
            <p className="text-white font-heading font-bold leading-tight" style={{ fontSize: b.storefront.heroVariant === 'editorial' ? 17 : b.storefront.heroVariant === 'banner' ? 12 : 14 }}>
              {business.headline || 'Bienvenido a nuestra tienda'}
            </p>
            <p className="text-white/85 text-[11px] mt-1 leading-snug">{business.tagline || 'Productos frescos seleccionados'}</p>
          </div>
        </div>
        {b.storefront.skin === 'freshmarket' && (
          <div className="flex gap-1.5 px-3 pt-2 overflow-hidden">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-4 w-10 rounded-full bg-muted shrink-0" />)}
          </div>
        )}
        {/* Product grid mock */}
        <div className={`p-3 grid grid-cols-2 ${dense}`}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-xl bg-card border border-border p-2.5">
              <div className="rounded-lg mb-2" style={{ background: `linear-gradient(135deg, ${primary}22, ${secondary}22)`, height: 44 }} />
              <div className="h-2 rounded bg-muted w-3/4 mb-1.5" />
              <div className="h-2 rounded bg-muted w-1/2" />
            </div>
          ))}
        </div>
        <div className="px-4 py-3 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] text-muted-foreground">Tecnología de <span className="font-semibold" style={{ color: accent }}>RINNO</span></p>
        </div>
      </Frame>
    );
  }

  if (b.dashboard.skin === 'associationops') return <Frame><div className="flex min-h-52"><div className="w-28 bg-[#12383f] text-white p-3"><LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.dashboard.logoSize}/><div className="mt-5 space-y-2">{['Resumen','Socios','Actividades','Cuotas'].map((x,i)=><div key={x} className={`text-[8px] p-2 rounded ${i===0?'bg-white text-[#12383f]':'text-white/60'}`}>{x}</div>)}</div></div><div className="flex-1 p-4"><p className="font-editorial text-lg">Panel de la asociación</p><div className="grid grid-cols-2 gap-2 mt-4">{[1,2,3,4].map(x=><div key={x} className="border rounded-xl p-3"><div className="h-4 w-8 bg-teal-700/20 rounded"/><div className="h-2 bg-muted rounded mt-3"/></div>)}</div></div></div></Frame>;
  if (b.dashboard.skin === 'spaops') {
    const isBar = b.dashboard.navigationVariant === 'bar';
    const minimal = b.dashboard.headerVariant === 'minimal';
    const headFont = b.dashboard.typography.heading === 'editorial' ? 'font-editorial' : b.dashboard.typography.heading === 'display' ? 'font-display' : 'font-heading';
    const tabs = ['Inicio', 'Agenda', 'Clientes', 'Ajustes'];
    return (
      <Frame>
        {isBar ? (
          <>
            <div className={`flex items-center gap-2 px-3 ${minimal ? 'py-1.5' : 'py-2'}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.dashboard.logoSize} />
              <span className={`${headFont} font-semibold text-foreground text-xs truncate`} style={{ letterSpacing: '-0.01em' }}>{b.shared.businessName || 'Spa'}</span>
              <div className="ml-auto w-4 h-4 rounded-full" style={{ background: '#f59e0b' }} />
            </div>
            <div className="flex items-center gap-1 px-2 py-1.5 overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {tabs.map((n, i) => <div key={n} className="text-[8px] px-2 py-1 rounded-full whitespace-nowrap" style={i === 0 ? { background: accent, color: '#fff' } : { color: 'hsl(var(--muted-foreground))' }}>{n}</div>)}
            </div>
          </>
        ) : (
          <div className="flex">
            <div className="w-[44px] shrink-0 py-2 flex flex-col items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.04)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
              <LogoMark src={b.shared.logo} name={b.shared.businessName} size="sm" />
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="relative w-full flex flex-col items-center gap-0.5 py-1">
                  {i === 0 && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full" style={{ background: accent }} />}
                  <div className="w-4 h-4 rounded" style={i === 0 ? { background: accent } : { background: 'rgba(255,255,255,0.1)' }} />
                  <div className="text-[6px] text-muted-foreground">{'IACL'[i]}</div>
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`flex items-center px-3 ${minimal ? 'py-1.5' : 'py-2'}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span className={`${headFont} font-semibold text-foreground text-xs`} style={{ letterSpacing: '-0.01em' }}>{b.shared.businessName || 'Spa'}</span>
                <div className="ml-auto w-4 h-4 rounded-full" style={{ background: '#f59e0b' }} />
              </div>
            </div>
          </div>
        )}
        {/* agenda cards — spa style (accent left border) */}
        <div className="p-2.5 space-y-1.5">
          <p className="text-[8px] uppercase tracking-wide font-semibold" style={{ color: accent }}>Citas de hoy</p>
          {[0, 1].map(i => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg bg-card border border-border p-1.5" style={{ borderLeft: `2px solid ${accent}` }}>
              <div className="text-[8px] font-semibold text-foreground shrink-0">{i === 0 ? '10:00' : '12:30'}</div>
              <div className="flex-1 min-w-0"><div className="h-1.5 rounded bg-muted w-2/3 mb-1" /><div className="h-1 rounded bg-muted w-1/2" /></div>
              <div className="text-[7px] font-semibold px-1 py-0.5 rounded-full" style={{ background: i === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: i === 0 ? '#10b981' : '#f59e0b' }}>{i === 0 ? 'Conf.' : 'Pend.'}</div>
            </div>
          ))}
        </div>
      </Frame>
    );
  }
  if (b.dashboard.skin === 'retailops') {
    const isLauncher = b.dashboard.navigationVariant === 'launcher';
    const compact = b.dashboard.headerVariant === 'compact';
    const headFont = b.dashboard.typography.heading === 'display' ? 'font-display' : 'font-heading';
    const tabs = ['Inicio', 'Pedidos', 'Catálogo', 'Clientes', 'Ajustes'];
    return (
      <Frame>
        {/* header */}
        <div className={`flex items-center gap-2 px-3 ${compact ? 'py-1.5' : 'py-2.5'}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.dashboard.logoSize} />
          <div className="min-w-0">
            <p className={`${headFont} font-semibold text-foreground text-xs leading-none truncate`} style={{ letterSpacing: '-0.01em' }}>{b.shared.businessName || 'Tienda'}</p>
            <p className="text-[7px] text-muted-foreground mt-0.5">Panel de ventas</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-1 text-[7px]"><span className="text-muted-foreground">Pend.</span><span className="font-semibold" style={{ color: '#f59e0b' }}>2</span></div>
            <div className="w-4 h-4 rounded-full" style={{ background: '#f59e0b' }} />
          </div>
        </div>
        {/* nav: ribbon or launcher */}
        {isLauncher ? (
          <div className="flex items-stretch gap-1.5 px-2 py-1.5 overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {tabs.slice(0, 4).map((n, i) => (
              <div key={n} className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-[44px]" style={i === 0 ? { background: accent, color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: 'hsl(var(--muted-foreground))' }}>
                <div className="w-3 h-3 rounded" style={i === 0 ? { background: '#fff' } : { background: 'currentColor' }} />
                <span className="text-[6px] leading-none">{n}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1.5 overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {tabs.map((n, i) => <div key={n} className="text-[8px] px-2 py-1 rounded-lg whitespace-nowrap" style={i === 0 ? { background: accent, color: '#fff' } : { color: 'hsl(var(--muted-foreground))' }}>{n}</div>)}
          </div>
        )}
        {/* KPIs */}
        <div className="p-2.5 grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-lg bg-card border border-border p-1.5 text-center">
              <div className="w-2.5 h-2.5 mx-auto mb-1 rounded" style={{ background: accent }} />
              <div className="h-1.5 w-2/3 mx-auto rounded bg-muted mb-1" />
              <div className="h-1 w-1/2 mx-auto rounded bg-muted" />
            </div>
          ))}
        </div>
        {/* orders list */}
        <div className="px-2.5 pb-2.5 space-y-1.5">
          <p className="text-[7px] uppercase tracking-wide font-semibold" style={{ color: accent }}>Pedidos nuevos</p>
          {[0, 1].map(i => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg bg-card border border-border p-1.5">
              <div className="w-5 h-5 rounded shrink-0" style={{ background: accent + '1a' }} />
              <div className="flex-1 min-w-0"><div className="h-1.5 rounded bg-muted w-2/3 mb-1" /><div className="h-1 rounded bg-muted w-1/3" /></div>
              <div className="text-[6px] font-semibold px-1 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Pend.</div>
            </div>
          ))}
        </div>
      </Frame>
    );
  }
  // Dashboard face
  const navTop = b.dashboard.navigationVariant === 'top';
  const logoSide = b.dashboard.logoPlacement === 'sidebar' && !navTop;
  if (b.dashboard.skin === 'butcherops') {
    const rail = b.dashboard.navigationVariant === 'rail';
    const compact = b.dashboard.headerVariant === 'compact';
    const headFont = b.dashboard.typography.heading === 'display' ? 'font-display' : 'font-heading';
    return (
      <Frame>
        <div className="flex">
          {rail && (
            <div className="w-[48px] shrink-0 py-2 flex flex-col items-center gap-2" style={{ background: 'rgba(255,255,255,0.04)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-6 h-6 rounded-md" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
              {[0, 1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-md" style={i === 0 ? { background: accent } : { background: 'rgba(255,255,255,0.08)' }} />)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className={`flex items-center gap-2 px-3 ${compact ? 'py-1.5' : 'py-2.5'}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {!rail && b.dashboard.logoPlacement === 'top' && <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.dashboard.logoSize} />}
              {!rail && b.dashboard.logoPlacement !== 'top' && <span className={`${headFont} font-bold text-xs text-foreground`}>RINNO</span>}
              {rail && <span className={`${headFont} font-bold text-[11px] text-foreground`}>{b.shared.businessName || 'Panel'}</span>}
              <div className="ml-auto flex items-center gap-1">
                {['Inicio', 'Pedidos', 'Catálogo', 'Clientes'].map((n, i) => (
                  <div key={n} className="text-[9px] px-1.5 py-1 rounded" style={i === 0 ? { background: accent, color: '#fff' } : { color: 'hsl(var(--muted-foreground))' }}>{n}</div>
                ))}
                <div className="w-4 h-4 rounded-full" style={{ background: '#f59e0b' }} />
              </div>
            </div>
            <div className={`p-2.5 grid grid-cols-2 ${dense}`}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="rounded-xl bg-card border border-border p-2">
                  <div className="h-1.5 w-1/3 rounded mb-2" style={{ background: accent }} />
                  <div className="h-2.5 rounded bg-muted w-2/3 mb-1.5" />
                  <div className="h-1.5 rounded bg-muted w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Frame>
    );
  }
  if (b.dashboard.skin === 'barberops') {
    const isDock = b.dashboard.navigationVariant === 'dock';
    const compact = b.dashboard.headerVariant === 'compact';
    const headFont = b.dashboard.typography.heading === 'editorial' ? 'font-editorial' : b.dashboard.typography.heading === 'display' ? 'font-display' : 'font-heading';
    const tabs = ['Inicio', 'Agenda', 'Clientes', 'Ajustes'];
    return (
      <Frame>
        <div className="relative">
          <div className={`flex items-center gap-2 px-3 ${compact ? 'py-1.5' : 'py-2.5'}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.dashboard.logoSize} />
            <span className={`${headFont} font-bold text-foreground text-xs truncate`}>{b.shared.businessName || 'Barbería'}</span>
          </div>
          {!isDock && (
            <div className="flex items-center gap-1 px-3 overflow-hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {tabs.map((n, i) => (
                <div key={n} className="relative py-2 px-2 text-[9px] font-medium" style={{ color: i === 0 ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                  {n}{i === 0 && <span className="absolute left-1 right-1 bottom-0 h-[2px] rounded-full" style={{ background: accent }} />}
                </div>
              ))}
            </div>
          )}
          {/* Agenda-first content: today's appointments */}
          <div className="p-2.5 space-y-1.5">
            <p className="text-[8px] uppercase tracking-wide font-semibold" style={{ color: accent }}>Hoy</p>
            {[0, 1].map(i => (
              <div key={i} className="flex items-stretch gap-1.5 rounded-lg overflow-hidden border border-border">
                <div className="w-7 shrink-0 flex items-center justify-center text-white text-[8px] font-bold" style={{ background: accent }}>{i === 0 ? '10:00' : '12:30'}</div>
                <div className="flex-1 p-1"><div className="h-1.5 rounded bg-muted w-2/3 mb-1" /><div className="h-1 rounded bg-muted w-1/2" /></div>
                <div className="px-1.5 flex items-center"><div className="text-[7px] font-semibold px-1 py-0.5 rounded-full" style={{ background: i === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: i === 0 ? '#10b981' : '#f59e0b' }}>{i === 0 ? 'Conf.' : 'Pend.'}</div></div>
              </div>
            ))}
          </div>
        </div>
        {/* Floating dock (always rendered in preview to show the signature nav) */}
        <div className="flex items-end justify-center gap-1 px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {tabs.slice(0, 2).map(n => <div key={n} className="text-[7px] text-muted-foreground px-1">{n}</div>)}
          <div className="px-2 py-1 rounded-xl text-white text-[7px] font-semibold" style={{ background: accent }}>Agenda</div>
          {tabs.slice(2).map(n => <div key={n} className="text-[7px] text-muted-foreground px-1">{n}</div>)}
        </div>
      </Frame>
    );
  }
  return (
    <Frame>
      <div className={navTop ? 'flex flex-col' : 'flex'}>
        {/* Sidebar */}
        {!navTop && (
          <div className="w-[120px] shrink-0 p-3 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.04)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-2">
              {logoSide && <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.dashboard.logoSize} />}
              {!logoSide && <span className="font-heading font-bold text-xs text-foreground">RINNO</span>}
            </div>
            {['Inicio', 'Pedidos', 'Catálogo', 'Clientes'].map((n, i) => (
              <div key={n} className="text-[11px] px-2 py-1.5 rounded-md"
                style={i === 0 ? { background: `linear-gradient(90deg, ${primary}, ${secondary})`, color: '#fff' } : { color: 'hsl(var(--muted-foreground))' }}>{n}</div>
            ))}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <div className={`flex items-center gap-2 px-4 ${b.dashboard.headerVariant === 'compact' ? 'py-2' : 'py-3'}`}
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {navTop && b.dashboard.logoPlacement === 'top' && <LogoMark src={b.shared.logo} name={b.shared.businessName} size={b.dashboard.logoSize} />}
            {navTop && b.dashboard.logoPlacement !== 'top' && <span className="font-heading font-bold text-sm text-foreground">RINNO</span>}
            <span className="text-xs text-muted-foreground ml-auto">{b.shared.businessName || 'Panel'}</span>
          </div>
          {/* Cards */}
          <div className={`p-3 grid grid-cols-2 ${dense}`}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="rounded-xl bg-card border border-border p-2.5">
                <div className="h-1.5 w-1/3 rounded mb-2" style={{ background: accent }} />
                <div className="h-3 rounded bg-muted w-2/3 mb-1.5" />
                <div className="h-2 rounded bg-muted w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}
