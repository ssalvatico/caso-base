import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from './lib/supabase'
import App from './App.vue'
import Login from './components/views/Login.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login, meta: { publica: true } },
    { path: '/', name: 'app', component: App },
  ],
})

router.beforeEach(async to => {
  const traeDatosDeLogin = !!to.query.code || to.hash.includes('access_token')
  if (traeDatosDeLogin) return { path: '/' }

  const { data } = await supabase.auth.getSession()
  const logueado = !!data.session

  if (!to.meta.publica && !logueado) return { name: 'login' }
  if (to.meta.publica && logueado) return { path: '/' }
})

export default router