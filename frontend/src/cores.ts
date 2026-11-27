// Cores do projeto (decisão D25) — as mesmas dos gráficos gerados em Python.
import type { Cenario } from './api'

export const COR_TEMPERATURA = '#2a78d6' // azul

export const COR_REAL = '#0b0b0b' // valores reais no período de teste
export const COR_GRADE = '#e6e5e0'
export const COR_EIXO = '#898781'
export const COR_TEXTO_2 = '#52514e'

// Cenários do caso de estudo: "tudo" usa a cor da temperatura; os outros, cinza e violeta.
export function corCenario(cenario: Cenario): string {
  if (cenario === 'so_antes') return '#898781'
  if (cenario === 'so_depois') return '#6250d6'
  return COR_TEMPERATURA
}
