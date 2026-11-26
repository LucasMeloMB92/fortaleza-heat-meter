# Documentação da API

API REST em Flask que entrega os dados, as previsões e as métricas em JSON para o frontend.
Código: `backend/app.py` (rotas e erros) e `backend/previsao/servico.py` (montagem das respostas).

## Como rodar

A partir da pasta `backend/`:

```powershell
.venv\Scripts\python -m flask --app app run --port 5000
```

Endereço base: `http://127.0.0.1:5000/api`. Para recarregar ao editar o código, acrescente `--debug`
(só em desenvolvimento).

## Regras gerais

- **Método:** todas as rotas são `GET` (só consultam; nada é alterado no servidor).
- **Formato:** JSON em UTF-8. Datas em `AAAA-MM-DD`; números com 2 casas decimais; valor ausente
  = `null`. Temperaturas em °C.
- **Dados (atualização automática — D44):** os 90 dias de `backend/data/fortaleza_diario.csv`,
  sempre até **ontem** (fuso de Fortaleza). Antes de cada pedido, a API confere; se faltar dia,
  baixa tudo do Open-Meteo, grava e limpa o cache. Se o Open-Meteo falhar, a API continua com os
  dados que tem, informa em `/api/saude` e tenta de novo após 10 minutos.
- **Tempo de resposta (cache — D37):** cada resultado é calculado no **primeiro** pedido e guardado
  na memória. Cálculos novos rodam em **fila**, um de cada vez (pedidos simultâneos esperam a vez;
  o que já está em cache responde na hora). Medido em 26/11/2026, com um pedido por vez:

  | Pedido | 1ª chamada | Seguintes |
  |---|---|---|
  | `/api/saude`, `/api/opcoes`, `/api/serie` | ~2 ms | ~2 ms |
  | `/api/previsao` (SARIMA) | ~6 s | ~3 ms |
  | `/api/metricas` (roda os 5 modelos) | ~11 s | ~25 ms |
  | `/api/teste` (depois de `/metricas` da mesma variável) | ~3 ms | ~3 ms |
  | `/api/caso-estudo` (3 cenários x 5 modelos) | ~30 s | ~5 ms |
| `/api/previsao` (Chronos-2) | ~1–2 s (carrega o modelo) | ~3 ms |

  Tempos medidos com 4 modelos; o Chronos-2 (D47) soma ~1–2 s só na 1ª chamada do processo
  (carregar o modelo na memória) e ~0,06 s por previsão. Na 1ª vez em um computador, ele ainda
  baixa o modelo (456 MB) do Hugging Face.

- **CORS (D39):** o navegador só deixa chamar a API a partir de `http://localhost:5173` e
  `http://127.0.0.1:5173` (o frontend em desenvolvimento). Outras origens não recebem o cabeçalho
  `Access-Control-Allow-Origin`.

### Parâmetros comuns

| Parâmetro | Valores aceitos | Padrão |
|---|---|---|
| `variavel` | `temperatura`, `sensacao` | `temperatura` |
| `modelo` | `linha_base`, `ets`, `sarima`, `prophet`, `chronos` | `sarima` |
| `horizonte` | inteiro de 1 a 14 (dias) | `7` |

### Erros

Todos os erros vêm em JSON:

| Status | Quando | Exemplo de corpo |
|---|---|---|
| **400** | parâmetro inválido | `{"erro": "Variável inválida: 'chuva'.", "parametro": "variavel", "valores_aceitos": ["temperatura", "sensacao"]}` |
| **400** | horizonte fora do limite | `{"erro": "Horizonte fora do limite: 30. Use um número inteiro de 1 a 14.", "parametro": "horizonte"}` |
| **404** | rota inexistente | `{"erro": "Rota não encontrada. Veja as rotas disponíveis em docs/api.md.", "status": 404}` |
| **405** | método diferente de GET | `{"erro": "Método não permitido nesta rota. A API só aceita GET.", "status": 405}` |
| **500** | erro interno inesperado | `{"erro": "Erro interno ao processar a requisição.", "status": 500}` (detalhes só no terminal do servidor) |

---

## GET `/api/saude`

O servidor está no ar? Até quando vão os dados? A atualização automática funcionou?

- **Parâmetros:** nenhum.
- **Requisição:** `GET /api/saude`
- **Resposta 200:**

```json
{
  "status": "ok",
  "dados": { "inicio": "2026-08-28", "fim": "2026-11-25", "dias": 90 },
  "atualizacao": {
    "em_dia": true,
    "ultimo_dia_esperado": "2026-11-25",
    "atualizado_em": "2026-11-26T11:56:19-03:00",
    "erro": null
  }
}
```

| Campo de `atualizacao` | Significado |
|---|---|
| `em_dia` | `true` se os dados vão até ontem (fuso de Fortaleza) |
| `ultimo_dia_esperado` | ontem — até onde os dados deveriam ir |
| `atualizado_em` | quando a API baixou dados novos pela última vez (`null` = ainda não baixou desde que iniciou) |
| `erro` | se `em_dia` é `false`: por que a atualização falhou (ex.: Open-Meteo fora do ar) |

