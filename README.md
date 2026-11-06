# VisionForge Studio

[![License: Dual AGPLv3 / Commercial](https://img.shields.io/badge/License-Dual_AGPLv3_%2F_Commercial-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-brightgreen.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://www.typescriptlang.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-ee4c2c.svg)](https://pytorch.org/)
[![Ultralytics YOLO](https://img.shields.io/badge/YOLO-Ultralytics_v8%2Fv11-00ffff.svg)](https://ultralytics.com)
[![Florence-2](https://img.shields.io/badge/Vision_Language-Microsoft_Florence--2-ff69b4.svg)](https://huggingface.co/microsoft/Florence-2-base)
[![Meta SAM 2](https://img.shields.io/badge/Segmentation-Meta_SAM_2.1-4267b2.svg)](https://github.com/facebookresearch/sam2)
[![ONNX Runtime](https://img.shields.io/badge/Inference-ONNX_Runtime_%2B_TensorRT-grey.svg)](https://onnxruntime.ai/)
[![Kaggle Dual-T4 GPU](https://img.shields.io/badge/Cloud_Compute-2x_Tesla_T4_(32GB)-9900ff.svg)](https://www.kaggle.com)

> **Enterprise Computer Vision Dataset Engineering, In-Motion Forensic Benchmarking & Headless Cloud Training Suite**  
> *Industrial Machine Vision, High-Speed Conveyor Tracking & Edge AI Deployment*

---

### 🌐 GitHub Domain Tags & Search Keywords
`computer-vision` &bull; `object-detection` &bull; `yolo` &bull; `yolov8` &bull; `yolov11` &bull; `florence-2` &bull; `sam-2` &bull; `segment-anything` &bull; `video-annotation` &bull; `dataset-engineering` &bull; `industrial-automation` &bull; `edge-ai` &bull; `onnx` &bull; `tensorrt` &bull; `openvino` &bull; `kaggle-api` &bull; `conveyor-inspection` &bull; `fastapi` &bull; `react` &bull; `pytorch`

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
git clone https://github.com/Sanchit711/Visionforge.git
cd Visionforge

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
- **VisionForge Web Studio**: [http://127.0.0.1:8000](http://127.0.0.1:8000) (or `http://localhost:5173` if running Vite dev server)
- **Interactive REST API Docs (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Live System Telemetry**: [http://127.0.0.1:8000/api/v1/system/overview](http://127.0.0.1:8000/api/v1/system/overview)

### Default Seeded User Accounts
The database automatically seeds mock enterprise team members for instant local testing:
| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@visionforge.ai` | `password123` | Full administrative rights & config |
| **Engineer** | `alex@visionforge.ai` | `password123` | Datasets, model training & exports |
| **Reviewer** | `marcus@visionforge.ai` | `password123` | Annotation validation & forensics |
| **Annotator** | `elena@visionforge.ai` | `password123` | Bounding box labeling & SAM 2 |
| **Viewer** | `sarah@visionforge.ai` | `password123` | Read-only dashboards |

*(You can also switch users in 1 click using the User Pill in the top header).*

---

## Interactive Product Tour
Upon opening the web studio, the **Interactive Product Tour** automatically launches for new visitors. You can re-open it at any time:
- Click the **"Tour"** capsule button in the top header navigation.
- Or press **`Ctrl+K`** and select **"Take Interactive Product Tour"**.
- Navigate using **`→`** (Next), **`←`** (Previous), or **`Esc`** (Close).

---

## Complete End-to-End Operator Workflow

```
[1. Projects] ➔ [2. Video Lab] ➔ [3. Frame Studio] ➔ [4. AI Annotation] ➔ [5. Datasets] ➔ [6. Cloud Train] ➔ [7. Edge Export & Validation]
```

1. **Step 1: Projects & Workspace**:
   - Select the pre-seeded demo project (*"VisionForge Demo - Traffic & Workplace Safety"*) or click **"+ New Project"** to define custom inspection classes (e.g. `bearing`, `defect`, `circuit_board`).
2. **Step 2: Video Lab**:
   - The pre-generated demo video is already loaded. To add your own, drag and drop an MP4/AVI/MKV video into the dropzone.
   - Adjust the **Region of Interest (ROI)** bounding box on the video canvas to focus on the conveyor belt and crop out ambient factory distractions.
3. **Step 3: Frame Studio**:
   - Click **"Extract Frames"**.
   - Enable **Laplacian Blur Filtering** to automatically discard motion-blurred frames.
   - Enable **Perceptual Hash Deduplication** to decimate redundant, static conveyor frames (typically saves 80-90% storage).
4. **Step 4: AI-Assisted Annotation**:
   - Select extracted frames on the timeline.
   - **Zero-Shot Grounding**: Type text prompt (e.g. `"conveyor item"`) using **Microsoft Florence-2** for auto-labeling.
   - **Interactive Masks**: Click objects using **Meta SAM 2** (+ for object, - for background).
   - **Rigid-Body Keyframe Interpolation**: Set a box on Frame $A$, step forward to Frame $B$, and click **Interpolate Trajectory** to automatically label all intermediate frames with physical dimensions locked.
5. **Step 5: Dataset Studio & Temporal Partitioning**:
   - Select **Contiguous Temporal Chunk Splitting** (`split_strategy="temporal"`). This groups chronological sequences together with a safety buffer, guaranteeing zero train/val frame leakage.
   - Click **"Freeze Immutable Dataset Snapshot"** (formats standard YOLO `data.yaml` and bounding coordinates).
6. **Step 6: Headless Cloud GPU Training (Kaggle Dual-T4)**:
   - Go to `Training Center` -> paste your Kaggle API credentials (one-time setup).
   - Select your frozen dataset snapshot and architecture (`yolo26l`, `yolov8n`, etc.).
   - Click **"Launch Headless Cloud Training"**.
   - Watch real-time loss curves, learning rate warmup, and validation mAP50 telemetry stream back live.
   - Upon completion, click **"Ingest Model Weights"** to automatically import `best.pt`.
7. **Step 7: Model Registry & In-Motion Forensics**:
   - In **Model Registry**: Click **"Download ONNX"** for instant 1-click browser download (compiled 50.8 MB weights).
   - In **Validation Lab**: Run the **Synchronized Quad-Split Video Benchmark** to evaluate your model side-by-side with previous checkpoints under real conveyor motion, checking sub-pixel jitter ($\sigma < 0.8\text{px}$) and roller bleed suppression.

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
  url = {https://github.com/Sanchit711/Visionforge}
}
```
