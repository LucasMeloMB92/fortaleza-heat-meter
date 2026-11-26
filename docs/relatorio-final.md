# Relatório final — POC de previsão de temperatura em Fortaleza

> Status: **a preencher na etapa 8**, com os resultados das etapas anteriores.

## Estrutura prevista

1. **Objetivo** — o que a POC demonstra (ciclo dados → modelo → previsão → gráfico).
2. **Dados** — temperatura média e sensação térmica média diárias, 90 dias, Open-Meteo.
3. **Gráficos** — histórico + previsão de 7 dias + faixa de incerteza, para as duas variáveis.
4. **Como cada modelo foi decidido e configurado** _(pedido do usuário)_ — para cada modelo
   (linha de base, ETS, SARIMA, Prophet): o que é, o que foi decidido, a configuração escolhida
   para cada variável e por quê. **Autossuficiente**: todo termo técnico (d, MA, AR, AICc, α,
   drift, intervalo, ...) explicado ali mesmo, em linguagem simples e com exemplo, sem exigir
   consultar o glossário.
5. **Comparação dos modelos** — MAE, RMSE e cobertura por modelo e variável.
6. **Modelo vencedor** — e o erro médio esperado em °C.
7. **Caso de estudo** — efeito da mudança recente de temperatura (quebra estrutural).
8. **Limites do modelo** — o que a POC não faz e cuidados ao usar as previsões.
   - Já identificado: os modelos não enxergam umidade nem vento, que influenciam a sensação
     térmica; temperatura e sensação são previstas de forma independente (D19).
   - Já identificado: com 90 dias, o modelo não conhece o ciclo anual (~2 °C em Fortaleza); a
     tendência de alta de nov/2026 é parte estação, que se estabiliza em dezembro (D23, D24).
   - Já identificado: os números do relatório são um retrato de 26-11-2026; a ferramenta atualiza
     os dados todo dia (D44), então a tela mostra números atuais. O caso de estudo muda com o
     tempo: quando a mudança de outubro sair da janela de 90 dias, o detector ainda aponta
     alguma data, mesmo sem mudança forte.
   - Já identificado: a faixa de 95% não protege contra quebras — um modelo desatualizado fica
     confiante no regime errado (cobertura de 0–10% no caso de estudo, D35).
9. **Próximos passos / melhorias futuras** — o que seria necessário para levar a produção.
   - ~~Retreinar com frequência~~ — **já implementado**: os dados e os modelos são atualizados
     todo dia automaticamente (D44), o principal remédio contra quebras estruturais (etapa 5).
   - Já identificado: avaliar variáveis externas (umidade, vento) com previsões meteorológicas.
   - Já identificado: com 2+ anos de histórico — climatologia como linha de base, Prophet com
     sazonalidade anual e validação em várias janelas de 7 dias (D23).
   - **Textos explicativos por IA (opção b)** _(pedido do usuário)_: hoje os textos da tela são
     gerados por regras (D46) — sempre corretos, mas fixos. Uma melhoria futura é um modelo de
     linguagem escrever a explicação de forma mais natural e responder perguntas ("por que o
     SARIMA ganhou?"): **Gemma via Ollama** (gratuito, local, dados não saem) ou **Gemini** na
     camada gratuita (mais capaz, com limites de uso e dados enviados ao Google — ler os termos).
     Cuidados: o texto pode inventar ou exagerar (conferir contra os números), latência de segundos
     por texto e privacidade dos dados do cliente. O modelo de linguagem **explica** a previsão;
     ele **não** deve fazer a previsão (para números, a ferramenta certa é a próxima).
   - **Modelo fundacional de séries temporais (IA moderna):** Chronos (Amazon, licença Apache 2.0,
     gratuito e local) como 5º modelo — lê os 90 dias como contexto e prevê sem treino próprio.
     Entra pela interface comum (D27) e aparece sozinho na validação, no caso de estudo, na API e
     na tela. Custo: dependência pesada (PyTorch) e download do modelo na primeira execução.
   - **Outras métricas além do clima:** conectores de dados (envio de CSV, banco, API do cliente),
     cadastro de métricas (nome, unidade, frequência, horizonte), sazonalidade semanal e feriados
     ligados conforme a métrica. É onde previsão por séries temporais mais agrega valor (para
     temperatura, a previsão meteorológica física é imbatível).
   - **Publicar online:** frontend estático (Netlify/Vercel), backend com servidor de produção
     (gunicorn) e ~2 GB de RAM, disco persistente para os CSVs, CORS com o endereço público,
     HTTPS e "aquecimento" dos modelos ao iniciar o servidor.
