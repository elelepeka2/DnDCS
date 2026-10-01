import { useState } from 'react';
import { supabase } from '../../services/supabaseClient';

export function CreateCharacterModal({ isOpen, onClose, onCharacterCreated, userId }) {
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setLoading(true);

    // Si userId no viene via prop, lo obtenemos directo de la sesión activa
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    if (!currentUserId) {
      alert('Error: No se encontró una sesión activa de usuario.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('characters')
      .insert([
        {
          user_id: currentUserId,
          nombre: nombre.trim(),
          nivel: 1,
          experiencia: 0,
          hp_max: 10,
          hp_actual: 10,
        },
      ])
      .select()
      .single();

    setLoading(false);

    if (error) {
      alert('Error al crear el personaje: ' + error.message);
    } else {
      setNombre('');
      onCharacterCreated(data);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-ink-900 border border-ink-700 p-6 w-full max-w-md text-ink-50 shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Nuevo Aventurero</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-400 uppercase mb-2">
              Nombre del Personaje
            </label>
            <input
              type="text"
              required
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Grok"
              className="w-full bg-ink-800 border border-ink-700 rounded-control p-3 text-ink-50 placeholder:text-ink-400 focus:outline-none focus:border-ink-50 transition-colors text-base"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-ink-800 hover:bg-ink-700 border border-ink-700 text-ink-200 rounded-control text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-ink-50 hover:bg-ink-200 text-ink-950 rounded-control text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creando...' : 'Continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}