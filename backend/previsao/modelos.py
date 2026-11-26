"""Etapa 3 — Os 4 modelos de previsão, todos com a mesma interface.

Uso:
    resultado = prever("sarima", serie, horizonte=7)
    resultado.tabela    -> DataFrame indexado por data: previsao, inferior, superior
    resultado.detalhes  -> o que o modelo escolheu (configuração, AICc, ...)

Cada modelo recebe uma pd.Series diária (índice = datas) e devolve a previsão dos próximos
`horizonte` dias com um intervalo de `nivel` (95% por padrão — decisão D10).

ETS e SARIMA escolhem a própria configuração pelo menor AICc (decisão D28); o SARIMA escolhe
antes o d por teste estatístico (D33). Essa busca faz parte do modelo: roda de novo sobre os
dados de treino que ele receber.
"""

import itertools
import logging
import warnings
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy.stats import norm
from statsmodels.tsa.exponential_smoothing.ets import ETSModel
from statsmodels.tsa.statespace.sarimax import SARIMAX

from previsao.exploracao import teste_adf

NIVEL = 0.95  # tamanho do intervalo (D10)
JANELA_BASE = 7  # linha de base = média dos últimos 7 dias (D07)
MIN_EXEMPLOS_ERRO = 10  # mínimo de erros passados para estimar a faixa da linha de base (D29)

NOMES_MODELOS = {
    "linha_base": "Linha de base (média 7 dias)",
    "ets": "ETS",
    "sarima": "SARIMA",
    "prophet": "Prophet",
}


@dataclass
class Previsao:
    """Resultado de um modelo: a tabela prevista e o que o modelo escolheu."""

    modelo: str
    tabela: pd.DataFrame  # índice "data"; colunas previsao, inferior, superior
    detalhes: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Funções de apoio
# ---------------------------------------------------------------------------


def _preparar(serie: pd.Series) -> pd.Series:
    """Garante índice de datas com frequência diária ("D").

    Com a frequência declarada, o statsmodels sabe que o próximo passo é "amanhã" e já
    devolve as previsões com as datas certas.
    """
    serie = serie.astype(float).copy()
    serie.index = pd.DatetimeIndex(serie.index)
    return serie.asfreq("D")


def _datas_futuras(serie: pd.Series, horizonte: int) -> pd.DatetimeIndex:
    """Os `horizonte` dias seguintes ao último dia da série."""
    return pd.date_range(serie.index[-1] + pd.Timedelta(days=1), periods=horizonte, freq="D")


def _parametros(ajuste) -> dict:
    """Parâmetros estimados de um ajuste do statsmodels, arredondados (para mostrar/documentar).

    Nomes mais comuns: smoothing_level (alpha do ETS), ar.L1 (termo AR), ma.L1 (termo MA),
    drift (tendência por dia), sigma2 (variância do erro).
    """
    nomes = getattr(ajuste, "param_names", None) or list(ajuste.params.index)
    return {nome: round(float(valor), 3) for nome, valor in zip(nomes, ajuste.params, strict=True)}


def _montar(datas, previsao, inferior, superior) -> pd.DataFrame:
    """Monta a tabela padrão que todos os modelos devolvem."""
    return pd.DataFrame(
        {
            "previsao": np.asarray(previsao, dtype=float),
            "inferior": np.asarray(inferior, dtype=float),
            "superior": np.asarray(superior, dtype=float),
        },
        index=pd.DatetimeIndex(datas, name="data"),
    )


# ---------------------------------------------------------------------------
# 1. Linha de base
# ---------------------------------------------------------------------------


