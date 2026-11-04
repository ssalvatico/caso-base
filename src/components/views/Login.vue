<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../../lib/supabase'

const error = ref<string | null>(null)

async function ingresarConGoogle() {
  error.value = null
  if (!navigator.onLine) {
    error.value = 'Necesitás conexión para iniciar sesión.'
    return
  }
  const { error: fallo } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (fallo) error.value = fallo.message
}
</script>

<template>
  <main class="login">
    <h1>caso_base</h1>
    <button type="button" class="btn btn-primario" @click="ingresarConGoogle">
      Ingresar con Google
    </button>
    <p v-if="error" role="alert">{{ error }}</p>
  </main>
</template>