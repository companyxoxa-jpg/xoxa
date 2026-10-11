// Local migration of schema definitions only. Never invokes the Base44 API.
import fs from 'node:fs';
import { SUPER_ADMIN_EMAILS } from '../base44/shared/rinno.ts';

const privileged = { $or: SUPER_ADMIN_EMAILS.map(email => ({ user_condition: { role: 'admin', email } })) };
const backendOnly = new Set(['Activity', 'Credential', 'Enrollment', 'Member', 'MemberFee', 'MemberPayment', 'Membership', 'MembershipPlan', 'PaymentAllocation', 'RoleAssignment']);
function restrictAdmin(rule) {
  if (!rule || typeof rule !== 'object') return rule;
  if (rule.user_condition?.role === 'admin' && Object.keys(rule.user_condition).length === 1) return structuredClone(privileged);
  return Object.fromEntries(Object.entries(rule).map(([key, value]) => [key, Array.isArray(value) ? value.map(restrictAdmin) : restrictAdmin(value)]));
}
for (const file of fs.readdirSync('base44/entities')) {
  const path = `base44/entities/${file}`;
  const original = fs.readFileSync(path, 'utf8');
  const s = JSON.parse(original);
  const before = JSON.stringify(s);
  if (s.name === 'User') {
    delete s.properties.role;
    s.required = (s.required || []).filter(field => field !== 'role');
    s.properties.support_business_id ??= { type: 'string', description: 'Support context set exclusively by the backend.' };
    for (const field of ['business_id', 'rinno_role', 'support_business_id']) {
      s.properties[field].rls = { write: false };
    }
  } else if (s.name === 'SavedAddress') {
    // Backend mutations assign explicit ownership; creator ownership supports legacy rows.
    s.rls = { read: { $or: [{ 'data.owner_user_id': '{{user.id}}' }, { created_by_id: '{{user.id}}' }, privileged] }, create: false, update: false, delete: false };
    s.properties.business_id.rls = { write: false };
    s.properties.owner_user_id = { type: 'string', description: 'Authenticated customer assigned exclusively by the backend.', rls: { write: false } };
  } else {
    // All writes in the existing UI already go through server functions.
    s.rls = { ...restrictAdmin(s.rls), create: false, update: false, delete: false };
    if (backendOnly.has(s.name)) s.rls.read = false;
    // Owners use ManageBilling; staff must not bypass that endpoint to read billing.
    if (s.name === 'Subscription') s.rls.read = structuredClone(privileged);
  }
  if (JSON.stringify(s) !== before) fs.writeFileSync(path, JSON.stringify(s, null, 2) + '\n');
}
