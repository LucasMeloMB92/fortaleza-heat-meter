"""Testes das métricas e da separação treino/teste."""

import numpy as np
import pandas as pd
import pytest

from previsao import avaliacao

# --- Métricas, com contas que dá para fazer de cabeça ---


def test_mae_e_rmse_com_numeros_conhecidos():
    real = [28.0, 28.0, 28.0, 28.0]
    previsto = [29.0, 27.0, 28.0, 30.0]  # erros: +1, -1, 0, +2
    assert avaliacao.mae(real, previsto) == pytest.approx(1.0)  # (1+1+0+2)/4
    assert avaliacao.rmse(real, previsto) == pytest.approx(np.sqrt(1.5))  # (1+1+0+4)/4 = 1,5


def test_rmse_nunca_menor_que_mae():
    rng = np.random.default_rng(0)
    real, previsto = rng.normal(28, 1, 50), rng.normal(28, 1, 50)
    assert avaliacao.rmse(real, previsto) >= avaliacao.mae(real, previsto)


def test_cobertura_conta_os_limites_como_dentro():
    real = [28.0, 29.0, 30.0, 31.0]
    inferior = [27.0, 29.0, 31.0, 30.0]
    superior = [29.0, 30.0, 32.0, 31.0]
    # 28 dentro; 29 no limite (dentro); 30 abaixo da faixa (fora); 31 no limite (dentro)
    assert avaliacao.cobertura(real, inferior, superior) == pytest.approx(75.0)


# --- Separação e avaliação ---


@pytest.fixture(scope="module")
def serie() -> pd.Series:
    rng = np.random.default_rng(3)
    valores = 28 + np.cumsum(rng.normal(0, 0.2, 90)) * 0.3
    return pd.Series(valores, index=pd.date_range("2026-08-28", periods=90, freq="D"))


def test_separacao_usa_os_ultimos_10_dias_como_teste(serie):
    treino, teste = avaliacao.separar_treino_teste(serie)
    assert len(treino) == 80 and len(teste) == 10
    assert treino.index[-1] + pd.Timedelta(days=1) == teste.index[0]  # sem buraco nem sobreposição


def test_sem_vazamento_o_teste_nao_influencia_a_previsao(serie):
    """Se mudarmos os valores do teste, a previsão NÃO pode mudar: o modelo não viu a prova."""
    alterada = serie.copy()
    alterada.iloc[-10:] += 5.0  # teste completamente diferente

    for nome in ("linha_base", "ets"):  # modelos rápidos bastam para provar a separação
        original = avaliacao.avaliar(nome, serie)["comparacao"]["previsao"]
        mexida = avaliacao.avaliar(nome, alterada)["comparacao"]["previsao"]
        pd.testing.assert_series_equal(original, mexida)


def test_avaliar_devolve_comparacao_dia_a_dia(serie):
    resultado = avaliacao.avaliar("linha_base", serie)
    comparacao = resultado["comparacao"]

    assert comparacao.index.equals(serie.index[-10:])
    assert np.allclose(comparacao["real"], serie.iloc[-10:])
    assert np.allclose(comparacao["erro"], comparacao["previsao"] - comparacao["real"])
    assert set(resultado["metricas"]) == {"mae", "rmse", "cobertura", "mae_dias_1_7", "vies"}
