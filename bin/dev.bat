@echo off
setlocal
cd /d "%~dp0.."

if not exist "node_modules\" (
  echo [Dev Notes] No hay dependencias instaladas. Preparando proyecto...
  call "%~dp0install.bat"
  if errorlevel 1 exit /b 1
)

echo [Dev Notes] Iniciando compilacion continua. Cierra esta ventana para detenerla.
call npm run watch
exit /b %errorlevel%
