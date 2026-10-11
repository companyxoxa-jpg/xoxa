import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getBusinessId } from "@/lib/rinno";
import { base44 } from "@/api/base44Client";

// Single operational source for new-order alerts inside the business panel.
// Polls ONLY pending orders for the current business (multi-tenant isolated by
// business_id + RLS), every 12s. Provides: pendingCount, latestPending, known-id
// detection (for sound), document.title, sound preference, and acceptOrder.
const OrdersAlertContext = createContext(null);

const POLL_INTERVAL = 12000;
const SOUND_PREF_KEY = "rinno_sound_new_orders";
const BASE_TITLE = "RINNO";

export function OrdersAlertProvider({ children }) {
  const { user } = useAuth();
  const bid = getBusinessId(user);

  const [pendingOrders, setPendingOrders] = useState([]);
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    try { return localStorage.getItem(SOUND_PREF_KEY) !== "false"; } catch (e) { return true; }
  });

  const knownIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);
  const unlockedRef = useRef(false);
  const audioCtxRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);

  const pendingCount = pendingOrders.length;
  const latestPending = pendingOrders[0] || null;

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Unlock audio on first user interaction (mobile/desktop autoplay policy).
  useEffect(() => {
    function unlock() {
      unlockedRef.current = true;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioCtxRef.current = new Ctx();
      } catch (e) { /* silent */ }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  const playBeep = useCallback(() => {
    if (!soundEnabledRef.current || !unlockedRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      // Two short ascending beeps — one alert regardless of how many new orders.
      [[880, 0, 0.22], [1175, 0.26, 0.22]].forEach(([freq, start, dur]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now + start);
        g.gain.exponentialRampToValueAtTime(0.25, now + start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        o.start(now + start); o.stop(now + start + dur + 0.02);
      });
    } catch (e) { /* silent — never surface audio errors to the merchant */ }
  }, []);

  // Polling — only when a business context exists.
  useEffect(() => {
    if (!bid) { setPendingOrders([]); isFirstLoadRef.current = true; knownIdsRef.current = new Set(); return; }
    let active = true;

    async function tick() {
      try {
        const ords = await base44.entities.Order.filter({ business_id: bid, order_status: "pending" }, "-created_date", 50);
        if (!active) return;
        const currentIds = new Set(ords.map(o => o.id));
        if (isFirstLoadRef.current) {
          // Baseline: seed known ids, no sound on first load / refresh.
          knownIdsRef.current = currentIds;
          isFirstLoadRef.current = false;
        } else {
          const newIds = [...currentIds].filter(id => !knownIdsRef.current.has(id));
          if (newIds.length > 0) playBeep();
          knownIdsRef.current = new Set([...knownIdsRef.current, ...currentIds]);
        }
        setPendingOrders(ords);
      } catch (e) { /* silent */ }
    }

    tick();
    const interval = setInterval(tick, POLL_INTERVAL);
    return () => { active = false; clearInterval(interval); };
  }, [bid, playBeep]);

  // document.title — always rebuilt from base, never accumulates.
  useEffect(() => {
    if (pendingCount > 0) {
      const word = pendingCount === 1 ? "Pedido nuevo" : "Pedidos nuevos";
      document.title = `(${pendingCount}) ${word} · ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }
    return () => { document.title = BASE_TITLE; };
  }, [pendingCount]);

  const setSoundEnabled = useCallback((v) => {
    setSoundEnabledState(v);
    try { localStorage.setItem(SOUND_PREF_KEY, String(v)); } catch (e) {}
  }, []);

  const removeFromPending = useCallback((orderId) => {
    setPendingOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  const acceptOrder = useCallback(async (orderId) => {
    await base44.functions.invoke("UpdateOrderStatus", { order_id: orderId, new_status: "accepted" });
    removeFromPending(orderId);
  }, [removeFromPending]);

  const value = {
    pendingOrders, pendingCount, latestPending,
    soundEnabled, setSoundEnabled,
    acceptOrder, removeFromPending,
  };

  return <OrdersAlertContext.Provider value={value}>{children}</OrdersAlertContext.Provider>;
}

export function useOrdersAlert() {
  const ctx = useContext(OrdersAlertContext);
  if (!ctx) throw new Error("useOrdersAlert must be used within OrdersAlertProvider");
  return ctx;
}