# Diário do projeto

Registro de cada etapa: o que foi feito, os resultados e o que aprendi.

---

## Etapa 0 — Preparação (2026-11-26)

### O que foi feito
- Plano aprovado: monorepo com `/backend`, `/frontend` e `/docs`, 9 etapas (0 a 8).
- Escopo ampliado: além da temperatura média, vamos prever a **sensação térmica média**
  (decisão D02, opção a).
- Python 3.12.10 instalado com `py install 3.12` (o 3.15 do sistema continua lá — decisão D11).
- Repositório Git criado (branch `main`) e `.gitignore` (ignora `.venv`, caches, `node_modules`).
- Ambiente virtual `backend/.venv` com as bibliotecas fixadas em `requirements.txt`:
  pandas 3.1.1, numpy 2.5.5, requests 2.34.2, matplotlib 3.11.2, statsmodels 0.15.0,
  prophet 1.5.0, Flask 3.1.3, flask-cors 6.0.5, pytest 9.2.0, ruff 0.17.6.
- `pyproject.toml` configurando ruff e pytest.
- Teste de ambiente (`tests/test_ambiente.py`): importa as bibliotecas e treina um Prophet com
  30 dias fictícios.
- Documentação inicial: `CLAUDE.md`, `README.md` e os arquivos de `docs/`.

### Resultados
- `ruff check`: sem erros (após um ajuste — ver abaixo).
- `pytest`: **2 testes passaram**. Avisos vindos de dentro do Prophet (uso de recurso do pandas
  que será descontinuado) — não afetam o funcionamento.

### O que aprendi
- **Ambiente virtual** isola as bibliotecas de cada projeto; versões fixadas no
  `requirements.txt` tornam o ambiente reproduzível.
- **Versão nova nem sempre é melhor:** o Python 3.15 é recente demais para o ecossistema
  científico; o 3.12 é a escolha segura.
- **Teste de fumaça:** um teste simples que "liga o motor" (treinar um Prophet minúsculo) detecta
  problemas de instalação antes de começarmos o trabalho de verdade.
- **Linter na prática:** o ruff apontou uma linha com 106 caracteres (limite 100); o
  `ruff format` corrigiu automaticamente.

### Dúvidas discutidas após a etapa
- **"A sensação térmica é só apoio da temperatura?"** Não: ela é prevista sozinha, com os mesmos
  modelos e métricas (D02 reescrita para deixar isso claro). A "variável auxiliar" era a opção
  descartada.
- **"Adicionar umidade e vento deixaria a sensação mais precisa?"** Em teoria, sim, mas para
  prever o futuro precisaríamos também da umidade e do vento futuros, que ainda não aconteceram.
  Prevê-los soma erros; usar a previsão pronta do Open-Meteo esvazia a POC. Decidimos manter o
  escopo (D19).
- **Lição:** uma variável que ajuda a *explicar* o passado nem sempre ajuda a *prever* o futuro.
  Ela só ajuda se o valor futuro dela for conhecido ou fácil de prever.

---

## Etapa 1 — Coleta de dados (2026-11-26)

### O que foi feito
- `backend/previsao/coleta.py`: funções pequenas e separadas — calcular o período, baixar as
  duas APIs, converter JSON em tabela, juntar as fontes (histórico tem prioridade), verificar a
  tabela (dias faltando, duplicados, vazios) e comparar as fontes nos dias em comum.
- `backend/scripts/etapa1_coleta.py`: roda a coleta real, salva o CSV e imprime um resumo.
- `backend/tests/test_coleta.py`: 8 testes com respostas falsas (sem internet — D22).
- Dados salvos em `backend/data/fortaleza_diario.csv`.

### Resultados
- **Período:** 28/08/2026 a 25/11/2026 — **90 dias, todos da API histórica** (`best_match`),
  sem dias faltando nem valores vazios.

| °C | Temperatura média | Sensação média |
|---|---|---|
| Média | 28,15 | 30,87 |
| Desvio-padrão | 0,52 | 0,88 |
| Mínimo | 27,2 | 29,5 |
| Máximo | 29,3 | 32,9 |
| Últimos 3 dias | 29,2 / 29,3 / 29,1 | 32,9 / 32,3 / 32,0 |

- **Comparação de fontes** (feita para investigar a diferença 0,0 °C entre histórico e previsão):

| Fonte | Último dia | Temp. média | Sensação média |
|---|---|---|---|
| `best_match` | 25/11 | 28,09 | 30,78 |
| `era5` puro | 19/11 | 27,50 | 29,87 |

- `pytest`: 10 testes passaram. `ruff`: sem erros.

### O que aprendi
- **Desconfie de resultado perfeito demais.** A diferença 0,0 °C entre as fontes parecia ótima,
  mas indicava que as duas APIs eram, na verdade, a mesma fonte. Investigar revelou que a ERA5
  pura é ~0,6 °C mais fria em Fortaleza.
- **Emendar fontes diferentes pode fabricar uma quebra estrutural.** O plano original (ERA5 +
  previsão nos últimos dias) criaria um salto artificial exatamente no período que queremos
  estudar. Consistência da fonte importa mais que "a fonte mais nobre" (D21).
- **Fortaleza varia pouco:** desvio-padrão de 0,5 °C na temperatura. As "mudanças fortes" serão
  de ~1–2 °C — pequenas em valor absoluto, mas grandes perto da variação normal. A sensação varia
  ~70% mais que a temperatura (0,88 x 0,52), como esperávamos (umidade e vento).
- **Os últimos dias estão no topo da série** (29,1–29,3 °C, perto do máximo de 29,3): primeiro
  indício da mudança recente, a ser analisada na etapa 2.
- **Hoje não entra na série** (D20): a média de um dia incompleto é parte previsão.

### Dúvidas discutidas antes da etapa 2
- **ERA5, `best_match` e `past_days`:** são duas APIs (histórica e de previsão). `models` escolhe
  o modelo meteorológico (`era5` ou `best_match`); `past_days` pede dias passados à API de
  previsão. Explicação completa no glossário.
