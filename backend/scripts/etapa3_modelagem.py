"""Etapa 3 — Modelagem: treina os 5 modelos nos 90 dias e prevê os próximos 7.

Como rodar (a partir da pasta backend/):
    .venv\\Scripts\\python -m scripts.etapa3_modelagem
"""

import sys
import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402

from previsao import coleta, modelos  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

PASTA_IMG = Path(__file__).resolve().parents[2] / "docs" / "img"
HORIZONTE = 7
DIAS_HISTORICO_GRAFICO = 30  # mostrar só o fim do histórico, para a previsão aparecer bem

# Mesma cor e nome da etapa 2 (D25).
COR = "#2a78d6"
NOME = "Temperatura média"
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


def grafico_previsoes(serie, resultados) -> None:
    """Uma coluna por modelo: histórico + previsão + faixa de 95%."""
    n = len(modelos.MODELOS)
    figura, eixos = plt.subplots(1, n, figsize=(3.75 * n, 3.6), sharey=True)
    historico = serie.iloc[-DIAS_HISTORICO_GRAFICO:]
    for coluna, nome in enumerate(modelos.MODELOS):
        eixo = eixos[coluna]
        prev = resultados[nome].tabela
        eixo.plot(historico.index, historico, color=COR, lw=1.5)
        # Liga o último dia real ao primeiro previsto, para a linha não ficar "solta".
        datas = [historico.index[-1], *prev.index]
        valores = [historico.iloc[-1], *prev["previsao"]]
        eixo.plot(datas, valores, color=COR, lw=1.8, ls="--")
        eixo.fill_between(
            prev.index, prev["inferior"], prev["superior"], color=COR, alpha=0.18, lw=0
        )
        eixo.axvline(historico.index[-1], color="#898781", lw=0.8, ls=":")
        eixo.set_title(modelos.NOMES_MODELOS[nome], loc="left", fontsize=10)
        if coluna == 0:
            eixo.set_ylabel(f"{NOME}\n°C")
        eixo.xaxis.set_major_locator(mdates.WeekdayLocator(byweekday=0, interval=2))
        eixo.xaxis.set_major_formatter(mdates.DateFormatter("%d/%m"))
    figura.suptitle(
        "Previsão dos próximos 7 dias (tracejada) com faixa de 95% — últimos 30 dias de histórico",
        x=0.01,
        ha="left",
        fontsize=12,
    )
    figura.tight_layout()
    PASTA_IMG.mkdir(parents=True, exist_ok=True)
    figura.savefig(PASTA_IMG / "etapa3_previsoes.png", dpi=130, bbox_inches="tight")
    plt.close(figura)
    print("\ngráfico salvo: docs/img/etapa3_previsoes.png")


def main() -> None:
    serie = coleta.carregar_csv().set_index("data")[coleta.COLUNA]
    inicio, fim = serie.index[0].date(), serie.index[-1].date()
    print(f"Treino: {inicio} a {fim} ({len(serie)} dias) | previsão: {HORIZONTE} dias seguintes")
    print(f"último valor real: {serie.iloc[-1]}", end="")
    print(f" | média dos últimos 7 dias: {serie.iloc[-7:].mean():.2f}")

    resultados = {}
    for nome in modelos.MODELOS:
        inicio = time.perf_counter()
        resultado = modelos.prever(nome, serie, HORIZONTE)
        segundos = time.perf_counter() - inicio
        resultados[nome] = resultado

        print(f"\n--- {modelos.NOMES_MODELOS[nome]} ({segundos:.1f} s) ---")
        print(f"configuração escolhida: {resultado.detalhes['configuracao']}")
        if "d_escolhido" in resultado.detalhes:
            print(f"diferenciação: {resultado.detalhes['d_escolhido']}")
        if "parametros" in resultado.detalhes:
            print(f"parâmetros estimados: {resultado.detalhes['parametros']}")
        if "ranking" in resultado.detalhes:
            print("ranking por AICc (menor = melhor):")
            for config, aicc in resultado.detalhes["ranking"]:
                print(f"  {aicc:8.2f}  {config}")
        if "candidatos_testados" in resultado.detalhes:
            print(f"candidatos testados: {resultado.detalhes['candidatos_testados']}")
        # Inclinação: quanto a previsão sobe (+) ou desce (-) por dia, em média.
        # Mesma régua para todos os modelos (o "drift" interno do statsmodels usa outra escala).
        p = resultado.tabela["previsao"]
        print(f"inclinação da previsão: {(p.iloc[-1] - p.iloc[0]) / (len(p) - 1):+.3f} °C/dia")
        prev = resultado.tabela.round(2)
        prev["largura"] = (prev["superior"] - prev["inferior"]).round(2)
        prev.index = prev.index.strftime("%d/%m")
        print(prev.to_string())

    grafico_previsoes(serie, resultados)


if __name__ == "__main__":
    main()
