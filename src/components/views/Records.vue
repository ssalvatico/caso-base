<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { ArrowLeft, ListChecks, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { useEstudioStore, type DatosSesion } from '../../stores/estudio'
import { capitalizar, clave, fechaLarga, hmm, horasMinutos, MODOS, reloj, sumarDias, type Sesion } from '../../utils/estudio'
import EditorRegistro from '../estudio/EditorRegistro.vue'
import Modal from '../estudio/Modal.vue'

const store = useEstudioStore()
const navegar = inject<(tab: string) => void>('navegar', () => {})

const DIAS_POR_PAGINA = 10
const diasVisibles = ref(DIAS_POR_PAGINA)
const editorAbierto = ref(false)
const editando = ref<Sesion | null>(null)
const aEliminar = ref<Sesion | null>(null)
const confirmarAbierto = ref(false)
const confirmarVaciar = ref(false)

const hoy = clave(new Date())
const ayer = clave(sumarDias(new Date(), -1))

const grupos = computed(() => {
  const mapa = new Map<string, Sesion[]>()
  for (const s of store.ordenadas) {
    const lista = mapa.get(s.fecha)
    if (lista) lista.push(s)
    else mapa.set(s.fecha, [s])
  }
  return [...mapa.entries()].map(([fecha, sesiones]) => ({
    fecha,
    sesiones,
    total: sesiones.reduce((a, s) => a + s.foco, 0),
  }))
})
const visibles = computed(() => grupos.value.slice(0, diasVisibles.value))

function tituloDia(fecha: string) {
  if (fecha === hoy) return 'Hoy'
  if (fecha === ayer) return 'Ayer'
  return capitalizar(fechaLarga(fecha))
}

watch(
  () => store.edicionPendiente,
  id => {
    if (id === null) return
    store.edicionPendiente = null
    const sesion = store.sesiones.find(s => s.id === id)
    if (!sesion) return
    const indiceDia = grupos.value.findIndex(g => g.fecha === sesion.fecha)
    if (indiceDia >= diasVisibles.value) {
      diasVisibles.value = Math.ceil((indiceDia + 1) / DIAS_POR_PAGINA) * DIAS_POR_PAGINA
    }
    store.resaltada = id
    editar(sesion)
  },
  { immediate: true },
)

function nueva() {
  editando.value = null
  editorAbierto.value = true
}

function editar(s: Sesion) {
  editando.value = s
  editorAbierto.value = true
}

function guardar(datos: DatosSesion) {
  if (editando.value) store.actualizar(editando.value.id, datos)
  else store.agregar(datos)
}

function pedirEliminar(s: Sesion) {
  aEliminar.value = s
  confirmarAbierto.value = true
}

function eliminar() {
  if (aEliminar.value) store.eliminar(aEliminar.value.id)
  confirmarAbierto.value = false
}

function vaciar() {
  store.vaciar()
  confirmarVaciar.value = false
}
</script>

<template>
  <section class="registros" aria-labelledby="registros-title">
    <header class="cabecera">
      <button type="button" class="btn btn-icono btn-fantasma" aria-label="Volver a Estadísticas" @click="navegar('stats')">
        <ArrowLeft :size="20" aria-hidden="true" />
      </button>
      <div class="titulos">
        <h2 id="registros-title">Registros</h2>
        <p class="num">{{ store.sesiones.length }} sesiones</p>
      </div>
      <button type="button" class="btn btn-primario" @click="nueva">
        <Plus :size="16" aria-hidden="true" /> Nueva sesión
      </button>
    </header>

    <div v-if="store.sesiones.length === 0" class="tarjeta vacio">
      <span class="icono" aria-hidden="true"><ListChecks :size="28" /></span>
      <h3>No hay registros</h3>
      <p>Las sesiones que finalices en el Pomodoro aparecen acá. También podés cargar una a mano.</p>
      <div class="acciones">
        <button type="button" class="btn btn-primario" @click="nueva">
          <Plus :size="16" aria-hidden="true" /> Agregar sesión manual
        </button>
      </div>
    </div>

    <template v-else>
      <TransitionGroup tag="div" name="lista" class="grupos">
        <section v-for="g in visibles" :key="g.fecha" class="tarjeta grupo" :aria-label="tituloDia(g.fecha)">
          <header class="grupo-cabecera">
            <h3>{{ tituloDia(g.fecha) }}</h3>
            <span class="num">{{ horasMinutos(g.total) }}</span>
          </header>
          <TransitionGroup tag="ul" name="lista" class="sesiones">
            <li v-for="s in g.sesiones" :key="s.id" class="sesion" :class="{ resaltada: store.resaltada === s.id }">
              <span class="color" :style="{ background: store.materia(s.materiaId)?.color }" aria-hidden="true" />
              <div class="info">
                <p class="materia">{{ store.materia(s.materiaId)?.nombre ?? 'Materia eliminada' }}</p>
                <p class="meta">
                  <span class="num">{{ reloj(s.inicio) }}–{{ reloj(s.fin) }}</span>
                  <span aria-hidden="true">·</span>
                  <span>{{ MODOS[s.modo] }}</span>
                </p>
              </div>
              <strong class="duracion num">{{ hmm(s.foco) }}</strong>
              <div class="botones">
                <button type="button" class="btn btn-icono btn-fantasma" :aria-label="`Editar sesión de ${reloj(s.inicio)}`" @click="editar(s)">
                  <Pencil :size="16" aria-hidden="true" />
                </button>
                <button type="button" class="btn btn-icono btn-fantasma borrar" :aria-label="`Eliminar sesión de ${reloj(s.inicio)}`" @click="pedirEliminar(s)">
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
              </div>
            </li>
          </TransitionGroup>
        </section>
      </TransitionGroup>

      <div class="pie">
        <button v-if="diasVisibles < grupos.length" type="button" class="btn" @click="diasVisibles += DIAS_POR_PAGINA">
          Mostrar más días
        </button>
        <button type="button" class="btn btn-fantasma vaciar" @click="confirmarVaciar = true">
          <Trash2 :size="16" aria-hidden="true" /> Vaciar todo
        </button>
      </div>
    </template>

    <EditorRegistro v-model:abierto="editorAbierto" :sesion="editando" :materias="store.materiasDeCarrera" @guardar="guardar" />

    <Modal
      v-model:abierto="confirmarAbierto"
      titulo="¿Eliminar esta sesión?"
      :descripcion="aEliminar ? `${store.materia(aEliminar.materiaId)?.nombre} · ${capitalizar(fechaLarga(aEliminar.fecha))}, ${reloj(aEliminar.inicio)}–${reloj(aEliminar.fin)} (${horasMinutos(aEliminar.foco)}). Las estadísticas se actualizan al instante.` : undefined"
    >
      <template #acciones>
        <button type="button" class="btn" @click="confirmarAbierto = false">Cancelar</button>
        <button type="button" class="btn btn-peligro" @click="eliminar">Eliminar</button>
      </template>
    </Modal>

    <Modal
      v-model:abierto="confirmarVaciar"
      titulo="¿Vaciar todos los registros?"
      descripcion="Se borran todas las sesiones guardadas en este dispositivo. Esta acción no se puede deshacer."
    >
      <template #acciones>
        <button type="button" class="btn" @click="confirmarVaciar = false">Cancelar</button>
        <button type="button" class="btn btn-peligro" @click="vaciar">Vaciar</button>
      </template>
    </Modal>
  </section>
</template>

<style scoped>
.registros {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-sizing: border-box;
  width: 100%;
  max-width: 760px;
  min-width: 0;
  margin: 0 auto;
}

.cabecera {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.titulos {
  flex: 1;
  min-width: 0;
}

.titulos h2 {
  margin: 0;
  font-size: 1.6rem;
  color: var(--text-h);
}

.titulos p {
  margin: 0;
  font-size: 0.8rem;
}

.grupos {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;
}

.grupo {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 0.75rem 1rem;
}

.grupo-cabecera {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.4rem;
  font-size: 0.85rem;
}

.grupo-cabecera h3 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-h);
}

