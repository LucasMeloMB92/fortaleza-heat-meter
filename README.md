# Fortaleza Heat Meter — previsão de séries temporais

Ferramenta web e estudo que demonstram o ciclo completo de previsão de séries temporais:

**dados → modelos → validação → previsão → tela**

Usamos 90 dias de **temperatura média** diária de Fortaleza-CE (fonte:
[Open-Meteo](https://open-meteo.com/), gratuita e sem cadastro), comparamos 5 modelos e prevemos
os próximos 7 dias (até 14) com faixa de incerteza de 95%. A temperatura é o campo de testes: o
método vale para qualquer número medido por dia (vendas, demanda, acessos).

> Status: **estudo concluído** (etapas 0 a 8) + Chronos-2 (D47) + simplificações (D52–D56).
> Resultados e recomendação no [relatório final](docs/relatorio-final.md); roteiro para
> apresentar o trabalho em [docs/roteiro-apresentacao.md](docs/roteiro-apresentacao.md).

## Novidades

- **Chronos-2 é o modelo recomendado e o padrão da tela e da API** (D52): uma IA moderna da
  Amazon, já treinada com milhões de séries, que prevê sem treino próprio. Empatou com o melhor
  modelo no teste principal e foi o melhor sozinho no teste seguinte. Roda sem internet depois do
  primeiro download, com versão fixa (D51).
- **Uma série só:** a sensação térmica saiu (D52); a ferramenta prevê só a temperatura média.
- **Menos peças** (D53–D56): o caso de estudo virou um card só (tabela de todos os modelos +
  gráfico do escolhido, de uma consulta), a comparação com os anos anteriores ganhou card
  próprio, e saíram a rota `/api/serie` e o campo `padroes` de `/api/opcoes`. A API tem 7 rotas.
- **Documentação revisada:** relatórios atualizados (como a ferramenta funciona, como levar os
  modelos para soluções com IA) e um **roteiro de apresentação** de 15 a 20 minutos.

## Os modelos

| Modelo | O que faz | Como aprende |
|---|---|---|
| Linha de base | Média dos últimos 7 dias (a régua) | Não aprende |
| ETS | Média ponderada, dias recentes pesam mais | Testa 3 versões, fica com o menor AICc |
| SARIMA | Usa os dias e erros anteriores | Teste ADF + 72 combinações, menor AICc |
| Prophet (Meta) | Tendência que muda de inclinação | Ajusta a tendência (sem ciclos aqui) |
| **Chronos-2** (Amazon) | Rede neural pré-treinada (*zero-shot*) | Não treina: recebe a série como contexto |

Todos têm a mesma interface (`modelos.prever(nome, serie, horizonte, nivel)`) e devolvem previsão
+ faixa de 95%. Detalhes no [relatório final, seção 5](docs/relatorio-final.md).

## Como funciona

```
Open-Meteo ──► backend (Python + Flask, :5000) ──JSON──► frontend (React, :5173) ──► navegador
               coleta, atualiza todo dia, treina,         gráficos, tabelas e textos
               avalia, guarda em cache                    em linguagem simples
```

- **Backend:** baixa os 90 dias até ontem, grava em CSV, roda os 5 modelos, mede o erro em 10
  dias escondidos e responde em 7 rotas `GET /api/...` ([docs/api.md](docs/api.md)). No primeiro
  acesso de cada dia, atualiza os dados e retreina sozinho.
- **Frontend:** pede os dados prontos e mostra cinco cards: previsão, comparação dos modelos,
  previsão × real no teste, comparação com os anos anteriores e caso de estudo.

## Estrutura

```
backend/    Python: coleta, modelos e API Flask
  previsao/   lógica (coleta, exploração, modelos, avaliação, caso de estudo, serviço) — independente da web
  scripts/    um script por etapa (gera números e gráficos)
  data/       dados em CSV
  tests/      testes (pytest)
frontend/   React + Vite + TypeScript: a tela
  src/componentes/  gráficos, tabelas e seletores
  src/formatacao.ts datas (DD-MM-AAAA) e números para exibição
  src/textos.ts     frases da tela, geradas por regras a partir dos números
docs/       documentação: decisões, diário, glossário, API, relatórios e roteiro de apresentação
```

## Pré-requisitos

- **Python 3.12** (no Windows: `py install 3.12`)
- **Node.js 20+** e npm (para o frontend)
- Git

## Instalação do backend

No PowerShell, a partir da raiz do projeto:

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

O ambiente virtual (`.venv`) isola as bibliotecas deste projeto das do resto do computador.

O `requirements.txt` instala o PyTorch só para CPU (~200 MB) a partir do repositório oficial do
PyTorch. Na primeira previsão do **Chronos-2** (inclusive nos testes), o modelo (~456 MB) é
baixado do Hugging Face para `%USERPROFILE%\.cache\huggingface`; depois disso, tudo funciona sem
internet (D47). A versão do modelo é fixa (`CHRONOS_VERSAO` em `backend/previsao/modelos.py`) e,
com o modelo já baixado, a ferramenta não consulta a internet para carregá-lo (D51).

## Rodando o backend

Todos os comandos abaixo são executados a partir da pasta `backend/`:

```powershell
cd backend
```

**Coletar os dados** (90 dias até ontem, do Open-Meteo → `data/fortaleza_diario.csv`):

```powershell
.venv\Scripts\python -m scripts.etapa1_coleta
```

**Explorar os dados** (estatísticas no terminal e gráficos em `docs/img/`; baixa também 3 anos de
contexto):

```powershell
.venv\Scripts\python -m scripts.etapa2_exploracao
```

**Rodar os 5 modelos e prever os próximos 7 dias** (gráfico em `docs/img/`; leva ~30 s por
causa da busca do SARIMA):

```powershell
.venv\Scripts\python -m scripts.etapa3_modelagem
```

**Validar os modelos** (treino de 80 dias, teste nos últimos 10; métricas e gráfico):

```powershell
.venv\Scripts\python -m scripts.etapa4_validacao
```

**Caso de estudo** (modelo treinado só antes da mudança de outubro x com tudo x só depois):

```powershell
.venv\Scripts\python -m scripts.etapa5_caso_estudo
```

**Subir a API** (em `http://127.0.0.1:5000/api`; documentação em [docs/api.md](docs/api.md)):

```powershell
.venv\Scripts\python -m flask --app app run --port 5000
```

A primeira chamada de cada previsão treina o modelo (alguns segundos; o caso de estudo, ~30 s);
as seguintes são instantâneas.

**Atualização automática:** os dados vão sempre até **ontem**. No primeiro acesso de cada dia a
API baixa os dias novos do Open-Meteo sozinha (não é preciso rodar a coleta). Sem internet, ela
continua com os dados que tem e a tela mostra um aviso.

**Testes e qualidade do código:**

```powershell
.venv\Scripts\python -m pytest
```

```powershell
.venv\Scripts\python -m ruff check .
```

## Frontend

Tela web em React + Vite + TypeScript (Recharts para gráficos, TanStack Query para consumir a
API, Tailwind CSS para estilo). Datas exibidas em **DD-MM-AAAA**. Pensada para quem não é
técnico: cartões de destaque, resumos em texto com os números reais, ícones **i** explicando os
termos e detalhes técnicos recolhidos.

**Instalação** (uma vez), a partir da raiz do projeto:

```powershell
cd frontend
npm install
```

**Rodar** — com a API já rodando em outro terminal (porta 5000), na pasta `frontend/`:

```powershell
npm run dev
```

Abra `http://localhost:5173`. O Vite repassa os pedidos `/api/...` para o Flask. No primeiro
acesso do dia os modelos são treinados: cada seção mostra um bloco "carregando" com contador de
segundos — o gráfico principal aparece em ~10 s e o caso de estudo em ~1 min e meio; depois,
tudo fica instantâneo. Se o backend estiver desligado, a tela avisa e oferece "Tentar de novo".

**Testes e qualidade** (na pasta `frontend/`):

```powershell
npm test
```

```powershell
npm run lint
```

```powershell
npm run build
```

## Documentação

- [Decisões](docs/decisoes.md) — cada escolha e o porquê
- [Diário](docs/diario.md) — o que foi feito e aprendido em cada etapa
- [Glossário](docs/glossario.md) — termos explicados de forma simples
- [API](docs/api.md) — endpoints do backend
- [Relatório final](docs/relatorio-final.md) — resumo para o cliente
- [Guia técnico](docs/relatorio-tecnico.md) — passo a passo para reproduzir o estudo ou aplicar o método em outra série
- [Roteiro de apresentação](docs/roteiro-apresentacao.md) — 15 a 20 minutos: o que foi feito, como roda, modelos, resultados e uso com IA
