@echo off
setlocal enabledelayedexpansion

echo ====================================================================
echo   VISIONFORGE STUDIO - AUTOMATED ENVIRONMENT BOOTSTRAP & LAUNCHER
echo ====================================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH! Please install Python 3.10+
    pause
    exit /b 1
)

:: 2. Check Node.js
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Node.js is not found in PATH!
    echo Backend will run, but frontend UI requires Node.js 18+.
    echo Download from: https://nodejs.org/
    echo.
)

:: 3. Setup Virtual Environment
if not exist ".venv" (
    echo [*] Creating virtual environment (.venv)...
    python -m venv .venv
)

echo [*] Activating virtual environment...
call .venv\Scripts\activate.bat

:: 4. Install Backend Dependencies
echo [*] Checking and installing Python dependencies...
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt

:: 5. Install Frontend Dependencies
if exist "frontend\package.json" (
    if not exist "frontend\node_modules" (
        echo [*] Installing frontend dependencies (node_modules)...
        pushd frontend
        call npm install
        popd
    )
)

:: 6. Launch Backend Server in background window
echo [*] Starting VisionForge Backend Server on http://localhost:8000...
start "VisionForge Backend" cmd /k "call .venv\Scripts\activate.bat && python backend/run_backend.py"

:: 7. Launch Frontend Vite Server in background window
if exist "frontend\package.json" (
    echo [*] Starting VisionForge Frontend UI on http://localhost:5173...
    start "VisionForge Frontend" cmd /k "cd frontend && npm run dev"
)

:: 8. Open Browser Verification Hub
timeout /t 3 >nul
start http://localhost:8000/verification_media/verification_media_hub.html

echo.
echo ====================================================================
echo   VISIONFORGE HAS BEEN SUCCESSFULLY REPLICATED AND LAUNCHED!
echo   - Backend Server: http://localhost:8000
echo   - Frontend Studio: http://localhost:5173
echo   - Media Hub: http://localhost:8000/verification_media/verification_media_hub.html
echo ====================================================================
echo.
pause
