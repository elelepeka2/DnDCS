-- =============================================================================
-- 0003_fix_character_languages_rls.sql
-- Cierra el agujero de seguridad en character_languages y agrega DELETE de
-- personajes propios.
--
-- Estado anterior (0002, fiel al remoto 2026-09-17):
--   - character_languages tenia la policy "Permitir todo en character_languages"
--     (for all using(true)) -> CUALQUIER usuario autenticado podia leer,
--     modificar o borrar idiomas de CUALQUIER personaje.
--   - characters NO tenia policy DELETE -> los usuarios no podian borrar
--     sus propios personajes.
--
-- Este cambio reemplaza ambas por policies acotadas al owner (auth.uid() =
-- characters.user_id).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- character_languages: eliminar el agujero "Permitir todo"
-- -----------------------------------------------------------------------------
drop policy if exists "Permitir todo en character_languages" on public.character_languages;

-- El owner del personaje puede ver los idiomas de su personaje
create policy "Owners can view their character languages"
  on public.character_languages
  for select
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_languages.character_id
        and c.user_id = auth.uid()
    )
  );

-- El owner del personaje puede agregar idiomas a su personaje
create policy "Owners can insert their character languages"
  on public.character_languages
  for insert
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_languages.character_id
        and c.user_id = auth.uid()
    )
  );

-- El owner del personaje puede actualizar idiomas de su personaje
create policy "Owners can update their character languages"
  on public.character_languages
  for update
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_languages.character_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_languages.character_id
        and c.user_id = auth.uid()
    )
  );

-- El owner del personaje puede borrar idiomas de su personaje
create policy "Owners can delete their character languages"
  on public.character_languages
  for delete
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_languages.character_id
        and c.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- characters: habilitar DELETE para el owner (no existia)
-- -----------------------------------------------------------------------------
create policy "Users can delete their own characters"
  on public.characters
  for delete
  using (auth.uid() = user_id);