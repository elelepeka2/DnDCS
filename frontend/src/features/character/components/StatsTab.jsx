import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../services/supabaseClient';

const RACE_BONUSES = {
  humano: { fuerza_base: 1, destreza_base: 1, constitucion_base: 1, inteligencia_base: 1, sabiduria_base: 1, carisma_base: 1 },
  human: { fuerza_base: 1, destreza_base: 1, constitucion_base: 1, inteligencia_base: 1, sabiduria_base: 1, carisma_base: 1 },
  draconido: { fuerza_base: 2, carisma_base: 1 },
  dragonborn: { fuerza_base: 2, carisma_base: 1 },
  elfo: { destreza_base: 2 },
  elf: { destreza_base: 2 },
  enano: { constitucion_base: 2 },
  dwarf: { constitucion_base: 2 },
  mediano: { destreza_base: 2 },
  halfling: { destreza_base: 2 },
  gnomo: { inteligencia_base: 2 },
  gnome: { inteligencia_base: 2 },
  semielfo: { carisma_base: 2 },
  halfelf: { carisma_base: 2 },
  semiorco: { fuerza_base: 2, constitucion_base: 1 },
  halforc: { fuerza_base: 2, constitucion_base: 1 },
  tiefling: { carisma_base: 2, inteligencia_base: 1 },
  tieflieng: { carisma_base: 2, inteligencia_base: 1 }
};

const normalizeStr = (str) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getModifier = (score) => {
  const val = parseInt(score, 10);
  if (isNaN(val)) return 0;
  return Math.floor((val - 10) / 2);
};

const formatMod = (mod) => (mod >= 0 ? `+${mod}` : `${mod}`);

const LEVEL_EXP_TABLE = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

const STAT_KEY_MAP = {
  'fuerza': 'fuerza_base',
  'fuerza_base': 'fuerza_base',
  'str': 'fuerza_base',
  'destreza': 'destreza_base',
  'destreza_base': 'destreza_base',
  'dex': 'destreza_base',
  'constitucion': 'constitucion_base',
  'constitucion_base': 'constitucion_base',
  'con': 'constitucion_base',
  'inteligencia': 'inteligencia_base',
  'inteligencia_base': 'inteligencia_base',
  'int': 'inteligencia_base',
  'sabiduria': 'sabiduria_base',
  'sabiduria_base': 'sabiduria_base',
  'wis': 'sabiduria_base',
  'carisma': 'carisma_base',
  'carisma_base': 'carisma_base',
  'cha': 'carisma_base',
};

const CLASS_PROFICIENCIES_FALLBACK = {
  invocador: ['carisma_base', 'sabiduria_base'],
  summoner: ['carisma_base', 'sabiduria_base'],
  barbaro: ['fuerza_base', 'constitucion_base'],
  barbarian: ['fuerza_base', 'constitucion_base'],
  bardo: ['destreza_base', 'carisma_base'],
  bard: ['destreza_base', 'carisma_base'],
  clerigo: ['sabiduria_base', 'carisma_base'],
  cleric: ['sabiduria_base', 'carisma_base'],
  druida: ['inteligencia_base', 'sabiduria_base'],
  druid: ['inteligencia_base', 'sabiduria_base'],
  guerrero: ['fuerza_base', 'constitucion_base'],
  fighter: ['fuerza_base', 'constitucion_base'],
  monje: ['fuerza_base', 'destreza_base'],
  monk: ['fuerza_base', 'destreza_base'],
  paladin: ['sabiduria_base', 'carisma_base'],
  explorador: ['fuerza_base', 'destreza_base'],
  ranger: ['fuerza_base', 'destreza_base'],
  picaro: ['destreza_base', 'inteligencia_base'],
  rogue: ['destreza_base', 'inteligencia_base'],
  hechicero: ['constitucion_base', 'carisma_base'],
  sorcerer: ['constitucion_base', 'carisma_base'],
  brujo: ['sabiduria_base', 'carisma_base'],
  warlock: ['sabiduria_base', 'carisma_base'],
  mago: ['inteligencia_base', 'sabiduria_base'],
  wizard: ['inteligencia_base', 'sabiduria_base'],
};

const getProficiencyBonus = (level) => Math.floor((level - 1) / 4) + 2;
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;

