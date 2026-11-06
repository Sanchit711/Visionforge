# Changelog

All notable changes to **VisionForge Studio** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-07

### Added
- **Core Video Ingestion Engine**: High-throughput extraction and deduplication of high-resolution video streams (supports $3200 \times 1800$ 4K conveyor footage @ 18.85 FPS).
- **AI-Assisted Zero-Shot Annotation**: Integrated Florence-2 and Segment Anything 2 (SAM 2) for bounding box and polygon contour generation.
- **Kaggle Cloud Dual-T4 Training Integration**: Automated push of formatted datasets and notebook execution across dual NVIDIA Tesla T4 GPUs (30 GB VRAM), complete with live telemetry streaming and automatic checkpoint ingestion.
- **In-Motion Video Benchmark Suite**: Real-time quad-split and single-pane oneshot video evaluation measuring centroid spatial jitter ($\sigma$), continuous lock latency, and frame-by-frame roller bleed.
- **1-Click Edge Model Export**: Automated export to ONNX, OpenVINO, and TensorRT formats with direct browser downloading.
- **Contiguous Temporal Dataset Splitting**: Chronological chunk splitting to prevent adjacent frame data leakage in video feeds.
- **Enterprise Multi-Tenant RBAC**: Role-based access control with Admin, ML Engineer, Reviewer, Annotator, and Viewer permissions.
- **Apple UI Design & Theme**: Glassmorphic panels, pill navigation controls, Cupertino status indicators, and dark-mode aesthetics.
- **Source-Available Research License**: VisionForge Community Source-Available & Non-Commercial Research License (v1.0).
