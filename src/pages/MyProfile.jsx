import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react";
import { useStoreBranding } from "@/lib/storeContext";
import StoreAccountHeader from "@/components/store/StoreAccountHeader";

export default function MyProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, checkUserAuth } = useAuth();
  const { business, loading: bizLoading, primaryColor } = useStoreBranding(slug);
  const color = primaryColor;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const firstName = user?.first_name || user?.data?.first_name || "";
  const lastName = user?.last_name || user?.data?.last_name || "";
  const phone = user?.phone || user?.data?.phone || "";
  const [form, setForm] = useState({ first_name: firstName, last_name: lastName, phone });

  async function handleSave() {
    setSaving(true);
    try {
      await base44.functions.invoke("UpdateCustomerProfile", { slug, ...form });
      await checkUserAuth();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (bizLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>;

  return (
    <div className="min-h-screen bg-background">
      <StoreAccountHeader business={business} slug={slug} primaryColor={color} onBack={() => navigate(`/store/${slug}/account`)} title="Mis datos" />
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {saved && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2"><Check className="w-4 h-4" />Datos actualizados correctamente</div>}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="space-y-1.5"><Label>Nombre</Label><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Apellidos</Label><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-1.5">
          <Label>Email</Label><Input value={user?.email || ""} disabled className="opacity-60" />
          <p className="text-xs text-muted-foreground">El email no se puede modificar. Si necesitas cambiarlo, contacta con soporte.</p>
        </div>
        <Button className="w-full text-white" size="lg" style={{ backgroundColor: color }} disabled={saving || !form.first_name.trim() || !form.phone.trim()} onClick={handleSave}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Guardar cambios
        </Button>
      </div>
    </div>
  );
}