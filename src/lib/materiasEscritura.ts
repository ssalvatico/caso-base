// src/lib/materiasEscritura.ts
// Escritura de materias, dependencias y comisiones en Supabase.
import { supabase } from './supabase'

export interface DatosMateria {
  carreraId: string
  nombre: string
  anio: number
  cuatrimestre: number
  dependeDeIds: string[]       // UUIDs de las materias de las que depende
  comision?: DatosComision
}

export interface DatosComision {
  dia: number          // 1–7 (lunes–domingo)
  inicio: string       // "HH:MM"
  fin: string          // "HH:MM"
  semestre?: string
  sede?: string
  modalidad?: string
  aulas?: string[]
  notas?: string
}

export interface MateriaCreada {
  id: string
  nombre: string
  anio: number
  cuatrimestre: number
  codigoOriginal: string | null
}

export async function crearMateria(datos: DatosMateria): Promise<MateriaCreada> {
  const id = crypto.randomUUID()

  const { data, error } = await supabase
    .from('materias')
    .insert({
      id,
      carrera_id: datos.carreraId,
      nombre: datos.nombre.trim(),
      anio: datos.anio,
      cuatrimestre: datos.cuatrimestre,
    })
    .select('id, nombre, anio, cuatrimestre, codigo_original')
    .single()

  if (error) throw new Error(error.message)

  // Dependencias
  if (datos.dependeDeIds.length) {
    const filas = datos.dependeDeIds.map(depId => ({
      materia_id: id,
      depende_de_id: depId,
      requisito: 'regular' as const,
    }))
    const { error: errDep } = await supabase.from('dependencias').insert(filas)
    if (errDep) throw new Error(errDep.message)
  }

  // Comisión inicial opcional
  if (datos.comision) {
    const c = datos.comision
    const { error: errCom } = await supabase.from('comisiones').insert({
      id: crypto.randomUUID(),
      materia_id: id,
      dia: c.dia,
      inicio: c.inicio,
      fin: c.fin,
      semestre: c.semestre ?? null,
      sede: c.sede ?? null,
      modalidad: c.modalidad ?? null,
      aulas: c.aulas ?? [],
      notas: c.notas ?? null,
    })
    if (errCom) throw new Error(errCom.message)
  }

  const fila = data as { id: string; nombre: string; anio: number; cuatrimestre: number; codigo_original: string | null }
  return {
    id: fila.id,
    nombre: fila.nombre,
    anio: fila.anio,
    cuatrimestre: fila.cuatrimestre,
    codigoOriginal: fila.codigo_original,
  }
}

export interface DatosEditarMateria {
  nombre?: string
  anio?: number
  cuatrimestre?: number
  dependeDeIds?: string[]       // Reemplaza todas las dependencias
  comision?: DatosComision      // Agrega una comisión adicional
}

export async function editarMateria(id: string, datos: DatosEditarMateria): Promise<void> {
  // Actualizar campos de la materia
  const campos: Record<string, unknown> = {}
  if (datos.nombre !== undefined) campos.nombre = datos.nombre.trim()
  if (datos.anio !== undefined) campos.anio = datos.anio
  if (datos.cuatrimestre !== undefined) campos.cuatrimestre = datos.cuatrimestre

  if (Object.keys(campos).length) {
    const { error } = await supabase.from('materias').update(campos).eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Reemplazar dependencias si se indica
  if (datos.dependeDeIds !== undefined) {
    const { error: errDel } = await supabase.from('dependencias').delete().eq('materia_id', id)
    if (errDel) throw new Error(errDel.message)
    if (datos.dependeDeIds.length) {
      const filas = datos.dependeDeIds.map(depId => ({
        materia_id: id,
        depende_de_id: depId,
        requisito: 'regular' as const,
      }))
      const { error: errIns } = await supabase.from('dependencias').insert(filas)
      if (errIns) throw new Error(errIns.message)
    }
  }

  // Agregar comisión adicional si se indica
  if (datos.comision) {
    const c = datos.comision
    const { error: errCom } = await supabase.from('comisiones').insert({
      id: crypto.randomUUID(),
      materia_id: id,
      dia: c.dia,
      inicio: c.inicio,
      fin: c.fin,
      semestre: c.semestre ?? null,
      sede: c.sede ?? null,
      modalidad: c.modalidad ?? null,
      aulas: c.aulas ?? [],
      notas: c.notas ?? null,
    })
    if (errCom) throw new Error(errCom.message)
  }
}

export async function eliminarComision(id: string): Promise<void> {
  const { error } = await supabase.from('comisiones').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function eliminarMateria(id: string) {
  const { error } = await supabase.from('materias').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
