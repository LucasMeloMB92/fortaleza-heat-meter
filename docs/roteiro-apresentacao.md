# Roteiro da apresentação (15 a 20 minutos)

> Roteiro para montar os slides e falar sobre o estudo. **O foco não é o clima**: a temperatura
> de Fortaleza foi só o campo de testes. O que se apresenta é **o que foi feito, como a ferramenta
> funciona por dentro, os modelos estudados, os resultados e como isso vira solução com IA**.
>
> Fontes de cada slide: [relatório final](relatorio-final.md) (números e explicações para leigos),
> [guia técnico](relatorio-tecnico.md) (código e passo a passo) e [decisões](decisoes.md).

---

## Visão geral

| # | Slide | Tempo | Acumulado |
|---|---|---|---|
| 1 | Abertura: a pergunta | 0:45 | 0:45 |
| 2 | O problema e por que temperatura | 0:45 | 1:30 |
| **Bloco 1 — O que foi feito e como roda** | | | |
| 3 | O caminho completo (dados → tela) | 1:00 | 2:30 |
| 4 | Passo a passo: o que acontece quando alguém abre a tela | 2:00 | 4:30 |
| 5 | Backend: o motor | 1:30 | 6:00 |
| 6 | Frontend: a vitrine (com demonstração) | 2:00 | 8:00 |
| **Bloco 2 — Os modelos** | | | |
| 7 | Mapa dos 5 modelos | 0:45 | 8:45 |
| 8 | Linha de base e ETS | 1:15 | 10:00 |
| 9 | SARIMA e Prophet | 1:15 | 11:15 |
| 10 | Chronos-2: a IA moderna | 1:30 | 12:45 |
| **Bloco 3 — Resultados** | | | |
| 11 | Como avaliamos sem "espiar a prova" | 1:00 | 13:45 |
| 12 | Resultados finais e recomendação | 1:15 | 15:00 |
| 13 | A lição mais importante: o modelo só conhece o que viu | 0:45 | 15:45 |
| **Bloco 4 — Daqui para frente** | | | |
| 14 | Como levar isso para soluções com IA | 2:00 | 17:45 |
| 15 | Fechamento | 0:45 | 18:30 |
| | Perguntas | — | até 20:00 |

**Versão de 15 minutos:** juntar os slides 8 e 9 num só (1:30), trocar a demonstração ao vivo do
slide 6 por duas capturas de tela (1:15) e falar o slide 13 como uma frase no fim do 12.

---

## Antes de apresentar (checklist)

- [ ] Subir backend e frontend (ver [README](../README.md)) **pelo menos 3 minutos antes**: no
      primeiro acesso do dia os modelos são treinados e o caso de estudo leva ~1 min e meio.
      Abrir `http://localhost:5173` uma vez e esperar todos os cards carregarem.
- [ ] Deixar uma aba com `http://127.0.0.1:5000/api/previsao?modelo=chronos&horizonte=7` para
      mostrar o JSON no slide 5.
- [ ] Ter capturas de tela de reserva de cada card (caso a internet ou o computador falhem).
- [ ] Imagens prontas em `docs/img/`: `etapa3_previsoes.png`, `etapa4_teste.png`,
      `etapa5_caso_estudo.png`, `etapa2_contexto.png`.
- [ ] Os números da tela mudam todo dia (os dados se atualizam sozinhos). Nos slides, usar os do
      relatório e dizer "retrato de 26-11-2026".

---

## Bloco de abertura

### Slide 1 — Abertura: a pergunta (0:45)

**Na tela:** título + uma pergunta grande:
> "Com só 90 dias de histórico, dá para prever a próxima semana melhor do que uma regra simples?"

**Falar:**
- Esse foi o pedido: pegar uma série **pequena**, treinar modelos, prever 7 dias e mostrar tudo
  numa ferramenta web, com a previsão e uma **faixa de incerteza**.
- Além de construir, o objetivo era **aprender e documentar cada decisão** — mais de 50 decisões
  registradas, cada uma com as opções consideradas e o porquê da escolha.

### Slide 2 — O problema e por que temperatura (0:45)

**Na tela:** "Série temporal = um número por dia" + exemplos: vendas, demanda, acessos,
temperatura.

**Falar:**
- **Série temporal** é uma sequência de valores medidos em intervalos regulares. Prever é estimar
  os próximos a partir dos anteriores.
- Usamos a **temperatura média de Fortaleza** porque é pública, gratuita e diária. Não é o
  objetivo: é o campo de testes. **O método serve para qualquer número do negócio.**
- Frase-chave: *"O clima foi a cobaia; o produto é o método."*

---

## Bloco 1 — O que foi feito e como roda

### Slide 3 — O caminho completo (1:00)

**Na tela:** fluxo em 5 caixas:

