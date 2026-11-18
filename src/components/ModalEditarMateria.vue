<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Trash2 } from 'lucide-vue-next'
import { useMateriasStore, type Materia, type MateriaOverview } from '../stores/materias'
import { editarMateria, eliminarMateria } from '../lib/materiasEscritura'
import { uuidPorIdNumerico } from '../lib/materiasDb'

const emit = defineEmits<{
  (e: 'actualizada'): void
  (e: 'eliminada'): void
}>()

const store = useMateriasStore()
const dialog = ref<HTMLDialogElement | null>(null)

// Materia que se está editando
const materia = ref<Materia | null>(null)
const uuid = ref<string | null>(null)   // uuid de la materia en Supabase

// Campos editables
const nombre = ref('')
const anio = ref<number>(1)
const anual = ref(false)
const cuatrimestre = ref<number>(1)
const dependencias = ref<number[]>([])

// Nueva comisión
const agregarComision = ref(false)
const dia = ref<number>(1)
const inicio = ref('08:00')
const fin = ref('10:00')

const guardando = ref(false)
const eliminando = ref(false)
const confirmandoEliminar = ref(false)
const error = ref<string | null>(null)

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const overview = computed<MateriaOverview | null>(() =>
  materia.value ? (store.overviews[materia.value.id] ?? null) : null
)

const materiasElegibles = computed<Materia[]>(() =>
  materia.value ? store.disponibles.filter(m => m.id !== materia.value!.id) : []
)

function toggleDependencia(id: number) {
  const idx = dependencias.value.indexOf(id)
  if (idx >= 0) dependencias.value.splice(idx, 1)
  else dependencias.value.push(id)
}

function abrir(m: Materia) {
  materia.value = m
  uuid.value = uuidPorIdNumerico.get(m.id) ?? null
  nombre.value = m.name
  anio.value = m.year ?? 1
  anual.value = m.anual
  cuatrimestre.value = m.term ?? 1
  // Dependencias actuales desde overview
  const ov = store.overviews[m.id]
  dependencias.value = ov?.prerequisites.map(p => p.id) ?? []
  agregarComision.value = false
  dia.value = 1
  inicio.value = '08:00'
  fin.value = '10:00'
  confirmandoEliminar.value = false
  error.value = null
  dialog.value?.showModal()
}

function cerrar() {
  dialog.value?.close()
}

async function guardar() {
  if (!uuid.value) { error.value = 'No se encontró el uuid de la materia.'; return }
  if (!nombre.value.trim()) { error.value = 'El nombre es obligatorio.'; return }
  if (!Number.isInteger(anio.value) || anio.value < 1) {
    error.value = 'El año debe ser un número entero mayor a 0.'
    return
  }
  if (agregarComision.value && fin.value <= inicio.value) {
    error.value = 'El horario de fin debe ser posterior al de inicio.'
    return
  }

  const dependeDeIds: string[] = []
  for (const id of dependencias.value) {
    const depUuid = uuidPorIdNumerico.get(id)
    if (!depUuid) { error.value = `No se encontró el uuid de una materia (id ${id}).`; return }
    dependeDeIds.push(depUuid)
  }

  guardando.value = true
  error.value = null
  try {
    await editarMateria(uuid.value, {
      nombre: nombre.value,
      anio: anio.value,
      cuatrimestre: anual.value ? 1 : cuatrimestre.value,
      anual: anual.value,
      dependeDeIds,
      comision: agregarComision.value ? { dia: dia.value, inicio: inicio.value, fin: fin.value } : undefined,
    })
    cerrar()
    emit('actualizada')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al guardar'
  } finally {
    guardando.value = false
  }
}