const parseHitDice = (hitDiceStr) => {
  if (!hitDiceStr) return 8;
  const parsed = parseInt(hitDiceStr.toLowerCase().replace('1d', ''), 10);
  return isNaN(parsed) ? 8 : parsed;
};

const calculateMaxHpFromRolls = (dieSides, level, conScore, pureRolls = []) => {
  const conMod = getModifier(conScore);
  let totalHp = dieSides + conMod;

  for (let lvl = 2; lvl <= level; lvl++) {
    const rollIndex = lvl - 2;
    const pureRoll = pureRolls[rollIndex] !== undefined ? pureRolls[rollIndex] : 1;
    totalHp += Math.max(1, pureRoll + conMod);
  }

  return Math.max(1, totalHp);
};

const getLevelProgress = (totalExp) => {
  const exp = Math.max(0, parseInt(totalExp, 10) || 0);
  let currentLevel = 1;

  for (let i = 0; i < LEVEL_EXP_TABLE.length; i++) {
    if (exp >= LEVEL_EXP_TABLE[i]) {
      currentLevel = i + 1;
    } else {
      break;
    }
  }

  if (currentLevel >= 20) {
    return {
      level: 20,
      expInCurrentLevel: exp - LEVEL_EXP_TABLE[19],
      expNeededForNextLevel: 0,
      expRemaining: 0,
      percent: 100
    };
  }

  const currentLevelBaseExp = LEVEL_EXP_TABLE[currentLevel - 1];
  const nextLevelTargetExp = LEVEL_EXP_TABLE[currentLevel];
  const expInCurrentLevel = exp - currentLevelBaseExp;
  const expNeededForNextLevel = nextLevelTargetExp - currentLevelBaseExp;
  const expRemaining = Math.max(0, nextLevelTargetExp - exp);
  const percent = Math.min(100, Math.max(0, (expInCurrentLevel / expNeededForNextLevel) * 100));

  return {
    level: currentLevel,
    expInCurrentLevel,
    expNeededForNextLevel,
    expRemaining,
    percent
  };
};

