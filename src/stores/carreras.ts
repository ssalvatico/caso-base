// src/stores/carreras.ts
// Gestiona la lista de carreras del usuario y cuál está activa.
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { refPersistido } from '../utils/persistencia'

export interface Carrera {
  id: string
  nombre: string
  sigla: string
  creadaEn: string
}

interface FilaCarrera {
  id: string
  nombre: string
  sigla: string
  creada_en: string
}

export const useCarrerasStore = defineStore('carreras', () => {
  const lista = ref<Carrera[]>([])
  const cargando = ref(false)
  const error = ref<string | null>(null)

  // La carrera activa se persiste entre sesiones.
  const activaId = refPersistido<string | null>('carreras.activa', () => null)

  const activa = computed(() => lista.value.find(c => c.id === activaId.value) ?? lista.value[0] ?? null)

  async function cargar() {
    cargando.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('carreras')
        .select('id, nombre, sigla, creada_en')
        .order('creada_en', { ascending: true })
      if (err) throw new Error(err.message)
      lista.value = (data as FilaCarrera[] ?? []).map(f => ({
        id: f.id,
        nombre: f.nombre,
        sigla: f.sigla,
        creadaEn: f.creada_en,
      }))
      // Si la carrera activa guardada ya no existe, limpiar.
      if (activaId.value && !lista.value.some(c => c.id === activaId.value)) {
        activaId.value = null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar carreras'
    } finally {
      cargando.value = false
    }
  }

  async function crear(nombre: string, sigla: string): Promise<Carrera | null> {
    const { data, error: err } = await supabase
      .from('carreras')
      .insert({ id: crypto.randomUUID(), nombre: nombre.trim(), sigla: sigla.trim().toUpperCase() })
      .select('id, nombre, sigla, creada_en')
      .single()
    if (err) throw new Error(err.message)
    const nueva: Carrera = {
      id: (data as FilaCarrera).id,
      nombre: (data as FilaCarrera).nombre,
      sigla: (data as FilaCarrera).sigla,
      creadaEn: (data as FilaCarrera).creada_en,
    }
    lista.value = [...lista.value, nueva]
    activaId.value = nueva.id
    return nueva
  }

  async function eliminar(id: string) {
    const { error: err } = await supabase.from('carreras').delete().eq('id', id)
    if (err) throw new Error(err.message)
    lista.value = lista.value.filter(c => c.id !== id)
    if (activaId.value === id) {
      activaId.value = lista.value[0]?.id ?? null
    }
  }

  function activar(id: string) {
    activaId.value = id
  }

  return { lista, activa, activaId, cargando, error, cargar, crear, eliminar, activar }
})
