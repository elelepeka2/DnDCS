-- =============================================================================
-- seed.sql
-- Datos de catálogo capturados desde la base remota (GET read-only, 2026-09-17).
-- Idempotente: ON CONFLICT DO NOTHING.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- classes (13 filas)
-- -----------------------------------------------------------------------------
insert into public.classes (id, nombre, hit_dice, primary_ability) values
  ('invocador', 'Invocador', '1d8', 'Carisma'),
  ('barbaro', 'Bárbaro', '1d12', 'Fuerza'),
  ('bardo', 'Bardo', '1d8', 'Carisma'),
  ('brujo', 'Brujo', '1d8', 'Carisma'),
  ('clerigo', 'Clérigo', '1d8', 'Sabiduría'),
  ('druida', 'Drúida', '1d8', 'Sabiduría'),
  ('explorador', 'Explorador', '1d10', 'Destreza'),
  ('guerrero', 'Guerrero', '1d10', 'Fuerza'),
  ('hechicero', 'Hechicero', '1d6', 'Carisma'),
  ('mago', 'Mago', '1d6', 'Inteligencia'),
  ('monje', 'Monje', '1d8', 'Destreza'),
  ('paladin', 'Paladín', '1d10', 'Fuerza'),
  ('picaro', 'Pícaro', '1d8', 'Destreza')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- subclasses (48 filas)
