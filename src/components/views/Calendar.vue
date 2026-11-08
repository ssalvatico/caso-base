<script setup lang="ts">
import { computed, inject, onUnmounted, ref, watch } from 'vue'
import { useEstudioStore } from '../../stores/estudio'
import { useMateriasStore } from '../../stores/materias'
import {
  aMinutos,
  claveFecha,
  detectarConflictos,
  formatearMinutos,
  inicioSemana,
  sumarDias,
  sumarMeses,
  weekdayDe,
  type EventoCalendario,
  type ExamenCalendario,
  type SesionEstudioCalendario,
} from '../../utils/calendario'
import { nombreDia, sesionesVigentes } from '../../utils/horarios'
import AvisoConflictos from '../calendario/AvisoConflictos.vue'
import CalendarioGrilla from '../calendario/CalendarioGrilla.vue'
import CalendarioMes from '../calendario/CalendarioMes.vue'
import DetalleEvento from '../calendario/DetalleEvento.vue'
import ListaExamenes from '../calendario/ListaExamenes.vue'
import EstadoVacio from '../EstadoVacio.vue'

type Vista = 'dia' | 'semana' | 'mes'

const HUES = [217, 142, 28, 280, 188, 340, 95, 8]

const store = useMateriasStore()

watch(
  () => store.seleccionadas.map(m => m.id),
  ids => ids.forEach(id => store.cargarOverview(id)),
  { immediate: true },
)

const cargando = computed(() => store.seleccionadas.some(m => store.overviewsCargando[m.id]))
const errores = computed(() =>
  store.seleccionadas.filter(m => store.overviewsError[m.id]).map(m => m.name),
)

const vista = ref<Vista>('semana')
const fecha = ref(new Date())
const ahora = ref(new Date())
const temporizador = window.setInterval(() => (ahora.value = new Date()), 60_000)
onUnmounted(() => window.clearInterval(temporizador))

const eventos = computed<EventoCalendario[]>(() =>
  store.seleccionadas.flatMap((m, i) =>
    sesionesVigentes(store.overviews[m.id]?.sessions ?? [])
      .filter(c => c.start_time && c.end_time && c.weekday)
      .map(c => ({
        id: c.id,
        materiaId: m.id,
        materia: m.name,
        weekday: c.weekday,
        inicio: aMinutos(c.start_time),
        fin: aMinutos(c.end_time),
        hue: HUES[i % HUES.length],
        comision: c,
      }))
      .filter(e => e.fin > e.inicio),
  ),
)

const examenes = computed<ExamenCalendario[]>(() =>
  store.seleccionadas.flatMap((m, i) =>
    store.examenesDe(m.id).map(e => ({
      id: e.id,
      materiaId: m.id,
      materia: m.name,
      tipo: e.tipo,
      titulo: e.titulo,
      clave: e.fecha,
      hora: e.hora,
      hue: HUES[i % HUES.length],
    })),
  ),
)

const examenesVisibles = computed(() => {
  if (vista.value === 'mes') {
    const prefijo = claveFecha(fecha.value).slice(0, 7)
    return examenes.value.filter(e => e.clave.startsWith(prefijo))
  }
  const claves = new Set(dias.value.map(d => claveFecha(d.fecha)))
  return examenes.value.filter(e => claves.has(e.clave))
})

function abrirDia(dia: Date) {
  fecha.value = dia
  vista.value = 'dia'
}

const dias = computed(() => {
  if (vista.value === 'dia') return [{ fecha: fecha.value, weekday: weekdayDe(fecha.value) }]
  const lunes = inicioSemana(fecha.value)
  return Array.from({ length: 7 }, (_, i) => ({
    fecha: sumarDias(lunes, i),
    weekday: i + 1,
  }))
})

const estudio = useEstudioStore()
const navegar = inject<(tab: string) => void>('navegar', () => {})

function abrirRegistro(id: number) {
  estudio.pedirEdicion(id)
  navegar('registros')
}

const sesionesEstudio = computed<SesionEstudioCalendario[]>(() => {
  if (vista.value !== 'semana') return []
  const claves = new Set(dias.value.map(d => claveFecha(d.fecha)))
  return estudio.sesiones
    .filter(s => claves.has(s.fecha) && s.fin > s.inicio)
    .map(s => {
      const materia = estudio.materia(s.materiaId)
      return {
        id: s.id,
        clave: s.fecha,
        inicio: s.inicio,
        fin: s.fin,
        foco: s.foco,
        materia: materia?.nombre ?? 'Materia',
        color: materia?.color ?? '#888888',
      }
    })
})

