#!/usr/bin/env bash
# ========================================================
#        VisionForge Studio - Industrial AI/ML Suite
#    Licensed under VisionForge Community License (v1.0)
# ========================================================

set -e

echo "========================================================"
echo "       VisionForge Studio - Industrial AI/ML Suite"
echo "   Licensed under VisionForge Community License (v1.0)"
echo "========================================================"
echo ""

# Resolve project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Environment template check
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "[*] Creating .env from .env.example..."
    cp .env.example .env
fi

# 2. Check if Frontend Production Build exists; if not, auto-build
if [ ! -f "frontend/dist/index.html" ]; then
    echo "[*] Production frontend build not detected. Initializing build..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "[*] Installing frontend NPM dependencies..."
        npm install
    fi
    echo "[*] Compiling Apple UI + Vite production bundle..."
    npm run build
    cd "$SCRIPT_DIR"
    echo "[OK] Frontend successfully compiled to frontend/dist!"
    echo ""
fi

# 3. Launch Backend Application Server
echo "[*] Starting VisionForge Studio on 0.0.0.0:8000..."
echo "[*] Local Webapp:  http://localhost:8000"
echo "[*] API Docs:      http://localhost:8000/docs"
echo "[*] Press Ctrl+C to stop the server."
echo ""

cd "$SCRIPT_DIR/backend"
if command -v python3 &>/dev/null; then
    python3 run_backend.py
else
    python run_backend.py
fi
