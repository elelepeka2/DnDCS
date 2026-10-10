import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LazyMotion, domMax, m, AnimatePresence, MotionConfig } from 'framer-motion';
import { supabase, envConfigured } from './services/supabaseClient';
import Login from './pages/Login';
import Register from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CharacterDetailView } from './features/character/CharacterDetailView';
import { AdminPage } from './features/admin/AdminPage';
import { routeVariants } from './components/ui/motionVariants';
import { FloatingDiceButton } from './components/ui/FloatingDiceButton';
import { RollPanel } from './components/ui/RollPanel';
import { AmbientLayer } from './components/decorative/AmbientLayer';

// Route-level page entrance: fade + 8px y (design Motion Spec — m.* only, LazyMotion)
function Page({ children }) {
  return (
    <m.div
      variants={routeVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="min-h-screen"
    >
      {children}
    </m.div>
  );
}

// Copy de carga existente, compartida por la resolución de sesión y por el
// gate de /admin mientras se resuelve el rol (diseño D1: roleLoading).
function SessionLoader() {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 flex items-center justify-center font-sans">
      <p className="text-ink-400 font-medium">Iniciando sesión...</p>
    </div>
  );
}

function AnimatedRoutes({ user, role, roleLoading }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Rutas Públicas */}
        <Route
          path="/login"
          element={!user ? <Page><Login /></Page> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/register"
          element={!user ? <Page><Register /></Page> : <Navigate to="/dashboard" replace />}
        />

        {/* Rutas Protegidas */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <Page><Dashboard user={user} role={role} /></Page>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/character/:id"
          element={user ? <Page><CharacterDetailView /></Page> : <Navigate to="/login" replace />}
        />

        {/* Panel de administración: gate UX por rol (defensa en profundidad en
            AdminPage). La autoridad real es RLS + las Edge Functions. */}
        <Route
          path="/admin"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : roleLoading ? (
              <Page><SessionLoader /></Page>
            ) : role === 'admin' ? (
              <Page><AdminPage /></Page>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* Admin character detail: same gate as /admin, rendered read-only
            with a back link to the admin panel. */}
        <Route
          path="/admin/characters/:id"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : roleLoading ? (
              <Page><SessionLoader /></Page>
            ) : role === 'admin' ? (
              <Page><CharacterDetailView readOnly backTo="/admin" /></Page>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        {/* Redirección por defecto */}
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('player');
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [diceOpen, setDiceOpen] = useState(false);

  useEffect(() => {
    if (!envConfigured) return undefined;

    // Diseño D1 (session-role-propagation): una consulta de profiles.role por
    // cambio de auth, en paralelo a setUser, propagada por prop (sin Context).
    // UX only: el gate de /admin y el botón del Dashboard no son la barrera de
    // seguridad — RLS y los verificadores de las Edge Functions sí lo son.
    let roleRequest = 0;
    const syncRole = async (id) => {
      const request = ++roleRequest;
      if (!id) {
        // Cierre de sesión: limpiar el rol (falla cerrada a 'player').
        setRole('player');
        setRoleLoading(false);
        return;
      }
      setRoleLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', id)
        .maybeSingle();
      // Respuestas viejas (cambio de sesión a mitad de consulta) se descartan.
      if (request !== roleRequest) return;
      // Fail-closed: error o fila ausente => 'player'.
      setRole(!error && data?.role === 'admin' ? 'admin' : 'player');
      setRoleLoading(false);
    };

    // Obtener la sesión actual al cargar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      syncRole(session?.user?.id);
      setLoading(false);
    });

    // Escuchar cambios de estado en la autenticación (Login, Logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      syncRole(session?.user?.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!envConfigured) {
    return (
      <div className="min-h-screen bg-ink-950 text-ink-50 flex items-center justify-center font-sans p-6">
        <div className="max-w-md w-full bg-ink-900 border border-ink-700 p-8 text-center">
          <h1 className="text-xl font-bold mb-3">Falta configuración de Supabase</h1>
          <p className="text-ink-400 text-sm leading-relaxed">
            Copiá <code className="text-ink-50">frontend/.env.example</code> a{' '}
            <code className="text-ink-50">frontend/.env</code> y completá{' '}
            <code className="text-ink-50">VITE_SUPABASE_URL</code> y{' '}
            <code className="text-ink-50">VITE_SUPABASE_ANON_KEY</code> con las claves de tu
            proyecto (Dashboard &gt; Project Settings &gt; API Keys).
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <SessionLoader />;
  }

  return (
    <BrowserRouter>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <AnimatedRoutes user={user} role={role} roleLoading={roleLoading} />
          {/* Ambient decor: single global mount, aria-hidden, fixed behind content on every route (IMM-A1) */}
          <AmbientLayer />
          {/* Dice: mounted at App level so the FAB persists on every route (spec: Roll from any screen) */}
          <FloatingDiceButton onClick={() => setDiceOpen(true)} />
          <RollPanel isOpen={diceOpen} onClose={() => setDiceOpen(false)} />
        </MotionConfig>
      </LazyMotion>
    </BrowserRouter>
  );
}
