import StoreHero from '@/components/store/StoreHero';
import TemplateHero from '@/components/store/TemplateHero';
import { resolveBranding } from '@/lib/templates';

// Template Engine V2 — storefront skin wrapper.
// Phase 1: reproduces the exact V1 hero decision so no storefront changes
// visually. The classic skin (fresh-classic) keeps the minimal StoreHero
// fallback when the business has not customized cover/headline/tagline;
// every other skin renders TemplateHero. Later phases can swap in distinct
// skin components keyed by branding.storefront.skin.
export default function StorefrontSkin({ business, onAction }) {
  const branding = resolveBranding(business);
  const skin = branding.storefront.skin;
  if (skin === 'classic' && !business.cover_image && !business.headline && !business.tagline) {
    return <StoreHero primaryColor={branding.shared.primaryColor} onShop={onAction} />;
  }
  return <TemplateHero business={business} onAction={onAction} />;
}