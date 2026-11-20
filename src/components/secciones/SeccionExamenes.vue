<script setup lang="ts">
import { computed, ref } from 'vue'
import { idEstudioDeCodigoPlan } from '../../data/planLCC2024'
import { useEstudioStore } from '../../stores/estudio'
import { useMateriasStore, type TipoExamen } from '../../stores/materias'
import { ETIQUETA_TIPO } from '../../utils/calendario'
import { horasMinutos } from '../../utils/estudio'
import {
  calcularRestante,
  combinarFechaHora,
  enmascararFecha,
  fechaLatinaAIso,
  useAhora,
  validarFechaExamen,
} from '../../utils/fechas'
import CuentaRegresiva from './CuentaRegresiva.vue'

const props = defineProps<{ materiaId: number }>()

const store = useMateriasStore()
const estudio = useEstudioStore()
const ahora = useAhora()

const estudiado = computed(() => {
  const codigo = store.disponibles.find(m => m.id === props.materiaId)?.code
  const idEstudio = idEstudioDeCodigoPlan(codigo)
  const segundos = estudio.sesiones.reduce(
    (suma, s) => (s.materiaId === idEstudio ? suma + s.foco : suma),
    0,
  )
  return horasMinutos(segundos)
})

const tipos = Object.entries(ETIQUETA_TIPO) as [TipoExamen, string][]
const tipo = ref<TipoExamen>('parcial')
const titulo = ref('')
const fecha = ref('')
const hora = ref('09:00')
const error = ref<string | null>(null)

const uid = `examen-${props.materiaId}`

const examenes = computed(() =>
  store.examenesDe(props.materiaId).map(e => {
    const objetivo = combinarFechaHora(e.fecha, e.hora)
    return { ...e, objetivo, pasado: objetivo.getTime() <= ahora.value.getTime() }
  }),
)

const proximo = computed(() => examenes.value.find(e => !e.pasado) ?? null)
const restante = computed(() =>
  proximo.value ? calcularRestante(proximo.value.objetivo, ahora.value) : null,
)

const formato = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function alEscribirFecha(evento: Event) {
  const campo = evento.target as HTMLInputElement
  fecha.value = enmascararFecha(campo.value)
  campo.value = fecha.value
}

function agregar() {
  const fechaIso = fechaLatinaAIso(fecha.value)
  if (!fechaIso) {
    error.value = 'Ingresá una fecha válida con el formato dd/mm/aaaa.'
    return
  }
  error.value = validarFechaExamen(fechaIso, hora.value, new Date())
  if (error.value) return
  const agregado = store.agregarExamen(props.materiaId, {
    tipo: tipo.value,
    titulo: titulo.value.trim() || ETIQUETA_TIPO[tipo.value],
    fecha: fechaIso,
    hora: hora.value,
  })
  if (!agregado) {
    error.value = `Ya cargaste un ${ETIQUETA_TIPO[tipo.value].toLowerCase()} para esa fecha.`
    return
  }
  titulo.value = ''
  fecha.value = ''
}
</script>

<template>
  <div class="examenes">
    <CuentaRegresiva
      v-if="proximo && restante"
      :restante="restante"
      :titulo="proximo.titulo"
      :cuando="formato.format(proximo.objetivo)"
      :estudiado="estudiado"
    />
    <template v-else>
      <p class="vacio">No hay exámenes próximos.</p>
      <p class="vacio">
        Estudiaste <strong class="vacio-valor">{{ estudiado }}</strong> en total en esta materia
      </p>
    </template>

    <ul v-if="examenes.length" class="lista">
      <li v-for="e in examenes" :key="e.id" class="item" :class="{ pasado: e.pasado }">
        <span class="item-texto">
          <span class="item-titulo">{{ e.titulo }}</span>
          <span class="item-fecha">{{ formato.format(e.objetivo) }}</span>
        </span>
        <button
          type="button"
          class="quitar"
          :aria-label="`Quitar ${e.titulo}`"
          @click="store.quitarExamen(e.id)"
        >
          Quitar
        </button>
      </li>
    </ul>

    <form class="form" @submit.prevent="agregar">
      <fieldset class="campos">
        <legend class="legend">Agregar examen</legend>
        <label :for="`${uid}-tipo`" class="campo">
          <span>Tipo</span>
          <select :id="`${uid}-tipo`" v-model="tipo">
            <option v-for="[valor, etiqueta] in tipos" :key="valor" :value="valor">{{ etiqueta }}</option>
          </select>
        </label>
        <label :for="`${uid}-titulo`" class="campo">
          <span>Nombre</span>
          <input :id="`${uid}-titulo`" v-model="titulo" type="text" placeholder="Parcial 1" maxlength="60" />
        </label>
        <label :for="`${uid}-fecha`" class="campo">
          <span>Fecha</span>
          <input
            :id="`${uid}-fecha`"
            :value="fecha"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            placeholder="dd/mm/aaaa"
            maxlength="10"
            required
            @input="alEscribirFecha"
          />
        </label>
        <label :for="`${uid}-hora`" class="campo">
          <span>Hora</span>
          <input :id="`${uid}-hora`" v-model="hora" type="time" required />
        </label>
      </fieldset>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="submit" class="agregar">Agregar examen</button>
    </form>
  </div>
</template>

<style scoped>
.examenes,
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.vacio,
.error {
  margin: 0;
  font-size: 14px;
}

.vacio-valor {
  color: var(--text-h);
}

.error {
  color: #e5484d;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radio-control);
}

.item-texto {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.item-titulo {
  color: var(--text-h);
  font-size: 14px;
  font-weight: 500;
}

.item-fecha {
  font-size: 13px;
  color: var(--text);
}

.pasado .item-titulo {
  text-decoration: line-through;
  color: var(--text);
}

.campos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  border: 0;
}

.legend {
  margin-bottom: 0.5rem;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-h);
}

.campo {
  display: flex;
  flex: 1 1 8rem;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 13px;
  color: var(--text);
}

.campo--ancho {
  flex-basis: 100%;
}

.campo input,
.campo select {
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radio-control);
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  font-size: 14px;
  color-scheme: light dark;
}

.campo input:focus-visible,
.campo select:focus-visible,
.agregar:focus-visible,
.quitar:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.agregar,
.quitar {
  border-radius: var(--radio-control);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.agregar {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  border: 1px solid var(--accent-border);
  background: var(--accent-bg);
  color: var(--accent-text);
}

.quitar {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
}
</style>
