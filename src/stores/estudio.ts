import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { MATERIAS_ESTUDIO } from '../data/materiasEstudio'
import { idEstudioDeCodigoPlan } from '../data/planLCC2024'
import {
  agruparPorDia,
  colorDeterministico,
  idDeMateriaSinCatalogo,
  MATERIA_COMODIN,
  type MateriaEstudio,
  type Sesion,
} from '../utils/estudio'
import { refPersistido, siguienteId as calcularSiguienteId } from '../utils/persistencia'
import { useMateriasStore, type Materia } from './materias'

export type DatosSesion = Omit<Sesion, 'id' | 'uuid'>

// Materias que usaba el generador de datos demo de versiones anteriores.
const MATERIAS_DEMO = new Set([312, 212, 311, 313, 223, 224, 221, 222])

function esSesionDemo(s: Sesion): boolean {
  if (!MATERIAS_DEMO.has(s.materiaId) || s.foco % 60 !== 0) return false
  const minutosFoco = s.foco / 60
  const duracion = s.fin - s.inicio
  return s.modo === 'pomodoro'
    ? duracion === Math.round((minutosFoco * 30) / 25)
    : duracion === minutosFoco
}

// Versiones anteriores sembraban sesiones demo en el navegador. Solo se descartan si el
// historial guardado es exactamente ese set intacto; si el usuario cargó algo propio, no se toca nada.
function sinDatosDemo(sesiones: Sesion[]): Sesion[] {
  const esSemillaIntacta =
    sesiones.length >= 20 &&
    sesiones.every((s, i) => s.id === i + 1 && esSesionDemo(s))
  return esSemillaIntacta ? [] : sesiones
}

export const useEstudioStore = defineStore('estudio', () => {
  const materias: MateriaEstudio[] = MATERIAS_ESTUDIO
  const materiaDelCatalogoPorId = new Map(materias.map(m => [m.id, m] as const))
  const materiasStore = useMateriasStore()
  const sesiones = refPersistido<Sesion[]>('estudio.sesiones', () => [])
  sesiones.value = sinDatosDemo(sesiones.value)
  // Sesiones guardadas antes de existir el uuid: se les asigna uno sin tocar el resto.
  sesiones.value = sesiones.value.map(s => (s.uuid ? s : { ...s, uuid: crypto.randomUUID() }))
  const resaltada = ref<number | null>(null)
  const edicionPendiente = ref<number | null>(null)
  let siguienteId = calcularSiguienteId(sesiones.value)

  // Id de una materia seleccionada por el usuario (sección Materias) dentro del espacio del Pomodoro.
  // Si tiene equivalente en el catálogo fijo, usa ese id (mejor nombre y color); si no, uno propio.
  function idEstudioDeMateria(m: Materia): number {
    const idCatalogo = idEstudioDeCodigoPlan(m.code)
    return idCatalogo !== null && materiaDelCatalogoPorId.has(idCatalogo) ? idCatalogo : idDeMateriaSinCatalogo(m.id)
  }

  function materiaEstudioDeApi(m: Materia): MateriaEstudio {
    const idCatalogo = idEstudioDeCodigoPlan(m.code)
    const delCatalogo = idCatalogo !== null ? materiaDelCatalogoPorId.get(idCatalogo) : undefined
    if (delCatalogo) return delCatalogo
    return {
      id: idDeMateriaSinCatalogo(m.id),
      nombre: m.name,
      corto: m.name.length > 14 ? `${m.name.slice(0, 13)}…` : m.name,
      anio: m.year ?? 0,
      color: colorDeterministico(m.id),
    }
  }

  // El comodín (id 0) y las materias elegidas por el usuario se resuelven igual que el catálogo,
  // estén o no en el catálogo fijo, así cualquier materia elegida se puede estudiar.
  const materiaPorId = computed(() => {
    const elegidas = materiasStore.seleccionadas.map(materiaEstudioDeApi)
    return new Map([MATERIA_COMODIN, ...materias, ...elegidas].map(m => [m.id, m] as const))
  })
  const porDia = computed(() => agruparPorDia(sesiones.value))
  const ordenadas = computed(() =>
    [...sesiones.value].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.inicio - a.inicio),
  )

  function materia(id: number): MateriaEstudio | undefined {
    return materiaPorId.value.get(id)
  }

  function agregar(datos: DatosSesion): Sesion {
    const sesion = { ...datos, id: siguienteId++, uuid: crypto.randomUUID() }
    sesiones.value = [...sesiones.value, sesion]
    resaltada.value = sesion.id
    return sesion
  }

  function actualizar(id: number, datos: Partial<DatosSesion>) {
    sesiones.value = sesiones.value.map(s => (s.id === id ? { ...s, ...datos } : s))
    resaltada.value = id
  }

  function eliminar(id: number) {
    sesiones.value = sesiones.value.filter(s => s.id !== id)
  }

  function pedirEdicion(id: number) {
    edicionPendiente.value = id
  }

  function vaciar() {
    sesiones.value = []
  }

  return {
    materias,
    sesiones,
    resaltada,
    edicionPendiente,
    porDia,
    ordenadas,
    materia,
    idEstudioDeMateria,
    agregar,
    actualizar,
    eliminar,
    pedirEdicion,
    vaciar,
  }
})
