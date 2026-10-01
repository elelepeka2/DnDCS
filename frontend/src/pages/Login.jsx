import { useState } from 'react';
import { supabase } from "../services/supabaseClient";
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, User } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const fakeEmail = `${username.trim().toLowerCase()}@dndapp.com`;

    const { error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });

    if (error) {
      setError('Usuario o contraseña incorrectos');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-hero grid grid-cols-[55fr_45fr] min-h-screen overflow-hidden bg-ink-950">
      {/* Poster (55%): outline numeral over layered tones — decorative */}
      <section className="login-poster relative overflow-hidden" aria-hidden="true">
        <div className="login-band absolute inset-0 z-0" />
        <span className="login-numeral text-outline z-10">20</span>
      </section>

      {/* Form (45%): card above the poster layers */}
      <main className="login-panel z-20 flex items-center justify-center p-6 sm:p-10">
        <div className="max-w-md w-full bg-ink-900 border border-ink-700 p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-ink-800 border border-ink-700 rounded-pill mb-3 text-ink-50">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-ink-50">Mesa de Rol - D&D</h2>
            <p className="text-ink-400 text-sm">Ingresa a tu cuenta de jugador</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-signal-500/10 border border-signal-500/50 rounded-control text-signal-500 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-400 uppercase tracking-wider mb-1">
                Nombre de Usuario
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  placeholder="Nombre de aventurero"
                  className="w-full bg-ink-800 border border-ink-700 rounded-control py-2.5 pl-10 pr-4 text-ink-50 placeholder:text-ink-400 focus:outline-none focus:border-ink-50 transition-colors"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-400 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-ink-800 border border-ink-700 rounded-control py-2.5 pl-10 pr-4 text-ink-50 placeholder:text-ink-400 focus:outline-none focus:border-ink-50 transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-ink-50 hover:bg-ink-200 text-ink-950 font-bold py-2.5 rounded-control transition-colors"
            >
              Entrar a la Campaña
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-400">
            ¿Nuevo en la mesa?{' '}
            <Link to="/register" className="text-ink-50 hover:text-ink-200 font-medium underline">
              Crear usuario
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
