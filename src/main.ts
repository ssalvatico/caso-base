import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import router from './router.ts';
import Root from './Root.vue';

createApp(Root).use(createPinia()).use(router).mount('#app')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
