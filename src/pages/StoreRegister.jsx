import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Phone, User as UserIcon, Loader2, Store } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useStoreBranding } from "@/lib/storeContext";

export default function StoreRegister() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { business, loading: bizLoading, primaryColor } = useStoreBranding(slug);
  const color = primaryColor;
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  // Prefill from guest order data (if coming from order confirmation)
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem("rinno_register_prefill");
      if (prefill) {
        const p = JSON.parse(prefill);
        setForm(prev => ({ ...prev, first_name: p.first_name || "", last_name: p.last_name || "", email: p.email || "", phone: p.phone || "" }));
        sessionStorage.removeItem("rinno_register_prefill");
      }
    } catch (e) { /* ignore */ }
  }, []);

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })); }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    if (!form.first_name.trim() || !form.phone.trim()) { setError("Nombre y teléfono son obligatorios"); return; }
    if (!form.email.trim()) { setError("El email es obligatorio"); return; }
    if (form.password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    if (form.password !== form.confirmPassword) { setError("Las contraseñas no coinciden"); return; }
    if (!privacy) { setError("Debes aceptar la política de privacidad"); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email: form.email, password: form.password });
      setStep("otp");
    } catch (err) { setError(err.message || "No se pudo crear la cuenta. Quizá ya existe."); }
    finally { setLoading(false); }
  }

  async function handleVerify() {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email: form.email, otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      await base44.functions.invoke("RegisterCustomer", {
        slug, first_name: form.first_name, last_name: form.last_name, phone: form.phone,
      });
      window.location.href = business?.business_mode === 'ASSOCIATION' ? `/store/${slug}/account/association` : `/store/${slug}/account`;
    } catch (err) { setError(err.message || "Código no válido"); }
    finally { setLoading(false); }
  }

  async function handleResend() {
    try { await base44.auth.resendOtp(form.email); } catch (err) { setError(err.message || "No se pudo reenviar"); }
  }

  if (bizLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>;

  const BrandingLogo = () => (
    <div className="text-center mb-8">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: color + "15" }}>
        {business?.logo ? <img src={business.logo} alt="" className="w-full h-full rounded-2xl object-cover" /> : <Store className="w-7 h-7" style={{ color }} />}
      </div>
      <h1 className="font-heading font-bold text-xl text-foreground">{step === "otp" ? "Verifica tu correo" : business?.business_mode==='ASSOCIATION'?`Activa tu acceso a ${business?.business_name||'la asociación'}`:`Crear cuenta en ${business?.business_name || "la tienda"}`}</h1>
      <p className="text-sm text-muted-foreground mt-1">{step === "otp" ? "Introduce el código enviado a tu correo" : business?.business_mode==='ASSOCIATION'?"Usa el mismo correo que figura en tu ficha de socio":"Regístrate para guardar tus pedidos y comprar más rápido"}</p>
    </div>
  );

  if (step === "otp") {
    const maskedEmail = form.email.replace(/(^.).+(@)/, "$1***$2");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <BrandingLogo />
          {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>}
          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="w-full h-12" style={{ backgroundColor: color }} onClick={handleVerify} disabled={loading || otpCode.length < 6}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</> : "Verificar"}
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-4">
            ¿No recibiste el código? <button onClick={handleResend} className="font-medium hover:underline" style={{ color }}>Reenviar</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <BrandingLogo />
        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>}
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">Nombre *</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="first_name" value={form.first_name} onChange={e => set("first_name", e.target.value)} className="pl-10 h-11" placeholder="María" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Apellidos</Label>
              <Input id="last_name" value={form.last_name} onChange={e => set("last_name", e.target.value)} className="h-11" placeholder="García" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" value={form.email} onChange={e => set("email", e.target.value)} className="pl-10 h-11" placeholder="tu@ejemplo.com" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="phone" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} className="pl-10 h-11" placeholder="600 123 456" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type="password" value={form.password} onChange={e => set("password", e.target.value)} className="pl-10 h-11" placeholder="Mínimo 8 caracteres" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Repetir contraseña *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} className="pl-10 h-11" placeholder="••••••••" required />
            </div>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} className="w-4 h-4 rounded mt-0.5" />
            <span className="text-xs text-muted-foreground">Acepto la política de privacidad y los términos de servicio</span>
          </label>
          <Button type="submit" className="w-full h-12" style={{ backgroundColor: color }} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando cuenta...</> : "Crear cuenta"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link to={`/store/${slug}/login`} className="font-medium hover:underline" style={{ color }}>Iniciar sesión</Link>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-6">Tecnología de <span className="font-semibold">RINNO</span></p>
      </div>
    </div>
  );
}
