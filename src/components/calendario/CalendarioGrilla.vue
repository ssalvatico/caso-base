<script setup lang="ts">
import { computed } from 'vue'
import {
  claveFecha,
  ETIQUETA_TIPO,
  formatearMinutos,
  INICIAL_TIPO,
  mismoDia,
  posicionar,
  type EventoCalendario,
  type ExamenCalendario,
  type SesionEstudioCalendario,
} from '../../utils/calendario'
import { horasMinutos } from '../../utils/estudio'
import { nombreDia, textoAula } from '../../utils/horarios'

interface DiaGrilla {
  fecha: Date
  weekday: number
}

const ALTO_HORA = 56

const props = withDefaults(
  defineProps<{
    dias: DiaGrilla[]
    eventos: EventoCalendario[]
    conflictoIds: Set<number>
    examenes: ExamenCalendario[]
    horaInicio: number
    horaFin: number
    ahora: Date
    estudio?: SesionEstudioCalendario[]
  }>(),
  { estudio: () => [] },
)

function estiloEstudio(s: SesionEstudioCalendario) {
  return {
    top: `${((s.inicio - base.value) / 60) * ALTO_HORA}px`,
    height: `${Math.max(((s.fin - s.inicio) / 60) * ALTO_HORA - 2, 6)}px`,
    '--color': s.color,
  }
}

function etiquetaEstudio(s: SesionEstudioCalendario): string {
  return `Sesión de estudio: ${s.materia}, de ${formatearMinutos(s.inicio)} a ${formatearMinutos(s.fin)}, ${horasMinutos(s.foco)} de foco. Abrir registro para editar`
}

const emit = defineEmits<{ seleccionar: [evento: EventoCalendario]; abrirEstudio: [id: number] }>()

const horas = computed(() =>
  Array.from({ length: props.horaFin - props.horaInicio + 1 }, (_, i) => props.horaInicio + i),
)
const altoTotal = computed(() => (props.horaFin - props.horaInicio) * ALTO_HORA)
const base = computed(() => props.horaInicio * 60)

const columnas = computed(() =>
  props.dias.map(dia => ({
    ...dia,
    esHoy: mismoDia(dia.fecha, props.ahora),
    examenes: props.examenes
      .filter(e => e.clave === claveFecha(dia.fecha))
      .sort((a, b) => a.hora.localeCompare(b.hora)),
    eventos: posicionar(props.eventos.filter(e => e.weekday === dia.weekday)),
    estudio: props.estudio.filter(s => s.clave === claveFecha(dia.fecha)),
  })),
)

const minutosAhora = computed(() => props.ahora.getHours() * 60 + props.ahora.getMinutes())
const lineaAhoraVisible = computed(
  () => minutosAhora.value >= base.value && minutosAhora.value <= props.horaFin * 60,
)
const topAhora = computed(() => ((minutosAhora.value - base.value) / 60) * ALTO_HORA)

function estilo(e: { inicio: number; fin: number; columna: number; columnas: number; hue: number }) {
  const util = '(100% - var(--franja, 0px))'
  return {
    top: `${((e.inicio - base.value) / 60) * ALTO_HORA}px`,
    height: `${((e.fin - e.inicio) / 60) * ALTO_HORA - 2}px`,
    left: `calc(var(--franja, 0px) + ${util} * ${e.columna / e.columnas} + 2px)`,
    width: `calc(${util} / ${e.columnas} - 5px)`,
    '--hue': e.hue,
  }
}

function etiqueta(e: EventoCalendario): string {
  const aula = textoAula(e.comision)
  return `${e.materia}, ${nombreDia(e.weekday)} de ${formatearMinutos(e.inicio)} a ${formatearMinutos(e.fin)}${aula ? `, ${aula}` : ''}`
}
</script>