const leyendaEstudio = computed(() => {
  const vistas = new Map<string, string>()
  sesionesEstudio.value.forEach(s => vistas.set(s.materia, s.color))
  return [...vistas]
    .map(([materia, color]) => ({ materia, color }))
    .sort((a, b) => a.materia.localeCompare(b.materia))
})

const bloques = computed(() => [...eventos.value, ...sesionesEstudio.value])

const horaInicio = computed(() =>
  bloques.value.length
    ? Math.max(0, Math.floor(Math.min(...bloques.value.map(e => e.inicio)) / 60) - 1)
    : 8,
)
const horaFin = computed(() =>
  bloques.value.length
    ? Math.min(24, Math.ceil(Math.max(...bloques.value.map(e => e.fin)) / 60) + 1)
    : 20,
)

const titulo = computed(() => {
  const formato = (d: Date, opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-AR', opciones).format(d)
  if (vista.value === 'mes') return formato(fecha.value, { month: 'long', year: 'numeric' })
  const primero = dias.value[0].fecha
  const ultimo = dias.value[dias.value.length - 1].fecha
  if (vista.value === 'dia') return formato(primero, { day: 'numeric', month: 'long', year: 'numeric' })
  if (primero.getMonth() === ultimo.getMonth()) return formato(primero, { month: 'long', year: 'numeric' })
  return `${formato(primero, { month: 'short' })} - ${formato(ultimo, { month: 'short', year: 'numeric' })}`
})

function mover(sentido: -1 | 1) {
  if (vista.value === 'mes') {
    fecha.value = sumarMeses(fecha.value, sentido)
    return
  }
  fecha.value = sumarDias(fecha.value, sentido * (vista.value === 'semana' ? 7 : 1))
}

const conflictos = computed(() => detectarConflictos(eventos.value))
const conflictoIds = computed(
  () => new Set(conflictos.value.flatMap(c => [c.a.id, c.b.id])),
)
const firmaConflictos = computed(() =>
  conflictos.value.map(c => `${c.a.id}-${c.b.id}`).join('|'),
)

const firmaDescartada = ref('')
const mostrarAviso = computed(
  () => conflictos.value.length > 0 && firmaDescartada.value !== firmaConflictos.value,
)

const soportaNotificaciones = typeof Notification !== 'undefined'
const notificacionesActivas = ref(false)

async function alternarNotificaciones() {
  if (notificacionesActivas.value) {
    notificacionesActivas.value = false
    return
  }
  try {
    const permiso =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission
    notificacionesActivas.value = permiso === 'granted'
  } catch {
    notificacionesActivas.value = false
  }
}

watch(firmaConflictos, (nueva, anterior) => {
  if (!nueva || nueva === anterior || !notificacionesActivas.value) return
  const primero = conflictos.value[0]
  const resto = conflictos.value.length - 1
  try {
    new Notification('Superposición de horarios', {
      body: `${nombreDia(primero.weekday)} ${formatearMinutos(primero.inicio)}: ${primero.a.materia} y ${primero.b.materia}${resto > 0 ? ` (y ${resto} más)` : ''}`,
    })
  } catch {
    notificacionesActivas.value = false
  }
})

const seleccionado = ref<EventoCalendario | null>(null)
const superpuestoCon = computed(() => {
  const actual = seleccionado.value
  if (!actual) return []
  return [
    ...new Set(
      conflictos.value.flatMap(c =>
        c.a.id === actual.id ? [c.b.materia] : c.b.id === actual.id ? [c.a.materia] : [],
      ),
    ),
  ]
})
</script>

<template>
  <section class="calendario" aria-labelledby="calendar-title">
    <h3 id="calendar-title" class="sr-only">Calendario</h3>

      <div class="barra">
        <div class="navegacion">
          <button type="button" class="boton" @click="abrirDia(new Date())">Hoy</button>
          <button type="button" class="icono" aria-label="Anterior" @click="mover(-1)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <button type="button" class="icono" aria-label="Siguiente" @click="mover(1)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
          <p class="titulo" aria-live="polite">{{ titulo }}</p>
        </div>

        <div class="segmentado" role="group" aria-label="Vista del calendario">
          <button
            type="button"
            :aria-pressed="vista === 'semana'"
            :class="{ activo: vista === 'semana' }"
            @click="vista = 'semana'"
          >
            Semana
          </button>
          <button
            type="button"
            :aria-pressed="vista === 'mes'"
            :class="{ activo: vista === 'mes' }"
            @click="vista = 'mes'"
          >
            Mes
          </button>
        </div>
      </div>

      <AvisoConflictos
        v-if="mostrarAviso"
        :conflictos="conflictos"
        :notificaciones="soportaNotificaciones ? notificacionesActivas : null"
        @descartar="firmaDescartada = firmaConflictos"
        @alternar-notificaciones="alternarNotificaciones"
      />

      <p v-if="cargando" class="estado">Cargando horarios...</p>
      <p v-if="errores.length" class="estado estado-error">
        No se pudieron cargar los horarios de: {{ errores.join(', ') }}
      </p>
      <EstadoVacio
        v-if="!store.seleccionadas.length"
        mensaje="Todavía no elegiste materias. Elegilas en Inicio para ver sus horarios."
      />
      <p
        v-else-if="!cargando && !eventos.length && !errores.length"
        class="estado"
      >
        Tus materias no tienen horarios publicados.
      </p>

      <CalendarioMes
        v-if="vista === 'mes'"
        :fecha="fecha"
        :eventos="eventos"
        :examenes="examenes"
        :ahora="ahora"
        @abrir-dia="abrirDia"
      />
      <CalendarioGrilla
        v-else
        :dias="dias"
        :eventos="eventos"
        :examenes="examenes"
        :conflicto-ids="conflictoIds"
        :hora-inicio="horaInicio"
        :hora-fin="horaFin"
        :ahora="ahora"
        :estudio="sesionesEstudio"
        @seleccionar="seleccionado = $event"
        @abrir-estudio="abrirRegistro"
      />

      <div v-if="leyendaEstudio.length" class="leyenda">
        <span class="leyenda-titulo">Estudiaste esta semana</span>
        <ul>
          <li v-for="l in leyendaEstudio" :key="l.materia" :style="{ '--color': l.color }">
            <span class="leyenda-barra" aria-hidden="true" />
            {{ l.materia }}
          </li>
        </ul>
      </div>

      <ListaExamenes
        :examenes="examenesVisibles"
        :titulo="vista === 'mes' ? 'Exámenes del mes' : 'Exámenes de la semana'"
        :vacio="`No hay exámenes ${vista === 'mes' ? 'este mes' : 'esta semana'}. Podés cargarlos en Inicio, dentro de cada materia.`"
      />

      <DetalleEvento
        v-if="seleccionado"
        :evento="seleccionado"
        :superpuesto-con="superpuestoCon"
        @cerrar="seleccionado = null"
      />
  </section>
</template>

<style scoped>
.calendario {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1 1 auto;
  min-height: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.estado {
  margin: 0;
  font-size: 14px;
}

.estado-error {
  color: #e5484d;
}

.leyenda {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.75rem;
  font-size: 12px;
}

.leyenda-titulo {
  color: var(--text);
}

.leyenda ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.leyenda li {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-h);
}

.leyenda-barra {
  width: 4px;
  height: 12px;
  border-radius: 2px;
  background: var(--color);
}

.barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.navegacion {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.titulo {
  margin: 0 0 0 0.5rem;
  font-size: 18px;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--text-h);
}

.boton,
.segmentado button {
  padding: 0.35rem 0.9rem;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  font-size: 14px;
  letter-spacing: 0;
  cursor: pointer;
}

.boton {
  margin-right: 0.25rem;
  border-radius: 999px;
}

.boton:hover,
.icono:hover,
.segmentado button:hover {
  background: var(--code-bg);
}

.icono {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--text-h);
  cursor: pointer;
}

.icono svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.segmentado {
  display: flex;
}

.segmentado button:first-child {
  border-radius: 999px 0 0 999px;
}

.segmentado button:not(:first-child) {
  margin-left: -1px;
}

.segmentado button:last-child {
  border-radius: 0 999px 999px 0;
}

.segmentado button.activo {
  background: var(--accent-bg);
  border-color: var(--accent-border);
  color: var(--accent-text);
  font-weight: 600;
  position: relative;
}

.boton:focus-visible,
.icono:focus-visible,
.segmentado button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.boton,
.icono,
.segmentado button {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

@media (max-width: 719px) {
  .calendario {
    gap: 0.6rem;
  }

  .barra {
    gap: 0.5rem;
  }

  .navegacion {
    flex: 1 1 100%;
    min-width: 0;
  }

  .titulo {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Áreas táctiles de al menos 40px. */
  .icono {
    width: 40px;
    height: 40px;
  }

  .boton,
  .segmentado button {
    min-height: 40px;
    padding: 0.4rem 1rem;
  }

  .segmentado {
    flex: 1 1 100%;
  }

  .segmentado button {
    flex: 1;
  }

  .leyenda {
    gap: 0.35rem 0.6rem;
  }
}
</style>
