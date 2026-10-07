// =============================================================================
// admin-set-password — forces a new password on the target account through
// the admin API. NO email flow of any kind (domain is null-MX, SMTP off —
// spec: force password without email; resetPasswordForEmail is forbidden).
//
// Body: { target_user_id: uuid, password: string >= 8 chars }
// 200 -> { ok: true, action: 'set-password', target_user_id }
// Errors: 401 UNAUTHENTICATED / 403 FORBIDDEN / 400 BAD_REQUEST | SELF_ACTION
//         / 404 NOT_FOUND (shared verifier; short password -> 400 here).
// =============================================================================

import {
  getTarget,
  jsonError,
  jsonOk,
  preflight,
  verifyAdmin,
} from '../_shared/adminVerify.ts';

const MIN_PASSWORD_LENGTH = 8;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();

  const ctx = await verifyAdmin(req);
  if (ctx instanceof Response) return ctx;

  const target = await getTarget(req, ctx);
  if (target instanceof Response) return target;

  const password = target.body.password;
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return jsonError(
      400,
      'BAD_REQUEST',
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }

  const { error } = await ctx.admin.auth.admin.updateUserById(target.targetUserId, {
    password,
  });
  if (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return jsonError(404, 'NOT_FOUND', 'Usuario no encontrado.');
    return jsonError(500, 'INTERNAL', error.message);
  }

  return jsonOk({ ok: true, action: 'set-password', target_user_id: target.targetUserId });
});
