# Guia técnico — passo a passo para reproduzir a POC

> Roteiro do que foi feito, na ordem, para alguém **refazer esta POC** ou **aplicar o mesmo
> método a outra série** (vendas diárias, acessos, consumo de energia…). Cada passo traz:
> **objetivo → o que fazer → código-chave → como conferir → como adaptar**.
> O porquê completo de cada escolha está em [decisoes.md](decisoes.md) (D01…D50); termos em
> [glossário](glossario.md); resultados para o cliente no [relatório final](relatorio-final.md).

**Resultado final:** 90 dias de dados diários → 5 modelos comparados → previsão de 7 dias com
faixa de 95% → API Flask → tela React que se atualiza sozinha todo dia.

```
Fonte (API) ─► coleta.py ─► CSV ─► exploracao.py ─► modelos.py ─► avaliacao.py / caso_estudo.py
                                                         │
                                       servico.py (cache + fila) ─► app.py (/api) ─► React
```

---

## Tecnologias usadas e por quê

Antes do passo a passo, um mapa do que foi usado. Regra geral das escolhas: **gratuito, simples de
entender e suficiente para o problema** — nada de infraestrutura que a POC não precisa.

### Fonte dos dados: APIs do Open-Meteo

O [Open-Meteo](https://open-meteo.com/) é um serviço gratuito de dados meteorológicos, **sem
cadastro e sem chave de API**: basta montar uma URL e ele devolve JSON (D01).

| API | Endereço | Para que serve aqui |
|---|---|---|
| **Histórica** (*archive*) | `archive-api.open-meteo.com/v1/archive` | Fonte principal: os 90 dias e os 3 anos de contexto. |
| **Previsão** (*forecast*) | `api.open-meteo.com/v1/forecast` | Só reserva: com `past_days=30` devolve os dias recentes, se a histórica atrasar. |

Parâmetros usados: `latitude`/`longitude` (o ponto), `timezone=America/Fortaleza` (onde o dia
começa e termina), `daily=temperature_2m_mean,apparent_temperature_mean` (as médias diárias) e
`models=best_match` (o próprio serviço escolhe o melhor modelo meteorológico para o local — D21).
**Descartados:** INMET (formato mais trabalhoso), APIs pagas (OpenWeather, Visual Crossing).

**Armazenamento:** arquivo **CSV** (D14). São 90 linhas: abre no Excel, o pandas lê direto e o Git
mostra cada mudança. Um banco (SQLite, Postgres) só valeria com muito mais dados ou consultas.

### Backend (Python)

| Tecnologia | O que é | Por que foi escolhida |
|---|---|---|
| **Python 3.12** | Linguagem principal | É onde estão as bibliotecas de séries temporais. 3.12 e não a mais nova: as bibliotecas científicas ainda não tinham pacotes prontos para ela (D11). |
| **venv** + `requirements.txt` | Ambiente isolado + lista de bibliotecas com versão fixa | Todo mundo instala exatamente o mesmo ambiente (D17). |
| **pandas** / **numpy** | Tabelas e contas | Padrão do mercado para dados tabulares; datas como índice facilitam séries temporais. |
| **requests** | Chamadas HTTP | O jeito mais simples de chamar a API do Open-Meteo. |
| **matplotlib** | Gráficos em imagem | Gráficos das etapas de análise, salvos em `docs/img/`. |
| **statsmodels** | Estatística clássica | Traz ETS, SARIMA, teste ADF e autocorrelação, com intervalos de previsão prontos. |
| **prophet** | Biblioteca de previsão da Meta | Muito conhecida no mercado; entra para **comparar** (D07). |
| **chronos-forecasting** + **torch** (CPU) | Modelo de IA pré-treinado da Amazon | Representa a "IA moderna" sem treinar rede nenhuma; PyTorch só CPU tem ~200 MB em vez de ~2 GB (D47). |
| **Flask** + **Flask-CORS** | Servidor web mínimo | Poucas linhas para criar rotas; fácil de ler para quem aprende. CORS libera a tela (outra porta) a chamar a API (D12). **Descartados:** FastAPI e Django, mais conceitos do que a POC precisa. |
| **pytest** + **ruff** | Testes + verificador/formatador de código | Pega erros cedo e mantém o código num padrão só (D18). |

Formato do trabalho: **scripts `.py`** (um por etapa), não notebooks Jupyter — diff limpo no Git e
o mesmo código reaproveitado pela API (D16).

### Os modelos — o que cada um faz, em palavras simples

Todos recebem a série de 90 dias e devolvem a previsão de cada dia **e uma faixa** onde o valor
real deve cair em 95% das vezes (D10).

| Modelo | Explicação simples | Por que está na POC |
|---|---|---|
| **Linha de base** (média dos últimos 7 dias) | "Amanhã vai ser como a média da última semana." | É a **régua**: se um modelo sofisticado não supera isso, não vale a complexidade. |
| **ETS** (suavização exponencial / Holt-Winters) | Média ponderada em que os dias mais recentes pesam mais; pode ter tendência de subida/descida. | Clássico para séries curtas; rápido e fácil de explicar. |
| **SARIMA** | Explica cada dia pelos dias anteriores (parte AR), pelos erros anteriores (parte MA), pela diferença entre dias (I) e, se houver, por um ciclo (S = sazonal). | O clássico mais completo para séries curtas; testa 72 combinações e fica com a melhor. **Foi o recomendado.** |
| **Prophet** | Soma uma tendência com ciclos (anual, semanal) e feriados. | Feito para séries **longas**; incluí-lo mostra o que acontece quando a ferramenta não combina com o problema. |
| **Chronos-2** | Modelo de IA "fundacional": já foi treinado com milhões de séries de todo tipo e prevê a nossa sem treinar nada (*zero-shot*). | Testar se a IA moderna ganha dos clássicos numa série pequena. Resultado: empata, não ganha. |

**Descartados:** machine learning próprio (LightGBM, gradient boosting) e redes neurais treinadas do
zero — precisam de muito mais que 90 pontos para aprender algo (D07).

**Como os modelos são comparados:** MAE (erro médio em °C), RMSE (pune erros grandes), cobertura
(quantos dias reais caíram na faixa) e largura da faixa (se ela é útil ou larga demais) — D08, D48.

### Frontend (a tela)

| Tecnologia | O que é | Por que foi escolhida |
|---|---|---|
| **React 19** | Biblioteca para montar telas em componentes | Padrão de mercado; cada gráfico/tabela é um componente reaproveitável (D13). |
| **Vite** | Ferramenta que roda e empacota o frontend | Inicia em segundos e tem **proxy**: a tela chama `/api/...` e o Vite repassa ao Flask (D42). |
| **TypeScript** | JavaScript com tipos | O formato das respostas da API fica descrito no código; erros aparecem antes de rodar. |
| **Recharts** | Gráficos em React | Linha tracejada para a previsão e área sombreada para a faixa, prontas. |
| **TanStack Query** | Busca e cache de dados da API | Cuida de "carregando", erro e cache: voltar a uma combinação já vista é instantâneo. |
| **Tailwind CSS** | Estilos por classes utilitárias | Estilo direto no componente, sem arquivos CSS grandes. |
| **Vitest** + **tsc** + **oxlint** | Testes, checagem de tipos e verificador de código | Já vêm no modelo atual do Vite; protegem regras como o formato de data DD-MM-AAAA. |

**Descartados:** dashboards prontos em Python (Streamlit, Dash) — mais rápidos de montar, mas a
stack da ferramenta web era React.

### A API própria (Flask)

O backend expõe **8 rotas `GET`** em `/api` — uma para cada parte da tela: `saude` (situação dos
dados), `opcoes` (listas de modelos e variáveis), `serie` (histórico), `previsao`, `metricas`,
`teste`, `caso-estudo` e `contexto` (anos anteriores). Tudo é `GET` porque nada é alterado; as
respostas são JSON em português. Detalhes de cada rota em [api.md](api.md).

### Versionamento

**Git**, com **um commit por etapa** e cada decisão registrada em `decisoes.md` — o histórico
conta a história do projeto.

---

## Os arquivos Python — o que fazem, o que recebem, o que devolvem

O backend tem três camadas. Cada uma só usa a de baixo:

```
scripts/etapaN_*.py   (rodar à mão: imprime números e salva gráficos)
app.py                (web: rotas HTTP)  ──►  previsao/servico.py (respostas JSON + cache)
                              ▼                          ▼
              previsao/coleta · exploracao · modelos · avaliacao · caso_estudo  (a lógica)
```

**Dois formatos de dados aparecem em quase todo lugar:**
- **tabela** (`pd.DataFrame`): uma linha por dia, colunas `data`, `temperatura_media`,
  `sensacao_media` e `fonte` (de onde veio o dia). É o conteúdo do CSV.
- **série** (`pd.Series`): uma variável só, com as **datas como índice** — por exemplo
  `tabela.set_index("data")["temperatura_media"]`. É o que os modelos recebem.

### Pacote `previsao/` — a lógica (não depende do Flask)

**`coleta.py`** — baixa e prepara os dados (etapa 1).

| Função | Recebe | Devolve |
|---|---|---|
| `calcular_periodo(hoje, dias=90)` | a data de hoje | `(início, fim)`: os 90 dias que terminam ontem |
| `buscar_historico(inicio, fim)` | período | tabela da API histórica |
| `buscar_recentes(dias=30)` | quantos dias recentes | tabela da API de previsão (`past_days`) |
| `resposta_para_tabela(resposta)` | o JSON do Open-Meteo | tabela, uma linha por dia |
| `juntar_fontes(historico, recentes, inicio, fim)` | as duas tabelas + período | tabela única (histórico tem prioridade), sem nulos e duplicados |
| `verificar_tabela(tabela, inicio, fim)` | tabela + período | lista de problemas (vazia = tudo certo) |
| `comparar_sobreposicao(historico, recentes)` | as duas tabelas | diferença entre as fontes nos dias em comum |
| `coletar(hoje=None)` | (opcional) a data de hoje | `(tabela final, comparação)` — faz todos os passos acima |
| `salvar_csv(tabela, caminho)` | tabela + caminho | o caminho gravado (gravação atômica: `.tmp` + `os.replace`) |
| `carregar_csv(caminho)` | caminho | tabela com a coluna `data` já como data |

**`exploracao.py`** — entende a série antes de modelar (etapa 2).

| Função | Recebe | Devolve |
|---|---|---|
| `media_movel(serie, janela=7)` | série | série suavizada (média dos últimos 7 dias) |
| `teste_adf(serie, regressao="c")` | série; `"c"` = nível fixo, `"ct"` = em torno de uma reta | `{"estatistica", "p_valor", "estacionaria"}` |
| `forca_sazonal(serie, periodo=7)` | série + tamanho do ciclo | número de 0 (sem ciclo) a 1 (ciclo forte) |
| `detectar_mudanca(serie, minimo=10)` | série (de preferência a anomalia) | `{"data", "dias_depois", "media_antes", "media_depois"}` |
| `baixar_contexto(fim, anos=3)` | último dia | tabela de 3 anos (mesma coleta da etapa 1) |
| `mesmo_periodo_por_ano(contexto, inicio, fim)` | contexto + período | o mesmo trecho do calendário em cada ano, com colunas `ano` e `data_ref` |
| `climatologia(periodos, ano_atual)` | saída anterior + ano atual | o "normal" de cada dia (média dos anos anteriores, suavizada) |
| `anomalia(periodos, ano_atual)` | saída anterior + ano atual | ano atual − normal (positivo = mais quente que o normal) |

**`modelos.py`** — os 5 modelos com a mesma interface (etapa 3).

| Função | Recebe | Devolve |
|---|---|---|
| `prever(nome, serie, horizonte=7, nivel=0.95)` | nome do modelo (`linha_base`, `ets`, `sarima`, `prophet`, `chronos`), série, dias à frente, tamanho da faixa | um `Previsao` |
| `prever_linha_base` / `prever_ets` / `prever_sarima` / `prever_prophet` / `prever_chronos` | `(serie, horizonte, nivel)` — iguais | um `Previsao` |
| `escolher_d(serie)` | série | `(d, p-valor)`: quantas diferenciações o SARIMA usa |

`Previsao` tem três campos: `modelo` (o nome), `tabela` (um `DataFrame` indexado por data, com
colunas `previsao`, `inferior` e `superior`) e `detalhes` (um dicionário com o que o modelo
escolheu: configuração, AICc, parâmetros, ranking dos candidatos). Os dicionários `MODELOS`
(nome → função) e `NOMES_MODELOS` (nome → nome para exibir) são a lista oficial de modelos.

**`avaliacao.py`** — mede o erro no período de teste (etapa 4).

| Função | Recebe | Devolve |
|---|---|---|
| `mae`, `rmse` | valores reais, valores previstos | número em °C |
| `cobertura` | reais, limite inferior, limite superior | % de dias dentro da faixa (0–100) |
| `largura_faixa` | inferior, superior | largura média da faixa em °C |
| `separar_treino_teste(serie, dias_teste=10)` | série | `(treino, teste)` |
| `comparar_com_real(prevista, real)` | tabela de um `Previsao` + série real | `(tabela dia a dia com erro e "dentro da faixa", dicionário de métricas)` |
| `avaliar(nome, serie)` | nome do modelo + série | `{"comparacao", "metricas", "detalhes"}` |
| `comparar_modelos(serie)` | série | `(tabela com uma linha de métricas por modelo, {modelo: resultado de avaliar})` |

**`caso_estudo.py`** — treino antes x depois da mudança (etapa 5).

| Função | Recebe | Devolve |
|---|---|---|
| `datas_de_mudanca(tabela, contexto)` | os 90 dias + os 3 anos | `{variável: data da mudança}` |
| `montar_cenarios(serie, data_mudanca)` | série + data | `({"so_antes", "tudo", "so_depois": série de treino}, teste)` |
| `avaliar_cenarios(serie, data_mudanca, nomes_modelos=None)` | série, data, (opcional) quais modelos | `(tabela de métricas por cenário e modelo, resultados completos)` |

**`servico.py`** — monta as respostas da API (etapa 6). Não tem nada de HTTP: recebe parâmetros já
lidos e devolve **dicionários prontos para virar JSON** (datas em texto `AAAA-MM-DD`, números com 2
casas, `None` no lugar de NaN).

| Função | Recebe | Devolve |
|---|---|---|
| `validar_variavel`, `validar_modelo`, `validar_horizonte` | o texto vindo da URL | o valor validado, ou levanta `ErroParametro` (vira erro 400) |
| `saude()` | — | situação do servidor, período dos dados e se a atualização deu certo |
| `opcoes()` | — | variáveis, modelos, padrões e limites do horizonte |
| `serie(variavel)` | `temperatura` ou `sensacao` | o histórico de 90 dias |
| `previsao(variavel, modelo, horizonte)` | variável, modelo, 1–14 | histórico + previsão + faixa + detalhes do modelo |
| `metricas(variavel)` | variável | métricas de todos os modelos no teste |
| `teste(variavel, modelo)` | variável + modelo | previsão x real dia a dia no teste |
| `caso(variavel, modelo=None)` | variável, (opcional) modelo | os três cenários do caso de estudo |
| `contexto()` | — | comparação com os anos anteriores (as duas variáveis) |
| `garantir_dados_atualizados()` | — | nada; baixa os dados de novo se não forem até ontem (nunca levanta erro) |
| `limpar_cache()` | — | nada; esquece os resultados guardados |

Por dentro: `_calculo_unico` guarda cada resultado na memória (cache) e põe os cálculos novos numa
fila; `_calculo_leve` faz o mesmo com uma fila própria para contas rápidas.

### `app.py` — a parte web

`create_app()` cria o Flask, liga o CORS, registra as 8 rotas e os tratadores de erro. Cada rota só
**lê os parâmetros da URL → chama a função de `servico.py` → devolve JSON**. Antes de todo pedido,
`@app.before_request` chama `servico.garantir_dados_atualizados()`.

### `scripts/` — um por etapa, para rodar à mão

Todos rodam a partir de `backend/` com `.venv\Scripts\python -m scripts.<nome>`. Não recebem
argumentos; **imprimem os números no terminal e salvam gráficos** em `docs/img/`.

| Script | Lê | Faz | Grava |
|---|---|---|---|
| `etapa1_coleta` | Open-Meteo | `coleta.coletar()` e mostra um resumo e a comparação das fontes | `data/fortaleza_diario.csv` |
| `etapa2_exploracao` | o CSV + Open-Meteo (3 anos) | estatísticas, ADF, força semanal, anomalia, ponto de mudança | `data/fortaleza_contexto_3anos.csv`; `etapa2_series.png`, `etapa2_autocorrelacao.png`, `etapa2_contexto.png`, `etapa2_anomalia.png` |
| `etapa3_modelagem` | o CSV | roda todos os modelos de `MODELOS` nos 90 dias e mostra o que cada um escolheu | `etapa3_previsoes.png` |
| `etapa4_validacao` | o CSV | `comparar_modelos` para as duas variáveis e a tabela de erros dia a dia | `etapa4_teste.png` |
| `etapa5_caso_estudo` | os dois CSVs | `datas_de_mudanca` + `avaliar_cenarios` | `etapa5_caso_estudo.png` |

Ordem obrigatória na primeira vez: 1 → 2 (cria o contexto) → 3 → 4 → 5.

### `tests/` — um arquivo de teste por módulo

`test_coleta.py`, `test_exploracao.py`, `test_modelos.py` (contrato comum dos modelos),
`test_avaliacao.py` (inclui o anti-vazamento), `test_caso_estudo.py`, `test_api.py`,
`test_atualizacao.py` (atualização automática, sem internet e sem tocar nos CSVs reais) e
`test_ambiente.py` (as bibliotecas instalaram direito).

---

## Passo 0 — Preparar o projeto

**Objetivo:** ambiente reproduzível e estrutura que separa a lógica da web.

**O que fazer:**
1. Criar o monorepo:
   ```
   backend/  previsao/ (lógica)  scripts/ (1 por etapa)  data/ (CSV)  tests/
   frontend/
   docs/     decisoes.md  diario.md  glossario.md  api.md  img/
   ```
2. Instalar **Python 3.12** (não a versão mais nova: bibliotecas científicas demoram a ter
   pacotes prontos — D11) e criar o ambiente virtual:
   ```powershell
   cd backend
   py -3.12 -m venv .venv
   .venv\Scripts\python -m pip install -r requirements.txt
   ```
3. Fixar versões com `==` no [requirements.txt](../backend/requirements.txt) (D17). Principais:
   `pandas`, `statsmodels`, `prophet`, `torch` (+cpu), `chronos-forecasting`, `flask`,
   `flask-cors`, `pytest`, `ruff`.
4. Configurar ruff (`E, F, I, B, UP`, linha de 100) e pytest no `pyproject.toml` (D18).
5. Escrever um **teste de ambiente** que treina um Prophet minúsculo — é a instalação mais frágil.

**Confira:** `.venv\Scripts\python -m pytest` passa.

**Como adaptar:** a estrutura vale para qualquer série. Regra de ouro: a lógica fica num pacote
(`previsao/`) que roda sem servidor; o Flask só chama as funções (D15).

---

## Passo 1 — Coletar os dados

**Objetivo:** uma tabela diária limpa, gravada em CSV.

**O que fazer** (em [coleta.py](../backend/previsao/coleta.py)):
1. Definir as constantes do problema num lugar só: `LATITUDE`, `LONGITUDE`, `FUSO`, `DIAS = 90`
   e o mapa `VARIAVEIS` (nome no CSV → nome na API).
2. `calcular_periodo(hoje)` → os 90 dias que terminam **ontem** (D20: o dia de hoje ainda está
   incompleto).
3. `buscar_historico(inicio, fim)` → API histórica do Open-Meteo com `models=best_match` e
   `timezone=America/Fortaleza` (o fuso define onde o dia começa — D03).
4. `buscar_recentes()` → API de previsão com `past_days=30`, só como **reserva** para dias que
   faltarem (D21).
5. `juntar_fontes(...)` → histórico tem prioridade; uma coluna `fonte` diz de onde veio cada dia.
6. `verificar_tabela(...)` → confere dias faltando, duplicados e nulos.
7. `salvar_csv(...)` → grava em `.tmp` e troca com `os.replace` (gravação atômica: se falhar no
   meio, o arquivo antigo fica inteiro).

```powershell
.venv\Scripts\python -m scripts.etapa1_coleta
```

**Confira:** `backend/data/fortaleza_diario.csv` com 90 linhas, último dia = ontem, sem buracos.
Testes em `tests/test_coleta.py` usam **respostas falsas** no formato da API — nunca a internet
(D22).

**Cuidado que aprendemos:** compare as fontes antes de emendar. O `era5` era ~0,6 °C mais frio que
o `best_match`; emendar os dois criaria um salto falso nos dias recentes (D21).

**Como adaptar:** troque as constantes e as duas funções `buscar_*` pela sua fonte (banco, planilha,
outra API). Mantenha: período terminando no último dia completo, verificação de buracos, coluna de
origem e gravação atômica.

---

## Passo 2 — Explorar antes de modelar

**Objetivo:** descobrir que padrões a série tem, para escolher os modelos com base em evidência.

**O que fazer** (em [exploracao.py](../backend/previsao/exploracao.py) +
`scripts/etapa2_exploracao.py`, gráficos em `docs/img/`):

| Análise | Função / ferramenta | O que responde | Nosso achado → consequência |
|---|---|---|---|
| Estatísticas + média móvel | `media_movel` | Nível e oscilação | Desvio 0,5 °C: pouca variação |
| Autocorrelação (ACF/PACF) | `statsmodels.graphics.tsaplots` | A série tem memória? | ACF(1) = 0,75 / 0,87; PACF só no lag 1 → ordens baixas no SARIMA |
| Estacionariedade (ADF) | `teste_adf(serie, regressao)` | Precisa diferenciar? | Testar `"c"` **e** `"ct"` (com tendência) — ver Passo 3 |
| Sazonalidade semanal | `forca_sazonal(serie, 7)` | Há ciclo de 7 dias? | Força ~0,1 → modelos **sem** sazonalidade |
| Anos anteriores | `baixar_contexto`, `mesmo_periodo_por_ano`, `climatologia`, `anomalia` | É estação ou é anomalia? | 2026 acima do "normal" |
| Ponto de mudança | `detectar_mudanca(anomalia)` | Quando o nível mudou? | 15/10 (temp.) e 23/10 (sensação) |

Detector de mudança (simples, sem biblioteca — D26): testa cada corte e fica com o que melhor
divide a série em dois trechos de médias diferentes.

```python
for corte in range(minimo, len(valores) - minimo + 1):
    antes, depois = valores[:corte], valores[corte:]
    erro = ((antes - antes.mean()) ** 2).sum() + ((depois - depois.mean()) ** 2).sum()
```

**Confira:** anote cada achado no `diario.md` com a consequência para o modelo.

**Cuidados que aprendemos:**
- Rode o detector na **anomalia** (série − "normal" do mesmo dia em anos anteriores), não na série
  bruta — senão a subida normal da estação parece mudança.
- Dados antigos servem para **entender**, não para treinar, se o escopo é "série curta" (D24).

**Como adaptar:** a tabela acima é um checklist genérico. Para vendas, por exemplo, a sazonalidade
semanal provavelmente **existirá** — e aí os modelos devem incluí-la.

---

## Passo 3 — Construir os modelos com uma interface única

**Objetivo:** vários modelos intercambiáveis, cada um devolvendo previsão + faixa.

**O que fazer** (em [modelos.py](../backend/previsao/modelos.py)):

1. Definir o formato de saída comum (D27):
   ```python
   @dataclass
   class Previsao:
       modelo: str
       tabela: pd.DataFrame  # índice "data"; colunas previsao, inferior, superior
       detalhes: dict        # o que o modelo escolheu (configuração, AICc, parâmetros)
   ```
2. Escrever uma função por modelo, **todas com a mesma assinatura**
   `(serie, horizonte, nivel) -> Previsao`, e registrá-las num dicionário `MODELOS`; quem usa chama
   `prever(nome, serie, horizonte, nivel)`.
3. Implementar, nesta ordem:

| # | Modelo | Como foi feito |
|---|---|---|
| 1 | **Linha de base** (`prever_linha_base`) | Média dos últimos 7 dias. Faixa = ±1,96 × desvio dos erros que a própria regra cometeu no passado, para cada distância de 1 a 7 dias (D29, D36). **Sempre comece por ela: é a régua.** |
| 2 | **ETS** (`prever_ets`) | `ETSModel(error="add")`; testa sem tendência / tendência / amortecida e fica com o menor **AICc** (D28, D30). |
| 3 | **SARIMA** (`prever_sarima`) | `d` por teste ADF com tendência (`escolher_d`); depois 72 candidatos (p, q 0–2; P, Q 0–1 com período 7; com/sem tendência) e o menor AICc vence (D31, D33). |
| 4 | **Prophet** (`prever_prophet`) | Sazonalidades desligadas (série curta, sem ciclo semanal), `interval_width=0.95`, semente fixa (D32). |
| 5 | **Chronos-2** (`prever_chronos`) | Modelo pré-treinado `amazon/chronos-2` na CPU, sem treino; previsão = mediana, faixa = quantis 2,5%/97,5%; carregado 1x por processo (D47); versão fixa (`CHRONOS_VERSAO`) e carga pela pasta local do cache, sem consultar a internet (D51). |

Escolha automática pelo menor AICc (padrão para ETS e SARIMA):

```python
ranking.sort(key=lambda c: c["aicc"])
melhor = ranking[0]
```

```powershell
.venv\Scripts\python -m scripts.etapa3_modelagem
```

**Confira:**
- Um **teste de contrato** (`tests/test_modelos.py`) roda todos os modelos e confere colunas,
  datas e `inferior <= previsao <= superior`.
- Olhe os `detalhes`: parâmetros estranhos são alarme. Aqui, o MA do SARIMA em **−1,0** revelou
  diferenciação desnecessária; o ADF com tendência (`"ct"`) corrigiu (D33).

**Como adaptar:** troque a parte sazonal (7 → 12 para mensal, 24 para horário) e reative
sazonalidades do Prophet se a série tiver anos de histórico. Novos modelos entram só adicionando
uma função ao dicionário `MODELOS` — avaliação, caso de estudo e API passam a usá-los sozinhos.

---

## Passo 4 — Validar sem "espiar a prova"

**Objetivo:** medir o erro de cada modelo em dias que ele nunca viu.

**O que fazer** (em [avaliacao.py](../backend/previsao/avaliacao.py)):
1. `separar_treino_teste(serie, 10)` → os **últimos 10 dias** são o teste; nunca embaralhar (D06).
2. `avaliar(nome, serie)` → treina só no treino, prevê 10 dias, compara com o real.
3. `comparar_com_real(...)` calcula as métricas (D08, D34, D48):

| Métrica | Pergunta que responde |
|---|---|
| `mae` (erro médio, °C) | Quanto erra, em média? |
| `rmse` | Erra muito em algum dia? (pune erros grandes) |
| `cobertura` | O real caiu dentro da faixa de 95%? |
| `largura_faixa` | A faixa é útil ou larga demais? (cobertura sem largura engana) |
| `vies` | Erra sempre para o mesmo lado? |
| `mae_dias_1_7` | Erro no horizonte do produto (7 dias) |
| % vs linha de base | **Vale a pena trocar a regra simples?** |

4. `comparar_modelos(serie)` → tabela com todos os modelos lado a lado.

```powershell
.venv\Scripts\python -m scripts.etapa4_validacao
```

**Confira:** teste **anti-vazamento** — alterar os valores do período de teste não pode mudar a
previsão (`tests/test_avaliacao.py`). A escolha de configuração (AICc) acontece dentro do treino.

**Nosso resultado (teste 16/11–25/11, erro médio):** temperatura — Prophet e Chronos-2 0,31 °C,
SARIMA 0,38; sensação — SARIMA 0,29 °C (−15% vs base), Prophet 0,38 (pior que a base).
**Escolhido: SARIMA**, o mais consistente nas duas séries.

**Como adaptar:** com séries mais longas, troque o teste único por várias janelas
(*rolling origin*) — 10 dias de teste são pouco para separar sorte de mérito.

---

## Passo 5 — Caso de estudo: o que acontece quando o padrão muda

**Objetivo:** mostrar o efeito de treinar com dados de antes de uma mudança.

**O que fazer** (em [caso_estudo.py](../backend/previsao/caso_estudo.py)):
1. `datas_de_mudanca(...)` → data da mudança por variável (do Passo 2, recalculada dos dados).
2. `montar_cenarios(...)` → três treinos: **só antes** da mudança, **tudo**, **só depois**.
3. `avaliar_cenarios(...)` → todos avaliados na **mesma janela de teste** (os números ficam
   comparáveis com o Passo 4 — D35).

```powershell
.venv\Scripts\python -m scripts.etapa5_caso_estudo
```

**Nosso resultado:** "só antes" erra **2 a 6 vezes mais**, sempre para baixo.
**Conclusão prática: retreinar com frequência** — o que levou ao Passo 7.

**Como adaptar:** qualquer série de negócio tem mudanças (promoção, preço novo, pandemia). Rode este
teste com a data do evento para saber quanto tempo o modelo leva para "se recuperar".

---

## Passo 6 — Expor tudo numa API

**Objetivo:** a tela pede dados prontos; o servidor não trava nem recalcula à toa.

**O que fazer:**
1. [servico.py](../backend/previsao/servico.py) monta as respostas (JSON, datas `AAAA-MM-DD`,
   números com 2 casas, `null` no lugar de NaN); [app.py](../backend/app.py) só tem as rotas.
2. **8 rotas `GET`** em `/api`, uma por elemento da tela (D38): `saude`, `opcoes`, `serie`,
   `previsao`, `metricas`, `teste`, `caso-estudo`, `contexto`. Parâmetros na URL com padrão
   (`variavel=temperatura`, `modelo=sarima`, `horizonte=7`, limitado a 1–14). Documente cada uma
   em [api.md](api.md).
3. **Cache + fila única** (D37): treina no 1º pedido e guarda na memória; cálculos novos rodam um
   de cada vez (o GIL do Python impede ganho real com threads):
   ```python
   if args in resultados:      # já calculado: responde na hora
       return resultados[args]
   with trava:                 # senão, entra na fila
       if args not in resultados:
           resultados[args] = funcao(*args)
   ```
   Cálculos leves (`_calculo_leve`) usam trava própria para não esperar atrás dos pesados.
4. Erros sempre em JSON e em português; erro 500 sem detalhes internos (D40).
5. CORS só para a origem do frontend (`http://localhost:5173`), nunca `*` (D39).

```powershell
.venv\Scripts\python -m flask --app app run --port 5000
```

**Confira:** `http://127.0.0.1:5000/api/saude`; testes em `tests/test_api.py`. Meça o tempo do 1º
e do 2º pedido (aqui: SARIMA 6,3 s → 3 ms).

---

## Passo 7 — Atualização automática dos dados

**Objetivo:** dados sempre até ontem, sem ninguém rodar script.

**O que fazer** (`garantir_dados_atualizados` em `servico.py`, chamado por `@app.before_request`):
1. Comparar o último dia do CSV com **ontem no fuso local** (`zoneinfo`, não o fuso do PC).
2. Se faltar dia: baixar **tudo** antes de gravar qualquer coisa (tudo ou nada), gravar de forma
   atômica e limpar o cache (os modelos retreinam sozinhos).
3. Se a fonte falhar: seguir com os dados antigos, avisar em `/api/saude` e esperar 10 min antes
   de tentar de novo.

**Confira:** apague a última linha do CSV, reinicie a API e faça um pedido — o CSV deve voltar
completo. Testes (`tests/test_atualizacao.py`) usam cópias em pasta temporária e **congelam o
"hoje"** — nunca tocam nos CSVs reais.

---

## Passo 8 — Construir a tela

**Objetivo:** uma pessoa não técnica entender a previsão e confiar (ou não) nela.

**O que fazer** (em `frontend/`):
1. Criar com Vite (React + TypeScript); instalar Recharts, TanStack Query e Tailwind (D13, D42):
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
2. Proxy do Vite `/api` → `http://127.0.0.1:5000`: o código chama `/api/...` sem URL fixa.
3. Centralizar: cores ([cores.ts](../frontend/src/cores.ts) — temperatura azul `#2a78d6`, sensação
   laranja `#eb6834`, D25), eixos (`componentes/eixos.ts`) e formatação
   ([formatacao.ts](../frontend/src/formatacao.ts)).
4. Datas: API em `AAAA-MM-DD`, tela em `DD-MM-AAAA` via `formatarData`, convertendo o **texto**
   — `new Date("2027-01-01")` no fuso UTC−3 vira 31/12 (D41).
5. Seções: previsão (histórico + tracejado + faixa), comparação dos modelos, previsão x real no
   teste (● dentro, ✕ fora), caso de estudo; no topo, card "Visão geral" com abas (D43, D48–D50).
6. Nunca tela branca (D45): limite de erro por seção, esqueletos com contador de segundos,
   gráficos com `lazy` + `Suspense`, faixa de aviso quando a API cai.
7. Textos em linguagem simples **gerados por regras** a partir dos números
   ([textos.ts](../frontend/src/textos.ts), com testes — D46). Regra: temperaturas com 1 casa,
   erros com 2, iguais às tabelas.

**Confira:** `npm test`, `npm run lint`, `npm run build` — e **olhe a tela**. Os testes não pegaram
"Estável" ao lado de "+0,2 °C" (arredondamento); a revisão visual pegou.

**Como adaptar:** troque nomes e unidades em `textos.ts` e `formatacao.ts` (ex.: "°C" → "R$"); o
resto da tela só depende do formato da API.

---

## Passo 9 — Documentar enquanto faz

Não é um passo final — acontece em todos:
- **`decisoes.md`**: toda escolha não óbvia como **Decisão / Opções consideradas / Escolha / Por quê**.
- **`diario.md`**: por etapa, o que foi feito, números e o que aprendeu.
- **Um commit por etapa**, com testes e lint passando.
- **Relatório final** para o cliente: modelo vencedor, erro em unidades reais, limites.

---

## Checklist para aplicar em outro projeto

1. [ ] Série com **uma linha por período**, sem buracos, terminando no último período completo.
2. [ ] Explorar: memória (ACF), estacionariedade (ADF `c` e `ct`), sazonalidade, mudanças.
3. [ ] **Linha de base primeiro**; todo modelo é comparado a ela (% vs base).
4. [ ] Todos os modelos com a mesma assinatura `(serie, horizonte, nivel) -> Previsao`.
5. [ ] Configuração escolhida por critério do treino (AICc), nunca pelo teste.
6. [ ] Teste no fim da série + teste anti-vazamento.
7. [ ] Métricas em unidade real (MAE), cobertura **e** largura da faixa.
8. [ ] Caso de estudo com a data de alguma mudança conhecida.
9. [ ] API fina sobre o pacote de lógica; cache; atualização automática com gravação atômica.
10. [ ] Tela com textos por regras e revisão visual.
11. [ ] Decisões e diário escritos durante o trabalho, não depois.
