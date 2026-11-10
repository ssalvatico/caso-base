// src/stores/materias.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { CODIGO_PLAN_POR_CODIGO_API, PLAN_LCC_2024, requisitosDelPlan } from '../data/planLCC2024'
import { refPersistido, siguienteId } from '../utils/persistencia'

export interface Materia {
  id: number
  career_id: number
  name: string
  code: string | null
  year: number | null
  term: number | null
  kind: string | null
}

export interface Comision {
  id: number
  subject_id: number
  semester: string | null
  weekday: number
  start_time: string | null
  end_time: string | null
  rooms: string[]
  campus: string | null
  campus_id: number | null
  mode: string | null
  notes: string | null
}

export interface Correlativa {
  id: number
  code: string | null
  name: string
  requirement: string | null
}

export interface MateriaOverview extends Materia {
  description: string | null
  syllabus_pdf_url: string | null
  campus_url: string | null
  website_url: string | null
  area: string | null
  area_id: number | null
  sessions: Comision[]
  exam_count: number
  solution_count: number
  material_count: number
  prerequisites: Correlativa[]
}

export type TipoExamen = 'parcial' | 'final' | 'recuperatorio'

export interface Examen {
  id: number
  // Identidad estable para la sincronización.
  uuid: string
  materiaId: number
  tipo: TipoExamen
  titulo: string
  fecha: string // YYYY-MM-DD en hora local
  hora: string // HH:mm
}

export type NuevoExamen = Pick<Examen, 'tipo' | 'titulo' | 'fecha' | 'hora'>

export type Condicion = 'no_cursable' | 'regular' | 'libre' | 'aprobada'

export const CONDICIONES: { valor: Condicion; etiqueta: string }[] = [
  { valor: 'no_cursable', etiqueta: 'No cursable' },
  { valor: 'regular', etiqueta: 'Regular' },
  { valor: 'libre', etiqueta: 'Libre' },
  { valor: 'aprobada', etiqueta: 'Aprobada' },
]

// "No cursable" nunca se elige: se deriva de las correlativas.
export type CondicionElegible = Exclude<Condicion, 'no_cursable'>

export const CONDICIONES_ELEGIBLES = CONDICIONES.filter(
  (c): c is { valor: CondicionElegible; etiqueta: string } => c.valor !== 'no_cursable',
)

export type MotivoBloqueo = 'libre' | 'correlativas'

// Condición de toda materia con correlativas sin cumplir (y mientras no se carguen), salvo las de CUATRIMESTRE_INICIAL.
export const CONDICION_POR_DEFECTO: Condicion = 'no_cursable'

// Condición que toma una materia cuando todas sus correlativas están al menos en Regular.
export const CONDICION_DESBLOQUEADA: CondicionElegible = 'libre'

// Condiciones de una correlativa que habilitan a sus siguientes ("al menos Regular").
const CONDICIONES_QUE_HABILITAN: Condicion[] = ['regular', 'aprobada']

// Materias que arrancan con otra condición (por defecto: 1º año, 1º cuatrimestre).
export const CUATRIMESTRE_INICIAL = { year: 1, term: 1 }
export const CONDICION_CUATRIMESTRE_INICIAL: Condicion = 'libre'

const CONDICIONES_SELECCIONABLES: Condicion[] = ['regular', 'libre']

export function etiquetaCondicion(condicion: Condicion) {
  return CONDICIONES.find(c => c.valor === condicion)?.etiqueta ?? condicion
}

interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// "r123" -> año 1, cuatrimestre 2. Solo aplica a códigos con formato rXXX.
function derivarAnioYCuatrimestre(code: string | null): { year: number; term: number } | null {
  const match = code?.trim().toLowerCase().match(/^r(\d)(\d)\d$/)
  if (!match) return null
  return { year: Number(match[1]), term: Number(match[2]) }
}

// Reemplaza el código de la API por el del Plan 2024 y toma de ahí año y cuatrimestre.
function adaptarAlPlan(materia: Materia): Materia {
  const codigoPlan = CODIGO_PLAN_POR_CODIGO_API[materia.code?.trim().toLowerCase() ?? '']
  const delPlan = codigoPlan ? PLAN_LCC_2024[codigoPlan] : undefined
  if (codigoPlan && delPlan) {
    return { ...materia, code: codigoPlan, year: delPlan.anio, term: ((delPlan.cuatri - 1) % 2) + 1 }
  }
  const derivado = derivarAnioYCuatrimestre(materia.code)
  return derivado ? { ...materia, year: derivado.year, term: derivado.term } : materia
}

function apiUrl(): string | null {
  return (import.meta.env.VITE_API_URL as string | undefined) ?? null
}