Exemplo com falha na atualização (a API continua respondendo com os dados que tem):

```json
"atualizacao": {
  "em_dia": false,
  "ultimo_dia_esperado": "2026-11-29",
  "atualizado_em": null,
  "erro": "Open-Meteo fora do ar"
}
```

---

## GET `/api/opcoes`

Variáveis, modelos e limites aceitos — o frontend usa para montar os seletores sem repetir listas.

- **Parâmetros:** nenhum.
- **Requisição:** `GET /api/opcoes`
- **Resposta 200:**

```json
{
  "variaveis": [
    { "id": "temperatura", "nome": "Temperatura média", "unidade": "°C" },
    { "id": "sensacao", "nome": "Sensação térmica média", "unidade": "°C" }
  ],
  "modelos": [
    { "id": "linha_base", "nome": "Linha de base (média 7 dias)" },
    { "id": "ets", "nome": "ETS" },
    { "id": "sarima", "nome": "SARIMA" },
    { "id": "prophet", "nome": "Prophet" },
    { "id": "chronos", "nome": "Chronos-2" }
  ],
  "padroes": { "variavel": "temperatura", "modelo": "sarima" },
  "horizonte": { "padrao": 7, "minimo": 1, "maximo": 14 },
  "nivel_intervalo": 0.95
}
```

---

## GET `/api/serie`

Histórico de 90 dias de uma variável.

- **Parâmetros:** `variavel`.
- **Requisição:** `GET /api/serie?variavel=temperatura`
- **Resposta 200** (lista `dados` encurtada):

```json
{
  "variavel": "temperatura",
  "nome": "Temperatura média",
  "unidade": "°C",
  "periodo": { "inicio": "2026-08-28", "fim": "2026-11-25", "dias": 90 },
  "dados": [
    { "data": "2026-08-28", "valor": 27.8 },
    { "data": "2026-08-29", "valor": 27.6 }
  ]
}
```

- **Erros:** 400 (`variavel` inválida).

---

## GET `/api/previsao`

Histórico + previsão dos próximos dias com faixa de 95%. Alimenta o **gráfico principal**. O
modelo é treinado com os 90 dias.

- **Parâmetros:** `variavel`, `modelo`, `horizonte`.
- **Requisição:** `GET /api/previsao?variavel=temperatura&modelo=sarima&horizonte=7`
- **Resposta 200** (listas encurtadas):

```json
{
  "variavel": "temperatura",
  "modelo": "sarima",
  "nome_modelo": "SARIMA",
  "horizonte": 7,
  "nivel_intervalo": 0.95,
  "configuracao": "SARIMA(1, 1, 1) (sem parte sazonal) + drift",
  "historico": [
    { "data": "2026-08-28", "valor": 27.8 },
    { "data": "2026-08-29", "valor": 27.6 }
  ],
  "previsao": [
    { "data": "2026-11-26", "previsao": 29.09, "inferior": 28.52, "superior": 29.66 },
    { "data": "2026-11-27", "previsao": 29.11, "inferior": 28.51, "superior": 29.71 }
  ]
}
```

- `configuracao`: o que o modelo escolheu sozinho (ex.: ordem do SARIMA pelo AICc).
- `inferior`/`superior`: limites da faixa onde o valor real deve cair com 95% de chance.
- **Erros:** 400 (`variavel`, `modelo` ou `horizonte` inválidos).

---

## GET `/api/metricas`

Tabela comparativa dos 5 modelos no período de teste (treino nos 80 primeiros dias, teste nos
10 últimos). Alimenta a **tabela de métricas**.

- **Parâmetros:** `variavel`.
- **Requisição:** `GET /api/metricas?variavel=temperatura`
- **Resposta 200** (2 dos 5 modelos mostrados):

```json
{
  "variavel": "temperatura",
  "teste": { "inicio": "2026-11-16", "fim": "2026-11-25", "dias": 10 },
  "metricas": [
    {
      "modelo": "linha_base",
      "nome_modelo": "Linha de base (média 7 dias)",
      "configuracao": "média dos últimos 7 dias",
      "mae": 0.46, "rmse": 0.55, "cobertura": 70.0,
      "mae_dias_1_7": 0.4, "vies": -0.24, "mae_vs_linha_base": 0.0
    },
    {
      "modelo": "sarima",
      "nome_modelo": "SARIMA",
      "configuracao": "SARIMA(1, 0, 0) (sem parte sazonal) + tendência linear",
      "mae": 0.38, "rmse": 0.5, "cobertura": 90.0,
      "mae_dias_1_7": 0.35, "vies": -0.1, "mae_vs_linha_base": -18.06
    }
  ]
}
```

