-- 0001 · Carreras, materias, dependencias, sesiones y exámenes del usuario.
-- Borrador para revisar. Ver DECISIONES.md para las reglas de negocio.
--
-- Convenciones:
--  * Los ids (uuid) los genera el cliente: las altas funcionan sin conexión.
--  * `codigo` de carrera y de materia lo asigna el servidor al sincronizar.
--    Es interno e invisible para el usuario.
--  * Todas las tablas tienen RLS: cada usuario solo ve y modifica sus filas.

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create or replace function set_actualizada_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizada_en := now();
  return new;
end;
$$;

-- Contador por usuario: nunca se reutiliza una letra de carrera, aunque se borre.
create table perfiles_estudio (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  carreras_creadas integer not null default 0
);

alter table perfiles_estudio enable row level security;

create policy perfiles_estudio_propio on perfiles_estudio
  for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Carreras
-- ---------------------------------------------------------------------------

create table carreras (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  -- Sigla editable por el usuario. Vacía al crear la carrera (la app no inventa siglas).
  sigla text check (sigla is null or sigla ~ '^[A-Za-z0-9]{2,6}$'),
  -- Letra interna (a, b, c…) asignada al crear. Inmutable. Solo para códigos de materias.
  codigo_letra char(1) not null,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

-- Sigla única por usuario, sin distinguir mayúsculas.
create unique index carreras_sigla_unica
  on carreras (usuario_id, upper(sigla))
  where sigla is not null;

create unique index carreras_letra_unica
  on carreras (usuario_id, codigo_letra);

create or replace function asignar_codigo_carrera()
returns trigger
language plpgsql
as $$
declare
  n integer;
begin
  insert into perfiles_estudio (usuario_id, carreras_creadas)
  values (new.usuario_id, 1)
  on conflict (usuario_id)
  do update set carreras_creadas = perfiles_estudio.carreras_creadas + 1
  returning carreras_creadas into n;

  if n > 26 then
    raise exception 'Se alcanzó el máximo de 26 carreras por usuario';
  end if;

  new.codigo_letra := chr(96 + n);  -- 1 → 'a', 2 → 'b', …
  return new;
end;
$$;

create trigger carreras_codigo
  before insert on carreras
  for each row execute function asignar_codigo_carrera();

create trigger carreras_actualizada
  before update on carreras
  for each row execute function set_actualizada_en();

alter table carreras enable row level security;

create policy carreras_propias on carreras
  for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Materias
-- ---------------------------------------------------------------------------

create table materias (
  id uuid primary key,
  carrera_id uuid not null references carreras (id) on delete cascade,
  -- Copia de la carrera para RLS. Debe coincidir con carreras.usuario_id (ver trigger).
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 160),
  anio smallint not null check (anio between 1 and 10),
  -- Cuatrimestre dentro del año (la app lo llama `term`).
  cuatrimestre smallint not null check (cuatrimestre in (1, 2)),
  -- Código dinámico e interno: letra de carrera + año + cuatrimestre + número.
  codigo text,
  -- Código del plan precargado (por ejemplo, 322 para SO). Historial, no se edita.
  codigo_original text,
  -- Seleccionada para el Pomodoro. Deseleccionar no borra la materia.
  activa boolean not null default false,
  -- Estado de cursada del usuario.
  condicion text not null default 'no_cursable'
    check (condicion in ('no_cursable', 'regular', 'libre', 'aprobada')),
  -- Información adicional (docentes, aula, horarios, etc.). Estructura libre por ahora.
  info_adicional jsonb not null default '{}'::jsonb,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create index materias_carrera_idx on materias (carrera_id, anio, cuatrimestre);

-- Asigna el código al crear, y lo recalcula solo para la materia que se mueve.
create or replace function asignar_codigo_materia()
returns trigger
language plpgsql
as $$
declare
  letra char(1);
  siguiente integer;
begin
  -- La materia pertenece al mismo usuario que su carrera, y no puede cambiar de carrera.
  if tg_op = 'UPDATE' and new.carrera_id <> old.carrera_id then
    raise exception 'Una materia no puede cambiar de carrera';
  end if;

  select c.usuario_id, c.codigo_letra into new.usuario_id, letra
  from carreras c
  where c.id = new.carrera_id;

  if not found then
    raise exception 'La carrera no existe';
  end if;

  if tg_op = 'INSERT'
     or (old.anio, old.cuatrimestre) is distinct from (new.anio, new.cuatrimestre)
  then
    select coalesce(max(substring(m.codigo from '\d{2}$')::integer), 0) + 1
      into siguiente
    from materias m
    where m.carrera_id = new.carrera_id
      and m.anio = new.anio
      and m.cuatrimestre = new.cuatrimestre
      and m.id <> new.id;

    new.codigo := letra || new.anio || new.cuatrimestre || lpad(siguiente::text, 2, '0');
  end if;

  return new;
end;
$$;

create trigger materias_codigo
  before insert or update on materias
  for each row execute function asignar_codigo_materia();

create trigger materias_actualizada
  before update on materias
  for each row execute function set_actualizada_en();

alter table materias enable row level security;

create policy materias_propias on materias
  for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Dependencias (correlativas)
-- ---------------------------------------------------------------------------

create table dependencias (
  materia_id uuid not null references materias (id) on delete cascade,
  depende_de_id uuid not null references materias (id) on delete cascade,
  -- Qué se exige de la correlativa. Ver preguntas abiertas.
  requisito text not null default 'regular' check (requisito in ('regular', 'aprobada')),
  primary key (materia_id, depende_de_id),
  check (materia_id <> depende_de_id)
);

-- Ambas materias deben ser de la misma carrera.
-- Impide ciclos: si depende_de_id ya alcanza a materia_id, se rechaza.
create or replace function validar_dependencia()
returns trigger
language plpgsql
as $$
declare
  usuario uuid;
begin
  if (select carrera_id from materias where id = new.materia_id)
     is distinct from
     (select carrera_id from materias where id = new.depende_de_id)
  then
    raise exception 'Las correlativas deben ser de la misma carrera';
  end if;

  -- Serializa las altas de dependencias por usuario, para que dos inserts
  -- simultáneos no creen un ciclo entre sí.
  select usuario_id into usuario from materias where id = new.materia_id;
  perform pg_advisory_xact_lock(hashtextextended(usuario::text, 0));

  if exists (
    with recursive alcanzables (id) as (
      select new.depende_de_id
      union
      select d.depende_de_id
      from dependencias d
      join alcanzables a on d.materia_id = a.id
    )
    select 1 from alcanzables where id = new.materia_id
  ) then
    raise exception 'Esta correlativa generaría un ciclo entre materias';
  end if;

  return new;
end;
$$;

create trigger dependencias_validar
  before insert or update on dependencias
  for each row execute function validar_dependencia();

alter table dependencias enable row level security;

create policy dependencias_propias on dependencias
  for all
  using (
    exists (select 1 from materias m where m.id = materia_id and m.usuario_id = auth.uid())
  )
  with check (
    exists (select 1 from materias m where m.id = materia_id and m.usuario_id = auth.uid())
    and exists (select 1 from materias m where m.id = depende_de_id and m.usuario_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Sesiones de estudio
-- ---------------------------------------------------------------------------
-- Sin materia (materia_id null) = Comodín. Al borrar una materia, sus sesiones se borran.

create table sesiones_estudio (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  materia_id uuid references materias (id) on delete cascade,
  fecha date not null,
  inicio_min smallint not null check (inicio_min between 0 and 1439),
  fin_min smallint not null check (fin_min between 0 and 1439),
  foco_seg integer not null check (foco_seg >= 0),
  modo text not null check (modo in ('pomodoro', 'cronometro', 'manual')),
  creada_en timestamptz not null default now()
);

create index sesiones_usuario_fecha_idx on sesiones_estudio (usuario_id, fecha);

alter table sesiones_estudio enable row level security;

create policy sesiones_propias on sesiones_estudio
  for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Exámenes
-- ---------------------------------------------------------------------------

create table examenes (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  materia_id uuid not null references materias (id) on delete cascade,
  tipo text not null check (tipo in ('parcial', 'final', 'recuperatorio')),
  titulo text not null check (char_length(titulo) between 1 and 120),
  fecha date not null,
  hora time not null,
  creada_en timestamptz not null default now()
);

create index examenes_materia_idx on examenes (materia_id);

alter table examenes enable row level security;

create policy examenes_propios on examenes
  for all
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
