"""Etapa 6 — API REST em Flask. Só cuida da "parte web"; a lógica está em previsao/servico.py.

Como rodar (a partir da pasta backend/):
    .venv\\Scripts\\python -m flask --app app run --port 5000

Endpoints (todos GET, respostas em JSON) — documentação completa em docs/api.md:
    /api/saude        o servidor está no ar? até quando vão os dados?
    /api/opcoes       variáveis, modelos e limites aceitos (para montar os seletores da tela)
    /api/serie        histórico de 90 dias
    /api/previsao     histórico + previsão + faixa de 95%
    /api/metricas     tabela comparativa dos modelos no período de teste
    /api/teste        previsão x real, dia a dia, no período de teste
    /api/caso-estudo  modelo treinado só antes da mudança x tudo x só depois
"""

import logging

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from previsao import servico

# Quem pode chamar a API pelo navegador (CORS — decisão D39): só o frontend em desenvolvimento.
ORIGENS_PERMITIDAS = ["http://localhost:5173", "http://127.0.0.1:5173"]

# Mensagens em português para os erros HTTP mais comuns (o padrão do Flask é em inglês).
MENSAGENS_HTTP = {
    404: "Rota não encontrada. Veja as rotas disponíveis em docs/api.md.",
    405: "Método não permitido nesta rota. A API só aceita GET.",
}


def create_app() -> Flask:
    app = Flask(__name__)
    app.json.sort_keys = False  # mantém a ordem das chaves como escrevemos (mais legível)
    app.json.ensure_ascii = False  # "°C" aparece como "°C", não como "°C"
    CORS(app, resources={r"/api/*": {"origins": ORIGENS_PERMITIDAS}})
    logging.getLogger("cmdstanpy").setLevel(logging.WARNING)  # menos mensagens do Prophet

    # --- Antes de cada pedido: dados em dia? (atualização automática — D44) --

    @app.before_request
    def atualizar_dados_se_preciso():
        servico.garantir_dados_atualizados()

    # --- Rotas -------------------------------------------------------------
    # request.args = parâmetros da URL (o que vem depois do "?").

    @app.get("/api/saude")
    def rota_saude():
        return jsonify(servico.saude())

    @app.get("/api/opcoes")
    def rota_opcoes():
        return jsonify(servico.opcoes())

    @app.get("/api/serie")
    def rota_serie():
        variavel = servico.validar_variavel(request.args.get("variavel"))
        return jsonify(servico.serie(variavel))

    @app.get("/api/previsao")
    def rota_previsao():
        variavel = servico.validar_variavel(request.args.get("variavel"))
        modelo = servico.validar_modelo(request.args.get("modelo"))
        horizonte = servico.validar_horizonte(request.args.get("horizonte"))
        return jsonify(servico.previsao(variavel, modelo, horizonte))

    @app.get("/api/metricas")
    def rota_metricas():
        variavel = servico.validar_variavel(request.args.get("variavel"))
        return jsonify(servico.metricas(variavel))

    @app.get("/api/teste")
    def rota_teste():
        variavel = servico.validar_variavel(request.args.get("variavel"))
        modelo = servico.validar_modelo(request.args.get("modelo"))
        return jsonify(servico.teste(variavel, modelo))

    @app.get("/api/caso-estudo")
    def rota_caso_estudo():
        variavel = servico.validar_variavel(request.args.get("variavel"))
        modelo = servico.validar_modelo(request.args.get("modelo"), obrigatorio=False)
        return jsonify(servico.caso(variavel, modelo))

    # --- Erros: sempre em JSON (decisão D40) --------------------------------

    @app.errorhandler(servico.ErroParametro)
    def erro_parametro(erro: servico.ErroParametro):
        corpo = {"erro": erro.mensagem, "parametro": erro.parametro}
        if erro.valores_aceitos:
            corpo["valores_aceitos"] = erro.valores_aceitos
        return jsonify(corpo), 400

    @app.errorhandler(HTTPException)
    def erro_http(erro: HTTPException):
        # Ex.: 404 (rota não existe), 405 (método não permitido, como POST numa rota GET).
        mensagem = MENSAGENS_HTTP.get(erro.code, erro.description)
        return jsonify({"erro": mensagem, "status": erro.code}), erro.code

    @app.errorhandler(Exception)
    def erro_interno(erro: Exception):
        # Registra o erro completo no terminal, mas devolve só uma mensagem genérica:
        # detalhes internos (caminhos, código) não devem vazar para quem chama a API.
        app.logger.exception("Erro não tratado: %s", erro)
        return jsonify({"erro": "Erro interno ao processar a requisição.", "status": 500}), 500

    return app


if __name__ == "__main__":
    # Alternativa ao comando "flask run": python app.py. debug=False por segurança;
    # para recarregar ao editar o código, use: python -m flask --app app run --debug
    create_app().run(port=5000)
