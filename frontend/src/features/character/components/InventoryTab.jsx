import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';

// Orden alfabetico por nombre, tolerante a acentos (coincide con .order('nombre'))
const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');

export function InventoryTab({ character, _onCharacterUpdate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [adding, setAdding] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (!character?.id) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('character_inventory')
        .select('*')
        .eq('character_id', character.id)
        .order('nombre');

      if (cancelled) return;
      if (error) {
        console.error('Error al cargar el inventario:', error);
      } else {
        setItems((data || []).slice().sort(porNombre));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [character?.id]);

  const handleAdd = async (event) => {
    event.preventDefault();
    const nombre = newItemName.trim();
    if (!nombre || adding) return;

    setAdding(true);
    const { data, error } = await supabase
      .from('character_inventory')
      .insert({ character_id: character.id, nombre, cantidad: 1 })
      .select();

    if (error) {
      console.error('Error al agregar el objeto:', error);
    } else if (data && data[0]) {
      setItems((prev) => [...prev, data[0]].sort(porNombre));
      setNewItemName('');
    }
    setAdding(false);
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditName(item.nombre);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleRename = async (item) => {
    const nombre = editName.trim();
    cancelEditing();
    if (!nombre || nombre === item.nombre) return;

    setSavingField(`nombre-${item.id}`);
    const { error } = await supabase
      .from('character_inventory')
      .update({ nombre })
      .eq('id', item.id);

    if (error) {
      console.error('Error al renombrar el objeto:', error);
    } else {
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, nombre } : it)).sort(porNombre)
      );
    }
    setSavingField(null);
  };

  const handleQuantityInput = (id, raw) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, cantidad: raw } : it)));
  };

  const handleQuantityBlur = async (item) => {
    const parsed = parseInt(item.cantidad, 10);
    const cantidad = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
    const previous = item.cantidad;

    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, cantidad } : it)));

    // Valor real sin cambio: solo normalizar la vista, no escribir en la BD
    if (Number(previous) === cantidad) return;

    setSavingField(`cantidad-${item.id}`);
    const { error } = await supabase
      .from('character_inventory')
      .update({ cantidad })
      .eq('id', item.id);

    if (error) console.error('Error al actualizar la cantidad:', error);
    setSavingField(null);
  };

  const handleDelete = async (item) => {
    setSavingField(`borrar-${item.id}`);
    const { error } = await supabase.from('character_inventory').delete().eq('id', item.id);

    if (error) {
      console.error('Error al eliminar el objeto:', error);
    } else {
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    }
    setSavingField(null);
  };

  return (
    <div className="w-full max-w-4xl bg-gray-900/90 border-2 border-gray-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white mb-6">Inventario</h2>

      {/* Alta de objetos */}
      <form onSubmit={handleAdd} className="flex gap-3 mb-6">
        <input
          type="text"
          value={newItemName}
          onChange={(event) => setNewItemName(event.target.value)}
          placeholder="Nombre del objeto..."
          disabled={adding}
          className="flex-1 min-w-0 bg-gray-950 border border-gray-800 text-white font-semibold text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 placeholder:text-gray-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={adding || !newItemName.trim()}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {adding ? 'Agregando...' : '+ Agregar'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm font-mono text-gray-500">Cargando inventario...</p>
      ) : items.length === 0 ? (
        <p className="text-sm font-mono text-gray-500">Sin objetos en el inventario.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 bg-gray-950/70 border border-gray-800 rounded-xl p-3"
            >
              {/* Nombre / renombrado en linea */}
              <div className="flex-1 min-w-40">
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleRename(item);
                      if (event.key === 'Escape') cancelEditing();
                    }}
                    autoFocus
                    className="w-full bg-gray-900 border border-gray-800 text-white font-semibold text-sm rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    className="block w-full text-left text-sm font-semibold text-white truncate hover:text-indigo-300 transition cursor-text"
                    title="Clic para renombrar"
                  >
                    {item.nombre}
                  </button>
                )}
                {item.descripcion && (
                  <p className="text-xs text-gray-500 truncate mt-1">{item.descripcion}</p>
                )}
              </div>

              {/* Cantidad en linea: piso 1 */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`cantidad-${item.id}`}
                  className="text-xs font-mono text-gray-500 uppercase"
                >
                  Cant.
                </label>
                <input
                  id={`cantidad-${item.id}`}
                  type="number"
                  min="1"
                  value={item.cantidad ?? 1}
                  onChange={(event) => handleQuantityInput(item.id, event.target.value)}
                  onBlur={() => handleQuantityBlur(item)}
                  disabled={savingField === `cantidad-${item.id}`}
                  className="w-16 bg-gray-900 border border-gray-800 text-white font-semibold text-sm rounded-lg p-2 text-center focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2">
                {editingId === item.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRename(item)}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Renombrar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={savingField === `borrar-${item.id}`}
                  className="px-3 py-2 bg-gray-800 hover:bg-red-900/60 text-gray-300 hover:text-red-300 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  {savingField === `borrar-${item.id}` ? 'Borrando...' : 'Eliminar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
