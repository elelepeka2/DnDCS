import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { UserDirectory } from './components/UserDirectory';

// Shell de la ruta /admin (slice S3).
// Defensa en profundidad: además del gate de App.jsx, esta página vuelve a
// consultar profiles.role antes de renderizar nada. Es UX únicamente — la
// barrera de seguridad sigue siendo RLS + los verificadores de las Edge
// Functions (una sesión degradada falla cerrada en la próxima consulta).
export function AdminPage() {
  const navigate = useNavigate();
  // 'checking' | 'allowed' | 'denied'
  const [status, setStatus] = useState('checking');
  // Id de la sesión actual: UserDirectory lo recibe por prop (sin Context)
  // para deshabilitar el control de rol de la fila propia.
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const recheckRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      const { data, error } = userId
        ? await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle()
        : { data: null, error: null };

      if (cancelled) return;
      setCurrentUserId(userId ?? null);

      // Fail-closed: sin sesión, sin fila o con error => no admin.
      if (!userId || error || data?.role !== 'admin') {
        setStatus('denied');
      } else {
        setStatus('allowed');
      }
    };

    recheckRole();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center text-ink-50">
        <div className="w-10 h-10 border-4 border-ink-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-ink-400">Verificando permisos de administración...</p>
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 p-6">
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-8 border-b border-ink-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administración</h1>
          <p className="text-sm text-ink-400 mt-1">Gestión de usuarios y permisos</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-sm font-medium rounded-control transition-colors cursor-pointer"
        >
          ← Volver al Panel
        </button>
      </header>

      <main className="max-w-5xl mx-auto">
        {currentUserId && <UserDirectory currentUserId={currentUserId} />}
      </main>
    </div>
  );
}