export const useMateriasStore = defineStore('materias', () => {
  const disponibles = ref<Materia[]>([])
  const seleccionadas = refPersistido<Materia[]>('materias.seleccionadas', () => [])
  const cargando = ref(false)
  const error = ref<string | null>(null)

  async function cargarDisponibles() {
    const BASE_URL = import.meta.env.VITE_API_URL as string | undefined
    if (!BASE_URL) {
      error.value = 'Falta la variable VITE_API_URL en el archivo .env'
      return
    }

    cargando.value = true
    error.value = null
    try {
      const url = `${BASE_URL}/subjects?career_id=1&kind=obligatoria`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Page<Materia> = await res.json()

      disponibles.value = data.items.map(adaptarAlPlan)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar materias'
      disponibles.value = []
    } finally {
      cargando.value = false
    }

    // Las correlativas determinan qué materias están habilitadas, así que se cargan sin importar la pestaña.
    void cargarOverviews(disponibles.value.map(m => m.id))
  }

  const overviews = ref<Record<number, MateriaOverview>>({})
  const overviewsCargando = ref<Record<number, boolean>>({})
  const overviewsError = ref<Record<number, string | null>>({})

  async function cargarOverview(id: number) {
    if (overviews.value[id] || overviewsCargando.value[id]) return

    const BASE_URL = apiUrl()
    if (!BASE_URL) {
      overviewsError.value[id] = 'Falta la variable VITE_API_URL en el archivo .env'
      return
    }

    overviewsCargando.value[id] = true
    overviewsError.value[id] = null
    try {
      const res = await fetch(`${BASE_URL}/subjects/${id}/overview`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      overviews.value[id] = (await res.json()) as MateriaOverview
    } catch (e) {
      overviewsError.value[id] = e instanceof Error ? e.message : 'Error al cargar la materia'
    } finally {
      overviewsCargando.value[id] = false
    }
  }

  const condiciones = refPersistido<Record<number, CondicionElegible>>('materias.condiciones', () => ({}))

  async function cargarOverviews(ids: number[]) {
    await Promise.all(ids.map(cargarOverview))
  }

  function requisitosPlanDe(id: number): string[] | null {
    const codigo = disponibles.value.find(m => m.id === id)?.code
    return codigo ? requisitosDelPlan(codigo) : null
  }

  // El Plan 2024 tiene prioridad; la API solo cubre materias que no están en él (p. ej. optativas).
  function prerequisitosDe(id: number): number[] {
    const delPlan = requisitosPlanDe(id)
    if (delPlan) {
      return delPlan.flatMap(codigo => disponibles.value.find(m => m.code === codigo)?.id ?? [])
    }
    return overviews.value[id]?.prerequisites.map(p => p.id) ?? []
  }

  // Solo cuentan las correlativas que forman parte de las materias del árbol.
  function prerequisitosRastreables(id: number): number[] {
    return prerequisitosDe(id).filter(p => disponibles.value.some(m => m.id === p))
  }

  function esInicial(id: number) {
    const materia = disponibles.value.find(m => m.id === id)
    return materia?.year === CUATRIMESTRE_INICIAL.year && materia?.term === CUATRIMESTRE_INICIAL.term
  }

  const enCalculo = new Set<number>()

  // Motivo por el que la materia está "No cursable"; null si no lo está.
  function motivoBloqueo(id: number): MotivoBloqueo | null {
    if (condiciones.value[id] === 'aprobada') return null
    if (!requisitosPlanDe(id) && !overviews.value[id]) return esInicial(id) ? null : 'correlativas'
    if (enCalculo.has(id)) return 'correlativas'

    enCalculo.add(id)
    try {
      const condicionesPrevias = prerequisitosRastreables(id).map(condicionDe)
      if (condicionesPrevias.includes('libre')) return 'libre'
      if (condicionesPrevias.some(c => !CONDICIONES_QUE_HABILITAN.includes(c))) return 'correlativas'
      return null
    } finally {
      enCalculo.delete(id)
    }
  }

  function bloqueadaPorLibre(id: number) {
    return motivoBloqueo(id) === 'libre'
  }

  // Sin bloqueo, la materia toma lo que eligió el usuario o su condición automática.
  function condicionDe(id: number): Condicion {
    if (motivoBloqueo(id)) return 'no_cursable'
    return (
      condiciones.value[id] ?? (esInicial(id) ? CONDICION_CUATRIMESTRE_INICIAL : CONDICION_DESBLOQUEADA)
    )
  }

  function esSeleccionable(id: number) {
    return CONDICIONES_SELECCIONABLES.includes(condicionDe(id))
  }

  function setCondicion(id: number, condicion: CondicionElegible) {
    if (motivoBloqueo(id)) return
    condiciones.value[id] = condicion
    seleccionadas.value = seleccionadas.value.filter(m => esSeleccionable(m.id))
  }

  function toggleMateria(materia: Materia) {
    const idx = seleccionadas.value.findIndex(m => m.id === materia.id)
    if (idx >= 0) seleccionadas.value.splice(idx, 1)
    else if (esSeleccionable(materia.id)) seleccionadas.value.push(materia)
  }

  // La API no publica fechas de parciales ni mesas: las carga el usuario.
  const examenes = refPersistido<Examen[]>('materias.examenes', () => [])
  // Exámenes guardados antes de existir el uuid: se les asigna uno.
  examenes.value = examenes.value.map(e => (e.uuid ? e : { ...e, uuid: crypto.randomUUID() }))
  let siguienteExamenId = siguienteId(examenes.value)

  function examenesDe(materiaId: number): Examen[] {
    return examenes.value
      .filter(e => e.materiaId === materiaId)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
  }

  // Devuelve false si ya existe un examen del mismo tipo para esa materia en esa fecha.
  function agregarExamen(materiaId: number, datos: NuevoExamen): boolean {
    if (!datos.fecha) return false
    const repetido = examenes.value.some(
      e => e.materiaId === materiaId && e.tipo === datos.tipo && e.fecha === datos.fecha,
    )
    if (repetido) return false
    examenes.value.push({ ...datos, id: siguienteExamenId++, uuid: crypto.randomUUID(), materiaId })
    return true
  }

  function quitarExamen(id: number) {
    examenes.value = examenes.value.filter(e => e.id !== id)
  }

  return {
    examenes,
    examenesDe,
    agregarExamen,
    quitarExamen,
    disponibles,
    seleccionadas,
    condiciones,
    condicionDe,
    motivoBloqueo,
    bloqueadaPorLibre,
    prerequisitosDe,
    esSeleccionable,
    setCondicion,
    cargarOverviews,
    cargando,
    error,
    overviews,
    overviewsCargando,
    overviewsError,
    cargarDisponibles,
    cargarOverview,
    toggleMateria,
  }
})
