<script setup lang="ts">
import type { Materia } from '../stores/materias'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const props = defineProps<{
  materiasElegibles: Materia[]
  idPrefix: string              // 'mat' | 'edit' — evita ids duplicados en el DOM
  mostrarComision: boolean      // true: mostrar toggle + campos de horario
}>()

const nombre     = defineModel<string>('nombre',     { required: true })
const anio       = defineModel<number>('anio',       { required: true })
const anual      = defineModel<boolean>('anual',     { required: true })
const cuatrimestre = defineModel<number>('cuatrimestre', { required: true })
const dependencias = defineModel<number[]>('dependencias', { required: true })
const conComision  = defineModel<boolean>('conComision',   { required: true })
const dia          = defineModel<number>('dia',            { required: true })
const inicio       = defineModel<string>('inicio',         { required: true })
const fin          = defineModel<string>('fin',            { required: true })

function toggleDependencia(id: number) {
  const idx = dependencias.value.indexOf(id)
  if (idx >= 0) dependencias.value.splice(idx, 1)
  else dependencias.value.push(id)
}
</script>

<template>
  <!-- Nombre -->
  <div class="campo">
    <label :for="`${idPrefix}-nombre`">Nombre</label>
    <input
      :id="`${idPrefix}-nombre`"
      v-model="nombre"
      type="text"
      class="input"
      placeholder="Ej: Álgebra I"
      autocomplete="off"
    />
  </div>

  <!-- Año + Cuatrimestre -->
  <div class="fila-campos">
    <div class="campo campo-anio">
      <label :for="`${idPrefix}-anio`">Año</label>
      <input
        :id="`${idPrefix}-anio`"
        v-model.number="anio"
        type="number"
        min="1"
        step="1"
        class="input"
      />
    </div>
    <div v-if="!anual" class="campo campo-cuatri">
      <label :for="`${idPrefix}-cuatri`">Cuatrimestre</label>
      <select :id="`${idPrefix}-cuatri`" v-model.number="cuatrimestre" class="input">
        <option :value="1">1°</option>
        <option :value="2">2°</option>
      </select>
    </div>
  </div>
  <div class="campo campo-anual">
    <label class="toggle-label">
      <input v-model="anual" type="checkbox" />
      <span>Anual?</span>
    </label>
  </div>

  <!-- Dependencias -->
  <div class="campo">
    <p class="campo-ayuda">Dejá vacío si no tiene correlativas.</p>
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
    <p v-else class="campo-ayuda">No hay otras materias en la carrera todavía.</p>
  </div>

  <!-- Slot para contenido extra entre dependencias y horario (ej: lista de horarios existentes) -->
  <slot />

  <!-- Horario (nuevo) -->
  <template v-if="mostrarComision">
    <div class="campo">
      <label class="toggle-label">
        <input v-model="conComision" type="checkbox" />
        {{ conComision ? 'Horario inicial' : 'Agregar horario inicial' }}
      </label>
    </div>

    <div v-if="conComision" class="fila-campos">
      <div class="campo">
        <label :for="`${idPrefix}-dia`">Día</label>
        <select :id="`${idPrefix}-dia`" v-model.number="dia" class="input">
          <option v-for="(d, i) in DIAS" :key="i + 1" :value="i + 1">{{ d }}</option>
        </select>
      </div>
      <div class="campo">
        <label :for="`${idPrefix}-inicio`">Desde</label>
        <input :id="`${idPrefix}-inicio`" v-model="inicio" type="time" class="input input-chico" />
      </div>
      <div class="campo">
        <label :for="`${idPrefix}-fin`">Hasta</label>
        <input :id="`${idPrefix}-fin`" v-model="fin" type="time" class="input input-chico" />
      </div>
    </div>
  </template>
</template>
