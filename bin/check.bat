@echo off
setlocal
cd /d "%~dp0.."

if not exist "node_modules\" (
  echo [Dev Notes] No hay dependencias instaladas. Preparando proyecto...
  call "%~dp0install.bat"
  if errorlevel 1 exit /b 1
)

echo [Dev Notes] Ejecutando tipos, pruebas y build...
call npm run check
if errorlevel 1 goto :error

echo [Dev Notes] Validacion completa.
exit /b 0

:error
echo [Dev Notes] La validacion fallo.
exit /b 1
