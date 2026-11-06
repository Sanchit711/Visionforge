# VisionForge Studio

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-brightgreen.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![YOLOv8](https://img.shields.io/badge/YOLO-Ultralytics-00ffff.svg)](https://ultralytics.com)

> **Unified AI/ML Computer Vision Dataset Preparation, Annotation, Training & Compute Studio**  
> *Developed by Sushant Gabhane (MSc Information Technology - Roll/ID: D09)*

VisionForge Studio consolidates your entire computer vision workflow into a single cohesive platform — eliminating fragmented handoffs between video trimmers, annotation tools (Roboflow), training scripts, Google Colab notebooks, and evaluation scripts.

---

## Key Highlights & Architectural Features

### 1. Unified 13-Stage Workflow Architecture
1. **Overview:** Live mission control with hardware telemetry (CPU, RAM, GPU, Disk), active job queue, pipeline progress tracker, and recent experiments.
2. **Projects & Workspaces:** Multi-project management with configurable classes, stage timeline graphs, and dependency tracking.
3. **Video Lab:** Drag-and-drop video ingestion, synthetic demo video generator, video player with frame stepping, start/end trimming, interactive normalized ROI crop overlay, and reusable crop presets.
4. **Frame Studio:** Frame extraction engine (by second interval, frame interval, or target FPS), Laplacian blur rejection, perceptual hash deduplication, contact sheet mosaic generator, and JSON manifest generation.
5. **AI Annotation Studio:** Interactive HTML5 canvas with zoom/pan, bounding box (`B`) and polygon segmentation (`P`) tools, class hotkeys (`1-9`), undo/redo (`Ctrl+Z`/`Ctrl+Y`), pluggable AI assistance (Ultralytics YOLO and SAM 2/SAM 3 adapters), and one-click batch auto-annotation across the project.
6. **Datasets & Quality Curation:** Class distribution and severe imbalance detection, box anomaly audits (tiny boxes, out-of-bounds), **source-video leakage prevention** (grouping frames by source video into identical splits), and one-click export of valid YOLO `data.yaml` + ZIP packages.
7. **Training Control Center:** Ultralytics YOLO training and fine-tuning runner with **class alignment safeguards**, real-time epoch progress, streaming metric plots (Loss, Precision, Recall, mAP50, mAP50-95), automated checkpointing (`best.pt`, `last.pt`), and safe abort.
8. **Experiments:** Persistent training experiment archive with multi-run side-by-side comparison matrix.
9. **Model Registry:** Model versioning, SHA-256 checksum integrity verification, lifecycle stage governance (`Experimental`, `Staging`, `Production Approved`), and weights download.
10. **Validation Lab:** Standalone image and video inference benchmark with confidence/IoU sliders, real latency (ms) and throughput (FPS) measurements, color-coded detection overlays, and **side-by-side model comparison**.
11. **Compute Runtime Manager:** Multi-runtime pool (Local host, Remote GPU servers, NVIDIA Jetson, Google Colab), automated heartbeat health checks, automated checkpoint failover migration, and custom Google Colab runner notebook (`.ipynb`) generator with Google Drive checkpoint sync.
12. **Integrations Catalog:** Pluggable adapter registry for video processors (OpenCV), AI annotation backends (YOLO, SAM), compute providers (Local, Colab, Jetson), and storage.
13. **Settings:** Configurable app branding, theme selector (Dark Graphite vs Clean Light), and keyboard shortcuts cheat sheet.

---

## Quickstart

### Prerequisites
- Python 3.11+
- Node.js 20+

### Quickstart (Clone & Run Anywhere)

#### Prerequisites
- Python 3.10+ (Recommended Python 3.11)
- Node.js 18+ (Node 20 recommended)

#### 1. Clone & Install Dependencies
```bash
# Clone repository
git clone https://github.com/SushantGabhane/VisionForge-Studio.git
cd VisionForge-Studio

# Install Python backend dependencies
pip install -r requirements.txt

# Install frontend dependencies & build Apple UI production bundle
cd frontend
npm install
npm run build
cd ..
```

#### 2. Launch VisionForge Studio
```bash
# On Windows: Double-click start_visionforge.bat OR run:
python backend/run_backend.py
```

The application will launch on `0.0.0.0:8000` (accessible locally and on your LAN):
- **Web Application:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API Health / Telemetry:** [http://127.0.0.1:8000/api/v1/system/overview](http://127.0.0.1:8000/api/v1/system/overview)

> [!NOTE]
> On first launch, VisionForge Studio automatically initializes the database tables, seeds a ready-to-test demo project with a synthetic conveyor video, and auto-downloads AI model weights (such as SAM 2) on demand upon first request. No manual weight placement is required.

### Running Automated Test Suite
To run the automated verification suite:

```bash
cd backend
python -m pytest tests/test_visionforge.py -v
```

All 5/5 test suites run completely locally with synthetic fixtures and zero external downloads.

---

## Compute Runtimes & Google Colab Failover Strategy
When training models on Google Colab or remote GPU servers, runtime timeouts and quota limits frequently interrupt training.
VisionForge Studio handles this via:
1. **Automated Checkpoint Ingestion:** Continuously preserves `last.pt` checkpoints.
2. **Colab Runner Notebook Generator:** Creates a self-contained notebook that automatically mounts Google Drive and saves checkpoints to `/content/drive/MyDrive/VisionForge/checkpoints`.
3. **Failover Migration Engine:** If a runtime connection drops or reports quota exceeded, VisionForge locates the latest valid checkpoint, checks its integrity, routes work to the next available runtime in priority order, and resumes training from the exact interrupted epoch.


---

## Author & Academic Citation

* **Principal Investigator & Author:** Sushant Gabhane
* **Academic Program:** Master of Science in Information Technology (MSc IT)
* **Student Roll / ID:** D09
* **Project Title:** Industrial Conveyor Package Tracking & Forensic Computer Vision Suite (VisionForge Studio)

If you reference or use this software in academic research or technical benchmarks, please cite:
```bibtex
@software{gabhane2026visionforge,
  author = {Sushant Gabhane},
  title = {VisionForge Studio: Industrial Conveyor Dataset Engineering and Computer Vision Suite},
  year = {2026},
  url = {https://github.com/SushantGabhane/VisionForge-Studio}
}
```

---

## License

This project is licensed under the **GNU Affero General Public License v3.0 (GNU AGPLv3)**.

Under this license:
* **Copyleft Protection:** Anyone distributing or hosting this software (including as a network cloud/SaaS service) must provide the full corresponding source code under the same GNU AGPLv3 terms.
* **Commercial SaaS Prohibition Without Disclosure:** Closed-source commercial exploitation or re-hosting as a proprietary service is strictly prohibited.
* See the [LICENSE](LICENSE) file for complete legal terms.
