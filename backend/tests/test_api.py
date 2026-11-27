"""Testes da API com o cliente de teste do Flask (simula requisições sem subir servidor).

Para os testes serem rápidos, trocamos a lista de modelos por só os dois mais rápidos
(linha de base e ETS). A lógica da API é a mesma; os modelos já têm testes próprios.
"""

from datetime import timedelta

import pytest

from app import create_app
from previsao import coleta, modelos, servico


@pytest.fixture
def cliente(monkeypatch):
    rapidos = {nome: modelos.MODELOS[nome] for nome in ("linha_base", "ets")}
    monkeypatch.setattr(modelos, "MODELOS", rapidos)
    monkeypatch.setattr(servico, "MODELO_PADRAO", "ets")
    # "Hoje" = dia seguinte ao último dado: assim a atualização automática (D44) nunca dispara
    # nos testes — eles não dependem da internet nem sobrescrevem o CSV real.
    ultimo_dia = coleta.carregar_csv()["data"].max().date()
    monkeypatch.setattr(servico, "hoje_em_fortaleza", lambda: ultimo_dia + timedelta(days=1))
    servico.limpar_cache()  # cada teste começa sem resultados guardados
    yield create_app().test_client()
    servico.limpar_cache()


# --- Rotas básicas -----------------------------------------------------------


def test_saude(cliente):
    resposta = cliente.get("/api/saude")
    assert resposta.status_code == 200
    corpo = resposta.get_json()
    assert corpo["status"] == "ok"
    assert corpo["dados"]["dias"] == 90


def test_opcoes_lista_serie_e_modelos(cliente):
    corpo = cliente.get("/api/opcoes").get_json()
    assert corpo["serie"] == {"nome": "Temperatura média", "unidade": "°C"}
    assert [m["id"] for m in corpo["modelos"]] == ["linha_base", "ets"]
    assert corpo["horizonte"] == {"padrao": 7, "minimo": 1, "maximo": 14}


def test_serie_tem_90_dias_em_formato_iso(cliente):
    corpo = cliente.get("/api/serie").get_json()
    assert corpo["nome"] == "Temperatura média"
    assert len(corpo["dados"]) == 90
    assert corpo["dados"][0]["data"] == corpo["periodo"]["inicio"]
    assert len(corpo["dados"][0]["data"]) == 10  # AAAA-MM-DD


def test_previsao_padrao_tem_7_dias_apos_o_historico(cliente):
    corpo = cliente.get("/api/previsao").get_json()  # tudo no padrão
    assert corpo["horizonte"] == 7
    assert len(corpo["previsao"]) == 7
    assert corpo["previsao"][0]["data"] > corpo["historico"][-1]["data"]
    for dia in corpo["previsao"]:
        assert dia["inferior"] <= dia["previsao"] <= dia["superior"]


def test_previsao_com_horizonte_e_modelo_escolhidos(cliente):
    corpo = cliente.get("/api/previsao?modelo=linha_base&horizonte=3").get_json()
    assert corpo["modelo"] == "linha_base"
    assert len(corpo["previsao"]) == 3


def test_metricas_tem_uma_linha_por_modelo(cliente):
    corpo = cliente.get("/api/metricas").get_json()
    assert corpo["teste"]["dias"] == 10
    por_modelo = {m["modelo"]: m for m in corpo["metricas"]}
    assert set(por_modelo) == {"linha_base", "ets"}
    assert por_modelo["linha_base"]["mae_vs_linha_base"] == 0
    assert {"mae", "rmse", "cobertura", "vies", "largura_faixa"} <= set(por_modelo["ets"])


def test_teste_traz_10_dias_com_real_e_previsao(cliente):
    corpo = cliente.get("/api/teste?modelo=linha_base").get_json()
    assert len(corpo["dias"]) == 10
    assert len(corpo["treino_final"]) == 20
    assert isinstance(corpo["dias"][0]["dentro_da_faixa"], bool)


def test_caso_estudo_tem_3_cenarios_e_filtra_modelo(cliente):
    corpo = cliente.get("/api/caso-estudo").get_json()
    assert [c["id"] for c in corpo["cenarios"]] == ["so_antes", "tudo", "so_depois"]
    assert len(corpo["resultados"]) == 3 * 2  # 3 cenários x 2 modelos

    filtrado = cliente.get("/api/caso-estudo?modelo=ets").get_json()
    assert {r["modelo"] for r in filtrado["resultados"]} == {"ets"}


