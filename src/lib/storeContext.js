import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Centralized storefront context resolver — single source of truth for resolving
// a Business by slug (today) or hostname (future). All storefront + account pages
// use this hook to get business branding. Backend functions resolve independently
// server-side; this is for display only.

// Module-level cache: avoids re-fetching branding on every page navigation
// within the same storefront session.
const brandingCache = {};

export function useStoreBranding(requestedSlug) {
  const slug = requestedSlug || getLastStoreSlug();
  const [data, setData] = useState(brandingCache[slug] || null);
  const [loading, setLoading] = useState(!brandingCache[slug]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    setError(null); setLoading(true);
    if (brandingCache[slug]) { setData(brandingCache[slug]); setLoading(false); return; }

    setData(null);
    let active = true;
    (async () => {
      try {
        const res = await base44.functions.invoke("ResolveBusiness", { slug });
        if (!active) return;
        brandingCache[slug] = res.data;
        setData(res.data);
      } catch (e) {
        if (!active) return;
        setError(e.response?.data?.error || "No se pudo cargar la tienda");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  return {
    business: data?.business || null,
    settings: data?.settings || null,
    loading,
    error,
    primaryColor: data?.business?.primary_color || "#16A34A",
  };
}

// Invalidate cached branding for a store slug. Called after Super Admin edits a
// business identity (logo, colors, name) so the storefront re-fetches fresh
// branding on next load/navigation instead of serving stale cached data.
export function invalidateStoreBranding(slug) {
  if (slug) delete brandingCache[slug];
}

// Remember the last visited store slug — used by BusinessRoute to redirect
// customers back to their storefront instead of the admin panel.
export function rememberStoreSlug(slug) {
  if (slug) localStorage.setItem("rinno_last_store", slug);
}

export function getLastStoreSlug() {
  return localStorage.getItem("rinno_last_store") || null;
}