export function StatsTab({ character, onCharacterUpdate }) {
  const [viewMode, setViewMode] = useState('attributes');

  const [stats, setStats] = useState({
    fuerza_base: character?.fuerza_base ?? 10,
    destreza_base: character?.destreza_base ?? 10,
    constitucion_base: character?.constitucion_base ?? 10,
    inteligencia_base: character?.inteligencia_base ?? 10,
    sabiduria_base: character?.sabiduria_base ?? 10,
    carisma_base: character?.carisma_base ?? 10,
  });

  const [exp, setExp] = useState(character?.experiencia ?? 0);
  const [expAmount, setExpAmount] = useState('');
  const [iniciativa, setIniciativa] = useState(character?.iniciativa ?? 0);
  const [ca, setCa] = useState(character?.ca ?? 10);
  const [hpRolls, setHpRolls] = useState(character?.hp_rolls ?? []);

  const [hitDiceSides, setHitDiceSides] = useState(8);
  const [hitDiceString, setHitDiceString] = useState('1d8');
  const [proficiencies, setProficiencies] = useState([]);

  const expProgress = getLevelProgress(exp);
  const profBonus = getProficiencyBonus(expProgress.level);

  const raceKey = normalizeStr(character?.raza || '');
  const raceBonusMap = RACE_BONUSES[raceKey] || {};

  const getTotalStat = (statKey) => {
    const base = stats[statKey] || 10;
    const bonus = raceBonusMap[statKey] || 0;
    return base + bonus;
  };

  const [hpMax, setHpMax] = useState(() => 
    calculateMaxHpFromRolls(hitDiceSides, expProgress.level, getTotalStat('constitucion_base'), character?.hp_rolls ?? [])
  );
  const [hpActual, setHpActual] = useState(character?.hp_actual ?? hpMax);

  const [savingStatus, setSavingStatus] = useState('Guardado ✓');
  const timeoutRef = useRef(null);

  const applyFallbackProficiencies = (className) => {
    const norm = normalizeStr(className);
    for (const [key, value] of Object.entries(CLASS_PROFICIENCIES_FALLBACK)) {
      if (norm.includes(key)) {
        setProficiencies(value);
        return;
      }
    }
  };

  useEffect(() => {
    const fetchClassDetails = async () => {
      const rawClassName = character?.clase_principal || character?.clase || '';
      const rawClassId = character?.main_class_id || character?.class_id;

      if (!rawClassName && !rawClassId) return;

      try {
        const lookupId = rawClassId || rawClassName;
        const { data: directProfData, error: directError } = await supabase
          .from('class_proficiencies')
          .select('nombre')
          .ilike('class_id', lookupId.trim())
          .eq('tipo', 'salvacion');

        if (!directError && directProfData && directProfData.length > 0) {
          const mappedKeys = directProfData
            .map((item) => STAT_KEY_MAP[normalizeStr(item.nombre)])
            .filter(Boolean);

          if (mappedKeys.length > 0) {
            setProficiencies(mappedKeys);
            return;
          }
        }

        let classQuery = supabase.from('classes').select('id, hit_dice, nombre');

        if (rawClassId) {
          classQuery = classQuery.or(`id.eq.${rawClassId},id.eq.${rawClassId.toLowerCase()}`);
        } else {
          classQuery = classQuery.ilike('nombre', rawClassName.trim());
        }

        const { data: classDataList, error: classError } = await classQuery;

        if (!classError && classDataList?.[0]) {
          const targetClass = classDataList[0];

          if (targetClass.hit_dice) {
            setHitDiceString(targetClass.hit_dice);
            const sides = parseHitDice(targetClass.hit_dice);
            setHitDiceSides(sides);

            const recalculatedMax = calculateMaxHpFromRolls(
              sides,
              expProgress.level,
              getTotalStat('constitucion_base'),
              hpRolls
            );
            setHpMax(recalculatedMax);
          }

          const { data: profData, error: profError } = await supabase
            .from('class_proficiencies')
            .select('nombre')
            .eq('class_id', targetClass.id)
            .eq('tipo', 'salvacion');

          if (!profError && profData && profData.length > 0) {
            const mappedKeys = profData
              .map((item) => STAT_KEY_MAP[normalizeStr(item.nombre)])
              .filter(Boolean);

            if (mappedKeys.length > 0) {
              setProficiencies(mappedKeys);
              return;
            }
          }
        }

        applyFallbackProficiencies(rawClassName || rawClassId);
      } catch (err) {
        console.error('Error al obtener datos de la clase:', err);
        applyFallbackProficiencies(rawClassName || rawClassId);
      }
    };

    fetchClassDetails();
  }, [character?.main_class_id, character?.class_id, character?.clase, character?.clase_principal]);

  useEffect(() => {
    if (character) {
      const initStats = {
        fuerza_base: character.fuerza_base ?? 10,
        destreza_base: character.destreza_base ?? 10,
        constitucion_base: character.constitucion_base ?? 10,
        inteligencia_base: character.inteligencia_base ?? 10,
        sabiduria_base: character.sabiduria_base ?? 10,
        carisma_base: character.carisma_base ?? 10,
      };
      const initExp = character.experiencia ?? 0;
      const initRolls = character.hp_rolls ?? [];
      const initLevel = getLevelProgress(initExp).level;
      
      const raceBonusCon = (RACE_BONUSES[normalizeStr(character?.raza || '')] || {}).constitucion_base || 0;
      const totalCon = (initStats.constitucion_base || 10) + raceBonusCon;

      const computedHpMax = calculateMaxHpFromRolls(hitDiceSides, initLevel, totalCon, initRolls);

      setStats(initStats);
      setExp(initExp);
      setHpRolls(initRolls);
      setIniciativa(character.iniciativa ?? 0);
      setCa(character.ca ?? 10);
      setHpMax(computedHpMax);
      setHpActual(character.hp_actual ?? computedHpMax);
    }
  }, [character?.id, character?.raza]);

  const autoSaveToSupabase = (fieldsToUpdate) => {
    if (!character?.id) return;
    setSavingStatus('Guardando...');

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      const ALLOWED_DB_COLUMNS = [
        'fuerza_base',
        'destreza_base',
        'constitucion_base',
        'inteligencia_base',
        'sabiduria_base',
        'carisma_base',
        'experiencia',
        'iniciativa',
        'ca',
        'hp_actual'
      ];

      const cleanFields = Object.fromEntries(
        Object.entries(fieldsToUpdate).filter(
          ([key, v]) => v !== undefined && ALLOWED_DB_COLUMNS.includes(key)
        )
      );

      if (Object.keys(cleanFields).length === 0) {
        setSavingStatus('Guardado ✓');
        return;
      }

      const { error } = await supabase
        .from('characters')
        .update(cleanFields)
        .eq('id', character.id);

      if (error) {
        console.error('Error de Supabase:', error);
        setSavingStatus('Error al guardar');
      } else {
        setSavingStatus('Guardado ✓');
        if (onCharacterUpdate) {
          Object.entries(cleanFields).forEach(([field, val]) => onCharacterUpdate(field, val));
        }
      }
    }, 500);
  };

  const handleStatChange = (statName, value) => {
    const num = Math.max(1, Math.min(30, parseInt(value, 10) || 0));
    const newStats = { ...stats, [statName]: num };
    setStats(newStats);

    const updates = { [statName]: num };

    if (statName === 'constitucion_base') {
      const totalCon = num + (raceBonusMap.constitucion_base || 0);
      const newMax = calculateMaxHpFromRolls(hitDiceSides, expProgress.level, totalCon, hpRolls);
      setHpMax(newMax);
      updates.hp_max = newMax;
      if (hpActual > newMax) {
        setHpActual(newMax);
        updates.hp_actual = newMax;
      }
    }

    autoSaveToSupabase(updates);
  };

  const handleModifyExp = (isSubtracting = false) => {
    const amount = parseInt(expAmount, 10);
    if (isNaN(amount) || amount === 0) return;

    const modifier = isSubtracting ? -Math.abs(amount) : Math.abs(amount);
    const newExpTotal = Math.max(0, exp + modifier);
    const newProgress = getLevelProgress(newExpTotal);

    setExp(newExpTotal);
    setExpAmount('');

    const updates = { experiencia: newExpTotal };
    let currentRolls = [...hpRolls];

    if (newProgress.level > expProgress.level) {
      for (let l = 2; l <= newProgress.level; l++) {
        const rollIndex = l - 2;
        if (currentRolls[rollIndex] === undefined || currentRolls[rollIndex] === null) {
          currentRolls[rollIndex] = rollDie(hitDiceSides);
        }
      }
    }

    setHpRolls(currentRolls);
    updates.hp_rolls = currentRolls;

    const newMax = calculateMaxHpFromRolls(hitDiceSides, newProgress.level, getTotalStat('constitucion_base'), currentRolls);
    setHpMax(newMax);
    updates.hp_max = newMax;

    if (hpActual > newMax) {
      setHpActual(newMax);
      updates.hp_actual = newMax;
    }

    autoSaveToSupabase(updates);
  };

  const center = 150;
  const maxRadius = 100;
  const angles = [-120, -60, 0, 60, 120, 180];

  const getCoordinates = (angleDeg, radius) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  // Claves para el gráfico Spider SVG
  const spiderStatKeys = [
    'fuerza_base',
    'destreza_base',
    'inteligencia_base',
    'carisma_base',
    'constitucion_base',
    'sabiduria_base',
  ];
  const spiderStatLabels = ['Fuerza', 'Destreza', 'Inteligencia', 'Carisma', 'Constitución', 'Sabiduría'];

  // Orden Estándar D&D para el grid inferior: FUE | DES | CON | INT | SAB | CAR
  const displayStatList = [
    { key: 'fuerza_base', label: 'Fuerza' },
    { key: 'destreza_base', label: 'Destreza' },
    { key: 'constitucion_base', label: 'Constitución' },
    { key: 'inteligencia_base', label: 'Inteligencia' },
    { key: 'sabiduria_base', label: 'Sabiduría' },
    { key: 'carisma_base', label: 'Carisma' },
  ];

  const polygonPoints = spiderStatKeys
    .map((key, index) => {
      let radius = 0;

      if (viewMode === 'savingThrows') {
        const totalScore = getTotalStat(key);
        const mod = getModifier(totalScore);
        const isProficient = proficiencies.includes(key);
        const saveVal = mod + (isProficient ? profBonus : 0);

        const minBonus = -2;
        const maxBonus = 12;
        const normalized = Math.max(0, Math.min(1, (saveVal - minBonus) / (maxBonus - minBonus)));
        radius = Math.max(25, normalized * maxRadius); 
      } else {
        const totalScore = getTotalStat(key);
        const maxVal = 20;
        const normalized = Math.max(0, totalScore / maxVal);
        radius = Math.max(15, normalized * maxRadius);
      }

      const { x, y } = getCoordinates(angles[index], radius);
      return `${x},${y}`;
    })
    .join(' ');

  const webHexagons = [0.25, 0.5, 0.75, 1].map((scale) =>
    angles
      .map((angle) => {
        const { x, y } = getCoordinates(angle, maxRadius * scale);
        return `${x},${y}`;
      })
      .join(' ')
  );

  return (
    <div className="w-full max-w-4xl bg-gray-900/90 border-2 border-gray-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-sm relative">
      <div className="absolute top-4 right-6 text-xs font-mono font-bold text-indigo-400">
        {savingStatus}
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-gray-950 p-1.5 rounded-xl border border-gray-800 inline-flex gap-2 shadow-inner">
          <button
            onClick={() => setViewMode('attributes')}
            className={`px-5 py-2 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'attributes'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Atributos Base
          </button>
          <button
            onClick={() => setViewMode('savingThrows')}
            className={`px-5 py-2 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'savingThrows'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tiradas de Salvación
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-7 flex flex-col items-center justify-center relative">
          <svg width="300" height="300" className="overflow-visible">
            {webHexagons.map((pts, i) => (
              <polygon key={i} points={pts} fill="none" stroke="#374151" strokeWidth="1" strokeDasharray={i < 3 ? '2,2' : '0'} />
            ))}

            {angles.map((angle, i) => {
              const { x, y } = getCoordinates(angle, maxRadius);
              return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#374151" strokeWidth="1" />;
            })}

            <polygon
              points={polygonPoints}
              fill={viewMode === 'savingThrows' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(99, 102, 241, 0.35)'}
              stroke={viewMode === 'savingThrows' ? '#10b981' : '#6366f1'}
              strokeWidth="3"
              className="transition-all duration-300"
            />

            {spiderStatKeys.map((key, index) => {
              const outerCoord = getCoordinates(angles[index], maxRadius + 32);
              const isProficient = proficiencies.includes(key);
              const totalScore = getTotalStat(key);
              const attrMod = getModifier(totalScore); 
              const saveValue = attrMod + (isProficient ? profBonus : 0);

              return (
                <g key={key}>
                  <text
                    x={outerCoord.x}
                    y={outerCoord.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`font-black text-sm font-mono uppercase tracking-wider ${
                      viewMode === 'savingThrows' && isProficient ? 'fill-emerald-400 font-extrabold' : 'fill-indigo-300'
                    }`}
                  >
                    {spiderStatLabels[index]}
                  </text>
                  <text
                    x={outerCoord.x}
                    y={outerCoord.y + 16}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`font-extrabold text-xs font-mono ${
                      viewMode === 'savingThrows' && isProficient
                        ? 'fill-emerald-400 font-black text-sm'
                        : viewMode === 'savingThrows'
                        ? 'fill-emerald-600/70'
                        : 'fill-indigo-400'
                    }`}
                  >
                    {viewMode === 'savingThrows'
                      ? `${formatMod(saveValue)} ${isProficient ? '★' : ''}`
                      : `(${formatMod(attrMod)})`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="md:col-span-5 flex flex-col gap-5 bg-gray-950/60 p-6 rounded-2xl border border-gray-800">
          <div className="flex justify-between gap-4 items-center border-b border-gray-800/80 pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase block">Bonif. Competencia</span>
              <span className="text-xl font-black font-mono text-emerald-300">+{profBonus}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase block">Nivel Actual</span>
              <span className="text-xl font-black font-mono text-cyan-300">Nv. {expProgress.level}</span>
            </div>
          </div>

          <div className="flex justify-between gap-4 items-center">
            <div className="flex-1">
              <label className="text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase">Iniciativa</label>
              <input
                type="number"
                value={iniciativa}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setIniciativa(val);
                  autoSaveToSupabase({ iniciativa: val });
                }}
                className="mt-1 w-full bg-gray-900 border border-gray-800 text-indigo-300 font-bold text-base rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase">CA (Armadura)</label>
              <input
                type="number"
                value={ca}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setCa(val);
                  autoSaveToSupabase({ ca: val });
                }}
                className="mt-1 w-full bg-gray-900 border border-gray-800 text-indigo-300 font-bold text-base rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase">
                Puntos de Golpe (HP)
              </label>
              <span className="text-xs font-mono text-emerald-400 font-bold">{hpActual} / {hpMax}</span>
            </div>
            <div className="w-full h-3.5 bg-gray-900 border border-gray-800 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, (hpActual / hpMax) * 100))}%` }}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <div className="w-1/2 flex flex-col">
                <span className="text-[9px] font-mono text-gray-500 text-center uppercase">Actual</span>
                <input
                  type="number"
                  value={hpActual}
                  onChange={(e) => {
                    const val = Math.min(hpMax, Math.max(0, parseInt(e.target.value, 10) || 0));
                    setHpActual(val);
                    autoSaveToSupabase({ hp_actual: val });
                  }}
                  className="bg-gray-900 border border-gray-800 text-xs font-bold text-white rounded-md px-2 py-1 text-center"
                />
              </div>
              <div className="w-1/2 flex flex-col">
                <span className="text-[9px] font-mono text-gray-500 text-center uppercase">Máx (Fijado)</span>
                <input
                  type="number"
                  value={hpMax}
                  disabled
                  className="bg-gray-950 border border-gray-800/50 text-xs font-bold text-emerald-400/80 rounded-md px-2 py-1 text-center cursor-not-allowed"
                />
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-gray-900/80 rounded-xl border border-gray-800 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wide">
                  Dado Actual (Nv. {expProgress.level})
                </span>
                <span className="text-[9px] font-mono text-gray-500">
                  Tipo: {hitDiceString}
                </span>
              </div>

              <div className="bg-gray-950 border border-emerald-500/30 rounded-lg px-4 py-1.5 text-center shadow-inner">
                <span className="text-xl font-mono font-black text-emerald-400">
                  {expProgress.level === 1 ? hitDiceSides : (hpRolls[expProgress.level - 2] ?? 1)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">Experiencia (EXP)</label>
              <span className="text-[11px] font-mono text-cyan-300 font-bold">
                {expProgress.level >= 20 
                  ? 'NIVEL MÁXIMO' 
                  : `Faltan: ${expProgress.expRemaining.toLocaleString()} EXP`}
              </span>
            </div>

            <div className="w-full h-2.5 bg-gray-900 border border-gray-800 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-sky-300 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                style={{ width: `${expProgress.percent}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <input
                type="number"
                placeholder="Cantidad de EXP"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleModifyExp(false)}
                className="w-1/2 bg-gray-900 border border-cyan-900/60 text-xs font-bold text-cyan-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex gap-1.5 w-1/2">
                <button
                  onClick={() => handleModifyExp(false)}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-black font-mono font-black text-xs py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  + EXP
                </button>
                <button
                  onClick={() => handleModifyExp(true)}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-xs py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  - EXP
                </button>
              </div>
            </div>

            <div className="mt-2 flex justify-between items-center text-[10px] font-mono text-gray-400">
              <span>Total acumulado:</span>
              <span className="text-cyan-300 font-bold">{exp.toLocaleString()} EXP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de Entrada de Atributos Base: Orden Estándar D&D */}
      <div className="mt-8 pt-6 border-t border-gray-800">
        <p className="text-xs font-mono font-bold tracking-widest text-gray-400 uppercase mb-4 text-center">
          Puntuación Base de Atributos
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {displayStatList.map(({ key, label }) => {
            const raceBonus = raceBonusMap[key] || 0;
            const totalScore = getTotalStat(key);

            return (
              <div key={key} className="bg-gray-950 p-3 rounded-xl border border-gray-800 text-center relative">
                <label className="block text-[11px] font-mono font-bold text-indigo-300 uppercase mb-1">
                  {label}
                </label>
                <input
                  type="number"
                  value={stats[key]}
                  onChange={(e) => handleStatChange(key, e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 text-center font-bold text-lg text-white rounded-lg py-1 focus:outline-none focus:border-indigo-500"
                />
                <div className="mt-1 flex justify-between items-center text-[10px] font-mono text-gray-400 px-1">
                  <span>Total: <strong className="text-indigo-300">{totalScore}</strong></span>
                  {raceBonus > 0 && (
                    <span className="text-emerald-400 font-bold">+{raceBonus}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}