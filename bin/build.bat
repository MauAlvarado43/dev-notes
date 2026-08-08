@echo off
setlocal
cd /d "%~dp0.."

if not exist "node_modules\" (
  echo [Dev Notes] No hay dependencias instaladas. Preparando proyecto...
  call "%~dp0install.bat"
  if errorlevel 1 exit /b 1
)

echo [Dev Notes] Compilando extension y webviews...
call npm run build
if errorlevel 1 goto :error

echo [Dev Notes] Build generado en dist\
exit /b 0

:error
echo [Dev Notes] El build fallo.
exit /b 1