def prever_linha_base(serie: pd.Series, horizonte: int = 7, nivel: float = NIVEL) -> Previsao:
    """Previsão = média dos últimos 7 dias, repetida para todos os dias futuros.

    Intervalo (decisão D29): olhamos quanto essa mesma regra ERROU no passado a 1, 2, ..., h
    dias de distância. O desvio-padrão desses erros, vezes 1,96 (para 95%), dá a meia-largura
    da faixa. Quanto mais longe, maior o erro passado -> faixa mais larga.

    Horizonte longo (ex.: caso de estudo, ~42 dias): com h grande sobram poucos exemplos no
    passado para medir o erro. Exigimos pelo menos MIN_EXEMPLOS_ERRO; acima da maior distância
    que dá para medir, repetimos o desvio dessa distância (a faixa para de crescer — limitação).
    """
    serie = _preparar(serie)
    valores = serie.to_numpy()
    valor = valores[-JANELA_BASE:].mean()

    # Exemplos disponíveis para a distância h: len - JANELA_BASE - h + 1.
    h_maximo = len(valores) - JANELA_BASE - MIN_EXEMPLOS_ERRO + 1
    if h_maximo < 1:
        raise ValueError(
            f"Série curta demais para a linha de base: {len(valores)} dias "
            f"(mínimo {JANELA_BASE + MIN_EXEMPLOS_ERRO})."
        )

    desvios = []
    for h in range(1, horizonte + 1):
        distancia = min(h, h_maximo)
        # Para cada dia t do passado: "se eu tivesse previsto em t, quanto erraria h dias depois?"
        erros = [
            valores[t + distancia - 1] - valores[t - JANELA_BASE : t].mean()
            for t in range(JANELA_BASE, len(valores) - distancia + 1)
        ]
        desvios.append(np.std(erros, ddof=1))
    z = norm.ppf(0.5 + nivel / 2)  # 1,96 para 95%
    meia_largura = z * np.array(desvios)

    tabela = _montar(
        _datas_futuras(serie, horizonte),
        np.full(horizonte, valor),
        valor - meia_largura,
        valor + meia_largura,
    )
    return Previsao("linha_base", tabela, {"configuracao": f"média dos últimos {JANELA_BASE} dias"})


# ---------------------------------------------------------------------------
# 2. ETS (suavização exponencial)
# ---------------------------------------------------------------------------

# Candidatos (decisão D30). Nenhum tem sazonalidade: a etapa 2 não achou padrão semanal.
CONFIGS_ETS = {
    "sem tendência": {"trend": None},
    "tendência": {"trend": "add"},
    "tendência amortecida": {"trend": "add", "damped_trend": True},
}


def prever_ets(serie: pd.Series, horizonte: int = 7, nivel: float = NIVEL) -> Previsao:
    """ETS com erro aditivo; a configuração de tendência é escolhida pelo menor AICc."""
    serie = _preparar(serie)

    ranking = []
    for nome, config in CONFIGS_ETS.items():
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")  # avisos de convergência do otimizador
            ajuste = ETSModel(serie, error="add", **config).fit(disp=False)
        ranking.append({"configuracao": nome, "aicc": ajuste.aicc, "ajuste": ajuste})
    ranking.sort(key=lambda c: c["aicc"])
    melhor = ranking[0]

    quadro = (
        melhor["ajuste"]
        .get_prediction(start=len(serie), end=len(serie) + horizonte - 1)
        .summary_frame(alpha=1 - nivel)
    )
    tabela = _montar(
        _datas_futuras(serie, horizonte), quadro["mean"], quadro["pi_lower"], quadro["pi_upper"]
    )
    detalhes = {
        "configuracao": melhor["configuracao"],
        "aicc": round(melhor["aicc"], 2),
        "parametros": _parametros(melhor["ajuste"]),
        "ranking": [(c["configuracao"], round(c["aicc"], 2)) for c in ranking],
    }
    return Previsao("ets", tabela, detalhes)


# ---------------------------------------------------------------------------
# 3. SARIMA
# ---------------------------------------------------------------------------


def escolher_d(serie: pd.Series) -> tuple[int, float]:
    """Escolhe o número de diferenciações (d) por teste estatístico (decisão D33).

    Teste ADF com tendência ("ct"): se a série é estacionária em torno de uma reta
    (p < 0,05), NÃO diferenciamos (d = 0) e modelamos a reta. Caso contrário, d = 1.
    O AICc não serve para escolher d: modelos com d diferente medem o ajuste sobre dados
    diferentes (a série x as diferenças da série), então os AICc não são comparáveis.
    Devolve (d, p-valor do teste).
    """
    p_valor = teste_adf(serie, regressao="ct")["p_valor"]
    return (0 if p_valor < 0.05 else 1), p_valor


def _candidatos_sarima(d: int):
    """Combinações testadas para um d já escolhido (decisão D31).

    - p e q de 0 a 2;
    - parte sazonal de 7 dias (P, Q de 0 a 1) — candidata, para o AICc confirmar ou rejeitar;
    - com ou sem tendência.
    """
    for p, q, sp, sq, tendencia in itertools.product(
        range(3), range(3), range(2), range(2), (False, True)
    ):
        sazonal = (sp, 0, sq, 7) if (sp or sq) else (0, 0, 0, 0)
        yield (p, d, q), sazonal, tendencia


