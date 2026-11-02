# PULSE Full Setup Script for Windows
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PULSE Setup" -ForegroundColor Cyan
Write-Host "  Neural Storm 2026 - FT-01" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$root = Split-Path $PSScriptRoot -Parent
Write-Host "Project root: $root"

# --- Backend Setup ---
Write-Host "`n[1/4] Setting up Python backend..." -ForegroundColor Yellow
Set-Location "$root\backend"

if (-not (Test-Path ".\venv")) {
    python -m venv venv
    Write-Host "Virtual environment created."
}

& ".\venv\Scripts\Activate.ps1"
pip install -r requirements.txt
Write-Host "Backend dependencies installed." -ForegroundColor Green

# Create directories
foreach ($dir in @("uploads", "weights")) {
    if (-not (Test-Path ".\$dir")) { New-Item -ItemType Directory -Path ".\$dir" | Out-Null }
}

# Copy .env
if (-not (Test-Path ".\.env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ".env created from template."
}

# Init database
python -c "import asyncio; from app.database.init_db import init_database; asyncio.run(init_database())"
Write-Host "Database initialized." -ForegroundColor Green

# --- Frontend Setup ---
Write-Host "`n[2/4] Setting up frontend..." -ForegroundColor Yellow
Set-Location "$root\frontend"
npm install
Write-Host "Frontend dependencies installed." -ForegroundColor Green

# --- Data directories ---
Write-Host "`n[3/4] Creating data directories..." -ForegroundColor Yellow
Set-Location $root
foreach ($dir in @("data\videos", "reports", "screenshots")) {
    if (-not (Test-Path ".\$dir")) { New-Item -ItemType Directory -Force -Path ".\$dir" | Out-Null }
}

# --- Summary ---
Write-Host "`n[4/4] Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start PULSE:" -ForegroundColor Cyan
Write-Host "  Terminal 1 (backend):  .\scripts\start_backend.ps1"
Write-Host "  Terminal 2 (frontend): .\scripts\start_frontend.ps1"
Write-Host ""
Write-Host "Or run both:"
Write-Host "  Start-Process powershell -ArgumentList '-File .\scripts\start_backend.ps1'"
Write-Host "  Start-Process powershell -ArgumentList '-File .\scripts\start_frontend.ps1'"
Write-Host ""
Write-Host "App URL:     http://localhost:5173"
Write-Host "API docs:    http://localhost:8000/docs"
