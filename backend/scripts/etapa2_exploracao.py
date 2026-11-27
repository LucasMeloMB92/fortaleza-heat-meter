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

# Cor fixa da temperatura em todos os gráficos do projeto (D25).
COR = "#2a78d6"
NOME = "Temperatura média"
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


def grafico_series(serie) -> None:
    """Série diária + média móvel de 7 dias, com o período de teste sombreado."""
    figura, eixo = plt.subplots(figsize=(10, 3.5))
    inicio_teste = serie.index[-DIAS_TESTE]
    eixo.plot(serie.index, serie, color=COR, lw=1, alpha=0.45, label="Diário")
    eixo.plot(
        serie.index, exploracao.media_movel(serie), color=COR, lw=2, label="Média móvel 7 dias"
    )
    eixo.axvspan(inicio_teste, serie.index[-1], color="#e6e5e0", alpha=0.7, lw=0)
    eixo.text(inicio_teste, serie.max(), " teste", color=TINTA, va="top", fontsize=9)
    eixo.set_title(NOME, loc="left", fontsize=11)
    eixo.set_ylabel("°C")
    eixo.legend(loc="upper left", frameon=False, fontsize=9)
    formatar_datas(eixo)
    figura.suptitle("Fortaleza — últimos 90 dias", x=0.01, ha="left", fontsize=13)
    salvar(figura, "etapa2_series.png")


def grafico_autocorrelacao(serie) -> None:
    """ACF e PACF (até 20 dias de defasagem)."""
    figura, eixos = plt.subplots(1, 2, figsize=(10, 3.5))
    estilo = {"color": COR, "vlines_kwargs": {"colors": COR}}
    plot_acf(serie, lags=20, ax=eixos[0], title="", **estilo)
    plot_pacf(serie, lags=20, ax=eixos[1], title="", method="ywm", **estilo)
    eixos[0].set_title(f"ACF — {NOME}", loc="left", fontsize=10)
    eixos[1].set_title(f"PACF — {NOME}", loc="left", fontsize=10)
    for eixo in eixos:
        eixo.set_xlabel("defasagem (dias)")
        # Faixa sombreada = limite de significância (95%). Barras fora dela = correlação real.
        for faixa in eixo.collections:
            faixa.set_facecolor("#e6e5e0")
    figura.tight_layout()
    salvar(figura, "etapa2_autocorrelacao.png")


def grafico_contexto(contexto, periodos, clima, ano_atual: int) -> None:
    """Painel 1: 3 anos contínuos. Painel 2: o mesmo período de cada ano sobreposto."""
    figura, eixos = plt.subplots(1, 2, figsize=(12, 3.8))

    # Painel 1 — 3 anos contínuos, diário + média móvel de 30 dias
    eixo = eixos[0]
    serie = contexto.set_index("data")[coleta.COLUNA]
    eixo.plot(serie.index, serie, color=COR, lw=0.6, alpha=0.3)
    eixo.plot(serie.index, serie.rolling(30, center=True).mean(), color=COR, lw=2)
    eixo.axvspan(periodos["data_ref"].min(), serie.index[-1], color="#e6e5e0", alpha=0.7, lw=0)
    eixo.set_title(f"{NOME} — 3 anos (linha: média de 30 dias)", loc="left", fontsize=10)
    eixo.set_ylabel("°C")
    eixo.xaxis.set_major_locator(mdates.MonthLocator(bymonth=[1, 7]))  # jan e jul
    formatar_datas(eixo, "%m/%y")

    # Painel 2 — mesmo período sobreposto (anos anteriores em cinza, ano atual em cor)
    eixo = eixos[1]
    for ano, trecho in periodos.groupby("ano"):
        atual = ano == ano_atual
        eixo.plot(
            trecho["data_ref"],
            trecho[coleta.COLUNA],
            color=COR if atual else CINZAS.get(ano, "#898781"),
            lw=2 if atual else 1.2,
            label=str(ano),
            zorder=3 if atual else 2,
        )
    eixo.plot(clima.index, clima, color="#0b0b0b", lw=1.2, ls="--", label="Normal (média 2024-25)")
    eixo.set_title(f"{NOME} — mesmo período em cada ano", loc="left", fontsize=10)
    eixo.set_ylabel("°C")
    eixo.legend(loc="upper left", frameon=False, fontsize=8, ncol=2)
    formatar_datas(eixo)
    figura.tight_layout()
    salvar(figura, "etapa2_contexto.png")


