# Glossário

Termos do projeto explicados de forma simples. Novos termos são adicionados conforme aparecem.

---

## Dados e séries temporais

**Série temporal** — sequência de medições ordenadas no tempo, em intervalos regulares. Ex.: a
temperatura média de cada dia. A ordem importa: o valor de hoje depende dos dias anteriores.

**Série univariada x multivariada** — univariada tem uma única variável medida ao longo do tempo
(só a temperatura); multivariada usa várias juntas (temperatura + umidade + vento). Neste projeto
tratamos temperatura e sensação como **duas séries univariadas** separadas.

**Sensação térmica (temperatura aparente)** — a temperatura que o corpo "sente". Combina a
temperatura do ar com umidade, vento e radiação solar. Em lugares úmidos como Fortaleza, costuma
ficar acima da temperatura real.

**Variável exógena (externa)** — informação de fora da série usada para ajudar a prever.
Ex.: usar umidade e vento para prever a sensação. O problema: para prever o futuro, é preciso
saber também o valor futuro da variável externa. (Não usamos neste projeto — decisão D19.)

**Reanálise (ERA5)** — "histórico reconstruído" do clima: um modelo meteorológico é rodado de
novo sobre o passado, corrigido por todas as observações disponíveis (estações, satélites,
balões). É muito consistente, mas sai com alguns dias de atraso e tem grade grossa (~25 km).

**Modelo meteorológico / resolução de grade** — o modelo divide o mapa em quadrados (células) e
calcula um valor por célula. Quanto menor a célula (maior resolução), mais detalhes locais, como a
diferença entre a cidade e o mar ao lado.

**Viés** — erro sistemático, sempre para o mesmo lado. Ex.: a ERA5 pura fica, em média, 0,6 °C
abaixo do `best_match` em Fortaleza. Diferente do erro aleatório, que ora é para cima, ora para
baixo.

**Tendência** — direção de longo prazo da série (subindo, descendo ou estável).

**Sazonalidade** — padrão que se repete num período fixo. Ex.: mais calor de dia que à noite
(período de 24 h), mais calor no verão (período de 1 ano). Um ciclo semanal (7 dias) é comum em
vendas, mas não tem causa física em temperatura.

**Quebra estrutural** — mudança brusca no comportamento da série (nível, tendência ou
variabilidade). Depois dela, o passado deixa de ser um bom guia para o futuro, e um modelo
treinado com dados antigos pode errar.

## Validação e métricas

**Treino e teste (holdout)** — separamos os dados: o modelo aprende com o treino e é avaliado no
teste, que ele nunca viu. Em séries temporais o teste é sempre o **final** da série (o "futuro").

**Overfitting (sobreajuste)** — quando o modelo "decora" os dados de treino, inclusive o ruído,
e erra em dados novos. O risco cresce com muitos parâmetros e poucos dados (como nossos 90 dias).

**Horizonte de previsão** — quantos passos à frente prevemos (aqui, 7 dias).

**Linha de base (baseline)** — um modelo propositalmente simples (ex.: média dos últimos 7 dias)
que serve de régua. Se um modelo sofisticado não superar a linha de base, ele não vale a pena.

**MAE (Erro Absoluto Médio)** — média de quanto erramos, ignorando o sinal. Em °C. "Em média,
erramos 0,8 °C."

**RMSE (Raiz do Erro Quadrático Médio)** — parecido com o MAE, mas eleva os erros ao quadrado
antes de tirar a média; por isso, **pune mais os erros grandes**. Sempre ≥ MAE. Também em °C.

**Intervalo de confiança / de previsão** — faixa onde esperamos que o valor real caia, com certa
probabilidade (aqui, 95%). Uma faixa larga indica muita incerteza.

**Cobertura** — % de dias reais que caíram dentro da faixa prevista. Para um intervalo de 95%,
o ideal é perto de 95%. Muito abaixo: o modelo está confiante demais.

## Modelos

**ETS / Holt-Winters** — família de modelos de **suavização exponencial**: a previsão é uma média
ponderada do passado em que os dias mais recentes pesam mais. ETS = *Error, Trend, Seasonality*
(erro, tendência, sazonalidade), os componentes que o modelo pode ter.

**ARIMA** — modelo que prevê o próximo valor a partir dos valores anteriores (**AR**,
autorregressivo), de diferenças entre valores para remover tendência (**I**, integrado) e dos erros
anteriores (**MA**, média móvel). Configurado pelos números (p, d, q).

