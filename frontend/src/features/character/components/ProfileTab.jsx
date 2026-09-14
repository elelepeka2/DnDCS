export function ProfileTab({ character }) {
  if (!character) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl max-w-2xl text-white">
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        
        {/* Contenedor del Avatar / Foto */}
        <div className="w-36 h-48 bg-gray-950 border-2 border-gray-800 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center relative">
          {character.avatar_url ? (
            <img 
              src={character.avatar_url} 
              alt={character.nombre} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-2">
              <span className="text-4xl block mb-1">🛡️</span>
              <span className="text-xs text-gray-500 font-semibold">Sin Foto</span>
            </div>
          )}
        </div>

        {/* Campos del Perfil */}
        <div className="flex-1 space-y-3 w-full">
          
          {/* Fila 1: Nombre y Edad */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Nombre</label>
              <p className="text-base font-bold border-b border-gray-800 pb-1 text-indigo-300">
                {character.nombre}
              </p>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Edad</label>
              <p className="text-base font-bold border-b border-gray-800 pb-1">
                {character.edad || '—'}
              </p>
            </div>
          </div>

          {/* Fila 2: Raza */}
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Raza</label>
            <p className="text-sm font-medium border-b border-gray-800 pb-1">
              {character.races?.nombre || 'Humano'}
            </p>
          </div>

          {/* Fila 3: Clase y Subclase */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Clase</label>
              <p className="text-sm font-medium border-b border-gray-800 pb-1">
                {character.classes?.nombre || 'Sin Clase'}
              </p>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Subclase</label>
              <p className="text-sm font-medium border-b border-gray-800 pb-1 text-gray-400">
                {character.subclasses?.nombre || '—'}
              </p>
            </div>
          </div>

          {/* Fila 4: Multiclase y Subclase */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Multiclase</label>
              <p className="text-sm font-medium border-b border-gray-800 pb-1 text-gray-400">
                —
              </p>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Subclase</label>
              <p className="text-sm font-medium border-b border-gray-800 pb-1 text-gray-400">
                —
              </p>
            </div>
          </div>

          {/* Fila 5: Idiomas */}
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Idioma/s</label>
            <p className="text-sm font-medium border-b border-gray-800 pb-1 text-gray-300">
              Común
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}