```
Dados  →  Modelos  →  Validação  →  Previsão  →  Tela
```

e, embaixo, as 9 etapas do projeto: preparação, coleta, exploração, modelagem, validação, caso de
estudo, API, frontend, relatório.

**Falar:**
- Uma etapa por vez, com teste, documentação e um registro no Git ao fim de cada uma.
- **Exploração antes de modelar:** descobrimos que a série tem "memória" (hoje parece ontem) e não
  tem ciclo semanal — isso definiu como configurar os modelos.
- Depois do estudo principal, duas evoluções: entrou o **Chronos-2** (IA moderna) e a ferramenta
  foi **simplificada** (uma série só, menos telas e menos rotas).

### Slide 4 — Passo a passo: o que acontece quando alguém abre a tela (2:00)

**Na tela:** diagrama de sequência numerado:

```
1. Pessoa abre a tela no navegador (React)
2. A tela pede os dados à API:  GET /api/previsao?modelo=chronos&horizonte=7
3. O backend confere: os dados vão até ontem?
     não → baixa o dia novo do Open-Meteo, grava o CSV e apaga os resultados antigos
4. Já existe resultado pronto na memória?
     sim → responde na hora (milissegundos)
     não → treina o modelo, guarda e responde (segundos)
5. Responde em JSON: histórico + previsão + faixa + detalhes do modelo
6. A tela desenha o gráfico e escreve o resumo em português
```

**Falar:**
- **Ninguém roda script no dia a dia.** No primeiro acesso de cada dia a ferramenta percebe que
  falta o dia novo, baixa, grava e retreina sozinha.
- Se o Open-Meteo estiver fora do ar, ela segue com os dados que tem e **avisa** no topo da tela.
- O primeiro pedido treina; os seguintes são instantâneos. Exemplo medido: SARIMA 6,3 s no
  primeiro pedido, 3 ms no segundo.
- Cálculos pesados entram numa **fila**, um de cada vez, para o servidor não travar com vários
  acessos.

### Slide 5 — Backend: o motor (1:30)

**Na tela:** três camadas empilhadas:

```
app.py               → rotas web (recebe o pedido, devolve JSON)
previsao/servico.py  → monta as respostas, cache e fila
previsao/*           → a lógica: coleta · exploração · modelos · avaliação · caso de estudo
```

Ao lado: as 7 rotas `GET /api/...` — `saude`, `opcoes`, `previsao`, `metricas`, `teste`,
`caso-estudo`, `contexto`. Mostrar o JSON de `/api/previsao` na aba preparada.

**Falar:**
- **Python**, porque é onde estão as bibliotecas de séries temporais (statsmodels, Prophet,
  Chronos).
- **Flask** como servidor: poucas linhas, fácil de ler.
- A **lógica não depende da web**: os mesmos módulos rodam em scripts, nos testes e na API.
  Trocar o Flask por outra coisa não mexe nos modelos.
- Dados em **CSV** (90 linhas — não precisa de banco). Gravação "tudo ou nada": se falhar no meio,
  o arquivo antigo fica inteiro.
- 69 testes automáticos, que **nunca** usam a internet nem os dados reais.

### Slide 6 — Frontend: a vitrine (2:00, com demonstração)

**Na tela:** a ferramenta aberta no navegador (ou capturas de tela).

**Mostrar ao vivo, em ordem:**
1. **Seletores:** trocar o modelo (Chronos-2 → SARIMA) e o horizonte (7 → 14 dias). O gráfico
   muda; a faixa fica mais larga quanto mais longe o dia.
2. **Card de previsão:** linha contínua = histórico, tracejado = previsão, área = faixa de 95%.
   Ler o resumo em texto.
3. **Comparação dos modelos:** tabela de erro; clicar num modelo troca a tela inteira.
4. **Previsão × real no teste:** ● = caiu dentro da faixa, ✕ = fora.
5. (Rápido) **Anos anteriores** e **caso de estudo** — voltam no slide 13.

**Falar:**
- **React + TypeScript**, gráficos com **Recharts**. O frontend **não calcula previsão**: só pede
  os dados prontos e mostra.
- Feito para **quem não é técnico**: textos em português gerados por **regras** a partir dos
  números (nunca afirmam o que os números não mostram), ícones **i** explicando cada termo,
  datas em DD-MM-AAAA.
- **Nunca tela branca:** enquanto carrega aparece um contador de segundos; se uma parte falha, só
  ela mostra o erro com "Tentar de novo".

---

## Bloco 2 — Os modelos

### Slide 7 — Mapa dos 5 modelos (0:45)

**Na tela:** uma escada do mais simples ao mais sofisticado:

| Nível | Modelo | Aprende com os nossos dados? |
|---|---|---|
| Regra fixa | Linha de base | Não |
| Estatística clássica | ETS, SARIMA, Prophet | Sim, poucos parâmetros |
| IA moderna (modelo fundacional) | Chronos-2 | Não — já vem treinado com milhões de séries |

