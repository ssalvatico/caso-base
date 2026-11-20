<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, Plus, Pencil, Trash2 } from 'lucide-vue-next'
import {
  CONDICIONES_ELEGIBLES,
  useMateriasStore,
  type CondicionElegible,
  type Materia,
  type MotivoBloqueo,
} from '../../stores/materias.ts'
import { useCarrerasStore } from '../../stores/carreras.ts'
import { agruparPorAnio, tituloAnio, etiquetaTerm } from '../../utils/agrupar'
import Colapsable from '../Colapsable.vue'
import ModalAgregarMateria from '../ModalAgregarMateria.vue'
import ModalEditarMateria from '../ModalEditarMateria.vue'
import { eliminarMateria } from '../../lib/materiasEscritura'
import { uuidPorIdNumerico } from '../../lib/materiasDb'

const store = useMateriasStore()
const carrerasStore = useCarrerasStore()
const modalAgregar = ref<InstanceType<typeof ModalAgregarMateria> | null>(null)
const modalEditar = ref<InstanceType<typeof ModalEditarMateria> | null>(null)

onMounted(async () => {
  await carrerasStore.cargar()
  await store.cargarDisponibles()
})

async function onMateriaCreada() {
  await store.cargarDisponibles()
}

async function onMateriaActualizada() {
  await store.cargarDisponibles()
}

// ── Selector de carrera ────────────────────────────────────────────────────────
const selectorAbierto = ref(false)

async function seleccionarCarrera(id: string) {
  selectorAbierto.value = false
  if (id === carrerasStore.activaId) return
  carrerasStore.activar(id)
  await store.cargarDisponibles()
}

// ── Modal agregar carrera ──────────────────────────────────────────────────────
const dialogAgregar = ref<HTMLDialogElement | null>(null)
const nuevaNombre = ref('')
const nuevaSigla = ref('')
const guardandoCarrera = ref(false)
const errorCarrera = ref<string | null>(null)

function abrirAgregarCarrera() {
  selectorAbierto.value = false
  nuevaNombre.value = ''
  nuevaSigla.value = ''
  errorCarrera.value = null
  dialogAgregar.value?.showModal()
}

async function confirmarAgregarCarrera() {
  if (!nuevaNombre.value.trim()) { errorCarrera.value = 'El nombre es obligatorio.'; return }
  if (!nuevaSigla.value.trim()) { errorCarrera.value = 'La sigla es obligatoria.'; return }
  guardandoCarrera.value = true
  errorCarrera.value = null
  try {
    await carrerasStore.crear(nuevaNombre.value, nuevaSigla.value)
    await store.cargarDisponibles()
    dialogAgregar.value?.close()
  } catch (e) {
    errorCarrera.value = e instanceof Error ? e.message : 'Error al crear la carrera'
  } finally {
    guardandoCarrera.value = false
  }
}

// ── Modal eliminar carrera ─────────────────────────────────────────────────────
const dialogEliminar = ref<HTMLDialogElement | null>(null)
const eliminandoCarrera = ref(false)
const errorEliminar = ref<string | null>(null)

function abrirEliminarCarrera() {
  errorEliminar.value = null
  dialogEliminar.value?.showModal()
}

async function confirmarEliminarCarrera() {
  if (!carrerasStore.activa) return
  eliminandoCarrera.value = true
  errorEliminar.value = null
  try {
    await carrerasStore.eliminar(carrerasStore.activa.id)
    await store.cargarDisponibles()
    dialogEliminar.value?.close()
  } catch (e) {
    errorEliminar.value = e instanceof Error ? e.message : 'Error al eliminar la carrera'
  } finally {
    eliminandoCarrera.value = false
  }
}

// ── Eliminar materia ───────────────────────────────────────────────────────────
const dialogEliminarMateria = ref<HTMLDialogElement | null>(null)
const materiaAEliminar = ref<Materia | null>(null)
const eliminandoMateria = ref(false)
const errorEliminarMateria = ref<string | null>(null)

