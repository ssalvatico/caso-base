<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Trash2 } from 'lucide-vue-next'
import { useMateriasStore, type Materia, type MateriaOverview } from '../stores/materias'
import { editarMateria } from '../lib/materiasEscritura'
import { uuidPorIdNumerico } from '../lib/materiasDb'
import FormMateria from './FormMateria.vue'

const emit = defineEmits<{
  (e: 'actualizada'): void
}>()

const store = useMateriasStore()
const dialog = ref<HTMLDialogElement | null>(null)

const materia = ref<Materia | null>(null)
const uuid = ref<string | null>(null)

const nombre     = ref('')
const anio       = ref<number>(1)
const anual      = ref(false)
const cuatrimestre = ref<number>(1)
const dependencias = ref<number[]>([])
const agregarComision = ref(false)
const dia          = ref<number>(1)
const inicio       = ref('08:00')
const fin          = ref('10:00')

const guardando = ref(false)
const error = ref<string | null>(null)

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const overview = computed<MateriaOverview | null>(() =>
  materia.value ? (store.overviews[materia.value.id] ?? null) : null
)

const materiasElegibles = computed<Materia[]>(() =>
  materia.value ? store.disponibles.filter(m => m.id !== materia.value!.id) : []
)

function abrir(m: Materia) {
  materia.value = m
  uuid.value = uuidPorIdNumerico.get(m.id) ?? null
  nombre.value = m.name
  anio.value = m.year ?? 1
  anual.value = m.anual
  cuatrimestre.value = m.term ?? 1
  const ov = store.overviews[m.id]
  dependencias.value = ov?.prerequisites.map(p => p.id) ?? []
  agregarComision.value = false
  dia.value = 1
  inicio.value = '08:00'
  fin.value = '10:00'
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
  const ov = materia.value ? store.overviews[materia.value.id] : null
  const sesion = ov?.sessions.find(s => s.id === comisionId)
  if (!sesion) return
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
    if (materia.value) abrir(materia.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al quitar el horario'
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
      
      <FormMateria
        v-model:nombre="nombre"
        v-model:anio="anio"
        v-model:anual="anual"
        v-model:cuatrimestre="cuatrimestre"
        v-model:dependencias="dependencias"
        v-model:conComision="agregarComision"
        v-model:dia="dia"
        v-model:inicio="inicio"
        v-model:fin="fin"
        :materias-elegibles="materiasElegibles"
        id-prefix="edit"
        :mostrar-comision="true"
      >
        <!-- Horarios existentes — slot entre dependencias y toggle de nuevo horario -->
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
      </FormMateria>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-acciones modal-acciones-editar">
        <div class="acciones-derecha">
          <button type="button" class="btn-primario" :disabled="guardando" @click="guardar">
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
          <button type="button" class="btn-secundario" @click="cerrar">Cancelar</button>
        </div>
      </div>

    </div>
  </dialog>
</template>

<style>
@import './form-modal.css';

.modal-acciones-editar {
  justify-content: space-between;
  align-items: center;
}
</style>
