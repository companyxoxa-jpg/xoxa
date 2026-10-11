import { OPTION_LABELS } from '@/lib/templates';

// Renders ONLY the visual controls supported by a given skin face. The
// `supports` manifest drives what appears — unsupported options are hidden,
// so a template can never be configured into a broken design.
const selectCls = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary';
const typoLabel = (role, v) => (OPTION_LABELS.typography[role] && OPTION_LABELS.typography[role][v]) || v;
const optLabel = (group, v) => (OPTION_LABELS[group] && OPTION_LABELS[group][v]) || v;

function Field({ title, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{title}</label>
      {children}
    </div>
  );
}

export default function AppearanceOptionControls({ supports, values, onChange }) {
  if (!supports) return null;
  const v = values || {};
  const set = (key, value) => onChange(key, value);
  return (
    <div className="grid grid-cols-2 gap-3">
      {supports.typography && supports.typography.heading && (
        <Field title="Tipografía · Titulares">
          <select className={selectCls} value={v.typography?.heading || ''}
            onChange={e => set('typography', { ...(v.typography || {}), heading: e.target.value })}>
            {supports.typography.heading.map(o => <option key={o} value={o}>{typoLabel('heading', o)}</option>)}
          </select>
        </Field>
      )}
      {supports.logoPlacement && (
        <Field title="Posición del logo">
          <select className={selectCls} value={v.logoPlacement || ''} onChange={e => set('logoPlacement', e.target.value)}>
            {supports.logoPlacement.map(o => <option key={o} value={o}>{optLabel('logoPlacement', o)}</option>)}
          </select>
        </Field>
      )}
      {supports.logoSize && (
        <Field title="Tamaño del logo">
          <select className={selectCls} value={v.logoSize || ''} onChange={e => set('logoSize', e.target.value)}>
            {supports.logoSize.map(o => <option key={o} value={o}>{optLabel('logoSize', o)}</option>)}
          </select>
        </Field>
      )}
      {supports.headerVariant && (
        <Field title="Variante de cabecera">
          <select className={selectCls} value={v.headerVariant || ''} onChange={e => set('headerVariant', e.target.value)}>
            {supports.headerVariant.map(o => <option key={o} value={o}>{optLabel('headerVariant', o)}</option>)}
          </select>
        </Field>
      )}
      {supports.heroVariant && (
        <Field title="Variante de hero">
          <select className={selectCls} value={v.heroVariant || ''} onChange={e => set('heroVariant', e.target.value)}>
            {supports.heroVariant.map(o => <option key={o} value={o}>{optLabel('heroVariant', o)}</option>)}
          </select>
        </Field>
      )}
      {supports.navigationVariant && (
        <Field title="Variante de navegación">
          <select className={selectCls} value={v.navigationVariant || ''} onChange={e => set('navigationVariant', e.target.value)}>
            {supports.navigationVariant.map(o => <option key={o} value={o}>{optLabel('navigationVariant', o)}</option>)}
          </select>
        </Field>
      )}
      {supports.density && (
        <Field title="Densidad">
          <select className={selectCls} value={v.density || ''} onChange={e => set('density', e.target.value)}>
            {supports.density.map(o => <option key={o} value={o}>{optLabel('density', o)}</option>)}
          </select>
        </Field>
      )}
      {supports.tokens && Object.keys(supports.tokens).length > 0 && (
        <div className="col-span-2 space-y-3 mt-1 pt-3 border-t border-white/10">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Tokens visuales del skin</p>
          {Object.entries(supports.tokens).map(([key, type]) => {
            const val = (v.tokens && v.tokens[key]) ?? (type === 'color' ? '#16A34A' : type === 'percent' ? 0 : 8);
            if (type === 'color') {
              return (
                <Field key={key} title={`Token · ${key}`}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={val} onChange={e => set('tokens', { ...(v.tokens || {}), [key]: e.target.value })}
                      className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-white/10" />
                    <input value={val} onChange={e => set('tokens', { ...(v.tokens || {}), [key]: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono" />
                  </div>
                </Field>
              );
            }
            const max = type === 'percent' ? 100 : 32;
            return (
              <Field key={key} title={`Token · ${key} (${type === 'percent' ? '%' : 'px'})`}>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={max} value={val}
                    onChange={e => set('tokens', { ...(v.tokens || {}), [key]: Number(e.target.value) })}
                    className="flex-1 accent-[hsl(var(--primary))]" />
                  <span className="text-sm text-white w-10 text-right tabular-nums">{val}</span>
                </div>
              </Field>
            );
          })}
        </div>
      )}
    </div>
  );
}