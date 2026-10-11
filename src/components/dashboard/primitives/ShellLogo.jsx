import { cn } from "@/lib/utils";

// Template Engine V2 — shared dashboard logo. Resolves logo URL → <img
// object-contain>, or an initials fallback. The common logic (logo-or-initials
// decision, sizing, object-contain, alt text, gradient/font-size) lives here;
// each shell keeps control of the look via props (radius, font, solid vs
// gradient) and decides where to place it. Does NOT impose a single appearance.
export function ShellLogo({ branding, size = 32, radiusClass = "rounded-md", radiusPx, fontClass = "font-bold", fallbackLetter = "R", solid = false }) {
  const { logo, businessName, primaryColor, secondaryColor } = branding.shared;
  const radiusStyle = radiusPx != null ? { borderRadius: radiusPx } : {};
  const background = solid ? primaryColor : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;
  if (logo) {
    return <img src={logo} alt={businessName} className={cn("object-contain", radiusClass)} style={{ width: size, height: size, ...radiusStyle }} />;
  }
  return (
    <div className={cn("flex items-center justify-center text-white shrink-0", radiusClass, fontClass)} style={{ width: size, height: size, background, fontSize: Math.round(size * 0.34), ...radiusStyle }}>
      {(businessName || fallbackLetter).slice(0, 2).toUpperCase()}
    </div>
  );
}