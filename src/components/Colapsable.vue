<script lang="ts">
let contador = 0
</script>

<script setup lang="ts">
import { ref } from 'vue'
import type { Urgencia } from '../utils/fechas'

withDefaults(
  defineProps<{
    titulo: string
    subtitulo?: string
    badge?: string
    badgeUrgencia?: Urgencia
    variante?: 'anio' | 'cuatrimestre' | 'materia'
    superado?: boolean
  }>(),
  { variante: 'materia', superado: false }
)

const id = `colapsable-${++contador}`
const abierto = ref(false)
</script>

<template>
  <div class="colapsable" :class="[`colapsable--${variante}`, { abierto, superado }]">
    <h4 class="colapsable-titulo">
      <button
        :id="`${id}-btn`"
        type="button"
        class="colapsable-boton"
        :aria-expanded="abierto"
        :aria-controls="`${id}-panel`"
        @click="abierto = !abierto"
      >
        <span class="colapsable-texto">
          <span class="colapsable-nombre">
            {{ titulo }}<span v-if="superado" class="sr-only"> (etapa superada)</span>
          </span>
          <span v-if="subtitulo" class="colapsable-sub">{{ subtitulo }}</span>
        </span>
        <slot name="extra" />
        <span v-if="badge" class="colapsable-badge" :data-urgencia="badgeUrgencia">{{ badge }}</span>
        <span class="colapsable-flecha" aria-hidden="true" />
      </button>
    </h4>

    <div
      :id="`${id}-panel`"
      class="colapsable-panel"
      role="region"
      :aria-labelledby="`${id}-btn`"
      :inert="!abierto"
    >
      <div class="colapsable-contenedor">
        <div class="colapsable-contenido">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.colapsable {
  border: 1px solid var(--border);
  border-radius: var(--radio-tarjeta);
  transition: border-color 0.2s, background-color 0.2s;
}

.colapsable.abierto {
  border-color: var(--accent-border);
}

.colapsable-titulo {
  margin: 0;
  font: inherit;
}

.colapsable-boton {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: 0;
  border-radius: var(--radio-tarjeta);
  background: transparent;
  color: var(--text-h);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.colapsable-boton:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.colapsable-texto {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.colapsable-nombre {
  font-weight: 500;
  font-size: 16px;
}

.colapsable--anio .colapsable-nombre {
  font-size: 17px;
  font-weight: 600;
}

.colapsable--cuatrimestre .colapsable-nombre {
  font-size: 15px;
}

.superado > .colapsable-titulo .colapsable-nombre {
  color: var(--text);
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.colapsable-sub {
  font-size: 14px;
  color: var(--text);
}

.colapsable-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-bg);
  color: var(--accent-text);
  font-size: 13px;
  white-space: nowrap;
}

.colapsable-badge[data-urgencia] {
  background: color-mix(in srgb, var(--tono) 16%, transparent);
  color: var(--tono);
  font-weight: 600;
}

.colapsable-flecha {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.25s ease;
}

.abierto > .colapsable-titulo .colapsable-flecha {
  transform: rotate(-135deg);
}

.colapsable-panel {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  transition: grid-template-rows 0.25s ease, visibility 0s linear 0.25s;
}

.abierto > .colapsable-panel {
  grid-template-rows: 1fr;
  visibility: visible;
  transition: grid-template-rows 0.25s ease, visibility 0s;
}

.colapsable-contenedor {
  min-height: 0;
  overflow: hidden;
}

.colapsable-contenido {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.25rem 1rem 1rem;
}

@media (prefers-reduced-motion: reduce) {
  .colapsable-panel,
  .colapsable-flecha {
    transition: none;
  }
}
</style>
