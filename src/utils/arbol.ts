import type { Materia } from '../stores/materias'
import type { GrupoAnioConCuatrimestres } from './agrupar'

export const NODO_ANCHO = 188
export const NODO_ALTO = 104
export const COLUMNA = 252
export const FILA = 120
export const Y_ANIO = 0
export const Y_TERM = 46
export const Y_NODOS = 92

const SEPARACION = COLUMNA - NODO_ANCHO

export interface NodoPos {
  materia: Materia
  x: number
  y: number
}

export interface EncabezadoAnio {
  key: string
  anio: number | null
  x: number
  ancho: number
  materias: Materia[]
}

export interface EncabezadoTerm {
  key: string
  term: number | null
  x: number
  materias: Materia[]
}

export interface LayoutArbol {
  nodos: NodoPos[]
  anios: EncabezadoAnio[]
  terminos: EncabezadoTerm[]
  ancho: number
  alto: number
}

// Cada cuatrimestre es una columna; los años agrupan sus columnas.
export function calcularLayout(grupos: GrupoAnioConCuatrimestres[]): LayoutArbol {
  const nodos: NodoPos[] = []
  const anios: EncabezadoAnio[] = []
  const terminos: EncabezadoTerm[] = []
  let columna = 0
  let filasMax = 0

  for (const grupo of grupos) {
    const xAnio = columna * COLUMNA

    anios.push({
      key: String(grupo.anio),
      anio: grupo.anio,
      x: xAnio,
      ancho: grupo.cuatrimestres.length * COLUMNA - SEPARACION,
      materias: grupo.cuatrimestres.flatMap(c => c.materias),
    })

    for (const cuatri of grupo.cuatrimestres) {
      const x = columna * COLUMNA
      terminos.push({ key: `${grupo.anio}-${cuatri.term}`, term: cuatri.term, x, materias: cuatri.materias })

      cuatri.materias.forEach((materia, fila) => {
        nodos.push({ materia, x, y: Y_NODOS + fila * FILA })
      })

      filasMax = Math.max(filasMax, cuatri.materias.length)
      columna++
    }
  }

  return {
    nodos,
    anios,
    terminos,
    ancho: Math.max(columna * COLUMNA - SEPARACION, 0),
    alto: Y_NODOS + filasMax * FILA,
  }
}