function pedirEliminarMateria(materia: Materia) {
  materiaAEliminar.value = materia
  errorEliminarMateria.value = null
  dialogEliminarMateria.value?.showModal()
}

async function confirmarEliminarMateria() {
  const materia = materiaAEliminar.value
  if (!materia) return
  const uuid = uuidPorIdNumerico.get(materia.id)
  if (!uuid) {
    errorEliminarMateria.value = 'No se encontró el uuid de la materia.'
    return
  }
  eliminandoMateria.value = true
  errorEliminarMateria.value = null
  try {
    await eliminarMateria(uuid)
    store.seleccionadas = store.seleccionadas.filter(s => s.id !== materia.id)
    await store.cargarDisponibles()
    dialogEliminarMateria.value?.close()
  } catch (e) {
    errorEliminarMateria.value = e instanceof Error ? e.message : 'Error al eliminar la materia'
  } finally {
    eliminandoMateria.value = false
  }
}

// ── Lista de materias ──────────────────────────────────────────────────────────
function estaSeleccionada(materia: Materia) {
  return store.seleccionadas.some(s => s.id === materia.id)
}

function estaAprobada(materia: Materia) {
  return store.condicionDe(materia.id) === 'aprobada'
}

function cambiarCondicion(materia: Materia, event: Event) {
  store.setCondicion(materia.id, (event.target as HTMLSelectElement).value as CondicionElegible)
}

function textoBloqueo(motivo: MotivoBloqueo | null) {
  return motivo === 'libre' ? 'Una correlativa está en Libre' : 'Faltan correlativas al menos Regulares'
}

function todasAprobadas(materias: Materia[]) {
  return materias.length > 0 && materias.every(estaAprobada)
}

const materiasPorAnio = computed(() =>
  agruparPorAnio(store.disponibles).map(grupo => ({
    anio: grupo.anio,
    materias: grupo.materias,
    seleccionadas: grupo.materias.filter(estaSeleccionada).length,
    superado: todasAprobadas(grupo.materias),
  })),
)

function contadorTexto(cantidad: number) {
  return `${cantidad} ${cantidad === 1 ? 'seleccionada' : 'seleccionadas'}`
}
</script>