def test_respostas_nao_tem_nan(cliente):
    # NaN não é JSON válido: o navegador não conseguiria ler a resposta.
    for rota in ("/api/previsao", "/api/metricas", "/api/teste", "/api/caso-estudo"):
        assert b"NaN" not in cliente.get(rota).data


# --- Erros ---------------------------------------------------------------------


@pytest.mark.parametrize(
    ("rota", "parametro"),
    [
        ("/api/previsao?modelo=arima_magico", "modelo"),
        ("/api/previsao?horizonte=0", "horizonte"),
        ("/api/previsao?horizonte=15", "horizonte"),
        ("/api/previsao?horizonte=abc", "horizonte"),
    ],
)
def test_parametro_invalido_devolve_400_em_json(cliente, rota, parametro):
    resposta = cliente.get(rota)
    assert resposta.status_code == 400
    corpo = resposta.get_json()
    assert corpo["parametro"] == parametro
    assert corpo["erro"]


def test_erro_de_modelo_lista_os_valores_aceitos(cliente):
    corpo = cliente.get("/api/previsao?modelo=arima_magico").get_json()
    assert corpo["valores_aceitos"] == ["linha_base", "ets"]


def test_rota_inexistente_devolve_404_em_json(cliente):
    resposta = cliente.get("/api/nao-existe")
    assert resposta.status_code == 404
    assert resposta.get_json()["status"] == 404


def test_metodo_errado_devolve_405(cliente):
    assert cliente.post("/api/serie").status_code == 405


# --- CORS ----------------------------------------------------------------------


def test_cors_libera_so_o_frontend(cliente):
    liberada = cliente.get("/api/saude", headers={"Origin": "http://localhost:5173"})
    assert liberada.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"

    bloqueada = cliente.get("/api/saude", headers={"Origin": "http://site-qualquer.com"})
    assert "Access-Control-Allow-Origin" not in bloqueada.headers


def test_mensagens_de_erro_http_em_portugues(cliente):
    assert "Rota não encontrada" in cliente.get("/api/nao-existe").get_json()["erro"]
    assert "só aceita GET" in cliente.post("/api/serie").get_json()["erro"]


def test_pedidos_iguais_simultaneos_calculam_uma_vez_so(monkeypatch):
    """Dois pedidos iguais ao mesmo tempo: o segundo espera e reaproveita (trava da D37)."""
    import threading
    import time

    chamadas = []

    def validacao_lenta(serie):
        chamadas.append(1)
        time.sleep(0.3)  # simula um cálculo demorado
        return original(serie)

    original = servico.avaliacao.comparar_modelos
    rapidos = {nome: modelos.MODELOS[nome] for nome in ("linha_base", "ets")}
    monkeypatch.setattr(modelos, "MODELOS", rapidos)
    monkeypatch.setattr(servico.avaliacao, "comparar_modelos", validacao_lenta)
    servico.limpar_cache()

    threads = [threading.Thread(target=servico.metricas) for _ in range(3)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(chamadas) == 1
    servico.limpar_cache()


# --- Comparação com anos anteriores (D50) -------------------------------------


def test_contexto_compara_o_mesmo_periodo_em_cada_ano(cliente):
    resposta = cliente.get("/api/contexto")
    assert resposta.status_code == 200
    corpo = resposta.get_json()
    ano = corpo["ano_atual"]
    assert corpo["anos_anteriores"] == [ano - 2, ano - 1]
    assert corpo["nome"] == "Temperatura média"

    temperatura = corpo  # uma série só (D52): os campos vêm direto na resposta
    assert [a["ano"] for a in temperatura["anos"]] == [ano - 2, ano - 1, ano]
    # O ano atual é exatamente o período dos 90 dias da ferramenta.
    atual = temperatura["anos"][-1]
    assert atual["dias"] == 90
    assert atual["fim"] == cliente.get("/api/saude").get_json()["dados"]["fim"]
    # Um ponto por dia, com o valor de cada ano no mesmo dia do calendário.
    assert len(temperatura["dias"]) == 90
    assert set(temperatura["dias"][0]["valores"]) == {str(ano - 2), str(ano - 1), str(ano)}
    # Anomalia = valor de agora - normal (com o arredondamento de 2 casas).
    dia = temperatura["dias"][-1]
    assert dia["anomalia"] == pytest.approx(dia["valores"][str(ano)] - dia["normal"], abs=0.02)
    # A mudança detectada fica dentro do período.
    assert temperatura["dias"][0]["data"] < temperatura["mudanca"]["data"] <= dia["data"]
