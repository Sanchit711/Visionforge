# VisionForge Enterprise Replication & Portability Guide

This package contains everything required to duplicate and run **VisionForge Enterprise Studio** on any machine (Windows, Linux, or macOS) completely offline or online.

---

## ⚡ Quick Start: One-Click Launch

### On Windows:
Double-click:
```cmd
replicate_and_run.bat
```
*(This script automatically creates `.venv`, installs requirements, installs frontend packages, starts the FastAPI backend on `http://localhost:8000`, starts the React UI on `http://localhost:5173`, and opens the browser).*

### On Linux / macOS:
```bash
chmod +x replicate_and_run.sh
./replicate_and_run.sh
```

---

## 🛠️ Manual Step-by-Step Setup (If preferred)

### 1. Prerequisites
- **Python**: 3.10, 3.11, or 3.12
- **Node.js**: 18+ (for frontend UI)
- **Git** (optional)

### 2. Backend Setup
```bash
# 1. Create and activate virtual environment
python -m venv .venv
# On Windows:
call .venv\Scripts\activate.bat
# On Linux/macOS:
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start Backend Server
python backend/run_backend.py
```
Backend API will be active at: `http://localhost:8000`  
Interactive Media Hub: `http://localhost:8000/verification_media/verification_media_hub.html`

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Studio UI will be active at: `http://localhost:5173`

---

## 🧠 Model Weights Included Out-of-the-Box
- `weights/best_kaggle_dual_t4_precision.pt` — Custom trained model (**$mAP_{50} = 90.27\%$**)
- `yolo26l.pt` — YOLO26-Large NMS-Free detector
- `yolov8s-pose.pt` — Biomechanical human pose estimation
- `yolov8s-seg.pt` — Autonomous drivable surface segmentation
- `yolov8s-obb.pt` — High-altitude aerial rotated bounding box detector

---

## 🎬 Reproducing the Video Showcases
To re-run the temporal smoothing showcase on the included sample clips:
```bash
python scripts/render_smooth_enterprise_showcase.py
```
This renders all 4 tasks (Detect, Pose, Seg, OBB) and concatenates the master continuous film into `verification_media/`.
