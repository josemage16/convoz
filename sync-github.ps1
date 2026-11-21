<#
.SYNOPSIS
  Inicializa el repositorio local de ConVoz y sincroniza con https://github.com/josemage16/convoz.git
.USAGE
  Abrí PowerShell dentro de la carpeta convoz y ejecutá:
    .\sync-github.ps1
#>

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/josemage16/convoz.git"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Git no está instalado en este equipo." -ForegroundColor Red
  Write-Host "Podés instalarlo ejecutando:" -ForegroundColor Yellow
  Write-Host "  winget install --id Git.Git -e --source winget" -ForegroundColor Cyan
  Write-Host "Luego cerrá y volvé a abrir PowerShell y corré nuevamente .\sync-github.ps1" -ForegroundColor Yellow
  exit 1
}

if (-not (Test-Path ".git")) {
  git init -b main
  git remote add origin $RepoUrl
} else {
  $remotes = git remote
  if ($remotes -notcontains "origin") {
    git remote add origin $RepoUrl
  } else {
    git remote set-url origin $RepoUrl
  }
}

git add .
git status --short

$commitMsg = Read-Host "Mensaje de commit (Enter para usar 'Landing ConVoz inicial')"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
  $commitMsg = "Landing ConVoz inicial"
}

git commit -m $commitMsg
git push -u origin main

Write-Host "`nRepositorio sincronizado correctamente con $RepoUrl" -ForegroundColor Green
