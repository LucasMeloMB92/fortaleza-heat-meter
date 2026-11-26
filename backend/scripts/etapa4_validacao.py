"""Etapa 4 — Validação: métricas no período de teste e gráfico previsão x real.

Como rodar (a partir da pasta backend/):
    .venv\\Scripts\\python -m scripts.etapa4_validacao
"""

import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
import pandas as pd  # noqa: E402

from previsao import avaliacao, coleta, modelos  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

PASTA_IMG = Path(__file__).resolve().parents[2] / "docs" / "img"
DIAS_TREINO_GRAFICO = 20  # fim do treino mostrado antes do teste

# Mesmas cores e nomes das etapas anteriores (D25).
CORES = {"temperatura_media": "#2a78d6", "sensacao_media": "#eb6834"}
NOMES = {"temperatura_media": "Temperatura média", "sensacao_media": "Sensação térmica média"}
TINTA = "#52514e"
REAL = "#0b0b0b"  # valores reais do teste em preto, para não confundir com a previsão

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


def grafico_teste(series, resultados) -> None:
    """Linhas = variáveis, colunas = modelos. Treino (cor), previsão (tracejada + faixa) e real.

    Real dentro da faixa = círculo preenchido; fora da faixa = "x".
    """
    figura, eixos = plt.subplots(2, 4, figsize=(15, 6.5), sharey="row")
    for linha, variavel in enumerate(coleta.VARIAVEIS):
        treino, _ = avaliacao.separar_treino_teste(series[variavel])
        treino = treino.iloc[-DIAS_TREINO_GRAFICO:]
        cor = CORES[variavel]
        for coluna, nome in enumerate(modelos.MODELOS):
            eixo = eixos[linha, coluna]
            comp = resultados[variavel][nome]["comparacao"]
            metricas = resultados[variavel][nome]["metricas"]

            eixo.plot(treino.index, treino, color=cor, lw=1.5)
            eixo.plot(
                [treino.index[-1], *comp.index],
                [treino.iloc[-1], *comp["previsao"]],
                color=cor,
                lw=1.8,
                ls="--",
            )
            eixo.fill_between(
                comp.index, comp["inferior"], comp["superior"], color=cor, alpha=0.18, lw=0
            )
            eixo.plot(comp.index, comp["real"], color=REAL, lw=1, alpha=0.6)
            dentro, fora = comp[comp["dentro_da_faixa"]], comp[~comp["dentro_da_faixa"]]
            eixo.scatter(dentro.index, dentro["real"], color=REAL, s=18, zorder=4)
            eixo.scatter(fora.index, fora["real"], color=REAL, marker="x", s=36, zorder=4)
            eixo.axvline(treino.index[-1], color="#898781", lw=0.8, ls=":")

            texto = (
                f"MAE {metricas['mae']:.2f} °C\nRMSE {metricas['rmse']:.2f} °C\n"
                f"cobertura {metricas['cobertura']:.0f}%"
            )
            eixo.text(
                0.02, 0.03, texto, transform=eixo.transAxes, fontsize=8, color=TINTA, va="bottom"
            )
            if linha == 0:
                eixo.set_title(modelos.NOMES_MODELOS[nome], loc="left", fontsize=10)
            if coluna == 0:
                eixo.set_ylabel(f"{NOMES[variavel]}\n°C")
            eixo.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=0))
            eixo.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m"))
    figura.suptitle(
        "Teste (16/11–25/11): previsão tracejada + faixa de 95% x real em preto (● dentro, ✕ fora)",
        x=0.01,
        ha="left",
        fontsize=12,
    )
    figura.tight_layout()
    PASTA_IMG.mkdir(parents=True, exist_ok=True)
    figura.savefig(PASTA_IMG / "etapa4_teste.png", dpi=130, bbox_inches="tight")
    plt.close(figura)
    print("\ngráfico salvo: docs/img/etapa4_teste.png")


def main() -> None:
    tabela = coleta.carregar_csv().set_index("data")
    series = {variavel: tabela[variavel] for variavel in coleta.VARIAVEIS}
    treino, teste = avaliacao.separar_treino_teste(tabela)
    print(f"Treino: {treino.index[0].date()} a {treino.index[-1].date()} ({len(treino)} dias)")
    print(f"Teste:  {teste.index[0].date()} a {teste.index[-1].date()} ({len(teste)} dias)")

    resultados = {}
    for variavel, serie in series.items():
        print(f"\n==================== {NOMES[variavel]} ====================")
        metricas, resultados[variavel] = avaliacao.comparar_modelos(serie)

        print("\nConfiguração escolhida no treino de 80 dias:")
        for nome, r in resultados[variavel].items():
            print(f"  {modelos.NOMES_MODELOS[nome]:30s} {r['detalhes']['configuracao']}")

        print("\nMétricas no teste (°C; cobertura em %; mae_vs_linha_base em %):")
        print(metricas.round(2).to_string())

        print("\nErro dia a dia (previsão - real, °C):")
        erros = {nome: r["comparacao"]["erro"] for nome, r in resultados[variavel].items()}
        reais = resultados[variavel]["linha_base"]["comparacao"][["real"]]
        quadro = reais.join(pd.DataFrame(erros)).round(2)
        quadro.index = quadro.index.strftime("%d/%m")
        print(quadro.to_string())

    grafico_teste(series, resultados)


if __name__ == "__main__":
    main()
