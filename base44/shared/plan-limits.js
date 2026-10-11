// Server-side admission checks. These reads do not provide a transactional quota.
export class PlanLimitError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}
async function rows(entity, filter) {
  const result = [];
  for (let skip = 0; ; skip += 200) {
    const page = await entity.filter(filter, 'id', 200, skip);
    result.push(...page);
    if (page.length < 200) return result;
  }
}
export async function assertPlanCapacity(client, businessId, resource, targetUser) {
  if (!['products', 'users'].includes(resource)) throw new Error('Unknown plan resource');
  const e = client.asServiceRole.entities;
  // Role edits for an existing team member do not consume another seat.
  if (resource === 'users' && targetUser &&
      (targetUser.data?.business_id || targetUser.business_id) === businessId &&
      ['business_owner', 'business_staff'].includes(targetUser.data?.rinno_role || targetUser.rinno_role)) return;
  const subscriptions = (await rows(e.Subscription, { business_id: businessId }))
    .filter(s => ['active', 'trial'].includes(s.status));
  if (subscriptions.length !== 1) throw new PlanLimitError('Revisa la suscripción del negocio antes de añadir registros.');
  if (subscriptions[0].billing_exempt === true) return; // Courtesy tenants keep all operational capacity without billable plan limits.
  const plan = await e.Plan.get(subscriptions[0].plan_id);
  const limit = plan?.[`max_${resource}`];
  if (!plan || !Number.isInteger(limit) || limit < 0) throw new PlanLimitError('El plan no tiene un límite válido configurado.');
  if (limit === 0) return; // Schema contract: zero means unlimited.
  const records = await rows(resource === 'products' ? e.Product : e.User, { business_id: businessId });
  const count = resource === 'products' ? records.length : records.filter(u =>
    ['business_owner', 'business_staff'].includes(u.data?.rinno_role || u.rinno_role)).length;
  if (count >= limit) throw new PlanLimitError(`Has alcanzado el límite de ${resource === 'products' ? 'productos' : 'usuarios del equipo'} de tu plan (${limit}).`);
}
