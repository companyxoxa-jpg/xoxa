import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Store } from "lucide-react";
import { useStoreBranding } from "@/lib/storeContext";
import { isCustomer } from "@/lib/rinno";
import { useAuth } from "@/lib/AuthContext";
import { safeReturnTo } from "@/lib/authReturnTo";

// Storefront login — visually belongs to the Business (logo, name, colors).
// Internally uses Base44 Auth. After login, redirects customers to the store
// account page; redirects admin/owner/staff to the admin panel.
export default function StoreLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { business, loading: bizLoading, primaryColor } = useStoreBranding(slug);
  const { user } = useAuth();
  const color = primaryColor;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestedReturnTo = safeReturnTo();
  const storePrefix = `/store/${slug}`;
  const defaultAccount = business?.business_mode === 'ASSOCIATION' ? `${storePrefix}/account/association` : `${storePrefix}/account`;
  const returnTo = (requestedReturnTo === storePrefix || requestedReturnTo.startsWith(`${storePrefix}/`)) ? requestedReturnTo : defaultAccount;

  // If already authenticated, redirect based on role
  useEffect(() => {
    if (user) {
      if (isCustomer(user)) navigate(returnTo, { replace: true });
      else navigate("/", { replace: true });
    }
  }, [user, returnTo, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      // Hard redirect so auth provider re-initializes with the new role
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Email o contraseña incorrectos");
    } finally { setLoading(false); }
  }

  if (bizLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: color + "15" }}>
            {business?.logo ? <img src={business.logo} alt="" className="w-full h-full rounded-2xl object-cover" /> : <Store className="w-7 h-7" style={{ color }} />}
          </div>
          <h1 className="font-heading font-bold text-xl text-foreground">{business?.business_name || "Tienda"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{business?.business_mode==='ASSOCIATION'?'Inicia sesión para acceder a tu carné, actividades y área privada':'Inicia sesión para consultar tus pedidos y comprar más rápido'}</p>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" autoComplete="email" autoFocus placeholder="tu@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-12" required />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link to={`/store/${slug}/forgot-password`} className="text-xs hover:underline" style={{ color }}>¿Olvidaste tu contraseña?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 h-12" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" style={{ backgroundColor: color }} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Accediendo...</> : "Iniciar sesión"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿No tienes cuenta?{" "}
          <Link to={`/store/${slug}/register`} className="font-medium hover:underline" style={{ color }}>{business?.business_mode==='ASSOCIATION'?'Activar acceso de socio':'Crear cuenta'}</Link>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-6">Tecnología de <span className="font-semibold">RINNO</span></p>
      </div>
    </div>
  );
}

