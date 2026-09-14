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
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full max-w-md text-white shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Nuevo Aventurero</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">
              Nombre del Personaje
            </label>
            <input
              type="text"
              required
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Grok"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 text-base"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creando...' : 'Continuar →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}