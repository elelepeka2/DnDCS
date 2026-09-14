import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, User } from 'lucide-react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

  const fakeEmail = `${username.trim().toLowerCase()}@dndapp.com`;
    const { error } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
      options: {
        data: { username: username.trim() } // Guardamos el nombre real en metadatos
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        setError('El nombre de usuario ya está registrado');
      } else {
        setError(error.message);
      }
    } else {
      alert('¡Aventurero registrado con éxito!');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-full mb-3 text-red-500">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Registro de Jugador</h2>
          <p className="text-slate-400 text-sm">Crea tu usuario para la campaña</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Nombre de Usuario
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Ej: Aragorn99"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-red-500 transition-colors"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-red-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-red-700 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg shadow-lg hover:shadow-red-900/20 transition-all"
          >
            Crear Cuenta
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          ¿Ya tienes usuario?{' '}
          <Link to="/login" className="text-red-400 hover:text-red-300 font-medium underline">
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
}