- **A pouca variação atrapalha?** O que importa é ter padrão, não variar muito — e a série tem
  memória (autocorrelação 0,75/0,87). Mantivemos os 90 dias (D23).
- **6 meses ou 1 ano ajudariam?** Baixamos 3 anos só para olhar: Fortaleza tem um ciclo anual de
  ~2 °C. Mais meses misturariam estações; só com 2+ anos dá para modelar o ciclo. Decidimos usar
  os 3 anos apenas como **contexto** (D24).

---

## Etapa 2 — Exploração (2026-11-26)

### O que foi feito
- `backend/previsao/exploracao.py`: média móvel, teste ADF, força da sazonalidade semanal,
  detecção de ponto de mudança, contexto de 3 anos (mesmo período por ano, climatologia, anomalia).
- `backend/scripts/etapa2_exploracao.py`: números no terminal e 4 gráficos em `docs/img/`.
- `backend/tests/test_exploracao.py`: 5 testes com séries sintéticas de comportamento conhecido.
- `backend/data/fortaleza_contexto_3anos.csv`: 1.096 dias (26/11/2023 a 25/11/2026).

### Resultados

**Série de 90 dias**

![Séries](img/etapa2_series.png)

| | Temperatura | Sensação |
|---|---|---|
| Autocorrelação 1 / 2 / 3 / 7 dias | 0,75 / 0,63 / 0,60 / 0,54 | 0,87 / 0,75 / 0,68 / 0,72 |
| ADF na série (p-valor) | 0,86 → **não estacionária** | 0,92 → **não estacionária** |
| ADF nas diferenças diárias (p-valor) | 0,00 → estacionária | 0,00 → estacionária |
| Força da sazonalidade semanal | 0,10 (fraca) | 0,12 (fraca) |

![Autocorrelação](img/etapa2_autocorrelacao.png)

- **ACF** cai devagar (típico de série com tendência). **PACF** tem um pico forte só na
  defasagem 1 (0,74 e 0,86) e o resto fica dentro da faixa de significância (temperatura tem
  pequenos picos em 3–4 dias, no limite).

**Contexto de 3 anos**

![Contexto](img/etapa2_contexto.png)

| Mesmo período (28/08–25/11) | Temp. média | Sensação média |
|---|---|---|
| 2024 | 27,34 | 28,96 |
| 2025 | 27,63 | 29,63 |
| **2026** | **28,15** | **30,87** |

| Subida dentro do período (últimos 15 dias − primeiros 15) | Temp. | Sensação |
|---|---|---|
| 2024 | +0,95 | +2,67 |
| 2025 | +0,55 | +0,75 |
| 2026 | +0,94 | +1,58 |

**Anomalia de 2026 e ponto de mudança**

![Anomalia](img/etapa2_anomalia.png)

| | Temperatura | Sensação |
|---|---|---|
| Anomalia média no período | +0,66 °C | +1,58 °C |
| Anomalia nos últimos 10 dias | +0,79 °C | +1,54 °C |
| Mudança detectada (na anomalia) | **15/10**: +0,49 → +0,86 | **23/10**: +1,35 → +1,96 |
| Mudança detectada (na série bruta) | 23/10: 27,85 → 28,65 | 25/10: 30,33 → 31,86 |

- `pytest`: 15 testes passaram. `ruff`: sem erros.

### O que aprendi
- **A subida recente é metade estação, metade anomalia.** Todo ano a temperatura sobe ~0,5–1 °C
  de agosto a novembro — isso é estação. O que é diferente em 2026 é o **nível**: o ano inteiro
  está acima do normal (+0,5 °C já em setembro), e a partir de meados de outubro sobe mais um
  degrau (+0,86 °C). Na sensação o efeito é maior (+1,96 °C após 23/10).
- **Onde se procura a mudança muda a resposta:** na série bruta o detector aponta 23–25/10, porque
  mistura estação e anomalia; na anomalia aponta 15/10 (temperatura). Para o caso de estudo, a
  data candidata é **meados/fim de outubro** — a escolha exata fica para a etapa 5.
- **Pistas para a modelagem (etapa 3):**
  - Série **não estacionária**, diferenças estacionárias → o SARIMA deve usar **d = 1**.
  - PACF com um pico só na defasagem 1 → um termo autorregressivo (p = 1) deve bastar; com d = 1,
    candidatos simples como ARIMA(1,1,0) ou (0,1,1).
  - **Sem padrão semanal** (força ~0,1) → nem SARIMA nem ETS precisam de sazonalidade de 7 dias;
    o "S" do SARIMA provavelmente ficará desligado. Prophet com sazonalidade semanal só
    acrescentaria ruído.
  - Há **tendência de alta** no fim da série — mas parte é estação, que vai se estabilizar em
    dezembro (pico do ciclo). Um modelo que prolongue a tendência pode exagerar.
- **Um dia atípico no início do teste:** 16/11 teve 27,5 °C (−0,4 °C abaixo do normal, provável
  dia de chuva), seguido de volta rápida a 28,6–29,3. Ele vai pesar nas métricas da etapa 4.
- **Testes estatísticos erram.** O teste do ADF falhou com uma semente aleatória "azarada" (p =
  0,013 num passeio aleatório): é o erro de ~5% que o próprio teste admite.

---

## Etapa 3 — Modelagem (2026-11-26)

### O que foi feito
- `backend/previsao/modelos.py`: os 4 modelos com a mesma interface (D27). ETS e SARIMA escolhem
  a configuração pelo menor AICc (D28); o SARIMA escolhe d por teste (D33).
- `backend/scripts/etapa3_modelagem.py`: treina nos 90 dias, prevê 26/11 a 02/12 e gera
  `docs/img/etapa3_previsoes.png`.
- `backend/tests/test_modelos.py`: teste de contrato dos 4 modelos + regras específicas (10 testes).
- `exploracao.teste_adf` ganhou o parâmetro `regressao` ("c" ou "ct").

### Resultados

![Previsões](img/etapa3_previsoes.png)

**Configurações escolhidas**

