"""Testes da exploração com séries sintéticas, cujo comportamento conhecemos de antemão."""

from datetime import date

import numpy as np
import pandas as pd

from previsao import exploracao

DATAS = pd.date_range("2026-01-01", periods=60, freq="D")


def test_detectar_mudanca_acha_degrau_no_lugar_certo():
    # 40 dias em 27 °C e depois 20 dias em 29 °C, com um pouco de ruído.
    ruido = np.random.default_rng(0).normal(0, 0.2, 60)
    serie = pd.Series(np.r_[np.full(40, 27.0), np.full(20, 29.0)] + ruido, index=DATAS)

    resultado = exploracao.detectar_mudanca(serie)

    assert resultado["data"] == DATAS[40]
    assert resultado["dias_depois"] == 20
    assert abs(resultado["media_antes"] - 27) < 0.2
    assert abs(resultado["media_depois"] - 29) < 0.2


def test_forca_sazonal_alta_com_padrao_semanal_e_baixa_com_ruido():
    rng = np.random.default_rng(1)
    padrao = np.tile([0, 1, 2, 3, 2, 1, 0], 9)[:60]  # repete a cada 7 dias
    com_padrao = pd.Series(28 + padrao + rng.normal(0, 0.1, 60), index=DATAS)
    so_ruido = pd.Series(28 + rng.normal(0, 0.5, 60), index=DATAS)

    assert exploracao.forca_sazonal(com_padrao) > 0.9
    assert exploracao.forca_sazonal(so_ruido) < 0.5


def test_adf_reconhece_ruido_estacionario_e_passeio_aleatorio():
    # Atenção: o ADF é um teste estatístico e erra ~5% das vezes. Com a semente 2, por azar,
    # o passeio aleatório deu p = 0,013 (falso "estacionário"). Usamos sementes típicas.
    ruido = pd.Series(np.random.default_rng(2).normal(0, 1, 200))  # oscila em torno de 0
    passeio = pd.Series(np.random.default_rng(1).normal(0, 1, 200)).cumsum()  # "anda" sem voltar

    assert exploracao.teste_adf(ruido)["estacionaria"] is True
    assert exploracao.teste_adf(passeio)["estacionaria"] is False


def _contexto_falso() -> pd.DataFrame:
    """3 anos em que 2024 e 2025 valem 27 °C e 2026 vale 28 °C no mesmo período."""
    datas = pd.date_range("2023-11-26", "2026-11-25", freq="D")
    valor = np.where(datas.year == 2026, 28.0, 27.0)
    return pd.DataFrame({"data": datas, "temperatura_media": valor})


def test_mesmo_periodo_alinha_os_anos_no_calendario_atual():
    periodos = exploracao.mesmo_periodo_por_ano(
        _contexto_falso(), date(2026, 8, 28), date(2026, 11, 25)
    )
    assert sorted(periodos["ano"].unique()) == [2024, 2025, 2026]
    # Cada ano tem 90 dias, e todos caem nas mesmas datas de referência (em 2026).
    assert (periodos.groupby("ano").size() == 90).all()
    assert periodos.groupby("ano")["data_ref"].min().nunique() == 1


def test_anomalia_e_diferenca_para_o_normal_dos_anos_anteriores():
    periodos = exploracao.mesmo_periodo_por_ano(
        _contexto_falso(), date(2026, 8, 28), date(2026, 11, 25)
    )
    anom = exploracao.anomalia(periodos, 2026)

    assert len(anom) == 90
    assert np.allclose(anom, 1.0)  # 28 - 27
