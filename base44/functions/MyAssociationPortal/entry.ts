import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { isCustomer, resolveBusinessBySlug } from '../../shared/rinno.ts';
import { findLinkableMember } from '../../shared/member-link.js';
import { calculateCompliance } from '../../shared/association-compliance.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (!isCustomer(user)) return Response.json({ error: 'Acceso no autorizado' }, { status: 403 });
    const { slug } = await req.json();
    const business = await resolveBusinessBySlug(base44, slug);
    if (!business || business.business_mode !== 'ASSOCIATION') return Response.json({ error: 'Asociación no encontrada' }, { status: 404 });
    const e = base44.asServiceRole.entities;
    const members = await e.Member.filter({ business_id: business.id, user_id: user.id });
    let member = members[0];
    if (!member && user.email) {
      const linkable = findLinkableMember(await e.Member.filter({ business_id: business.id }, 'member_number', 1000), user);
      if (linkable) member = linkable.user_id === user.id ? linkable : await e.Member.update(linkable.id, { user_id: user.id });
    }
    if (!member) return Response.json({ linked: false, business: { business_name: business.business_name, slug: business.slug } });
    const [activities, enrollments, memberships, credentials, fees, catalog, dispensations, visits, notices, incidents, documents, policies, consents] = await Promise.all([
      e.Activity.filter({ business_id: business.id }, 'start_at', 100),
      e.Enrollment.filter({ business_id: business.id, member_id: member.id }, '-enrolled_at', 200),
      e.Membership.filter({ business_id: business.id, member_id: member.id }, '-start_date', 50),
      e.Credential.filter({ business_id: business.id, member_id: member.id }, '-issued_at', 10),
      e.MemberFee.filter({ business_id: business.id, member_id: member.id }, '-issued_at', 100),
      e.CscCatalogItem.filter({ business_id: business.id, is_active: true }, 'name', 200),
      e.CscDispensation.filter({ business_id: business.id, member_id: member.id }, '-recorded_at', 200),
      e.CscVisit.filter({ business_id: business.id, member_id: member.id }, '-scheduled_at', 100),
      e.CscNotice.filter({ business_id: business.id, status: 'published' }, '-published_at', 100),
      e.AssociationIncident.filter({ business_id: business.id, member_id: member.id }, '-created_date', 100),
      e.AssociationDocument.filter({ business_id: business.id, audience: 'members', status: 'published' }, '-published_at', 100),
      e.AssociationLegalPolicy.filter({ business_id: business.id, status: 'active' }, 'effective_at', 100),
      e.MemberConsent.filter({ business_id: business.id, member_id: member.id }, '-accepted_at', 500),
    ]);
    const compliance = calculateCompliance(policies, consents);
    return Response.json({
      linked: true,
      business: { business_name: business.business_name, slug: business.slug },
      member: { member_number: member.member_number, first_name: member.first_name, last_name: member.last_name, status: member.status },
      memberships: memberships.map(m => ({ id:m.id, plan_name:m.plan_name_snapshot, start_date:m.start_date, end_date:m.end_date, status:m.status })),
      credential: credentials.find(c => c.status === 'active') ? (() => { const c=credentials.find(x=>x.status==='active'); return { status:c.status, version:c.version, issued_at:c.issued_at, expires_at:c.expires_at }; })() : null,
      fees: fees.map(f => ({ id:f.id, concept:f.concept, amount:f.amount, amount_paid:f.amount_paid, due_date:f.due_date, status:f.status })),
      catalog: catalog.map(x => ({ id:x.id, name:x.name, category:x.category, description:x.description, cannabinoid_profile:x.cannabinoid_profile, image:x.image, availability:x.availability })),
      dispensations: dispensations.map(x => ({ id:x.id, catalog_item_id:x.catalog_item_id, quantity_grams:x.quantity_grams, period:x.period, period_total_grams:x.period_total_grams, limit_grams_snapshot:x.limit_grams_snapshot, recorded_at:x.recorded_at })),
      visits: visits.map(x => ({ id:x.id, scheduled_at:x.scheduled_at, status:x.status })),
      notices: notices.map(x => ({ id:x.id, title:x.title, body:x.body, kind:x.kind, published_at:x.published_at })),
      incidents: incidents.map(x => ({ id:x.id, subject:x.subject, description:x.description, priority:x.priority, status:x.status, resolution:x.resolution, resolved_at:x.resolved_at })),
      documents: documents.map(x => ({ id:x.id, title:x.title, description:x.description, category:x.category, legacy_url:x.storage_mode==='legacy_url'||(!x.storage_mode&&x.file_url)?x.file_url:null, published_at:x.published_at })),
      compliance: { compliant: compliance.compliant, items: compliance.items.map(x => ({ policy: { id:x.policy.id, kind:x.policy.kind, title:x.policy.title, version:x.policy.version, content:x.policy.content, required:x.policy.required, minimum_age:x.policy.minimum_age, effective_at:x.policy.effective_at }, accepted:x.accepted, accepted_at:x.consent?.accepted_at || null })) },
      activities: activities.filter(a => a.status === 'published' && a.is_public === true).map(a => ({ id:a.id, title:a.title, description:a.description, start_at:a.start_at, location:a.location, capacity:a.capacity, enrollment_open:a.enrollment_open, enrollment_until:a.enrollment_until })),
      enrollments: enrollments.map(x => ({ id:x.id, activity_id:x.activity_id, status:x.status, enrolled_at:x.enrolled_at })),
    });
  } catch {
    return Response.json({ error: 'No se pudo cargar el área de socios.' }, { status: 500 });
  }
}
