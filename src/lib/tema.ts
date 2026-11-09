// Preferencia de apariencia del dispositivo: 'sistema' sigue al celular o al navegador,
// 'claro' y 'oscuro' la fijan. Se guarda solo en este navegador (es una comodidad local).

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

export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement
  raiz.dataset.theme = tema === 'claro' ? 'light' : 'dark'
}

export function guardarTema(tema: Tema): void {
  try {
    localStorage.setItem(CLAVE_TEMA, tema)
  } catch {
  }
  aplicarTema(tema)
}
