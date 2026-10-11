import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TEMPLATES, templateFor, defaultAppearanceConfig, getStorefrontSkin, getDashboardSkin } from '@/lib/templates';
import { invalidateStoreBranding } from '@/lib/storeContext';
import { invalidateBusinessCache } from '@/lib/businessCache';
import { Image as ImageIcon, Upload, Trash2, Loader2, Palette, Eye, Monitor, Save, RotateCcw, Smartphone, Settings2 } from 'lucide-react';
import AppearancePreview from './AppearancePreview';
import AppearanceOptionControls from './AppearanceOptionControls';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const selectCls = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary';

// Builds an isolated draft from the saved business. appearance_config is
// additive: absent → template defaults (V1 behavior preserved).
function buildDraft(business) {
  const template = templateFor(business);
  const cfg = business.appearance_config;
  const hasCfg = cfg && typeof cfg === 'object' && (cfg.storefront || cfg.dashboard);
  return {
    business_name: business.business_name || '',
    contact_phone: business.contact_phone || '',
    contact_email: business.contact_email || '',
    address: business.address || '',
    timezone: business.timezone || 'Europe/Madrid',
    primary_color: business.primary_color || template.color,
    secondary_color: business.secondary_color || template.color,
    logo: business.logo || '',
    favicon: business.favicon || '',
    business_mode: business.business_mode || 'COMMERCE',
    template_id: business.template_id || 'fresh-classic',
    cover_image: business.cover_image || '',
    headline: business.headline || '',
    tagline: business.tagline || '',
    appearance_config: hasCfg ? cfg : defaultAppearanceConfig(template),
  };
}

