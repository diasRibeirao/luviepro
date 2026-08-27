@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js/npm nao foi encontrado no PATH.
  exit /b 1
)

echo [1/5] Verificando tipos do aplicativo...
pushd "%~dp0app"
call npm run typecheck
if errorlevel 1 goto :erro

echo [2/5] Gerando bundle Web de producao...
call npm run export:web
if errorlevel 1 goto :erro
popd

echo [3/5] Compilando a API...
pushd "%~dp0backend"
call npm run build
if errorlevel 1 goto :erro

echo [4/5] Executando testes da API...
call npm test -- --runInBand
if errorlevel 1 goto :erro

echo [5/5] Verificando migrations do banco...
call npm run prisma:status
if errorlevel 1 goto :erro
popd

echo.
echo LuviePro validado com sucesso.
exit /b 0

:erro
popd 2>nul
echo.
echo ERRO: a validacao encontrou uma falha.
exit /b 1
