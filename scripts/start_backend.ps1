# PULSE Backend Startup Script
param(
    [switch]$NoInstall,
    [string]$Port = "8000"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PULSE Backend Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$backendDir = Join-Path $PSScriptRoot "..\backend"
Set-Location $backendDir

# Check Python
$pythonVersion = python --version 2>&1
Write-Host "Python: $pythonVersion"

# Create venv if needed
if (-not (Test-Path ".\venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate venv
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install deps
if (-not $NoInstall) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt --quiet
}

# Create uploads dir
if (-not (Test-Path ".\uploads")) { New-Item -ItemType Directory -Path ".\uploads" | Out-Null }

# Init DB
Write-Host "Initializing database..." -ForegroundColor Yellow
python -c "import asyncio; from app.database.init_db import init_database; asyncio.run(init_database())"

Write-Host ""
Write-Host "Starting PULSE backend on port $Port..." -ForegroundColor Green
Write-Host "API docs: http://localhost:$Port/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

uvicorn app.main:app --host 0.0.0.0 --port $Port --reload
