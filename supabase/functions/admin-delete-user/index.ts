// =============================================================================
// admin-delete-user — deletes the target auth user; profiles and characters
// follow via ON DELETE CASCADE (spec: delete cascades).
// Deleting ANOTHER admin succeeds — only the caller's own id is refused by
// the shared verifier (400 SELF_ACTION).
//
// 200 -> { ok: true, action: 'delete', target_user_id }
// Errors: 401 UNAUTHENTICATED / 403 FORBIDDEN / 400 BAD_REQUEST | SELF_ACTION
//         / 404 NOT_FOUND (shared verifier).
// =============================================================================

import {
  getTarget,
  jsonError,
  jsonOk,
  preflight,
  verifyAdmin,
} from '../_shared/adminVerify.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();

  const ctx = await verifyAdmin(req);
  if (ctx instanceof Response) return ctx;

  const target = await getTarget(req, ctx);
  if (target instanceof Response) return target;

  const { error } = await ctx.admin.auth.admin.deleteUser(target.targetUserId);
  if (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return jsonError(404, 'NOT_FOUND', 'Usuario no encontrado.');
    return jsonError(500, 'INTERNAL', error.message);
  }

  return jsonOk({ ok: true, action: 'delete', target_user_id: target.targetUserId });
});