**SARIMA** — ARIMA com uma parte **S**azonal extra, que olha para o mesmo ponto do ciclo anterior
(ex.: 7 dias atrás). Configurado por (p, d, q)(P, D, Q, s).

**Prophet** — biblioteca da Meta que decompõe a série em tendência + sazonalidades + feriados.
Pensada para séries longas (anos) com padrões claros; em 90 dias tem pouca informação para usar.

## Ferramentas e web

**Ambiente virtual (venv)** — pasta com um Python e bibliotecas exclusivos do projeto, para não
misturar versões com outros projetos.

**API REST** — forma de um programa oferecer dados a outro pela web: o cliente faz uma requisição
HTTP (ex.: `GET /api/previsao`) para uma rota e recebe uma resposta, geralmente em JSON.

**JSON** — formato de texto para dados estruturados (`{"temperatura": 27.4}`), entendido por
praticamente todas as linguagens.

**CORS** — regra de segurança do navegador que bloqueia uma página de chamar uma API em outra
origem (domínio/porta) sem permissão. O Flask-CORS faz a API dizer ao navegador "pode chamar".

**Linter (ruff)** — ferramenta que lê o código e aponta erros, más práticas e problemas de estilo
sem executá-lo.

## Open-Meteo (parâmetros usados)

**Parâmetro `models`** — escolhe qual modelo meteorológico fornece os números. Valores que usamos:
- **`era5`**: a reanálise ERA5 (ver "Reanálise"). Consistente, mas com ~6 dias de atraso e grade
  de ~25 km; em Fortaleza sai ~0,6 °C mais fria.
- **`best_match`** (padrão): o Open-Meteo escolhe o modelo mais adequado ao local, em geral de
  maior resolução. Vai até ontem e é igual à API de previsão.

**Parâmetro `past_days`** — só na API de previsão: "devolva também os N dias que já passaram",
calculados pelo modelo de previsão. Serve para tapar o atraso de uma fonte histórica.

**Resposta da API** — JSON com uma lista de datas (`time`) e, para cada variável, uma lista de
valores na mesma ordem. Dia sem dado vem como `null`.

## Exploração

**Média móvel** — média dos últimos N dias, recalculada a cada dia. Suaviza o sobe-e-desce e
revela a tendência. **Centrada** = usa dias antes e depois (só serve para olhar o passado).

**Defasagem (lag)** — distância no tempo. "Defasagem 1" = comparar cada dia com o dia anterior.

**Autocorrelação (ACF)** — o quanto a série se parece com ela mesma deslocada no tempo. ACF de
0,75 na defasagem 1 = hoje "lembra" bastante ontem. Vai de −1 a 1.

**Autocorrelação parcial (PACF)** — a autocorrelação "direta" numa defasagem, descontando o que já
é explicado pelas defasagens menores. Ex.: anteontem parece com hoje só porque passa por ontem?
Então a PACF de 2 dias é ~0. Ajuda a escolher a ordem AR (p) do ARIMA.

**Estacionariedade** — uma série é estacionária quando oscila em torno de um nível fixo, com
variação estável. Com tendência, não é. Muitos modelos (ARIMA) pedem série estacionária.

**Diferenciação** — trabalhar com a variação de um dia para o outro (hoje − ontem) em vez do
valor. Remove a tendência. É o "I" (integrado) do ARIMA, com ordem d.

**Teste ADF (Dickey-Fuller aumentado)** — teste estatístico de estacionariedade. Ponto de partida
("hipótese nula"): a série não é estacionária. p-valor < 0,05 → rejeitamos → estacionária.

**p-valor** — a chance de ver um resultado tão extremo quanto o observado se o ponto de partida do
teste fosse verdadeiro. Pequeno (< 0,05) = evidência contra o ponto de partida. Testes erram: com
o limite de 0,05, ~5% das vezes acusam algo que não existe.

**Força da sazonalidade** — número de 0 a 1 que mede quanto um padrão repetitivo (ex.: de 7 dias)
explica a variação. Perto de 0 = não há padrão.

**Climatologia ("normal")** — o valor típico para aquela época do ano, calculado com anos
anteriores. Aqui: média de 2024 e 2025 no mesmo dia.

**Anomalia** — diferença entre o valor observado e a climatologia. +0,8 °C = 0,8 °C mais quente
que o normal para a data. Remove o efeito da estação.

**Ponto de mudança** — data em que a série passa a se comportar de outro jeito (ex.: nível médio
mais alto). Detectá-lo é o primeiro passo para estudar uma quebra estrutural.
