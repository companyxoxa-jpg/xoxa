// RINNO Asociaciones — Fase A3: Digital credential + secure QR.
//
// SECURITY MODEL:
// - The QR carries ONLY an opaque random token (>=256 bits, CSPRNG via Web Crypto).
//   It contains NO member_id, member_number, email, phone, name, business_id, or
//   any PII — only the token (or a URL embedding it).
// - The DB stores ONLY token_hash = SHA-256(token). The clear token is NEVER
//   persisted. It exists only: during issue/rotate (returned once), to build the
//   QR payload, and when presented for validation.
// - The clear token is NEVER written to AuditLog, metadata, errors, or logs.
// - Validation looks up by token_hash (never by clear token).
// - A revoked/expired credential, a suspended/resigned member, or an
//   expired/inactive membership all yield the same uniform { valid: false }.
//   The endpoint is not an oracle: no public differentiation of failure reasons.
import { withBusinessMutation, MutationLockError } from './business-mutation.js';
import {
  getUserBusinessId, requirePermission, createAuditLog,
  AssociationError, ValidationError, NotFoundError, ConflictError, AuthorizationError,
} from './associations.js';
import { getMemberCompliance } from './association-compliance.js';

export {
  AssociationError, ValidationError, NotFoundError, ConflictError, AuthorizationError,
  MutationLockError,
};

export const CREDENTIAL_STATUS_VALUES = ['active', 'revoked', 'expired'];
const TOKEN_BYTES = 32; // 256 bits of entropy
const MAX_TOKEN_LENGTH = 128;

