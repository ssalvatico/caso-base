-- 0003 · El semestre de una comisión puede venir como texto libre desde la API
-- (por ejemplo "última publicación"), así que ya no se limita al formato 2026-1.
alter table comisiones drop constraint if exists comisiones_semestre_check;
