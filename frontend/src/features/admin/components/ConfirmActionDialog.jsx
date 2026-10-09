import { useEffect, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { backdropVariants, panelVariants } from '../../../components/ui/motionVariants';

// Confirmación destructiva para las acciones de cuenta del directorio
// (S5): suspender, eliminar y forzar contraseña. Ink tokens únicamente;
// signal-500/600 sólo en el control de confirmación (2 usos en el archivo);
// motion reutiliza backdropVariants/panelVariants con `m.*` y sin springs
// nuevos — la intensidad destructiva vive únicamente en ese botón.
const ACTION_COPY = {
  ban: {
    title: 'Suspender cuenta',
    description: (name) =>
      `La cuenta de ${name} no podrá iniciar sesión hasta que se levante el bloqueo desde el panel de Supabase.`,
    confirm: 'Suspender',
    pending: 'Suspendiendo...',
  },
  delete: {
    title: 'Eliminar cuenta',
    description: (name) =>
      `Se eliminará la cuenta de ${name} junto con su perfil y sus personajes. Esta acción no se puede deshacer.`,
    confirm: 'Eliminar',
    pending: 'Eliminando...',
  },
  'set-password': {
    title: 'Forzar contraseña',
    description: (name) =>
      `Se definirá una contraseña nueva para ${name}. Deberá usarla en el próximo inicio de sesión y no se enviará ningún correo.`,
    confirm: 'Guardar contraseña',
    pending: 'Guardando...',
  },
};

export function ConfirmActionDialog({ isOpen, action, targetName, onConfirm, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [wasOpen, setWasOpen] = useState(isOpen);

  // Reinicio al abrir/cerrar: se ajusta durante el render (patrón de React
  // para valores de renders anteriores) — un reset dentro de un useEffect
  // activaría react(set-state-in-effect) y rompería el presupuesto de lint.
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    setPassword('');
    setError('');
    setPending(false);
  }

  const copy = ACTION_COPY[action] ?? null;
  const needsPassword = action === 'set-password';

  // ESC cierra (mismo patrón que EditProfileModal), salvo mientras corre una
  // petición en curso.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !pending) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, pending]);

  const handleConfirm = async () => {
    if (pending || !copy) return;
    if (needsPassword && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setPending(true);
    setError('');

    let result;
    try {
      result = needsPassword ? await onConfirm(password) : await onConfirm();
    } catch {
      result = { ok: false, message: 'No se pudo completar la acción.' };
    }

    // Fallo del servidor (401/403/400/404/red): el diálogo queda abierto
    // mostrando el mensaje; el éxito lo cierra el propio diálogo.
    if (result?.ok === false) {
      setError(result.message || 'No se pudo completar la acción.');
      setPending(false);
      return;
    }

    setPending(false);
    onClose();
  };

  return (
    // inert + pointer-events-none keep the overlay non-interactive on exit
    <div inert={!isOpen} aria-hidden={!isOpen} className={isOpen ? undefined : 'pointer-events-none'}>
      <AnimatePresence>
        {isOpen && copy && (
          <m.div
            variants={backdropVariants}
            initial="enter"
            animate="center"
            exit="exit"
            onClick={() => {
              if (!pending) onClose();
            }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <m.div
              variants={panelVariants}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-action-title"
              className="bg-ink-900 border border-ink-700 p-6 w-full max-w-md text-ink-50 shadow-2xl"
            >
              <h2 id="confirm-action-title" className="text-xl font-bold mb-2">
                {copy.title}
              </h2>
              <p className="text-sm text-ink-400 mb-4">{copy.description(targetName)}</p>

              {needsPassword && (
                <div className="mb-4">
                  <label
                    htmlFor="confirm-action-password"
                    className="block text-xs font-medium text-ink-400 uppercase mb-2"
                  >
                    Nueva contraseña
                  </label>
                  <input
                    id="confirm-action-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-ink-800 border border-ink-700 rounded-control p-3 text-ink-50 placeholder:text-ink-400 focus:outline-none focus:border-ink-50 transition-colors text-base"
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-ink-50 border border-ink-400 bg-ink-800 px-3 py-2 mb-4">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pending}
                  autoFocus
                  className="px-4 py-2 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 rounded-control text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={pending}
                  className="px-5 py-2 bg-signal-500 hover:bg-signal-600 text-ink-50 rounded-control text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {pending ? copy.pending : copy.confirm}
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
