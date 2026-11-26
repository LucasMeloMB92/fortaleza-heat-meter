"""Etapa 2 — Exploração: números no terminal e gráficos em docs/img/.

Como rodar (a partir da pasta backend/, depois da etapa 1):
    .venv\\Scripts\\python -m scripts.etapa2_exploracao
"""

import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # gera arquivos PNG sem abrir janelas
import matplotlib.dates as mdates  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf  # noqa: E402

from previsao import coleta, exploracao  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

PASTA_IMG = Path(__file__).resolve().parents[2] / "docs" / "img"
DIAS_TESTE = 10  # decisão D06 — só para sombrear o período de teste nos gráficos

# Uma cor fixa por variável em todos os gráficos do projeto (D25).
CORES = {"temperatura_media": "#2a78d6", "sensacao_media": "#eb6834"}
NOMES = {"temperatura_media": "Temperatura média", "sensacao_media": "Sensação térmica média"}
CINZAS = {2024: "#c3c2b7", 2025: "#898781"}  # anos anteriores, em segundo plano
TINTA = "#52514e"  # textos secundários

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
        "font.size": 10,
    }
)


def salvar(figura, nome: str) -> None:
    PASTA_IMG.mkdir(parents=True, exist_ok=True)
    figura.savefig(PASTA_IMG / nome, dpi=130, bbox_inches="tight")
    plt.close(figura)
    print(f"  gráfico salvo: docs/img/{nome}")


def descrever_mudanca(m: dict, separador: str = " | ") -> str:
    """Texto curto de um ponto de mudança, ex.: '15/10 | antes +0.49 → depois +0.86 °C'."""
    return (
        f"{m['data']:%d/%m}{separador}antes {m['media_antes']:+.2f} → "
        f"depois {m['media_depois']:+.2f} °C ({m['dias_depois']} dias depois)"
    )


def formatar_datas(eixo, formato: str = "%d/%m") -> None:
    eixo.xaxis.set_major_formatter(mdates.DateFormatter(formato))


def grafico_series(tabela) -> None:
    """Série diária + média móvel de 7 dias, com o período de teste sombreado."""
    figura, eixos = plt.subplots(2, 1, figsize=(10, 6), sharex=True)
    serie_datas = tabela.set_index("data")
    inicio_teste = tabela["data"].iloc[-DIAS_TESTE]
    for eixo, variavel in zip(eixos, coleta.VARIAVEIS, strict=True):
        serie = serie_datas[variavel]
        eixo.plot(serie.index, serie, color=CORES[variavel], lw=1, alpha=0.45, label="Diário")
        eixo.plot(
            serie.index,
            exploracao.media_movel(serie),
            color=CORES[variavel],
            lw=2,
            label="Média móvel 7 dias",
        )
        eixo.axvspan(inicio_teste, serie.index[-1], color="#e6e5e0", alpha=0.7, lw=0)
        eixo.text(inicio_teste, serie.max(), " teste", color=TINTA, va="top", fontsize=9)
        eixo.set_title(NOMES[variavel], loc="left", fontsize=11)
        eixo.set_ylabel("°C")
        eixo.legend(loc="upper left", frameon=False, fontsize=9)
    formatar_datas(eixos[-1])
    figura.suptitle("Fortaleza — últimos 90 dias", x=0.01, ha="left", fontsize=13)
    salvar(figura, "etapa2_series.png")


