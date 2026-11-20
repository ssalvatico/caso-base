<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { Clock } from 'lucide-vue-next'
import { idEstudioDeCodigoPlan } from '../../data/planLCC2024'
import { useEstudioStore } from '../../stores/estudio'
import { etiquetaCondicion, useMateriasStore, type Materia } from '../../stores/materias'
import { NODO_ALTO, NODO_ANCHO } from '../../utils/arbol'
import { horasMinutosCompacto } from '../../utils/estudio'

const props = defineProps<{
  data: { materia: Materia; atenuada: boolean; resaltada: boolean }
}>()

const store = useMateriasStore()
const estudio = useEstudioStore()

const tiempoEstudiado = computed(() => {
  const idEstudio = idEstudioDeCodigoPlan(props.data.materia.code)
  const segundos = estudio.sesiones.reduce(
    (suma, s) => (s.materiaId === idEstudio ? suma + s.foco : suma),
    0,
  )
  return horasMinutosCompacto(segundos)
})

const condicion = computed(() => store.condicionDe(props.data.materia.id))
const motivo = computed(() => store.motivoBloqueo(props.data.materia.id))

const descripcionAccesible = computed(() => {
  const base = `Condición: ${etiquetaCondicion(condicion.value)}`
  if (motivo.value === 'libre') return `${base}, bloqueada porque una correlativa está en condición Libre`
  if (motivo.value === 'correlativas') return `${base}, bloqueada porque faltan correlativas Regulares`
  return base
})
</script>

<template>
  <div
    class="nodo"
    :class="[`condicion-${condicion}`, { atenuada: data.atenuada, resaltada: data.resaltada }]"
    :style="{ width: `${NODO_ANCHO}px`, minHeight: `${NODO_ALTO}px` }"
  >
    <Handle type="target" :position="Position.Left" :connectable="false" />

    <code v-if="data.materia.code" class="codigo">{{ data.materia.code }}</code>

    <p class="nombre" :title="data.materia.name">{{ data.materia.name }}</p>

    <p class="tiempo">
      <Clock :size="13" :stroke-width="2.25" aria-hidden="true" />
      <span class="sr-only">Tiempo estudiado: </span>{{ tiempoEstudiado }}
    </p>

    <span class="sr-only">{{ descripcionAccesible }}</span>

    <Handle type="source" :position="Position.Right" :connectable="false" />
  </div>
</template>

<style scoped>
.nodo {
  --tono: var(--c-no-cursable);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--tono) 30%, var(--bg));
  border: 2px solid var(--tono);
  border-radius: var(--radio-tarjeta);
  box-shadow: 0 1px 2px rgba(20, 33, 61, 0.12);
  text-align: left;
  transition: opacity 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.nodo:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(20, 33, 61, 0.22);
}

.nodo:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.condicion-aprobada { --tono: var(--c-aprobada); }
.condicion-regular { --tono: var(--c-regular); }
.condicion-libre { --tono: var(--c-libre); }
.condicion-no_cursable { --tono: var(--c-no-cursable); }

.condicion-no_cursable {
  border-style: dashed;
  background: color-mix(in srgb, var(--tono) 14%, var(--bg));
}

.condicion-no_cursable .nombre,
.condicion-no_cursable .tiempo {
  opacity: 0.7;
}

.atenuada {
  opacity: 0.28;
}

.resaltada {
  box-shadow: 0 0 0 3px var(--accent), 0 6px 14px rgba(20, 33, 61, 0.28);
}

.codigo {
  align-self: flex-start;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.nombre {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  margin: 0;
  color: var(--text-h);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.condicion-aprobada .nombre {
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}

.tiempo {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: auto 0 0;
  color: var(--text-h);
  font-family: var(--mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
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
