"""Testes dos modelos com uma série sintética parecida com a real (28 °C, memória de 1 dia)."""

import numpy as np
import pandas as pd
import pytest

from previsao import modelos


@pytest.fixture(scope="module")
def serie() -> pd.Series:
    """90 dias: nível 28 °C, leve alta e dependência do dia anterior (AR(1) com phi = 0,7)."""
    rng = np.random.default_rng(42)
    desvios = np.zeros(90)
    for t in range(1, 90):
        desvios[t] = 0.7 * desvios[t - 1] + rng.normal(0, 0.3)
    valores = 28 + 0.01 * np.arange(90) + desvios
    return pd.Series(valores, index=pd.date_range("2026-08-28", periods=90, freq="D"))


@pytest.fixture(scope="module")
def previsoes(serie) -> dict:
    """Treina cada modelo UMA vez e reaproveita em vários testes (o SARIMA testa 72 combinações)."""
    return {nome: modelos.prever(nome, serie, horizonte=7) for nome in modelos.MODELOS}


# Contrato: todo modelo devolve a mesma estrutura. É isso que a API e as métricas vão usar.
@pytest.mark.parametrize("nome", list(modelos.MODELOS))
def test_contrato_dos_modelos(nome, previsoes):
    resultado = previsoes[nome]
    tabela = resultado.tabela

    assert resultado.modelo == nome
    assert list(tabela.columns) == ["previsao", "inferior", "superior"]
    assert len(tabela) == 7
    # As datas começam no dia seguinte ao último da série e são consecutivas.
    esperadas = pd.date_range("2026-11-26", periods=7, freq="D")
    assert tabela.index.equals(esperadas)
    assert np.isfinite(tabela.to_numpy()).all()
    assert (tabela["inferior"] <= tabela["previsao"]).all()
    assert (tabela["previsao"] <= tabela["superior"]).all()
    # Previsões plausíveis: perto do nível da série (nada de 0 °C ou 100 °C).
    assert tabela["previsao"].between(26, 30).all()
    assert "configuracao" in resultado.detalhes


def test_linha_base_e_a_media_dos_ultimos_7_dias(serie, previsoes):
    tabela = previsoes["linha_base"].tabela
    assert np.allclose(tabela["previsao"], serie.iloc[-7:].mean())


def test_linha_base_faixa_e_simetrica(previsoes):
    tabela = previsoes["linha_base"].tabela
    acima = tabela["superior"] - tabela["previsao"]
    abaixo = tabela["previsao"] - tabela["inferior"]
    assert np.allclose(acima, abaixo)


def test_sarima_e_ets_escolhem_pelo_menor_aicc(previsoes):
    for nome in ("ets", "sarima"):
        detalhes = previsoes[nome].detalhes
        aiccs = [aicc for _, aicc in detalhes["ranking"]]
        assert aiccs == sorted(aiccs)  # ranking em ordem crescente
        assert detalhes["aicc"] == aiccs[0]  # o escolhido é o primeiro


def test_intervalo_maior_fica_mais_largo(serie, previsoes):
    largo = previsoes["sarima"].tabela  # 95%
    estreito = modelos.prever("sarima", serie, nivel=0.80).tabela
    largura_95 = largo["superior"] - largo["inferior"]
    largura_80 = estreito["superior"] - estreito["inferior"]
    assert (largura_95 > largura_80).all()


def test_escolher_d_reta_com_ruido_e_passeio_aleatorio():
    rng = np.random.default_rng(1)
    datas = pd.date_range("2026-01-01", periods=90, freq="D")
    # Oscila em torno de uma reta que sobe -> estacionária em torno da tendência -> d = 0.
    reta = pd.Series(28 + 0.02 * np.arange(90) + rng.normal(0, 0.3, 90), index=datas)
    # Soma acumulada de ruído -> "anda" sem voltar a nenhuma reta -> d = 1.
    passeio = pd.Series(28 + np.cumsum(rng.normal(0, 0.3, 90)), index=datas)

    assert modelos.escolher_d(reta)[0] == 0
    assert modelos.escolher_d(passeio)[0] == 1


def test_modelo_desconhecido_da_erro_claro(serie):
    with pytest.raises(ValueError, match="Modelo desconhecido"):
        modelos.prever("arima_magico", serie)