def grafico_autocorrelacao(tabela) -> None:
    """ACF e PACF de cada variável (até 20 dias de defasagem)."""
    figura, eixos = plt.subplots(2, 2, figsize=(10, 6))
    for linha, variavel in enumerate(coleta.VARIAVEIS):
        serie = tabela[variavel]
        estilo = {"color": CORES[variavel], "vlines_kwargs": {"colors": CORES[variavel]}}
        plot_acf(serie, lags=20, ax=eixos[linha, 0], title="", **estilo)
        plot_pacf(serie, lags=20, ax=eixos[linha, 1], title="", method="ywm", **estilo)
        eixos[linha, 0].set_title(f"ACF — {NOMES[variavel]}", loc="left", fontsize=10)
        eixos[linha, 1].set_title(f"PACF — {NOMES[variavel]}", loc="left", fontsize=10)
        for eixo in eixos[linha]:
            eixo.set_xlabel("defasagem (dias)")
            # Faixa sombreada = limite de significância (95%). Barras fora dela = correlação real.
            for faixa in eixo.collections:
                faixa.set_facecolor("#e6e5e0")
    figura.tight_layout()
    salvar(figura, "etapa2_autocorrelacao.png")


def grafico_contexto(contexto, periodos, clima, ano_atual: int) -> None:
    """Painel 1: 3 anos contínuos. Painel 2: o mesmo período de cada ano sobreposto."""
    figura, eixos = plt.subplots(2, 2, figsize=(12, 7))
    serie_ctx = contexto.set_index("data")
    for coluna, variavel in enumerate(coleta.VARIAVEIS):
        # Painel 1 — 3 anos contínuos, diário + média móvel de 30 dias
        eixo = eixos[0, coluna]
        serie = serie_ctx[variavel]
        eixo.plot(serie.index, serie, color=CORES[variavel], lw=0.6, alpha=0.3)
        eixo.plot(serie.index, serie.rolling(30, center=True).mean(), color=CORES[variavel], lw=2)
        eixo.axvspan(periodos["data_ref"].min(), serie.index[-1], color="#e6e5e0", alpha=0.7, lw=0)
        eixo.set_title(
            f"{NOMES[variavel]} — 3 anos (linha: média de 30 dias)", loc="left", fontsize=10
        )
        eixo.set_ylabel("°C")
        eixo.xaxis.set_major_locator(mdates.MonthLocator(bymonth=[1, 7]))  # jan e jul
        formatar_datas(eixo, "%m/%y")

        # Painel 2 — mesmo período sobreposto (anos anteriores em cinza, ano atual em cor)
        eixo = eixos[1, coluna]
        for ano, trecho in periodos.groupby("ano"):
            atual = ano == ano_atual
            eixo.plot(
                trecho["data_ref"],
                trecho[variavel],
                color=CORES[variavel] if atual else CINZAS.get(ano, "#898781"),
                lw=2 if atual else 1.2,
                label=str(ano),
                zorder=3 if atual else 2,
            )
        eixo.plot(
            clima.index,
            clima[variavel],
            color="#0b0b0b",
            lw=1.2,
            ls="--",
            label="Normal (média 2024-25)",
        )
        eixo.set_title(f"{NOMES[variavel]} — mesmo período em cada ano", loc="left", fontsize=10)
        eixo.set_ylabel("°C")
        eixo.legend(loc="upper left", frameon=False, fontsize=8, ncol=2)
        formatar_datas(eixo)
    figura.tight_layout()
    salvar(figura, "etapa2_contexto.png")


def grafico_anomalia(anom, mudancas) -> None:
    """Anomalia (ano atual - normal) com o ponto de mudança detectado."""
    figura, eixos = plt.subplots(2, 1, figsize=(10, 6), sharex=True)
    for eixo, variavel in zip(eixos, coleta.VARIAVEIS, strict=True):
        serie = anom[variavel]
        m = mudancas[variavel]
        eixo.axhline(0, color="#898781", lw=1)
        eixo.plot(serie.index, serie, color=CORES[variavel], lw=1.5)
        # Degrau: média antes e depois da mudança
        eixo.hlines(m["media_antes"], serie.index[0], m["data"], color="#0b0b0b", lw=1.2, ls="--")
        eixo.hlines(m["media_depois"], m["data"], serie.index[-1], color="#0b0b0b", lw=1.2, ls="--")
        eixo.axvline(m["data"], color=TINTA, lw=1, ls=":")
        # Rótulo acima dos dados: aumentamos o topo do eixo para abrir espaço.
        topo = serie.max() + (serie.max() - serie.min()) * 0.45
        eixo.set_ylim(top=topo)
        eixo.text(
            m["data"],
            topo,
            " mudança: " + descrever_mudanca(m, separador="\n "),
            color=TINTA,
            va="top",
            fontsize=9,
        )
        eixo.set_title(f"{NOMES[variavel]} — diferença para o normal", loc="left", fontsize=11)
        eixo.set_ylabel("°C acima do normal")
    formatar_datas(eixos[-1])
    salvar(figura, "etapa2_anomalia.png")


