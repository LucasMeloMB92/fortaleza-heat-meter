"""Testes da atualização automática (D44). Sem internet e SEM tocar nos CSVs reais:
os dados são copiados para uma pasta temporária e a coleta do Open-Meteo é simulada.
"""

import shutil
from datetime import timedelta

import pandas as pd
import pytest

from previsao import coleta, exploracao, servico


@pytest.fixture
def dados(tmp_path, monkeypatch):
    """Cópia dos CSVs reais numa pasta temporária; o serviço passa a usar a cópia."""
    csv = tmp_path / "fortaleza_diario.csv"
    contexto = tmp_path / "fortaleza_contexto_3anos.csv"
    shutil.copy(coleta.CAMINHO_CSV, csv)
    shutil.copy(exploracao.CAMINHO_CONTEXTO, contexto)
    monkeypatch.setattr(coleta, "CAMINHO_CSV", csv)
    monkeypatch.setattr(exploracao, "CAMINHO_CONTEXTO", contexto)
    monkeypatch.setattr(
        servico, "_estado", {"ultima_falha_em": None, "erro": None, "atualizado_em": None}
    )
    servico.limpar_cache()
    yield {"csv": csv, "ultimo_dia": coleta.carregar_csv(csv)["data"].max().date()}
    servico.limpar_cache()


def fingir_hoje(monkeypatch, dia):
    monkeypatch.setattr(servico, "hoje_em_fortaleza", lambda: dia)


def coleta_falsa(chamadas: list):
    """Simula o Open-Meteo devolvendo os mesmos dados + 1 dia novo no fim."""

    def coletar(hoje):
        chamadas.append(hoje)
        tabela = coleta.carregar_csv(coleta.CAMINHO_CSV)
        novo = tabela.iloc[[-1]].copy()
        novo["data"] = novo["data"] + pd.Timedelta(days=1)
        return pd.concat([tabela.iloc[1:], novo], ignore_index=True), pd.DataFrame()

    return coletar


def contexto_falso(fim):
    return pd.read_csv(exploracao.CAMINHO_CONTEXTO, parse_dates=["data"])


def test_dados_em_dia_nao_chamam_o_open_meteo(dados, monkeypatch):
    fingir_hoje(monkeypatch, dados["ultimo_dia"] + timedelta(days=1))  # ontem = último dia
    monkeypatch.setattr(coleta, "coletar", lambda hoje: pytest.fail("não deveria coletar"))

    servico.garantir_dados_atualizados()

    assert servico.situacao_atualizacao()["em_dia"] is True


def test_dados_velhos_sao_atualizados_e_o_cache_e_limpo(dados, monkeypatch):
    chamadas = []
    fingir_hoje(monkeypatch, dados["ultimo_dia"] + timedelta(days=2))  # faltando 1 dia
    monkeypatch.setattr(coleta, "coletar", coleta_falsa(chamadas))
    monkeypatch.setattr(exploracao, "baixar_contexto", contexto_falso)

    assert servico.situacao_atualizacao()["em_dia"] is False
    servico.garantir_dados_atualizados()

    assert len(chamadas) == 1
    novo_ultimo = coleta.carregar_csv(dados["csv"])["data"].max().date()
    assert novo_ultimo == dados["ultimo_dia"] + timedelta(days=1)  # CSV gravado
    situacao = servico.situacao_atualizacao()
    assert situacao["em_dia"] is True  # cache limpo: o serviço já enxerga o dado novo
    assert situacao["atualizado_em"] is not None
    assert not list(dados["csv"].parent.glob("*.tmp"))  # gravação atômica não deixa lixo


def test_falha_na_coleta_mantem_dados_e_avisa(dados, monkeypatch):
    chamadas = []

    def coletar_quebrado(hoje):
        chamadas.append(hoje)
        raise ConnectionError("Open-Meteo fora do ar")

    fingir_hoje(monkeypatch, dados["ultimo_dia"] + timedelta(days=3))
    monkeypatch.setattr(coleta, "coletar", coletar_quebrado)
    antes = dados["csv"].read_bytes()

    servico.garantir_dados_atualizados()  # não pode levantar erro
    servico.garantir_dados_atualizados()  # logo em seguida: não tenta de novo (espera 10 min)

    assert dados["csv"].read_bytes() == antes  # dados antigos intactos
    assert len(chamadas) == 1
    situacao = servico.situacao_atualizacao()
    assert situacao["em_dia"] is False
    assert "fora do ar" in situacao["erro"]


def test_falha_no_contexto_nao_grava_nada(dados, monkeypatch):
    """Ou atualiza tudo, ou nada: os 90 dias não podem ficar à frente do contexto."""

    def contexto_quebrado(fim):
        raise TimeoutError("demorou demais")

    fingir_hoje(monkeypatch, dados["ultimo_dia"] + timedelta(days=2))
    monkeypatch.setattr(coleta, "coletar", coleta_falsa([]))
    monkeypatch.setattr(exploracao, "baixar_contexto", contexto_quebrado)
    antes = dados["csv"].read_bytes()

    servico.garantir_dados_atualizados()

    assert dados["csv"].read_bytes() == antes


def test_saude_informa_a_situacao_da_atualizacao(dados, monkeypatch):
    fingir_hoje(monkeypatch, dados["ultimo_dia"] + timedelta(days=1))
    situacao = servico.saude()["atualizacao"]
    assert situacao == {
        "em_dia": True,
        "ultimo_dia_esperado": dados["ultimo_dia"].isoformat(),
        "atualizado_em": None,
        "erro": None,
    }
