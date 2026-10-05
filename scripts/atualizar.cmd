@echo off
REM Atualiza data/municipios.json a partir do DuckDB do projeto tcmgo_ipasgo.
REM Uso:
REM   atualizar.cmd
REM   atualizar.cmd --ano 2026 --mes 8
cd /d "%~dp0.."
python scripts\export_demo_data.py %*
if errorlevel 1 exit /b 1
echo.
echo Pronto. Faca commit/push do data\municipios.json para publicar no GitHub Pages.
exit /b 0
