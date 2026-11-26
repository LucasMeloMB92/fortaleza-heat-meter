import { describe, expect, it } from 'vitest'
import {
  formatarComSinal,
  formatarData,
  formatarDiaMes,
  formatarGraus,
  formatarNumero,
  formatarPorcentagem,
} from './formatacao'

describe('formatarData (DD-MM-AAAA — pedido do usuário, D41)', () => {
  it('converte AAAA-MM-DD em DD-MM-AAAA', () => {
    expect(formatarData('2026-11-25')).toBe('25-11-2026')
    expect(formatarData('2026-08-28')).toBe('28-08-2026')
  })

  it('não muda o dia por causa de fuso horário (virada do ano)', () => {
    // Com new Date() em UTC-3, 01-01 viraria 31-12 do ano anterior.
    expect(formatarData('2027-01-01')).toBe('01-01-2027')
  })

  it('devolve o texto original se o formato for inesperado', () => {
    expect(formatarData('ontem')).toBe('ontem')
  })

  it('versão curta para eixos: DD-MM', () => {
    expect(formatarDiaMes('2026-11-25')).toBe('25-11')
  })
})

describe('números no padrão brasileiro', () => {
  it('usa vírgula decimal', () => {
    expect(formatarNumero(29.1)).toBe('29,10')
    expect(formatarGraus(29.1, 1)).toBe('29,1 °C')
  })

  it('mostra travessão quando não há valor', () => {
    expect(formatarNumero(null)).toBe('—')
    expect(formatarGraus(undefined)).toBe('—')
  })

  it('mostra o sinal em erros e viés', () => {
    expect(formatarComSinal(0.19)).toBe('+0,19 °C')
    expect(formatarComSinal(-0.24)).toBe('−0,24 °C')
    expect(formatarComSinal(0)).toBe('0,00 °C')
    expect(formatarComSinal(-33.11, '%', 0)).toBe('−33%')
  })

  it('porcentagem sem casas decimais', () => {
    expect(formatarPorcentagem(90)).toBe('90%')
  })
})
