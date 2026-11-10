<script setup lang="ts">
import { computed, inject, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { Check, ChevronDown, Pause, Pencil, Play, SkipForward, Square } from 'lucide-vue-next'
import { useEstudioStore } from '../../stores/estudio'
import { useMateriasStore } from '../../stores/materias'
import { idEstudioDeCodigoPlan } from '../../data/planLCC2024'
import { refPersistido } from '../../utils/persistencia'
import { clave, hmm, hmmss, horasMinutos, MATERIA_COMODIN, pad, reloj, type ConfigPomodoro, type Sesion } from '../../utils/estudio'
import RelojCircular from '../estudio/RelojCircular.vue'
import SelectorMateria from '../estudio/SelectorMateria.vue'
import EditorIntervalos from '../estudio/EditorIntervalos.vue'
import ChipMateria from '../estudio/ChipMateria.vue'
import { habilitarSonido, sonidoFinDescanso, sonidoFinFoco } from '../../utils/sonidos'

type Modo = 'pomodoro' | 'cronometro'
type Estado = 'inicial' | 'corriendo' | 'pausado' | 'finalizado'
type Fase = 'foco' | 'corto' | 'largo'

const store = useEstudioStore()
const materias = useMateriasStore()
const navegar = inject<(tab: string) => void>('navegar', () => {})

const modo = ref<Modo>('pomodoro')
const config = reactive<ConfigPomodoro>({ foco: 25, corto: 5, largo: 15, ciclos: 4 })
// Materia seleccionada para estudiar. Se guarda en el navegador para que no se pierda al recargar.
// null = Comodín (sin materia asignada).
const materiaId = refPersistido<number | null>('pomodoro.materia', () => null)

// Ids del catálogo de estudio de las materias que el usuario eligió en su sección Materias.
const elegidas = computed(
  () =>
    new Set(
      materias.seleccionadas
        .map(m => idEstudioDeCodigoPlan(m.code))
        .filter((id): id is number => id !== null),
    ),
)

// Ids del catálogo de estudio cuya materia ya está aprobada.
const aprobadas = computed(
  () =>
    new Set(
      materias.disponibles
        .filter(m => materias.condicionDe(m.id) === 'aprobada')
        .map(m => idEstudioDeCodigoPlan(m.code))
        .filter((id): id is number => id !== null),
    ),
)

// El selector solo ofrece las materias elegidas que no estén aprobadas (el Comodín se agrega aparte).
const materiasElegibles = computed(() =>
  store.materias.filter(m => elegidas.value.has(m.id) && !aprobadas.value.has(m.id)),
)

// Si la materia seleccionada deja de ser elegible (se aprobó o se quitó de la lista), se deselecciona.
watch(
  materiasElegibles,
  lista => {
    const id = materiaId.value
    if (id !== null && id !== MATERIA_COMODIN.id && !lista.some(m => m.id === id)) materiaId.value = null
  },
  { immediate: true },
)
const estado = ref<Estado>('inicial')
const fase = ref<Fase>('foco')
const ciclo = ref(1)
const faseTranscurrido = ref(0)
const focoAcumulado = ref(0)
const totalTranscurrido = ref(0)
const inicio = ref<Date | null>(null)
const ultima = ref<Sesion | null>(null)

const menuAbierto = ref(false)
const selectorAbierto = ref(false)
const intervalosAbierto = ref(false)
let iniciarAlElegir = false

const materia = computed(() => (materiaId.value === null ? undefined : store.materia(materiaId.value)))
const enCurso = computed(() => estado.value === 'corriendo' || estado.value === 'pausado')
const duracionFase = computed(
  () => (fase.value === 'foco' ? config.foco : fase.value === 'corto' ? config.corto : config.largo) * 60,
)

let ultimoTick = 0
let intervalo: number | undefined

function tick() {
  const ahora = performance.now()
  const dt = (ahora - ultimoTick) / 1000
  ultimoTick = ahora
  if (estado.value === 'pausado') {
    totalTranscurrido.value += dt
    return
  }
  if (estado.value !== 'corriendo') return

  let avance = dt
  totalTranscurrido.value += avance
  if (modo.value === 'cronometro') {
    focoAcumulado.value += avance
    faseTranscurrido.value += avance
    return
  }
  let faseTerminada: Fase | null = null
  while (avance > 0) {
    const paso = Math.min(avance, duracionFase.value - faseTranscurrido.value)
    faseTranscurrido.value += paso
    if (fase.value === 'foco') focoAcumulado.value += paso
    avance -= paso
    if (faseTranscurrido.value >= duracionFase.value) {
      faseTerminada = fase.value
      avanzarFase()
    }
  }
  if (faseTerminada === 'foco') sonidoFinFoco()
  else if (faseTerminada) sonidoFinDescanso()
}

function avanzarFase() {
  faseTranscurrido.value = 0
  if (fase.value === 'foco') {
    fase.value = ciclo.value % config.ciclos === 0 ? 'largo' : 'corto'
  } else {
    fase.value = 'foco'
    ciclo.value++
  }
}

function reiniciarContadores() {
  fase.value = 'foco'
  ciclo.value = 1
  faseTranscurrido.value = 0
  focoAcumulado.value = 0
  totalTranscurrido.value = 0
}

function detener() {
  window.clearInterval(intervalo)
  intervalo = undefined
}

function iniciar() {
  if (materiaId.value === null) {
    iniciarAlElegir = true
    selectorAbierto.value = true
    return
  }
  habilitarSonido()
  reiniciarContadores()
  ultima.value = null
  inicio.value = new Date()
  estado.value = 'corriendo'
  ultimoTick = performance.now()
  detener()
  intervalo = window.setInterval(tick, 200)
}

function pausar() {
  tick()
  estado.value = 'pausado'
}

function reanudar() {
  tick()
  estado.value = 'corriendo'
}

function saltarDescanso() {
  tick()
  avanzarFase()
}

function finalizar() {
  tick()
  detener()
  const comienzo = inicio.value
  if (!comienzo || materiaId.value === null || focoAcumulado.value < 1) {
    estado.value = 'inicial'
    reiniciarContadores()
    return
  }
  const minutoInicio = comienzo.getHours() * 60 + comienzo.getMinutes() + comienzo.getSeconds() / 60
  const inicioMin = Math.floor(minutoInicio)
  ultima.value = store.agregar({
    materiaId: materiaId.value,
    fecha: clave(comienzo),
    inicio: inicioMin,
    fin: Math.max(inicioMin + 1, Math.round(minutoInicio + totalTranscurrido.value / 60)),
    foco: Math.round(focoAcumulado.value),
    modo: modo.value,
  })
  estado.value = 'finalizado'
}

function nuevaSesion() {
  reiniciarContadores()
  estado.value = 'inicial'
}

function elegirMateria(id: number) {
  materiaId.value = id
  if (iniciarAlElegir) {
    iniciarAlElegir = false
    iniciar()
  }
}

function cambiarModo(nuevo: Modo) {
  modo.value = nuevo
  menuAbierto.value = false
  nuevaSesion()
}

function cerrarMenu(e: FocusEvent) {
  const actual = e.currentTarget as HTMLElement
  if (!actual.contains(e.relatedTarget as Node | null)) menuAbierto.value = false
}

function guardarIntervalos(nueva: ConfigPomodoro) {
  Object.assign(config, nueva)
  if (estado.value === 'finalizado') nuevaSesion()
}

onBeforeUnmount(detener)

function mmss(seg: number) {
  const s = Math.max(0, Math.ceil(seg))
  return s >= 3600 ? hmmss(s) : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

const vista = computed(() => {
  if (estado.value === 'finalizado' && ultima.value) {
    return { tiempo: hmm(ultima.value.foco), etiqueta: 'Sesión guardada', progreso: 1, tono: 'foco' as const, detalle: 'de foco' }
  }
  if (modo.value === 'cronometro') {
    return {
      tiempo: mmss(faseTranscurrido.value),
      etiqueta: estado.value === 'pausado' ? 'En pausa' : 'Cronómetro',
      progreso: (faseTranscurrido.value % 60) / 60,
      tono: 'foco' as const,
      detalle: enCurso.value ? 'sin límite' : undefined,
    }
  }
  const restante = estado.value === 'inicial' ? config.foco * 60 : duracionFase.value - faseTranscurrido.value
  const esFoco = fase.value === 'foco'
  const nombreFase = esFoco ? 'Foco' : fase.value === 'corto' ? 'Descanso corto' : 'Descanso largo'
  return {
    tiempo: mmss(restante),
    etiqueta: estado.value === 'pausado' ? `${nombreFase} · en pausa` : nombreFase,
    progreso: estado.value === 'inicial' ? 0 : faseTranscurrido.value / duracionFase.value,
    tono: esFoco ? ('foco' as const) : ('descanso' as const),
    detalle: esFoco ? `Ciclo ${((ciclo.value - 1) % config.ciclos) + 1} de ${config.ciclos}` : 'No se registra',
  }
})

const hoyTotal = computed(() => {
  const guardado = store.porDia.get(clave(new Date()))?.total ?? 0
  return guardado + (enCurso.value ? focoAcumulado.value : 0)
})

const hoyPorMateria = computed(() => {
  const hoy = clave(new Date())
  const totales = new Map<number, number>()
  for (const s of store.sesiones) {
    if (s.fecha === hoy) totales.set(s.materiaId, (totales.get(s.materiaId) ?? 0) + s.foco)
  }
  if (enCurso.value && materiaId.value !== null) {
    totales.set(materiaId.value, (totales.get(materiaId.value) ?? 0) + focoAcumulado.value)
  }
  return [...totales]
    .filter(([, seg]) => seg >= 60)
    .map(([id, seg]) => ({ id, seg, materia: store.materia(id) }))
    .sort((a, b) => b.seg - a.seg)
})
</script>

<template>
  <section class="timer" :class="{ finalizado: estado === 'finalizado' }" aria-labelledby="timer-title">
    <div class="cabecera">
      <div class="modo" @focusout="cerrarMenu">
        <button
          id="timer-title"
          type="button"
          class="titulo-modo"
          aria-haspopup="listbox"
          :aria-expanded="menuAbierto"
          :disabled="enCurso"
          @click="menuAbierto = !menuAbierto"
        >
          {{ modo === 'pomodoro' ? 'Pomodoro' : 'Cronómetro' }}
          <ChevronDown :size="20" :class="{ girado: menuAbierto }" aria-hidden="true" />
        </button>
        <Transition name="menu">
          <ul v-if="menuAbierto" class="menu" role="listbox" aria-label="Modo del temporizador">
            <li>
              <button type="button" role="option" :aria-selected="modo === 'pomodoro'" @click="cambiarModo('pomodoro')">
                <strong>Pomodoro</strong>
                <span>Foco y descansos por intervalos</span>
              </button>
            </li>
            <li>
              <button type="button" role="option" :aria-selected="modo === 'cronometro'" @click="cambiarModo('cronometro')">
                <strong>Cronómetro</strong>
                <span>Cuenta hacia arriba, sin límite</span>
              </button>
            </li>
          </ul>
        </Transition>
      </div>
      <button
        v-if="modo === 'pomodoro'"
        type="button"
        class="btn btn-icono"
        aria-label="Editar intervalos"
        :disabled="enCurso"
        @click="intervalosAbierto = true"
      >
        <Pencil :size="16" aria-hidden="true" />
      </button>
    </div>
    <p v-if="modo === 'pomodoro'" class="config">
      {{ config.foco }} min de foco · {{ config.corto }} de descanso · {{ config.largo }} de descanso largo cada {{ config.ciclos }}
    </p>
    <p v-else class="config">Iniciá, pausá y finalizá cuando quieras.</p>

    <button type="button" class="selector-materia" :disabled="enCurso" @click="selectorAbierto = true">
      <span class="muestra" :style="{ background: materia?.color ?? 'var(--calor-0)' }" aria-hidden="true" />
      <span class="texto">
        <span class="nombre">{{ materia ? materia.nombre : 'Elegí una materia' }}</span>
        <span class="sub">{{ materia ? (materia.id === MATERIA_COMODIN.id ? 'Sin materia asignada' : `${materia.anio}° año`) : 'Necesaria para iniciar' }}</span>
      </span>
      <ChevronDown :size="18" aria-hidden="true" />
    </button>

    <RelojCircular
      :progreso="vista.progreso"
      :tiempo="vista.tiempo"
      :etiqueta="vista.etiqueta"
      :tono="vista.tono"
      :detalle="vista.detalle"
    />

    <p class="foco-registrado num" :class="{ visible: enCurso }" aria-live="off">
      Foco registrado: {{ hmmss(focoAcumulado) }}
    </p>

    <div v-if="estado !== 'finalizado'" class="controles">
      <button v-if="estado === 'inicial'" type="button" class="btn btn-primario btn-grande" @click="iniciar">
        <Play :size="18" aria-hidden="true" /> Iniciar
      </button>
      <template v-else>
        <button v-if="estado === 'corriendo'" type="button" class="btn btn-grande" @click="pausar">
          <Pause :size="18" aria-hidden="true" /> Pausar
        </button>
        <button v-else type="button" class="btn btn-grande" @click="reanudar">
          <Play :size="18" aria-hidden="true" /> Reanudar
        </button>
        <button type="button" class="btn btn-primario btn-grande" @click="finalizar">
          <Square :size="16" aria-hidden="true" /> Finalizar
        </button>
        <button v-if="modo === 'pomodoro' && fase !== 'foco'" type="button" class="btn btn-grande" @click="saltarDescanso">
          <SkipForward :size="18" aria-hidden="true" /> Saltar descanso
        </button>
      </template>
    </div>

    <div v-else-if="ultima" class="tarjeta guardada" role="status">
      <span class="check" aria-hidden="true"><Check :size="18" /></span>
      <div class="resumen">
        <p class="titulo">{{ store.materia(ultima.materiaId)?.nombre }}</p>
        <p class="detalle num">
          {{ reloj(ultima.inicio) }}–{{ reloj(ultima.fin) }} · {{ horasMinutos(ultima.foco) }} de foco
        </p>
      </div>
      <div class="acciones">
        <button type="button" class="btn" @click="nuevaSesion">Nueva sesión</button>
        <button type="button" class="btn btn-primario" @click="navegar('stats')">Ver estadísticas</button>
      </div>
    </div>

    <div class="pie">
      <span class="hoy num">Hoy: <strong>{{ hmm(hoyTotal) }}</strong> de foco</span>
    </div>

    <ul v-if="hoyPorMateria.length" class="hoy-materias" aria-label="Foco de hoy por materia">
      <li v-for="m in hoyPorMateria" :key="m.id" :title="m.materia?.nombre">
        <ChipMateria :materia="m.materia" aria-hidden="true" />
        <span class="sr-only">{{ m.materia?.nombre ?? 'Materia' }}: </span>
        <span class="num">{{ hmm(m.seg) }}</span>
      </li>
    </ul>

    <SelectorMateria
      v-model:abierto="selectorAbierto"
      :materias="materiasElegibles"
      :destacada="MATERIA_COMODIN"
      :seleccion="materiaId"
      @elegir="elegirMateria"
    />
    <EditorIntervalos v-model:abierto="intervalosAbierto" :config="config" @guardar="guardarIntervalos" />
  </section>
</template>

<style scoped>
.timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  gap: 0.75rem;
  max-width: 440px;
  width: 100%;
  margin: 0 auto;
  padding-top: 0.25rem;
}

@media (max-height: 700px) {
  .timer {
    gap: 0.4rem;
    padding-top: 0;
  }
}

/* Con la sesión guardada, la tarjeta ya muestra el resumen: el reloj se achica. */
.timer.finalizado :deep(.reloj) {
  width: min(60vw, 220px, 21dvh);
}

/* Pantallas bajas: se compacta todo para que la pestaña no necesite scroll. */
@media (max-height: 900px) {
  .timer {
    gap: 0.5rem;
  }

  /* La tarjeta de sesión guardada suma filas; se compacta para no empujar la pantalla. */
  .guardada {
    padding: 0.6rem 0.75rem;
    gap: 0.5rem;
  }

  .acciones .btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.82rem;
  }

  /* La configuración se edita con el lápiz; en pantallas bajas no ocupa lugar. */
  .config {
    display: none;
  }

  .selector-materia {
    padding: 0.5rem 0.75rem;
  }

  .controles .btn-grande {
    padding: 0.55rem 1.1rem;
    font-size: 0.95rem;
  }

  .pie {
    padding-top: 0.5rem;
  }

  .hoy-materias {
    display: none;
  }
}

