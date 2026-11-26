# Fortaleza Heat Meter — POC de previsão de temperatura

Prova de conceito que demonstra o ciclo completo de previsão de séries temporais:

**dados → modelo → previsão → gráfico**

Usamos 90 dias de **temperatura média** e **sensação térmica média** diárias de Fortaleza-CE
(fonte: [Open-Meteo](https://open-meteo.com/), gratuita e sem cadastro), comparamos 4 modelos
(linha de base, ETS, SARIMA e Prophet) e prevemos os próximos 7 dias com faixa de incerteza.

> Status: em construção — veja o andamento em [docs/diario.md](docs/diario.md).

## Estrutura

```
backend/    Python: coleta, modelos e API Flask
  previsao/   lógica da POC (independente da web)
  scripts/    um script por etapa (gera números e gráficos)
  data/       dados em CSV
  tests/      testes (pytest)
frontend/   React + Vite + TypeScript (a ser criado na etapa 7)
docs/       documentação: decisões, diário, glossário, API, relatório final
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

**Treinar os 4 modelos e prever os próximos 7 dias** (gráfico em `docs/img/`; leva ~30 s por
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

**Testes e qualidade do código:**

```powershell
.venv\Scripts\python -m pytest
```

```powershell
.venv\Scripts\python -m ruff check .
```

_Comandos para rodar os modelos e subir a API serão adicionados nas próximas etapas._

## Frontend

_Será criado na etapa 7._

## Documentação

- [Decisões](docs/decisoes.md) — cada escolha e o porquê
- [Diário](docs/diario.md) — o que foi feito e aprendido em cada etapa
- [Glossário](docs/glossario.md) — termos explicados de forma simples
- [API](docs/api.md) — endpoints do backend
- [Relatório final](docs/relatorio-final.md) — resumo para o cliente
