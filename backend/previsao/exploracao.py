"""Etapa 2 — Exploração: entender a série antes de modelar.

Perguntas que estas funções respondem:
- A série tem tendência? (média móvel, teste ADF)
- O valor de hoje "lembra" o de ontem? (autocorrelação)
- Existe padrão semanal? (força da sazonalidade de 7 dias)
- A alta recente é estação do ano ou anomalia? (contexto de 3 anos, climatologia)
- Quando aconteceu a mudança? (detecção de ponto de mudança)
"""

from datetime import date

import numpy as np
import pandas as pd
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.stattools import adfuller

from previsao import coleta

# Dados de contexto (3 anos) — usados só para ENTENDER a série, nunca para treinar (D24).
CAMINHO_CONTEXTO = coleta.CAMINHO_CSV.parent / "fortaleza_contexto_3anos.csv"
ANOS_CONTEXTO = 3


# ---------------------------------------------------------------------------
# Análises da série de 90 dias
# ---------------------------------------------------------------------------


def media_movel(serie: pd.Series, janela: int = 7) -> pd.Series:
    """Média dos últimos `janela` dias. Suaviza o ruído diário e revela a tendência."""
    return serie.rolling(janela).mean()


def teste_adf(serie: pd.Series, regressao: str = "c") -> dict:
    """Teste ADF (Dickey-Fuller aumentado) de estacionariedade.

    Hipótese do teste: "a série NÃO é estacionária" (anda sem voltar a um nível fixo).
    p-valor < 0,05 -> rejeitamos essa hipótese -> tratamos a série como estacionária.

    `regressao` diz em torno de quê a série seria estacionária:
    - "c":  em torno de um nível constante (padrão);
    - "ct": em torno de uma reta (tendência linear). Lição da etapa 3 (D33): uma série
            que sobe de forma regular pode falhar no "c" e passar no "ct".
    """
    resultado = adfuller(serie.dropna(), regression=regressao, result_object=True)
    return {
        "estatistica": round(float(resultado.statistic), 3),
        "p_valor": round(float(resultado.pvalue), 3),
        "estacionaria": bool(resultado.pvalue < 0.05),
    }


def forca_sazonal(serie: pd.Series, periodo: int = 7) -> float:
    """Força de um padrão que se repete a cada `periodo` dias, de 0 (nenhum) a 1 (forte).

    A decomposição separa a série em tendência + sazonal + resto (resíduo).
    Força = 1 - var(resto) / var(sazonal + resto)  (medida de Hyndman & Athanasopoulos).
    Se o "padrão sazonal" for só ruído, ele quase não reduz a variância -> força perto de 0.
    """
    decomposicao = seasonal_decompose(serie, period=periodo, model="additive")
    resto = decomposicao.resid.dropna()
    sazonal = decomposicao.seasonal.loc[resto.index]
    return round(float(max(0.0, 1 - resto.var() / (sazonal + resto).var())), 3)


def detectar_mudanca(serie: pd.Series, minimo: int = 10) -> dict:
    """Acha a data que melhor divide a série em dois trechos com médias diferentes.

    Para cada corte possível, calcula o erro de representar cada trecho pela sua média
    (soma dos quadrados dos desvios). O corte com menor erro total é o ponto de mudança.
    `minimo` = tamanho mínimo de cada trecho, para não aceitar "trechos" de 1 ou 2 dias.
    """
    valores = serie.to_numpy()
    melhor_erro, melhor_corte = np.inf, None
    for corte in range(minimo, len(valores) - minimo + 1):
        antes, depois = valores[:corte], valores[corte:]
        erro = ((antes - antes.mean()) ** 2).sum() + ((depois - depois.mean()) ** 2).sum()
        if erro < melhor_erro:
            melhor_erro, melhor_corte = erro, corte

    return {
        "data": serie.index[melhor_corte],  # primeiro dia do trecho "depois"
        "dias_depois": len(valores) - melhor_corte,
        "media_antes": round(float(valores[:melhor_corte].mean()), 2),
        "media_depois": round(float(valores[melhor_corte:].mean()), 2),
    }


# ---------------------------------------------------------------------------
# Contexto de 3 anos
# ---------------------------------------------------------------------------


def baixar_contexto(fim: date, anos: int = ANOS_CONTEXTO) -> pd.DataFrame:
    """Baixa `anos` anos de histórico terminando em `fim` (reaproveita a coleta da etapa 1)."""
    inicio = (pd.Timestamp(fim) - pd.DateOffset(years=anos) + pd.Timedelta(days=1)).date()
    tabela = coleta.buscar_historico(inicio, fim)
    problemas = coleta.verificar_tabela(tabela, inicio, fim)
    if problemas:
        raise ValueError("Contexto incompleto: " + "; ".join(problemas))
    return tabela


def mesmo_periodo_por_ano(
    contexto: pd.DataFrame, inicio: date, fim: date, anos: int = ANOS_CONTEXTO
) -> pd.DataFrame:
    """Recorta o mesmo intervalo do calendário (ex.: 28/08 a 25/11) em cada ano.

    Colunas extras:
    - "ano": ano do recorte;
    - "data_ref": a data "transportada" para o ano atual, para desenhar os anos no mesmo eixo.
    """
    partes = []
    for recuo in range(anos):  # 0 = ano atual, 1 = ano passado, ...
        ini = pd.Timestamp(inicio) - pd.DateOffset(years=recuo)
        f = pd.Timestamp(fim) - pd.DateOffset(years=recuo)
        trecho = contexto[(contexto["data"] >= ini) & (contexto["data"] <= f)].copy()
        trecho["ano"] = f.year
        trecho["data_ref"] = trecho["data"] + pd.DateOffset(years=recuo)
        partes.append(trecho)
    return pd.concat(partes, ignore_index=True)


def climatologia(periodos: pd.DataFrame, ano_atual: int, suavizar: int = 7) -> pd.Series:
    """O "normal" para cada dia: média dos anos ANTERIORES no mesmo dia do calendário.

    Com só 2 anos anteriores a média ainda é ruidosa, então suavizamos com uma média
    móvel centrada de `suavizar` dias (3 dias antes, o dia, 3 dias depois).
    """
    anteriores = periodos[periodos["ano"] != ano_atual]
    media = anteriores.groupby("data_ref")[coleta.COLUNA].mean()
    return media.rolling(suavizar, center=True, min_periods=1).mean()


def anomalia(periodos: pd.DataFrame, ano_atual: int) -> pd.Series:
    """Anomalia = valor do ano atual - climatologia. Positivo = mais quente que o normal."""
    atual = periodos[periodos["ano"] == ano_atual].set_index("data_ref")[coleta.COLUNA]
    normal = climatologia(periodos, ano_atual)
    return atual - normal.reindex(atual.index)
