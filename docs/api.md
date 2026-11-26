# Documentação da API

API REST em Flask que entrega os dados e as previsões em JSON para o frontend.

> Status: **planejada** — a API será implementada na etapa 6. Os endpoints abaixo são a proposta
> inicial e serão detalhados (parâmetros, exemplos de requisição/resposta, erros) quando forem
> construídos.

## Endpoints planejados

| Método | Rota | Para que serve |
|---|---|---|
| GET | `/api/saude` | Verifica se o servidor está no ar |
| GET | `/api/serie?variavel=` | Histórico de 90 dias |
| GET | `/api/previsao?variavel=&modelo=&horizonte=` | Histórico + previsão + intervalo de 95% |
| GET | `/api/metricas?variavel=` | Tabela comparativa (MAE, RMSE, cobertura) |
| GET | `/api/teste?variavel=&modelo=` | Previsão x real no período de teste |
| GET | `/api/caso-estudo?variavel=` | Comparação antes x depois da mudança |

Parâmetros previstos:
- `variavel`: `temperatura` (padrão) ou `sensacao`.
- `modelo`: `linha_base`, `ets`, `sarima` ou `prophet`.
- `horizonte`: número de dias (padrão 7).

Valores inválidos devem devolver **HTTP 400** com uma mensagem de erro em JSON.
