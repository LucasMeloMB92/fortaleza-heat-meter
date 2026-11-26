"""Etapa 5 — Caso de estudo: quebra estrutural (mudança forte de temperatura em outubro/2026).

Pergunta: um modelo que só conhece os dados ANTES da mudança consegue prever DEPOIS dela?

Desenho (decisão D35):
- Data da mudança por variável, detectada na anomalia (diferença para o normal) — D26.
- Três cenários de treino, todos avaliados na MESMA janela de teste (últimos 10 dias):
    "so_antes"  -> do início até a véspera da mudança;
    "tudo"      -> do início até a véspera do teste (o mesmo treino da etapa 4);
    "so_depois" -> da mudança até a véspera do teste (extra: "vale descartar o passado?").
- Cada cenário prevê do fim do seu treino até o fim do teste; só os dias do teste contam.
"""

import pandas as pd

from previsao import avaliacao, coleta, exploracao, modelos

CENARIOS = {
    "so_antes": "Só antes da mudança",
    "tudo": "Tudo (até a véspera do teste)",
    "so_depois": "Só depois da mudança",
}


def datas_de_mudanca(tabela: pd.DataFrame, contexto: pd.DataFrame) -> dict[str, pd.Timestamp]:
    """Detecta a data da mudança de cada variável na anomalia (reaproveita a etapa 2).

    `tabela` = os 90 dias (coluna "data"); `contexto` = os 3 anos de contexto.
    """
    inicio, fim = tabela["data"].min().date(), tabela["data"].max().date()
    periodos = exploracao.mesmo_periodo_por_ano(contexto, inicio, fim)
    anom = exploracao.anomalia(periodos, fim.year)
    return {v: exploracao.detectar_mudanca(anom[v])["data"] for v in coleta.VARIAVEIS}


def montar_cenarios(
    serie: pd.Series, data_mudanca, dias_teste: int = avaliacao.DIAS_TESTE
) -> tuple[dict[str, pd.Series], pd.Series]:
    """Recorta os três treinos e o teste. Devolve ({cenário: treino}, teste)."""
    treino, teste = avaliacao.separar_treino_teste(serie, dias_teste)
    data = pd.Timestamp(data_mudanca)
    if not (treino.index[0] < data <= treino.index[-1]):
        raise ValueError(
            f"A data da mudança ({data.date()}) precisa estar dentro do treino "
            f"({treino.index[0].date()} a {treino.index[-1].date()})."
        )
    cenarios = {
        "so_antes": treino[treino.index < data],
        "tudo": treino,
        "so_depois": treino[treino.index >= data],
    }
    return cenarios, teste


def avaliar_cenarios(
    serie: pd.Series,
    data_mudanca,
    nomes_modelos=None,
    dias_teste: int = avaliacao.DIAS_TESTE,
) -> tuple[pd.DataFrame, dict]:
    """Treina cada modelo em cada cenário e mede o erro na janela de teste.

    Devolve (tabela de métricas indexada por (cenário, modelo), {(cenário, modelo): resultado}).
    O resultado guarda a previsão completa (para o gráfico), a comparação dia a dia e as métricas.
    """
    nomes_modelos = nomes_modelos or list(modelos.MODELOS)
    cenarios, teste = montar_cenarios(serie, data_mudanca, dias_teste)

    linhas, resultados = [], {}
    for cenario, treino in cenarios.items():
        # Prever do dia seguinte ao fim do treino até o último dia do teste.
        horizonte = (teste.index[-1] - treino.index[-1]).days
        for nome in nomes_modelos:
            previsao = modelos.prever(nome, treino, horizonte)
            comparacao, metricas = avaliacao.comparar_com_real(previsao.tabela, teste)
            resultados[(cenario, nome)] = {
                "previsao": previsao.tabela,
                "comparacao": comparacao,
                "metricas": metricas,
                "detalhes": previsao.detalhes,
            }
            linhas.append(
                {
                    "cenario": cenario,
                    "modelo": nome,
                    "dias_treino": len(treino),
                    "horizonte": horizonte,
                    **metricas,
                }
            )
    tabela = pd.DataFrame(linhas).set_index(["cenario", "modelo"])
    return tabela, resultados
