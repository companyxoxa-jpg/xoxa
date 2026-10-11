import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, MapPin, Check, Loader2 } from "lucide-react";
import { useStoreBranding } from "@/lib/storeContext";
import StoreAccountHeader from "@/components/store/StoreAccountHeader";

export default function MyAddresses() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { business, loading: bizLoading, primaryColor } = useStoreBranding(slug);
  const color = primaryColor;
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("ManageSavedAddress", { action: "list", slug });
      setAddresses(res.data.addresses || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const action = editing.id ? "update" : "create";
      const payload = { action, slug, address_data: editing };
      if (editing.id) payload.address_id = editing.id;
      await base44.functions.invoke("ManageSavedAddress", payload);
      setEditing(null); load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar esta dirección?")) return;
    try { await base44.functions.invoke("ManageSavedAddress", { action: "delete", slug, address_id: id }); load(); } catch (e) { console.error(e); }
  }

  async function handleSetDefault(id) {
    try { await base44.functions.invoke("ManageSavedAddress", { action: "update", slug, address_id: id, address_data: { is_default: true } }); load(); } catch (e) { console.error(e); }
  }

  if (loading || bizLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>;

  if (editing) {
    return (
      <div className="min-h-screen bg-background">
        <StoreAccountHeader business={business} slug={slug} primaryColor={color} onBack={() => setEditing(null)} title={editing.id ? "Editar dirección" : "Nueva dirección"} />
        <div className="px-4 py-4 max-w-lg mx-auto space-y-3">
          <div className="space-y-1.5"><Label>Nombre de la dirección</Label><Input value={editing.label || ""} onChange={e => setEditing({ ...editing, label: e.target.value })} placeholder="Casa, Trabajo, Otro" /></div>
          <div className="space-y-1.5"><Label>Dirección *</Label><Input value={editing.address || ""} onChange={e => setEditing({ ...editing, address: e.target.value })} placeholder="Calle, número" /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Ciudad</Label><Input value={editing.city || ""} onChange={e => setEditing({ ...editing, city: e.target.value })} /></div><div className="space-y-1.5"><Label>Código postal</Label><Input value={editing.postal_code || ""} onChange={e => setEditing({ ...editing, postal_code: e.target.value })} /></div></div>
          <div className="space-y-1.5"><Label>Provincia</Label><Input value={editing.province || ""} onChange={e => setEditing({ ...editing, province: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Instrucciones de entrega (opcional)</Label><Textarea value={editing.delivery_notes || ""} onChange={e => setEditing({ ...editing, delivery_notes: e.target.value })} rows={2} placeholder="Portón azul, llamar al llegar..." /></div>
          <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={editing.is_default || false} onChange={e => setEditing({ ...editing, is_default: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-foreground">Dirección predeterminada</span></label>
          <Button className="w-full text-white" size="lg" style={{ backgroundColor: color }} disabled={saving || !editing.address?.trim()} onClick={handleSave}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Guardar dirección</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreAccountHeader business={business} slug={slug} primaryColor={color} onBack={() => navigate(`/store/${slug}/account`)} title="Mis direcciones" />
      <div className="px-4 py-4 max-w-lg mx-auto">
        {addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><MapPin className="w-8 h-8 text-muted-foreground" /></div>
            <p className="font-medium text-foreground mb-1">Sin direcciones guardadas</p>
            <p className="text-sm text-muted-foreground mb-6">Añade una dirección para agilizar tus pedidos en {business?.business_name || "esta tienda"}.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {addresses.map(a => (
              <div key={a.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {a.label && <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full text-foreground">{a.label}</span>}
                    {a.is_default && <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: color + "1a", color }}><Check className="w-3 h-3" />Predeterminada</span>}
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">{a.address}</p>
                <p className="text-sm text-muted-foreground">{a.city} {a.postal_code}{a.province ? `, ${a.province}` : ""}</p>
                {a.delivery_notes && <p className="text-xs text-muted-foreground mt-1">📝 {a.delivery_notes}</p>}
                <div className="flex gap-2 mt-3">
                  {!a.is_default && <button onClick={() => handleSetDefault(a.id)} className="text-xs font-medium hover:underline" style={{ color }}>Marcar como predeterminada</button>}
                  <button onClick={() => setEditing(a)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto"><Pencil className="w-3.5 h-3.5" />Editar</button>
                  <button onClick={() => handleDelete(a.id)} className="flex items-center gap-1 text-xs text-destructive hover:underline"><Trash2 className="w-3.5 h-3.5" />Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setEditing({ address: "", label: "", city: "", postal_code: "", province: "", delivery_notes: "", is_default: addresses.length === 0 })} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-border font-medium hover:bg-muted transition-colors" style={{ color }}>
          <Plus className="w-5 h-5" /> Añadir dirección
        </button>
      </div>
    </div>
  );
}