| | Temperatura | Sensação |
|---|---|---|
| ETS | sem tendência, α = 0,29 | sem tendência, α = 0,89 |
| SARIMA | (1,1,1) + drift — d = 1 (ADF c/ tendência p = 0,17) | (1,0,0) + tendência linear — d = 0 (p = 0,002) |
| Melhor SARIMA *com* parte sazonal | 3º lugar (+4,5 no AICc) | 5º lugar (+1,8) |
| Prophet | tendência por partes, sem sazonalidade | idem |

**Previsões (26/11 → 02/12) e inclinação**

| | Temp. 26/11 | Temp. 02/12 | °C/dia | Sens. 26/11 | Sens. 02/12 | °C/dia |
|---|---|---|---|---|---|---|
| Linha de base | 29,06 | 29,06 | 0 | 32,16 | 32,16 | 0 |
| ETS | 29,07 | 29,07 | 0 | 32,04 | 32,04 | 0 |
| SARIMA | 29,09 | 29,26 | +0,028 | 32,04 | 32,23 | +0,031 |
| Prophet | 28,99 | 29,11 | +0,020 | 32,34 | 32,53 | +0,033 |

Último valor real: 29,1 (temperatura) e 32,0 (sensação).

**Largura da faixa de 95% (1º → 7º dia, °C)**

| | Temperatura | Sensação |
|---|---|---|
| Linha de base | 1,30 → 1,40 | 1,94 → 2,19 |
| ETS | 1,24 → 1,52 | 1,72 → **4,15** |
| SARIMA | 1,14 → 1,21 | 1,57 → 2,06 |
| Prophet | 1,11 → 1,21 | 1,61 → 1,78 |

- `pytest`: 25 testes passaram. `ruff`: sem erros.

### O que aprendi
- **O ajuste diz quando o modelo está errado.** Com d = 1 fixo, o SARIMA estimou MA = −1,0 — o
  modelo "desfazendo" a diferenciação. Investigando, vimos que o ADF da etapa 2 só testou
  estacionariedade em torno de um nível fixo; a sensação é estacionária **em torno de uma reta**
  (p = 0,002). Corrigido: d agora vem do ADF com tendência (D33).
- **Os dados confirmaram a etapa 2:** a sazonalidade semanal entrou como candidata e perdeu.
- **α conta a história do ETS:** temperatura com α = 0,29 (média de vários dias — a faixa cresce
  devagar); sensação com α = 0,89 (quase "amanhã = hoje" — a faixa explode de 1,7 para 4,2 °C em
  7 dias). Nenhum ETS escolheu tendência.
- **Dois grupos de modelos:** linha de base e ETS preveem **estabilidade**; SARIMA e Prophet
  **prolongam a alta** (+0,02 a +0,03 °C/dia ≈ +0,2 °C na semana). A etapa 2 mostrou que parte da
  alta é estação, que estabiliza em dezembro — a validação dirá quem acerta mais.
- **Prophet não tem memória de curto prazo:** ele desenha uma linha de tendência, sem olhar o
  último valor. Por isso começa em 28,99 (abaixo do último real, 29,1) na temperatura e salta para
  32,34 (acima de 32,0) na sensação. ETS e SARIMA partem do último valor porque usam a
  autocorrelação.
- **Faixas estreitas não são necessariamente melhores:** Prophet e SARIMA têm as faixas mais
  estreitas. Se forem estreitas demais, a cobertura na etapa 4 vai ficar abaixo de 95%.
- **Testes lentos custam:** a busca de 72 combinações do SARIMA tornava a suíte lenta (55 s). Uma
  *fixture* que treina cada modelo uma vez reduziu para 41 s.

### Dúvidas discutidas antes da etapa 4
- **O que são d, MA e AICc?** d = quantas vezes transformamos a série em variações diárias; MA =
  correção pelo erro de ontem; AICc = nota de erro + multa por complexidade (menor = melhor;
  diferença < 2 = empate). Exemplos numéricos acrescentados ao glossário.
- **Pedido para o relatório final:** uma seção explicando o que foi decidido e configurado em cada
  modelo, com todos os termos explicados no próprio arquivo (registrado no `CLAUDE.md` e no
  esqueleto do relatório).

---

## Etapa 4 — Validação (2026-11-26)

### O que foi feito
- `backend/previsao/avaliacao.py`: MAE, RMSE, cobertura, separação treino/teste, `avaliar` (um
  modelo) e `comparar_modelos` (os 4, com MAE relativo à linha de base).
- `backend/scripts/etapa4_validacao.py`: métricas, erro dia a dia e `docs/img/etapa4_teste.png`.
- `backend/tests/test_avaliacao.py`: métricas com contas de cabeça, separação e **teste
  anti-vazamento** (6 testes).
- Treino: 28/08 a 15/11 (80 dias). Teste: 16/11 a 25/11 (10 dias). A busca de configuração (AICc,
  ADF) rodou só no treino.

### Resultados

![Teste](img/etapa4_teste.png)

**Temperatura média**

| Modelo | MAE | RMSE | Cobertura | MAE dias 1–7 | Viés | vs linha de base |
|---|---|---|---|---|---|---|
| Linha de base | 0,46 | 0,55 | 70% | 0,40 | −0,24 | — |
| ETS | 0,43 | 0,53 | 90% | 0,38 | −0,20 | −6% |
| SARIMA | 0,38 | 0,50 | 90% | 0,35 | −0,10 | −18% |
| **Prophet** | **0,31** | **0,46** | 90% | **0,31** | −0,01 | **−33%** |

**Sensação térmica média**

| Modelo | MAE | RMSE | Cobertura | MAE dias 1–7 | Viés | vs linha de base |
|---|---|---|---|---|---|---|
| Linha de base | 0,34 | 0,49 | 100% | 0,25 | −0,24 | — |
| ETS | 0,33 | 0,42 | 100% | 0,31 | −0,03 | −2% |
| **SARIMA** | **0,29** | 0,44 | 100% | **0,22** | −0,16 | **−15%** |
| Prophet | 0,38 | 0,43 | 100% | 0,39 | +0,19 | +13% |

