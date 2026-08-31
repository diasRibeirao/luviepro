$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$failed = $false

Write-Host '== Backend: verify ==' -ForegroundColor Cyan
Push-Location (Join-Path $root 'backend')
try {
  npm run verify
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'Backend: FALHOU' -ForegroundColor Red
    $failed = $true
  } else {
    Write-Host 'Backend: OK' -ForegroundColor Green
  }
} finally { Pop-Location }

Write-Host '== App: verify ==' -ForegroundColor Cyan
Push-Location (Join-Path $root 'app')
try {
  npm run verify
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'App: FALHOU' -ForegroundColor Red
    $failed = $true
  } else {
    Write-Host 'App: OK' -ForegroundColor Green
  }
} finally { Pop-Location }

if ($failed) {
  Write-Host '== Gate de homologação REPROVADO ==' -ForegroundColor Red
  exit 1
}

Write-Host '== Gate de homologação APROVADO ==' -ForegroundColor Green
Write-Host 'Após publicar, rode: node .\scripts\hml-smoke.mjs'
exit 0
