@echo off
title VisionForge Studio Launcher
echo ========================================================
echo        VisionForge Studio - Industrial AI/ML Suite
echo    Licensed under VisionForge Community License (v1.0)
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Check if Frontend Production Build exists; if not, auto-build
if not exist "frontend\dist\index.html" (
    echo [*] Production frontend build not detected. Initializing build...
    cd frontend
    if not exist "node_modules" (
        echo [*] Installing frontend NPM dependencies...
        call npm install
    )
    echo [*] Compiling Apple UI + Vite production bundle...
    call npm run build
    cd /d "%~dp0"
    echo [OK] Frontend successfully compiled to frontend\dist!
    echo.
)

:: 2. Launch Backend Application Server
echo [*] Starting VisionForge Studio on 0.0.0.0:8000 (Local + LAN)...
echo [*] Local Webapp:  http://localhost:8000
echo [*] API Docs:      http://localhost:8000/docs
echo [*] Press Ctrl+C in this window to stop the server.
echo.

cd /d "%~dp0\backend"
python run_backend.py

pause
