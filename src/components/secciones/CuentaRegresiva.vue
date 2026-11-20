<script setup lang="ts">
import { computed } from 'vue'
import { urgenciaPorDias, type Restante } from '../../utils/fechas'

const props = defineProps<{
  restante: Restante
  titulo: string
  cuando: string
  estudiado: string
}>()

const urgencia = computed(() => urgenciaPorDias(props.restante.dias))

const unidades = computed(() => [
  { valor: props.restante.dias, etiqueta: 'días' },
  { valor: props.restante.horas, etiqueta: 'horas' },
  { valor: props.restante.minutos, etiqueta: 'min' },
  { valor: props.restante.segundos, etiqueta: 'seg' },
])

const textoAccesible = computed(
  () =>
    `Faltan ${props.restante.dias} días, ${props.restante.horas} horas y ${props.restante.minutos} minutos para ${props.titulo}`,
)
</script>

<template>
  <div class="reloj" :data-urgencia="urgencia">
    <p class="reloj-encabezado">
      Próximo: <strong>{{ titulo }}</strong> · {{ cuando }}
    </p>
    <p class="sr-only">{{ textoAccesible }}</p>
    <div class="reloj-unidades" aria-hidden="true">
      <div v-for="u in unidades" :key="u.etiqueta" class="unidad">
        <span class="unidad-valor">{{ String(u.valor).padStart(2, '0') }}</span>
        <span class="unidad-etiqueta">{{ u.etiqueta }}</span>
      </div>
    </div>
    <p class="reloj-estudio">
      Estudiaste <strong>{{ estudiado }}</strong> en total en esta materia
    </p>
  </div>
</template>

<style scoped>
.reloj {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--tono) 45%, transparent);
  border-radius: var(--radio-tarjeta);
  background: color-mix(in srgb, var(--tono) 12%, transparent);
  transition: background-color 0.4s, border-color 0.4s;
}

.reloj-encabezado,
.reloj-estudio {
  margin: 0;
  font-size: 14px;
  color: var(--text);
}

.reloj-encabezado strong,
.reloj-estudio strong {
  color: var(--text-h);
}

.reloj-estudio {
  padding-top: 0.5rem;
  border-top: 1px solid color-mix(in srgb, var(--tono) 30%, transparent);
}

.reloj-unidades {
  display: flex;
  gap: 0.5rem;
}

.unidad {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0.5rem 0.25rem;
  border-radius: var(--radio-control);
  background: var(--bg);
}

.unidad-valor {
  font-family: var(--mono, ui-monospace, monospace);
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--tono);
}

.unidad-etiqueta {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text);
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
