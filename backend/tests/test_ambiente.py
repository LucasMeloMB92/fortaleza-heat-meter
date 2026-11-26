"""Testes de fumaça: confirmam que o ambiente Python está pronto para a POC.

Se algum falhar, o problema é de instalação, não do nosso código.
"""

import logging

import pandas as pd


def test_bibliotecas_importam():
    # Se alguma biblioteca não estiver instalada, o import levanta erro e o teste falha.
    import flask  # noqa: F401
    import flask_cors  # noqa: F401
    import matplotlib  # noqa: F401
    import requests  # noqa: F401
    import statsmodels  # noqa: F401


def test_prophet_treina_serie_pequena():
    # O Prophet depende do CmdStan (um programa compilado). Em Windows é o ponto
    # mais frágil da instalação, então treinamos uma série minúscula para provar que funciona.
    from prophet import Prophet

    logging.getLogger("cmdstanpy").setLevel(logging.WARNING)  # menos mensagens no terminal

    # 30 dias de dados fictícios com leve tendência de alta.
    serie = pd.DataFrame(
        {
            "ds": pd.date_range("2026-01-01", periods=30, freq="D"),
            "y": [27 + 0.05 * i for i in range(30)],
        }
    )
    modelo = Prophet(yearly_seasonality=False, daily_seasonality=False)
    modelo.fit(serie)
    futuro = modelo.make_future_dataframe(periods=3)
    previsao = modelo.predict(futuro)

    # Deve devolver 33 linhas (30 do histórico + 3 previstas) com média e intervalo.
    assert len(previsao) == 33
    assert {"yhat", "yhat_lower", "yhat_upper"} <= set(previsao.columns)
