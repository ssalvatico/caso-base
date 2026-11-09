<script setup lang="ts">
import { formatearMinutos, type Conflicto } from '../../utils/calendario'
import { nombreDia } from '../../utils/horarios'

defineProps<{
  conflictos: Conflicto[]
  // null = el navegador no soporta notificaciones
  notificaciones: boolean | null
}>()

const emit = defineEmits<{
  descartar: []
  alternarNotificaciones: []
}>()
</script>

<template>
  <div class="aviso" role="alert">
    <svg class="icono" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 10v5M12 18h.01" />
    </svg>

    <div class="contenido">
      <p class="titulo">
        {{
          conflictos.length === 1
            ? 'Hay 1 superposición de horarios'
            : `Hay ${conflictos.length} superposiciones de horarios`
        }}
      </p>
      <ul class="lista">
        <li v-for="(c, i) in conflictos" :key="i">
          <strong>{{ nombreDia(c.weekday) }} {{ formatearMinutos(c.inicio) }}-{{ formatearMinutos(c.fin) }}</strong>
          · {{ c.a.materia }} y {{ c.b.materia }}
        </li>
      </ul>
      <button
        v-if="notificaciones !== null"
        type="button"
        class="enlace"
        :aria-pressed="notificaciones"
        @click="emit('alternarNotificaciones')"
      >
        {{ notificaciones ? 'Desactivar avisos del navegador' : 'Avisarme en el navegador' }}
      </button>
    </div>

    <button type="button" class="cerrar" aria-label="Descartar aviso" @click="emit('descartar')">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.aviso {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--aviso-borde);
  border-radius: 10px;
  background: var(--aviso-fondo);
  color: var(--aviso-texto);
  font-size: 14px;
}

.icono {
  flex: none;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  fill: none;
  stroke: #c62a2f;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.contenido {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  min-width: 0;
}

.titulo {
  margin: 0;
  font-weight: 600;
}

.lista {
  margin: 0;
  padding: 0;
  list-style: none;
}

.lista li {
  line-height: 1.5;
}

.enlace {
  padding: 0;
  border: 0;
  background: none;
  color: var(--aviso-texto);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.cerrar {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: none;
  color: inherit;
  cursor: pointer;
}

.cerrar:hover {
  background: rgba(198, 42, 47, 0.12);
}

.cerrar svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
</style>
