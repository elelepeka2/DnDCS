// =============================================================================
// _shared/adminVerify.ts
// Shared verifier for the three admin Edge Functions (design: Edge Function
// contracts). The frontend role gate is UX only — every function proves the
// caller's role server-side, holding SUPABASE_SERVICE_ROLE_KEY exclusively
// here (never reachable from frontend/src).
//
//   verifyAdmin(req): missing/invalid Bearer (incl. the anon key) -> 401
//                     UNAUTHENTICATED; profiles.role != 'admin' read via a
//                     service-role client -> 403 FORBIDDEN; otherwise
//                     { admin, callerId } for the handler to use.
//   getTarget(req, ctx): missing/non-uuid body -> 400 BAD_REQUEST; target ===
//                     caller -> 400 SELF_ACTION; unknown target -> 404 NOT_FOUND.
//   jsonError(status, code, message): { error: { code, message } } envelope.
//
// Codes are English (machine-readable), messages are Spanish (app copy).
// =============================================================================

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Browser invocation needs a preflight; the gateway's verify_jwt stays at its
// default (true) — config.toml is intentionally untouched.
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const JSON_HEADERS = { 'Content-Type': 'application/json', ...CORS_HEADERS };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminContext = {
  admin: SupabaseClient;
  callerId: string;
};

export type TargetRequest = {
  targetUserId: string;
  body: Record<string, unknown>;
};

export function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: JSON_HEADERS,
  });
}

export function jsonOk(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status: 200, headers: JSON_HEADERS });
}

// CORS preflight (called first by every handler).
export function preflight(): Response {
  return new Response('ok', { status: 204, headers: CORS_HEADERS });
}

export async function verifyAdmin(req: Request): Promise<AdminContext | Response> {
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';
  if (!token) {
    return jsonError(401, 'UNAUTHENTICATED', 'Falta el token de autenticación.');
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return jsonError(500, 'INTERNAL', 'Configuración del servidor incompleta.');
  }

  // Service-role client: only ever constructed here, only ever used to read
  // the caller's role and to call auth.admin.* below.
  const admin = createClient(url, serviceKey, {
    persistSession: false,
    autoRefreshToken: false,
  });

  // Rejects missing/expired tokens AND the anon/publishable key (GoTrue has
  // no user behind it) — both land on 401 UNAUTHENTICATED.
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonError(401, 'UNAUTHENTICATED', 'Token inválido o expirado.');
  }
  const callerId = userData.user.id;

  // Fail-closed: a read error or a missing profiles row behaves like
  // "not an admin" (403), never like an approval.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', callerId)
    .maybeSingle();
  if (profileError || profile?.role !== 'admin') {
    return jsonError(403, 'FORBIDDEN', 'Se requiere rol de administrador.');
  }

  return { admin, callerId };
}

export async function getTarget(
  req: Request,
  ctx: AdminContext,
): Promise<TargetRequest | Response> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser JSON.');
  }
  if (!payload || typeof payload !== 'object') {
    return jsonError(400, 'BAD_REQUEST', 'El cuerpo de la petición debe ser un objeto JSON.');
  }

  const body = payload as Record<string, unknown>;
  const targetUserId = body.target_user_id;
  if (typeof targetUserId !== 'string' || !UUID_RE.test(targetUserId)) {
    return jsonError(400, 'BAD_REQUEST', 'target_user_id debe ser un UUID válido.');
  }

  // Self-ban / self-delete / self-password are refused server-side; the UI
  // also hides the controls on the caller's own row (UX only).
  if (targetUserId.toLowerCase() === ctx.callerId.toLowerCase()) {
    return jsonError(400, 'SELF_ACTION', 'No podés aplicar esta acción sobre tu propia cuenta.');
  }

  // Existence check up front so "unknown target" is a stable 404 NOT_FOUND
  // regardless of which auth.admin.* call the handler runs next.
  const { error } = await ctx.admin.auth.admin.getUserById(targetUserId);
  if (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) {
      return jsonError(404, 'NOT_FOUND', 'Usuario no encontrado.');
    }
    return jsonError(500, 'INTERNAL', error.message);
  }

  return { targetUserId, body };
}
