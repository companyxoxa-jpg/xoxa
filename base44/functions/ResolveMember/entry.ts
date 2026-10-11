import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { resolveMember, AssociationError } from '../../shared/associations.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    const result = await resolveMember(base44, user);
    return Response.json(result);
  } catch (error) {
    if (error instanceof AssociationError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'No se pudo resolver el socio.' }, { status: 500 });
  }
}