- Configurações no treino de 80 dias: ETS sem tendência (as duas variáveis); SARIMA(1,0,0) +
  tendência linear (as duas — na temperatura, com 90 dias o teste ADF tinha escolhido d = 1).
- **Dia atípico:** 16/11 (27,5 °C) — todos os modelos erraram +1,1 a +1,3 °C e ficou fora da
  faixa de todos. Sem ele, o MAE da temperatura fica 0,41 / 0,36 / 0,28 / 0,20 — mesma ordem.
- Na sensação, os maiores erros foram 22–23/11 (pico de 32,8–32,9 °C), −0,5 a −1,0 °C.
- `pytest`: 31 testes passaram. `ruff`: sem erros.

### O que aprendi
- **Todos os modelos bateram (ou empataram com) a regra simples, menos o Prophet na sensação.** A
  dúvida da D23 tem resposta: há ganho, de 15% a 33% para o melhor modelo de cada variável.
- **Não existe um vencedor único:** Prophet ganhou na temperatura (−33%) e foi o **pior** na
  sensação (+13%). O SARIMA foi o mais **consistente**: 2º na temperatura e 1º na sensação, sempre
  melhor que a linha de base (−18% e −15%). Candidato a "vencedor geral" — decisão final na etapa 8.
- **Por que modelos com tendência ganharam na temperatura:** a alta continuou durante o teste
  (viés negativo em todos). Quem prolongou a tendência (Prophet, SARIMA) errou menos. Mas é um
  teste de 10 dias numa fase de subida sazonal: em dezembro, com o pico do ciclo, a vantagem pode
  inverter.
- **Na sensação, o Prophet exagerou a tendência** (viés +0,19): previu subida e a sensação ficou
  estável. Sem memória de curto prazo, ele não "percebe" que os últimos dias pararam de subir.
- **Cobertura:** na sensação, 100% em todos — as faixas são largas (às vezes largas demais, como
  o ETS chegando a 4 °C). Na temperatura, 90% nos modelos e 70% na linha de base (errou 3 dias no
  fim, quando a alta continuou). Com 10 dias, cada dia vale 10 pontos de cobertura.
- **A configuração depende dos dados de treino:** a temperatura com 80 dias passou no ADF com
  tendência (d = 0) e com 90 dias não (d = 1). Com séries curtas, a escolha de modelo é instável
  — mais um motivo para não confiar demais em diferenças pequenas.
- **Diferenças pequenas, dias decisivos:** entre ETS e linha de base a diferença é de 0,01–0,03 °C
  — empate prático. O erro dia a dia mostrou que o ranking da temperatura não depende só de 16/11.

---

## Etapa 5 — Caso de estudo: quebra estrutural (2026-11-26)

### O que foi feito
- `backend/previsao/caso_estudo.py`: datas de mudança (recalculadas na anomalia), três cenários de
  treino e avaliação de todos os modelos na mesma janela de teste (D35).
- `backend/previsao/avaliacao.py`: `comparar_com_real` extraída para ser usada pela validação e
  pelo caso de estudo (sem código duplicado).
- **Bug corrigido** na linha de base: com horizonte longo, a faixa virava NaN (D36).
- `backend/scripts/etapa5_caso_estudo.py` e `docs/img/etapa5_caso_estudo.png`.
- Testes: 4 do caso de estudo (com um degrau sintético de +2 °C) + 2 da linha de base.

### Resultados

![Caso de estudo](img/etapa5_caso_estudo.png)

| Cenário | Temperatura (mudança 15/10) | Sensação (mudança 23/10) |
|---|---|---|
| Só antes | 28/08–14/10, 48 dias, média 27,79 | 28/08–22/10, 56 dias, média 30,30 |
| Tudo | 28/08–15/11, 80 dias, média 28,06 | 28/08–15/11, 80 dias, média 30,72 |
| Só depois | 15/10–15/11, 32 dias, média 28,48 | 23/10–15/11, 24 dias, média 31,68 |
| **Teste (real)** | 16/11–25/11, média **28,84** | 16/11–25/11, média **32,10** |

**MAE no teste (°C) — e cobertura**

| Modelo | Temp. só antes | Temp. tudo | Temp. só depois | Sens. só antes | Sens. tudo | Sens. só depois |
|---|---|---|---|---|---|---|
| Linha de base | 0,94 (10%) | 0,46 (70%) | 0,46 (90%) | 1,29 (50%) | 0,34 (100%) | 0,34 (90%) |
| ETS | 0,95 (50%) | 0,43 (90%) | **0,31** (90%) | 1,36 (100%) | 0,33 (100%) | 0,34 (100%) |
| SARIMA | **1,11 (10%)** | 0,38 (90%) | **0,31** (90%) | **1,79 (0%)** | **0,29** (100%) | 0,45 (80%) |
| Prophet | 0,31 (90%) | **0,31** (90%) | 0,47 (60%) | 0,35 (90%) | 0,38 (100%) | **0,30** (100%) |

**"Só antes" nos 10 primeiros dias logo após a mudança** (mesma distância do teste normal):
temperatura — linha de base 0,29, ETS 0,30, SARIMA 0,45, Prophet 0,17; sensação — 0,74 / 0,81 /
1,20 / 0,55.

- `pytest`: 37 testes passaram. `ruff`: sem erros.

### O que aprendi
- **Quem não conhece o novo regime erra muito e para o mesmo lado.** Linha de base, ETS e SARIMA
  treinados "só antes" erraram 2 a 6 vezes mais que com "tudo", sempre para baixo (viés de −0,8 a
  −1,8 °C): continuaram prevendo o nível antigo (~28,0 e ~30,8 °C).
- **O intervalo não protege contra quebras.** O SARIMA "só antes" teve cobertura de 10% e 0%: a
  faixa era estreita e confiante — no regime errado. Um intervalo só mede a incerteza do mundo que
  o modelo conhece.
