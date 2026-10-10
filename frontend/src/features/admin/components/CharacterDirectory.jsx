import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { supabase } from '../../../services/supabaseClient';
import { listStagger, listItem } from '../../../components/ui/motionVariants';

const PAGE_SIZE = 25;

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Read-only character directory (S3 / REQ-5). Server-side pagination mirrors
// UserDirectory: 25 rows per page, exact count, created_at desc — the full
// table is never fetched. The AdminPage role gate is UX only: RLS is the real
// security barrier, so a degraded session simply reads zero rows.
export function CharacterDirectory({ ownerFilter, onClearOwnerFilter }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  useEffect(() => {
    // Declared inside the effect (AdminPage.recheckRole pattern): startup/page
    // never marks synchronous set-state, and stale responses are dropped by the
    // same counter that guards every set below.
    const fetchPage = async (targetPage) => {
      const request = ++requestRef.current;
      const offset = targetPage * PAGE_SIZE;
      let query = supabase
        .from('characters')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (ownerFilter) query = query.eq('user_id', ownerFilter);

      const { data, error: queryError, count: totalCount } = await query;
      if (request !== requestRef.current) return;

      if (queryError) {
        setError('No se pudo cargar el directorio de personajes.');
        setRows([]);
        setCount(0);
        setLoading(false);
        return;
      }

      // PostgREST cannot join characters to profiles (both user_id columns are
      // FKs to auth.users — no direct relationship), so owner usernames come
      // from a second query merged client-side by user_id. A profiles failure
      // degrades to a placeholder owner; the list itself still renders.
      const pageUserIds = [...new Set((data ?? []).map((row) => row.user_id))];
      let usernameById = {};
      if (pageUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id,username')
          .in('user_id', pageUserIds);
        if (request !== requestRef.current) return;
        if (!profilesError) {
          usernameById = Object.fromEntries(
            (profiles ?? []).map((profile) => [profile.user_id, profile.username])
          );
        }
      }

      setError('');
      setRows(
        (data ?? []).map((row) => ({
          ...row,
          ownerUsername: usernameById[row.user_id] ?? null,
        }))
      );
      setCount(totalCount ?? 0);
      setLoading(false);
    };

    // ownerFilter changes remount this component (keyed in AdminPage), so the
    // closure always sees the current filter without a page-reset effect.
    fetchPage(page);
  }, [page, ownerFilter]);

  const changePage = (nextPage) => {
    if (nextPage < 0 || nextPage >= totalPages || nextPage === page) return;
    setLoading(true);
    setError('');
    setPage(nextPage);
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
          <h2 className="text-xl font-bold">Directorio de personajes</h2>
          <p className="text-sm text-ink-400 mt-1">
            {count} {count === 1 ? 'personaje' : 'personajes'}
          </p>
        </div>
        {pagination}
      </div>

      {ownerFilter && (
        <div className="flex items-center gap-3 mb-4 text-sm text-ink-400">
          <span>Filtrado a un solo propietario.</span>
          <button
            type="button"
            onClick={onClearOwnerFilter}
            className="px-3 py-1.5 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-sm rounded-control transition-colors cursor-pointer"
          >
            Quitar filtro
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-ink-50 border border-ink-400 bg-ink-800 px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-center text-ink-400 py-10">Cargando personajes...</p>
      ) : rows.length === 0 ? (
        <div className="bg-ink-900 border border-ink-700 p-8 text-center">
          <p className="text-ink-400 text-sm">
            {ownerFilter ? 'Este propietario no tiene personajes.' : 'Todavía no hay personajes.'}
          </p>
        </div>
      ) : (
        <m.ul
          key={page}
          variants={listStagger}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3"
        >
          {rows.map((row) => (
            <m.li
              key={row.id}
              variants={listItem}
              className="bg-ink-900 border border-ink-700 p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-bold text-ink-50 truncate">{row.nombre}</p>
                <p className="text-xs text-ink-400 mt-0.5">
                  Propietario: {row.ownerUsername ?? '—'} · Creado: {formatDate(row.created_at)}
                </p>
              </div>

              {/* REQ-5: the detail route is Slice 2's read-only admin view. */}
              <button
                type="button"
                onClick={() => navigate(`/admin/characters/${row.id}`)}
                className="px-3 py-1.5 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-sm font-medium rounded-control transition-colors cursor-pointer"
              >
                Ver
              </button>
            </m.li>
          ))}
        </m.ul>
      )}

      {pagination && <div className="flex justify-end mt-4">{pagination}</div>}
    </section>
  );
}
