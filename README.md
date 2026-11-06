# VisionForge Studio

[![License: Source-Available](https://img.shields.io/badge/License-Source--Available_(R%26D_Free)-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-brightgreen.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![YOLOv8](https://img.shields.io/badge/YOLO-Ultralytics-00ffff.svg)](https://ultralytics.com)
[![Kaggle Dual-T4 GPU](https://img.shields.io/badge/Cloud_Compute-2x_Tesla_T4_(32GB)-9900ff.svg)](https://www.kaggle.com)

> **Enterprise Computer Vision Dataset Engineering, In-Motion Forensic Benchmarking & Headless Cloud Training Suite**  
> *Academic Research & Industrial Vision Engineering — MSc IT (Roll/ID: D09)*

VisionForge Studio consolidates the entire industrial computer vision pipeline into a single cohesive, Apple-inspired workspace — eliminating fragmented handoffs between video trimmers, annotation tools (Roboflow), training scripts, Google Colab notebooks, and evaluation scripts.

---

## Key Highlights & Architectural Capabilities

### 1. Headless Cloud Acceleration (Kaggle Dual Tesla T4 GPUs)
- **Zero-Setup Dispatch in 3 Clicks**: Select your frozen YOLO dataset snapshot, choose hyperparameter presets, and launch automated PyTorch DDP training directly on Kaggle's dual NVIDIA Tesla T4 GPUs (32 GB VRAM).
- **Automated Cloud Staging**: Compresses frames, builds valid Ultralytics `data.yaml`, creates private Kaggle datasets, generates training kernels, and executes cloud training completely headlessly via the Kaggle API.
- **Live Glassmorphic Telemetry HUD**: Real-time telemetry streaming (`GET /api/v1/kaggle/telemetry`), live epoch progression, loss curves (`box_loss`, `cls_loss`, `l1_loss`), validation precision, recall, mAP@50, and mAP@50-95.
- **Automated Model Ingestion**: Downloads converged `best.pt` weights, computes SHA-256 integrity checksums, and imports directly into the VisionForge Model Registry with full metric lineage.

### 2. In-Motion Forensic Benchmarking & Quad-Split Video Comparison
- **Temporal Stress Testing on Conveyor Feeds**:
  - **Ingress Detection Latency**: Frame-accurate measurement of when packages enter the camera field of view.
  - **Centroid Jitter Standard Deviation ($\sigma_{\text{jitter}}$)**: Measures sub-pixel bounding box stability and eliminates flickering annotations.
  - **Roller Bleed Rejection Rate**: Quantifies false positive suppression on metallic conveyor rollers and machinery.
  - **Tracking Continuity & Dropout Immunity**: Verifies continuous object tracking across high-speed motion without losing IDs.
- **Synchronized Quad-Split Video Synthesizer**: Generates synchronized multi-pane comparison MP4 videos (1280 × 720 @ 18.85 FPS) with real-time HUD telemetry, per-model bounding boxes, confidence tags, and H.264 web transcoding.

### 3. Unified 13-Stage Workflow Architecture
1. **Overview**: Mission control with real-time system diagnostics (CPU, RAM, GPU, Disk), active job queue, pipeline progress tracker, and recent experiments.
2. **Projects & Workspaces**: Multi-tenant RBAC workspaces with configurable classes, stage timeline graphs, and dependency tracking.
3. **Video Lab**: Drag-and-drop video ingestion, synthetic demo video generator, video player with frame stepping, start/end trimming, interactive normalized ROI crop overlay, and reusable crop presets.
4. **Frame Studio**: Frame extraction engine (second interval, frame interval, target FPS), Laplacian blur rejection, perceptual hash deduplication, contact sheet mosaic generator, and JSON manifest generation.
5. **AI Annotation Studio**: Interactive HTML5 canvas with zoom/pan, bounding box (`B`) and polygon segmentation (`P`) tools, class hotkeys (`1-9`), undo/redo (`Ctrl+Z`/`Ctrl+Y`), pluggable AI assistance (Ultralytics YOLO and SAM 2/SAM 3 adapters), and one-click batch auto-annotation across the project.
6. **Datasets & Quality Curation**: Class distribution and severe imbalance detection, box anomaly audits (tiny boxes, out-of-bounds), **source-video leakage prevention** (grouping frames by source video into identical splits), and one-click export of valid YOLO `data.yaml` + ZIP packages.
7. **Training Control Center**: Ultralytics YOLO training and fine-tuning runner with **class alignment safeguards**, real-time epoch progress, streaming metric plots, automated checkpointing (`best.pt`, `last.pt`), and safe abort.
8. **Experiments**: Persistent training experiment archive with multi-run side-by-side comparison matrix.
9. **Model Registry**: Model versioning, SHA-256 checksum integrity verification, lifecycle stage governance (`Experimental`, `Staging`, `Production Approved`), and weights download.
10. **Validation Lab**: Standalone image and video inference benchmark with confidence/IoU sliders, real latency (ms) and throughput (FPS) measurements, color-coded detection overlays, and **side-by-side model comparison**.
11. **Compute Runtime Manager**: Multi-runtime pool (Local host, Remote GPU servers, NVIDIA Jetson, Google Colab), automated heartbeat health checks, automated checkpoint failover migration, and custom Google Colab runner notebook (`.ipynb`) generator with Google Drive checkpoint sync.
12. **Integrations Catalog**: Pluggable adapter registry for video processors (OpenCV), AI annotation backends (YOLO, SAM), compute providers (Local, Colab, Jetson), and storage.
13. **Settings**: Configurable app branding, theme selector (Dark Graphite vs Clean Light), and keyboard shortcuts cheat sheet.

---

## Quickstart

### Prerequisites
- Python 3.10+ (Recommended: Python 3.11)
- Node.js 18+ (Recommended: Node 20+)
- (Optional) NVIDIA GPU with CUDA or Kaggle API Token for Cloud Dual-T4 Training

### 1. Clone & Setup Environment
```bash
# Clone repository
git clone https://github.com/VisionForge-Studio/VisionForge.git
cd VisionForge

# Install Python backend dependencies
pip install -r requirements.txt

# Install frontend dependencies & build Apple UI bundle
cd frontend
npm install
npm run build
cd ..
```

### 2. Configure Environment (Optional)
```bash
# Copy environment template
cp .env.example .env

# Set your Kaggle API credentials (optional, can also be configured via UI)
# KAGGLE_USERNAME=your_kaggle_username
# KAGGLE_API_TOKEN=your_kaggle_api_token
```

### 3. Launch VisionForge Studio
```bash
# Start backend server daemon
python backend/run_backend.py
```

Access the interface in your browser:
- **VisionForge Web Studio**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive REST API Docs (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Live System Telemetry**: [http://127.0.0.1:8000/api/v1/system/overview](http://127.0.0.1:8000/api/v1/system/overview)

---

## Kaggle Cloud Dual-T4 Training: 3-Click Quick Guide

1. **Authenticate Kaggle API**:
   - Go to `Settings` or `Training Center` -> click **Config API**.
   - Paste your Kaggle Username and API Token (`KGAT-...` or API key).
2. **Select Frozen Dataset Snapshot**:
   - In `Datasets Studio`, click **Freeze Immutable Dataset Version** (generates leak-free train/val splits).
   - In `Training Center`, select the snapshot (e.g. `v1.0_keyframe_3394`).
3. **Launch Headless Training**:
   - Click **"Launch Headless Cloud Training on Kaggle"**.
   - Monitor the live telemetry HUD: epochs, transfer speed, GPU node diagnostics, and streaming terminal logs.
   - When training completes, click **"Ingest Model Weights"** to automatically import `best.pt` directly into the VisionForge Model Registry with full validation metrics.

---

## Running Automated Verification Test Suite

```bash
cd backend
python -m pytest tests/test_visionforge.py -v
```

All test suites execute completely locally with synthetic fixtures and zero external downloads.

---

## License & Dual-Licensing Terms

VisionForge Studio is distributed under a **Dual-Licensing Model**:

1. **Free Open-Source & Research License (GNU AGPLv3)**:
   - Free for the global Computer Vision, Machine Learning, and Academic Research community to view, run, benchmark, study, and develop for non-commercial research and university education.
   - Any network deployment or cloud SaaS built upon this code must open-source 100% of its corresponding source code under the same GNU AGPLv3 terms (Section 13).

2. **Commercial Enterprise License (Proprietary Industrial Use)**:
   - For companies, industrial factories, automated packaging facilities, or commercial SaaS operators wishing to use VisionForge Studio without the open-source copyleft obligations of GNU AGPLv3.
   - To obtain a Commercial Enterprise License or OEM agreement, contact: `licensing@visionforge.ai`.

See the [`LICENSE`](LICENSE) file for the full legal text.

---

## Academic Citation

If you use VisionForge Studio in academic research, forensic computer vision studies, or technical publications, please cite:

```bibtex
@software{visionforge2026,
  author = {VisionForge Research & Development Team},
  title = {VisionForge Studio: Enterprise Industrial Computer Vision Dataset Engineering and In-Motion Forensic Suite},
  year = {2026},
  url = {https://github.com/VisionForge-Studio/VisionForge}
}
```
