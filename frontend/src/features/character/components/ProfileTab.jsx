import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';

// Idiomas predeterminados por raza
const IDIOMAS_POR_RAZA = {
  'humano': ['Común'],
  'elfo': ['Común', 'Élfico'],
  'elfico': ['Común', 'Élfico'],
  'enano': ['Común', 'Enano'],
  'gnomo': ['Común', 'Gnomo'],
  'mediano': ['Común', 'Mediano'],
  'semielfo': ['Común', 'Élfico'],
  'semiorco': ['Común', 'Orco'],
  'draconido': ['Común', 'Dracónico'],
  'tiefling': ['Común', 'Infernal']
};

const DEFAULT_LANGUAGES = [
  { id: 'abisal', nombre: 'Abisal' },
  { id: 'celestial', nombre: 'Celestial' },
  { id: 'comun', nombre: 'Común' },
  { id: 'draconico', nombre: 'Dracónico' },
  { id: 'elfico', nombre: 'Élfico' },
  { id: 'enano', nombre: 'Enano' },
  { id: 'gigante', nombre: 'Gigante' },
  { id: 'gnomo', nombre: 'Gnomo' },
  { id: 'goblin', nombre: 'Goblin' },
  { id: 'infernal', nombre: 'Infernal' },
  { id: 'infracomun', nombre: 'Infracomún' },
  { id: 'jerga-ladrones', nombre: 'Jerga de los Ladrones' },
  { id: 'mediano', nombre: 'Mediano' },
  { id: 'orco', nombre: 'Orco' },
  { id: 'primordial', nombre: 'Primordial' },
  { id: 'silvano', nombre: 'Silvano' }
];