async function quitarComision(comisionId: number) {
  // comisionId es el id numérico derivado del uuid en la UI
  // Necesitamos el uuid: lo buscamos en el overview
  const ov = materia.value ? store.overviews[materia.value.id] : null
  const sesion = ov?.sessions.find(s => s.id === comisionId)
  if (!sesion) return
  // El id numérico en sesion.id fue derivado con idDeUuid(uuid), no podemos revertirlo.
  // Para eliminarlo necesitamos buscar en Supabase por materia_id + dia + inicio.
  // Alternativa: en materiasDb guardamos el mapa. Por ahora, eliminamos por materia+dia+inicio.
  error.value = null
  try {
    const { error: err } = await (await import('../lib/supabase')).supabase
      .from('comisiones')
      .delete()
      .eq('materia_id', uuid.value!)
      .eq('dia', sesion.weekday)
      .eq('inicio', sesion.start_time + ':00')
    if (err) throw new Error(err.message)
    emit('actualizada')
    // Reabrir con la materia actualizada
    if (materia.value) abrir(materia.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al quitar el horario'
  }
}

async function confirmarEliminar() {
  if (!uuid.value) return
  eliminando.value = true
  error.value = null
  try {
    await eliminarMateria(uuid.value)
    cerrar()
    emit('eliminada')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al eliminar'
  } finally {
    eliminando.value = false
  }
}

defineExpose({ abrir })
</script>

<template>
  <dialog ref="dialog" class="modal" @click.self="cerrar">
    <div class="modal-contenido">
      <div class="modal-cabecera">
        <h3 class="modal-titulo">Editar materia</h3>
        <button type="button" class="btn-cerrar" aria-label="Cerrar" @click="cerrar">
          <X :size="18" />
        </button>
      </div>

      <template v-if="!confirmandoEliminar">
        <!-- Nombre -->
        <div class="campo">
          <label for="edit-nombre">Nombre</label>
          <input id="edit-nombre" v-model="nombre" type="text" class="input" autocomplete="off" />
        </div>

        <!-- Año, Anual y cuatrimestre -->
        <div class="fila-campos">
          <div class="campo">
            <label for="edit-anio">Año</label>
            <input
              id="edit-anio"
              v-model.number="anio"
              type="number"
              min="1"
              step="1"
              class="input input-chico"
            />
          </div>
          <div class="campo campo-anual">
            <label class="toggle-label">
              <input v-model="anual" type="checkbox" />
              Anual
            </label>
          </div>
          <div v-if="!anual" class="campo">
            <label for="edit-cuatri">Cuatrimestre</label>
            <select id="edit-cuatri" v-model.number="cuatrimestre" class="input input-chico">
              <option :value="1">1°</option>
              <option :value="2">2°</option>
            </select>
          </div>
        </div>

        <!-- Dependencias -->
        <div class="campo">
          <span class="campo-label">Depende de</span>
          <div v-if="materiasElegibles.length" class="lista-deps">
            <label v-for="m in materiasElegibles" :key="m.id" class="dep-item">
              <input
                type="checkbox"
                :checked="dependencias.includes(m.id)"
                @change="toggleDependencia(m.id)"
              />
              <span>{{ m.name }}</span>
              <code v-if="m.code" class="dep-codigo">{{ m.code }}</code>
            </label>
          </div>
          <p v-else class="campo-ayuda">No hay otras materias en la carrera.</p>
        </div>

        <!-- Horarios existentes -->
        <div v-if="overview?.sessions.length" class="campo">
          <span class="campo-label">Horarios</span>
          <ul class="lista-comisiones">
            <li v-for="s in overview.sessions" :key="s.id" class="comision-item">
              <span class="comision-texto">
                {{ DIAS[(s.weekday ?? 1) - 1] }} {{ s.start_time }}–{{ s.end_time }}
                <span v-if="s.campus" class="comision-extra"> · {{ s.campus }}</span>
              </span>
              <button type="button" class="btn-quitar" aria-label="Quitar horario" @click="quitarComision(s.id)">
                <Trash2 :size="14" />
              </button>
            </li>
          </ul>
        </div>

        <!-- Agregar horario -->
        <div class="campo">
          <label class="toggle-label">
            <input v-model="agregarComision" type="checkbox" />
            Agregar otro horario
          </label>
        </div>

        <div v-if="agregarComision" class="fila-campos">
          <div class="campo">
            <label for="edit-dia">Día</label>
            <select id="edit-dia" v-model.number="dia" class="input">
              <option v-for="(d, i) in DIAS" :key="i + 1" :value="i + 1">{{ d }}</option>
            </select>
          </div>
          <div class="campo">
            <label for="edit-inicio">Desde</label>
            <input id="edit-inicio" v-model="inicio" type="time" class="input input-chico" />
          </div>
          <div class="campo">
            <label for="edit-fin">Hasta</label>
            <input id="edit-fin" v-model="fin" type="time" class="input input-chico" />
          </div>
        </div>

        <p v-if="error" class="modal-error">{{ error }}</p>

        <div class="modal-acciones">
          <button type="button" class="btn-peligro-texto" @click="confirmandoEliminar = true">
            Eliminar materia
          </button>
          <div class="acciones-derecha">
            <button type="button" class="btn-secundario" @click="cerrar">Cancelar</button>
            <button type="button" class="btn-primario" :disabled="guardando" @click="guardar">
              {{ guardando ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </div>
      </template>

      <!-- Confirmación eliminar -->
      <template v-else>
        <p class="modal-texto">
          ¿Eliminar <strong>{{ materia?.name }}</strong>? Se borrarán sus horarios y sesiones de estudio.
          Esta acción no se puede deshacer.
        </p>
        <p v-if="error" class="modal-error">{{ error }}</p>
        <div class="modal-acciones">
          <button type="button" class="btn-secundario" @click="confirmandoEliminar = false">Volver</button>
          <button type="button" class="btn-peligro" :disabled="eliminando" @click="confirmarEliminar">
            {{ eliminando ? 'Eliminando…' : 'Eliminar' }}
          </button>
        </div>
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.modal {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg);
  color: var(--text);
  padding: 0;
  max-width: min(92vw, 460px);
  width: 100%;
  max-height: 90dvh;
  overflow-y: auto;
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

.modal-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-titulo {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-h);
}

.btn-cerrar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.btn-cerrar:hover {
  background: var(--accent-bg);
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.campo label,
.campo-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
}

.campo-ayuda {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text);
  opacity: 0.6;
}

.fila-campos {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.fila-campos .campo {
  flex: 1 1 80px;
}

.input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
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

.lista-deps {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.5rem;
}

.dep-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.2rem 0;
}

.dep-item input {
  accent-color: var(--accent);
  flex-shrink: 0;
}

.dep-codigo {
  font-size: 0.75rem;
  opacity: 0.6;
}

.lista-comisiones {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.comision-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
}

.comision-texto {
  color: var(--text-h);
}

.comision-extra {
  color: var(--text);
  opacity: 0.7;
}

.btn-quitar {
  display: flex;
  align-items: center;
  padding: 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  opacity: 0.5;
}

.btn-quitar:hover {
  opacity: 1;
  color: #e5484d;
}

.campo-anual {
  justify-content: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.toggle-label input {
  accent-color: var(--accent);
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
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.acciones-derecha {
  display: flex;
  gap: 0.5rem;
}

.btn-primario {
  padding: 0.4rem 1.1rem;
  border: none;
  border-radius: 8px;
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

.btn-secundario {
  padding: 0.4rem 1.1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-secundario:hover {
  border-color: var(--text);
}

.btn-peligro {
  padding: 0.4rem 1.1rem;
  border: none;
  border-radius: 8px;
  background: #e5484d;
  color: #fff;
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-peligro:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-peligro-texto {
  background: none;
  border: none;
  font: inherit;
  font-size: 0.85rem;
  color: #e5484d;
  cursor: pointer;
  padding: 0.25rem 0;
}

.btn-peligro-texto:hover {
  text-decoration: underline;
}
</style>
