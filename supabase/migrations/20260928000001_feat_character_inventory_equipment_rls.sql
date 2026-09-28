-- =============================================================================
-- feat_character_inventory_equipment_rls.sql
-- Agrega policies owner-scoped e indices btree para las pestanas de Inventario
-- y Equipamiento.
--
-- Estado anterior (0002, fiel al remoto):
--   - character_inventory y character_equipment tenian RLS habilitada con CERO
--     policies -> todo acceso denegado para anon/authenticated (42501). El
--     frontend no podia leer ni escribir ninguna de las dos tablas.
--   - Tampoco existia indice sobre character_id, columna por la que el
--     frontend filtra en cada query.
--
-- Este cambio crea 4 policies por tabla (SELECT/INSERT/UPDATE/DELETE)
-- acotadas al owner del personaje, con el mismo patron EXISTS que
-- 20260923000001_fix_character_languages_rls.sql, mas un indice btree por tabla.
--
-- Rollback: drop policy x8 + drop index x2 (policies e indices solamente,
-- cero cambio de datos).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- character_inventory: 4 policies acotadas al owner
-- -----------------------------------------------------------------------------

-- El owner del personaje puede ver los objetos de su inventario
create policy "Owners can view their character inventory"
  on public.character_inventory
  for select
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_inventory.character_id
        and c.user_id = auth.uid()
    )
  );

-- El owner del personaje puede agregar objetos a su inventario
create policy "Owners can insert their character inventory"
  on public.character_inventory
  for insert
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_inventory.character_id
        and c.user_id = auth.uid()
    )
  );

-- El owner del personaje puede actualizar objetos de su inventario
create policy "Owners can update their character inventory"
  on public.character_inventory
  for update
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_inventory.character_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_inventory.character_id
        and c.user_id = auth.uid()
    )
  );

-- El owner del personaje puede borrar objetos de su inventario
create policy "Owners can delete their character inventory"
  on public.character_inventory
  for delete
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_inventory.character_id
        and c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- character_equipment: 4 policies acotadas al owner
-- -----------------------------------------------------------------------------

-- El owner del personaje puede ver el equipamiento de su personaje
create policy "Owners can view their character equipment"
  on public.character_equipment
  for select
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_equipment.character_id
        and c.user_id = auth.uid()
    )
  );

-- El owner del personaje puede equipar objetos en su personaje
create policy "Owners can insert their character equipment"
  on public.character_equipment
  for insert
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_equipment.character_id
        and c.user_id = auth.uid()
    )
  );

-- El owner del personaje puede cambiar lo equipado en su personaje
create policy "Owners can update their character equipment"
  on public.character_equipment
  for update
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_equipment.character_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_equipment.character_id
        and c.user_id = auth.uid()
    )
  );

-- El owner del personaje puede desequipar objetos de su personaje
create policy "Owners can delete their character equipment"
  on public.character_equipment
  for delete
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_equipment.character_id
        and c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Indices btree sobre character_id (el frontend filtra siempre por ahi)
-- -----------------------------------------------------------------------------

create index if not exists character_inventory_character_id_idx
  on public.character_inventory (character_id);

create index if not exists character_equipment_character_id_idx
  on public.character_equipment (character_id);
