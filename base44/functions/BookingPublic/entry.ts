import { createClientFromRequest } from 'npm:@base44/sdk';
import { bookingPublic } from '../../shared/booking-api.js';
export default async function(req) {
  try { return Response.json(await bookingPublic(createClientFromRequest(req), await req.json())); }
  catch (error) { return Response.json({ error: error.status ? error.message : 'No pudimos procesar la operación. Inténtalo de nuevo.' }, { status: error.status || 500 }); }
}
