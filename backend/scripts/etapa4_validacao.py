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

# Mesma cor e nome das etapas anteriores (D25).
COR = "#2a78d6"
NOME = "Temperatura média"
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


def grafico_teste(serie, resultados) -> None:
    """Uma coluna por modelo. Treino (cor), previsão (tracejada + faixa) e real (preto).

    Real dentro da faixa = círculo preenchido; fora da faixa = "x".
    """
    n = len(modelos.MODELOS)
    figura, eixos = plt.subplots(1, n, figsize=(3.75 * n, 3.6), sharey=True)
    treino, teste = avaliacao.separar_treino_teste(serie)
    treino = treino.iloc[-DIAS_TREINO_GRAFICO:]
    for coluna, nome in enumerate(modelos.MODELOS):
        eixo = eixos[coluna]
        comp = resultados[nome]["comparacao"]
        metricas = resultados[nome]["metricas"]

        eixo.plot(treino.index, treino, color=COR, lw=1.5)
        eixo.plot(
            [treino.index[-1], *comp.index],
            [treino.iloc[-1], *comp["previsao"]],
            color=COR,
            lw=1.8,
            ls="--",
        )
        eixo.fill_between(
            comp.index, comp["inferior"], comp["superior"], color=COR, alpha=0.18, lw=0
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
        eixo.text(0.02, 0.03, texto, transform=eixo.transAxes, fontsize=8, color=TINTA, va="bottom")
        eixo.set_title(modelos.NOMES_MODELOS[nome], loc="left", fontsize=10)
        if coluna == 0:
            eixo.set_ylabel(f"{NOME}\n°C")
        eixo.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=0))
        eixo.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m"))
    figura.suptitle(
        f"Teste ({teste.index[0]:%d/%m}–{teste.index[-1]:%d/%m}): previsão tracejada + faixa "
        "de 95% x real em preto (● dentro, ✕ fora)",
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
    serie = coleta.carregar_csv().set_index("data")[coleta.COLUNA]
    treino, teste = avaliacao.separar_treino_teste(serie)
    print(f"Treino: {treino.index[0].date()} a {treino.index[-1].date()} ({len(treino)} dias)")
    print(f"Teste:  {teste.index[0].date()} a {teste.index[-1].date()} ({len(teste)} dias)")

    metricas, resultados = avaliacao.comparar_modelos(serie)

    print(f"\nConfiguração escolhida no treino de {len(treino)} dias:")
    for nome, r in resultados.items():
        print(f"  {modelos.NOMES_MODELOS[nome]:30s} {r['detalhes']['configuracao']}")

    print("\nMétricas no teste (°C; cobertura em %; mae_vs_linha_base em %):")
    print(metricas.round(2).to_string())

    print("\nErro dia a dia (previsão - real, °C):")
    erros = {nome: r["comparacao"]["erro"] for nome, r in resultados.items()}
    reais = resultados["linha_base"]["comparacao"][["real"]]
    quadro = reais.join(pd.DataFrame(erros)).round(2)
    quadro.index = quadro.index.strftime("%d/%m")
    print(quadro.to_string())

    grafico_teste(serie, resultados)


if __name__ == "__main__":
    main()