.cabecera {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modo {
  position: relative;
}

.titulo-modo {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-h);
  font: inherit;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
}

.titulo-modo:hover:not(:disabled) {
  background: var(--surface);
}

.titulo-modo:disabled {
  cursor: default;
}

.titulo-modo:disabled svg {
  opacity: 0.3;
}

.titulo-modo svg {
  transition: transform 0.2s ease;
}

.titulo-modo svg.girado {
  transform: rotate(180deg);
}

.titulo-modo:focus-visible {
  outline: 2px solid var(--accent);
}

.menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 50%;
  z-index: 10;
  width: 15rem;
  margin: 0;
  padding: 0.35rem;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg);
  box-shadow: var(--shadow);
  transform: translateX(-50%);
}

.menu button {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.menu button:hover,
.menu button[aria-selected='true'] {
  background: var(--surface);
}

.menu strong {
  font-size: 0.95rem;
  color: var(--text-h);
}

.menu span {
  font-size: 0.8rem;
  color: var(--text);
}

.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translate(-50%, -4px);
}

.config {
  margin: -0.75rem 0 0;
  font-size: 0.85rem;
  text-align: center;
  text-wrap: balance;
}

.selector-materia {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.selector-materia:hover:not(:disabled) {
  border-color: var(--text-h);
}

.selector-materia:disabled {
  cursor: default;
  background: var(--surface);
}

.selector-materia:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.selector-materia .muestra {
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 7px;
}

.selector-materia .texto {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.selector-materia .nombre {
  font-size: 0.95rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selector-materia .sub {
  font-size: 0.78rem;
  color: var(--text);
}

.foco-registrado {
  margin: -0.25rem 0 0;
  font-size: 0.85rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.foco-registrado.visible {
  opacity: 1;
}

.controles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
}

.guardada {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  animation: aparecer 0.25s ease-out;
}

@keyframes aparecer {
  from { opacity: 0; transform: translateY(6px); }
}

.check {
  display: grid;
  place-items: center;
  flex: none;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
}

.resumen {
  flex: 1;
  min-width: 10rem;
}

.resumen p {
  margin: 0;
}

.resumen .titulo {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-h);
}

.resumen .detalle {
  font-size: 0.85rem;
}

.acciones {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

.acciones .btn {
  flex: 1;
}

.pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
  font-size: 0.85rem;
}

.hoy strong {
  color: var(--text-h);
}

.hoy-materias {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4rem 0.9rem;
  width: 100%;
  margin: -0.5rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
}

.hoy-materias li {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}


.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
