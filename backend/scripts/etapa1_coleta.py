"""Etapa 1 — Coleta: baixa os dados do Open-Meteo, salva o CSV e mostra um resumo.

Como rodar (a partir da pasta backend/):
    .venv\\Scripts\\python -m scripts.etapa1_coleta
"""

import sys

from previsao import coleta

# Garante que acentos (°, ç, ã) apareçam certos no terminal do Windows.
sys.stdout.reconfigure(encoding="utf-8")


def main() -> None:
    print("Baixando dados do Open-Meteo...")
    tabela, sobreposicao = coleta.coletar()
    caminho = coleta.salvar_csv(tabela)

    print(f"\nCSV salvo em: {caminho}")
    print(f"Período: {tabela['data'].min().date()} a {tabela['data'].max().date()}")
    print(f"Total de dias: {len(tabela)}")

    print("\nDias por fonte:")
    print(tabela["fonte"].value_counts().to_string())

    print("\nResumo da temperatura média (°C):")
    print(tabela[coleta.COLUNA].describe().round(2).to_string())

    print("\nPrimeiros e últimos dias:")
    print(tabela.head(3).to_string(index=False))
    print("...")
    print(tabela.tail(3).to_string(index=False))

    # Quanto as duas fontes discordam nos dias em que ambas têm dado?
    print(f"\nDias com dado nas duas fontes (sobreposição): {len(sobreposicao)}")
    if not sobreposicao.empty:
        colunas_dif = [c for c in sobreposicao.columns if c.startswith("dif_")]
        media_abs = sobreposicao[colunas_dif].abs().mean().round(2)
        media = sobreposicao[colunas_dif].mean().round(2)
        print("Diferença média absoluta (previsão - histórico), °C:")
        print(media_abs.to_string())
        print("Diferença média com sinal (viés), °C:")
        print(media.to_string())


if __name__ == "__main__":
    main()