- **O SARIMA "só antes" foi o pior por reversão à média:** sem tendência (o treino antigo não
  justificava), ele puxou a previsão para a média do treino (27,8 / 30,3), abaixo até do último
  valor visto.
- **A surpresa: o Prophet "só antes" quase não piorou** (0,31 e 0,35). O treino antigo já tinha
  a subida sazonal de setembro/outubro; o Prophet aprendeu essa inclinação e a prolongou — e a
  série continuou subindo. Lição: um modelo de **tendência** sobrevive a uma mudança que seja
  continuação da tendência; um modelo de **nível** não. Mas é sorte de calendário: em dezembro (pico
  do ciclo) essa reta passaria do ponto.
- **Quebra x estação na temperatura:** a anomalia subiu só +0,37 °C em 15/10, mas o "só antes"
  errou 0,84 °C para baixo no teste. A maior parte do erro é a **subida sazonal** que continuou
  depois do treino, não a quebra em si. Logo após a mudança o erro era só 0,29. Na sensação a
  quebra é mais forte (+0,61 na anomalia) e o erro já aparece logo depois (0,74).
- **Descartar o passado ("só depois") ajuda às vezes:** na temperatura, ETS e SARIMA melhoraram
  (0,31, empatando com o melhor da etapa 4); na sensação, com só 24 dias, o SARIMA piorou (0,45).
  Menos dados = parâmetros mais instáveis. "Tudo" foi a escolha mais segura.
- **Conclusão prática:** o remédio para quebras é **retreinar com frequência** (ex.: todo dia),
  não escolher o modelo "perfeito". Linha de base, ETS e SARIMA usam os dias recentes e se ajustam
  rápido quando retreinados.

---

## Etapa 6 — API Flask (2026-11-26)

### O que foi feito
- `backend/previsao/servico.py`: uma função por endpoint (monta o JSON), validação dos
  parâmetros e cache em memória dos cálculos pesados (D37).
- `backend/app.py`: 7 rotas GET, erros em JSON e em português (D40), CORS só para o frontend
  (D39). Padrão *application factory* (`create_app`).
- `backend/tests/test_api.py`: 19 testes com o cliente de teste do Flask (rotas, parâmetros,
  erros 400/404/405, ausência de NaN, CORS). Nos testes, só os 2 modelos rápidos são usados.
- `docs/api.md`: documentação completa de cada endpoint, com exemplos reais.

### Resultados
- Servidor real testado com `curl`: todas as rotas responderam 200; parâmetros inválidos → 400
  com a lista de valores aceitos; rota inexistente → 404; CORS liberado para
  `http://localhost:5173`.

| Pedido | 1ª chamada | Seguintes (cache) |
|---|---|---|
| `/api/previsao` (SARIMA) | 6,3 s | 3 ms |
| `/api/metricas` | 11,0 s | 24 ms |
| `/api/teste` (após `/metricas`) | 3 ms | 3 ms |
| `/api/caso-estudo` | 29,1 s | 5 ms |

- `pytest`: 56 testes passaram. `ruff`: sem erros.

### O que aprendi
- **Separar "web" de "lógica" compensa:** o `app.py` ficou só com rotas e erros; a lógica está
  no `servico.py`, que reaproveita as funções das etapas 1–5. Nada de modelo foi reescrito.
- **Cache muda a experiência:** de segundos para milissegundos. Mas o primeiro pedido continua
  lento — o frontend precisa mostrar "carregando", e `/api/teste` aproveita o cálculo de
  `/api/metricas` (os dois usam a mesma validação).
- **O plano mudou com bons motivos:** "treinar tudo ao iniciar" parecia simples, mas deixaria o
  servidor lento para subir e reiniciar a cada edição. Registrado em D37.
- **NaN não é JSON:** o Python aceita `NaN`, mas o navegador não consegue ler. Um teste garante
  que nenhuma resposta tem `NaN`.
- **CORS é configuração de segurança, não detalhe:** liberar `*` funcionaria, mas abriria a API
  para qualquer página. Um teste confirma que uma origem estranha não é liberada.
- **Testes rápidos com `monkeypatch`:** trocar a lista de modelos por só os rápidos deixou os
  19 testes da API em ~2 s, sem mudar o código de produção.

---

## Etapa 7 — Frontend (2026-11-26)

### O que foi feito
- **Datas em DD-MM-AAAA** (pedido do usuário): conversão só na exibição, numa função única com
  testes; a API continua em AAAA-MM-DD (D41). Números com vírgula (`29,10 °C`).
- Projeto `frontend/` com Vite + React 19 + TypeScript 7, Recharts 3, TanStack Query 5,
  Tailwind 4 e Vitest (D42).
- `src/api.ts` (tipos das respostas + pedidos), `src/consultas.ts` (hooks), `src/formatacao.ts`
  (+ 8 testes), `src/componentes/` (seletores, gráfico principal, tabela de métricas, previsão x
  real, caso de estudo, eixos e tooltip compartilhados) — D43.
- `.claude/launch.json` para subir backend e frontend no navegador embutido.
- **Ajuste no backend:** fila única de cálculos na API (atualização da D37) + teste de que pedidos
  iguais simultâneos calculam uma vez só.

### Resultados
- `tsc`, `oxlint`, Vitest (8 testes) e `build` sem erros; backend com 57 testes passando.
- Tela verificada no navegador: 4 seções funcionando; troca de variável, modelo e horizonte;
  comparação com a outra variável; tooltip com data em DD-MM-AAAA; nenhum erro no console.

| Primeiro carregamento (servidor recém-iniciado) | Antes da fila | Com a fila |
|---|---|---|
| Gráfico principal pronto | 42 s | **10 s** |
| Tabela de métricas pronta | 64 s | **27 s** |
| Tudo pronto (caso de estudo) | 95 s | 81 s |
| Recarregar com cache | — | instantâneo |

### O que aprendi
- **Testar a tela de verdade encontra o que os testes automáticos não pegam:** (1) o "°C" quebrava
  em duas linhas no eixo; (2) 4 pedidos simultâneos deixavam tudo lento; (3) o gráfico antigo
  aparecia sob o título novo enquanto o modelo treinava. Os três foram corrigidos.
