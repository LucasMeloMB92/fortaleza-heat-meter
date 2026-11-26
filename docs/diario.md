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