| Campo | Significado |
|---|---|
| `mae` | erro médio em °C (sem sinal) |
| `rmse` | como o MAE, mas pesa mais os erros grandes (°C) |
| `cobertura` | % dos dias reais dentro da faixa de 95% |
| `mae_dias_1_7` | MAE só nos 7 primeiros dias (horizonte do produto) |
| `vies` | erro médio com sinal: negativo = previu baixo demais |
| `mae_vs_linha_base` | % a menos (−) ou a mais (+) de erro que a linha de base |

- **Erros:** 400 (`variavel` inválida).

---

## GET `/api/teste`

Previsão x real, dia a dia, no período de teste, para um modelo. Alimenta o **gráfico de
previsão x real**.

- **Parâmetros:** `variavel`, `modelo`.
- **Requisição:** `GET /api/teste?variavel=temperatura&modelo=sarima`
- **Resposta 200** (listas encurtadas):

```json
{
  "variavel": "temperatura",
  "modelo": "sarima",
  "nome_modelo": "SARIMA",
  "configuracao": "SARIMA(1, 0, 0) (sem parte sazonal) + tendência linear",
  "teste": { "inicio": "2026-11-16", "fim": "2026-11-25", "dias": 10 },
  "metricas": { "mae": 0.38, "rmse": 0.5, "cobertura": 90.0, "mae_dias_1_7": 0.35, "vies": -0.1 },
  "treino_final": [
    { "data": "2026-10-27", "valor": 28.7 },
    { "data": "2026-10-28", "valor": 28.6 }
  ],
  "dias": [
    {
      "data": "2026-11-16", "real": 27.5, "previsao": 28.77,
      "inferior": 28.25, "superior": 29.29, "erro": 1.27, "dentro_da_faixa": false
    },
    {
      "data": "2026-11-17", "real": 28.6, "previsao": 28.72,
      "inferior": 28.15, "superior": 29.29, "erro": 0.12, "dentro_da_faixa": true
    }
  ]
}
```

- `treino_final`: os 20 últimos dias do treino, para dar contexto ao gráfico.
- `erro` = previsão − real (positivo = previu alto demais).
- **Erros:** 400 (`variavel` ou `modelo` inválidos).

---

## GET `/api/caso-estudo`

Caso de estudo de quebra estrutural: o mesmo modelo treinado **só antes** da mudança, com
**tudo** e **só depois**, todos avaliados no mesmo período de teste. Alimenta a **visualização
antes x depois**.

- **Parâmetros:** `variavel`; `modelo` **opcional** (sem ele, vêm os 5 modelos).
- **Requisição:** `GET /api/caso-estudo?variavel=sensacao&modelo=sarima`
- **Resposta 200** (listas encurtadas):

```json
{
  "variavel": "sensacao",
  "data_mudanca": "2026-10-23",
  "teste": { "inicio": "2026-11-16", "fim": "2026-11-25", "dias": 10 },
  "cenarios": [
    { "id": "so_antes", "nome": "Só antes da mudança",
      "inicio": "2026-08-28", "fim": "2026-10-22", "dias": 56, "media_treino": 30.3 },
    { "id": "tudo", "nome": "Tudo (até a véspera do teste)",
      "inicio": "2026-08-28", "fim": "2026-11-15", "dias": 80, "media_treino": 30.72 },
    { "id": "so_depois", "nome": "Só depois da mudança",
      "inicio": "2026-10-23", "fim": "2026-11-15", "dias": 24, "media_treino": 31.68 }
  ],
  "real": [
    { "data": "2026-08-28", "valor": 30.1 },
    { "data": "2026-08-29", "valor": 29.8 }
  ],
  "resultados": [
    {
      "cenario": "so_antes",
      "modelo": "sarima",
      "nome_modelo": "SARIMA",
      "horizonte": 34,
      "metricas": { "mae": 1.79, "rmse": 1.84, "cobertura": 0.0, "mae_dias_1_7": 1.67, "vies": -1.79 },
      "previsao": [
        { "data": "2026-10-23", "previsao": 30.48, "inferior": 29.76, "superior": 31.2 },
        { "data": "2026-10-24", "previsao": 30.4, "inferior": 29.57, "superior": 31.24 }
      ]
    },
    {
      "cenario": "tudo",
      "modelo": "sarima",
      "nome_modelo": "SARIMA",
      "horizonte": 10,
      "metricas": { "mae": 0.29, "rmse": 0.44, "cobertura": 100.0, "mae_dias_1_7": 0.22, "vies": -0.16 },
      "previsao": [
        { "data": "2026-11-16", "previsao": 32.0, "inferior": 31.21, "superior": 32.79 }
      ]
    }
  ]
}
```

- `data_mudanca`: detectada automaticamente na anomalia (diferença para o normal dos anos
  anteriores) — 15/10 para temperatura, 23/10 para sensação.
- `horizonte`: dias previstos a partir do fim do treino de cada cenário (o "só antes" prevê de
  mais longe). As `metricas` usam só os dias do período de `teste`.
- **Erros:** 400 (`variavel` ou `modelo` inválidos).
