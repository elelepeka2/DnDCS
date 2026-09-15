import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';

export function ClassTab({ character, onCharacterUpdate }) {
  const [classesList, setClassesList] = useState([]);
  const [subclassesList, setSubclassesList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(character?.class_id || '');
  const [selectedSubclassId, setSelectedSubclassId] = useState(character?.subclass_id || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchSubclasses(selectedClassId);
    } else {
      setSubclassesList([]);
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    const { data, error } = await supabase.from('classes').select('*');
    if (!error && data) setClassesList(data);
  };

  const fetchSubclasses = async (classId) => {
    const { data, error } = await supabase
      .from('subclasses')
      .select('*')
      .eq('class_id', classId);
    if (!error && data) setSubclassesList(data);
  };

  const handleSaveClass = async (newClassId, newSubclassId) => {
    setSaving(true);
    const { error } = await supabase
      .from('characters')
      .update({
        class_id: newClassId || null,
        subclass_id: newSubclassId || null,
      })
      .eq('id', character.id);

    if (!error) {
      onCharacterUpdate('class_id', newClassId);
      onCharacterUpdate('subclass_id', newSubclassId);
    } else {
      console.error('Error al actualizar la clase:', error);
      alert('Error al guardar la clase');
    }
    setSaving(false);
  };

  return (
    <div className="w-full max-w-4xl bg-gray-900/90 border-2 border-gray-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white mb-6">Gestión de Clase y Subclase</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Selector de Clase */}
        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-2">
            Clase Principal
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              const newId = e.target.value;
              setSelectedClassId(newId);
              setSelectedSubclassId('');
              handleSaveClass(newId, null);
            }}
            disabled={saving}
            className="w-full bg-gray-950 border border-gray-800 text-white font-semibold text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">Selecciona una clase...</option>
            {classesList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Subclase / Eidolon */}
        <div>
          <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-2">
            Subclase / Forma Base
          </label>
          <select
            value={selectedSubclassId}
            onChange={(e) => {
              const newSubId = e.target.value;
              setSelectedSubclassId(newSubId);
              handleSaveClass(selectedClassId, newSubId);
            }}
            disabled={saving || !selectedClassId || subclassesList.length === 0}
            className="w-full bg-gray-950 border border-gray-800 text-white font-semibold text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
          >
            <option value="">
              {!selectedClassId
                ? 'Elige una clase primero'
                : subclassesList.length === 0
                ? 'Sin subclases disponibles'
                : 'Selecciona una subclase/forma...'}
            </option>
            {subclassesList.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}