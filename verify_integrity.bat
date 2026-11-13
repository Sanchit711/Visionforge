@echo off
setlocal
echo ====================================================================
echo   VISIONFORGE STUDIO - SYSTEM INTEGRITY VERIFICATION
echo ====================================================================
echo.

if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

python verify_integrity.py

echo.
pause
