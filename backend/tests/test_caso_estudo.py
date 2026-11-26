"""Testes do caso de estudo com uma série que tem um degrau conhecido (27 °C -> 29 °C)."""

import numpy as np
import pandas as pd
import pytest

from previsao import caso_estudo

DATAS = pd.date_range("2026-08-28", periods=90, freq="D")
DATA_MUDANCA = DATAS[50]  # o degrau acontece no 51º dia


@pytest.fixture(scope="module")
def serie_com_degrau() -> pd.Series:
    """50 dias em ~27 °C e 40 dias em ~29 °C (degrau de +2 °C), com pouco ruído."""
    ruido = np.random.default_rng(7).normal(0, 0.15, 90)
    return pd.Series(np.r_[np.full(50, 27.0), np.full(40, 29.0)] + ruido, index=DATAS)


def test_cenarios_recortam_os_treinos_certos(serie_com_degrau):
    cenarios, teste = caso_estudo.montar_cenarios(serie_com_degrau, DATA_MUDANCA)

    assert len(teste) == 10
    assert len(cenarios["tudo"]) == 80
    assert cenarios["so_antes"].index[-1] == DATA_MUDANCA - pd.Timedelta(days=1)
    assert cenarios["so_depois"].index[0] == DATA_MUDANCA
    assert len(cenarios["so_antes"]) + len(cenarios["so_depois"]) == 80
    # Nenhum treino pode conter dias do teste.
    for treino in cenarios.values():
        assert treino.index[-1] < teste.index[0]


def test_data_fora_do_treino_da_erro_claro(serie_com_degrau):
    with pytest.raises(ValueError, match="dentro do treino"):
        caso_estudo.montar_cenarios(serie_com_degrau, DATAS[-3])  # cai no teste


def test_modelo_so_antes_fica_preso_no_nivel_antigo(serie_com_degrau):
    """A lição do caso de estudo: quem só viu 27 °C continua prevendo ~27 °C depois do degrau."""
    tabela, _ = caso_estudo.avaliar_cenarios(
        serie_com_degrau, DATA_MUDANCA, nomes_modelos=["linha_base"]
    )
    vies = tabela["vies"].xs("linha_base", level="modelo")

    assert vies["so_antes"] == pytest.approx(-2.0, abs=0.2)  # previu 2 °C abaixo
    assert abs(vies["tudo"]) < 0.2  # usa os últimos 7 dias -> já está no nível novo
    assert abs(vies["so_depois"]) < 0.2


def test_horizonte_vai_ate_o_fim_do_teste(serie_com_degrau):
    tabela, resultados = caso_estudo.avaliar_cenarios(
        serie_com_degrau, DATA_MUDANCA, nomes_modelos=["linha_base"]
    )
    # "so_antes" termina na véspera da mudança -> precisa prever 40 dias para chegar ao fim.
    assert tabela.loc[("so_antes", "linha_base"), "horizonte"] == 40
    assert tabela.loc[("tudo", "linha_base"), "horizonte"] == 10
    # A comparação usa só os 10 dias do teste, mesmo quando a previsão é mais longa.
    assert len(resultados[("so_antes", "linha_base")]["comparacao"]) == 10
