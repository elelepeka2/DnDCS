import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

// Pestañas del personaje
import { ProfileTab } from './components/ProfileTab';
import { StatsTab } from './components/StatsTab';
import { ClassTab } from './components/ClassTab';
//import { InventoryTab } from './components/InventoryTab';
//import { EquipmentTab } from './components/EquipmentTab';
//import { BiographyTab } from './components/BiographyTab';

export function CharacterDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (id) {
      fetchCharacter();
    }
  }, [id]);

  const fetchCharacter = async () => {
    try {
      setLoading(true);

      // Consulta intentando traer las relaciones de clase y subclase
      let { data, error } = await supabase
        .from('characters')
        .select(`
          *,
          classes ( id, nombre ),
          subclasses ( id, nombre )
        `)
        .eq('id', id)
        .maybeSingle();

      // Fallback: Si la consulta relacional falla por falta de Foreign Keys en la BD, hacemos una consulta plana
      if (error || !data) {
        const fallbackResponse = await supabase
          .from('characters')
          .select('*')
          .eq('id', id)
          .single();

        data = fallbackResponse.data;
        error = fallbackResponse.error;
      }

      if (error) {
        console.error('Error cargando personaje:', error);
      } else {
        setCharacter(data);
      }
    } catch (err) {
      console.error('Error inesperado al obtener el personaje:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sincronización en tiempo real del estado local cuando una pestaña actualiza un campo
  const handleCharacterUpdate = (field, value) => {
    setCharacter((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-gray-400">Cargando datos del aventurero...</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <p className="text-lg font-semibold mb-4 text-gray-300">Personaje no encontrado.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer"
        >
          ← Volver al Panel
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8 flex flex-col items-center">
      {/* Botón Volver */}
      <div className="w-full max-w-4xl mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs font-mono uppercase tracking-wider text-gray-400 hover:text-white flex items-center gap-2 transition cursor-pointer"
        >
          ← Volver al Panel
        </button>
      </div>

      {/* Navegación por Pestañas */}
      <div className="w-full max-w-4xl flex border-b border-gray-800 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 text-sm font-bold tracking-wide transition border-b-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'border-indigo-500 text-indigo-400 bg-gray-900/50'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Perfil
        </button>
        <button
          onClick={() => setActiveTab('class')}
          className={`px-5 py-3 text-sm font-bold tracking-wide transition border-b-2 cursor-pointer ${
            activeTab === 'class'
              ? 'border-indigo-500 text-indigo-400 bg-gray-900/50'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Clase
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-5 py-3 text-sm font-bold tracking-wide transition border-b-2 cursor-pointer ${
            activeTab === 'stats'
              ? 'border-indigo-500 text-indigo-400 bg-gray-900/50'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Estadísticas
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-5 py-3 text-sm font-bold tracking-wide transition border-b-2 cursor-pointer ${
            activeTab === 'inventory'
              ? 'border-indigo-500 text-indigo-400 bg-gray-900/50'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Inventario
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`px-5 py-3 text-sm font-bold tracking-wide transition border-b-2 cursor-pointer ${
            activeTab === 'equipment'
              ? 'border-indigo-500 text-indigo-400 bg-gray-900/50'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Equipamiento
        </button>
        <button
          onClick={() => setActiveTab('biography')}
          className={`px-5 py-3 text-sm font-bold tracking-wide transition border-b-2 cursor-pointer ${
            activeTab === 'biography'
              ? 'border-indigo-500 text-indigo-400 bg-gray-900/50'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Biografía
        </button>
      </div>

      {/* Renderizado Condicional de Contenido */}
      <div className="w-full max-w-4xl flex justify-center">
        {activeTab === 'profile' && (
          <ProfileTab character={character} onCharacterUpdate={handleCharacterUpdate} />
        )}
        {activeTab === 'class' && (
          <ClassTab character={character} onCharacterUpdate={handleCharacterUpdate} />
        )}
        {activeTab === 'stats' && (
          <StatsTab character={character} onCharacterUpdate={handleCharacterUpdate} />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab character={character} onCharacterUpdate={handleCharacterUpdate} />
        )}
        {activeTab === 'equipment' && (
          <EquipmentTab character={character} onCharacterUpdate={handleCharacterUpdate} />
        )}
        {activeTab === 'biography' && (
          <BiographyTab character={character} onCharacterUpdate={handleCharacterUpdate} />
        )}
      </div>
    </div>
  );
}