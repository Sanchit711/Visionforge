#!/usr/bin/env bash
set -e

echo "===================================================================="
echo "  VISIONFORGE STUDIO - AUTOMATED ENVIRONMENT BOOTSTRAP & LAUNCHER"
echo "===================================================================="
echo ""

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed or not in PATH! Please install Python 3.10+"
    exit 1
fi

# 2. Check Node
if ! command -v node &> /dev/null; then
    echo "[WARNING] Node.js is not found in PATH! Frontend UI requires Node.js 18+"
fi

# 3. Virtual Environment
if [ ! -d ".venv" ]; then
    echo "[*] Creating virtual environment (.venv)..."
    python3 -m venv .venv
fi

echo "[*] Activating virtual environment..."
source .venv/bin/activate

# 4. Install Dependencies
echo "[*] Installing Python requirements..."
pip install --upgrade pip
pip install -r requirements.txt

# 5. Frontend dependencies
if [ -d "frontend" ] && [ ! -d "frontend/node_modules" ]; then
    echo "[*] Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# 6. Launch Backend Server in background
echo "[*] Starting VisionForge Backend Server on http://localhost:8000..."
python backend/run_backend.py &
BACKEND_PID=$!

# 7. Launch Frontend Vite
if [ -d "frontend" ]; then
    echo "[*] Starting VisionForge Frontend UI on http://localhost:5173..."
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    cd ..
fi

echo ""
echo "===================================================================="
echo "  VISIONFORGE HAS BEEN SUCCESSFULLY REPLICATED AND LAUNCHED!"
echo "  - Backend Server: http://localhost:8000"
echo "  - Frontend Studio: http://localhost:5173"
echo "  - Media Hub: http://localhost:8000/verification_media/verification_media_hub.html"
echo "===================================================================="
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
