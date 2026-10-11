import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { manageEnrollment, AssociationError, MutationLockError } from '../../shared/associations-activity.js';
export default async function (req) {
  try { const base44 = createClientFromRequest(req); const user = await readAuthenticatedUser(base44); if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 }); return Response.json(await manageEnrollment(base44, user, await req.json())); }
  catch (error) { if (error instanceof MutationLockError || error instanceof AssociationError) return Response.json({ error: error.message }, { status: error.status }); return Response.json({ error: 'No se pudo gestionar la inscripción.' }, { status: 500 }); }
}
