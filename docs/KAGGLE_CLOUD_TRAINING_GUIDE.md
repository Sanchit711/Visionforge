# VisionForge Studio: Kaggle Cloud Dual-T4 Training Quick Guide

*Headless Dual Tesla T4 GPU Cluster Acceleration for Industrial YOLO Models*  
*License: VisionForge Community Source-Available & Non-Commercial Research License*

---

## 1. Overview & Architecture

VisionForge Studio features a fully automated, headless cloud training pipeline that connects directly to Kaggle's dual NVIDIA Tesla T4 GPU accelerators (32 GB aggregate VRAM • PyTorch DistributedDataParallel / DDP).

```
+-----------------------------------------------------------------------------+
|                             VISIONFORGE STUDIO                              |
|                                                                             |
|  [ Video Lab ] ---> [ Frame Studio ] ---> [ AI Annotation ]                 |
|                                                  |                          |
|                                                  v                          |
|  [ Model Registry ] <--- [ 1-Click Ingest ] <--- [ Dataset Curation (v1.0) ]|
+------------------------------|----------------------------------------------+
                               | (Headless REST Dispatch)
                               v
+-----------------------------------------------------------------------------+
|                         KAGGLE CLOUD ACCELERATOR                            |
|                                                                             |
|  1. Private Dataset Archive Sync (images.zip, labels.zip, data.yaml)        |
|  2. Automated DDP Multi-GPU Worker Setup (CUDA:0, CUDA:1)                   |
|  3. Ultralytics YOLO Fine-Tuning with Validation Checks                     |
|  4. Live Telemetry Stream (/api/v1/kaggle/telemetry)                        |
|  5. Checkpoint Deliverables (best.pt, last.pt, results.csv, plots)          |
+-----------------------------------------------------------------------------+
```

---

## 2. Prerequisites: Generating Your Kaggle API Token

1. Go to [https://www.kaggle.com](https://www.kaggle.com) and log in.
2. Ensure your Kaggle account is SMS phone-verified (required by Kaggle for GPU execution).
3. Click your profile avatar in the upper right -> **Settings** -> **API Tokens** tab.
4. Click **"Generate"** under **API Tokens (Recommended)**.
5. Copy your token (starts with `KGAT_...` or 32-character key).

---

## 3. Step-by-Step Training Workflow (Zero Setup)

### Step 1: Configure Credentials in VisionForge
- In VisionForge, navigate to **Training Center** in the sidebar.
- Click **"Config API"** on the Kaggle banner.
- Enter your Kaggle Username and paste your API Token.
- Click **"Save & Connect"**. The badge will turn green: `Connected as @your_username`.

### Step 2: Select or Freeze an Immutable Dataset
- Navigate to **Datasets Studio**.
- Audit class distribution and source-video leakage prevention.
- Click **"Freeze Immutable Dataset Version"** (e.g. `v1.0_keyframe_3394`).
- Return to **Training Center** and select this version from the dropdown.

### Step 3: Select Checkpoint & Hyperparameters
- **Base Checkpoint**: Select `yolo26l.pt` (Large), `yolo26m.pt`, or an existing checkpoint.
- **Hyperparameter Preset**: Click **"Apply 50-Epoch Dual-GPU Preset"**:
  - Epochs: `50`
  - Batch Size: `8` (Total across dual GPUs)
  - Optimizer: `AdamW`
  - Learning Rate: `0.0008`
  - Image Size: `640`

### Step 4: Launch Headless Cloud Training
- Click **"Launch Headless Cloud Training on Kaggle"**.
- VisionForge will automatically:
  1. Package dataset images, labels, and rewrite `data.yaml`.
  2. Sync or verify dataset archive on Kaggle cloud storage.
  3. Generate headless Python DDP script and kernel metadata.
  4. Push and start kernel execution on Dual Tesla T4 GPUs.
  5. Record experiment in the VisionForge database.

---

## 4. Live Telemetry HUD & Diagnostics

During training, the **Glassmorphic Telemetry HUD** displays live metrics:
- **Progress Stepper**: 4-stage visual progress ring (Dataset Verified -> Cloud Ingestion -> Dual-T4 Training -> Model Weights Converged).
- **Transfer Speed & Dataset Volume**: Real-time upload speed and verified cloud volume.
- **Hardware Diagnostics**: Active node status (`2x Tesla T4 • 32 GB VRAM • PyTorch DDP`).
- **Live Terminal Feed**: Streaming macOS-style terminal logs showing batch losses, mAP50, and epoch milestones.
- **Open Kaggle Notebook**: One-click link to inspect the running kernel on Kaggle.

---

## 5. One-Click Ingestion & Model Registry

When training concludes (Epoch 50/50 complete):
1. The HUD banner turns emerald: **"Stage 4/4: Model Weights Converged"**.
2. Click **"Ingest Model Weights"**.
3. VisionForge automatically:
   - Downloads `best.pt`, `last.pt`, `results.csv`, confusion matrices, and loss curves.
   - Computes SHA-256 integrity checksum.
   - Registers the checkpoint in the **Model Registry** with full validation metrics (Precision, Recall, mAP@50, mAP@50-95).
   - Links the model as a deployment candidate.

---

## 6. In-Motion Forensic Benchmarking

To benchmark your new model against previous iterations:
1. Navigate to **Validation Lab** -> click **"In-Motion Video Benchmark"** tab.
2. Select an industrial conveyor video from the dropdown.
3. Select up to 4 models (e.g. `yolo26l_conveyor_best50.pt`, previous checkpoints, and base pretrained).
4. Click **"Launch In-Motion Video Benchmark"**.
5. The system performs synchronized inference and outputs:
   - **Centroid Jitter Standard Deviation ($\sigma_{\text{jitter}}$)**: Sub-pixel bounding box stability.
   - **Ingress Detection Frame**: Latency before package acquisition.
   - **Tracking Continuity % & Dropouts**: Loss of tracking across moving frames.
   - **Roller Bleed**: False positive rate on conveyor rollers.
   - **Synchronized Quad-Split MP4 Video**: Downloadable 1280 × 720 video with HUD overlays.

---

## 7. Troubleshooting & FAQ

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **401 Unauthorized** | Kaggle token expired or missing | Re-generate API token in `kaggle.com/settings` and save via VisionForge **Config API**. |
| **GPU Quota Exceeded** | Kaggle weekly 30-hour GPU limit reached | Wait for quota reset, or switch to Google Colab Master training mode via the toggle. |
| **Phone Verification Error** | Account not SMS-verified | Visit `kaggle.com/settings` and complete SMS verification to enable GPU execution. |
| **WinError 5 (Disk Lock)** | Cloud storage or sync daemon lock on local folders | Pause cloud sync or exclude `data/` directory from auto-backup. |
