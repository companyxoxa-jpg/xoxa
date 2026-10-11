export function calculateCompliance(policies = [], consents = []) {
  const active = policies.filter(p => p.status === 'active');
  const accepted = new Map(consents.filter(c => !c.revoked_at).map(c => [`${c.policy_id}:${c.policy_version}`, c]));
  const items = active.map(policy => ({
    policy,
    accepted: accepted.has(`${policy.id}:${policy.version}`),
    consent: accepted.get(`${policy.id}:${policy.version}`) || null,
  }));
  const missing = items.filter(x => x.policy.required && !x.accepted);
  return { compliant: missing.length === 0, items, missing };
}

export async function getMemberCompliance(entities, businessId, memberId) {
  if (!entities?.AssociationLegalPolicy?.filter || !entities?.MemberConsent?.filter) return calculateCompliance([], []);
  const [policies, consents] = await Promise.all([
    entities.AssociationLegalPolicy.filter({ business_id: businessId, status: 'active' }, 'effective_at', 100),
    entities.MemberConsent.filter({ business_id: businessId, member_id: memberId }, '-accepted_at', 500),
  ]);
  return calculateCompliance(policies, consents);
}

export async function requireMemberCompliance(entities, businessId, memberId) {
  const result = await getMemberCompliance(entities, businessId, memberId);
  if (!result.compliant) {
    const error = new Error('El socio debe aceptar la documentación obligatoria vigente');
    error.status = 409;
    throw error;
  }
  return result;
}

export function meetsMinimumAge(birthDate, minimumAge, now = new Date()) {
  if (!minimumAge) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(birthDate || ''))) return false;
  const [year, month, day] = birthDate.split('-').map(Number);
  let age = now.getUTCFullYear() - year;
  const beforeBirthday = now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  if (beforeBirthday) age--;
  return age >= minimumAge;
}
