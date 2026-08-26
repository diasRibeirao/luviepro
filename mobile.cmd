@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js/npm nao foi encontrado no PATH.
  exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
  echo ERRO: Docker nao foi encontrado. Abra o Docker Desktop e tente novamente.
  exit /b 1
)

echo Iniciando PostgreSQL e Redis...
docker compose up -d
if errorlevel 1 exit /b 1

echo Abrindo API e Expo Go em terminais separados...
start "LuviePro API" /D "%~dp0backend" cmd /k npm run dev
start "LuviePro MOBILE" /D "%~dp0app" cmd /k npx expo start --clear --lan

echo.
echo Leia o QR Code no terminal LuviePro MOBILE com o Expo Go.
echo O celular e o computador precisam estar na mesma rede Wi-Fi.
endlocal