<template>
  <div
    class="grilla"
    :style="{ '--cols': dias.length, '--alto-hora': `${ALTO_HORA}px` }"
    role="group"
    aria-label="Horarios semanales"
  >
    <div class="interna" :class="{ multiple: dias.length > 1, 'con-estudio': estudio.length > 0 }">
      <div class="cabecera">
        <div class="gutter" />
        <div v-for="c in columnas" :key="c.weekday" class="cab-dia" :class="{ hoy: c.esHoy }">
          <span class="nombre">{{ nombreDia(c.weekday).slice(0, 3) }}</span>
          <span class="numero">{{ c.fecha.getDate() }}</span>
          <ul v-if="c.examenes.length" class="examenes">
            <li
              v-for="e in c.examenes"
              :key="e.id"
              class="examen"
              :style="{ '--hue': e.hue }"
              :title="`${e.titulo} - ${e.materia}, ${e.hora}`"
            >
              <span class="sr-only">{{ ETIQUETA_TIPO[e.tipo] }}: </span>
              <strong aria-hidden="true">{{ INICIAL_TIPO[e.tipo] }}</strong>
              {{ e.hora }} {{ e.titulo }} · {{ e.materia }}
            </li>
          </ul>
        </div>
      </div>

      <div class="cuerpo" :style="{ height: `${altoTotal}px` }">
        <div class="horas" aria-hidden="true">
          <span
            v-for="(h, i) in horas"
            :key="h"
            class="hora"
            :style="{ top: `${i * ALTO_HORA}px` }"
          >
            <template v-if="i > 0">{{ String(h).padStart(2, '0') }}:00</template>
          </span>
        </div>

        <div
          v-for="(c, ci) in columnas"
          :key="c.weekday"
          class="columna"
          :class="{ hoy: c.esHoy }"
        >
          <button
            v-for="s in c.estudio"
            :key="`estudio-${s.id}`"
            type="button"
            class="estudio"
            :class="{ invertido: ci >= columnas.length - 2 }"
            :style="estiloEstudio(s)"
            :aria-label="etiquetaEstudio(s)"
            @click="emit('abrirEstudio', s.id)"
          >
            <span class="estudio-detalle" aria-hidden="true">
              <span class="estudio-materia">
                <span class="punto" />
                {{ s.materia }}
              </span>
              <span>{{ formatearMinutos(s.inicio) }} - {{ formatearMinutos(s.fin) }}</span>
              <span class="estudio-foco">{{ horasMinutos(s.foco) }} de foco</span>
              <span class="estudio-accion">Clic para editar</span>
            </span>
          </button>

          <button
            v-for="e in c.eventos"
            :key="e.id"
            type="button"
            class="evento"
            :class="{
              conflicto: conflictoIds.has(e.id),
              compacto: e.fin - e.inicio < 60,
            }"
            :style="estilo(e)"
            :aria-label="etiqueta(e)"
            @click="emit('seleccionar', e)"
          >
            <span class="evento-titulo">
              <svg
                v-if="conflictoIds.has(e.id)"
                class="icono-alerta"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 3 2 21h20L12 3Z" />
                <path d="M12 10v5M12 18h.01" />
              </svg>
              {{ e.materia }}
            </span>
            <span class="evento-hora">
              {{ formatearMinutos(e.inicio) }} - {{ formatearMinutos(e.fin) }}
            </span>
            <span v-if="textoAula(e.comision)" class="evento-aula">
              {{ textoAula(e.comision) }}
            </span>
          </button>

          <div
            v-if="c.esHoy && lineaAhoraVisible"
            class="ahora"
            :style="{ top: `${topAhora}px` }"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grilla {
  max-height: calc(100svh - 300px);
  min-height: 360px;
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
}

