import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';

// Pestañas del personaje
import { ProfileTab } from './components/ProfileTab';
import { StatsTab } from './components/StatsTab';
import { ClassTab } from './components/ClassTab';
import { InventoryTab } from './components/InventoryTab';
import { EquipmentTab } from './components/EquipmentTab';
import { BiographyTab } from './components/BiographyTab';
import { tabPillTransition } from '../../components/ui/motionVariants';

export function CharacterDetailView({ readOnly = false, backTo = '/dashboard' }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [character, setCharacter] = useState(null);
  // Fail-closed: the session resolves in the load effect BEFORE rendering;
  // while sessionUserId is still null, isReadOnly stays true.
  const [sessionUserId, setSessionUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const tabListRef = useRef(null);

  // Presentation only: keep the active tab centered in the horizontal scroller
  // (design decision 6 — tab overflow = scroll, scrollIntoView inline:'center').
  useEffect(() => {
    const tabList = tabListRef.current;
    if (!tabList) return;
    const active = tabList.querySelector(`[data-tab="${activeTab}"]`);
    active?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [activeTab]);

  useEffect(() => {
    if (id) {
      fetchCharacter();
    }
  }, [id]);

  const fetchCharacter = async () => {
    try {
      setLoading(true);

      // Resolve the session BEFORE loading data: if anything fails here,
      // sessionUserId stays null and the view falls back to read-only.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSessionUserId(session?.user?.id ?? null);
      } catch (sessionError) {
        console.error('Error resolving the session:', sessionError);
        setSessionUserId(null);
      }

      // Consulta intentando traer las relaciones de clase y subclase
      let { data, error } = await supabase
        .from('characters')
        .select(`
          *,
          classes ( id, nombre ),
          subclasses ( id, nombre ),
          races ( id, name )
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
      <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center text-ink-50">
        <div className="w-10 h-10 border-4 border-ink-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-ink-400">Cargando datos del aventurero...</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center text-ink-50">
        <p className="text-lg font-bold mb-4 text-ink-200">Personaje no encontrado.</p>
        <button
          onClick={() => navigate(backTo)}
          className="px-4 py-2 bg-ink-50 hover:bg-ink-200 text-ink-950 font-bold rounded-control transition-colors cursor-pointer"
        >
          ← Volver al Panel
        </button>
      </div>
    );
  }

  // Fail-closed (design): read-only when the prop asks for it, when the session
  // has not resolved yet, or when the ownership mismatches. The session is
  // already resolved here because fetchCharacter awaits it before setCharacter.
  const isReadOnly = readOnly || !sessionUserId || character.user_id !== sessionUserId;

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 p-4 md:p-8 flex flex-col items-center">
      {/* Botón Volver */}
      <div className="w-full max-w-4xl mb-6">
        <button
          onClick={() => navigate(backTo)}
          className="text-xs font-mono uppercase tracking-wider text-ink-400 hover:text-ink-50 flex items-center gap-2 transition-colors cursor-pointer"
        >
          ← Volver al Panel
        </button>
      </div>

      {/* Navegación por Pestañas */}
      <div
        ref={tabListRef}
        className="w-full max-w-4xl flex gap-1 mb-8 overflow-x-auto border-b border-ink-700 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%_-_12px),transparent)]"
      >
        <button
          onClick={() => setActiveTab('profile')}
          data-tab="profile"
          className={`relative px-4 py-2 text-sm font-bold tracking-wide rounded-pill whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'text-ink-950'
              : 'text-ink-400 hover:text-ink-50 hover:bg-ink-800'
          }`}
        >
          {activeTab === 'profile' && (
            <m.span layoutId="tab-pill" className="absolute inset-0 rounded-pill bg-ink-50" transition={tabPillTransition} />
          )}
          <span className="relative z-10">Perfil</span>
        </button>
        <button
          onClick={() => setActiveTab('class')}
          data-tab="class"
          className={`relative px-4 py-2 text-sm font-bold tracking-wide rounded-pill whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'class'
              ? 'text-ink-950'
              : 'text-ink-400 hover:text-ink-50 hover:bg-ink-800'
          }`}
        >
          {activeTab === 'class' && (
            <m.span layoutId="tab-pill" className="absolute inset-0 rounded-pill bg-ink-50" transition={tabPillTransition} />
          )}
          <span className="relative z-10">Clase</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          data-tab="stats"
          className={`relative px-4 py-2 text-sm font-bold tracking-wide rounded-pill whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'stats'
              ? 'text-ink-950'
              : 'text-ink-400 hover:text-ink-50 hover:bg-ink-800'
          }`}
        >
          {activeTab === 'stats' && (
            <m.span layoutId="tab-pill" className="absolute inset-0 rounded-pill bg-ink-50" transition={tabPillTransition} />
          )}
          <span className="relative z-10">Estadísticas</span>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          data-tab="inventory"
          className={`relative px-4 py-2 text-sm font-bold tracking-wide rounded-pill whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'inventory'
              ? 'text-ink-950'
              : 'text-ink-400 hover:text-ink-50 hover:bg-ink-800'
          }`}
        >
          {activeTab === 'inventory' && (
            <m.span layoutId="tab-pill" className="absolute inset-0 rounded-pill bg-ink-50" transition={tabPillTransition} />
          )}
          <span className="relative z-10">Inventario</span>
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          data-tab="equipment"
          className={`relative px-4 py-2 text-sm font-bold tracking-wide rounded-pill whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'equipment'
              ? 'text-ink-950'
              : 'text-ink-400 hover:text-ink-50 hover:bg-ink-800'
          }`}
        >
          {activeTab === 'equipment' && (
            <m.span layoutId="tab-pill" className="absolute inset-0 rounded-pill bg-ink-50" transition={tabPillTransition} />
          )}
          <span className="relative z-10">Equipamiento</span>
        </button>
        <button
          onClick={() => setActiveTab('biography')}
          data-tab="biography"
          className={`relative px-4 py-2 text-sm font-bold tracking-wide rounded-pill whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'biography'
              ? 'text-ink-950'
              : 'text-ink-400 hover:text-ink-50 hover:bg-ink-800'
          }`}
        >
          {activeTab === 'biography' && (
            <m.span layoutId="tab-pill" className="absolute inset-0 rounded-pill bg-ink-50" transition={tabPillTransition} />
          )}
          <span className="relative z-10">Biografía</span>
        </button>
      </div>

      {/* Renderizado Condicional de Contenido */}
      <div className="w-full max-w-4xl flex justify-center">
        {activeTab === 'profile' && (
          <ProfileTab character={character} onCharacterUpdate={handleCharacterUpdate} readOnly={isReadOnly} />
        )}
        {activeTab === 'class' && (
          <ClassTab character={character} onCharacterUpdate={handleCharacterUpdate} readOnly={isReadOnly} />
        )}
        {activeTab === 'stats' && (
          <StatsTab character={character} onCharacterUpdate={handleCharacterUpdate} readOnly={isReadOnly} />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab character={character} onCharacterUpdate={handleCharacterUpdate} readOnly={isReadOnly} />
        )}
        {activeTab === 'equipment' && (
          <EquipmentTab character={character} onCharacterUpdate={handleCharacterUpdate} readOnly={isReadOnly} />
        )}
        {activeTab === 'biography' && (
          <BiographyTab character={character} onCharacterUpdate={handleCharacterUpdate} readOnly={isReadOnly} />
        )}
      </div>
    </div>
  );
}