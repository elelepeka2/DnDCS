import { useEffect, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { backdropVariants, panelVariants } from '../../components/ui/motionVariants';

// Formulario compartido de perfil (S4): sirve tanto para el perfil propio
// (Dashboard "Mi perfil") como para que un admin edite a otro usuario desde
// el directorio.
//
// Diseño D4 (username-rename scope): el campo username SOLO existe cuando
// isOwn — un admin no renombra a otro usuario, porque divergiría
// permanentemente `profiles.username` de ese usuario's `user_metadata`
// (que es lo que el encabezado del Dashboard muestra). El rename propio
// escribe en `profiles` vía RLS Y sincroniza `user_metadata` con
// `auth.updateUser`; el email fake de `auth.users` jamás se toca.
export function EditProfileModal({ isOpen, onClose, targetUserId, isOwn = false, onSaved }) {
  const [profile, setProfile] = useState(null); // null = aún sin cargar
  const [authUser, setAuthUser] = useState(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // ESC cierra (mismo patrón que RollPanel).
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Carga la fila del perfil objetivo y, si es propio, el usuario de sesión
  // para el hint "Ingresás con …". Todo setState ocurre después del await
  // (oxlint react/set-state-in-effect).
  useEffect(() => {
    if (!isOpen || !targetUserId) return undefined;
    let cancelled = false;

    const load = async () => {
      const [profileResult, authResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('username, bio, avatar_url')
          .eq('user_id', targetUserId)
          .maybeSingle(),
        isOwn ? supabase.auth.getUser() : Promise.resolve({ data: { user: null } }),
      ]);
      if (cancelled) return;

      const row = profileResult.data;
      setError('');
      setUsername(row?.username ?? '');
      setBio(row?.bio ?? '');
      setAvatarUrl(row?.avatar_url ?? '');
      setProfile(row ?? { username: '', bio: null, avatar_url: null });
      setAuthUser(isOwn ? (authResult.data?.user ?? null) : null);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, targetUserId, isOwn]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving || !profile) return;

    const nextUsername = username.trim();
    if (isOwn && !nextUsername) {
      setError('El nombre de usuario no puede estar vacío.');
      return;
    }

    setSaving(true);
    setError('');

    const patch = {
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    };
    if (isOwn) patch.username = nextUsername;

    // Escritura RLS: 0 filas devueltas = la policy no cubre el target.
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(patch)
      .eq('user_id', targetUserId)
      .select('user_id');

    if (updateError || !data || data.length === 0) {
      setError(
        updateError
          ? `Error al guardar: ${updateError.message}`
          : 'Sin permisos para editar este perfil.',
      );
      setSaving(false);
      return;
    }

    // Diseño D4: el rename propio también sincroniza user_metadata (el
    // encabezado lo lee desde ahí). Nunca se escribe auth.users.email.
    if (isOwn && nextUsername !== (profile.username ?? '')) {
      const { error: metaError } = await supabase.auth.updateUser({
        data: { ...(authUser?.user_metadata ?? {}), username: nextUsername },
      });
      if (metaError) {
        setError(`No se pudo actualizar el usuario de sesión: ${metaError.message}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    // inert + pointer-events-none keep the overlay non-interactive on exit
    <div inert={!isOpen} aria-hidden={!isOpen} className={isOpen ? undefined : 'pointer-events-none'}>
      <AnimatePresence>
        {isOpen && (
          <m.div
            variants={backdropVariants}
            initial="enter"
            animate="center"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <m.div
              variants={panelVariants}
              onClick={(e) => e.stopPropagation()}
              className="bg-ink-900 border border-ink-700 p-6 w-full max-w-md text-ink-50 shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-1">
                {isOwn ? 'Mi perfil' : 'Editar perfil'}
              </h2>
              {isOwn && authUser?.email && (
                <p className="text-xs text-ink-400 mb-4">
                  Ingresás con <span className="text-ink-200">{authUser.email}</span>
                </p>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                {!profile ? (
                  <p className="text-sm text-ink-400 py-4">Cargando perfil...</p>
                ) : (
                  <>
                    {/* Solo propio: un admin no renombra a otro usuario (D4). */}
                    {isOwn && (
                      <div>
                        <label
                          htmlFor="edit-profile-username"
                          className="block text-xs font-medium text-ink-400 uppercase mb-2"
                        >
                          Nombre de usuario
                        </label>
                        <input
                          id="edit-profile-username"
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-ink-800 border border-ink-700 rounded-control p-3 text-ink-50 placeholder:text-ink-400 focus:outline-none focus:border-ink-50 transition-colors text-base"
                        />
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="edit-profile-bio"
                        className="block text-xs font-medium text-ink-400 uppercase mb-2"
                      >
                        Biografía
                      </label>
                      <textarea
                        id="edit-profile-bio"
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Contá quién es tu personaje..."
                        className="w-full bg-ink-800 border border-ink-700 rounded-control p-3 text-ink-50 placeholder:text-ink-400 focus:outline-none focus:border-ink-50 transition-colors text-base resize-y"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-profile-avatar"
                        className="block text-xs font-medium text-ink-400 uppercase mb-2"
                      >
                        URL del avatar
                      </label>
                      <input
                        id="edit-profile-avatar"
                        type="text"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-ink-800 border border-ink-700 rounded-control p-3 text-ink-50 placeholder:text-ink-400 focus:outline-none focus:border-ink-50 transition-colors text-base"
                      />
                    </div>
                  </>
                )}

                {error && (
                  <p className="text-sm text-ink-50 border border-ink-400 bg-ink-800 px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    autoFocus
                    className="px-4 py-2 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 rounded-control text-sm font-medium transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !profile}
                    className="px-5 py-2 bg-ink-50 hover:bg-ink-200 text-ink-950 rounded-control text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
