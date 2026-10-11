import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--rinno-nav))] px-4 py-8 relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* RINNO Logo */}
        <div className="text-center mb-8">
          <img
            src="https://media.base44.com/images/public/6ab02bee49c85daaead936e9/25c62580c_LOGODEFINITIVO.png"
            alt="RINNO — Soluciones que impulsan"
            className="w-48 max-w-[80%] h-auto object-contain mx-auto"
          />
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-heading font-bold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}