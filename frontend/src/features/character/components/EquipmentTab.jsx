import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';

// Claves de slot en EN (las que se persisten en character_equipment.slot)
const SLOTS = ['main_weapon', 'off_hand', 'armor', 'shield', 'accessory_1', 'accessory_2'];

// Etiquetas en ES: solo se muestran en la UI, nunca se guardan
const SLOT_LABELS = {
  main_weapon: 'Arma principal',
  off_hand: 'Arma secundaria',
  armor: 'Armadura',
  shield: 'Escudo',
  accessory_1: 'Accesorio 1',
  accessory_2: 'Accesorio 2',
};

export function EquipmentTab({ character, _onCharacterUpdate }) {
  const [equipment, setEquipment] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSlot, setSavingSlot] = useState(null);

  useEffect(() => {
    if (!character?.id) return;

    let cancelled = false;
    (async () => {
      const [equipResult, invResult] = await Promise.all([
        supabase.from('character_equipment').select('*').eq('character_id', character.id),
        supabase
          .from('character_inventory')
          .select('*')
          .eq('character_id', character.id)
          .order('nombre'),
      ]);

      if (cancelled) return;
      if (equipResult.error) {
        console.error('Error al cargar el equipamiento:', equipResult.error);
      } else {
        setEquipment(equipResult.data || []);
      }
      if (invResult.error) {
        console.error('Error al cargar el inventario para equipar:', invResult.error);
      } else {
        setInventory(invResult.data || []);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [character?.id]);

  const rowForSlot = (slot) => equipment.find((row) => row.slot === slot) || null;

  const handleEquip = async (slot, itemId) => {
    if (!itemId) return;

    const item = inventory.find((row) => row.id === itemId);
    if (!item) return;

    // Un solo objeto por ranura: regla aplicada en app, sin constraint en BD
    if (rowForSlot(slot)) return;

    setSavingSlot(slot);
    // equipment_base_id se omite a proposito: queda en null (sin catalogo sembrado)
    const { data, error } = await supabase
      .from('character_equipment')
      .insert({ character_id: character.id, slot, nombre_objeto: item.nombre })
      .select();

    if (error) {
      console.error('Error al equipar el objeto:', error);
    } else if (data && data[0]) {
      setEquipment((prev) => [...prev, data[0]]);
    }
    setSavingSlot(null);
  };

  const handleUnequip = async (slot) => {
    const row = rowForSlot(slot);
    if (!row) return;

    setSavingSlot(slot);
    const { error } = await supabase.from('character_equipment').delete().eq('id', row.id);

    if (error) {
      console.error('Error al desequipar el objeto:', error);
    } else {
      setEquipment((prev) => prev.filter((r) => r.id !== row.id));
    }
    setSavingSlot(null);
  };

  return (
    <div className="w-full max-w-4xl bg-gray-900/90 border-2 border-gray-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white mb-6">Equipamiento</h2>

      {loading ? (
        <p className="text-sm font-mono text-gray-500">Cargando equipamiento...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SLOTS.map((slot) => {
            const row = rowForSlot(slot);
            const busy = savingSlot === slot;

            return (
              <div key={slot} className="bg-gray-950/70 border border-gray-800 rounded-xl p-4">
                {/* La etiqueta es ES; la clave EN solo se usa para persistir */}
                <p className="text-xs font-mono font-bold text-gray-400 uppercase mb-2">
                  {SLOT_LABELS[slot]}
                </p>

                {row ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white truncate">
                      {row.nombre_objeto}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnequip(slot)}
                      disabled={busy}
                      className="shrink-0 px-3 py-2 bg-gray-800 hover:bg-red-900/60 text-gray-300 hover:text-red-300 text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
                    >
                      {busy ? '...' : 'Desequipar'}
                    </button>
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={(event) => handleEquip(slot, event.target.value)}
                    disabled={busy || inventory.length === 0}
                    className="w-full bg-gray-900 border border-gray-800 text-white font-semibold text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {inventory.length === 0 ? 'Sin objetos para equipar' : 'Equipar un objeto...'}
                    </option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
