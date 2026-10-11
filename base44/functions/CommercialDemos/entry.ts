import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isSuperAdmin, isCommercial } from '../../shared/rinno.ts';

const safe = b => ({ id:b.id, business_name:b.business_name, slug:b.slug, business_type:b.business_type, business_mode:b.business_mode, template_id:b.template_id, appearance_config:b.appearance_config, logo:b.logo, favicon:b.favicon, primary_color:b.primary_color, secondary_color:b.secondary_color, cover_image:b.cover_image, headline:b.headline, tagline:b.tagline, contact_phone:b.contact_phone, contact_email:b.contact_email, address:b.address, timezone:b.timezone, demo_key:b.demo_key });

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (!isSuperAdmin(user) && !await isCommercial(base44, user)) return Response.json({ error: 'Acceso denegado' }, { status: 403 });
    const body = await req.json();
    const all = await base44.asServiceRole.entities.Business.list('business_name', 200);
    const demos = all.filter(b => b.demo_key || /^rinno-demo-\d+$/i.test(b.slug || ''));
    if (body.action === 'get') {
      const found = demos.find(b => b.id === body.business_id);
      return found ? Response.json({ business: safe(found) }) : Response.json({ error: 'Demo no encontrada' }, { status: 404 });
    }
    return Response.json({ demos: demos.map(safe) });
  } catch { return Response.json({ error: 'No se pudieron cargar las demos' }, { status: 500 }); }
}
