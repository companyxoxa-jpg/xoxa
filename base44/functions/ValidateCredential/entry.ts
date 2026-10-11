import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { validateCredential, AssociationError, MutationLockError } from '../../shared/associations-credential.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    const body = await req.json();
    // Validation never throws on the token itself — uniform { valid: false }.
    const result = await validateCredential(base44, user, body);
    return Response.json(result);
  } catch (error) {
    if (error instanceof MutationLockError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof AssociationError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'No se pudo validar la credencial.' }, { status: 500 });
  }
}