@echo off
setlocal
cd /d "%~dp0.."

echo [Dev Notes] Instalando dependencias...
call npm ci
if errorlevel 1 goto :error

echo [Dev Notes] Dependencias listas.
exit /b 0

:error
echo [Dev Notes] No se pudieron instalar las dependencias.
exit /b 1
