"""Etapa 6 — Serviço da API: monta os dados de cada resposta (sem nada de HTTP aqui).

O app.py (Flask) só lê os parâmetros da requisição, chama estas funções e devolve JSON.
Separar assim permite testar a lógica sem servidor (decisão D15).

Cache (decisão D37): treinar modelos é lento (SARIMA ~10 s, caso de estudo ~30 s). Cada
resultado é calculado no PRIMEIRO pedido e guardado na memória (functools.lru_cache); os
pedidos seguintes são instantâneos. Os dados vêm do CSV da etapa 1 — para atualizar, rode a
coleta de novo e reinicie o servidor.
"""

import math
from functools import lru_cache

import pandas as pd

from previsao import avaliacao, caso_estudo, coleta, exploracao, modelos

# Identificadores usados na API -> coluna do CSV (decisão D38).
VARIAVEIS_API = {"temperatura": "temperatura_media", "sensacao": "sensacao_media"}
NOMES_VARIAVEIS = {"temperatura": "Temperatura média", "sensacao": "Sensação térmica média"}

VARIAVEL_PADRAO = "temperatura"
MODELO_PADRAO = "sarima"  # o mais consistente na validação (etapa 4)
HORIZONTE_PADRAO, HORIZONTE_MINIMO, HORIZONTE_MAXIMO = 7, 1, 14
DIAS_TREINO_NO_TESTE = 20  # quantos dias do fim do treino acompanham o gráfico de teste


class ErroParametro(ValueError):
    """Parâmetro inválido na requisição. O app.py transforma isso em resposta HTTP 400."""

    def __init__(self, parametro: str, mensagem: str, valores_aceitos=None):
        super().__init__(mensagem)
        self.parametro = parametro
        self.mensagem = mensagem
        self.valores_aceitos = valores_aceitos


# ---------------------------------------------------------------------------
# Validação dos parâmetros
# ---------------------------------------------------------------------------


def validar_variavel(valor: str | None) -> str:
    valor = valor or VARIAVEL_PADRAO
    if valor not in VARIAVEIS_API:
        raise ErroParametro(
            "variavel", f"Variável inválida: {valor!r}.", valores_aceitos=list(VARIAVEIS_API)
        )
    return valor


def validar_modelo(valor: str | None, obrigatorio: bool = True) -> str | None:
    if not valor:
        return MODELO_PADRAO if obrigatorio else None
    if valor not in modelos.MODELOS:
        raise ErroParametro(
            "modelo", f"Modelo inválido: {valor!r}.", valores_aceitos=list(modelos.MODELOS)
        )
    return valor


def validar_horizonte(valor: str | None) -> int:
    if valor in (None, ""):
        return HORIZONTE_PADRAO
    faixa = f"um número inteiro de {HORIZONTE_MINIMO} a {HORIZONTE_MAXIMO}"
    try:
        horizonte = int(valor)
    except ValueError:
        raise ErroParametro("horizonte", f"Horizonte inválido: {valor!r}. Use {faixa}.") from None
    if not HORIZONTE_MINIMO <= horizonte <= HORIZONTE_MAXIMO:
        raise ErroParametro("horizonte", f"Horizonte fora do limite: {horizonte}. Use {faixa}.")
    return horizonte


# ---------------------------------------------------------------------------
# Conversão para JSON
# ---------------------------------------------------------------------------


def _numero(valor):
    """Número com 2 casas; NaN/None vira None (JSON não aceita NaN)."""
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        return None
    return round(float(valor), 2)


def _data(valor) -> str:
    return pd.Timestamp(valor).strftime("%Y-%m-%d")


def _pontos(serie: pd.Series) -> list[dict]:
    """Série -> [{"data": "2026-11-25", "valor": 29.1}, ...]."""
    return [{"data": _data(d), "valor": _numero(v)} for d, v in serie.items()]


def _faixa(tabela: pd.DataFrame) -> list[dict]:
    """Tabela de previsão -> [{"data", "previsao", "inferior", "superior"}, ...]."""
    return [
        {
            "data": _data(d),
            "previsao": _numero(linha["previsao"]),
            "inferior": _numero(linha["inferior"]),
            "superior": _numero(linha["superior"]),
        }
        for d, linha in tabela.iterrows()
    ]


def _metricas(m: dict) -> dict:
    return {chave: _numero(valor) for chave, valor in m.items()}


def _periodo(serie: pd.Series) -> dict:
    return {"inicio": _data(serie.index[0]), "fim": _data(serie.index[-1]), "dias": len(serie)}


# ---------------------------------------------------------------------------
# Cálculos com cache (cada um roda uma vez por combinação de parâmetros)
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def _tabela() -> pd.DataFrame:
    return coleta.carregar_csv().set_index("data")


def _serie(variavel: str) -> pd.Series:
    return _tabela()[VARIAVEIS_API[variavel]]


@lru_cache(maxsize=64)
def _prever(variavel: str, modelo: str, horizonte: int) -> modelos.Previsao:
    return modelos.prever(modelo, _serie(variavel), horizonte)


@lru_cache(maxsize=4)
def _validacao(variavel: str):
    return avaliacao.comparar_modelos(_serie(variavel))


