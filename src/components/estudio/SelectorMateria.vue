<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import type { MateriaEstudio } from '../../utils/estudio'
import Modal from './Modal.vue'

const props = defineProps<{
  materias: MateriaEstudio[]
  seleccion: number | null
  // Opción que se muestra arriba, sin encabezado de año (por ejemplo, el comodín).
  destacada?: MateriaEstudio
}>()
const emit = defineEmits<{ elegir: [id: number] }>()
const abierto = defineModel<boolean>('abierto', { default: false })

const grupos = computed(() => {
  const anios = [...new Set(props.materias.map(m => m.anio))].sort()
  return anios.map(anio => ({ anio, materias: props.materias.filter(m => m.anio === anio) }))
})

function elegir(id: number) {
  emit('elegir', id)
  abierto.value = false
}
</script>

<template>
  <Modal v-model:abierto="abierto" titulo="Elegí una materia" descripcion="El tiempo de foco se registra en la materia elegida.">
    <section v-if="destacada" class="grupo" aria-label="Sin materia asignada">
      <ul role="listbox" aria-label="Sin materia asignada">
        <li>
          <button
            type="button"
            role="option"
            class="opcion"
            :class="{ elegida: destacada.id === seleccion }"
            :aria-selected="destacada.id === seleccion"
            @click="elegir(destacada.id)"
          >
            <span class="muestra" :style="{ background: destacada.color }" aria-hidden="true" />
            <span class="nombre">{{ destacada.nombre }}</span>
            <Check v-if="destacada.id === seleccion" :size="18" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </section>

    <div class="grupos">
      <section v-for="g in grupos" :key="g.anio" class="grupo" :aria-labelledby="`anio-${g.anio}`">
        <h4 :id="`anio-${g.anio}`">{{ g.anio }}° año</h4>
        <ul role="listbox" :aria-labelledby="`anio-${g.anio}`">
          <li v-for="m in g.materias" :key="m.id">
            <button
              type="button"
              role="option"
              class="opcion"
              :class="{ elegida: m.id === seleccion }"
              :aria-selected="m.id === seleccion"
              @click="elegir(m.id)"
            >
              <span class="muestra" :style="{ background: m.color }" aria-hidden="true" />
              <span class="nombre">{{ m.nombre }}</span>
              <Check v-if="m.id === seleccion" :size="18" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </Modal>
</template>

<style scoped>
.grupos {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.grupo h4 {
  margin: 0 0 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text);
}

ul {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.opcion {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--text-h);
  font: inherit;
  font-size: 0.925rem;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.opcion:hover {
  background: var(--surface);
}

.opcion.elegida {
  border-color: var(--text-h);
}

.opcion:focus-visible {
  outline: 2px solid var(--accent);
}

.muestra {
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 6px;
}

.nombre {
  flex: 1;
}
</style>
