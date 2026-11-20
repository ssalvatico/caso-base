<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { DatosSesion } from '../../stores/estudio'
import { aMinutos, clave, horasMinutos, reloj, type MateriaEstudio, type Sesion } from '../../utils/estudio'
import Modal from './Modal.vue'

const props = defineProps<{ sesion: Sesion | null; materias: MateriaEstudio[] }>()
const emit = defineEmits<{ guardar: [datos: DatosSesion] }>()
const abierto = defineModel<boolean>('abierto', { default: false })

const form = reactive({ materiaId: 0, fecha: '', inicio: '', fin: '' })

function cargar() {
  const s = props.sesion
  if (s) {
    Object.assign(form, { materiaId: s.materiaId, fecha: s.fecha, inicio: reloj(s.inicio), fin: reloj(s.fin) })
  } else {
    const ahora = new Date()
    const fin = ahora.getHours() * 60 + ahora.getMinutes()
    Object.assign(form, {
      materiaId: props.materias[0]?.id ?? 0,
      fecha: clave(ahora),
      inicio: reloj(Math.max(0, fin - 60)),
      fin: reloj(fin),
    })
  }
}
watch(abierto, v => v && cargar(), { immediate: true })

const anios = computed(() => [...new Set(props.materias.map(m => m.anio))].sort())
const materia = computed(() => props.materias.find(m => m.id === form.materiaId))
const minutos = computed(() => (form.inicio && form.fin ? aMinutos(form.fin) - aMinutos(form.inicio) : 0))
const error = computed(() => {
  if (!materia.value) return 'Elegí una materia.'
  if (!form.fecha) return 'Elegí una fecha.'
  if (!form.inicio || !form.fin) return 'Completá la hora de inicio y de fin.'
  if (minutos.value <= 0) return 'La hora de fin tiene que ser posterior a la de inicio.'
  return null
})

function guardar() {
  if (error.value) return
  const inicio = aMinutos(form.inicio)
  const fin = aMinutos(form.fin)
  const s = props.sesion
  const mismosHorarios = s && reloj(s.inicio) === form.inicio && reloj(s.fin) === form.fin
  emit('guardar', {
    materiaId: form.materiaId,
    fecha: form.fecha,
    inicio,
    fin,
    // Si cambian los horarios, la duración se recalcula a partir de ellos.
    foco: mismosHorarios ? s.foco : (fin - inicio) * 60,
    modo: s?.modo ?? 'manual',
  })
  abierto.value = false
}
</script>

<template>
  <Modal
    v-model:abierto="abierto"
    :titulo="sesion ? 'Editar sesión' : 'Nueva sesión manual'"
    :descripcion="sesion ? 'Corregí la materia o los horarios. La duración se recalcula sola.' : 'Para cuando estudiaste y te olvidaste de registrarlo.'"
  >
    <form id="form-registro" class="form" @submit.prevent="guardar">
      <label class="campo">
        Materia
        <span class="con-muestra">
          <span class="punto-materia" :style="{ background: materia?.color }" aria-hidden="true" />
          <select v-model.number="form.materiaId">
            <optgroup v-for="a in anios" :key="a" :label="`${a}° año`">
              <option v-for="m in materias.filter(x => x.anio === a)" :key="m.id" :value="m.id">{{ m.nombre }}</option>
            </optgroup>
          </select>
        </span>
      </label>
      <label class="campo">
        Fecha
        <input v-model="form.fecha" type="date" required />
      </label>
      <div class="horarios">
        <label class="campo">
          Inicio
          <input v-model="form.inicio" type="time" required />
        </label>
        <label class="campo">
          Fin
          <input v-model="form.fin" type="time" required />
        </label>
      </div>
      <p class="duracion" :class="{ invalida: error }" aria-live="polite">
        <template v-if="error">{{ error }}</template>
        <template v-else>Duración: <strong class="num">{{ horasMinutos(minutos * 60) }}</strong></template>
      </p>
    </form>
    <template #acciones>
      <button type="button" class="btn" @click="abierto = false">Cancelar</button>
      <button type="submit" form="form-registro" class="btn btn-primario" :disabled="!!error">
        {{ sesion ? 'Guardar cambios' : 'Agregar sesión' }}
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.con-muestra {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.con-muestra .punto-materia {
  width: 1rem;
  height: 1rem;
}

.con-muestra select {
  flex: 1;
  min-width: 0;
}

.horarios {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.duracion {
  margin: 0;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radio-tarjeta);
  background: var(--surface);
  font-size: 0.875rem;
  color: var(--text);
}

.duracion strong {
  color: var(--text-h);
}

.duracion.invalida {
  color: var(--peligro);
}
</style>