def _termo_tendencia(d: int, tendencia: bool) -> str:
    """Traduz "com/sem tendência" para o parâmetro `trend` do SARIMAX.

    - d = 0: "c" = só um nível constante; "ct" = nível + reta (tendência linear).
    - d = 1: "n" = nada; "t" = uma constante nas diferenças diárias, ou seja, um drift
             (a série sobe/desce em média o mesmo tanto por dia).
    """
    if d == 0:
        return "ct" if tendencia else "c"
    return "t" if tendencia else "n"


def _descrever_sarima(ordem, sazonal, tendencia) -> str:
    texto = f"SARIMA{ordem}"
    texto += f"x{sazonal}" if sazonal[3] else " (sem parte sazonal)"
    if tendencia:
        texto += " + tendência linear" if ordem[1] == 0 else " + drift"
    return texto


def prever_sarima(serie: pd.Series, horizonte: int = 7, nivel: float = NIVEL) -> Previsao:
    """SARIMA: escolhe d por teste e o resto (p, q, P, Q, tendência) pelo menor AICc."""
    serie = _preparar(serie)
    d, p_valor_adf = escolher_d(serie)

    ranking = []
    for ordem, sazonal, tendencia in _candidatos_sarima(d):
        modelo = SARIMAX(
            serie, order=ordem, seasonal_order=sazonal, trend=_termo_tendencia(d, tendencia)
        )
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                ajuste = modelo.fit(disp=False)
        except (ValueError, np.linalg.LinAlgError):
            continue  # alguma combinação pode não convergir; simplesmente pulamos
        ranking.append(
            {
                "configuracao": _descrever_sarima(ordem, sazonal, tendencia),
                "aicc": ajuste.aicc,
                "ajuste": ajuste,
            }
        )
    ranking.sort(key=lambda c: c["aicc"])
    melhor = ranking[0]

    previsao = melhor["ajuste"].get_forecast(horizonte)
    intervalo = previsao.conf_int(alpha=1 - nivel)
    tabela = _montar(
        _datas_futuras(serie, horizonte),
        previsao.predicted_mean,
        intervalo.iloc[:, 0],
        intervalo.iloc[:, 1],
    )
    detalhes = {
        "configuracao": melhor["configuracao"],
        "aicc": round(melhor["aicc"], 2),
        "parametros": _parametros(melhor["ajuste"]),
        "d_escolhido": f"d = {d} (ADF com tendência: p = {p_valor_adf})",
        "candidatos_testados": len(ranking),
        "ranking": [(c["configuracao"], round(c["aicc"], 2)) for c in ranking[:5]],
    }
    return Previsao("sarima", tabela, detalhes)


# ---------------------------------------------------------------------------
# 4. Prophet
# ---------------------------------------------------------------------------


def prever_prophet(serie: pd.Series, horizonte: int = 7, nivel: float = NIVEL) -> Previsao:
    """Prophet sem sazonalidades (decisão D32): sobra a tendência linear por partes.

    O intervalo do Prophet vem de simulações aleatórias; fixamos a semente para que o
    resultado seja sempre o mesmo.
    """
    from prophet import Prophet  # importado aqui: é a biblioteca mais pesada

    logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
    serie = _preparar(serie)
    dados = pd.DataFrame({"ds": serie.index, "y": serie.to_numpy()})

    modelo = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=False,
        daily_seasonality=False,
        interval_width=nivel,
    )
    modelo.fit(dados)
    futuro = modelo.make_future_dataframe(periods=horizonte, include_history=False)
    np.random.seed(0)  # reprodutibilidade das simulações do intervalo
    quadro = modelo.predict(futuro)

    tabela = _montar(futuro["ds"], quadro["yhat"], quadro["yhat_lower"], quadro["yhat_upper"])
    return Previsao("prophet", tabela, {"configuracao": "tendência por partes, sem sazonalidade"})


# ---------------------------------------------------------------------------
# Ponto de entrada único
# ---------------------------------------------------------------------------

MODELOS = {
    "linha_base": prever_linha_base,
    "ets": prever_ets,
    "sarima": prever_sarima,
    "prophet": prever_prophet,
}


def prever(nome: str, serie: pd.Series, horizonte: int = 7, nivel: float = NIVEL) -> Previsao:
    """Roda o modelo `nome` (uma das chaves de MODELOS)."""
    if nome not in MODELOS:
        raise ValueError(f"Modelo desconhecido: {nome!r}. Opções: {list(MODELOS)}")
    return MODELOS[nome](serie, horizonte, nivel)
