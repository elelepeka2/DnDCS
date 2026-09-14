import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, ShieldAlert } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [characters, setCharacters] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        fetchCharacters();
      }
    };

    checkUser();
  }, [navigate]);

  const fetchCharacters = async () => {
    const { data, error } = await supabase.from('characters').select('*');
    if (!error && data) {
      setCharacters(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div>
            <h1 className="text-2xl font-bold text-red-500">Panel de Aventureros</h1>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </header>

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Tus Personajes</h2>
          <button className="flex items-center gap-2 bg-red-700 hover:bg-red-600 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
            <Plus className="w-4 h-4" /> Crear Personaje
          </button>
        </div>

        {characters.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-slate-500 mx-auto" />
            <p className="text-slate-400">No tienes personajes creados aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((char) => (
              <div key={char.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl space-y-2">
                <h3 className="text-lg font-bold text-red-400">{char.name}</h3>
                <p className="text-sm text-slate-300">{char.class} - Nivel {char.level}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}