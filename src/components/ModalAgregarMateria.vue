<script setup lang="ts">
import { ref, computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useMateriasStore, type Materia } from '../stores/materias'
import { useCarrerasStore } from '../stores/carreras'
import { crearMateria } from '../lib/materiasEscritura'
import { uuidPorIdNumerico } from '../lib/materiasDb'
import FormMateria from './FormMateria.vue'

const emit = defineEmits<{ (e: 'creada'): void }>()

const store = useMateriasStore()
const carrerasStore = useCarrerasStore()

const dialog = ref<HTMLDialogElement | null>(null)

const nombre     = ref('')
const anio       = ref<number>(1)
const anual      = ref(false)
const cuatrimestre = ref<number>(1)
const dependencias = ref<number[]>([])
const conComision  = ref(false)
const dia          = ref<number>(1)
const inicio       = ref('08:00')
const fin          = ref('10:00')

const guardando = ref(false)
const error = ref<string | null>(null)

const materiasElegibles = computed<Materia[]>(() => store.disponibles)

function abrir() {
  nombre.value = ''
  anio.value = 1
  anual.value = false
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
  if (!Number.isInteger(anio.value) || anio.value < 1) {
    error.value = 'El año debe ser un número entero mayor a 0.'
    return
  }
  if (conComision.value && fin.value <= inicio.value) {
    error.value = 'El horario de fin debe ser posterior al de inicio.'
    return
  }

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
      cuatrimestre: anual.value ? 1 : cuatrimestre.value,
      anual: anual.value,
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

      <FormMateria
        v-model:nombre="nombre"
        v-model:anio="anio"
        v-model:anual="anual"
        v-model:cuatrimestre="cuatrimestre"
        v-model:dependencias="dependencias"
        v-model:conComision="conComision"
        v-model:dia="dia"
        v-model:inicio="inicio"
        v-model:fin="fin"
        :materias-elegibles="materiasElegibles"
        id-prefix="mat"
        :mostrar-comision="true"
      />

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

<style>
@import './form-modal.css';
</style>
