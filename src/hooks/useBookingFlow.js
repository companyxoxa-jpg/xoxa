import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

// Template Engine V2 — shared booking flow hook.
// Extracted from BookingStorefront so any V2 skin can embed the SAME booking
// logic (catalog → availability → reserve) without duplicating it. The legacy
// BookingStorefront still uses this hook, so there is a single source of truth
// for the BookingPublic calls, request-id handling, and state machine.
export function useBookingFlow(slug) {
  const [catalog, setCatalog] = useState(null);
  const [service, setService] = useState(null);
  const [professional, setProfessional] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const requestId = useRef(crypto.randomUUID());

  useEffect(() => {
    let active = true;
    base44.functions.invoke("BookingPublic", { action: "catalog", slug })
      .then(r => { if (active) setCatalog(r.data); })
      .catch(e => { if (active) setError(e.response?.data?.error || "No se pudieron cargar los servicios."); });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    let active = true;
    setTime(""); setSlots([]); requestId.current = crypto.randomUUID();
    if (!date || !service || !professional) return;
    setLoadingSlots(true); setError("");
    base44.functions.invoke("BookingPublic", { action: "availability", slug, date, service_id: service.id, professional_id: professional.id })
      .then(r => { if (active) setSlots(r.data.slots); })
      .catch(e => { if (active) setError(e.response?.data?.error || "No se pudo consultar la disponibilidad."); })
      .finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; };
  }, [date, service, professional, slug]);

  async function reserve() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const res = await base44.functions.invoke("BookingPublic", {
        action: "reserve", slug, date, time,
        service_id: service.id, professional_id: professional.id,
        customer_name: name, phone, customer_email: email, privacy_accepted: consent,
        request_id: requestId.current,
      });
      setReceipt(res.data.appointment);
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo reservar. Puedes reintentar sin duplicar tu solicitud.");
    } finally { setBusy(false); }
  }

  function selectService(s) { setService(s); setProfessional(null); setDate(""); }
  function selectProfessional(p) { setProfessional(p); setDate(""); }
  function selectTime(t) { setTime(t); requestId.current = crypto.randomUUID(); }
  function reset() { setReceipt(null); }

  return {
    catalog, service, professional, date, time, slots, error, busy, loadingSlots,
    receipt, name, phone, email, consent,
    setDate, setName, setPhone, setEmail, setConsent,
    selectService, selectProfessional, selectTime, reserve, reset,
  };
}
