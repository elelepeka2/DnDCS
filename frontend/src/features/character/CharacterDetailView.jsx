import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { ProfileTab } from './components/ProfileTab';

export function CharacterDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [activeTab, setActiveTab] = useState('perfil');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCharacter = async () => {
      // Hacemos LEFT JOIN opcional para evitar que truene si main_class_id es null
      const { data, error } = await supabase
        .from('characters')
        .select('*, classes:main_class_id(nombre)')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        console.error("Error fetching character:", error);
        alert('Personaje no encontrado');
        navigate('/dashboard');
      } else {
        setCharacter(data);
      }
      setLoading(false);
    };

    if (id) fetchCharacter();
  }, [id, navigate]);

  if (loading) {
    return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Cargando ficha...</div>;
  }

  if (!character) return null;

  const tabs = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'estadisticas', label: 'Estadísticas' },
    { id: 'clase', label: 'Clase' },
    { id: 'equipo', label: 'Equipo' },
    { id: 'inventario', label: 'Inventario' },
    { id: 'biografia', label: 'Biografía' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto mb-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-bold text-gray-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
        >
          ← Volver al Panel
        </button>
      </div>

      <header className="max-w-5xl mx-auto bg-gray-900 border border-gray-800 p-6 rounded-2xl mb-6 shadow-xl flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black">{character.nombre}</h1>
          <p className="text-sm text-indigo-400 font-medium">
            Nivel {character.nivel || 1} | {character.classes?.nombre || 'Sin Clase Asignada'}
          </p>
        </div>
      </header>

      <nav className="max-w-5xl mx-auto border-b border-gray-800 flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gray-900 text-indigo-400 border-t-2 border-indigo-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="max-w-5xl mx-auto">
        {activeTab === 'perfil' && <ProfileTab character={character} />}

        {activeTab === 'estadisticas' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold mb-2">Vista de Estadísticas</h2>
            <p className="text-gray-400 text-sm">Próximamente: Radar Chart y Barras de HP/EXP.</p>
          </div>
        )}

        {activeTab === 'clase' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold mb-2">Vista de Clase</h2>
            <p className="text-gray-400 text-sm">Próximamente: Tabla de progresión por nivel.</p>
          </div>
        )}

        {activeTab === 'equipo' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold mb-2">Vista de Equipo</h2>
            <p className="text-gray-400 text-sm">Próximamente: Ranuras de equipamiento activo.</p>
          </div>
        )}

        {activeTab === 'inventario' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold mb-2">Vista de Inventario</h2>
            <p className="text-gray-400 text-sm">Próximamente: Mochila y gestión de dinero.</p>
          </div>
        )}

        {activeTab === 'biografia' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold mb-2">Vista de Biografía</h2>
            <p className="text-gray-400 text-sm">Próximamente: Historia y personalidad.</p>
          </div>
        )}
      </main>
    </div>
  );
}