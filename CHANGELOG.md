# Changelog

All notable changes to **VisionForge Studio** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.5.1] - 2026-11-10

### Added
- **20-Minute Continuous Video Validation Suite**: Production-scale 1,200-second (18,000 frames each @ 15 FPS) continuous inference streams featuring running wall-clock timecode (`00:00:00.00` to `00:20:00.00`), monotonic frame indexing (`#00001` to `#18000`), live enterprise HUD telemetry, and broadcast H.264 (`libx264`, `yuv420p`, `+faststart`) encoding for instant zero-buffering native playback in Chromium/Electron.
- **Biomechanical Skeletal Pose & REBA Ergonomics**: Real-time 17-point humanoid skeletal keypoint tracking with 15 anatomical glowing bones, live Knee Flexion and Torso Lean protractor arcs, and automated REBA/RULA ergonomic action classification (`SAFE_SQUAT_LIFT`, `HAZARDOUS_SPINE_BEND`, `OVERHEAD_REACH_STRAIN`, `SAFE_STANDING`).
- **Dense Autonomous Driving & Urban Scene Segmentation**: Full-scene urban streetscape perception parsing vehicles, pedestrians, cyclists, and roadway infrastructure with 45% alpha-blended sub-pixel polygon masks, anti-aliased white boundary lines, and ground-plane perspective distance estimation.
- **Maritime Harbor & Port Logistics Oriented BBoxes (OBB)**: 5-parameter rotated bounding boxes $[cx, cy, w, h, \theta]$ with 4-corner polygon coordinates, center pivot anchor nodes, directional yellow bow heading arrows, and live degree readouts—completely eliminating background water bleed and AABB NMS false suppressions.
- **Verified Kaggle Cloud Dual-T4 GPU Pipeline**: Confirmed live Kaggle cloud kernel execution on 2x NVIDIA Tesla T4 GPUs (32 GB VRAM, CUDA 12.1) using modern `KGAT_` token authentication and OAuth introspection.

---

## [2.5.0] - 2026-11-09

### Added
- **Multi-Task Computer Vision Suite**: Full multi-task support for 17-point Humanoid Pose Estimation (`K`), 5-parameter Oriented Bounding Boxes (`O`), and Sub-Pixel Instance Segmentation (`P`).
- **Edge Model Export Engine**: 1-Click hardware compilation to ONNX Universal (with OnnxSlim graph fusion), Intel OpenVINO, NVIDIA TensorRT, Apple CoreML, and TensorFlow Lite.
- **In-Browser Live Webcam / Video Tester**: In-browser edge inference with Web MediaStream API, real-time FPS counter, and sub-30ms latency HUD.

---

## [1.0.0] - 2026-11-07

### Added
- **Core Video Ingestion Engine**: High-throughput extraction and deduplication of high-resolution video streams (supports $3200 \times 1800$ 4K conveyor footage @ 18.85 FPS).
- **AI-Assisted Zero-Shot Annotation**: Integrated Florence-2 and Segment Anything 2 (SAM 2) for bounding box and polygon contour generation.
- **Kaggle Cloud Dual-T4 Training Integration**: Automated push of formatted datasets and notebook execution across dual NVIDIA Tesla T4 GPUs (32 GB VRAM), complete with live telemetry streaming and automatic checkpoint ingestion.
- **In-Motion Video Benchmark Suite**: Real-time quad-split and single-pane oneshot video evaluation measuring centroid spatial jitter ($\sigma$), continuous lock latency, and frame-by-frame roller bleed.
- **1-Click Edge Model Export**: Automated export to ONNX, OpenVINO, and TensorRT formats with direct browser downloading.
- **Contiguous Temporal Dataset Splitting**: Chronological chunk splitting to prevent adjacent frame data leakage in video feeds.
- **Enterprise Multi-Tenant RBAC**: Role-based access control with Admin, ML Engineer, Reviewer, Annotator, and Viewer permissions.
- **Apple UI Design & Theme**: Glassmorphic panels, pill navigation controls, Cupertino status indicators, and dark-mode aesthetics.