<template>
  <section class="subjects">

    <!-- Selector de carrera -->
    <div class="carrera-selector-wrap">
      <button
        type="button"
        class="carrera-selector"
        :aria-expanded="selectorAbierto"
        @click="selectorAbierto = !selectorAbierto"
      >
        <span class="carrera-nombre">{{ carrerasStore.activa?.nombre ?? 'Sin carrera' }}</span>
        <ChevronDown :size="18" :class="{ rotado: selectorAbierto }" aria-hidden="true" />
      </button>

      <div v-if="selectorAbierto" class="carrera-menu">
        <button
          v-for="c in carrerasStore.lista"
          :key="c.id"
          type="button"
          class="carrera-opcion"
          :class="{ activa: c.id === carrerasStore.activaId }"
          @click="seleccionarCarrera(c.id)"
        >
          <span class="carrera-opcion-nombre">{{ c.nombre }}</span>
          <span class="carrera-opcion-sigla">{{ c.sigla }}</span>
        </button>
        <button type="button" class="carrera-opcion nueva" @click="abrirAgregarCarrera">
          <Plus :size="14" aria-hidden="true" />
          Agregar carrera
        </button>
      </div>
    </div>

    <div class="materias-header">
      <span class="contador">{{ contadorTexto(store.seleccionadas.length) }}</span>
    </div>

    <p v-if="store.cargando" class="estado">Cargando materias...</p>
    <p v-else-if="store.error" class="estado estado-error">{{ store.error }}</p>
    <p v-else-if="!store.disponibles.length && carrerasStore.activa" class="estado">
      Esta carrera no tiene materias todavía.
    </p>
    <p v-else-if="!carrerasStore.activa" class="estado">
      No tenés ninguna carrera. Creá una con "+ Agregar carrera".
    </p>

    <div class="anios">
      <Colapsable
        v-for="grupo in materiasPorAnio"
        :key="String(grupo.anio)"
        :titulo="tituloAnio(grupo.anio)"
        :badge="contadorTexto(grupo.materias.filter(m => estaSeleccionada(m)).length)"
        :superado="grupo.materias.every(m => estaAprobada(m))"
        variante="anio"
      >
        <ul class="lista">
          <li v-for="m in grupo.materias" :key="m.id">
            <div
              class="materia"
              :class="{
                activa: estaSeleccionada(m),
                bloqueada: !store.esSeleccionable(m.id),
                aprobada: estaAprobada(m),
              }"
            >
              <label class="materia-seleccion">
                <input
                  type="checkbox"
                  :checked="estaSeleccionada(m)"
                  :disabled="!store.esSeleccionable(m.id)"
                  @change="store.toggleMateria(m)"
                />
                <span class="materia-info">
                  <span class="materia-nombre">{{ m.name }}</span>
                  <span class="materia-tags">
                    <code v-if="m.code" class="materia-codigo">{{ m.code }}</code>
                    <span class="tag-term">{{ etiquetaTerm(m) }}</span>
                  </span>
                </span>
              </label>
              <div class="materia-acciones">
                <div class="materia-condicion">
                  <label :for="`condicion-${m.id}`" class="sr-only">Condición en {{ m.name }}</label>
                  <select
                    :id="`condicion-${m.id}`"
                    class="selector"
                    :data-condicion="store.condicionDe(m.id)"
                    :value="store.condicionDe(m.id)"
                    :disabled="!!store.motivoBloqueo(m.id)"
                    :aria-describedby="store.motivoBloqueo(m.id) ? `bloqueo-${m.id}` : undefined"
                    @change="cambiarCondicion(m, $event)"
                  >
                    <option v-if="store.motivoBloqueo(m.id)" value="no_cursable" disabled>No cursable</option>
                    <option v-for="c in CONDICIONES_ELEGIBLES" :key="c.valor" :value="c.valor">{{ c.etiqueta }}</option>
                  </select>
                  <small v-if="store.motivoBloqueo(m.id)" :id="`bloqueo-${m.id}`" class="bloqueo">
                    {{ textoBloqueo(store.motivoBloqueo(m.id)) }}
                  </small>
                </div>
                <button
                  type="button"
                  class="btn-editar"
                  :aria-label="`Editar ${m.name}`"
                  @click.stop="modalEditar?.abrir(m)"
                >
                  <Pencil :size="14" />
                </button>
                <button
                  type="button"
                  class="btn-eliminar"
                  :aria-label="`Eliminar ${m.name}`"
                  @click.stop="pedirEliminarMateria(m)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </li>
        </ul>
      </Colapsable>
    </div>

    <!-- Acciones del pie -->
    <div class="acciones-pie">
      <button
        type="button"
        class="accion-pie"
        :disabled="!carrerasStore.activa"
        :class="{ deshabilitada: !carrerasStore.activa }"
        @click="modalAgregar?.abrir()"
      >
        Agregar materia
      </button>
      <button
        v-if="carrerasStore.activa"
        type="button"
        class="accion-pie accion-peligro"
        @click="abrirEliminarCarrera"
      >
        Eliminar carrera
      </button>
    </div>
  </section>

  <!-- Modal: agregar carrera -->
  <dialog ref="dialogAgregar" class="modal" @click.self="dialogAgregar?.close()">
    <div class="modal-contenido">
      <h3 class="modal-titulo">Nueva carrera</h3>

      <div class="campo">
        <label for="nueva-nombre">Nombre</label>
        <input
          id="nueva-nombre"
          v-model="nuevaNombre"
          type="text"
          placeholder="Ej: Licenciatura en Ciencias de la Computación"
          class="input"
          autocomplete="off"
          @keydown.enter="confirmarAgregarCarrera"
        />
      </div>
      <div class="campo">
        <label for="nueva-sigla">Sigla</label>
        <input
          id="nueva-sigla"
          v-model="nuevaSigla"
          type="text"
          placeholder="Ej: LCC"
          class="input input-chico"
          autocomplete="off"
          maxlength="10"
          @keydown.enter="confirmarAgregarCarrera"
        />
      </div>

      <p v-if="errorCarrera" class="modal-error">{{ errorCarrera }}</p>

      <div class="modal-acciones">
        <button type="button" class="btn-secundario" @click="dialogAgregar?.close()">Cancelar</button>
        <button type="button" class="btn-primario" :disabled="guardandoCarrera" @click="confirmarAgregarCarrera">
          {{ guardandoCarrera ? 'Creando…' : 'Crear' }}
        </button>
      </div>
    </div>
  </dialog>

  <!-- Modal: agregar materia -->
  <ModalAgregarMateria ref="modalAgregar" @creada="onMateriaCreada" />

  <!-- Modal: editar materia -->
  <ModalEditarMateria ref="modalEditar" @actualizada="onMateriaActualizada" />

  <!-- Modal: eliminar materia -->
  <dialog ref="dialogEliminarMateria" class="modal" @click.self="dialogEliminarMateria?.close()">
    <div class="modal-contenido">
      <h3 class="modal-titulo">Eliminar materia</h3>
      <p class="modal-texto">
        ¿Eliminar <strong>{{ materiaAEliminar?.name }}</strong>? Se borrarán sus horarios, exámenes y sesiones de estudio.
        Esta acción no se puede deshacer.
      </p>

      <p v-if="errorEliminarMateria" class="modal-error">{{ errorEliminarMateria }}</p>

      <div class="modal-acciones">
        <button type="button" class="btn-secundario" @click="dialogEliminarMateria?.close()">Cancelar</button>
        <button type="button" class="btn-peligro" :disabled="eliminandoMateria" @click="confirmarEliminarMateria">
          {{ eliminandoMateria ? 'Eliminando…' : 'Eliminar' }}
        </button>
      </div>
    </div>
  </dialog>

  <!-- Modal: eliminar carrera -->
  <dialog ref="dialogEliminar" class="modal" @click.self="dialogEliminar?.close()">
    <div class="modal-contenido">
      <h3 class="modal-titulo">Eliminar carrera</h3>
      <p class="modal-texto">
        ¿Eliminar <strong>{{ carrerasStore.activa?.nombre }}</strong>? Se borrarán todas sus materias, horarios y correlativas.
        Esta acción no se puede deshacer.
      </p>

      <p v-if="errorEliminar" class="modal-error">{{ errorEliminar }}</p>

      <div class="modal-acciones">
        <button type="button" class="btn-secundario" @click="dialogEliminar?.close()">Cancelar</button>
        <button type="button" class="btn-peligro" :disabled="eliminandoCarrera" @click="confirmarEliminarCarrera">
          {{ eliminandoCarrera ? 'Eliminando…' : 'Eliminar' }}
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.subjects {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Selector de carrera ── */
.carrera-selector-wrap {
  position: relative;
}

.carrera-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-h);
  font: inherit;
  font-size: 1.3rem;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.carrera-selector svg {
  flex-shrink: 0;
  transition: transform 0.2s;
}

