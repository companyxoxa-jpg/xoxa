import { templateFor } from '../../../base44/shared/templates.js';
export default function TemplateHero({ business, onAction, booking = false }) {
  const template = templateFor(business);
  const brandStyle = /** @type {import('react').CSSProperties} */ ({ '--brand': business.primary_color || template.color, '--brand-secondary': business.secondary_color || template.color });
  return <section className={`template-hero template-${template.layout}`} style={brandStyle}>
    <div className="template-copy">
      <p className="template-eyebrow">{booking ? 'Tu próxima cita empieza aquí' : 'Tu comercio de confianza'}</p>
      <h1>{business.headline || template.title}</h1>
      <p className="template-subtitle">{business.tagline || template.subtitle}</p>
      <button className="rinno-action" onClick={onAction}>{booking ? 'Elegir mi servicio' : 'Ver productos'} <span aria-hidden="true">↗</span></button>
      <p className="template-caption">{business.city || 'Cerca de ti'} · Atención personalizada</p>
    </div>
    <img src={business.cover_image || template.image} alt={business.business_name} className="template-image" />
  </section>;
}