- **Paralelo nem sempre é mais rápido:** por causa do GIL, uma fila fez a primeira resposta chegar
  4x mais rápido, com o mesmo trabalho total. O que importa para quem usa é ver *algo* cedo.
- **Formato de máquina x formato de pessoa:** a API usa AAAA-MM-DD (ordena e converte sem
  ambiguidade); a tela mostra DD-MM-AAAA. Converter o texto em vez de usar `new Date()` evita o
  bug clássico de fuso horário.
- **Uma regra visual, um lugar:** eixos, cores e formatação ficam em arquivos únicos
  (`eixos.ts`, `cores.ts`, `formatacao.ts`); corrigir o "°C" foi uma mudança só.

---

## Ajustes antes da etapa 8 — atualização automática e tela robusta (2026-11-26)

### Pedidos do usuário
1. Os dados devem ir sempre até o **dia anterior ao acesso**, não ficar parados em 25-11-2026.
2. A tela **nunca** pode quebrar ou ficar branca: carregamentos, suspenses e avisos visuais.

### O que foi feito
- **Backend (D44):** `garantir_dados_atualizados()` antes de cada pedido; "ontem" no fuso de
  Fortaleza; baixa 90 dias + contexto, grava (de forma atômica) e limpa o cache; se o Open-Meteo
  falhar, mantém os dados e avisa em `/api/saude`, tentando de novo após 10 min.
- **Frontend (D45):** limites de erro (seção, faixa, página), esqueletos com contador de segundos,
  `lazy` + `Suspense` nos gráficos, faixa de aviso no topo com "Tentar de novo", mensagens claras
  para backend desligado e recarga automática quando o dia vira.
- **Testes:** 5 novos testes da atualização (sem internet, sem tocar nos CSVs reais) — backend com
  62 testes; os testes da API agora "congelam o hoje".

### Resultados (verificados no navegador)
- **Atualização real:** último dia removido do CSV → ao reiniciar, a API baixou do Open-Meteo e o
  CSV voltou idêntico (`atualizado_em: 2026-11-26T11:56:19`).
- **Backend desligado:** faixa vermelha "Sem conexão com a API" + aviso em cada seção, nenhuma
  tela branca; ligando o backend, **um clique** em "Tentar de novo" recuperou tudo.
- **Carregamento:** esqueleto "Treinando o modelo SARIMA… 4 s" no lugar de cada gráfico.
- **Pacote JavaScript:** principal de 716 kB → 270 kB (gráficos baixados sob demanda).

### O que aprendi
- **Dado "vivo" pede cuidados que dado fixo não pede:** fuso horário, falha da fonte externa,
  arquivo gravado pela metade, testes que não podem depender do dia em que rodam.
- **Os testes antigos tinham uma bomba-relógio:** a partir de amanhã, a atualização automática faria
  os testes da API baixarem dados reais e sobrescreverem o CSV. Congelar o "hoje" no teste resolveu.
- **Limite de erro em camadas:** testando de verdade, uma resposta antiga da API quebrou a faixa de
  aviso. O limite geral evitou a tela branca, mas levou a página junto; um limite só para a faixa
  isola o problema. Quanto mais perto do componente, menor o estrago.
- **`Suspense` resolveu dois problemas de uma vez:** carregamento visível e pacote menor.

---

## Ajustes antes da etapa 8 — tela para o usuário comum (2026-11-26)

### Dúvidas discutidas
- **Isto é IA?** Os modelos são estatísticos (ETS, SARIMA, Prophet) que aprendem parâmetros com o
  histórico — "IA" no sentido amplo, mas não redes neurais. Com 90 pontos, estatística clássica é
  a escolha certa; IA moderna para séries = modelos fundacionais (Chronos, TimesFM).
- **Chronos:** gratuito (Apache 2.0) e local; baixa o modelo uma vez do Hugging Face e recebe os
  90 valores como contexto — não busca nem envia dados. Modelos de linguagem (Gemini, Claude)
  servem para **explicar** a previsão, não para fazê-la.
- **Evolução:** ML exige mais dados, features e validação em várias janelas; o maior valor está
  em aplicar a POC a métricas de negócio (vendas, demanda), onde não há "modelo físico" melhor
  que o histórico. Tudo registrado como melhoria futura no relatório.

### O que foi feito (D46)
- `frontend/src/textos.ts`: frases geradas por regras (resumo, confiança, comparação, teste, caso
  de estudo, descrição dos modelos, explicações dos ícones) + `textos.test.ts` (21 testes).
- Componentes novos: `ResumoPrevisao` (cartões + parágrafos) e `Ajuda` (ícone **i**).
- Tabela de métricas e caso de estudo em linguagem simples, com detalhes técnicos recolhidos.

### Resultados
- Frontend: 29 testes, tipos, lint e build sem erros.
- Verificado no navegador, nas duas variáveis. Exemplo real (sensação, SARIMA): "Nos próximos 7
  dias, a sensação térmica média deve ficar com leve alta: de 32,0 °C em 26-11-2026 para 32,2 °C
  em 02-12-2026. O mais provável é que fique entre 31,1 °C e 33,3 °C."

### O que aprendi
- **Texto gerado também precisa de teste:** cinco problemas só apareceram olhando a tela — o
  pior foi "Estável" ao lado de "+0,2 °C". Arredondamento pode fazer uma frase contradizer outra.
- **Uma régua de casas decimais:** temperaturas com 1 casa, erros com 2 — texto e tabela precisam
  mostrar o mesmo número.
- **Posicionamento importa:** um aviso dentro de uma tabela com rolagem é cortado pela borda dela;
  posicionar em relação à janela resolve em qualquer lugar.

---

## Etapa 8 — Relatório final (2026-11-26)

### Decisões do usuário antes da etapa
- A seção **"Isto é IA?"** entra no relatório, só como explicação (mapa dos níveis).
- O próximo ponto de evolução é o **Chronos**; ML e deep learning próprios **não** entram nos
  próximos passos.