.carrera-selector svg.rotado {
  transform: rotate(180deg);
}

.carrera-nombre {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.carrera-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radio-tarjeta);
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.carrera-opcion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: var(--radio-control);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
}

.carrera-opcion:hover {
  background: var(--accent-bg);
}

.carrera-opcion.activa {
  background: var(--accent-bg);
  color: var(--accent-text);
  font-weight: 600;
}

.carrera-opcion.nueva {
  display: flex;
  gap: 0.4rem;
  color: var(--accent-text);
  border-top: 1px solid var(--border);
  margin-top: 0.125rem;
  padding-top: 0.625rem;
}

.carrera-opcion-sigla {
  font-size: 0.8rem;
  color: var(--text);
  opacity: 0.6;
}

/* ── Header materias ── */
.materias-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.contador {
  font-size: 14px;
  color: var(--accent-text);
}

/* ── Estado ── */
.estado {
  margin: 0;
  font-size: 14px;
}

.estado-error {
  color: #e5484d;
}

/* ── Lista de años ── */
.anios {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* ── Materia ── */
.materia {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radio-tarjeta);
  transition: border-color 0.2s, background-color 0.2s;
}

.materia-seleccion {
  display: flex;
  flex: 1 1 14rem;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  cursor: pointer;
}

.materia-codigo {
  align-self: flex-start;
  font-size: 13px;
  padding: 2px 6px;
}

