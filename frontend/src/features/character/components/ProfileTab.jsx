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

export function ProfileTab({ character, onCharacterUpdate }) {
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
    const activeClassId = character?.main_class_id || character?.class_id;
    if (activeClassId) {
      fetchSubclasses(activeClassId, setSubclassesList);
    } else {
      setSubclassesList([]);
    }
  }, [character?.main_class_id, character?.class_id]);

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
    if (!character?.raza) return '';
    return character.raza
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const razaClave = getRazaClave();
  const isHumano = razaClave === 'humano';
  const nativeLanguages = IDIOMAS_POR_RAZA[razaClave] || ['Común'];

  const handleSelectExtraLanguage = async (idiomaNombre) => {
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
    setSavingField('main_class_id');
    const updates = { main_class_id: newClassId || null, subclass_id: null };

    try {
      const { error } = await supabase
        .from('characters')
        .update(updates)
        .eq('id', character.id);

      if (error) throw error;

      onCharacterUpdate('main_class_id', updates.main_class_id);
      onCharacterUpdate('subclass_id', null);
    } catch (err) {
      console.error('Error al cambiar clase:', err);
    } finally {
      setSavingField(null);
    }
  };

  const handleSubclassChange = async (newSubclassId) => {
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

  const activeClassId = character?.main_class_id || character?.class_id;

  return (
    <div className="w-full max-w-4xl bg-gray-900/90 border-2 border-gray-800/90 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
      <div className="flex justify-between items-center border-b border-gray-800/80 pb-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono tracking-widest text-gray-400 uppercase">
            Gremio de Aventureros • Registro Oficial
          </span>
        </div>
        <span className="text-xs font-mono text-gray-500 uppercase">
          Licencia Tipo-A
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        <div className="md:col-span-4 flex flex-col items-center">
          <label 
            htmlFor="avatar-upload"
            className="w-full aspect-[4/5] max-w-[220px] bg-gray-950 rounded-2xl border-2 border-indigo-500/30 flex flex-col items-center justify-center overflow-hidden shadow-inner relative group cursor-pointer hover:border-indigo-500 transition-all"
          >
            {character?.avatar_url ? (
              <img
                src={character.avatar_url}
                alt={character.nombre}
                className="w-full h-full object-cover group-hover:opacity-75 transition"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-600 group-hover:text-indigo-400 transition">
                <svg className="w-16 h-16 text-indigo-500/40 group-hover:text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-5.45 9-12V5l-9-3zm0 4a3 3 0 110 6 3 3 0 010-6zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
                <span className="text-xs font-mono uppercase tracking-wider text-gray-500 group-hover:text-indigo-300">
                  Subir Foto
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-xs font-bold text-white uppercase tracking-wider">
              {uploading ? 'Subiendo...' : 'Cambiar Foto'}
            </div>
          </label>

          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            onChange={handleAvatarUpload}
            disabled={uploading}
            className="hidden"
          />

          <div className="mt-4 px-3 py-1 bg-gray-950 border border-gray-800 rounded-lg">
            <span className="text-[11px] font-mono text-indigo-400 font-bold">
              {uploading ? 'PROCESANDO...' : 'ESTADO: ACTIVO'}
            </span>
          </div>
        </div>

        <div className="md:col-span-8 grid grid-cols-2 gap-x-6 gap-y-5 content-start">
          <div className="col-span-2 border-b border-gray-800/80 pb-2">
            <p className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">Nombre Completo</p>
            <p className="text-xl font-black text-indigo-300 mt-0.5">{character?.nombre || '—'}</p>
          </div>

          <div className="border-b border-gray-800/80 pb-2">
            <p className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">Edad</p>
            {isEditingEdad ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  value={edadInput}
                  onChange={(e) => setEdadInput(e.target.value)}
                  placeholder="Ej. 25"
                  className="w-24 bg-gray-950 border border-indigo-500/50 rounded-md px-2 py-1 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={() => {
                    updateField('edad', edadInput ? parseInt(edadInput) : null);
                    setIsEditingEdad(false);
                  }}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded cursor-pointer transition text-white"
                >
                  Guardar
                </button>
              </div>
            ) : (
              <div 
                onClick={() => setIsEditingEdad(true)}
                className="flex items-center gap-2 cursor-pointer group mt-0.5"
              >
                <p className="text-base font-semibold text-gray-200 group-hover:text-indigo-300 transition">
                  {character?.edad ? `${character.edad} años` : 'Añadir edad...'}
                </p>
                <span className="text-xs text-gray-600 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition">
                  ✎
                </span>
              </div>
            )}
          </div>

          {/* Raza */}
          <div className="border-b border-gray-800/80 pb-2">
            <p className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">Raza / Especie</p>
            <select
              value={character?.raza || ''}
              onChange={(e) => updateField('raza', e.target.value)}
              disabled={savingField === 'raza'}
              className="mt-1 w-full bg-gray-950 border border-gray-800 hover:border-indigo-500/50 text-gray-200 font-semibold text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="">Selecciona raza...</option>
              {razas.map((raza) => (
                <option key={raza.id} value={raza.name} className="bg-gray-900 text-white">
                  {raza.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clase Principal */}
          <div className="border-b border-gray-800/80 pb-2">
            <p className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">Clase Principal</p>
            <select
              value={character?.main_class_id || character?.class_id || ''}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={savingField === 'main_class_id'}
              className="mt-1 w-full bg-gray-950 border border-gray-800 hover:border-indigo-500/50 text-gray-200 font-semibold text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="">Selecciona clase...</option>
              {classesList.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-gray-900 text-white">
                  {cls.nombre || cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subclase */}
          <div className="border-b border-gray-800/80 pb-2">
            <p className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">Subclase / Eidolon</p>
            <select
              value={character?.subclass_id || ''}
              onChange={(e) => handleSubclassChange(e.target.value)}
              disabled={savingField === 'subclass_id' || !activeClassId}
              className="mt-1 w-full bg-gray-950 border border-gray-800 hover:border-indigo-500/50 text-gray-200 font-semibold text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition cursor-pointer disabled:opacity-40"
            >
              <option value="">
                {!activeClassId ? 'Elige una clase primero' : 'Selecciona subclase...'}
              </option>
              {subclassesList.map((sub) => (
                <option key={sub.id} value={sub.id} className="bg-gray-900 text-white">
                  {sub.nombre || sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Multiclase */}
          <div className="border-b border-gray-800/80 pb-2">
            <p className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">Multiclase</p>
            <select
              value={character?.multiclass_id || ''}
              onChange={(e) => handleMulticlassChange(e.target.value)}
              disabled={savingField === 'multiclass_id'}
              className="mt-1 w-full bg-gray-950 border border-gray-800 hover:border-indigo-500/50 text-gray-200 font-semibold text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="">Ninguna / Selecciona...</option>
              {classesList.map((cls) => (
                <option key={cls.id} value={cls.id} className="bg-gray-900 text-white">
                  {cls.nombre || cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subclase Adicional */}
          <div className="border-b border-gray-800/80 pb-2">
            <p className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">Subclase Adicional</p>
            <select
              value={character?.multiclass_subclass_id || ''}
              onChange={(e) => handleMultiSubclassChange(e.target.value)}
              disabled={savingField === 'multiclass_subclass_id' || !character?.multiclass_id}
              className="mt-1 w-full bg-gray-950 border border-gray-800 hover:border-indigo-500/50 text-gray-200 font-semibold text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition cursor-pointer disabled:opacity-40"
            >
              <option value="">
                {!character?.multiclass_id ? 'Elige multiclase primero' : 'Selecciona subclase...'}
              </option>
              {multiSubclassesList.map((sub) => (
                <option key={sub.id} value={sub.id} className="bg-gray-900 text-white">
                  {sub.nombre || sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Idiomas Conocidos */}
          <div className="col-span-2 pt-2 border-t border-gray-800/80">
            <p className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase mb-2">
              Idiomas Conocidos
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {nativeLanguages.map((idioma) => (
                <div
                  key={`native-${idioma}`}
                  className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-300 shadow-inner"
                >
                  {idioma}
                </div>
              ))}

              {isHumano && (
                <div className="flex-1 min-w-[200px]">
                  <select
                    value={extraLanguages[0] || ''}
                    onChange={(e) => handleSelectExtraLanguage(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 hover:border-indigo-500/50 text-gray-200 font-semibold text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    <option value="">Selecciona idioma adicional...</option>
                    {languagesList
                      .filter((lang) => lang.nombre !== 'Común')
                      .map((lang) => (
                        <option key={lang.id} value={lang.nombre} className="bg-gray-900 text-white">
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