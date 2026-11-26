"""Etapa 1 — Coleta dos dados diários de Fortaleza no Open-Meteo.

Fluxo:
1. Calcula o período: os 90 dias que terminam ONTEM (o último dia completo).
2. Baixa a API histórica com models=best_match (decisão D21). Em Fortaleza ela já vem
   completa até ontem e usa o mesmo modelo de alta resolução da API de previsão.
3. Baixa os últimos dias da API de previsão (parâmetro past_days) como RESERVA, caso a
   API histórica atrase algum dia.
4. Junta as duas fontes: o histórico tem prioridade; a previsão só preenche os dias faltantes.
5. Verifica se a tabela está completa (sem dias faltando, duplicados ou vazios).

As funções são pequenas e separadas para poderem ser testadas sem internet.
"""

import os
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import requests

# --- Configuração do local (decisão D03) ---
LATITUDE = -3.72
LONGITUDE = -38.54
FUSO = "America/Fortaleza"

# --- Período (decisões D04 e D20) ---
DIAS = 90  # tamanho da série
DIAS_RECENTES = 30  # quantos dias pedir à API de previsão com past_days (decisão D21)

URL_HISTORICO = "https://archive-api.open-meteo.com/v1/archive"
# "best_match" = o Open-Meteo escolhe o melhor modelo para o local. NÃO usamos "era5" puro:
# ele tem ~6 dias de atraso e, em Fortaleza, fica ~0,6 °C mais frio que a API de previsão.
# Emendar as duas fontes criaria um salto artificial nos últimos dias (decisão D21).
MODELO_HISTORICO = "best_match"
URL_PREVISAO = "https://api.open-meteo.com/v1/forecast"

# Nome da coluna no nosso CSV -> nome da variável na API do Open-Meteo (decisão D02).
VARIAVEIS = {
    "temperatura_media": "temperature_2m_mean",
    "sensacao_media": "apparent_temperature_mean",
}

# Valores possíveis da coluna "fonte" (de onde veio cada dia).
FONTE_HISTORICO = "historico"
FONTE_PREVISAO = "previsao_past_days"

# Caminho padrão do CSV: backend/data/fortaleza_diario.csv
CAMINHO_CSV = Path(__file__).resolve().parents[1] / "data" / "fortaleza_diario.csv"


def calcular_periodo(hoje: date, dias: int = DIAS) -> tuple[date, date]:
    """Devolve (início, fim) do período: `dias` dias terminando ontem.

    Não usamos o dia de hoje porque a média de hoje ainda está incompleta
    (parte das horas é observada e parte é previsão).
    """
    fim = hoje - timedelta(days=1)
    inicio = fim - timedelta(days=dias - 1)  # -1 porque o próprio dia "fim" já conta
    return inicio, fim


def _parametros_comuns() -> dict:
    """Parâmetros iguais nas duas APIs: local, fuso e quais variáveis diárias queremos."""
    return {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "timezone": FUSO,
        "daily": ",".join(VARIAVEIS.values()),
    }


def _baixar_json(url: str, parametros: dict) -> dict:
    """Faz a requisição HTTP e devolve o JSON. Levanta erro se a API falhar."""
    resposta = requests.get(url, params=parametros, timeout=30)
    resposta.raise_for_status()  # erro claro se vier 4xx/5xx em vez de seguir com lixo
    return resposta.json()


def resposta_para_tabela(resposta: dict) -> pd.DataFrame:
    """Converte o JSON do Open-Meteo numa tabela com uma linha por dia.

    O JSON vem assim: {"daily": {"time": [...], "temperature_2m_mean": [...], ...}}.
    Dias sem dado chegam como null (None) e viram NaN ("não é um número") no pandas.
    """
    diario = resposta["daily"]
    tabela = pd.DataFrame({"data": pd.to_datetime(diario["time"])})
    for nome_coluna, nome_api in VARIAVEIS.items():
        tabela[nome_coluna] = pd.to_numeric(pd.Series(diario[nome_api]), errors="coerce")
    return tabela


def buscar_historico(inicio: date, fim: date) -> pd.DataFrame:
    """Baixa a API histórica (archive) para o período pedido."""
    parametros = _parametros_comuns() | {
        "start_date": inicio.isoformat(),
        "end_date": fim.isoformat(),
        "models": MODELO_HISTORICO,
    }
    return resposta_para_tabela(_baixar_json(URL_HISTORICO, parametros))


def buscar_recentes(dias: int = DIAS_RECENTES) -> pd.DataFrame:
    """Baixa os últimos `dias` dias da API de previsão (parâmetro past_days)."""
    parametros = _parametros_comuns() | {"past_days": dias, "forecast_days": 1}
    return resposta_para_tabela(_baixar_json(URL_PREVISAO, parametros))


