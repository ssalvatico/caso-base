<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { formatearMinutos, type EventoCalendario } from '../../utils/calendario'
import { nombreDia, textoAula } from '../../utils/horarios'

defineProps<{
  evento: EventoCalendario
  superpuestoCon: string[]
}>()

const emit = defineEmits<{ cerrar: [] }>()

const botonCerrar = ref<HTMLButtonElement | null>(null)

function alTeclear(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cerrar')
}

onMounted(() => {
  window.addEventListener('keydown', alTeclear)
  botonCerrar.value?.focus()
})
onUnmounted(() => window.removeEventListener('keydown', alTeclear))
</script>

<template>
  <div class="fondo" @click.self="emit('cerrar')">
    <div
      class="detalle"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalle-titulo"
      :style="{ '--hue': evento.hue }"
    >
      <header class="encabezado">
        <h4 id="detalle-titulo">{{ evento.materia }}</h4>
        <button ref="botonCerrar" type="button" class="cerrar" aria-label="Cerrar" @click="emit('cerrar')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <p v-if="superpuestoCon.length" class="alerta">
        Se superpone con {{ superpuestoCon.join(', ') }}.
      </p>

      <dl class="datos">
        <dt>Día</dt>
        <dd>{{ nombreDia(evento.weekday) }}</dd>
        <dt>Horario</dt>
        <dd>{{ formatearMinutos(evento.inicio) }} - {{ formatearMinutos(evento.fin) }}</dd>
        <template v-if="textoAula(evento.comision)">
          <dt>Aula</dt>
          <dd>{{ textoAula(evento.comision) }}</dd>
        </template>
        <template v-if="evento.comision.mode">
          <dt>Modalidad</dt>
          <dd>{{ evento.comision.mode }}</dd>
        </template>
        <template v-if="evento.comision.notes">
          <dt>Notas</dt>
          <dd>{{ evento.comision.notes }}</dd>
        </template>
      </dl>
    </div>
  </div>
</template>

<style scoped>
.fondo {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(8, 6, 13, 0.45);
}

.detalle {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: min(100%, 24rem);
  padding: 1rem 1.25rem 1.25rem;
  border-top: 6px solid hsl(var(--hue) 55% 40%);
  border-radius: 12px;
  background: var(--bg);
  box-shadow: var(--shadow);
  font-size: 14px;
}

.encabezado {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

h4 {
  margin: 0;
  font-size: 18px;
  color: var(--text-h);
}

.cerrar {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--text-h);
  cursor: pointer;
}

.cerrar:hover {
  background: var(--code-bg);
}

.cerrar svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.alerta {
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: var(--aviso-fondo);
  color: var(--aviso-texto);
}

.datos {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 1rem;
  margin: 0;
}

dt {
  color: var(--text);
}

dd {
  margin: 0;
  color: var(--text-h);
}
</style>
