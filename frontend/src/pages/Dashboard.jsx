import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { CreateCharacterModal } from '../components/ui/CreateCharacterModal';

export function Dashboard({ user }) {
  const [characters, setCharacters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCharacters = async () => {
    setLoading(true);
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id);

    if (!error && data) {
      setCharacters(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCharacters();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 font-sans">
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Panel de Aventureros</h1>
          <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
        </div>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-semibold rounded-lg transition cursor-pointer"
        >
          Salir
        </button>
      </header>

      <main className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Tus Personajes</h2>
          {characters.length > 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <span>+</span> Crear Personaje
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Cargando personajes...</p>
        ) : characters.length === 0 ? (
          <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-gray-800/80">
            <p className="text-gray-400 text-lg mb-6">No tienes personajes creados aún.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition inline-flex items-center gap-2 cursor-pointer"
            >
              <span>+</span> Crear Personaje
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {characters.map((char) => (
              <div
                key={char.id}
                onClick={() => navigate(`/character/${char.id}`)}
                className="bg-gray-900 border border-gray-800 hover:border-indigo-500/50 p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between shadow-md hover:scale-[1.01]"
              >
                {/* Lado Izquierdo: Foto y Nombre */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {char.avatar_url ? (
                      <img 
                        src={char.avatar_url} 
                        alt={char.nombre} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-xl font-black text-indigo-400 uppercase">
                        {char.nombre.charAt(0)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-white">
                    {char.nombre}
                  </h3>
                </div>

                {/* Lado Derecho: Nivel y Creador */}
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-400">
                    Nivel {char.nivel || 1}
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {user?.email || 'Creador desconocido'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateCharacterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={user?.id}
        onCharacterCreated={(newChar) => {
          navigate(`/character/${newChar.id}`);
        }}
      />
    </div>
  );
}