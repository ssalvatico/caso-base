<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  progreso: number
  tiempo: string
  etiqueta: string
  tono: 'foco' | 'descanso'
  detalle?: string
}>()

const R = 86
const C = 2 * Math.PI * R
const avance = computed(() => Math.min(1, Math.max(0, props.progreso)))
const perilla = computed(() => {
  const angulo = avance.value * 2 * Math.PI - Math.PI / 2
  return { x: 100 + R * Math.cos(angulo), y: 100 + R * Math.sin(angulo) }
})
const marcas = Array.from({ length: 60 }, (_, i) => i)
</script>

<template>
  <div class="reloj" :class="tono" role="timer" :aria-label="`${etiqueta}: ${tiempo}`">
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <g class="marcas">
        <line
          v-for="i in marcas"
          :key="i"
          x1="100"
          :y1="i % 5 === 0 ? 3 : 4.5"
          x2="100"
          :y2="i % 5 === 0 ? 9 : 7"
          :transform="`rotate(${i * 6} 100 100)`"
          :class="{ mayor: i % 5 === 0 }"
        />
      </g>
      <circle class="pista" cx="100" cy="100" :r="R" />
      <circle
        class="progreso"
        cx="100"
        cy="100"
        :r="R"
        :stroke-dasharray="C"
        :stroke-dashoffset="C * (1 - avance)"
        transform="rotate(-90 100 100)"
      />
      <circle v-if="avance > 0" class="perilla" :cx="perilla.x" :cy="perilla.y" r="5" />
    </svg>
    <div class="centro">
      <span class="etiqueta">{{ etiqueta }}</span>
      <span class="tiempo num">{{ tiempo }}</span>
      <span v-if="detalle" class="detalle">{{ detalle }}</span>
    </div>
  </div>
</template>

<style scoped>
.reloj {
  display: grid;
  /* Además del ancho, se limita por el alto visible para que la pantalla entere sin scroll. */
  width: min(78vw, 300px, 32dvh);
  aspect-ratio: 1;
  margin: 0 auto;
}

.reloj > * {
  grid-area: 1 / 1;
}

svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.marcas line {
  stroke: var(--border);
  stroke-width: 1;
  stroke-linecap: round;
}

.marcas line.mayor {
  stroke: var(--text);
  stroke-width: 1.4;
}

.pista {
  fill: none;
  stroke: var(--calor-0);
  stroke-width: 9;
}

.progreso {
  fill: none;
  stroke: var(--accent);
  stroke-width: 9;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.25s linear, stroke 0.3s ease;
}

.perilla {
  fill: var(--bg);
  stroke: var(--accent);
  stroke-width: 3;
}

.descanso .progreso,
.descanso .perilla {
  stroke: var(--text);
}

.centro {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  text-align: center;
}

.etiqueta {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent-text);
}

.descanso .etiqueta {
  color: var(--text);
}

.tiempo {
  font-size: clamp(2.5rem, 12vw, 3.6rem);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--text-h);
}

.detalle {
  font-size: 0.8rem;
  color: var(--text);
}
</style>