.sesiones {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sesion {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 0.55rem 0.5rem;
  margin: 0;
  border-top: 1px solid var(--border);
  border-radius: 10px;
  transition: background-color 0.6s ease;
}

.sesion.resaltada {
  animation: resaltar 1.8s ease-out;
}

@keyframes resaltar {
  from { background: var(--calor-2); }
  to { background: transparent; }
}

.color {
  flex: none;
  align-self: stretch;
  width: 0.35rem;
  border-radius: 3px;
}

.info {
  flex: 1 1 0;
  min-width: 0;
  max-width: 100%;
}

.info p {
  margin: 0;
}

.materia {
  overflow: hidden;
  font-size: 0.925rem;
  font-weight: 600;
  color: var(--text-h);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
  font-size: 0.8rem;
}

.duracion {
  flex: none;
  font-size: 0.95rem;
  color: var(--text-h);
}

.botones {
  display: flex;
  flex: none;
  gap: 0.15rem;
}

.borrar:hover {
  color: var(--peligro);
}

.pie {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
}

.vaciar {
  margin-left: auto;
  color: var(--text);
}

.vacio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1.5rem;
  text-align: center;
}

.vacio .icono {
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--calor-1);
  color: var(--accent-text);
}

.vacio h3 {
  margin: 0.5rem 0 0;
  color: var(--text-h);
}

.vacio p {
  max-width: 26rem;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.vacio .acciones {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.lista-enter-active,
.lista-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.lista-enter-from,
.lista-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
