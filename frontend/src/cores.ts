// Cores do projeto (decisão D25) — as mesmas dos gráficos gerados em Python.
import type { Cenario, Variavel } from './api'

export const COR_VARIAVEL: Record<Variavel, string> = {
  temperatura: '#2a78d6', // azul
  sensacao: '#eb6834', // laranja
}

export const COR_REAL = '#0b0b0b' // valores reais no período de teste
export const COR_GRADE = '#e6e5e0'
export const COR_EIXO = '#898781'
export const COR_TEXTO_2 = '#52514e'

// Cenários do caso de estudo: "tudo" usa a cor da variável; os outros, cinza e violeta.
export function corCenario(cenario: Cenario, variavel: Variavel): string {
  if (cenario === 'so_antes') return '#898781'
  if (cenario === 'so_depois') return '#6250d6'
  return COR_VARIAVEL[variavel]
}
