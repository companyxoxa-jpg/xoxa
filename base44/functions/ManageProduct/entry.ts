import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { withBusinessMutation, MutationLockError } from '../../shared/business-mutation.js';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { assertPlanCapacity, PlanLimitError } from '../../shared/plan-limits.js';
import { getUserBusinessId, canManageProducts, createAuditLog, sanitizeData, PRODUCT_ALLOWLIST } from '../../shared/rinno.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    // Authorization: owner or staff (or super admin in support mode)
    if (!canManageProducts(user)) {
      return Response.json({ error: 'No tienes permisos para gestionar productos' }, { status: 403 });
    }

    const bid = getUserBusinessId(user);
    if (!bid) {
      return Response.json({ error: 'Sin negocio asociado' }, { status: 403 });
    }

    const body = await req.json();
    const { action, product_id, product_data, price_updates } = body;

    if (action === 'create') {
      if (!product_data?.name || product_data?.price == null || !product_data?.unit_type) {
        return Response.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
      }
      const sanitized = sanitizeData(product_data, PRODUCT_ALLOWLIST);
      const valErr = validateProductFields(sanitized);
      if (valErr) return Response.json({ error: valErr }, { status: 400 });
      const data = { ...sanitized, business_id: bid };
      return await withBusinessMutation(base44, bid, async () => {
      await assertPlanCapacity(base44, bid, 'products');
      const product = await base44.asServiceRole.entities.Product.create(data);
      await createAuditLog(base44, user, 'product.created', { entity_type: 'Product', entity_id: product.id, metadata: { name: product.name } });
      return Response.json({ product });
      });
    }

    if (action === 'update') {
      let product;
      try {
        product = await base44.asServiceRole.entities.Product.get(product_id);
      } catch (e) {
        return Response.json({ error: 'Producto no encontrado' }, { status: 404 });
      }
      if (!product || product.business_id !== bid) {
        return Response.json({ error: 'Producto no encontrado' }, { status: 404 });
      }
      const sanitized = sanitizeData(product_data, PRODUCT_ALLOWLIST);
      const valErr = validateProductFields(sanitized);
      if (valErr) return Response.json({ error: valErr }, { status: 400 });
      const updated = await base44.asServiceRole.entities.Product.update(product_id, sanitized);
      return Response.json({ product: updated });
    }

    if (action === 'bulk_price_update') {
      if (!Array.isArray(price_updates)) {
        return Response.json({ error: 'Formato inválido' }, { status: 400 });
      }
      const products = await base44.asServiceRole.entities.Product.filter({ business_id: bid });
      const productMap = {};
      products.forEach(p => productMap[p.id] = p);

      const validUpdates = [];
      for (const u of price_updates) {
        if (!productMap[u.id]) continue;
        const priceStr = String(u.price).replace(',', '.');
        const price = Math.round(Number(priceStr) * 100);
        if (!Number.isFinite(price) || price < 0) continue;
        validUpdates.push({ id: u.id, price });
      }
      if (validUpdates.length > 0) {
        await base44.asServiceRole.entities.Product.bulkUpdate(validUpdates);
      }
      return Response.json({ updated: validUpdates.length });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    if (error instanceof MutationLockError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof PlanLimitError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'No pudimos guardar el producto. Inténtalo nuevamente.' }, { status: 500 });
  }
}

function validateProductFields(data) {
  if ('price' in data) {
    const price = Number(data.price);
    if (!Number.isFinite(price) || price < 0) return 'Precio no válido';
    data.price = Math.round(price);
  }
  if ('compare_at_price' in data && data.compare_at_price != null) {
    const cap = Number(data.compare_at_price);
    if (!Number.isFinite(cap) || cap < 0) return 'Precio anterior no válido';
    data.compare_at_price = Math.round(cap);
  }
  if ('cost_price' in data && data.cost_price != null) {
    const cp = Number(data.cost_price);
    if (!Number.isFinite(cp) || cp < 0) return 'Coste no válido';
    data.cost_price = Math.round(cp);
  }
  if ('minimum_quantity' in data && data.minimum_quantity != null) {
    const mq = Number(data.minimum_quantity);
    if (!Number.isFinite(mq) || mq <= 0) return 'Cantidad mínima no válida';
    data.minimum_quantity = mq;
  }
  if ('quantity_step' in data && data.quantity_step != null) {
    const qs = Number(data.quantity_step);
    if (!Number.isFinite(qs) || qs <= 0) return 'Incremento de cantidad no válido';
    data.quantity_step = qs;
  }
  return null;
}
