<script setup lang="ts">
import { ref } from "vue";
import { X } from "lucide-vue-next";

const dialog = ref<HTMLDialogElement | null>(null)

const autores = [
  { nombre: "clippap", url: "https://github.com/ssalvatico" },
  { nombre: "haiduz", url: "https://github.com/Haiduz" },
]

function abrir() {
  dialog.value?.showModal()
}

function cerrar() {
  dialog.value?.close()
}

function cerrarSiClickFuera(event: MouseEvent) {
  if (event.target === dialog.value) cerrar()
}

defineExpose({ abrir })
</script>

<template>
  <dialog
    ref="dialog"
    class="creditos"
    aria-labelledby="creditos-titulo"
    @click="cerrarSiClickFuera"
  >
    <div class="creditos-contenido">
      <button type="button" class="creditos-cerrar" aria-label="Cerrar" @click="cerrar">
        <X :size="18" aria-hidden="true" />
      </button>
      <p id="creditos-titulo" class="creditos-titulo">Desarrollado por:</p>
      <ul class="creditos-lista">
        <li v-for="autor in autores" :key="autor.nombre">
          <a :href="autor.url" target="_blank" rel="noopener noreferrer">{{ autor.nombre }}</a>
        </li>
      </ul>
    </div>
  </dialog>
</template>

<style scoped>
.creditos {
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg);
  color: var(--text);
  box-shadow: var(--shadow);
  max-width: min(90vw, 280px);
  width: 100%;
}

.creditos::backdrop {
  background: rgb(0 0 0 / 0.45);
}

.creditos-contenido {
  position: relative;
  padding: 1.25rem 1.5rem 1.5rem;
  text-align: center;
}

.creditos-cerrar {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.creditos-cerrar:hover {
  background: var(--accent-bg);
}

.creditos-titulo {
  margin: 0.5rem 0 0.75rem;
  color: var(--text-h);
  font-weight: 600;
}

.creditos-lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-family: "Ubuntu Mono", ui-monospace, monospace;
}

.creditos-lista a {
  color: var(--accent-text);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.creditos-lista a:hover {
  color: var(--accent);
}
</style>
