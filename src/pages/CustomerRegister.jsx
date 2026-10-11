import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Phone, User as UserIcon, Loader2, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const returnTo = safeReturnTo();

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
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta. Quizá ya existe.");
    } finally { setLoading(false); }
  }

  async function handleVerify() {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email: form.email, otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      // Set customer role and profile data via backend
      await base44.functions.invoke("RegisterCustomer", {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
      });
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Código no válido");
    } finally { setLoading(false); }
  }

  async function handleResend() {
    try {
      await base44.auth.resendOtp(form.email);
      toast({ title: "Código enviado", description: "Revisa tu correo." });
    } catch (err) { setError(err.message || "No se pudo reenviar"); }
  }

  if (step === "otp") {
    const maskedEmail = form.email.replace(/(^.).+(@)/, "$1***$2");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading font-bold text-xl text-foreground">Verifica tu correo</h1>
            <p className="text-sm text-muted-foreground mt-1">Introduce el código enviado a {maskedEmail}</p>
          </div>
          {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>}
          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
              <InputOTPGroup>
                <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button className="w-full h-12" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verificando...</> : "Verificar"}
          </Button>
          <p className="text-center text-sm text-muted-foreground mt-4">
            ¿No recibiste el código?{" "}
            <button onClick={handleResend} className="text-primary font-medium hover:underline">Reenviar</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-heading font-bold text-xl text-foreground">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground mt-1">Regístrate para gestionar tus pedidos</p>
        </div>
        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>}
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando cuenta...</> : "Crear cuenta"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link to={"/login" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")} className="text-primary font-medium hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}