@echo off
title VisionForge Studio Launcher
echo ========================================================
echo        VisionForge Studio - Unified AI/ML Studio
echo ========================================================
echo.
echo Starting VisionForge Studio on 0.0.0.0:8000 (Local + LAN)...
echo Accessible to anyone on your local network / Wi-Fi!
echo Press Ctrl+C in this window to stop the server.
echo.

cd /d "%~dp0\backend"
python run_backend.py

pause
