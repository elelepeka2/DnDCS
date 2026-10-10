import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { supabase } from '../../../services/supabaseClient';
import { banUser, deleteUser, setPassword } from '../../../services/adminFunctions';
import { listStagger, listItem } from '../../../components/ui/motionVariants';
import { EditProfileModal } from '../../profile/EditProfileModal';
import { ConfirmActionDialog } from './ConfirmActionDialog';

const PAGE_SIZE = 25;

function displayName(row) {
  // profiles.username es NOT NULL, pero el fallback documenta la cadena de
  // diseño: username → user_metadata → email → fallback duro.
  return row.username ?? row.user_metadata?.username ?? row.email ?? 'Usuario sin nombre';
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Directorio paginado de usuarios (S4). Server-side pagination: 25 por
// página, count exact, orden por created_at desc — nunca se traen todos los
// usuarios. El gate de rol es UX únicamente: RLS es la barrera de seguridad,
// y toda escritura rechazada devuelve 0 filas ("Sin permisos"). Sin
// actualizaciones optimistas: tras cada escritura se refetchea la página.
export function UserDirectory({ currentUserId, onViewCharacters }) {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  // Acción de cuenta pendiente de confirmación: { type, row } | null.
  const [confirmAction, setConfirmAction] = useState(null);
  const requestRef = useRef(0);
  // Expuesto por fuera del effect para el refetch posterior a una escritura
  // (cambio de rol / guardado de perfil) sin disparar el effect de nuevo.
  const fetchPageRef = useRef(null);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  useEffect(() => {
    // Declarado DENTRO del effect (patrón de AdminPage.recheckRole): el
    // arranque/página no marca set-state síncrono y las respuestas viejas se
    // descartan con el mismo contador que usa syncRole en App.jsx.
    const fetchPage = async (targetPage) => {
      const request = ++requestRef.current;
      const { data, error: queryError, count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(targetPage * PAGE_SIZE, targetPage * PAGE_SIZE + PAGE_SIZE - 1);
      if (request !== requestRef.current) return;

      if (queryError) {
        setError('No se pudo cargar el directorio de usuarios.');
        setRows([]);
        setCount(0);
        setLoading(false);
        return;
      }

      // Recuento cosmético de personajes por usuario (S4-T1). Se lanza SIEMPRE
      // después de un profiles exitoso, pero su fallo jamás degrada el
      // directorio: countByUserId queda null, cada fila recibe
      // character_count = null y se renderiza el placeholder «—». No se toca
      // el banner de error ni se limpian filas — el recuento es decorativo.
      const pageUserIds = [...new Set((data ?? []).map((row) => row.user_id))];
      let countByUserId = null;
      if (pageUserIds.length > 0) {
        const { data: characterRows, error: characterError } = await supabase
          .from('characters')
          .select('user_id')
          .in('user_id', pageUserIds);
        if (request !== requestRef.current) return;
        if (!characterError) {
          countByUserId = {};
          for (const character of characterRows ?? []) {
            countByUserId[character.user_id] = (countByUserId[character.user_id] ?? 0) + 1;
          }
        }
      }

      setError('');
      setRows(
        (data ?? []).map((row) => ({
          ...row,
          // null = el recuento falló; 0 = consulta exitosa sin personajes.
          character_count: countByUserId === null ? null : (countByUserId[row.user_id] ?? 0),
        }))
      );
      setCount(totalCount ?? 0);
      setLoading(false);
    };

    fetchPageRef.current = fetchPage;
    fetchPage(page);
  }, [page]);

  const refresh = () => fetchPageRef.current?.(page);

  const changePage = (nextPage) => {
    if (nextPage < 0 || nextPage >= totalPages || nextPage === page) return;
    setLoading(true);
    setError('');
    setPage(nextPage);
  };

  const handleRoleChange = async (row, nextRole) => {
    if (nextRole === row.role || savingId) return;
    setSavingId(row.user_id);

    // Escritura RLS: .select('user_id') confirma cuántas filas afectó.
    // 0 filas = RLS rechazó la escritura (no hay policy que cubra el target).
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({ role: nextRole })
      .eq('user_id', row.user_id)
      .select('user_id');

    if (updateError || !data || data.length === 0) {
      setError('Sin permisos para cambiar roles.');
      setSavingId(null);
      return;
    }

    // Refetch (sin optimistic update): se relee el estado real de la DB.
    await refresh();
    setSavingId(null);
  };

  // Acciones destructivas (S5): ban / delete / forzar contraseña vía las
  // Edge Functions admin — el wrapper devuelve { ok, status, code, message }
  // y el diálogo muestra el mensaje cuando ok es false (el gate de rol del
  // frontend es UX: el servidor re-verifica el rol en cada invocación).
  const runAccountAction = async (password) => {
    if (!confirmAction) return { ok: false, message: 'No hay ninguna acción seleccionada.' };
    const { type, row } = confirmAction;

    let result;
    if (type === 'ban') result = await banUser(row.user_id);
    else if (type === 'delete') result = await deleteUser(row.user_id);
    else result = await setPassword(row.user_id, password);

    if (!result.ok) return result;

    // Borrado: si era la última fila de una página intermedia, se retrocede
    // una página (el effect refetchea); si no, se refetchea la actual.
    if (type === 'delete' && rows.length === 1 && page > 0) {
      setPage(page - 1);
      return result;
    }
    await refresh();
    return result;
  };

  const pagination = totalPages > 1 && (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => changePage(page - 1)}
        disabled={page === 0 || loading}
        className="px-3 py-1.5 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-sm rounded-control transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        ← Anterior
      </button>
      <span className="text-sm text-ink-400">
        Página {page + 1} de {totalPages}
      </span>
      <button
        type="button"
        onClick={() => changePage(page + 1)}
        disabled={page >= totalPages - 1 || loading}
        className="px-3 py-1.5 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-sm rounded-control transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        Siguiente →
      </button>
    </div>
  );

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold">Directorio de usuarios</h2>
          <p className="text-sm text-ink-400 mt-1">
            {count} {count === 1 ? 'usuario' : 'usuarios'}
          </p>
        </div>
        {pagination}
      </div>

      {error && (
        <p className="text-sm text-ink-50 border border-ink-400 bg-ink-800 px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-center text-ink-400 py-10">Cargando usuarios...</p>
      ) : rows.length === 0 ? (
        <div className="bg-ink-900 border border-ink-700 p-8 text-center">
          <p className="text-ink-400 text-sm">No hay usuarios registrados todavía.</p>
        </div>
      ) : (
        <m.ul
          key={page}
          variants={listStagger}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          {rows.map((row) => {
            const isOwn = row.user_id === currentUserId;
            const saving = savingId === row.user_id;
            const name = displayName(row);

            return (
              <m.li
                key={row.user_id}
                variants={listItem}
                className="bg-ink-900 border border-ink-700 p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  {/* Fila superior: nombre (truncable) + badge de recuento.
                      El badge vive fuera del <p> con truncate para que un
                      nombre largo no lo ellipsice ni lo recorte. */}
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-bold text-ink-50 truncate">
                      {name}
                      {isOwn && (
                        <span className="ml-2 text-xs font-normal text-ink-400">Tu cuenta</span>
                      )}
                    </p>
                    <span
                      className="shrink-0 inline-flex items-center px-2 py-0.5 border border-ink-700 bg-ink-800 text-ink-200 text-xs font-normal rounded-control"
                      title={
                        row.character_count === null
                          ? 'Recuento no disponible'
                          : `${row.character_count} ${
                              row.character_count === 1 ? 'personaje' : 'personajes'
                            }`
                      }
                    >
                      {row.character_count === null
                        ? '—'
                        : `${row.character_count} ${
                            row.character_count === 1 ? 'personaje' : 'personajes'
                          }`}
                    </span>
                  </div>
                  <p className="text-xs text-ink-400 mt-0.5">
                    Alta: {formatDate(row.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-ink-400 uppercase">
                    Rol
                    {/* Ambos valores ofrecidos en TODA fila; la propia queda
                        deshabilitada (spec: "admin may name and remove other
                        admins" — solo la fila del llamador se exime). */}
                    <select
                      value={row.role}
                      disabled={isOwn || saving}
                      onChange={(e) => handleRoleChange(row, e.target.value)}
                      aria-label={`Rol de ${name}`}
                      className="bg-ink-800 border border-ink-700 rounded-control px-3 py-1.5 text-sm text-ink-50 focus:outline-none focus:border-ink-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="player">Jugador</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </label>

                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="px-3 py-1.5 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-sm font-medium rounded-control transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                  )}

                  {/* Acciones de fila. «Personajes» navega al directorio de
                      personajes filtrado por este usuario y está en TODA fila
                      (propia o ajena): filtrar el directorio por uno mismo
                      es legítimo. Las acciones destructivas sólo existen en
                      filas ajenas (self-ban/self-delete se bloquean además en
                      el servidor con 400 SELF_ACTION — spec: "admin may name
                      and remove other admins", sólo la fila del llamador se
                      exime). */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onViewCharacters(row)}
                      disabled={saving}
                      title={`Ver personajes de ${name}`}
                      className="px-2.5 py-1.5 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-xs rounded-control transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Personajes
                    </button>
                    {!isOwn && (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ type: 'ban', row })}
                          disabled={saving}
                          className="px-2.5 py-1.5 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-xs rounded-control transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Suspender
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ type: 'set-password', row })}
                          disabled={saving}
                          title={`Forzar contraseña de ${name}`}
                          className="px-2.5 py-1.5 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-xs rounded-control transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Contraseña
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ type: 'delete', row })}
                          disabled={saving}
                          className="px-2.5 py-1.5 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-xs rounded-control transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </m.li>
            );
          })}
        </m.ul>
      )}

      {pagination && <div className="flex justify-end mt-4">{pagination}</div>}

      <EditProfileModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        targetUserId={currentUserId}
        isOwn
        onSaved={refresh}
      />

      <ConfirmActionDialog
        isOpen={confirmAction !== null}
        action={confirmAction?.type}
        targetName={confirmAction ? displayName(confirmAction.row) : ''}
        onConfirm={runAccountAction}
        onClose={() => setConfirmAction(null)}
      />
    </section>
  );
}
