@echo off
setlocal
cd /d "%~dp0.."

if not exist "node_modules\" (
  echo [Dev Notes] No hay dependencias instaladas. Preparando proyecto...
  call "%~dp0install.bat"
  if errorlevel 1 exit /b 1
)

for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version"`) do set "VERSION=%%V"
if not defined VERSION goto :version_error

echo [Dev Notes] Validando proyecto...
call npm run check
if errorlevel 1 goto :error

if not exist "dist\" mkdir "dist"
for %%F in ("dist\dev-notes-*.vsix") do if exist "%%~fF" del /q "%%~fF"
set "OUTPUT=dist\dev-notes-%VERSION%.vsix"

echo [Dev Notes] Empaquetando version %VERSION%...
call npx vsce package --no-dependencies --out "%OUTPUT%"
if errorlevel 1 goto :error

echo [Dev Notes] Paquete generado: %OUTPUT%
exit /b 0

:version_error
echo [Dev Notes] No se pudo leer la version de package.json.
exit /b 1

:error
echo [Dev Notes] No se pudo generar el paquete.
exit /b 1