**Falar:**
- Todos têm **a mesma interface**: recebem a série e devolvem previsão + faixa de 95%. Por isso
  dá para comparar e trocar à vontade — e um 6º modelo entraria sem mexer no resto.
- Machine learning próprio e redes neurais treinadas do zero ficaram de fora: com 90 pontos,
  decoram o ruído.

### Slide 8 — Linha de base e ETS (1:15)

**Na tela:** dois quadros.

**Linha de base — a régua**
- *O que faz:* previsão = média dos últimos 7 dias, igual para todos os dias à frente.
- *Como é treinada:* não é. A faixa vem dos erros que a própria regra cometeu no passado.
- *Para que serve:* todo modelo tem que errar menos que ela, senão não vale a complexidade.

**ETS (suavização exponencial)**
- *O que faz:* média ponderada em que os dias recentes pesam mais (peso α).
- *Como é treinado:* testa 3 versões (sem tendência, com tendência, tendência amortecida),
  ajusta os parâmetros a cada uma e fica com a de menor **AICc** — uma nota que soma o erro com
  uma multa por complexidade.
- *Resultado aqui:* sem tendência, α = 0,29 → previsão quase plana, parecida com a régua.

### Slide 9 — SARIMA e Prophet (1:15)

**SARIMA** — o clássico mais completo
- *O que faz:* explica cada dia pelos dias anteriores (AR), pelos erros anteriores (MA) e
  trabalha com variações diárias quando a série "passeia" (I).
- *Como é treinado:* um teste estatístico (ADF) decide se usa variações; depois testa **72
  combinações** e fica com a de menor AICc. Tudo refeito a cada treino.
- *Detalhe que ensina:* com só 80 ou 90 dias, a configuração escolhida **muda** com poucos dias a
  mais — por isso não se fixa à mão.

**Prophet** (Meta)
- *O que faz:* desenha uma **tendência** que pode mudar de inclinação, mais ciclos e feriados.
- *Como é treinado:* ajusta a linha de tendência; aqui, ciclos desligados (90 dias não têm um ano
  e não há ciclo semanal).
- *Por que está aqui:* foi feito para séries **longas**; serve de contraponto. **Não olha o último
  dia** — acerta quando a tendência continua e erra quando ela vira.

### Slide 10 — Chronos-2: a IA moderna (1:30)

**Na tela:** "Treinado pela Amazon com milhões de séries → recebe os nossos 90 números → devolve
quantis".

**Falar:**
- É uma **rede neural** (~120 milhões de parâmetros) e um **modelo fundacional**: aprendeu como
  séries em geral se comportam (vendas, energia, tráfego, clima).
- **Não é treinado com os nossos dados.** Recebe os 90 valores como **contexto** — nem sabe que é
  temperatura — e prevê. Isso se chama **zero-shot**.
- Devolve **quantis**: a mediana é a previsão; os quantis de 2,5% e 97,5% formam a faixa de 95%.
- Roda no processador comum, sem placa de vídeo, em 0,06 s; o modelo (456 MB) é baixado uma vez
  e depois funciona **sem internet** — os dados não saem do computador. Versão fixa, para uma
  atualização do fornecedor não mudar os números sem aviso. Gratuito, uso comercial permitido.
- Frase-chave: *"Os clássicos aprendem com a nossa série; o Chronos-2 já chega sabendo."*

---

## Bloco 3 — Resultados

### Slide 11 — Como avaliamos sem "espiar a prova" (1:00)

**Na tela:** linha do tempo com 80 dias de treino e 10 dias de teste escondidos;
imagem `docs/img/etapa4_teste.png`.

**Falar:**
- Escondemos os últimos 10 dias, cada modelo previu sem vê-los e comparamos com o real.
- Um **teste automático** garante que mudar os dias de teste não muda a previsão — ninguém espia.
- Medidas: **erro médio (MAE)** na unidade real; **cobertura** (quantos dias caíram na faixa);
  **largura da faixa** (faixa larga acerta fácil, mas diz pouco); e **comparação com a regra
  simples**.

### Slide 12 — Resultados finais e recomendação (1:15)

**Na tela:** tabela (retrato de 26-11-2026):

| Modelo | Erro médio, teste 1 | vs regra simples | Erro médio, teste 2 (um dia depois) |
|---|---|---|---|
| **Chronos-2** | **0,31** | −32% | **0,38 (1º)** |
| Prophet | 0,31 | −33% | 0,47 |
| SARIMA | 0,38 | −18% | 0,68 |
| ETS | 0,43 | −6% | 0,63 |
| Linha de base | 0,46 | — | 0,62 |

