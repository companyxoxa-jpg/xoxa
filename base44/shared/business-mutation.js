// Persistent per-business gate. Conditional update is performed by the database,
// not by a process-local mutex. No lease expiry: a crashed/uncertain write must
// remain blocked until an administrator reconciles it; expiring a lease would
// let a slow first writer overlap a new owner.
export class MutationLockError extends Error {
  constructor(message, status = 423) { super(message); this.status = status; }
}
export async function withBusinessMutation(client, businessId, operation) {
  const entity = client.asServiceRole.entities.Business;
  const token = crypto.randomUUID();
  const acquired = await entity.updateMany(
    { id: businessId, $or: [{ mutation_token: '' }, { mutation_token: null }] },
    { $set: { mutation_token: token, mutation_started_at: new Date().toISOString() } },
  );
  if (acquired.updated !== 1) throw new MutationLockError('Hay otra operación en curso en este negocio. Inténtalo de nuevo en unos segundos. Si persiste, contacta con soporte.');
  let release = false;
  try {
    const result = await operation();
    release = true;
    return result;
  } catch (error) {
    // Our validation errors are definite non-writes; unknown SDK/network errors
    // can mean a committed operation whose response was lost. Fail closed.
    release = Number.isInteger(error.status) && error.status >= 400 && error.status < 500;
    throw error;
  } finally {
    if (release) {
      const cleared = await entity.updateMany({ id: businessId, mutation_token: token }, { $set: { mutation_token: '', mutation_started_at: null } });
      if (cleared.updated !== 1) throw new MutationLockError('La operación requiere revisión de soporte antes de continuar.', 503);
    }
  }
}