@media (max-width: 719px) {
  /* La grilla ocupa el espacio que sobra debajo de la barra de navegación del calendario. */
  .grilla {
    flex: 1 1 auto;
    max-height: none;
    min-height: 220px;
    scroll-padding-left: 2.25rem;
  }

  .evento {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  /* Los 7 días entran en el ancho del celular: sin scroll horizontal. */
  .interna.multiple {
    min-width: 0;
  }

  .cabecera,
  .cuerpo {
    grid-template-columns: 2.25rem repeat(var(--cols), minmax(0, 1fr));
  }

  .cab-dia {
    padding: 0.4rem 0;
    font-size: 10px;
    letter-spacing: 0;
  }

  .numero {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 14px;
  }

  .hora {
    right: 0.25rem;
    font-size: 9px;
  }

  .evento {
    padding: 3px 2px;
    font-size: 10px;
    line-height: 1.2;
  }

  .evento-titulo {
    gap: 2px;
    font-size: 10px;
    overflow-wrap: anywhere;
  }

  /* El horario exacto y el aula se ven al tocar el bloque (DetalleEvento). */
  .evento-hora,
  .evento-aula {
    display: none;
  }

  .icono-alerta {
    width: 10px;
    height: 10px;
  }

  .estudio {
    width: 3px;
  }
}

@media (min-width: 720px) {
  .interna.multiple {
    min-width: 640px;
  }
}

.cabecera,
.cuerpo {
  display: grid;
  grid-template-columns: 3.25rem repeat(var(--cols), minmax(0, 1fr));
}

.cabecera {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

.cab-dia {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0.5rem 0;
  border-left: 1px solid var(--border);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text);
}

.numero {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  font-size: 18px;
  letter-spacing: 0;
  color: var(--text-h);
}

.examenes {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-self: stretch;
  margin: 4px 0 0;
  padding: 0 3px;
  list-style: none;
}

.examen {
  overflow: hidden;
  padding: 1px 5px;
  border-radius: 4px;
  background: hsl(var(--hue) 55% 40%);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0;
  text-overflow: ellipsis;
  text-transform: none;
  white-space: nowrap;
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

.cab-dia.hoy {
  color: var(--accent-text);
}

.cab-dia.hoy .numero {
  background: var(--accent);
  color: #fff;
}

.horas {
  position: relative;
}

.hora {
  position: absolute;
  right: 0.5rem;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--text);
}

.columna {
  position: relative;
  border-left: 1px solid var(--border);
  background-image: repeating-linear-gradient(
    to bottom,
    var(--border) 0,
    var(--border) 1px,
    transparent 1px,
    transparent var(--alto-hora)
  );
}

.columna.hoy {
  background-color: var(--accent-bg);
}

.evento {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 1px;
  box-sizing: border-box;
  padding: 4px 6px;
  overflow: hidden;
  border: 0;
  border-radius: 6px;
  background: hsl(var(--hue) 55% 40%);
  color: #fff;
  font: inherit;
  font-size: 12px;
  line-height: 1.25;
  letter-spacing: 0;
  text-align: left;
  cursor: pointer;
  z-index: 1;
}

.evento:hover {
  filter: brightness(1.1);
}

.evento:focus-visible {
  outline: 2px solid var(--text-h);
  outline-offset: 1px;
  z-index: 2;
}

.evento.conflicto {
  box-shadow: 0 0 0 2px #e5484d inset;
}

.evento.compacto {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 6px;
  padding-top: 2px;
  padding-bottom: 2px;
}

.evento.compacto .evento-aula {
  display: none;
}

.evento-titulo {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.evento-hora,
.evento-aula {
  opacity: 0.92;
}

.icono-alerta {
  flex: none;
  width: 14px;
  height: 14px;
  fill: var(--examen-relleno);
  stroke: var(--examen-trazo);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.con-estudio {
  --franja: 7px;
}

.estudio {
  position: absolute;
  left: 2px;
  width: 4px;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: var(--color);
  cursor: pointer;
  z-index: 2;
}

.estudio::before {
  content: '';
  position: absolute;
  inset: 0 -3px;
}

.estudio:focus-visible {
  outline: 2px solid var(--text-h);
  outline-offset: 1px;
}

.estudio-detalle {
  position: absolute;
  top: 0;
  left: calc(100% + 6px);
  display: none;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--color);
  border-radius: 6px;
  background: var(--bg);
  box-shadow: 0 4px 14px rgb(0 0 0 / 0.25);
  color: var(--text-h);
  font-size: 12px;
  line-height: 1.3;
  text-align: left;
  white-space: nowrap;
  pointer-events: none;
  z-index: 6;
}

.estudio.invertido .estudio-detalle {
  left: auto;
  right: calc(100% + 6px);
}

.estudio:hover,
.estudio:focus-visible,
.estudio.abierto {
  z-index: 5;
}

.estudio:hover .estudio-detalle,
.estudio:focus-visible .estudio-detalle,
.estudio.abierto .estudio-detalle {
  display: flex;
}

.estudio-materia {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
}

.punto {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color);
}

.estudio-foco {
  color: var(--text);
}

.estudio-accion {
  margin-top: 2px;
  font-size: 10px;
  color: var(--text);
  opacity: 0.8;
}

.ahora {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #e5484d;
  z-index: 2;
  pointer-events: none;
}

.ahora::before {
  content: '';
  position: absolute;
  left: -5px;
  top: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e5484d;
}
</style>
