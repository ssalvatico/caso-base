<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { X } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'

const router = useRouter()
const dialog = ref<HTMLDialogElement | null>(null)
const nombre = ref('')
const email = ref('')
const confirmandoBorrado = ref(false)
const error = ref<string | null>(null)
const ocupado = ref(false)

async function abrir() {
  // getSession lee la sesión local, así que funciona sin conexión.
  const { data } = await supabase.auth.getSession()
  const usuario = data.session?.user
  email.value = usuario?.email ?? ''
  nombre.value = usuario?.user_metadata?.full_name ?? usuario?.user_metadata?.name ?? ''
  confirmandoBorrado.value = false
  error.value = null
  dialog.value?.showModal()
}

function cerrar() {
  dialog.value?.close()
}

// Cerrar sesión no toca los datos y funciona sin conexión.
async function cerrarSesion() {
  await supabase.auth.signOut({ scope: 'local' })
  cerrar()
  router.replace({ name: 'login' })
}

// Eliminar cuenta requiere conexión y borra todos los datos en Supabase.
async function eliminarCuenta() {
  error.value = null
  if (!navigator.onLine) {
    error.value = 'Necesitás conexión para eliminar la cuenta.'
    return
  }
  ocupado.value = true
  const { error: fallo } = await supabase.rpc('eliminar_cuenta')
  ocupado.value = false
  if (fallo) {
    error.value = `No se pudo eliminar la cuenta: ${fallo.message}`
    return
  }
  // La cuenta ya no existe, así que solo limpiamos la sesión del dispositivo.
  await supabase.auth.signOut({ scope: 'local' })
  cerrar()
  router.replace({ name: 'login' })
}

function cerrarSiClickFuera(event: MouseEvent) {
  if (event.target === dialog.value) cerrar()
}

defineExpose({ abrir })
</script>
<template>
  <dialog ref="dialog" class="perfil" aria-labelledby="perfil-titulo" @click="cerrarSiClickFuera">
    <div class="perfil-contenido">
      <button type="button" class="perfil-cerrar" aria-label="Cerrar" @click="cerrar">
        <X :size="18" aria-hidden="true" />
      </button>
      <h3 id="perfil-titulo">Perfil</h3>
			<hr/>
      <p v-if="nombre"><strong>{{ nombre }}</strong></p>
      <p>{{ email }}</p>
			<div class="perfil-borrar">
				<button type="button" class="btn" @click="cerrarSesion">Cerrar sesión</button>
				<template v-if="!confirmandoBorrado">
						<button type="button" class="btn btn-sm btn-peligro" @click="confirmandoBorrado = true">
							Eliminar cuenta
						</button>
				</template>
				<template v-else>
					<p class="aviso">
						Se borran todas tus sesiones, exámenes y configuración. No se puede deshacer.
					</p>
					<div class="acciones">
						<button type="button" class="btn" :disabled="ocupado" @click="confirmandoBorrado = false">
							Cancelar
						</button>
						<button type="button" class="btn btn-peligro" :disabled="ocupado" @click="eliminarCuenta">
							{{ ocupado ? 'Eliminando…' : 'Sí, eliminar' }}
						</button>
					</div>
				</template>
				<p v-if="error" class="error" role="alert">{{ error }}</p>
			</div>
		</div>
  </dialog>
</template>

<style scoped>
.perfil {
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg);
  color: var(--text);
  box-shadow: var(--shadow);
  max-width: min(90vw, 320px);
  width: 100%;
}

.perfil::backdrop {
  background: rgb(0 0 0 / 0.45);
}

.perfil-contenido {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 1.5rem 1.5rem;
  text-align: center;
}

.perfil-contenido h3 {
  margin: 0;
  color: var(--text-h);
}

.perfil-contenido p {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 0.9rem;
}

.perfil-cerrar {
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

.perfil hr {
  width: 100%;
  margin: 0.5rem 0;
  border: none;
  border-top: 1px solid var(--border);
}

.perfil-borrar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.perfil .btn-sm {
  padding: 0.25rem 0.6rem;
  font-size: 0.80rem;
}

.perfil .aviso,
.perfil .error {
  margin: 0;
  font-size: 0.85rem;
}

.perfil .error {
  color: #e5484d;
}

.perfil .acciones {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}
</style>