-- -----------------------------------------------------------------------------
insert into public.subclasses (id, class_id, nombre, descripcion) values
  ('eidolon_acuatica', 'invocador', 'Eidolon - Forma Acuática', 'Fuerza 16, Des 12, Con 13. Natación 40 pies. Mordisco (1d6).'),
  ('eidolon_aviar', 'invocador', 'Eidolon - Forma Aviar', 'Fuerza 12, Des 16, Con 13. Vuelo 30 pies. Garras (1d4).'),
  ('eidolon_bipeda', 'invocador', 'Eidolon - Forma Bípeda', 'Fuerza 16, Des 12, Con 13. Escalar 30 pies. Garras (1d4).'),
  ('eidolon_cuadrupeda', 'invocador', 'Eidolon - Forma Cuadrúpeda', 'Fuerza 16, Des 14, Con 13. Velocidad 40 pies. Mordisco (1d6).'),
  ('eidolon_serpentina', 'invocador', 'Eidolon - Forma Serpentina', 'Fuerza 12, Des 16, Con 13. Escalar 20 pies. Mordisco (1d6) y Coletazo (1d6).'),
  ('eidolon_taurica', 'invocador', 'Eidolon - Forma Táurica', 'Fuerza 14, Des 14, Con 13. Velocidad 40 pies. Garras (1d4).'),
  ('barbaro-berseker', 'barbaro', 'Camino del Berserker', 'Bárbaros enfocados en la furia desenfrenada y ataques adicionales.'),
  ('barbaro-totemico', 'barbaro', 'Camino del Guerrero Totémico', 'Bárbaros sintonizados con los espíritus de la naturaleza (Oso, Águila, Lobo).'),
  ('barbaro-magia-salvaje', 'barbaro', 'Camino de la Magia Salvaje', 'Bárbaros tocados por el Caos del Feérico que liberan magia al entrar en furia.'),
  ('bardo-conocimiento', 'bardo', 'Colegio del Conocimiento', 'Bardos centrados en el saber, habilidades adicionales y secretos mágicos de otras clases.'),
  ('bardo-valor', 'bardo', 'Colegio del Valor', 'Bardos marciales que inspiran a sus aliados en el combate cuerpo a cuerpo.'),
  ('bardo-espadas', 'bardo', 'Colegio de las Espadas', 'Bardos especializados en filigranas y florituras con armas de combate.'),
  ('brujo-archifeerico', 'brujo', 'El Archifeérico', 'Pacto con seres del plano feérico, expertos en ilusiones y encantos.'),
  ('brujo-infernico', 'brujo', 'El Infernal', 'Pacto con demonios o diablos, enfocados en fuego y destrucción.'),
  ('brujo-primigenio', 'brujo', 'El Gran Antiguo', 'Pacto con entidades alienígenas como Cthulhu, expertos en telepatía y control mental.'),
  ('clerigo-vida', 'clerigo', 'Dominio de la Vida', 'Especializados en curaciones potentes y conservación de sus aliados.'),
  ('clerigo-guerra', 'clerigo', 'Dominio de la Guerra', 'Clérigos marciales enfocados en ataque e inspiración en el campo de batalla.'),
  ('clerigo-luz', 'clerigo', 'Dominio de la Luz', 'Dominio solar enfocado en radiancia, fuego y revelar secretos.'),
  ('clerigo-engano', 'clerigo', 'Dominio del Engaño', 'Seguidores de dioses pícaros, expertos en duplicados ilusorios y sigilo.'),
  ('clerigo-tempestad', 'clerigo', 'Dominio de la Tempestad', 'Maestros del rayo y el trueno que repelen a sus enemigos.'),
  ('druida-tierra', 'druida', 'Círculo de la Tierra', 'Enfocados en lanzar conjuros de la naturaleza basados en su terreno de origen.'),
  ('druida-luna', 'druida', 'Círculo de la Luna', 'Maestros de la Forma Salvaje, capaces de transformarse en bestias poderosas como acción bonus.'),
  ('explorador-cazador', 'explorador', 'Cazador', 'Especializados en técnicas para defender a las civilizaciones de amenazas.'),
  ('explorador-maestro-bestias', 'explorador', 'Maestro de las Bestias', 'Crea un vínculo espiritual y de combate con un compañero animal.'),
  ('explorador-acechador-sombras', 'explorador', 'Acechador de las Sombras', 'Especialista en emboscadas y luchar en la penumbra del Underdark.'),
  ('guerrero-campeon', 'guerrero', 'Campeón', 'Enfocado en el poder físico bruto y críticos con rango 19-20.'),
  ('guerrero-maestro-batalla', 'guerrero', 'Maestro de la Batalla', 'Utiliza maniobras tácticas y dados de superioridad en combate.'),
  ('guerrero-caballero-maldito', 'guerrero', 'Caballero Místico', 'Combina el arte de las armas con conjuros de abjuración y evocación.'),
  ('hechicero-draconico', 'hechicero', 'Linaje Dracónico', 'Magia heredada de ancestros dragones, otorga escamas de protección y afinidad elemental.'),
  ('hechicero-magia-salvaje', 'hechicero', 'Magia Salvaje', 'Manipula las fuerzas de la suerte y desencadena oleadas mágicas impredecibles.'),
  ('mago-abjuracion', 'mago', 'Escuela de Abjuración', 'Especialistas en magia defensiva, escudos mágicos y contrahechizos.'),
  ('mago-evocacion', 'mago', 'Escuela de Evocación', 'Maestros en moldear hechizos destructivos de área para no dañar a sus aliados.'),
  ('mago-ilusion', 'mago', 'Escuela de Ilusión', 'Especialistas en engaños visuales, auditivos y alterar la realidad.'),
  ('mago-nigromancia', 'mago', 'Escuela de Nigromancia', 'Expertos en manipular la energía vital y alzar a los muertos.'),
  ('mago-transmutacion', 'mago', 'Escuela de Transmutación', 'Maestros en modificar la materia y las formas biológicas.'),
  ('mago-adivinacion', 'mago', 'Escuela de Adivinación', 'Capaces de prever el futuro y manipular tiradas de dados mediante Presagio.'),
  ('monje-mano-abierta', 'monje', 'Camino de la Mano Abierta', 'Maestros de las artes marciales que controlan el Ki para manipular a sus oponentes.'),
  ('monje-sombra', 'monje', 'Camino de la Sombra', 'Monjes ninja que se teletransportan entre sombras y dominan el sigilo.'),
  ('monje-cuatro-elementos', 'monje', 'Camino de los Cuatro Elementos', 'Canalizan el Ki para lanzar efectos elementales como si fueran conjuros.'),
  ('paladin-devocion', 'paladin', 'Juramento de Devoción', 'El paladín clásico que encarna el honor, la justicia y la luz sagrada.'),
  ('paladin-venganza', 'paladin', 'Juramento de Venganza', 'Cazadores implacables enfocados en castigar a los malhechores a toda costa.'),
  ('paladin-ancianos', 'paladin', 'Juramento de los Ancianos', 'Protectores de la luz natural, la belleza y la vida en el mundo.'),
  ('picaro-asesino', 'picaro', 'Asesino', 'Especialista en venenos, disfraces y ataques sorpresa devastadores.'),
  ('picaro-ladron', 'picaro', 'Ladrón', 'Maestro de las agilidades, abrir cerraduras y usar objetos rápidamente.'),
  ('picaro-embaucador-arcano', 'picaro', 'Embaucador Arcano', 'Combina el sigilo y la picaresca con magia de ilusión y encantamiento.'),
  ('bardo-elocuencia', 'bardo', 'Colegio de la Elocuencia', 'Los seguidores del Colegio de Elocuencia dominan el arte de la oratoria. Manejan una mezcla de lógica y juegos de palabras teatrales para conquistar escépticos y apelar a las emociones.'),
  ('picaro-inquisidor', 'picaro', 'Inquisidor', 'Armas mortales en manos de su divinidad. Usan poder divino e inquisitivo para rastrear y castigar a los blasfemos y herejes.'),
  ('picaro-soulknife', 'picaro', 'SoulKnife', 'Combina el sigilo y la pericia del pícaro con energía psiónica pura, manifestando dagas de energía mental y capacidades de manipulación arcana.')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- races (9 filas)
