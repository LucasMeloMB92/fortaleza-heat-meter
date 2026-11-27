import { describe, expect, it } from 'vitest'
import type { RespostaContexto } from './api'
import { textoAnosAnteriores } from './textos'

// Números reais de 26-11-2026 (etapa 2 e /api/contexto).
function contexto(medias: number[], subidas: number[], anomalia: number): RespostaContexto {
  return {
    nome: 'Temperatura média',
    ano_atual: 2026,
    anos_anteriores: [2024, 2025],
    dias_subida: 15,
    dias_anomalia_recente: 10,
    anos: [2024, 2025, 2026].map((ano, i) => ({
      ano,
      inicio: `${ano}-08-28`,
      fim: `${ano}-11-25`,
      dias: 90,
      media: medias[i],
      subida: subidas[i],
    })),
    anomalia_media: anomalia,
    anomalia_recente: anomalia,
    mudanca: { data: '2026-10-15', anomalia_antes: 0.49, anomalia_depois: 0.86 },
    dias: [],
  }
}

describe('textoAnosAnteriores', () => {
  it('separa a estação (todo ano sobe) do nível (anomalia) e cita o degrau', () => {
    const texto = textoAnosAnteriores(contexto([27.34, 27.63, 28.15], [0.95, 0.55, 0.94], 0.66))
    expect(texto).toBe(
      'Em 2026, a temperatura média do período (média dos 90 dias) foi 28,2 °C — 0,66 °C acima do normal ' +
        '(a média de 2024 e 2025 no mesmo dia). Todo ano ela sobe nesse período (2024: +0,95 °C; 2025: +0,55 °C; ' +
        '2026: +0,94 °C) — essa parte é a estação do ano. O que muda em 2026 é o nível; e a partir de 15-10-2026 ' +
        'a diferença para o normal mudou de patamar (de +0,49 °C para +0,86 °C).',
    )
  })

  it('perto do normal: não fala de degrau', () => {
    const texto = textoAnosAnteriores(contexto([27.3, 27.6, 27.5], [0.9, 0.5, 0.1], 0.1))
    expect(texto).toContain('perto do normal')
    expect(texto).toContain('A subida dentro do período variou entre os anos')
    expect(texto).not.toContain('patamar')
  })
})
