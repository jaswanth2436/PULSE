# PULSE Frontend Startup Script
param([string]$Port = "5173")

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PULSE Frontend Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$frontendDir = Join-Path $PSScriptRoot "..\frontend"
Set-Location $frontendDir

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install --silent

Write-Host ""
Write-Host "Starting PULSE frontend..." -ForegroundColor Green
Write-Host "App: http://localhost:$Port" -ForegroundColor Cyan
Write-Host ""

npm run dev
