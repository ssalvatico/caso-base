<script setup lang="ts">
const activeTab = defineModel<string>({ default: "inicio" });

const tabs = [
  { id: "tree", label: "Arbol", icon: "tree" },
  { id: "calendar", label: "Calendario", icon: "calendar" },
  { id: "inicio", label: "Inicio", icon: "home" },
  { id: "timer", label: "Pomodoro", icon: "timer" },
  { id: "stats", label: "Stats", icon: "stats" },
];

function selectTab(id: string) {
  activeTab.value = id;
}

import {
  ChartNoAxesColumnIncreasing,
  Timer,
  House,
  CalendarDays,
  Network
} from "lucide-vue-next";
</script>

<template>
  <nav class="bottom-navigation" aria-label="Navegación principal">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="nav-item"
      :class="{ 
        active: activeTab === tab.id, 
        'nav-item-highlight': tab.id === 'inicio' 
      }"
      :aria-label="tab.label"
      :aria-current="activeTab === tab.id ? 'page' : undefined"
      @click="selectTab(tab.id)"
    >
    
    <!-- Inicio -->
    <House 
      v-if="tab.icon === 'home'"
      :size="tab.id === 'inicio' ? 26 : 24"
      :stroke-width="1.8"
    ></House>
    
    <!-- Pomodoro -->
      <Timer
        v-else-if="tab.icon === 'timer'"
        :size="24"
        :stroke-width="1.8"
      ></Timer>

      <!-- Árbol de materias -->
      <Network
        v-else-if="tab.icon === 'tree'"
        :size="24"
        :stroke-width="1.8"
      ></Network>

      <!-- Calendario -->
      <CalendarDays
        v-else-if="tab.icon === 'calendar'"
        :size="24"
        :stroke-width="1.8"
      ></CalendarDays>
      
      <!-- Estadísticas -->
      <ChartNoAxesColumnIncreasing
        v-else-if="tab.icon === 'stats'"
        :size="24"
        :stroke-width="1.8"
      ></ChartNoAxesColumnIncreasing>

      <span>{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
/* Fija al borde inferior del viewport: no depende del alto de #app (svh/dvh),
   así no se despega cuando el navegador móvil oculta o muestra su barra. */
.bottom-navigation {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;

  display: flex;
  justify-content: space-around;
  align-items: center;

  flex-shrink: 0;
  box-sizing: border-box;
  height: calc(64px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);

  background: var(--bg);
  border-top: 2px solid var(--border);
}

.nav-item {
  position: relative;
  flex: 1;
  height: 100%;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;

  border: none;
  background: transparent;
  color: var(--text);

  font-size: 10px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s ease;
}

.nav-item svg {
  width: 24px;
  height: 24px;

  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav-item.active {
  color: var(--text-h);
  font-weight: 600;
}

/* La pestaña activa se marca con una franja de color en el borde superior. */
.nav-item.active::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 25%;
  right: 25%;
  height: 4px;
  background: var(--accent);
}

/* Estilo de realce para el botón de Inicio */
.nav-item-highlight {
  position: relative;
}

/* Opcional: Estilo de burbuja elevada flotante (descomenta si prefieres estilo flotante clásico estilo app moderna) */


.nav-item-highlight svg {
  background-color: var(--text-h);
  color: var(--bg);
  padding: 10px;
  border-radius: 10%;
  width: 35px;
  height: 35px;
  box-sizing: content-box;
}
.nav-item-highlight.active span {
  font-weight: 700;
  color: var(--accent-text);
} 

</style>
