import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, Store } from "lucide-react";
import { useStoreBranding } from "@/lib/storeContext";

// Storefront forgot password — branded with the Business.
// Uses Base44 native resetPasswordRequest. Always shows generic success.
export default function StoreForgotPassword() {
  const { slug } = useParams();
  const { business, loading: bizLoading, primaryColor } = useStoreBranding(slug);
  const color = primaryColor;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try { await base44.auth.resetPasswordRequest(email); } catch { /* always show success */ }
    finally { setLoading(false); setSent(true); }
  }

  if (bizLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: color + "15" }}>
            {business?.logo ? <img src={business.logo} alt="" className="w-full h-full rounded-2xl object-cover" /> : <Store className="w-7 h-7" style={{ color }} />}
          </div>
          <h1 className="font-heading font-bold text-xl text-foreground">Recuperar contraseña</h1>
          <p className="text-sm text-muted-foreground mt-1">{business?.business_name || "Tienda"}</p>
        </div>
        {sent ? (
          <div className="text-center">
            <p className="text-sm text-foreground mb-6">Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña en breve.</p>
            <Link to={`/store/${slug}/login`} className="inline-block py-3 px-6 rounded-xl font-medium text-white" style={{ backgroundColor: color }}>Volver a iniciar sesión</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" autoFocus placeholder="tu@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-12" required />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 font-medium" style={{ backgroundColor: color }} disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : "Enviar enlace"}
            </Button>
          </form>
        )}
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to={`/store/${slug}/login`} className="font-medium hover:underline" style={{ color }}>Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}