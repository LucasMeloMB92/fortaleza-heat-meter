"""Etapa 5 — Caso de estudo: modelo treinado só antes da mudança x com tudo (x só depois).

Como rodar (a partir da pasta backend/, depois das etapas 1 e 2):
    .venv\\Scripts\\python -m scripts.etapa5_caso_estudo
"""

import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402

from previsao import avaliacao, caso_estudo, coleta, exploracao, modelos  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

PASTA_IMG = Path(__file__).resolve().parents[2] / "docs" / "img"
INICIO_GRAFICO = "2026-09-20"  # mostra ~3 semanas antes da mudança

# Cores (D25): variável na cor dela; os cenários extras em cinza e violeta; real em preto.
CORES = {"temperatura_media": "#2a78d6", "sensacao_media": "#eb6834"}
NOMES = {"temperatura_media": "Temperatura média", "sensacao_media": "Sensação térmica média"}
COR_ANTES = "#898781"
COR_DEPOIS = "#6250d6"
REAL = "#0b0b0b"
TINTA = "#52514e"

plt.rcParams.update(
    {
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.grid": True,
        "grid.color": "#e6e5e0",
        "grid.linewidth": 0.6,
        "axes.edgecolor": "#898781",
        "axes.labelcolor": TINTA,
        "xtick.color": TINTA,
        "ytick.color": TINTA,
        "font.size": 9,
    }
)


def periodo(serie: pd.Series) -> str:
    """'28/08–14/10': primeiro e último dia de uma série."""
    return f"{serie.index[0]:%d/%m}–{serie.index[-1]:%d/%m}"


def grafico(series, datas, resultados, metricas) -> None:
    # Uma coluna por modelo (eram 4; o Chronos-2 é o 5º — D47).
    n = len(modelos.MODELOS)
    figura, eixos = plt.subplots(2, n, figsize=(3.75 * n, 7), sharey="row")
    estilos = {
        "so_antes": {"color": COR_ANTES, "ls": "--", "faixa": True},
        "tudo": {"color": None, "ls": "--", "faixa": True},  # None = cor da variável
        "so_depois": {"color": COR_DEPOIS, "ls": ":", "faixa": False},
    }
    for linha, variavel in enumerate(coleta.VARIAVEIS):
        serie = series[variavel].loc[INICIO_GRAFICO:]
        _, teste = avaliacao.separar_treino_teste(series[variavel])
        for coluna, nome in enumerate(modelos.MODELOS):
            eixo = eixos[linha, coluna]
            eixo.axvspan(teste.index[0], teste.index[-1], color="#e6e5e0", alpha=0.7, lw=0)
            eixo.axvline(datas[variavel], color=TINTA, lw=1, ls=":")
            eixo.plot(serie.index, serie, color=REAL, lw=1.1, label="Real")
            for cenario, estilo in estilos.items():
                prev = resultados[variavel][(cenario, nome)]["previsao"]
                cor = estilo["color"] or CORES[variavel]
                mae = metricas[variavel].loc[(cenario, nome), "mae"]
                eixo.plot(
                    prev.index,
                    prev["previsao"],
                    color=cor,
                    lw=1.8,
                    ls=estilo["ls"],
                    label=f"{caso_estudo.CENARIOS[cenario]} (MAE {mae:.2f})",
                )
                if estilo["faixa"]:
                    eixo.fill_between(
                        prev.index, prev["inferior"], prev["superior"], color=cor, alpha=0.12, lw=0
                    )
            if linha == 0:
                eixo.set_title(modelos.NOMES_MODELOS[nome], loc="left", fontsize=10)
            if coluna == 0:
                eixo.set_ylabel(f"{NOMES[variavel]}\n°C")
            eixo.legend(loc="upper left", frameon=False, fontsize=7)
            eixo.xaxis.set_major_locator(mdates.MonthLocator())
            eixo.xaxis.set_minor_locator(mdates.WeekdayLocator(byweekday=0))
            eixo.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m"))
        # Espaço no topo para a legenda não cobrir as linhas (eixo y é compartilhado na linha).
        baixo, alto = eixos[linha, 0].get_ylim()
        eixos[linha, 0].set_ylim(top=alto + (alto - baixo) * 0.35)
    figura.suptitle(
        "Caso de estudo — linha pontilhada vertical = mudança; faixa cinza = teste (MAE no teste)",
        x=0.01,
        ha="left",
        fontsize=12,
    )
    figura.tight_layout()
    PASTA_IMG.mkdir(parents=True, exist_ok=True)
    figura.savefig(PASTA_IMG / "etapa5_caso_estudo.png", dpi=130, bbox_inches="tight")
    plt.close(figura)
    print("\ngráfico salvo: docs/img/etapa5_caso_estudo.png")


def main() -> None:
    tabela = coleta.carregar_csv()
    contexto = pd.read_csv(exploracao.CAMINHO_CONTEXTO, parse_dates=["data"])
    datas = caso_estudo.datas_de_mudanca(tabela, contexto)
    series = {v: tabela.set_index("data")[v] for v in coleta.VARIAVEIS}

    metricas, resultados = {}, {}
    for variavel, serie in series.items():
        data = datas[variavel]
        print(f"\n========== {NOMES[variavel]} — mudança em {data:%d/%m} ==========")
        cenarios, teste = caso_estudo.montar_cenarios(serie, data)
        for cenario, treino in cenarios.items():
            print(
                f"  {caso_estudo.CENARIOS[cenario]:32s} {periodo(treino)} "
                f"({len(treino)} dias) | média do treino {treino.mean():.2f} °C"
            )
        print(f"  Teste: {periodo(teste)} | média real {teste.mean():.2f} °C")

        metricas[variavel], resultados[variavel] = caso_estudo.avaliar_cenarios(serie, data)
        colunas = ["dias_treino", "horizonte", "mae", "rmse", "cobertura", "vies"]
        print("\nMétricas no teste (°C; cobertura em %):")
        print(metricas[variavel][colunas].round(2).to_string())

        print("\nConfiguração escolhida (ETS / SARIMA) em cada cenário:")
        for cenario in caso_estudo.CENARIOS:
            ets = resultados[variavel][(cenario, "ets")]["detalhes"]["configuracao"]
            sarima = resultados[variavel][(cenario, "sarima")]["detalhes"]["configuracao"]
            print(f"  {cenario:10s} ETS: {ets:22s} SARIMA: {sarima}")

        # Efeito da distância x efeito da quebra: erro do "só antes" logo após a mudança
        # (distância 1–10 dias, igual à do teste normal).
        print(
            "\n'Só antes' nos 10 primeiros dias APÓS a mudança (mesma distância do teste normal):"
        )
        logo_depois = serie.loc[data:].iloc[:10]
        for nome in modelos.MODELOS:
            prev = resultados[variavel][("so_antes", nome)]["previsao"]
            _, m = avaliacao.comparar_com_real(prev, logo_depois)
            print(f"  {modelos.NOMES_MODELOS[nome]:30s} MAE {m['mae']:.2f} | viés {m['vies']:+.2f}")

    grafico(series, datas, resultados, metricas)


if __name__ == "__main__":
    main()