export function ProfileTab({ character, onCharacterUpdate, readOnly = false }) {
  const [razas, setRazas] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [subclassesList, setSubclassesList] = useState([]);
  const [multiSubclassesList, setMultiSubclassesList] = useState([]);
  
  const [languagesList, setLanguagesList] = useState([]);
  const [extraLanguages, setExtraLanguages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [savingField, setSavingField] = useState(null);

  const [edadInput, setEdadInput] = useState(character?.edad || '');
  const [isEditingEdad, setIsEditingEdad] = useState(false);

  useEffect(() => {
    fetchRazas();
    fetchClasses();
    fetchLanguages();
  }, []);

  useEffect(() => {
    setEdadInput(character?.edad || '');
  }, [character?.edad]);

  useEffect(() => {
    if (character?.id) {
      fetchExtraLanguages(character.id);
    }
  }, [character?.id]);

  useEffect(() => {
    const activeClassId = character?.class_id;
    if (activeClassId) {
      fetchSubclasses(activeClassId, setSubclassesList);
    } else {
      setSubclassesList([]);
    }
  }, [character?.class_id]);

  useEffect(() => {
    if (character?.multiclass_id) {
      fetchSubclasses(character.multiclass_id, setMultiSubclassesList);
    } else {
      setMultiSubclassesList([]);
    }
  }, [character?.multiclass_id]);

  const fetchRazas = async () => {
    const { data, error } = await supabase.from('races').select('*').order('name');
    if (error) console.error('Error al cargar razas:', error);
    if (data) setRazas(data);
  };

  const fetchClasses = async () => {
    const { data, error } = await supabase.from('classes').select('*').order('nombre');
    if (error) console.error('Error al cargar clases:', error);
    if (data) setClassesList(data);
  };

  const fetchLanguages = async () => {
    const { data, error } = await supabase.from('languages').select('*').order('nombre');
    if (error || !data || data.length === 0) {
      setLanguagesList(DEFAULT_LANGUAGES);
    } else {
      setLanguagesList(data);
    }
  };

  const fetchSubclasses = async (classId, setList) => {
    if (!classId) return;
    const { data, error } = await supabase
      .from('subclasses')
      .select('*')
      .eq('class_id', classId)
      .order('nombre');
    
    if (error) console.error('Error al cargar subclases:', error);
    if (data) setList(data);
  };

  const fetchExtraLanguages = async (charId) => {
    const { data, error } = await supabase
      .from('character_languages')
      .select('idioma')
      .eq('character_id', charId);

    if (error) {
      console.error('Error al cargar idiomas extras:', error);
    } else if (data) {
      setExtraLanguages(data.map((item) => item.idioma));
    }
  };

  const getRazaClave = () => {
    const raza = razas.find((r) => r.id === character?.race_id);
    if (!raza) return '';
    return raza.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const razaClave = getRazaClave();
  const isHumano = razaClave === 'humano';
  const nativeLanguages = IDIOMAS_POR_RAZA[razaClave] || ['Común'];

  const handleSelectExtraLanguage = async (idiomaNombre) => {
    if (readOnly) return;
    if (!character?.id) return;

    await supabase
      .from('character_languages')
      .delete()
      .eq('character_id', character.id);

    if (idiomaNombre) {
      const { error } = await supabase
        .from('character_languages')
        .insert([{ character_id: character.id, idioma: idiomaNombre }]);

      if (!error) {
        setExtraLanguages([idiomaNombre]);
      } else {
        console.error('Error al asignar idioma adicional:', error);
      }
    } else {
      setExtraLanguages([]);
    }
  };

  const updateField = async (field, value) => {
    if (readOnly) return;
    setSavingField(field);
    const { error } = await supabase
      .from('characters')
      .update({ [field]: value })
      .eq('id', character.id);

    if (!error) {
      onCharacterUpdate(field, value);
    } else {
      console.error(`Error al actualizar ${field}:`, error);
    }
    setSavingField(null);
  };

  const handleClassChange = async (newClassId) => {
    if (readOnly) return;
    setSavingField('class_id');
    const updates = { class_id: newClassId || null, subclass_id: null };

    try {
      const { error } = await supabase
        .from('characters')
        .update(updates)
        .eq('id', character.id);

      if (error) throw error;

      onCharacterUpdate('class_id', updates.class_id);
      onCharacterUpdate('subclass_id', null);
    } catch (err) {
      console.error('Error al cambiar clase:', err);
    } finally {
      setSavingField(null);
    }
  };

  const handleSubclassChange = async (newSubclassId) => {
    if (readOnly) return;
    setSavingField('subclass_id');
    const updates = { subclass_id: newSubclassId || null };

    try {
      const { error } = await supabase.from('characters').update(updates).eq('id', character.id);
      if (error) throw error;

      onCharacterUpdate('subclass_id', updates.subclass_id);
    } catch (err) {
      console.error('Error al cambiar subclase:', err);
    } finally {
      setSavingField(null);
    }
  };

  const handleMulticlassChange = async (newMultiClassId) => {
    if (readOnly) return;
    setSavingField('multiclass_id');
    const updates = { multiclass_id: newMultiClassId || null, multiclass_subclass_id: null };

    try {
      const { error } = await supabase.from('characters').update(updates).eq('id', character.id);
      if (error) throw error;

      onCharacterUpdate('multiclass_id', updates.multiclass_id);
      onCharacterUpdate('multiclass_subclass_id', null);
    } catch (err) {
      console.error('Error al cambiar multiclase:', err);
    } finally {
      setSavingField(null);
    }
  };

  const handleMultiSubclassChange = async (newMultiSubclassId) => {
    if (readOnly) return;
    setSavingField('multiclass_subclass_id');
    const updates = { multiclass_subclass_id: newMultiSubclassId || null };

    try {
      const { error } = await supabase.from('characters').update(updates).eq('id', character.id);
      if (error) throw error;

      onCharacterUpdate('multiclass_subclass_id', updates.multiclass_subclass_id);
    } catch (err) {
      console.error('Error al cambiar subclase adicional:', err);
    } finally {
      setSavingField(null);
    }
  };

  const handleAvatarUpload = async (event) => {
    if (readOnly) return;
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${character.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('character-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('character-avatars')
        .getPublicUrl(filePath);

      await updateField('avatar_url', publicUrlData.publicUrl);
    } catch (error) {
      console.error('Error subiendo imagen:', error);
    } finally {
      setUploading(false);
    }
  };

  const activeClassId = character?.class_id;

  return (
    <div className="w-full max-w-4xl bg-ink-900 border border-ink-700 p-6 md:p-8 relative overflow-hidden">
      <div className="flex justify-between items-center border-b border-ink-700 pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-ink-200 animate-pulse" />
          <span className="text-xs font-mono tracking-widest text-ink-400 uppercase">
            Gremio de Aventureros • Registro Oficial
          </span>
        </div>
        <span className="text-xs font-mono text-ink-400 uppercase">
          Licencia Tipo-A
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        <div className="md:col-span-4 flex flex-col items-center">
          <label
            htmlFor="avatar-upload"
            className={`w-full aspect-[4/5] max-w-[220px] bg-ink-950 rounded-control border border-ink-700 flex flex-col items-center justify-center overflow-hidden relative transition-colors ${
              readOnly ? '' : 'group cursor-pointer hover:border-ink-400'
            }`}
          >
            {character?.avatar_url ? (
              <img
                src={character.avatar_url}
                alt={character.nombre}
                className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-ink-400 group-hover:text-ink-50 transition-colors">
                <svg className="w-16 h-16 text-ink-400 group-hover:text-ink-200" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V5l-9-3zm0 4a3 3 0 110 6 3 3 0 010-6zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
                <span className="text-xs font-mono uppercase tracking-wider text-ink-400 group-hover:text-ink-50">
                  {readOnly ? 'Sin foto' : 'Subir Foto'}
                </span>
              </div>
            )}

            {!readOnly && (
              <div className="absolute inset-0 bg-ink-950/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold text-ink-50 uppercase tracking-wider">
                {uploading ? 'Subiendo...' : 'Cambiar Foto'}
              </div>
            )}
          </label>

          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            onChange={handleAvatarUpload}
            disabled={uploading || readOnly}
            className="hidden"
          />

          <div className="mt-4 px-3 py-1 bg-ink-950 border border-ink-700 rounded-control">
            <span className="text-xs font-mono text-ink-400 font-bold">
              {uploading ? 'PROCESANDO...' : 'ESTADO: ACTIVO'}
            </span>
          </div>
        </div>

        <div className="md:col-span-8 grid grid-cols-2 gap-x-6 gap-y-5 content-start">
          <div className="col-span-2 border-b border-ink-700 pb-2">
            <p className="text-xs font-mono font-bold tracking-widest text-ink-400 uppercase">Nombre Completo</p>
            <p className="text-xl font-bold text-ink-50 mt-0.5">{character?.nombre || '—'}</p>
          </div>

          <div className="border-b border-ink-700 pb-2">
            <p className="text-xs font-mono font-bold tracking-widest text-ink-400 uppercase">Edad</p>
            {isEditingEdad ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  value={edadInput}
                  onChange={(e) => setEdadInput(e.target.value)}
                  placeholder="Ej. 25"
                  disabled={readOnly}
                  className="w-24 bg-ink-800 border border-ink-700 rounded-control px-2 py-1 text-sm font-medium text-ink-50 focus:outline-none focus:border-ink-400 disabled:opacity-50"
                />
                <button
                  onClick={() => {
                    updateField('edad', edadInput ? parseInt(edadInput) : null);
                    setIsEditingEdad(false);
                  }}
                  disabled={readOnly}
                  className="px-2 py-1 bg-ink-50 hover:bg-ink-200 text-ink-950 text-xs font-bold rounded-control cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  // Non-form affordance: also stays out of edit mode when read-only.
                  if (readOnly) return;
                  setIsEditingEdad(true);
                }}
                className={`flex items-center gap-2 mt-0.5 ${readOnly ? '' : 'cursor-pointer group'}`}
              >
                <p className="text-base font-medium text-ink-200 group-hover:text-ink-50 transition-colors">
                  {character?.edad ? `${character.edad} años` : readOnly ? '—' : 'Añadir edad...'}
                </p>
                {!readOnly && (
                  <span className="text-xs text-ink-400 group-hover:text-ink-200 opacity-0 group-hover:opacity-100 transition-opacity">
                    ✎
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Raza */}
          <div className="border-b border-ink-700 pb-2">
            <p className="text-xs font-mono font-bold tracking-widest text-ink-400 uppercase">Raza / Especie</p>
            <select
              value={character?.race_id || ''}
              onChange={(e) => updateField('race_id', e.target.value || null)}
              disabled={readOnly || savingField === 'race_id'}
              className="mt-1 w-full bg-ink-800 border border-ink-700 hover:border-ink-400 text-ink-200 font-medium text-sm rounded-control px-2.5 py-1.5 focus:outline-none focus:border-ink-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Selecciona raza...</option>
              {razas.map((raza) => (
                <option key={raza.id} value={raza.id} className="bg-ink-900 text-ink-50">
                  {raza.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clase Principal */}
          <div className="border-b border-ink-700 pb-2">
            <p className="text-xs font-mono font-bold tracking-widest text-ink-400 uppercase">Clase Principal</p>
            <select
              value={character?.class_id || ''}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={readOnly || savingField === 'class_id'}
              className="mt-1 w-full bg-ink-800 border border-ink-700 hover:border-ink-400 text-ink-200 font-medium text-sm rounded-control px-2.5 py-1.5 focus:outline-none focus:border-ink-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Selecciona clase...</option>
              {classesList.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-ink-900 text-ink-50">
                  {cls.nombre || cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subclase */}
          <div className="border-b border-ink-700 pb-2">
            <p className="text-xs font-mono font-bold tracking-widest text-ink-400 uppercase">Subclase / Eidolon</p>
            <select
              value={character?.subclass_id || ''}
              onChange={(e) => handleSubclassChange(e.target.value)}
              disabled={readOnly || savingField === 'subclass_id' || !activeClassId}
              className="mt-1 w-full bg-ink-800 border border-ink-700 hover:border-ink-400 text-ink-200 font-medium text-sm rounded-control px-2.5 py-1.5 focus:outline-none focus:border-ink-400 transition-colors cursor-pointer disabled:opacity-40"
            >
              <option value="">
                {!activeClassId ? 'Elige una clase primero' : 'Selecciona subclase...'}
              </option>
              {subclassesList.map((sub) => (
                <option key={sub.id} value={sub.id} className="bg-ink-900 text-ink-50">
                  {sub.nombre || sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Multiclase */}
          <div className="border-b border-ink-700 pb-2">
            <p className="text-xs font-mono font-bold tracking-widest text-ink-400 uppercase">Multiclase</p>
            <select
              value={character?.multiclass_id || ''}
              onChange={(e) => handleMulticlassChange(e.target.value)}
              disabled={readOnly || savingField === 'multiclass_id'}
              className="mt-1 w-full bg-ink-800 border border-ink-700 hover:border-ink-400 text-ink-200 font-medium text-sm rounded-control px-2.5 py-1.5 focus:outline-none focus:border-ink-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Ninguna / Selecciona...</option>
              {classesList.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-ink-900 text-ink-50">
                  {cls.nombre || cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subclase Adicional */}
          <div className="border-b border-ink-700 pb-2">
            <p className="text-xs font-mono font-bold tracking-widest text-ink-400 uppercase">Subclase Adicional</p>
            <select
              value={character?.multiclass_subclass_id || ''}
              onChange={(e) => handleMultiSubclassChange(e.target.value)}
              disabled={readOnly || savingField === 'multiclass_subclass_id' || !character?.multiclass_id}
              className="mt-1 w-full bg-ink-800 border border-ink-700 hover:border-ink-400 text-ink-200 font-medium text-sm rounded-control px-2.5 py-1.5 focus:outline-none focus:border-ink-400 transition-colors cursor-pointer disabled:opacity-40"
            >
              <option value="">
                {!character?.multiclass_id ? 'Elige multiclase primero' : 'Selecciona subclase...'}
              </option>
              {multiSubclassesList.map((sub) => (
                <option key={sub.id} value={sub.id} className="bg-ink-900 text-ink-50">
                  {sub.nombre || sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Idiomas Conocidos */}
          <div className="col-span-2 pt-2 border-t border-ink-700">
            <p className="text-xs font-mono font-bold tracking-widest text-ink-400 uppercase mb-2">
              Idiomas Conocidos
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {nativeLanguages.map((idioma) => (
                <div
                  key={`native-${idioma}`}
                  className="bg-ink-800 border border-ink-700 rounded-control px-3 py-1.5 text-sm font-medium text-ink-200"
                >
                  {idioma}
                </div>
              ))}

              {isHumano && (
                <div className="flex-1 min-w-[200px]">
                  <select
                    value={extraLanguages[0] || ''}
                    onChange={(e) => handleSelectExtraLanguage(e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-ink-800 border border-ink-700 hover:border-ink-400 text-ink-200 font-medium text-sm rounded-control px-2.5 py-1.5 focus:outline-none focus:border-ink-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecciona idioma adicional...</option>
                    {languagesList
                      .filter((lang) => lang.nombre !== 'Común')
                      .map((lang) => (
                        <option key={lang.id} value={lang.nombre} className="bg-ink-900 text-ink-50">
                          {lang.nombre}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}