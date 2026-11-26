"""Testes da coleta. Não acessam a internet: usam respostas falsas no formato do Open-Meteo."""

from datetime import date

import pandas as pd

from previsao import coleta


def resposta_falsa(datas: list[str], temperaturas: list, sensacoes: list) -> dict:
    """Monta um JSON igual ao que o Open-Meteo devolve."""
    return {
        "daily": {
            "time": datas,
            "temperature_2m_mean": temperaturas,
            "apparent_temperature_mean": sensacoes,
        }
    }


# --- calcular_periodo ---


def test_periodo_tem_90_dias_e_termina_ontem():
    inicio, fim = coleta.calcular_periodo(date(2026, 11, 26))
    assert fim == date(2026, 11, 25)  # ontem
    assert (fim - inicio).days + 1 == 90  # +1 porque os dois extremos contam


# --- resposta_para_tabela ---


def test_resposta_vira_tabela_e_null_vira_nan():
    resposta = resposta_falsa(["2026-11-01", "2026-11-02"], [27.5, None], [30.1, None])
    tabela = coleta.resposta_para_tabela(resposta)

    assert list(tabela.columns) == ["data", "temperatura_media", "sensacao_media"]
    assert tabela.loc[0, "temperatura_media"] == 27.5
    assert pd.isna(tabela.loc[1, "temperatura_media"])  # null da API não pode virar zero


# --- juntar_fontes ---


def test_juntar_prioriza_historico_e_preenche_buraco_com_recentes():
    # Histórico: dia 1 ok, dia 2 ainda sem dado (null), dia 3 não veio.
    historico = coleta.resposta_para_tabela(
        resposta_falsa(["2026-11-01", "2026-11-02"], [27.0, None], [30.0, None])
    )
    # Recentes: têm os 3 dias, com valores um pouco diferentes.
    recentes = coleta.resposta_para_tabela(
        resposta_falsa(
            ["2026-11-01", "2026-11-02", "2026-11-03"], [99.0, 28.0, 28.5], [99.0, 31.0, 31.5]
        )
    )

    tabela = coleta.juntar_fontes(historico, recentes, date(2026, 11, 1), date(2026, 11, 3))

    assert len(tabela) == 3
    # Dia 1 existe no histórico -> fica o valor do histórico (27.0), não o 99.0.
    assert tabela.loc[0, "temperatura_media"] == 27.0
    assert list(tabela["fonte"]) == [
        coleta.FONTE_HISTORICO,
        coleta.FONTE_PREVISAO,
        coleta.FONTE_PREVISAO,
    ]


def test_juntar_corta_dias_fora_do_periodo():
    historico = coleta.resposta_para_tabela(resposta_falsa(["2026-11-01"], [27.0], [30.0]))
    recentes = coleta.resposta_para_tabela(
        resposta_falsa(["2026-11-02", "2026-11-03"], [28.0, 29.0], [31.0, 32.0])
    )
    # Dia 3 é "hoje" na API de previsão: não deve entrar se o período termina no dia 2.
    tabela = coleta.juntar_fontes(historico, recentes, date(2026, 11, 1), date(2026, 11, 2))
    assert tabela["data"].max() == pd.Timestamp("2026-11-02")


# --- verificar_tabela ---


def test_verificar_tabela_completa_nao_tem_problemas():
    tabela = coleta.resposta_para_tabela(
        resposta_falsa(["2026-11-01", "2026-11-02"], [27.0, 28.0], [30.0, 31.0])
    )
    assert coleta.verificar_tabela(tabela, date(2026, 11, 1), date(2026, 11, 2)) == []


def test_verificar_detecta_dia_faltando_duplicado_e_vazio():
    tabela = coleta.resposta_para_tabela(
        resposta_falsa(
            ["2026-11-01", "2026-11-01", "2026-11-03"],  # dia 1 duplicado, dia 2 faltando
            [27.0, 27.0, None],  # dia 3 vazio
            [30.0, 30.0, 31.0],
        )
    )
    problemas = coleta.verificar_tabela(tabela, date(2026, 11, 1), date(2026, 11, 3))
    texto = " ".join(problemas)

    assert "duplicadas" in texto and "2026-11-01" in texto
    assert "faltando" in texto and "2026-11-02" in texto
    assert "temperatura_media" in texto


# --- comparar_sobreposicao ---


def test_sobreposicao_calcula_diferenca_previsao_menos_historico():
    historico = coleta.resposta_para_tabela(
        resposta_falsa(["2026-11-01", "2026-11-02"], [27.0, None], [30.0, None])
    )
    recentes = coleta.resposta_para_tabela(
        resposta_falsa(["2026-11-01", "2026-11-02"], [27.5, 28.0], [29.0, 31.0])
    )
    dif = coleta.comparar_sobreposicao(historico, recentes)

    assert len(dif) == 1  # só o dia 1 tem dado nas duas fontes
    assert dif.loc[0, "dif_temperatura_media"] == 0.5
    assert dif.loc[0, "dif_sensacao_media"] == -1.0


# --- salvar_csv / carregar_csv ---


def test_salvar_e_carregar_csv_preserva_dados(tmp_path):
    # tmp_path é uma pasta temporária criada pelo pytest (não suja o projeto).
    tabela = coleta.resposta_para_tabela(resposta_falsa(["2026-11-01"], [27.0], [30.0]))
    caminho = coleta.salvar_csv(tabela, tmp_path / "teste.csv")
    lida = coleta.carregar_csv(caminho)
    pd.testing.assert_frame_equal(tabela, lida)