def main() -> None:
    tabela = coleta.carregar_csv()
    inicio, fim = tabela["data"].min().date(), tabela["data"].max().date()
    print(f"Série: {inicio} a {fim} ({len(tabela)} dias)\n")

    print("== Estatísticas e testes (90 dias) ==")
    for variavel in coleta.VARIAVEIS:
        serie = tabela.set_index("data")[variavel]
        acfs = [round(float(serie.autocorr(k)), 2) for k in (1, 2, 3, 7)]
        print(f"\n{NOMES[variavel]}")
        print(f"  média {serie.mean():.2f} | desvio {serie.std():.2f}", end="")
        print(f" | mín {serie.min()} | máx {serie.max()}")
        print(f"  autocorrelação (1, 2, 3, 7 dias): {acfs}")
        print(f"  ADF: {exploracao.teste_adf(serie)}")
        print(f"  ADF nas diferenças diárias: {exploracao.teste_adf(serie.diff())}")
        print(f"  força da sazonalidade semanal (0 a 1): {exploracao.forca_sazonal(serie)}")
        mudanca = exploracao.detectar_mudanca(serie)
        print(f"  mudança na série bruta: {descrever_mudanca(mudanca)}")

    print("\n== Contexto de 3 anos ==")
    contexto = exploracao.baixar_contexto(fim)
    contexto.to_csv(exploracao.CAMINHO_CONTEXTO, index=False, date_format="%Y-%m-%d")
    print(f"  {len(contexto)} dias salvos em {exploracao.CAMINHO_CONTEXTO.name}")

    periodos = exploracao.mesmo_periodo_por_ano(contexto, inicio, fim)
    ano_atual = fim.year
    clima = exploracao.climatologia(periodos, ano_atual)
    anom = exploracao.anomalia(periodos, ano_atual)

    print("\n  Média do mesmo período em cada ano (°C):")
    medias = periodos.groupby("ano")[list(coleta.VARIAVEIS)].agg(["mean", "std"]).round(2)
    print("  " + medias.to_string().replace("\n", "\n  "))
    print("\n  Subida dentro do período (média dos últimos 15 dias - primeiros 15 dias):")
    for ano, trecho in periodos.groupby("ano"):
        subida = (
            trecho[list(coleta.VARIAVEIS)].tail(15).mean()
            - trecho[list(coleta.VARIAVEIS)].head(15).mean()
        ).round(2)
        print(f"    {ano}: {subida.to_dict()}")

    print("\n  Anomalia de 2026 (°C acima do normal):")
    mudancas = {}
    for variavel in coleta.VARIAVEIS:
        serie = anom[variavel]
        mudancas[variavel] = exploracao.detectar_mudanca(serie)
        print(f"    {NOMES[variavel]}: média {serie.mean():+.2f}", end="")
        print(f" | últimos 10 dias {serie.tail(10).mean():+.2f}")
        print(f"      mudança detectada: {descrever_mudanca(mudancas[variavel])}")

    print("\n== Gráficos ==")
    grafico_series(tabela)
    grafico_autocorrelacao(tabela)
    grafico_contexto(contexto, periodos, clima, ano_atual)
    grafico_anomalia(anom, mudancas)


if __name__ == "__main__":
    main()
