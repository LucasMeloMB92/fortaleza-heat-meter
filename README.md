# Fortaleza Heat Meter — POC de previsão de temperatura

Prova de conceito que demonstra o ciclo completo de previsão de séries temporais:

**dados → modelo → previsão → gráfico**

Usamos 90 dias de **temperatura média** e **sensação térmica média** diárias de Fortaleza-CE
(fonte: [Open-Meteo](https://open-meteo.com/), gratuita e sem cadastro), comparamos 5 modelos
(linha de base, ETS, SARIMA, Prophet e Chronos-2, um modelo de IA moderna) e prevemos os próximos 7 dias com faixa de incerteza.

> Status: **POC concluída** (etapas 0 a 8). Resultados e recomendação no
> [relatório final](docs/relatorio-final.md); andamento detalhado em [docs/diario.md](docs/diario.md).

## Estrutura

```
backend/    Python: coleta, modelos e API Flask
  previsao/   lógica da POC (independente da web)
  scripts/    um script por etapa (gera números e gráficos)
  data/       dados em CSV
  tests/      testes (pytest)
frontend/   React + Vite + TypeScript: a tela da POC
  src/componentes/  gráficos, tabelas e seletores
  src/formatacao.ts datas (DD-MM-AAAA) e números para exibição
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

O `requirements.txt` instala o PyTorch só para CPU (~200 MB) a partir do repositório oficial do
PyTorch. Na primeira previsão do **Chronos-2** (inclusive nos testes), o modelo (~456 MB) é
baixado do Hugging Face para `%USERPROFILE%\.cache\huggingface`; depois disso, tudo funciona sem
internet (D47).

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
- [Guia técnico](docs/relatorio-tecnico.md) — passo a passo para reproduzir a POC ou aplicar o método em outra série
