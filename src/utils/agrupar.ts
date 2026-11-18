import type { Materia } from '../stores/materias'

export interface GrupoAnio {
  anio: number | null
  materias: Materia[]
}

export interface GrupoCuatrimestre {
  term: number | null
  materias: Materia[]
}

export interface GrupoAnioConCuatrimestres {
  anio: number | null
  cuatrimestres: GrupoCuatrimestre[]
}

function porValorNullAlFinal(a: number | null, b: number | null) {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a - b
}

// Orden dentro de un año: anuales (0) → 1C (1) → 2C (2) → sin cuatrimestre (3)
function ordenTerm(m: Materia): number {
  if (m.anual) return 0
  if (m.term === 1) return 1
  if (m.term === 2) return 2
  return 3
}

export function agruparPorAnio(materias: Materia[]): GrupoAnio[] {
  const anios = new Map<number | null, Materia[]>()

  for (const m of materias) {
    const lista = anios.get(m.year) ?? []
    lista.push(m)
    anios.set(m.year, lista)
  }

  return [...anios.entries()]
    .sort(([a], [b]) => porValorNullAlFinal(a, b))
    .map(([anio, lista]) => ({
      anio,
      materias: [...lista].sort((a, b) => {
        const diff = ordenTerm(a) - ordenTerm(b)
        return diff !== 0 ? diff : a.name.localeCompare(b.name)
      }),
    }))
}

// Versión con sub-agrupación por cuatrimestre — usada por el árbol de correlativas.
export function agruparPorAnioYCuatrimestre(materias: Materia[]): GrupoAnioConCuatrimestres[] {
  const anios = new Map<number | null, Map<number | null, Materia[]>>()

  for (const m of materias) {
    if (!anios.has(m.year)) anios.set(m.year, new Map())
    const terms = anios.get(m.year)!
    const term = m.anual ? null : m.term
    const lista = terms.get(term) ?? []
    lista.push(m)
    terms.set(term, lista)
  }

  return [...anios.entries()]
    .sort(([a], [b]) => porValorNullAlFinal(a, b))
    .map(([anio, terms]) => ({
      anio,
      cuatrimestres: [...terms.entries()]
        .sort(([a], [b]) => porValorNullAlFinal(a, b))
        .map(([term, lista]) => ({
          term,
          materias: [...lista].sort((a, b) => a.name.localeCompare(b.name)),
        })),
    }))
}

export function tituloAnio(anio: number | null) {
  return anio !== null ? `${anio}º año` : 'Sin año asignado'
}

export function tituloCuatrimestre(term: number | null) {
  if (term === 1) return '1° cuatrimestre'
  if (term === 2) return '2° cuatrimestre'
  return 'Sin cuatrimestre'
}

export function etiquetaTerm(m: Materia): string {
  if (m.anual) return 'Anual'
  if (m.term === 1) return '1C'
  if (m.term === 2) return '2C'
  return ''
}