def grafico_anomalia(anom, m) -> None:
    """Anomalia (ano atual - normal) com o ponto de mudança detectado."""
    figura, eixo = plt.subplots(figsize=(10, 3.5))
    eixo.axhline(0, color="#898781", lw=1)
    eixo.plot(anom.index, anom, color=COR, lw=1.5)
    # Degrau: média antes e depois da mudança
    eixo.hlines(m["media_antes"], anom.index[0], m["data"], color="#0b0b0b", lw=1.2, ls="--")
    eixo.hlines(m["media_depois"], m["data"], anom.index[-1], color="#0b0b0b", lw=1.2, ls="--")
    eixo.axvline(m["data"], color=TINTA, lw=1, ls=":")
    # Rótulo acima dos dados: aumentamos o topo do eixo para abrir espaço.
    topo = anom.max() + (anom.max() - anom.min()) * 0.45
    eixo.set_ylim(top=topo)
    eixo.text(
        m["data"],
        topo,
        " mudança: " + descrever_mudanca(m, separador="\n "),
        color=TINTA,
        va="top",
        fontsize=9,
    )
    eixo.set_title(f"{NOME} — diferença para o normal", loc="left", fontsize=11)
    eixo.set_ylabel("°C acima do normal")
    formatar_datas(eixo)
    salvar(figura, "etapa2_anomalia.png")


def main() -> None:
    tabela = coleta.carregar_csv()
    serie = tabela.set_index("data")[coleta.COLUNA]
    inicio, fim = serie.index[0].date(), serie.index[-1].date()
    print(f"Série: {inicio} a {fim} ({len(serie)} dias)\n")

    print(f"== Estatísticas e testes (90 dias) — {NOME} ==")
    acfs = [round(float(serie.autocorr(k)), 2) for k in (1, 2, 3, 7)]
    print(f"  média {serie.mean():.2f} | desvio {serie.std():.2f}", end="")
    print(f" | mín {serie.min()} | máx {serie.max()}")
    print(f"  autocorrelação (1, 2, 3, 7 dias): {acfs}")
    print(f"  ADF: {exploracao.teste_adf(serie)}")
    print(f"  ADF nas diferenças diárias: {exploracao.teste_adf(serie.diff())}")
    print(f"  força da sazonalidade semanal (0 a 1): {exploracao.forca_sazonal(serie)}")
    print(f"  mudança na série bruta: {descrever_mudanca(exploracao.detectar_mudanca(serie))}")

    print("\n== Contexto de 3 anos ==")
    contexto = exploracao.baixar_contexto(fim)
    contexto.to_csv(exploracao.CAMINHO_CONTEXTO, index=False, date_format="%Y-%m-%d")
    print(f"  {len(contexto)} dias salvos em {exploracao.CAMINHO_CONTEXTO.name}")

    periodos = exploracao.mesmo_periodo_por_ano(contexto, inicio, fim)
    ano_atual = fim.year
    clima = exploracao.climatologia(periodos, ano_atual)
    anom = exploracao.anomalia(periodos, ano_atual)

    print("\n  Média do mesmo período em cada ano (°C):")
    medias = periodos.groupby("ano")[coleta.COLUNA].agg(["mean", "std"]).round(2)
    print("  " + medias.to_string().replace("\n", "\n  "))
    print("\n  Subida dentro do período (média dos últimos 15 dias - primeiros 15 dias):")
    for ano, trecho in periodos.groupby("ano"):
        subida = trecho[coleta.COLUNA].tail(15).mean() - trecho[coleta.COLUNA].head(15).mean()
        print(f"    {ano}: {subida:+.2f} °C")

    print(f"\n  Anomalia de {ano_atual} (°C acima do normal):")
    mudanca = exploracao.detectar_mudanca(anom)
    print(f"    média {anom.mean():+.2f} | últimos 10 dias {anom.tail(10).mean():+.2f}")
    print(f"    mudança detectada: {descrever_mudanca(mudanca)}")

    print("\n== Gráficos ==")
    grafico_series(serie)
    grafico_autocorrelacao(serie)
    grafico_contexto(contexto, periodos, clima, ano_atual)
    grafico_anomalia(anom, mudanca)


if __name__ == "__main__":
    main()
