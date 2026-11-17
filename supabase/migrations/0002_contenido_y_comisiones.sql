-- 0002 · Contenido de cada materia y comisiones (horarios).
-- Antes de esta migración, la app tomaba estos datos de la API. Ahora viven en tu base.

-- ---------------------------------------------------------------------------
-- Contenido de la materia
-- ---------------------------------------------------------------------------

alter table materias
  add column descripcion text,
  add column area text,
  add column programa_url text,
  add column sitio_url text,
  add column campus_url text;

-- ---------------------------------------------------------------------------
-- Comisiones (horarios de cada materia)
-- ---------------------------------------------------------------------------

create table comisiones (
  id uuid primary key,
  materia_id uuid not null references materias (id) on delete cascade,
  -- Copia de la materia para RLS. Se completa desde la materia (ver trigger).
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Cuatrimestre al que corresponde, por ejemplo '2026-1'. Null = vale para cualquiera.
  semestre text check (semestre is null or semestre ~ '^\d{4}-\d$'),
  -- Día de la semana: 1 = lunes … 7 = domingo (igual que la app).
  dia smallint not null check (dia between 1 and 7),
  inicio time not null,
  fin time not null,
  -- Aulas (puede haber más de una).
  aulas text[] not null default '{}',
  -- Sede y modalidad tal como vienen de la API. Texto libre para no perder información.
  sede text,
  modalidad text,
  notas text,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  check (fin > inicio)
);

create index comisiones_materia_idx on comisiones (materia_id);

-- Copia el usuario de la materia, así RLS funciona igual que en el resto de las tablas.
create or replace function asignar_usuario_comision()
returns trigger
language plpgsql
as $$
begin
  select m.usuario_id into new.usuario_id
  from materias m
  where m.id = new.materia_id;

  if not found then
    raise exception 'La materia no existe';
  end if;

  return new;
end;
$$;

create trigger comisiones_usuario
  before insert or update of materia_id on comisiones
  for each row execute function asignar_usuario_comision();

create trigger comisiones_actualizada
  before update on comisiones
  for each row execute function set_actualizada_en();

alter table comisiones enable row level security;

create policy comisiones_propias on comisiones
  for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
