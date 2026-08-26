@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo ERRO: instale o Node.js LTS para disponibilizar o npm.
  exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
  echo ERRO: instale ou abra o Docker Desktop.
  exit /b 1
)

echo [1/4] Instalando dependencias da API...
pushd "%~dp0backend"
call npm install
if errorlevel 1 goto :erro
popd

echo [2/4] Instalando dependencias do aplicativo...
pushd "%~dp0app"
call npm install
if errorlevel 1 goto :erro
popd

echo [3/4] Iniciando PostgreSQL e Redis...
docker compose up -d
if errorlevel 1 goto :erro

echo [4/4] Preparando o banco de dados...
pushd "%~dp0backend"
call npm run setup
if errorlevel 1 goto :erro
popd

echo.
echo LuviePro preparado com sucesso.
echo Agora execute: .\dev.cmd
exit /b 0

:erro
popd 2>nul
echo.
echo ERRO: a preparacao foi interrompida. Verifique a mensagem acima.
exit /b 1
