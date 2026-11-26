"""Etapa 4 — Validação: o quanto cada modelo acerta em dias que ele nunca viu.

Método (decisão D06): separamos os últimos 10 dias como TESTE. O modelo treina só com os
dias anteriores (inclusive a busca de configuração pelo AICc), prevê 10 dias à frente e
comparamos com o que realmente aconteceu.

Métricas (decisão D08):
- MAE  = média do |erro|, em °C.
- RMSE = raiz da média do erro², em °C (pesa mais os erros grandes).
- Cobertura = % dos dias reais que caíram dentro da faixa de 95%.
Extras (decisão D34): MAE nos dias 1–7 (o horizonte do produto) e MAE relativo à linha de base.
Largura da faixa (decisão D48): distância média entre o limite de cima e o de baixo, em °C.
Lida junto com a cobertura: uma faixa larga "acerta" com facilidade, mas diz pouco.
"""

import numpy as np
import pandas as pd

from previsao import modelos

DIAS_TESTE = 10  # decisão D06
HORIZONTE_PRODUTO = 7  # decisão D05


# ---------------------------------------------------------------------------
# Métricas
# ---------------------------------------------------------------------------


def mae(real, previsto) -> float:
    """Erro absoluto médio: em média, quantos °C a previsão errou (para cima ou para baixo)."""
    return float(np.mean(np.abs(np.asarray(real) - np.asarray(previsto))))


def rmse(real, previsto) -> float:
    """Raiz do erro quadrático médio: como o MAE, mas um erro de 2 °C pesa 4x um de 1 °C."""
    return float(np.sqrt(np.mean((np.asarray(real) - np.asarray(previsto)) ** 2)))


def cobertura(real, inferior, superior) -> float:
    """Porcentagem (0 a 100) dos valores reais dentro da faixa [inferior, superior]."""
    real = np.asarray(real)
    dentro = (real >= np.asarray(inferior)) & (real <= np.asarray(superior))
    return float(100 * dentro.mean())


def largura_faixa(inferior, superior) -> float:
    """Largura média da faixa, em °C (D48). Menor = previsão mais útil, se a cobertura for boa."""
    return float(np.mean(np.asarray(superior) - np.asarray(inferior)))


# ---------------------------------------------------------------------------
# Avaliação
# ---------------------------------------------------------------------------


def separar_treino_teste(serie: pd.Series, dias_teste: int = DIAS_TESTE):
    """Treino = tudo menos os últimos `dias_teste` dias; teste = os últimos `dias_teste` dias."""
    return serie.iloc[:-dias_teste], serie.iloc[-dias_teste:]


def comparar_com_real(prevista: pd.DataFrame, real: pd.Series) -> tuple[pd.DataFrame, dict]:
    """Compara uma previsão com os valores reais, dia a dia, nas datas de `real`.

    `prevista` é a tabela de um modelo (previsao, inferior, superior); ela pode cobrir mais dias
    que `real` (ex.: caso de estudo, que prevê de mais longe) — só as datas de `real` contam.
    Devolve (tabela dia a dia, métricas). Usada pela validação (etapa 4) e pelo caso de estudo.
    """
    comparacao = prevista.loc[real.index].copy()
    comparacao.insert(0, "real", real.to_numpy())
    comparacao["erro"] = comparacao["previsao"] - comparacao["real"]  # + = previu alto demais
    comparacao["dentro_da_faixa"] = (comparacao["real"] >= comparacao["inferior"]) & (
        comparacao["real"] <= comparacao["superior"]
    )

    primeiros = comparacao.iloc[:HORIZONTE_PRODUTO]
    metricas = {
        "mae": mae(comparacao["real"], comparacao["previsao"]),
        "rmse": rmse(comparacao["real"], comparacao["previsao"]),
        "cobertura": cobertura(comparacao["real"], comparacao["inferior"], comparacao["superior"]),
        "mae_dias_1_7": mae(primeiros["real"], primeiros["previsao"]),
        "vies": float(comparacao["erro"].mean()),  # + = em média previu alto demais
        "largura_faixa": largura_faixa(comparacao["inferior"], comparacao["superior"]),
    }
    return comparacao, metricas


def avaliar(nome: str, serie: pd.Series, dias_teste: int = DIAS_TESTE) -> dict:
    """Treina o modelo `nome` no treino, prevê o período de teste e calcula as métricas.

    Devolve {"comparacao": tabela dia a dia, "metricas": dict, "detalhes": o que o modelo escolheu}.
    """
    treino, teste = separar_treino_teste(serie, dias_teste)
    resultado = modelos.prever(nome, treino, horizonte=dias_teste)
    comparacao, metricas = comparar_com_real(resultado.tabela, teste)
    return {"comparacao": comparacao, "metricas": metricas, "detalhes": resultado.detalhes}


def comparar_modelos(serie: pd.Series, dias_teste: int = DIAS_TESTE) -> tuple[pd.DataFrame, dict]:
    """Avalia todos os modelos (modelos.MODELOS) na mesma série.

    Devolve (tabela de métricas — uma linha por modelo, {nome: resultado completo de avaliar}).
    A coluna "mae_vs_linha_base" diz quanto % o MAE do modelo é menor (-) ou maior (+) que o
    da linha de base: -20% = erra 20% menos que a regra simples.
    """
    resultados = {nome: avaliar(nome, serie, dias_teste) for nome in modelos.MODELOS}
    tabela = pd.DataFrame({nome: r["metricas"] for nome, r in resultados.items()}).T
    tabela.index.name = "modelo"
    mae_base = tabela.loc["linha_base", "mae"]
    tabela["mae_vs_linha_base"] = 100 * (tabela["mae"] / mae_base - 1)
    return tabela, resultados