.materia-tags {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.tag-term {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--accent-bg);
  color: var(--accent);
  line-height: 1.4;
}

.materia-acciones {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}

.materia-condicion {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.btn-editar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  padding: 0;
  border: 1.5px solid var(--trazo);
  border-radius: var(--radio-control);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s, border-color 0.15s;
}

.btn-editar:hover {
  opacity: 1;
  border-color: var(--accent-border);
  color: var(--accent-text);
}

.btn-eliminar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  padding: 0;
  border: 1.5px solid var(--trazo);
  border-radius: var(--radio-control);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s, border-color 0.15s, color 0.15s;
}

.btn-eliminar:hover {
  opacity: 1;
  border-color: var(--peligro);
  color: var(--peligro);
}

.selector {
  padding: 4px 8px;
  border: 1.5px solid var(--trazo);
  border-radius: var(--radio-control);
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.selector[data-condicion='regular'],
.selector[data-condicion='libre'] {
  border-color: var(--accent-border);
  color: var(--accent-text);
}

.selector:disabled {
  cursor: not-allowed;
}

.selector:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.bloqueo {
  font-size: 12px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.materia:hover {
  border-color: var(--accent-border);
}

.materia.activa {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.materia input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
  flex-shrink: 0;
}

.materia-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.materia-nombre {
  color: var(--text-h);
  font-weight: 500;
  font-size: 16px;
}

.materia.bloqueada .materia-seleccion {
  cursor: not-allowed;
  opacity: 0.6;
}

.materia.bloqueada:hover {
  border-color: var(--border);
}

.materia:has(input:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.materia.aprobada .materia-nombre {
  color: var(--text);
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}

/* ── Acciones del pie ── */
.acciones-pie {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0 0.25rem;
  border-top: 1px solid var(--border);
  gap: 0.5rem;
}

.accion-pie {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1rem;
  border-radius: var(--radio-control);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  border: 1px solid var(--accent);
  background: var(--accent-bg);
  color: var(--accent-text, var(--accent));
}

.accion-pie:hover {
  background: var(--accent);
  color: var(--bg);
}

.accion-pie.deshabilitada {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.accion-pie.accion-peligro {
  border-color: #e5484d;
  background: transparent;
  color: #e5484d;
}

.accion-pie.accion-peligro:hover {
  background: #e5484d;
  color: #fff;
}

/* ── Modal ── */
.modal {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg);
  color: var(--text);
  padding: 0;
  max-width: min(90vw, 420px);
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.modal::backdrop {
  background: rgba(0, 0, 0, 0.4);
}

.modal-contenido {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

.modal-titulo {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-h);
}

.modal-texto {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.modal-error {
  margin: 0;
  font-size: 0.85rem;
  color: #e5484d;
}

.modal-acciones {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.campo label {
  font-size: 0.85rem;
  color: var(--text);
}

.input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radio-control);
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  font-size: 0.95rem;
}

.input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.input-chico {
  max-width: 120px;
}

.btn-primario {
  padding: 0.4rem 1.1rem;
  border: none;
  border-radius: var(--radio-control);
  background: var(--text-h);
  color: var(--bg);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-primario:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
