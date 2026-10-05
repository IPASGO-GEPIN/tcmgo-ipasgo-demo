# Copiar GeoJSON do painel principal (se faltar ou atualizar)
# Uso: scripts\sync_geo.cmd
@echo off
cd /d "%~dp0.."
set SRC=..\tcmgo_ipasgo\painel_convenios\geo\go_municipios.geojson
if not exist "%SRC%" (
  echo GeoJSON nao encontrado: %SRC%
  exit /b 1
)
copy /Y "%SRC%" data\go_municipios.geojson >nul
echo OK -> data\go_municipios.geojson
exit /b 0