def juntar_fontes(
    historico: pd.DataFrame, recentes: pd.DataFrame, inicio: date, fim: date
) -> pd.DataFrame:
    """Junta histórico e recentes, dando prioridade ao histórico.

    - Linhas com algum valor vazio são descartadas (a API histórica devolve null nos dias
      que ainda não processou).
    - Da fonte "recentes" só entram os dias que NÃO existem no histórico.
    - O resultado fica limitado ao período [início, fim] e ganha a coluna "fonte".
    """
    colunas = list(VARIAVEIS)
    hist = historico.dropna(subset=colunas).assign(fonte=FONTE_HISTORICO)
    rec = recentes.dropna(subset=colunas).assign(fonte=FONTE_PREVISAO)
    rec = rec[~rec["data"].isin(hist["data"])]  # "~" significa "NÃO"

    tabela = pd.concat([hist, rec]).sort_values("data")
    no_periodo = (tabela["data"] >= pd.Timestamp(inicio)) & (tabela["data"] <= pd.Timestamp(fim))
    return tabela[no_periodo].reset_index(drop=True)


def verificar_tabela(tabela: pd.DataFrame, inicio: date, fim: date) -> list[str]:
    """Lista os problemas da tabela. Lista vazia = tabela completa e pronta para usar."""
    problemas = []

    duplicadas = tabela.loc[tabela["data"].duplicated(), "data"]
    if not duplicadas.empty:
        problemas.append(f"Datas duplicadas: {[d.date().isoformat() for d in duplicadas]}")

    esperadas = pd.date_range(inicio, fim, freq="D")
    # DatetimeIndex: tipo que o difference() espera (evita aviso do verificador de tipos).
    faltando = esperadas.difference(pd.DatetimeIndex(tabela["data"]))
    if not faltando.empty:
        problemas.append(f"Dias faltando: {[d.date().isoformat() for d in faltando]}")

    vazios = tabela[list(VARIAVEIS)].isna().sum()
    for coluna, quantidade in vazios.items():
        if quantidade > 0:
            problemas.append(f"Coluna {coluna} tem {quantidade} valor(es) vazio(s)")

    return problemas


def comparar_sobreposicao(historico: pd.DataFrame, recentes: pd.DataFrame) -> pd.DataFrame:
    """Compara as duas fontes nos dias em que AMBAS têm dado.

    As APIs usam modelos diferentes (reanálise x previsão), então os valores não batem
    exatamente. Medir essa diferença mostra quanto "ruído" a junção pode introduzir.
    Devolve uma linha por dia com a diferença (previsão - histórico) de cada variável.
    """
    colunas = list(VARIAVEIS)
    juntas = historico.dropna(subset=colunas).merge(
        recentes.dropna(subset=colunas), on="data", suffixes=("_hist", "_prev")
    )
    diferencas = pd.DataFrame({"data": juntas["data"]})
    for coluna in colunas:
        diferencas[f"dif_{coluna}"] = juntas[f"{coluna}_prev"] - juntas[f"{coluna}_hist"]
    return diferencas


def coletar(hoje: date | None = None) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Executa a coleta completa.

    Devolve (tabela final, comparação da sobreposição entre fontes).
    Levanta ValueError se a tabela final tiver problemas.
    """
    hoje = hoje or date.today()
    inicio, fim = calcular_periodo(hoje)

    historico = buscar_historico(inicio, fim)
    recentes = buscar_recentes()

    tabela = juntar_fontes(historico, recentes, inicio, fim)
    problemas = verificar_tabela(tabela, inicio, fim)
    if problemas:
        raise ValueError("Coleta incompleta: " + "; ".join(problemas))

    return tabela, comparar_sobreposicao(historico, recentes)


def salvar_csv(tabela: pd.DataFrame, caminho: Path = CAMINHO_CSV) -> Path:
    """Salva a tabela em CSV (datas no formato AAAA-MM-DD) de forma ATÔMICA (decisão D44).

    Escreve primeiro num arquivo temporário e só então troca pelo definitivo (os.replace).
    Se algo falhar no meio da escrita, o CSV antigo continua inteiro — nunca fica pela metade.
    """
    caminho.parent.mkdir(parents=True, exist_ok=True)
    temporario = caminho.with_name(caminho.name + ".tmp")
    tabela.to_csv(temporario, index=False, date_format="%Y-%m-%d")
    os.replace(temporario, caminho)
    return caminho


def carregar_csv(caminho: Path = CAMINHO_CSV) -> pd.DataFrame:
    """Lê o CSV salvo, já convertendo a coluna de data."""
    return pd.read_csv(caminho, parse_dates=["data"])
