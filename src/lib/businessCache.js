// Dashboard Business cache (Template Engine V2).
//
// The dashboard shell needs the Business record to resolve V2 branding (logo,
// template_id, colors). Cached per business_id so navigation between dashboard
// pages doesn't refetch on every mount.
//
// Invalidation is EXPLICIT and correctness-focused: after a Super Admin save
// (template_id / appearance_config / logo / colors / branding) the editor calls
// invalidateBusinessCache(bid). This deletes the entry, notifies in-tab
// listeners, and broadcasts to other tabs. The dashboard hook subscribes and
// refetches fresh, so a branding/template change surfaces without a hard
// refresh.
//
// Cache structure: Map<bid, businessRecord> (module-level, per tab).
// Key: business_id (string).
// Read: on AppLayout mount (useDashboardBusiness) and on invalidation refetch.
// Write: after a successful Business.get; replaced on refetch.
// TTL: none (held until explicitly invalidated).
// Invalidated by: invalidateBusinessCache(bid) — called by the appearance
//   editor after a successful save; invalidateAllBusinessCache() — on logout.
// Cross-tab: BroadcastChannel("rinno-business") carries {type:'invalidate',bid}
//   to other open tabs of the same app; each tab deletes its entry and
//   refetches if its dashboard is mounted. Same-origin only (standard web API).
//   If BroadcastChannel is unavailable, same-tab invalidation still works and
//   cross-tab degrades to "refreshes on next navigation/reload".
// Logout: invalidateAllBusinessCache() clears every entry so a different user
//   logging into the same SPA session never sees the previous user's branding.
// Change of business: cache is keyed by bid; a different bid is a different
//   entry, so switching business never reuses another business's branding.
// Super Admin → dashboard: Super Admin enters support mode for a business;
//   that bid is cached like any other. Entering/exiting support changes bid;
//   the cache for the previous bid is retained (harmless) and the new bid is
//   fetched fresh on first mount.
const cache = new Map();
const listeners = new Set(); // fn(invalidatedBid: string | null)
const channel = (typeof BroadcastChannel !== 'undefined')
  ? new BroadcastChannel('rinno-business')
  : null;

if (channel) {
  channel.onmessage = (ev) => {
    const msg = ev.data;
    if (msg && msg.type === 'invalidate' && msg.bid) {
      cache.delete(msg.bid);
      listeners.forEach((fn) => fn(msg.bid));
    }
  };
}

export function getCachedBusiness(bid) {
  return bid ? (cache.get(bid) || null) : null;
}

export function setCachedBusiness(bid, business) {
  if (bid && business) cache.set(bid, business);
}

// Invalidate one business entry (same tab + cross-tab). Called after a save.
export function invalidateBusinessCache(bid) {
  if (!bid) return;
  cache.delete(bid);
  listeners.forEach((fn) => fn(bid));
  if (channel) {
    try { channel.postMessage({ type: 'invalidate', bid }); } catch { /* channel closed */ }
  }
}

// Invalidate every entry (logout / hard reset). No cross-tab broadcast needed
// for logout (each tab manages its own session), but local listeners fire.
export function invalidateAllBusinessCache() {
  cache.clear();
  listeners.forEach((fn) => fn(null));
}

// Subscribe to cache invalidation. Returns an unsubscribe function. The
// listener receives the invalidated business_id, or null for a full clear.
export function onBusinessCacheInvalidation(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}