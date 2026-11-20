// Preferencia de apariencia del dispositivo: 'claro' (por defecto) u 'oscuro'.
// Se guarda solo en este navegador (es una comodidad local).

export type Tema = 'claro' | 'oscuro'

export const CLAVE_TEMA = 'caso-base-tema'

export const opcionesTema: Tema[] = [
  'claro',
  'oscuro',
]

export function leerTema(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE_TEMA)
    return guardado === 'claro' || guardado === 'oscuro' ? guardado : 'claro';
  } catch {
    return 'claro';
  }
}

// Color distintivo: un par [modo claro, modo oscuro] por opción.
export const CLAVE_ACENTO = 'caso-base-acento'

export const acentos = {
  amarillo: ['#e3b526', '#e3b526'],
  azul: ['#004f99', '#73bcff'],
  verde: ['#00701f', '#45d56d'],
  naranja: ['#f2720c', '#ff8f1e'],
  rosa: ['#ed88c0', '#d772ae'],
} as const

export type Acento = keyof typeof acentos

export function leerAcento(): Acento {
  try {
    const guardado = localStorage.getItem(CLAVE_ACENTO)
    return guardado && guardado in acentos ? (guardado as Acento) : 'amarillo'
  } catch {
    return 'amarillo'
  }
}

export function guardarAcento(acento: Acento): void {
  try {
    localStorage.setItem(CLAVE_ACENTO, acento)
  } catch {
  }
}

// Texto negro o blanco sobre el acento, según luminancia relativa (WCAG).
function textoSobre(hex: string): string {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#1a1a1a' : '#fff'
}

export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement
  raiz.dataset.theme = tema === 'claro' ? 'light' : 'dark'
  const [claro, oscuro] = acentos[leerAcento()]
  const brand = tema === 'claro' ? claro : oscuro
  raiz.style.setProperty('--brand', brand)
  raiz.style.setProperty('--on-accent', textoSobre(brand))
}

export function guardarTema(tema: Tema): void {
  try {
    localStorage.setItem(CLAVE_TEMA, tema)
  } catch {
  }
  aplicarTema(tema)
}