function ImageUpload({ label, value, onUpload, onRemove, uploading, fileRef, onPick }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-white">{label}</Label>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
          {value ? <img src={value} alt={label} className="w-full h-full object-contain" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPick} className="hidden" />
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Subiendo...' : value ? 'Cambiar' : 'Subir'}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={onRemove} className="text-rose-400 hover:bg-rose-500/10">
              <Trash2 className="w-3.5 h-3.5" /> Quitar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TemplateAppearancePanel({ business, onSaved }) {
  const { toast } = useToast();
  const logoRef = useRef(null);
  const faviconRef = useRef(null);
  const coverRef = useRef(null);
  const [draft, setDraft] = useState(() => buildDraft(business));
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [face, setFace] = useState('storefront');
  const [device, setDevice] = useState('desktop');

  const template = templateFor(draft);
  const sfSkin = getStorefrontSkin(template.v2.storefront.skin);
  const dbSkin = getDashboardSkin(template.v2.dashboard.skin);
  const compatibleTemplates = TEMPLATES.filter(t => draft.business_mode === 'HYBRID' || t.mode === draft.business_mode);

  function setField(f, value) { setDraft(prev => ({ ...prev, [f]: value })); }

  function setTemplate(templateId) {
    const t = TEMPLATES.find(x => x.id === templateId);
    if (!t) return;
    setDraft(prev => ({ ...prev, template_id: templateId, appearance_config: defaultAppearanceConfig(t) }));
  }
  function setMode(mode) {
    const compatible = TEMPLATES.filter(t => mode === 'HYBRID' || t.mode === mode);
    const keep = compatible.some(t => t.id === draft.template_id);
    const nextTemplate = keep ? templateFor(draft) : compatible[0] || TEMPLATES[0];
    setDraft(prev => ({ ...prev, business_mode: mode, template_id: nextTemplate.id, appearance_config: defaultAppearanceConfig(nextTemplate) }));
  }
  function setStorefrontOption(key, value) {
    setDraft(prev => ({ ...prev, appearance_config: { ...prev.appearance_config, storefront: { ...prev.appearance_config.storefront, [key]: value } } }));
  }
  function setDashboardOption(key, value) {
    setDraft(prev => ({ ...prev, appearance_config: { ...prev.appearance_config, dashboard: { ...prev.appearance_config.dashboard, [key]: value } } }));
  }
  function resetAppearance() {
    const t = templateFor(draft);
    setDraft(prev => ({ ...prev, primary_color: t.color, secondary_color: t.color, appearance_config: defaultAppearanceConfig(t) }));
    toast({ title: 'Apariencia restaurada', description: `Valores predeterminados de "${t.name}".` });
  }
  function handleCancel() { setDraft(buildDraft(business)); }

  async function uploadImage(file, field, setUploading) {
    if (!ALLOWED_TYPES.includes(file.type)) { toast({ title: 'Formato no válido', description: 'Usa PNG, JPG o WEBP.', variant: 'destructive' }); return; }
    if (file.size > 4 * 1024 * 1024) { toast({ title: 'Archivo demasiado grande', description: 'Máximo 4 MB.', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      setField(field, res.file_url);
      toast({ title: 'Imagen subida', description: 'Pulsa Guardar para confirmar.' });
    } catch { toast({ title: 'Error', description: 'No se pudo subir.', variant: 'destructive' }); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    if (draft.primary_color && !HEX_RE.test(draft.primary_color)) { toast({ title: 'Color principal no válido', description: 'Formato HEX #RRGGBB', variant: 'destructive' }); return; }
    if (draft.secondary_color && !HEX_RE.test(draft.secondary_color)) { toast({ title: 'Color secundario no válido', description: 'Formato HEX #RRGGBB', variant: 'destructive' }); return; }
    if (!draft.business_name.trim()) { toast({ title: 'Nombre requerido', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await base44.functions.invoke('ManageBusiness', {
        action: 'update', business_id: business.id,
        business_data: {
          business_name: draft.business_name.trim(),
          contact_phone: draft.contact_phone.trim(),
          contact_email: draft.contact_email.trim(),
          address: draft.address.trim(),
          timezone: draft.timezone,
          primary_color: draft.primary_color,
          secondary_color: draft.secondary_color,
          logo: draft.logo || null,
          favicon: draft.favicon || null,
          business_mode: draft.business_mode,
          template_id: draft.template_id,
          cover_image: draft.cover_image,
          headline: draft.headline,
          tagline: draft.tagline,
          appearance_config: draft.appearance_config,
        },
      });
      invalidateStoreBranding(business.slug);
      invalidateBusinessCache(business.id);
      toast({ title: 'Apariencia guardada', description: 'Branding refrescado.' });
      if (onSaved) onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e?.response?.data?.error || 'No se pudo guardar.', variant: 'destructive' });
    } finally { setSaving(false); }
  }

  const inputCls = 'bg-white/5 border-white/10 text-white';
  const Toggle = ({ active, onClick, icon: Icon, label }) => (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground' : 'bg-white/5 border border-white/10 text-muted-foreground hover:text-white'}`}>
      <Icon className="w-3.5 h-3.5" />{label}
    </button>
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-heading font-semibold text-white">Apariencia</h2>
        <span className="text-[11px] text-muted-foreground ml-1">Template Engine V2 · 1 plantilla = pack Storefront + Dashboard</span>
      </div>

      {/* Pack selector — ONE template, never independent storefront/dashboard */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Modalidad</Label>
          <select className={selectCls} value={draft.business_mode} onChange={e => setMode(e.target.value)}>
            {['COMMERCE', 'BOOKING', 'HYBRID', 'ASSOCIATION'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Plantilla (pack)</Label>
          <select className={selectCls} value={draft.template_id} onChange={e => setTemplate(e.target.value)}>
            {compatibleTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Level 1 — Shared identity */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold pt-2">1 · Identidad compartida</p>
        <ImageUpload label="Logo" value={draft.logo} fileRef={logoRef} uploading={uploadingLogo}
          onPick={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'logo', setUploadingLogo); if (logoRef.current) logoRef.current.value = ''; }}
          onRemove={() => setField('logo', '')} />
        <ImageUpload label="Favicon" value={draft.favicon} fileRef={faviconRef} uploading={uploadingFavicon}
          onPick={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'favicon', setUploadingFavicon); if (faviconRef.current) faviconRef.current.value = ''; }}
          onRemove={() => setField('favicon', '')} />
        <p className="text-[11px] text-muted-foreground">PNG, JPG o WEBP. SVG no habilitado en esta fase.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Color primario</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={HEX_RE.test(draft.primary_color) ? draft.primary_color : '#16A34A'} onChange={e => setField('primary_color', e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-white/10" />
              <Input value={draft.primary_color} onChange={e => setField('primary_color', e.target.value)} className={`${inputCls} font-mono`} placeholder="#16A34A" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Color secundario</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={HEX_RE.test(draft.secondary_color) ? draft.secondary_color : '#0284C7'} onChange={e => setField('secondary_color', e.target.value)} className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-white/10" />
              <Input value={draft.secondary_color} onChange={e => setField('secondary_color', e.target.value)} className={`${inputCls} font-mono`} placeholder="#0284C7" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Nombre del negocio</Label>
          <Input value={draft.business_name} onChange={e => setField('business_name', e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Isolated preview */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <div className="flex gap-1.5">
            <Toggle active={face === 'storefront'} onClick={() => setFace('storefront')} icon={Eye} label="Cliente" />
            <Toggle active={face === 'dashboard'} onClick={() => setFace('dashboard')} icon={Monitor} label="Local" />
          </div>
          <div className="flex gap-1.5 ml-auto">
            <Toggle active={device === 'desktop'} onClick={() => setDevice('desktop')} icon={Monitor} label="Desktop" />
            <Toggle active={device === 'mobile'} onClick={() => setDevice('mobile')} icon={Smartphone} label="Móvil" />
          </div>
        </div>
        <div className="bg-black/20 rounded-xl p-4">
          <AppearancePreview business={draft} face={face} device={device} />
        </div>
        <p className="text-[11px] text-muted-foreground">Vista previa aislada — no modifica datos hasta guardar.</p>
      </div>

      {/* Level 2 — Client view */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold pt-2">2 · Vista cliente · skin “{sfSkin.name}”</p>
        <div className="grid grid-cols-1 gap-3">
          <ImageUpload label="Imagen de portada" value={draft.cover_image} fileRef={coverRef} uploading={uploadingCover}
            onPick={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'cover_image', setUploadingCover); if (coverRef.current) coverRef.current.value = ''; }}
            onRemove={() => setField('cover_image', '')} />
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">O usar una URL HTTPS</Label>
            <Input value={draft.cover_image} maxLength={2048} onChange={e => setField('cover_image', e.target.value)} className={inputCls} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Titular</Label>
              <Input value={draft.headline} maxLength={240} onChange={e => setField('headline', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Eslogan o texto de portada</Label>
              <Input value={draft.tagline} maxLength={240} onChange={e => setField('tagline', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
        <AppearanceOptionControls supports={sfSkin.supports} values={draft.appearance_config.storefront} onChange={setStorefrontOption} />
      </div>

      {/* Level 3 — Owner view */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold pt-2">3 · Vista local · skin “{dbSkin.name}”</p>
        <AppearanceOptionControls supports={dbSkin.supports} values={draft.appearance_config.dashboard} onChange={setDashboardOption} />
      </div>

      {/* Operational data (preserved from previous editor) */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <div className="flex items-center gap-2 pt-2">
          <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Datos operativos</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Teléfono</Label><Input value={draft.contact_phone} onChange={e => setField('contact_phone', e.target.value)} className={inputCls} /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Email</Label><Input type="email" value={draft.contact_email} onChange={e => setField('contact_email', e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Dirección</Label><Input value={draft.address} onChange={e => setField('address', e.target.value)} className={inputCls} /></div>
          <div className="space-y-1.5"><Label className="text-xs font-medium text-muted-foreground">Zona horaria</Label><Input value={draft.timezone} onChange={e => setField('timezone', e.target.value)} className={inputCls} /></div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={saving} className="bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10">
          Cancelar cambios
        </Button>
        <Button variant="outline" onClick={resetAppearance} disabled={saving} className="bg-white/5 border-white/10 text-white hover:bg-white/10">
          <RotateCcw className="w-4 h-4" /> Restaurar plantilla
        </Button>
      </div>
    </div>
  );
}
