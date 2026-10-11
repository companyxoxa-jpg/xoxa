import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { manageMembership, AssociationError, MutationLockError } from '../../shared/associations.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    const body = await req.json();
    const result = await manageMembership(base44, user, body);
    return Response.json(result);
  } catch (error) {
    if (error instanceof MutationLockError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof AssociationError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'No se pudo gestionar la membresía.' }, { status: 500 });
  }
}