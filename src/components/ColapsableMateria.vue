<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMateriasStore, type Materia } from '../stores/materias'
import Colapsable from './Colapsable.vue'
import RachaMateria from './RachaMateria.vue'
import SeccionExamenes from './secciones/SeccionExamenes.vue'
import SeccionHorarios from './secciones/SeccionHorarios.vue'
import {
  calcularRestante,
  combinarFechaHora,
  restanteCorto,
  urgenciaPorDias,
  useAhora,
} from '../utils/fechas'

const props = defineProps<{
  materia: Materia
}>()

const store = useMateriasStore()
const ahora = useAhora()
const campusUrl = computed(() => store.overviews[props.materia.id]?.campus_url ?? null)

const proximoRestante = computed(() => {
  for (const e of store.examenesDe(props.materia.id)) {
    const restante = calcularRestante(combinarFechaHora(e.fecha, e.hora), ahora.value)
    if (restante) return restante
  }
  return null
})

const badgeExamen = computed(() =>
  proximoRestante.value ? restanteCorto(proximoRestante.value) : undefined,
)
const badgeUrgencia = computed(() =>
  proximoRestante.value ? urgenciaPorDias(proximoRestante.value.dias) : undefined,
)

onMounted(() => store.cargarOverview(props.materia.id))
</script>

<template>
  <Colapsable :titulo="materia.name" :subtitulo="materia.code ?? undefined" :badge="badgeExamen" :badge-urgencia="badgeUrgencia" variante="materia">
    <template #extra>
      <RachaMateria :materia="materia" />
    </template>
    <slot>
      <!-- Cada sección tendrá su propio componente y su propia petición a la API -->
      <section v-if="campusUrl" class="seccion">
        <h5 class="seccion-titulo">Campus virtual</h5>
        <a :href="campusUrl" target="_blank" rel="noopener noreferrer" class="campus-link">
          {{ campusUrl }}
        </a>
      </section>

      <section class="seccion">
        <h5 class="seccion-titulo">Horarios</h5>
        <SeccionHorarios :materia-id="materia.id"></SeccionHorarios>
      </section>

      <section class="seccion">
        <h5 class="seccion-titulo">Exámenes</h5>
        <SeccionExamenes :materia-id="materia.id" />
      </section>
    </slot>
  </Colapsable>
</template>

<style scoped>
.campus-link {
  font-size: 14px;
  color: var(--accent-text);
  overflow-wrap: anywhere;
}

.seccion {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px dashed var(--border);
  border-radius: var(--radio-tarjeta);
}

.seccion-titulo {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-h);
}
</style>
