# Relatório final — POC de previsão de temperatura em Fortaleza

> Status: **a preencher na etapa 8**, com os resultados das etapas anteriores.

## Estrutura prevista

1. **Objetivo** — o que a POC demonstra (ciclo dados → modelo → previsão → gráfico).
2. **Dados** — temperatura média e sensação térmica média diárias, 90 dias, Open-Meteo.
3. **Gráficos** — histórico + previsão de 7 dias + faixa de incerteza, para as duas variáveis.
4. **Comparação dos modelos** — MAE, RMSE e cobertura por modelo e variável.
5. **Modelo vencedor** — e o erro médio esperado em °C.
6. **Caso de estudo** — efeito da mudança recente de temperatura (quebra estrutural).
7. **Limites do modelo** — o que a POC não faz e cuidados ao usar as previsões.
   - Já identificado: os modelos não enxergam umidade nem vento, que influenciam a sensação
     térmica; temperatura e sensação são previstas de forma independente (D19).
   - Já identificado: com 90 dias, o modelo não conhece o ciclo anual (~2 °C em Fortaleza); a
     tendência de alta de nov/2026 é parte estação, que se estabiliza em dezembro (D23, D24).
8. **Próximos passos** — o que seria necessário para levar a produção.
   - Já identificado: avaliar variáveis externas (umidade, vento) com previsões meteorológicas.
   - Já identificado: com 2+ anos de histórico — climatologia como linha de base, Prophet com
     sazonalidade anual e validação em várias janelas de 7 dias (D23).
