<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import AppLogo from '../AppLogo.vue'

const router = useRouter()

const modo = ref<'ingresar' | 'registrar'>('ingresar')
const nombre = ref('')
const apellido = ref('')
const email = ref('')
const clave = ref('')
const ocupado = ref(false)
const envioIntentado = ref(false)
const error = ref<string | null>(null)
const aviso = ref<string | null>(null)

// Letras (incluidas tildes y ñ) separadas por un único espacio; sin números ni signos.
const SOLO_LETRAS = /^\p{L}+(?: \p{L}+)*$/u
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validarNombre(valor: string, campo: string): string | null {
  const limpio = valor.trim()
  if (!limpio) return `Ingresá tu ${campo}.`
  if (!SOLO_LETRAS.test(limpio)) return `${campo} solo puede tener letras.`
  return null
}

function validarClave(valor: string): string | null {
  if (!valor) return 'Ingresá tu contraseña.'
  if (modo.value === 'ingresar') return null
  if (valor.length < 8) return 'Debe tener al menos 8 caracteres.'
  if (!/\p{Lu}/u.test(valor)) return 'Debe tener al menos una letra mayúscula.'
  if (!/\d/.test(valor)) return 'Debe tener al menos un número.'
  return null
}

// Solo se marcan los errores después de intentar enviar, para no molestar mientras se escribe.
const errores = computed(() => {
  const registrando = modo.value === 'registrar'
  return {
    nombre: registrando ? validarNombre(nombre.value, 'nombre') : null,
    apellido: registrando ? validarNombre(apellido.value, 'apellido') : null,
    email: EMAIL.test(email.value.trim()) ? null : 'Ingresá un email válido.',
    clave: validarClave(clave.value),
  }
})
const hayErrores = computed(() => Object.values(errores.value).some(Boolean))

