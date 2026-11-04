<script setup lang="ts">
import { computed, provide, ref, type Component } from "vue";
import { BookText } from "lucide-vue-next";
import bottomNavigation from "./components/BottomNavBar.vue";
import AppLogo from "./components/AppLogo.vue";
import CreditosDialog from "./components/CreditosDialog.vue";
import Home from "./components/views/Home.vue";
import Timer from "./components/views/Timer.vue";
import Tree from "./components/views/Tree.vue";
import Stats from "./components/views/Stats.vue";
import Calendar from "./components/views/Calendar.vue";
import Subjects from "./components/views/Subjects.vue";
import Records from "./components/views/Records.vue";
import PerfilDialog from "./components/PerfilDialog.vue";
import { User } from "lucide-vue-next";

const perfil = ref<InstanceType<typeof PerfilDialog> | null>(null)
const views: Record<string, Component> = {
  registros: Records,
  inicio: Home,
  timer: Timer,
  tree: Tree,
  stats: Stats,
  calendar: Calendar,
  subjects: Subjects,
}

const creditos = ref<InstanceType<typeof CreditosDialog> | null>(null)

const activeTab = ref("inicio")
const activeView = computed(() => views[activeTab.value] ?? Home)

provide("navegar", (tab: string) => {
  activeTab.value = tab
  window.scrollTo({ top: 0 })
})
</script>

<template>
  <header class="app-header">
    <div class="app-brand">
      <button
        type="button"
        class="app-logo-button"
        aria-label="Ver créditos"
        aria-haspopup="dialog"
        @click="creditos?.abrir()"
      >
        <AppLogo class="app-logo" />
      </button>
      <h2 class="app-title">caso_base</h2>
    </div>

    <div class="app-acciones">
      <button
        type="button"
        class="subjects-button"
        :class="{ active: activeTab === 'subjects' }"
        aria-label="Materias"
        :aria-current="activeTab === 'subjects' ? 'page' : undefined"
        @click="activeTab = 'subjects'"
      >
        <BookText :size="20" :stroke-width="1.8" aria-hidden="true" />
        <span>Materias</span>
      </button>

      <button type="button" class="subjects-button" aria-label="Ver perfil" aria-haspopup="dialog" @click="perfil?.abrir()">
        <User :size="20" :stroke-width="1.8" aria-hidden="true" />
        <span>Perfil</span>
      </button>
    </div>
  </header>
  <main class="view-container">
    <KeepAlive>
      <component :is="activeView" :key="activeTab" />
    </KeepAlive>
  </main>
  <bottomNavigation v-model="activeTab"></bottomNavigation>
  <PerfilDialog ref="perfil" />
  <CreditosDialog ref="creditos" />
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.app-logo-button {
  display: flex;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}

.app-logo-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.app-logo {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  color: var(--text-h);
}

.app-title {
  margin: 0;
  font-family: "Monocraft", ui-monospace, monospace;
  font-weight: 400;
  letter-spacing: 0;
}

.app-acciones {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.subjects-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.subjects-button:hover {
  border-color: currentColor;
}

.subjects-button.active {
  background: var(--text-h);
  border-color: var(--text-h);
  color: var(--bg);
}
.view-container {
  flex: 1;
  padding: 1rem;
  text-align: left;
}
</style>