-- NOTA: se preservan los UUID reales y created_at del estado actual.
-- -----------------------------------------------------------------------------
insert into public.races (id, name, ability_score_bonuses, speed, languages, proficiencies, traits, created_at) values
  ('561d5ae8-9688-46b5-8e33-39236926566b', 'Humano', '{"fuerza": 1, "carisma": 1, "destreza": 1, "sabiduria": 1, "constitucion": 1, "inteligencia": 1}', 30, array['Común','Un idioma a elección'], array[]::text[], '[{"nombre": "Versatilidad", "descripcion": "Los humanos son la raza más adaptable y ambiciosa."}]', '2026-09-14T20:42:13.870723+00:00'),
  ('c7ce2f7b-23bc-4ace-bef4-e66b3547cfdc', 'Elfo', '{"destreza": 2}', 30, array['Común','Élfico'], array['Percepción'], '[{"nombre": "Visión en la Oscuridad", "descripcion": "Puedes ver en la penumbra a 60 pies como si fuera luz brillante."}, {"nombre": "Sentidos Agudos", "descripcion": "Tienes competencia en la habilidad Percepción."}, {"nombre": "Linaje Feérico", "descripcion": "Ventaja en tiradas de salvación contra ser encantado y la magia no te puede dormir."}, {"nombre": "Trance", "descripcion": "Los elfos no necesitan dormir; meditan durante 4 horas al día."}]', '2026-09-14T20:42:13.870723+00:00'),
  ('dc2f5faa-d8ea-4f03-9a34-1bb7dd4e186e', 'Enano', '{"constitucion": 2}', 25, array['Común','Enano'], array['Hachas de mano','Hachas de batalla','Martillos ligeros','Martillos de guerra'], '[{"nombre": "Visión en la Oscuridad", "descripcion": "Puedes ver en la penumbra a 60 pies como si fuera luz brillante."}, {"nombre": "Resistencia Enana", "descripcion": "Ventaja en salvaciones contra veneno y resistencia al daño de veneno."}, {"nombre": "Entrenamiento en Armas Enanas", "descripcion": "Competencia con hacha de batalla, hacha de mano, martillo ligero y martillo de guerra."}, {"nombre": "Afinidad con la Piedra", "descripcion": "Añades el doble de tu bonificador de competencia a Historia sobre trabajos de piedra."}]', '2026-09-14T20:42:13.870723+00:00'),
  ('6a446a06-05d9-455b-a688-daba2c01c0fa', 'Mediano', '{"destreza": 2}', 25, array['Común','Mediano'], array[]::text[], '[{"nombre": "Afortunado", "descripcion": "Al sacar un 1 en d20 (ataque, habilidad o salvación), puedes volver a tirar la de nuevo."}, {"nombre": "Valiente", "descripcion": "Ventaja en tiradas de salvación contra ser asustado."}, {"nombre": "Agilidad Mediana", "descripcion": "Puedes moverte a través del espacio de cualquier criatura más grande que tú."}]', '2026-09-14T20:42:13.870723+00:00'),
  ('890707e4-5d30-4949-9641-f4ae275cf534', 'Dracónido', '{"fuerza": 2, "carisma": 1}', 30, array['Común','Dracónico'], array[]::text[], '[{"nombre": "Linaje Dracónico", "descripcion": "Heredas el poder de un tipo de dragón (elemento y cono/línea de aliento)."}, {"nombre": "Arma de Aliento", "descripcion": "Puedes usar tu acción para exhalar energía destructiva según tu linaje."}, {"nombre": "Resistencia al Daño", "descripcion": "Tienes resistencia al tipo de daño asociado a tu linaje dracónico."}]', '2026-09-14T20:42:13.870723+00:00'),
  ('6c8e3137-2443-47d4-bfe3-a96eaa91de87', 'Gnomo', '{"inteligencia": 2}', 25, array['Común','Gnomo'], array[]::text[], '[{"nombre": "Visión en la Oscuridad", "descripcion": "Puedes ver en la penumbra a 60 pies como si fuera luz brillante."}, {"nombre": "Astucia Gnomica", "descripcion": "Ventaja en todas las tiradas de salvación de INT, SAB y CAR contra magia."}]', '2026-09-14T20:42:13.870723+00:00'),
  ('191fa401-4690-4f78-984e-9a0e5c8fff72', 'Semielfo', '{"carisma": 2, "eleccion_libre": 2}', 30, array['Común','Élfico','Un idioma a elección'], array['Elección de 2 habilidades cualesquiera'], '[{"nombre": "Visión en la Oscuridad", "descripcion": "Puedes ver en la penumbra a 60 pies como si fuera luz brillante."}, {"nombre": "Linaje Feérico", "descripcion": "Ventaja en tiradas de salvación contra ser encantado y la magia no te puede dormir."}, {"nombre": "Versatilidad con Habilidades", "descripcion": "Ganas competencia en dos habilidades de tu elección."}]', '2026-09-14T20:42:13.870723+00:00'),
  ('61ca299a-08d0-4604-91a8-312b7173fce7', 'Semiorco', '{"fuerza": 2, "constitucion": 1}', 30, array['Común','Orco'], array['Intimidación'], '[{"nombre": "Visión en la Oscuridad", "descripcion": "Puedes ver en la penumbra a 60 pies como si fuera luz brillante."}, {"nombre": "Menaza", "descripcion": "Ganas competencia en la habilidad Intimidación."}, {"nombre": "Aguante Incansable", "descripcion": "Cuando te reducen a 0 PG sin morir, puedes quedar a 1 PG en su lugar (1 vez por descanso largo)."}, {"nombre": "Ataques Salvajes", "descripcion": "Al hacer un crítico con arma melé, tiras uno de los dados de daño del arma un vez más."}]', '2026-09-14T20:42:13.870723+00:00'),
  ('428871e8-4985-4988-9179-91d018f4d32d', 'Tiflin', '{"carisma": 2, "inteligencia": 1}', 30, array['Común','Infernal'], array[]::text[], '[{"nombre": "Visión en la Oscuridad", "descripcion": "Puedes ver en la penumbra a 60 pies como si fuera luz brillante."}, {"nombre": "Resistencia Infernal", "descripcion": "Tienes resistencia al daño de fuego."}, {"nombre": "Legado Infernal", "descripcion": "Conoces el truco Taumaturgia. A nivel 3 conjuras Reprensión Infernal y a nivel 5 Oscuridad."}]', '2026-09-14T20:42:13.870723+00:00')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- languages (16 filas)
-- -----------------------------------------------------------------------------
insert into public.languages (id, nombre) values
  ('comun', 'Común'),
  ('elfico', 'Élfico'),
  ('enano', 'Enano'),
  ('gigante', 'Gigante'),
  ('gnomo', 'Gnomo'),
  ('goblin', 'Goblin'),
  ('mediano', 'Mediano'),
  ('orco', 'Orco'),
  ('abisal', 'Abisal'),
  ('celestial', 'Celestial'),
  ('draconico', 'Dracónico'),
  ('jerga-ladrones', 'Jerga de los Ladrones'),
  ('infernal', 'Infernal'),
  ('primordial', 'Primordial'),
  ('silvano', 'Silvano'),
  ('infracomun', 'Infracomún')
on conflict (id) do nothing;