// Traduce los mensajes más comunes de Supabase; el resto se muestra tal cual.
function traducir(mensaje: string): string {
  if (mensaje.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (mensaje.includes('already registered')) return 'Ya existe una cuenta con ese email.'
  if (mensaje.includes('at least')) return 'La contraseña no cumple con los requisitos.'
  if (mensaje.includes('Email not confirmed')) return 'Confirmá tu email antes de ingresar.'
  return mensaje
}

function cambiarModo(nuevo: 'ingresar' | 'registrar') {
  modo.value = nuevo
  error.value = null
  aviso.value = null
  envioIntentado.value = false
}

// Al cambiar de modo, los campos que ya no aplican dejan de mostrar error.
watch(modo, () => (envioIntentado.value = false))

function sinConexion(): boolean {
  if (navigator.onLine) return false
  error.value = 'Necesitás conexión para iniciar sesión.'
  return true
}

async function ingresarConGoogle() {
  error.value = null
  if (sinConexion()) return
  const { error: fallo } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (fallo) error.value = traducir(fallo.message)
}

async function enviar() {
  error.value = null
  aviso.value = null
  envioIntentado.value = true
  if (hayErrores.value) return
  if (sinConexion()) return
  ocupado.value = true

  const mail = email.value.trim()
  try {
    if (modo.value === 'ingresar') {
      const { error: fallo } = await supabase.auth.signInWithPassword({
        email: mail,
        password: clave.value,
      })
      if (fallo) {
        error.value = traducir(fallo.message)
        return
      }
      await router.replace({ path: '/' })
      return
    }

    const nombreLimpio = nombre.value.trim()
    const apellidoLimpio = apellido.value.trim()
    const { data, error: fallo } = await supabase.auth.signUp({
      email: mail,
      password: clave.value,
      options: {
        // full_name es el campo que lee el perfil; nombre y apellido quedan separados.
        data: {
          nombre: nombreLimpio,
          apellido: apellidoLimpio,
          full_name: `${nombreLimpio} ${apellidoLimpio}`,
        },
        emailRedirectTo: window.location.origin,
      },
    })
    if (fallo) {
      error.value = traducir(fallo.message)
      return
    }
    if (data.session) {
      await router.replace({ path: '/' })
      return
    }
    // Si el proyecto exige confirmar el email, no hay sesión hasta que haga clic en el enlace.
    aviso.value = 'Te mandamos un correo para confirmar la cuenta. Después volvé y entrá con tu email y contraseña.'
    modo.value = 'ingresar'
    clave.value = ''
    envioIntentado.value = false
  } finally {
    ocupado.value = false
  }
}
</script>

<template>
  <main class="login">
    <div class="marca">
      <AppLogo class="marca-logo" />
      <h1>caso_base</h1>
    </div>

    <div class="segmentado" role="group" aria-label="Acceso">
      <button
        type="button"
        :aria-pressed="modo === 'ingresar'"
        :class="{ activo: modo === 'ingresar' }"
        @click="cambiarModo('ingresar')"
      >
        Ingresar
      </button>
      <button
        type="button"
        :aria-pressed="modo === 'registrar'"
        :class="{ activo: modo === 'registrar' }"
        @click="cambiarModo('registrar')"
      >
        Crear cuenta
      </button>
    </div>

    <!-- novalidate: las validaciones son las de este componente, con mensajes en español. -->
    <form class="formulario" novalidate @submit.prevent="enviar">
      <template v-if="modo === 'registrar'">
        <label class="campo">
          Nombre
          <input
            v-model="nombre"
            type="text"
            autocomplete="given-name"
            :aria-invalid="envioIntentado && !!errores.nombre"
            required
          />
          <span v-if="envioIntentado && errores.nombre" class="campo-error">{{ errores.nombre }}</span>
        </label>
        <label class="campo">
          Apellido
          <input
            v-model="apellido"
            type="text"
            autocomplete="family-name"
            :aria-invalid="envioIntentado && !!errores.apellido"
            required
          />
          <span v-if="envioIntentado && errores.apellido" class="campo-error">{{ errores.apellido }}</span>
        </label>
      </template>

      <label class="campo">
        Email
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          :aria-invalid="envioIntentado && !!errores.email"
          required
        />
        <span v-if="envioIntentado && errores.email" class="campo-error">{{ errores.email }}</span>
      </label>

      <label class="campo">
        Contraseña
        <input
          v-model="clave"
          type="password"
          :autocomplete="modo === 'registrar' ? 'new-password' : 'current-password'"
          :aria-invalid="envioIntentado && !!errores.clave"
          required
        />
        <span v-if="modo === 'registrar' && !envioIntentado" class="campo-ayuda">
          Mínimo 8 caracteres, con una mayúscula y un número.
        </span>
        <span v-if="envioIntentado && errores.clave" class="campo-error">{{ errores.clave }}</span>
      </label>

      <button type="submit" class="btn btn-primario" :disabled="ocupado">
        {{ ocupado ? 'Un momento…' : modo === 'registrar' ? 'Crear cuenta' : 'Ingresar' }}
      </button>
    </form>

    <div class="separador" aria-hidden="true">o</div>

    <button type="button" class="btn btn-google" @click="ingresarConGoogle">
      <svg class="google-g" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      Ingresar con Google
    </button>

    <p v-if="aviso" class="aviso" role="status">{{ aviso }}</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </main>
</template>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.9rem;
  width: 100%;
  max-width: 340px;
  margin: 2.5rem auto 0;
  text-align: left;
}

.marca {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.marca-logo {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
}

/* El nombre de la app es el único lugar donde va Monocraft. */
.login h1 {
  margin: 0;
  font-family: "Monocraft", ui-monospace, monospace;
  font-weight: 400;
  font-size: 1.6rem;
  line-height: 1;
}

.segmentado {
  display: flex;
}

.segmentado button {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1.5px solid var(--trazo);
  background: var(--bg);
  color: var(--text-h);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

.segmentado button:first-child {
  border-radius: var(--radio-control) 0 0 var(--radio-control);
}

.segmentado button:last-child {
  border-radius: 0 var(--radio-control) var(--radio-control) 0;
  margin-left: -1.5px;
}

.segmentado button.activo {
  background: var(--accent-bg);
  border-color: var(--text-h);
  color: var(--text-h);
  font-weight: 600;
}

.segmentado button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.formulario .btn {
  margin-top: 0.25rem;
}

.campo input[aria-invalid='true'] {
  border-color: #e5484d;
}

.campo-error {
  font-size: 0.8rem;
  font-weight: 400;
  color: #e5484d;
}

.campo-ayuda {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--text);
}

.separador {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  color: var(--text);
}

.separador::before,
.separador::after {
  content: '';
  flex: 1;
  border-top: 1px solid var(--trazo);
}

.login > .btn {
  width: 100%;
}

.btn-google {
  gap: 0.6rem;
}

.google-g {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.aviso,
.error {
  margin: 0;
  font-size: 0.9rem;
}

.error {
  color: #e5484d;
}
</style>
