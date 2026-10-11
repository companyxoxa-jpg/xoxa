import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { withBusinessMutation, MutationLockError } from '../../shared/business-mutation.js';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { getUserBusinessId, canManageConfig, createAuditLog, sanitizeData, BUSINESS_ALLOWLIST, SETTINGS_ALLOWLIST } from '../../shared/rinno.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    // Authorization: ONLY owner (or super admin in support mode acting as owner)
    if (!canManageConfig(user)) {
      return Response.json({ error: 'Solo el propietario puede modificar la configuración del comercio' }, { status: 403 });
    }

    const bid = getUserBusinessId(user);
    if (!bid) {
      return Response.json({ error: 'Sin negocio asociado' }, { status: 403 });
    }

    const body = await req.json();
    const { business_data, settings_data } = body;

    return await withBusinessMutation(base44, bid, async () => {
    if (business_data) {
      // Allowlist filter — prevents modifying plan_id, status, slug, etc.
      const sanitizedBiz = sanitizeData(business_data, BUSINESS_ALLOWLIST);
      for (const field of ['primary_color', 'secondary_color']) {
        if (field in sanitizedBiz && sanitizedBiz[field] && !/^#[0-9a-f]{6}$/i.test(String(sanitizedBiz[field]))) {
          return Response.json({ error: `Campo ${field} inválido` }, { status: 400 });
        }
      }
      if (Object.keys(sanitizedBiz).length > 0) {
        await base44.asServiceRole.entities.Business.update(bid, sanitizedBiz);
      }
    }

    if (settings_data) {
      // Allowlist filter — prevents modifying business_id or audit fields
      const sanitizedSettings = sanitizeData(settings_data, SETTINGS_ALLOWLIST);
      // Server-side numeric validation (frontend is NOT authoritative)
      const centsFields = ['minimum_order', 'delivery_fee', 'free_delivery_threshold'];
      const intFields = ['min_lead_time_minutes', 'max_future_days'];
      const floatFields = ['max_delivery_radius_km'];
      for (const f of [...centsFields, ...intFields]) {
        if (f in sanitizedSettings && sanitizedSettings[f] !== null && sanitizedSettings[f] !== '') {
          const n = Number(sanitizedSettings[f]);
          if (!Number.isFinite(n) || n < 0) {
            return Response.json({ error: `Campo ${f} inválido (debe ser un número ≥ 0)` }, { status: 400 });
          }
          sanitizedSettings[f] = Math.round(n);
        }
      }
      for (const f of floatFields) {
        if (f in sanitizedSettings && sanitizedSettings[f] !== null && sanitizedSettings[f] !== '') {
          const n = Number(sanitizedSettings[f]);
          if (!Number.isFinite(n) || n < 0) {
            return Response.json({ error: `Campo ${f} inválido (debe ser un número ≥ 0)` }, { status: 400 });
          }
          sanitizedSettings[f] = n;
        }
      }
      if (Object.keys(sanitizedSettings).length > 0) {
        const settingsList = await base44.asServiceRole.entities.BusinessSettings.filter({ business_id: bid });
        if (settingsList.length > 0) {
          await base44.asServiceRole.entities.BusinessSettings.update(settingsList[0].id, sanitizedSettings);
        } else {
          await base44.asServiceRole.entities.BusinessSettings.create({ ...sanitizedSettings, business_id: bid });
        }
      }
    }

    // Audit log — server-side identity
    await createAuditLog(base44, user, 'business.config_updated', {
      entity_type: 'Business', entity_id: bid,
      metadata: { updated_business: !!business_data, updated_settings: !!settings_data },
    });

    return Response.json({ ok: true });
    });
  } catch (error) {
    if (error instanceof MutationLockError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'No pudimos guardar la configuración. Inténtalo nuevamente.' }, { status: 500 });
  }
}
