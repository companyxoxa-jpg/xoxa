// Trusted provisioning only. Tenant reads still use the caller SDK and RLS.
// Run before linking users; an uninitialized Business remains unreadable.
export async function initializeBusinessTenant(businessEntity, business) {
  if (typeof business?.id !== 'string' || !business.id.trim()) throw new Error('Business ID required');
  if (business.tenant_id === business.id) return business;
  if (business.tenant_id != null && business.tenant_id !== '') throw new Error('Business tenant mismatch');
  await businessEntity.update(business.id, { tenant_id: business.id });
  return { ...business, tenant_id: business.id };
}
