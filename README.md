# Demo GitHub Pages — IPASGO Painel Convênios (anonimizado)

Site estático com mapa Pref./Câmara × IPASGO por município em Goiás.
**Sem nomes, CPF, matrícula ou linhas individuais de folha.**

Espelha o espírito do [PEONA](https://laricasaint.github.io/PEONA/): demonstração pública via GitHub Pages.

## Ver localmente

```bash
cd tcmgo_ipasgo_demo
python -m http.server 8080
```

Abra http://127.0.0.1:8080

## Publicar no GitHub Pages

1. Crie o repositório (ex.: `IPASGO-GEPIN/tcmgo-ipasgo-demo`).
2. Push da branch `main`.
3. Em **Settings → Pages**: Source = `Deploy from a branch`, branch `main`, pasta `/ (root)`.
4. URL: `https://<org>.github.io/tcmgo-ipasgo-demo/`

## Atualizar os dados

Com o DuckDB do projeto irmão `tcmgo_ipasgo` atualizado:

```bat
scripts\atualizar.cmd
scripts\atualizar.cmd --ano 2026 --mes 8
```

Ou PowerShell:

```powershell
.\scripts\atualizar.ps1
.\scripts\atualizar.ps1 -Ano 2026 -Mes 8
```

Opcional — sincronizar o GeoJSON:

```bat
scripts\sync_geo.cmd
```

O script reescreve `data/municipios.json` (agregados + remunerações arredondadas).
Depois: `git add data/municipios.json && git commit && git push`.

## O que entra / não entra

| Entra | Não entra |
|--------|-----------|
| Contagens Pref./Câmara por município | Nome de servidor / beneficiário |
| % cobertura, titulares | CPF, matrícula, `nome_norm` |
| Remuneração média arredondada (R$ 50) | Folha linha a linha / match |
| Perfil de vínculo/situação (agregado) | Banco DuckDB / COINI |
| Convênios vigentes (tipo + início) | Drill de pessoas |

## Estrutura

```
index.html
assets/app.js
assets/styles.css
data/municipios.json      ← gerado pelo script de atualização
data/go_municipios.geojson
scripts/export_demo_data.py
scripts/atualizar.cmd
scripts/atualizar.ps1
```

## Dependências do script de atualização

- Python 3.10+
- `duckdb`, `pandas` (mesmo ambiente do painel Streamlit)
- Pasta irmã `../tcmgo_ipasgo` com `scripts/servidores/tcmgo_cruzamento.duckdb`