**Falar:**
- Dá para prever melhor que a regra simples: os melhores erram **até um terço menos**.
- **Recomendado: Chronos-2** — o único entre os melhores **nos dois testes**, sem nenhuma
  configuração. O preço: faixa quase **duas vezes mais larga**.
- **Os vencedores mudam de um teste para outro** — as diferenças são pequenas e 10 dias de teste
  são pouco. Antes de produção: repetir em várias semanas.
- Não importa o °C em si: importa que **o método mostrou isso com números**, inclusive os limites.

### Slide 13 — A lição mais importante (0:45)

**Na tela:** imagem `docs/img/etapa5_caso_estudo.png` + frase:
> "Sem ver a mudança, 4 de 5 modelos erraram de 2 a 3,4 vezes mais."

**Falar:**
- Em outubro a série mudou de patamar. Treinamos cada modelo **só com os dias antes** da mudança.
- Erraram muito, sempre para o mesmo lado — e alguns com **falsa confiança** (faixa estreita no
  lugar errado). Nem a IA moderna percebe o que não viu.
- Remédio: **atualizar e retreinar com frequência** — a ferramenta já faz isso todo dia.

---

## Bloco 4 — Daqui para frente

### Slide 14 — Como levar isso para soluções com IA (2:00)

**Na tela:** três papéis lado a lado:

```
Modelo de previsão          Validação                 Modelo de linguagem
(Chronos-2 ou vencedor)  →  (erro, faixa, regra)  →   (assistente que conversa)
"prevê os números"          "diz quanto confiar"      "explica e sugere a ação"
```

**Falar:**
- Assistentes como ChatGPT, Gemini ou Claude são ótimos com texto e **fracos com previsão
  numérica** — podem inventar números. Cada um no seu papel.
- **Exemplos de solução:**
  1. **Assistente que consulta a previsão:** a pessoa pergunta "quanto vamos vender semana que
     vem?"; o assistente **chama a nossa API** como ferramenta, recebe previsão + faixa + erro
     histórico e responde em português, citando os números.
  2. **Alertas automáticos:** quando o valor real sai da faixa (sinal de mudança) ou a previsão
     passa de um limite, o sistema gera e envia um aviso explicado.
  3. **Muitas séries de uma vez:** como o Chronos-2 não precisa de treino, a mesma ferramenta
     atende centenas de produtos ou lojas no primeiro dia.
  4. **Pessoa no meio:** a previsão vira sugestão ("pedir 20% a mais"); a decisão fica com alguém.
- O que já está pronto para isso: API em JSON, atualização diária, validação automática e modelo
  rodando localmente (dados não saem).
- O que falta: fonte de dados do cliente (CSV, banco ou API), cadastro de métricas (unidade,
  ciclo semanal, feriados), publicar online.

### Slide 15 — Fechamento (0:45)

**Na tela:** três frases:
1. **Construímos o ciclo completo:** dados que se atualizam sozinhos → 5 modelos → validação
   honesta → API → tela para não técnicos.
2. **A IA moderna (Chronos-2) foi a mais estável entre os melhores**, sem treino — mas sempre
   comparada a uma regra simples e lida junto com a largura da faixa.
3. **O método está pronto para outra série:** troca-se a fonte de dados, não a ferramenta.

Abrir para perguntas.

---

## Perguntas prováveis (respostas curtas)

| Pergunta | Resposta |
|---|---|
| "Por que não usar a previsão do tempo do Google?" | Para o tempo, a meteorologia ganha: ela simula a atmosfera. O estudo vale para números do negócio, onde não existe esse "simulador". |
| "Por que não treinar uma rede neural própria?" | Com 90 pontos ela decora o ruído. O Chronos-2 contorna isso porque já vem treinado com milhões de séries. |
| "0,3 °C é bom?" | É até um terço menos que a regra simples. Mas Fortaleza varia pouco; o número importante é o **ganho sobre a régua**, não o °C. |
| "Por que o Chronos-2 e não o Prophet, que empatou?" | O Prophet só acerta enquanto a tendência continua; no segundo teste caiu. O Chronos-2 ficou entre os melhores nos dois. |
| "A faixa larga do Chronos-2 é um problema?" | É o preço: ela quase sempre acerta, mas diz menos. Por isso a ferramenta mostra a largura junto com a cobertura. |
| "Quanto custa?" | Tudo gratuito (Open-Meteo, bibliotecas, Chronos-2 com licença Apache 2.0). O custo é técnico: ~650 MB (PyTorch + modelo) e mais memória. |
| "Os dados saem da empresa?" | Não: os modelos rodam no próprio servidor. Só um assistente de linguagem na nuvem enviaria dados — escolher com cuidado. |
| "E se o padrão mudar?" | É o caso de estudo: todos erram até ver a mudança. A ferramenta retreina todo dia; alertas quando o real sai da faixa são o próximo passo. |