- Ainda não há métrica real do cliente: o relatório usa um **exemplo genérico** (vendas diárias).
- Ajuste no frontend: os seletores do topo estavam desalinhados (a descrição do modelo empurrava
  o bloco "Modelo" para cima); alinhados pelo topo em `Seletores.tsx`.

### O que foi feito
- `docs/relatorio-final.md` escrito para o cliente, em 11 seções: resumo executivo, objetivo,
  dados, gráficos, como cada modelo foi decidido e configurado (com todos os termos explicados no
  próprio arquivo), comparação, modelo vencedor, caso de estudo, "Isto é IA?", limites e próximos
  passos.
- Números conferidos contra a API em execução (`/api/metricas`, `/api/previsao`): iguais aos do
  diário (retrato de 26-11-2026).

### Resultado
- **Modelo recomendado: SARIMA** — 2º na temperatura (0,38 °C, −18% vs regra simples) e 1º na
  sensação (0,29 °C, −15%), sempre melhor que a régua. O Prophet teve o melhor número isolado
  (0,31 °C na temperatura), mas foi o pior na sensação (+13%).
- Erro esperado na próxima semana: ~0,3 a 0,4 °C por dia.

### O que aprendi
- **Escrever para o cliente obriga a escolher:** o diário tem tudo; o relatório precisa de uma
  recomendação clara e dos cuidados com ela (teste de 10 dias, fase de subida sazonal).
- **Consistência x melhor número:** "vencedor" depende do critério. Para uma ferramenta que prevê
  séries novas todo dia, ficar sempre acima da régua pesa mais que ganhar um teste isolado.
- **Ser honesto sobre "IA"** evita expectativa errada: a POC é estatística clássica, e o caminho
  para IA moderna (Chronos) já está desenhado e encaixa na interface comum.

---

## Evolução 11.2 — Chronos-2 como 5º modelo (2026-11-26)

### Passo 1 — instalar e testar fora do projeto
- `torch 2.15.0+cpu` (repositório oficial do PyTorch para CPU) e `chronos-forecasting 2.3.2`; o
  `pip check` não acusou conflitos (pandas e numpy continuaram nas mesmas versões).
- Modelo `amazon/chronos-2`: 119,5 milhões de parâmetros, 456 MB em `~/.cache/huggingface`.
- Teste rápido com a série real: carregar o modelo levou 23,8 s na 1ª vez (com download) e 1,2 s
  depois; prever 7 dias, **0,06 s**; duas rodadas deram **exatamente** o mesmo resultado.
- Quantis treinados: 1%, 5%, 10%, ..., 95%, 99%. Os de 2,5% e 97,5% (faixa de 95%) a biblioteca
  calcula entre os vizinhos.

### Passo 2 — `prever_chronos` (D47)
- `backend/previsao/modelos.py`: previsão = mediana; faixa = quantis de 2,5% e 97,5%; modelo
  carregado uma vez por processo; nível acima de 98% dá erro claro.
- Entrou em `MODELOS` → validação, caso de estudo e API passaram a incluí-lo **sem mudar uma
  linha** nesses arquivos (a interface comum, D27, funcionou como planejado).
- `requirements.txt` com `--extra-index-url` do PyTorch; 5 testes novos com o modelo real.

### Passo 3 — validação e caso de estudo com 5 modelos

| MAE no teste (°C) | Base | ETS | SARIMA | Prophet | Chronos-2 |
|---|---|---|---|---|---|
| Temperatura | 0,46 | 0,43 | 0,38 | **0,31** | **0,31** (−32%) |
| Sensação | 0,34 | 0,33 | **0,29** | 0,38 | 0,33 (−1%) |

| Largura média da faixa (°C) | Base | ETS | SARIMA | Prophet | Chronos-2 |
|---|---|---|---|---|---|
| Temperatura | 1,19 | 1,30 | 1,14 | 1,01 | **2,14** |
| Sensação | 2,21 | 3,42 | 2,02 | 1,66 | **4,05** |

- Caso de estudo, Chronos-2 "só antes": 1,04 °C (temp.) e 1,49 °C (sens.), com cobertura de
  **10 de 10 dias** — errou o nível, mas a faixa larga "acertou".
- Os scripts das etapas 3 a 5 tinham a grade de gráficos fixa em 4 colunas; agora usam uma coluna
  por modelo. Gráficos refeitos em `docs/img/`.

### Passo 4 — API e tela
- `api.ts` (tipo `Modelo`) e `textos.ts` (descrição do Chronos-2). Mensagens de carregamento sem
  "treinando" (o Chronos não treina).
- **Achados no teste da tela (corrigidos):**
  1. Prophet e Chronos-2 apareciam os dois como "menor erro" na tabela (0,31 °C, a API arredonda
     para 2 casas), mas a frase citava só o Prophet. Agora: "Prophet e Chronos-2 empataram com o
     menor erro: 0,31 °C em média. Isso é 32% a 33% menos erro que a regra simples."
  2. O caso de estudo dizia "modelo treinado só com os dias anteriores" — falso para o Chronos.
     Agora diz "que só viu os dias anteriores" e a lição fala em "receber os dados recentes".
  3. O Chronos "só antes" errou 1,04 °C mas acertou a faixa em 10 de 10 dias, e o texto não
     comentava. Nova regra (vale para qualquer modelo): erro alto + faixa acertando mais da
     metade → "a faixa ainda cobriu X de N dias, mas só porque era larga".
- Verificado no navegador com um backend próprio na porta 5001 (5000 e 5173 estavam em uso por
  outra sessão, com o código antigo).

### Resultados
- Backend: 67 testes (eram 62) + ruff limpo. Frontend: 31 testes (eram 29) + tsc + oxlint + build.
- **Resposta à pergunta da evolução: a IA moderna empata, não ganha.** O SARIMA continua sendo a
  recomendação.

### O que aprendi
- **Zero-shot de verdade:** sem treino nem configuração, o Chronos-2 ficou no nível dos melhores
  modelos clássicos. Numa métrica nova, é um ótimo ponto de partida no primeiro dia.