// ---- Token generation (CSPRNG, 256 bits, base64url) ----
export function generateCredentialToken() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---- Hash (SHA-256, hex) ----
export async function hashToken(token) {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

// ---- QR payload (decoupled from any visual component) ----
export function buildCredentialQrPayload(token) {
  return `/credential/validate?t=${token}`;
}

// Strip token_hash from a credential record before returning it to the client.
// The hash is not the secret (brute-force of a 256-bit token is infeasible),
// but there is no reason to expose it.
function stripHash(c) {
  if (!c) return c;
  const { token_hash, ...rest } = c;
  return rest;
}

// ---- ManageCredential: issue, rotate, revoke, get, list ----
export async function manageCredential(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  const writeActions = ['issue', 'rotate', 'revoke'];
  const perm = writeActions.includes(body.action) ? 'credentials.manage' : 'credentials.read';
  await requirePermission(client, user, bid, perm);

  if (body.action === 'list') {
    const filter = { business_id: bid };
    if (body.member_id) filter.member_id = body.member_id;
    const creds = await client.asServiceRole.entities.Credential.filter(filter);
    return { credentials: creds.map(stripHash) };
  }
  if (body.action === 'get') {
    const cred = await client.asServiceRole.entities.Credential.get(body.credential_id);
    if (!cred || cred.business_id !== bid) throw new NotFoundError('Credencial no encontrada');
    return { credential: stripHash(cred) };
  }
  if (body.action === 'issue') {
    return await withBusinessMutation(client, bid, async () => {
      const member = await client.asServiceRole.entities.Member.get(body.member_id);
      if (!member || member.business_id !== bid) throw new NotFoundError('Socio no encontrado');
      if (member.status !== 'active') throw new ValidationError('El socio no está activo');
      // At most one active credential per member.
      const actives = await client.asServiceRole.entities.Credential.filter({ business_id: bid, member_id: member.id, status: 'active' });
      if (actives.length > 0) throw new ConflictError('El socio ya tiene una credencial activa');
      const token = generateCredentialToken();
      const tokenHash = await hashToken(token);
      const now = new Date().toISOString();
      const cred = await client.asServiceRole.entities.Credential.create({
        business_id: bid, member_id: member.id, token_hash: tokenHash,
        status: 'active', version: 1, issued_at: now,
        expires_at: body.expires_at || null, rotated_at: null, revoked_at: null, revoke_reason: null,
      });
      // AuditLog: NEVER the token or its hash. Only member_id + version.
      await createAuditLog(client, user, 'credential.issued', { entity_type: 'Credential', entity_id: cred.id, business_id: bid, metadata: { member_id: member.id, version: 1 } });
      // Return the clear token ONE TIME so the caller can build the QR.
      return { credential: stripHash(cred), token, qr_payload: buildCredentialQrPayload(token) };
    });
  }
  if (body.action === 'rotate') {
    return await withBusinessMutation(client, bid, async () => {
      const cred = await client.asServiceRole.entities.Credential.get(body.credential_id);
      if (!cred || cred.business_id !== bid) throw new NotFoundError('Credencial no encontrada');
      if (cred.status !== 'active') throw new ConflictError('La credencial no está activa');
      const member = await client.asServiceRole.entities.Member.get(cred.member_id);
      if (!member || member.business_id !== bid) throw new NotFoundError('Socio no encontrado');
      if (member.status !== 'active') throw new ValidationError('El socio no está activo');
      const token = generateCredentialToken();
      const tokenHash = await hashToken(token);
      // Replacing token_hash immediately invalidates the previous token:
      // the old token hashes to a value no longer present, so it stops validating.
      const updated = await client.asServiceRole.entities.Credential.update(body.credential_id, {
        token_hash: tokenHash, version: cred.version + 1, rotated_at: new Date().toISOString(),
      });
      await createAuditLog(client, user, 'credential.rotated', { entity_type: 'Credential', entity_id: cred.id, business_id: bid, metadata: { member_id: member.id, version: updated.version } });
      return { credential: stripHash(updated), token, qr_payload: buildCredentialQrPayload(token) };
    });
  }
  if (body.action === 'revoke') {
    return await withBusinessMutation(client, bid, async () => {
      const cred = await client.asServiceRole.entities.Credential.get(body.credential_id);
      if (!cred || cred.business_id !== bid) throw new NotFoundError('Credencial no encontrada');
      if (cred.status === 'revoked') throw new ConflictError('La credencial ya está revocada');
      const updated = await client.asServiceRole.entities.Credential.update(body.credential_id, {
        status: 'revoked', revoked_at: new Date().toISOString(), revoke_reason: body.revoke_reason || null,
      });
      await createAuditLog(client, user, 'credential.revoked', { entity_type: 'Credential', entity_id: cred.id, business_id: bid, metadata: { member_id: cred.member_id, reason: body.revoke_reason || null } });
      return { credential: stripHash(updated) };
    });
  }
  throw new ValidationError('Acción no válida');
}

// ---- ValidateCredential ----
// MVP decision: AUTHENTICATED for staff with credential.validate (not public).
// Rationale: validation is an operational act by association personnel; a public
// endpoint would expose PII (member_number, name, photo) to anyone who captures
// a QR, with no way to scope the attacker. The staff's tenant must match the
// credential's tenant (cross-tenant tokens yield the same uniform valid:false).
//
// NO AuditLog per scan — volume could be excessive. A future dedicated
// CredentialValidationLog is documented as the strategy for scan auditability.
//
// Rate-limit: the Base44 runtime exposes no reliable distributed rate-limit for
// a single function. Mitigations here: 256-bit unguessable token, strict
// length/charset validation, uniform { valid: false } for every failure, no
// error differentiation. No fake in-memory counter is claimed as a rate-limit.
export async function validateCredential(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  await requirePermission(client, user, bid, 'credential.validate');

  // Persistent distributed throttle: attempts are stored in the database, so
  // the limit is shared by every runtime instance instead of process memory.
  const now = new Date();
  const windowStart = now.getTime() - 60_000;
  const actorId = user.id || String(user.email || '').toLowerCase();
  const recent = await client.asServiceRole.entities.CredentialValidationAttempt.filter({ business_id: bid, actor_user_id: actorId }, '-attempted_at', 40);
  if (recent.filter(x => Date.parse(x.attempted_at) >= windowStart).length >= 30) throw new AssociationError('Demasiados intentos. Espera un minuto antes de volver a escanear.', 429);
  await client.asServiceRole.entities.CredentialValidationAttempt.create({ business_id: bid, actor_user_id: actorId, attempted_at: now.toISOString(), expires_at: new Date(now.getTime() + 86_400_000).toISOString() });

  const token = body && body.token;
  // Strict, uniform validation. No distinguishing error for malformed/oversized.
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return { valid: false };
  }
  const tokenHash = await hashToken(token);
  // Lookup by hash (global, asServiceRole bypasses RLS), then enforce tenant match.
  const creds = await client.asServiceRole.entities.Credential.filter({ token_hash: tokenHash });
  if (creds.length === 0) return { valid: false };
  const cred = creds[0];
  if (cred.business_id !== bid) return { valid: false };
  if (cred.status !== 'active') return { valid: false };
  if (cred.expires_at && new Date(cred.expires_at) < new Date()) return { valid: false };
  // Member must be active (suspending a member invalidates the QR immediately).
  const member = await client.asServiceRole.entities.Member.get(cred.member_id);
  if (!member || member.business_id !== bid || member.status !== 'active') return { valid: false };
  // An active, in-force membership is required.
  const memberships = await client.asServiceRole.entities.Membership.filter({ business_id: bid, member_id: member.id, status: 'active' });
  if (memberships.length === 0) return { valid: false };
  const m = memberships[0];
  const today = new Date().toISOString().slice(0, 10);
  if (m.start_date && m.start_date > today) return { valid: false };
  if (m.end_date && m.end_date < today) return { valid: false };
  const compliance = await getMemberCompliance(client.asServiceRole.entities, bid, member.id);
  if (!compliance.compliant) return { valid: false };
  // Valid: return the minimal info needed to verify identity.
  const business = await client.asServiceRole.entities.Business.get(bid);
  return {
    valid: true,
    member_number: member.member_number,
    display_name: `${member.first_name} ${member.last_name}`.trim(),
    photo: member.photo || null,
    membership_status: m.status,
    membership_end_date: m.end_date || null,
    association_name: business?.business_name || null,
    association_logo: business?.logo || null,
  };
}
