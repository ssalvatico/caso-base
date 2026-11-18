-- 0004 · Agrega el campo anual a materias.
-- Una materia anual no tiene cuatrimestre específico: se cursa durante todo el año.

alter table materias
  add column if not exists anual boolean not null default false;