@lru_cache(maxsize=1)
def _datas_de_mudanca() -> dict:
    contexto = pd.read_csv(exploracao.CAMINHO_CONTEXTO, parse_dates=["data"])
    return caso_estudo.datas_de_mudanca(_tabela().reset_index(), contexto)


@lru_cache(maxsize=4)
def _caso_estudo(variavel: str):
    data = _datas_de_mudanca()[VARIAVEIS_API[variavel]]
    metricas, resultados = caso_estudo.avaliar_cenarios(_serie(variavel), data)
    return data, metricas, resultados


def limpar_cache() -> None:
    """Esquece todos os resultados guardados (usado nos testes)."""
    for funcao in (_tabela, _prever, _validacao, _datas_de_mudanca, _caso_estudo):
        funcao.cache_clear()


# ---------------------------------------------------------------------------
# Uma função por endpoint
# ---------------------------------------------------------------------------


def saude() -> dict:
    serie = _serie(VARIAVEL_PADRAO)
    return {"status": "ok", "dados": _periodo(serie)}


def opcoes() -> dict:
    return {
        "variaveis": [
            {"id": v, "nome": NOMES_VARIAVEIS[v], "unidade": "°C"} for v in VARIAVEIS_API
        ],
        "modelos": [{"id": m, "nome": modelos.NOMES_MODELOS[m]} for m in modelos.MODELOS],
        "padroes": {"variavel": VARIAVEL_PADRAO, "modelo": MODELO_PADRAO},
        "horizonte": {
            "padrao": HORIZONTE_PADRAO,
            "minimo": HORIZONTE_MINIMO,
            "maximo": HORIZONTE_MAXIMO,
        },
        "nivel_intervalo": modelos.NIVEL,
    }


def serie(variavel: str) -> dict:
    dados = _serie(variavel)
    return {
        "variavel": variavel,
        "nome": NOMES_VARIAVEIS[variavel],
        "unidade": "°C",
        "periodo": _periodo(dados),
        "dados": _pontos(dados),
    }


def previsao(variavel: str, modelo: str, horizonte: int) -> dict:
    resultado = _prever(variavel, modelo, horizonte)
    return {
        "variavel": variavel,
        "modelo": modelo,
        "nome_modelo": modelos.NOMES_MODELOS[modelo],
        "horizonte": horizonte,
        "nivel_intervalo": modelos.NIVEL,
        "configuracao": resultado.detalhes.get("configuracao"),
        "historico": _pontos(_serie(variavel)),
        "previsao": _faixa(resultado.tabela),
    }


def metricas(variavel: str) -> dict:
    tabela, resultados = _validacao(variavel)
    _, teste = avaliacao.separar_treino_teste(_serie(variavel))
    return {
        "variavel": variavel,
        "teste": _periodo(teste),
        "metricas": [
            {
                "modelo": nome,
                "nome_modelo": modelos.NOMES_MODELOS[nome],
                "configuracao": resultados[nome]["detalhes"].get("configuracao"),
                **_metricas(tabela.loc[nome].to_dict()),
            }
            for nome in tabela.index
        ],
    }


def teste(variavel: str, modelo: str) -> dict:
    _, resultados = _validacao(variavel)
    resultado = resultados[modelo]
    treino, teste_ = avaliacao.separar_treino_teste(_serie(variavel))
    dias = [
        {
            "data": _data(d),
            "real": _numero(linha["real"]),
            "previsao": _numero(linha["previsao"]),
            "inferior": _numero(linha["inferior"]),
            "superior": _numero(linha["superior"]),
            "erro": _numero(linha["erro"]),
            "dentro_da_faixa": bool(linha["dentro_da_faixa"]),
        }
        for d, linha in resultado["comparacao"].iterrows()
    ]
    return {
        "variavel": variavel,
        "modelo": modelo,
        "nome_modelo": modelos.NOMES_MODELOS[modelo],
        "configuracao": resultado["detalhes"].get("configuracao"),
        "teste": _periodo(teste_),
        "metricas": _metricas(resultado["metricas"]),
        "treino_final": _pontos(treino.iloc[-DIAS_TREINO_NO_TESTE:]),
        "dias": dias,
    }


def caso(variavel: str, modelo: str | None = None) -> dict:
    data, tabela, resultados = _caso_estudo(variavel)
    cenarios, teste_ = caso_estudo.montar_cenarios(_serie(variavel), data)
    nomes = [modelo] if modelo else list(modelos.MODELOS)
    return {
        "variavel": variavel,
        "data_mudanca": _data(data),
        "teste": _periodo(teste_),
        "cenarios": [
            {
                "id": cenario,
                "nome": caso_estudo.CENARIOS[cenario],
                **_periodo(treino),
                "media_treino": _numero(treino.mean()),
            }
            for cenario, treino in cenarios.items()
        ],
        "real": _pontos(_serie(variavel)),
        "resultados": [
            {
                "cenario": cenario,
                "modelo": nome,
                "nome_modelo": modelos.NOMES_MODELOS[nome],
                "horizonte": int(tabela.loc[(cenario, nome), "horizonte"]),
                "metricas": _metricas(resultados[(cenario, nome)]["metricas"]),
                "previsao": _faixa(resultados[(cenario, nome)]["previsao"]),
            }
            for cenario in caso_estudo.CENARIOS
            for nome in nomes
        ],
    }
