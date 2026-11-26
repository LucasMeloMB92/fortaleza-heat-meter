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
