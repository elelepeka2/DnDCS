import { supabase } from './supabaseClient';

// Único punto del frontend que invoca las Edge Functions admin: la clave de
// servicio permanece sólo en el servidor — nunca se importa ni se empaqueta
// acá (grep gate: 0 hits de secretos ni de flujos de reseteo por correo en
// frontend/src y dist); el Bearer que viaja es el JWT de la sesión, adjunto
// por supabase-js.
//
// Cada llamada resuelve { ok, status, code, message }:
//   - éxito (2xx)          -> { ok: true,  status: 200, code: null, message: '' }
//   - FunctionsHttpError   -> se lee error.context.status y error.context.json()
//                             para recuperar el { error: { code, message } } del
//                             servidor (401/403/400/404 comparten ese sobre)
//   - red / relay / sin env -> status 0 con el mejor mensaje disponible
async function normalizeFunctionsError(error) {
  const context = error?.context;
  const status = typeof context?.status === 'number' ? context.status : 0;
  let code = 'FUNCTION_ERROR';
  let message = 'No se pudo completar la acción.';

  if (context && typeof context.json === 'function') {
    // El body sólo puede leerse una vez (el Response se consume).
    try {
      const payload = await context.json();
      if (payload?.error?.code) code = payload.error.code;
      if (payload?.error?.message) message = payload.error.message;
    } catch {
      // Respuesta sin cuerpo JSON: se conservan los valores por defecto.
    }
  } else if (error?.message) {
    message = error.message;
  }

  return { ok: false, status, code, message };
}

async function invoke(name, body) {
  if (!supabase) {
    return {
      ok: false,
      status: 0,
      code: 'NOT_CONFIGURED',
      message: 'Supabase no está configurado en este entorno.',
    };
  }

  try {
    const { error } = await supabase.functions.invoke(name, { body });
    if (error) return await normalizeFunctionsError(error);
    return { ok: true, status: 200, code: null, message: '' };
  } catch (err) {
    return await normalizeFunctionsError(err);
  }
}

export function banUser(targetUserId) {
  return invoke('admin-ban-user', { target_user_id: targetUserId });
}

export function deleteUser(targetUserId) {
  return invoke('admin-delete-user', { target_user_id: targetUserId });
}

export function setPassword(targetUserId, password) {
  return invoke('admin-set-password', { target_user_id: targetUserId, password });
}