- **Cobertura sozinha engana:** uma faixa larga "acerta" sempre. A largura da faixa precisa ser
  lida junto — hoje ela não é métrica oficial da POC (candidata a melhoria).
- **Modelo fundacional também fica preso ao contexto:** se a mudança não está nos dados que ele
  recebe, ele não a vê. Atualizar os dados todo dia (D44) vale para ele também.
- **Um modelo novo muda os textos:** empates e "treinado" só apareceram como problema com o 5º
  modelo — de novo, o texto gerado precisou ser visto na tela, não só nos testes.

---

## Cards gerais — card 1: Ranking geral dos modelos (2026-11-26)

### Pedido
Comparações ainda "avulsas", uma variável e um modelo por vez. O usuário pediu três cards gerais,
com todos os modelos e sem depender da variável escolhida: (1) ranking geral, (2) caso de estudo
com todos, (3) comparação com anos anteriores. Uma etapa por card.

### O que foi feito (D48)
- **Largura da faixa** (`largura_faixa`) virou métrica oficial em `avaliacao.py` → aparece em
  `/api/metricas`, `/api/teste` e `/api/caso-estudo`. Backend: 68 testes.
- `frontend/src/ranking.ts`: posição em cada variável (MAE; empate → "vs regra simples"),
  ranking geral pela posição média (empate → erro médio). `textoRanking` em `textos.ts`.
- `RankingGeral.tsx`: card no topo da tela, antes dos seletores. Clicar num modelo o seleciona.
- Frontend: 38 testes (eram 31), tsc + oxlint limpos; conferido no navegador.

### Resultado (tela, 26-11-2026)
"No geral, o SARIMA foi o mais regular: 3º na temperatura e 1º na sensação térmica. Foi melhor que
a regra simples nas duas. O Chronos-2 teve o menor erro somando as duas (0,32 °C contra 0,34 °C),
mas superou a regra simples em só uma das duas e sua faixa é 2,0 vezes mais larga. O Prophet foi o
que mais oscilou: 1º na temperatura e 5º na sensação térmica."

### O que aprendi
- **0,335 não é 0,335 para o computador:** a média de 0,38 e 0,29 virou "0,33" na tela e "0,34"
  no relatório. Arredondar "como à mão" (com `Number.EPSILON`) mantém tela e relatório iguais.
- **O SARIMA "só antes" tinha faixa estreita (1,77 °C) e errou 1,79 °C:** com a largura oficial,
  dá para ver em números a "falsa confiança" que o caso de estudo descrevia em palavras.

## Visão geral com abas — aba "Caso de estudo" (2026-11-26)

### Pedido
Em vez de três cards, **um card só com abas** (D49). O card do ranking virou a aba "Ranking" do
card "Visão geral dos modelos"; nesta etapa entrou a aba "Caso de estudo".

### O que foi feito
- `VisaoGeral.tsx` (abas acessíveis; só o painel aberto é montado e busca dados).
- `casoGeral.ts` (quanto cada modelo piorou: erro "só antes" ÷ erro "com tudo") +
  `textoCasoEstudoGeral` em `textos.ts`; `CasoEstudoGeral.tsx` com uma tabela por variável.
- `api.casoEstudo` com `modelo` opcional; o limite de 1,3x virou a constante `LIMITE_PIOROU`.
- Relatório, seção 8: tabela "quanto cada modelo piorou" + frase-resumo.
- Frontend: 40 testes, tsc + oxlint limpos; conferido no navegador.

### Resultado (tela)
"Sem ver a mudança, 4 dos 5 modelos tiveram um erro de 2,0 a 6,2 vezes maior do que quando viram
todos os dias. O que mais sofreu foi o SARIMA na sensação térmica (6,2 vezes). O Prophet quase não
sentiu a mudança nas duas variáveis. SARIMA, ETS e Linha de base acertaram a faixa em metade dos
dias ou menos em pelo menos uma variável: confiantes, mas no nível errado. Chronos-2 acertou a
faixa na maioria dos dias mesmo errando o nível — só porque a faixa era larga."

### O que aprendi
- **Juntar os modelos mostra dois jeitos de errar:** faixa estreita no lugar errado (SARIMA: 0 de
  10 dias, largura 1,77 °C) e faixa tão larga que "acerta" sem informar (ETS na sensação: 5,92 °C).
  Olhando um modelo por vez, isso não aparecia.

## Visão geral — aba "Anos anteriores" (2026-11-26)

### O que foi feito (D50)
- `GET /api/contexto` (`servico.contexto`): mesmo período em 2024, 2025 e 2026, normal, anomalia
  e degrau, com as funções da etapa 2. Teste novo na API (backend: 69 testes).
- Aba "Anos anteriores": texto por regras (`textoAnosAnteriores`), gráfico com os anos
  sobrepostos (`GraficoAnos.tsx`), tabela por ano e a diferença para o normal. Frontend: 42 testes.
- Relatório, seção 3: subseção "Comparação com os anos anteriores" (tabelas + gráfico da anomalia).

### Resultado (tela)
"Em 2026, a temperatura média do período (média dos 90 dias) foi 28,2 °C — 0,66 °C acima do normal
(a média de 2024 e 2025 no mesmo dia). Todo ano ela sobe nesse período (2024: +0,95 °C; 2025:
+0,55 °C; 2026: +0,94 °C) — essa parte é a estação do ano. O que muda em 2026 é o nível; e a
partir de 15-10-2026 a diferença para o normal mudou de patamar (de +0,49 °C para +0,86 °C)."
Os números batem com os da etapa 2.

### O que aprendi
- **Fila única tem custo para o que é leve:** a aba (< 1 s de cálculo) esperava ~1 minuto atrás do
  caso de estudo. A fila (D37) existe para cálculos pesados; o leve ganhou trava própria e passou
  a responder em 0,7 s com a fila ocupada.
- **Só 2 anos anteriores:** o contexto de "3 anos" termina ontem, então só cobre 2 períodos
  completos antes de 2026 — o relatório agora diz isso explicitamente.
