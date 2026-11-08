import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { MATERIAS_ESTUDIO } from '../data/materiasEstudio'
import { agruparPorDia, MATERIA_COMODIN, type MateriaEstudio, type Sesion } from '../utils/estudio'
import { refPersistido, siguienteId as calcularSiguienteId } from '../utils/persistencia'

export type DatosSesion = Omit<Sesion, 'id'>

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
  const sesiones = refPersistido<Sesion[]>('estudio.sesiones', () => [])
  sesiones.value = sinDatosDemo(sesiones.value)
  const resaltada = ref<number | null>(null)
  const edicionPendiente = ref<number | null>(null)
  let siguienteId = calcularSiguienteId(sesiones.value)

  // El comodín (id 0) se resuelve igual que una materia, así sus sesiones tienen nombre.
  const materiaPorId = computed(() => new Map([MATERIA_COMODIN, ...materias].map(m => [m.id, m] as const)))
  const porDia = computed(() => agruparPorDia(sesiones.value))
  const ordenadas = computed(() =>
    [...sesiones.value].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.inicio - a.inicio),
  )

  function materia(id: number): MateriaEstudio | undefined {
    return materiaPorId.value.get(id)
  }

  function agregar(datos: DatosSesion): Sesion {
    const sesion = { ...datos, id: siguienteId++ }
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
    agregar,
    actualizar,
    eliminar,
    pedirEdicion,
    vaciar,
  }
})
