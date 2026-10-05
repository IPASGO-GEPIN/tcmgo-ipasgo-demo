# Atualiza data/municipios.json a partir do DuckDB do tcmgo_ipasgo.
# Uso:
#   .\scripts\atualizar.ps1
#   .\scripts\atualizar.ps1 -Ano 2026 -Mes 8
param(
    [int]$Ano = 0,
    [int]$Mes = 0,
    [string]$Db = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$argsList = @()
if ($Ano -gt 0) { $argsList += @("--ano", "$Ano") }
if ($Mes -gt 0) { $argsList += @("--mes", "$Mes") }
if ($Db) { $argsList += @("--db", $Db) }

python scripts\export_demo_data.py @argsList
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Pronto. Commit/push de data/municipios.json para publicar no GitHub Pages."
