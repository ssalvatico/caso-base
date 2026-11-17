<script setup lang="ts">
import { ref, computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useMateriasStore, type Materia } from '../stores/materias'
import { useCarrerasStore } from '../stores/carreras'
import { crearMateria } from '../lib/materiasEscritura'
import { uuidPorIdNumerico } from '../lib/materiasDb'

const emit = defineEmits<{ (e: 'creada'): void }>()

const store = useMateriasStore()
const carrerasStore = useCarrerasStore()

const dialog = ref<HTMLDialogElement | null>(null)

// Campos del formulario
const nombre = ref('')
const anio = ref<number>(1)
const cuatrimestre = ref<number>(1)
const dependencias = ref<number[]>([])  // ids numéricos

// Comisión inicial (opcional)
const conComision = ref(false)
const dia = ref<number>(1)
const inicio = ref('08:00')
const fin = ref('10:00')

const guardando = ref(false)
const error = ref<string | null>(null)

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// Materias disponibles para elegir como dependencia (excluyendo aprobadas)
const materiasElegibles = computed<Materia[]>(() =>
  store.disponibles.filter(m => store.condicionDe(m.id) !== 'no_cursable' || true)
  // Mostramos todas: el usuario sabe cuáles elige como prerequisito
)

function toggleDependencia(id: number) {
  const idx = dependencias.value.indexOf(id)
  if (idx >= 0) dependencias.value.splice(idx, 1)
  else dependencias.value.push(id)
}

function abrir() {
  nombre.value = ''
  anio.value = 1
  cuatrimestre.value = 1
  dependencias.value = []
  conComision.value = false
  dia.value = 1
  inicio.value = '08:00'
  fin.value = '10:00'
  error.value = null
  dialog.value?.showModal()
}

function cerrar() {
  dialog.value?.close()
}

async function confirmar() {
  if (!nombre.value.trim()) { error.value = 'El nombre es obligatorio.'; return }
  if (!carrerasStore.activa) { error.value = 'No hay carrera activa.'; return }

  if (conComision.value && fin.value <= inicio.value) {
    error.value = 'El horario de fin debe ser posterior al de inicio.'
    return
  }

  // Resolver ids numéricos a UUIDs
  const dependeDeIds: string[] = []
  for (const id of dependencias.value) {
    const uuid = uuidPorIdNumerico.get(id)
    if (!uuid) { error.value = `No se encontró el uuid de una materia seleccionada (id ${id}).`; return }
    dependeDeIds.push(uuid)
  }

  guardando.value = true
  error.value = null
  try {
    await crearMateria({
      carreraId: carrerasStore.activa.id,
      nombre: nombre.value,
      anio: anio.value,
      cuatrimestre: cuatrimestre.value,
      dependeDeIds,
      comision: conComision.value ? { dia: dia.value, inicio: inicio.value, fin: fin.value } : undefined,
    })
    cerrar()
    emit('creada')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al crear la materia'
  } finally {
    guardando.value = false
  }
}

defineExpose({ abrir })
</script>

<template>
  <dialog ref="dialog" class="modal" @click.self="cerrar">
    <div class="modal-contenido">
      <div class="modal-cabecera">
        <h3 class="modal-titulo">Agregar materia</h3>
        <button type="button" class="btn-cerrar" aria-label="Cerrar" @click="cerrar">
          <X :size="18" />
        </button>
      </div>

      <!-- Nombre -->
      <div class="campo">
        <label for="mat-nombre">Nombre</label>
        <input
          id="mat-nombre"
          v-model="nombre"
          type="text"
          class="input"
          placeholder="Ej: Álgebra I"
          autocomplete="off"
        />
      </div>

      <!-- Año y cuatrimestre en fila -->
      <div class="fila-campos">
        <div class="campo">
          <label for="mat-anio">Año</label>
          <select id="mat-anio" v-model.number="anio" class="input input-chico">
            <option v-for="a in 5" :key="a" :value="a">{{ a }}°</option>
          </select>
        </div>
        <div class="campo">
          <label for="mat-cuatri">Cuatrimestre</label>
          <select id="mat-cuatri" v-model.number="cuatrimestre" class="input input-chico">
            <option :value="1">1°</option>
            <option :value="2">2°</option>
          </select>
        </div>
      </div>

      <!-- Dependencias -->
      <div class="campo">
        <span class="campo-label">Depende de</span>
        <p class="campo-ayuda">Dejá vacío si no tiene correlativas.</p>
        <div v-if="materiasElegibles.length" class="lista-deps">
          <label
            v-for="m in materiasElegibles"
            :key="m.id"
            class="dep-item"
          >
            <input
              type="checkbox"
              :checked="dependencias.includes(m.id)"
              @change="toggleDependencia(m.id)"
            />
            <span>{{ m.name }}</span>
            <code v-if="m.code" class="dep-codigo">{{ m.code }}</code>
          </label>
        </div>
        <p v-else class="campo-ayuda">No hay otras materias en la carrera todavía.</p>
      </div>

      <!-- Comisión inicial -->
      <div class="campo">
        <label class="toggle-label">
          <input v-model="conComision" type="checkbox" />
          Agregar horario inicial
        </label>
      </div>

      <div v-if="conComision" class="fila-campos">
        <div class="campo">
          <label for="mat-dia">Día</label>
          <select id="mat-dia" v-model.number="dia" class="input">
            <option v-for="(d, i) in DIAS" :key="i + 1" :value="i + 1">{{ d }}</option>
          </select>
        </div>
        <div class="campo">
          <label for="mat-inicio">Desde</label>
          <input id="mat-inicio" v-model="inicio" type="time" class="input input-chico" />
        </div>
        <div class="campo">
          <label for="mat-fin">Hasta</label>
          <input id="mat-fin" v-model="fin" type="time" class="input input-chico" />
        </div>
      </div>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-acciones">
        <button type="button" class="btn-secundario" @click="cerrar">Cancelar</button>
        <button type="button" class="btn-primario" :disabled="guardando" @click="confirmar">
          {{ guardando ? 'Guardando…' : 'Agregar' }}
        </button>
      </div>
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
  max-height: 180px;
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
</style>
