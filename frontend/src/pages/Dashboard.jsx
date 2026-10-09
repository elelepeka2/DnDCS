import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { CreateCharacterModal } from '../components/ui/CreateCharacterModal';
import { EditProfileModal } from '../features/profile/EditProfileModal';
import { CanvasDie } from '../components/ui/dice/CanvasDie';

export function Dashboard({ user, role }) {
  const [characters, setCharacters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
    <div className="min-h-screen bg-ink-950 text-ink-50 p-6">
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-8 border-b border-ink-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Aventureros</h1>
          <p className="text-sm text-ink-400 mt-1">
            {user?.user_metadata?.username ?? user?.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="px-4 py-2 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-sm font-medium rounded-control transition-colors cursor-pointer"
          >
            Mi perfil
          </button>
          {role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-sm font-medium rounded-control transition-colors cursor-pointer"
            >
              Administración
            </button>
          )}
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 text-sm font-medium rounded-control transition-colors cursor-pointer"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        {/* IMM-H2: hero band — three flat tonal planes (tabletop strata), the
            DND:DOS wordmark over them and a slowly tumbling d20 (CanvasDie,
            decorative). Presentation-only, no cards, no new tokens. */}
        <section className="dash-band">
          <div className="dash-plane dash-plane-far" aria-hidden="true" />
          <div className="dash-plane dash-plane-mid" aria-hidden="true" />
          <div className="dash-plane dash-plane-near" aria-hidden="true" />
          <div className="dash-die" aria-hidden="true">
            <CanvasDie sides={20} value={20} settled size={96} />
          </div>
          <p className="dash-wordmark">DND:DOS</p>
        </section>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Tus Personajes</h2>
          {characters.length > 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-ink-50 hover:bg-ink-200 text-ink-950 text-sm font-bold rounded-control transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>+</span> Crear Personaje
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-center text-ink-400 py-12">Cargando personajes...</p>
        ) : characters.length === 0 ? (
          <div className="text-center py-16 bg-ink-900 border border-ink-700">
            <p className="text-ink-400 text-lg mb-6">No tienes personajes creados aún.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-ink-50 hover:bg-ink-200 text-ink-950 font-bold rounded-control transition-colors inline-flex items-center gap-2 cursor-pointer"
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
                className="bg-ink-900 border border-ink-700 hover:border-ink-400 p-4 cursor-pointer transition-colors flex items-center justify-between"
              >
                {/* Lado Izquierdo: Foto y Nombre */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-ink-950 border border-ink-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {char.avatar_url ? (
                      <img 
                        src={char.avatar_url} 
                        alt={char.nombre} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-xl font-bold text-ink-400 uppercase">
                        {char.nombre.charAt(0)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-ink-50">
                    {char.nombre}
                  </h3>
                </div>

                {/* Lado Derecho: Nivel y Creador */}
                <div className="text-right">
                  <p className="text-sm font-bold text-ink-200">
                    Nivel {char.nivel || 1}
                  </p>
                  <p className="text-xs text-ink-400 font-medium">
                    {(user?.user_metadata?.username ?? user?.email) || 'Creador desconocido'}
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

      {/* Perfil propio (S4): username solo si isOwn — el rename también
          sincroniza user_metadata vía auth.updateUser (diseño D4). */}
      <EditProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        targetUserId={user?.id}
        isOwn
      />
    </div>
  );
}