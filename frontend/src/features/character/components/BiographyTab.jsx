import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../services/supabaseClient';

const AUTOSAVE_DELAY_MS = 800;

const BIOGRAPHY_FIELDS = [
  {
    key: 'historia',
    label: 'Historia',
    placeholder: 'Origen, infancia y los hechos que marcaron a tu personaje...',
  },
  {
    key: 'personalidad',
    label: 'Personalidad',
    placeholder: 'Temperamento, maneras, lo que dice y lo que calla...',
  },
  {
    key: 'ideales',
    label: 'Ideales',
    placeholder: 'Lo que defiende: convicciones, motivaciones, código moral...',
  },
  {
    key: 'vinculos',
    label: 'Vínculos',
    placeholder: 'Aliados, familia, facciones o lugares a los que está ligado...',
  },
  {
    key: 'defectos',
    label: 'Defectos',
    placeholder: 'Vicios, miedos, manías y errores que le complican la vida...',
  },
];

export function BiographyTab({ character, onCharacterUpdate }) {
  const [values, setValues] = useState(() => ({
    historia: character?.historia || '',
    personalidad: character?.personalidad || '',
    ideales: character?.ideales || '',
    vinculos: character?.vinculos || '',
    defectos: character?.defectos || '',
  }));
  const [savingField, setSavingField] = useState(null);

  // Timer pendiente por campo: { [field]: { handle, value } }
  const timersRef = useRef({});
  // Props mas recientes, para que el flush al desmontar nunca use un closure viejo
  const latestRef = useRef({ character, onCharacterUpdate });

  useEffect(() => {
    latestRef.current = { character, onCharacterUpdate };
  });

  const persist = useCallback(async (field, value) => {
    const { character: current, onCharacterUpdate: sync } = latestRef.current;
    if (!current?.id) return;

    setSavingField(field);
    const { error } = await supabase
      .from('characters')
      .update({ [field]: value })
      .eq('id', current.id);

    if (error) {
      console.error(`Error al autoguardar ${field}:`, error);
    } else {
      sync(field, value);
    }
    setSavingField(null);
  }, []);

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));

    // Re-armar el debounce: cancela la escritura anterior de este campo
    const pending = timersRef.current[field];
    if (pending) clearTimeout(pending.handle);

    timersRef.current[field] = {
      value,
      handle: setTimeout(() => {
        delete timersRef.current[field];
        persist(field, value);
      }, AUTOSAVE_DELAY_MS),
    };
  };

  // Al desmontar se limpian los timers y se vuelca lo pendiente: cambiar de
  // pestaña dentro de la ventana de 800ms no pierde las ultimas tecleas.
  useEffect(() => {
    const pending = timersRef.current;
    return () => {
      Object.entries(pending).forEach(([field, entry]) => {
        clearTimeout(entry.handle);
        delete pending[field];
        persist(field, entry.value);
      });
    };
  }, [persist]);

  return (
    <div className="w-full max-w-4xl bg-gray-900/90 border-2 border-gray-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-white">Biografía</h2>
        <p className="text-xs font-mono text-gray-500">Se guarda solo al dejar de escribir</p>
      </div>

      <div className="flex flex-col gap-6">
        {BIOGRAPHY_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <label
                htmlFor={`bio-${key}`}
                className="block text-xs font-mono font-bold text-gray-400 uppercase"
              >
                {label}
              </label>
              {savingField === key && (
                <span className="text-xs font-mono text-indigo-400">Guardando...</span>
              )}
            </div>
            <textarea
              id={`bio-${key}`}
              value={values[key]}
              onChange={(event) => handleChange(key, event.target.value)}
              placeholder={placeholder}
              rows={4}
              className="w-full bg-gray-950 border border-gray-800 text-white font-medium text-sm leading-relaxed rounded-xl p-3 focus:outline-none focus:border-indigo-500 resize-y placeholder:text-gray-600"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
