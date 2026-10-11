import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { installDemo } from '../../shared/demo-api.js';
export default async function(req) {
  try { return await installDemo(createClientFromRequest(req), await req.json()); }
  catch { return Response.json({ error: 'Solicitud no válida' }, { status: 400 }); }
}
