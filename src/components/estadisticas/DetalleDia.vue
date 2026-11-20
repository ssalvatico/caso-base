<script setup lang="ts">
import { computed } from 'vue'
import { useEstudioStore } from '../../stores/estudio'
import {
  acumular, capitalizar, clave, desdeClave, fechaLarga, focoPorHora, hmm, hmmss, MODOS, pad, reloj, resumenVacio, sumarDias,
} from '../../utils/estudio'
import GraficoComparacion from './GraficoComparacion.vue'
import GraficoDona from './GraficoDona.vue'

const props = defineProps<{ fecha: string }>()
const store = useEstudioStore()

const dia = computed(() => store.porDia.get(props.fecha) ?? resumenVacio(props.fecha))
const anterior = computed(() => store.porDia.get(clave(sumarDias(desdeClave(props.fecha), -1))))

const esHoy = computed(() => props.fecha === clave(new Date()))
const horaActual = new Date().getHours()

const comparacion = computed(() => ({
  actual: acumular(focoPorHora(dia.value.sesiones)),
  anterior: acumular(focoPorHora(anterior.value?.sesiones ?? [])),
  corte: esHoy.value ? horaActual : null,
}))

const ETIQUETAS = [
  { pos: 0, texto: '0:00' },
  { pos: 0.25, texto: '6:00' },
  { pos: 0.5, texto: '12:00' },
  { pos: 0.75, texto: '18:00' },
  { pos: 1, texto: '24:00' },
]

const porMateria = computed(() =>
  store.materias
    .map(m => ({ id: m.id, nombre: m.nombre, color: m.color, valor: dia.value.porMateria[m.id] ?? 0 }))
    .filter(i => i.valor > 0)
    .sort((a, b) => b.valor - a.valor),
)

const bloques = computed(() =>
  dia.value.sesiones.map(s => ({
    s,
    materia: store.materia(s.materiaId),
    izquierda: (s.inicio / 1440) * 100,
    ancho: Math.max(0.6, ((s.fin - s.inicio) / 1440) * 100),
  })),
)
</script>

<template>
  <div class="detalle">
    <section class="tarjeta resumen" aria-labelledby="titulo-dia">
      <h3 id="titulo-dia" class="titulo">{{ capitalizar(fechaLarga(fecha)) }}</h3>
      <dl class="cifras">
        <div><dt>Tiempo total</dt><dd class="num">{{ hmmss(dia.total) }}</dd></div>
        <div><dt>Mayor sesión continua</dt><dd class="num">{{ hmmss(dia.maxSesion) }}</dd></div>
        <div><dt>Hora de inicio</dt><dd class="num">{{ dia.inicio === null ? '—' : reloj(dia.inicio) }}</dd></div>
        <div><dt>Hora de fin</dt><dd class="num">{{ dia.fin === null ? '—' : reloj(dia.fin) }}</dd></div>
      </dl>
      <hr />
      <GraficoComparacion
        :actual="comparacion.actual"
        :anterior="comparacion.anterior"
        :corte="comparacion.corte"
        :etiquetas="ETIQUETAS"
        :texto-corte="esHoy ? `Hasta las ${pad(horaActual)}:00` : 'Día completo'"
        :texto-actual="esHoy ? 'Hoy' : 'Este día'"
        texto-anterior="Día anterior"
      />
    </section>

    <template v-if="dia.total > 0" class="">
      <div v-if="dia.total > 0" class="resumen-dia">
        <section class="tarjeta" aria-labelledby="titulo-linea">
          <h3 id="titulo-linea" class="tarjeta-titulo">Sesiones del día</h3>
          <div class="linea-tiempo" aria-hidden="true">
            <span
              v-for="b in bloques"
              :key="b.s.id"
              class="bloque"
              :style="{ left: `${b.izquierda}%`, width: `${b.ancho}%`, background: b.materia?.color }"
            />
          </div>
          <div class="horas" aria-hidden="true">
            <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
          </div>
          <ul class="sesiones">
            <li v-for="b in bloques" :key="b.s.id">
              <span class="punto-materia" :style="{ background: b.materia?.color }" aria-hidden="true" />
              <span class="nombre">{{ b.materia?.nombre }}</span>
              <span class="modo">{{ MODOS[b.s.modo] }}</span>
              <span class="num horario">{{ reloj(b.s.inicio) }}–{{ reloj(b.s.fin) }}</span>
              <strong class="num">{{ hmm(b.s.foco) }}</strong>
            </li>
          </ul>
        </section>

        <section class="tarjeta" aria-labelledby="titulo-dona-dia">
          <h3 id="titulo-dona-dia" class="tarjeta-titulo">Proporción por materia</h3>
          <GraficoDona :items="porMateria" />
        </section>

      </div>
    </template>
    <p v-else class="tarjeta vacio">No hay tiempo de foco registrado este día.</p>
  </div>
</template>

<style scoped>
.detalle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.titulo {
  margin: 0 0 1rem;
  font-size: 1rem;
  text-align: center;
  color: var(--text-h);
}

.cifras {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 0;
  text-align: center;
}

@media (min-width: 640px) {
  .cifras { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

dt {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent-text);
}

dd {
  margin: 0.2rem 0 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-h);
}

hr {
  margin: 1.25rem 0;
  border: none;
  border-top: 1px solid var(--border);
}

.linea-tiempo {
  position: relative;
  height: 1.75rem;
  border-radius: var(--radio-control);
  background: var(--calor-0);
  overflow: hidden;
}

.bloque {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 4px;
}

.horas {
  display: flex;
  justify-content: space-between;
  margin-top: 0.3rem;
  font-size: 0.72rem;
}

.sesiones {
  display: flex;
  flex-direction: column;
  margin: 0.9rem 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
}

.sesiones li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0;
  border-top: 1px solid var(--border);
}

.nombre {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text-h);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modo {
  font-size: 0.75rem;
}

.horario {
  flex: none;
}

.sesiones strong {
  flex: none;
  width: 3rem;
  text-align: right;
  color: var(--text-h);
}

@media (max-width: 480px) {
  .modo { display: none; }
}

.vacio {
  margin: 0;
  text-align: center;
  font-size: 0.9rem;
}

.resumen-dia {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .resumen-dia {
    grid-template-columns: 1fr 1fr;
  }
}

.tarjeta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tarjeta > :last-child {
  flex: 1;
}
</style>
