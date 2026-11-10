export type ModoSesion = 'pomodoro' | 'cronometro' | 'manual'

export interface MateriaEstudio {
  id: number
  nombre: string
  corto: string
  anio: number
  color: string
}

// Opción para estudiar sin materia asignada. Vive solo en el Pomodoro y en los registros.
export const MATERIA_COMODIN: MateriaEstudio = {
  id: 0,
  nombre: 'Comodín',
  corto: 'Comodín',
  anio: 0,
  color: '#8a93a6',
}

export interface Sesion {
  // Id para la interfaz. Se pierde al recargar la página: la identidad real es `uuid`.
  id: number
  // Identidad estable para la sincronización. Se genera al crear la sesión.
  uuid: string
  materiaId: number
  // YYYY-MM-DD en hora local
  fecha: string
  // Minutos desde la medianoche
  inicio: number
  fin: number
  // Segundos de foco efectivos (sin descansos)
  foco: number
  modo: ModoSesion
}

export interface ResumenDia {
  fecha: string
  total: number
  porMateria: Record<number, number>
  inicio: number | null
  fin: number | null
  maxSesion: number
  sesiones: Sesion[]
}

export interface ConfigPomodoro {
  foco: number
  corto: number
  largo: number
  ciclos: number
}

export interface Celda {
  id: string
  superior: string
  etiqueta: string
  valor: number
  nivel: number
  fuera?: boolean
  futuro?: boolean
}

export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export const MODOS: Record<ModoSesion, string> = {
  pomodoro: 'Pomodoro',
  cronometro: 'Cronómetro',
  manual: 'Manual',
}

// Umbrales en horas para los niveles 2 a 5. Nivel 0 = sin estudio, nivel 1 = algo de estudio.
export const UMBRALES = {
  dia: [2, 4, 7, 10],
  semana: [10, 20, 30, 45],
  mes: [30, 60, 100, 150],
}

export const pad = (n: number) => String(n).padStart(2, '0')

export function clave(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function desdeClave(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function sumarDias(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  r.setDate(r.getDate() + n)
  return r
}

export function diaSemana(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function inicioSemana(d: Date): Date {
  return sumarDias(d, -diaSemana(d))
}

export function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes + 1, 0).getDate()
}

// hh:mm para totales de foco (siempre dos dígitos en las horas: 01:37).
export function hmm(seg: number): string {
  const m = Math.round(seg / 60)
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

// hh:mm:ss para cronómetros y valores con segundos. Se distingue de hmm por los segundos.
export function hmmss(seg: number): string {
  const s = Math.round(seg)
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

export function horasMinutos(seg: number): string {
  const m = Math.round(seg / 60)
  const h = Math.floor(m / 60)
  return h ? `${h} h ${m % 60} min` : `${m % 60} min`
}

export function horasMinutosCompacto(seg: number): string {
  const m = Math.round(seg / 60)
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function reloj(min: number): string {
  const t = ((Math.round(min) % 1440) + 1440) % 1440
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`
}

export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function fechaLarga(k: string): string {
  const d = desdeClave(k)
  return `${DIAS_LARGOS[diaSemana(d)]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

export function fechaCorta(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function resumenVacio(fecha: string): ResumenDia {
  return { fecha, total: 0, porMateria: {}, inicio: null, fin: null, maxSesion: 0, sesiones: [] }
}

export function agruparPorDia(sesiones: Sesion[]): Map<string, ResumenDia> {
  const mapa = new Map<string, ResumenDia>()
  for (const s of sesiones) {
    let dia = mapa.get(s.fecha)
    if (!dia) {
      dia = resumenVacio(s.fecha)
      mapa.set(s.fecha, dia)
    }
    dia.total += s.foco
    dia.porMateria[s.materiaId] = (dia.porMateria[s.materiaId] ?? 0) + s.foco
    dia.inicio = dia.inicio === null ? s.inicio : Math.min(dia.inicio, s.inicio)
    dia.fin = dia.fin === null ? s.fin : Math.max(dia.fin, s.fin)
    dia.maxSesion = Math.max(dia.maxSesion, s.foco)
    dia.sesiones.push(s)
  }
  for (const dia of mapa.values()) dia.sesiones.sort((a, b) => a.inicio - b.inicio)
  return mapa
}

export function nivel(seg: number, umbrales: number[]): number {
  if (seg <= 0) return 0
  const h = seg / 3600
  return 1 + umbrales.filter(u => h >= u).length
}

// Reparte el foco de cada sesión de forma proporcional entre las horas que abarca.
export function focoPorHora(sesiones: Sesion[]): number[] {
  const horas = Array<number>(24).fill(0)
  for (const s of sesiones) {
    const span = s.fin - s.inicio
    if (span <= 0) continue
    const proporcion = s.foco / (span * 60)
    for (let h = 0; h < 24; h++) {
      const solapa = Math.min(s.fin, (h + 1) * 60) - Math.max(s.inicio, h * 60)
      if (solapa > 0) horas[h] += solapa * 60 * proporcion
    }
  }
  return horas
}

export interface Racha {
  actual: number
  mejor: number
  hoyActivo: boolean
}

const MS_DIA = 86_400_000

// La racha sigue viva si hoy todavía no estudiaste pero ayer sí: se corta recién al terminar el día.
export function calcularRacha(dias: Map<string, ResumenDia>, hoy: Date): Racha {
  const activo = (k: string) => (dias.get(k)?.total ?? 0) > 0
  const hoyActivo = activo(clave(hoy))

  let cursor = hoyActivo ? hoy : sumarDias(hoy, -1)
  let actual = 0
  while (activo(clave(cursor))) {
    actual++
    cursor = sumarDias(cursor, -1)
  }

  const claves = [...dias.keys()].filter(activo).sort()
  let mejor = 0
  let corrida = 0
  claves.forEach((k, i) => {
    const consecutivo = i > 0
      && Math.round((desdeClave(k).getTime() - desdeClave(claves[i - 1]).getTime()) / MS_DIA) === 1
    corrida = consecutivo ? corrida + 1 : 1
    mejor = Math.max(mejor, corrida)
  })

  return { actual, mejor: Math.max(mejor, actual), hoyActivo }
}

export function acumular(valores: number[]): number[] {
  let suma = 0
  return valores.map(v => (suma += v))
}
