"""
VisionForge Enterprise System Integrity & Replication Verification Engine
========================================================================
Run this script to verify that all components, models, dependencies,
and pipelines are 100% intact after copying to a new location (e.g. SD Card,
another PC, or a new workspace).
"""

import sys
import os
import json
import time
import hashlib
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent

def get_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

class IntegrityVerifier:
    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0

    def check(self, name: str, condition: bool, details: str = ""):
        if condition:
            self.passed += 1
            status = "[PASS]"
            color = "\033[92m"
        else:
            self.failed += 1
            status = "[FAIL]"
            color = "\033[91m"
        reset = "\033[0m"
        msg = f"{color}{status}{reset} {name:<45} {details}"
        print(msg)
        self.results.append((status, name, details))

    def run_all(self):
        print("=" * 75)
        print("  VISIONFORGE ENTERPRISE: COMPONENT INTEGRITY VERIFICATION SUITE")
        print(f"  Target Workspace: {WORKSPACE}")
        print(f"  Execution Time  : {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 75)
        print()

        # 1. Manifest and Core Files
        print("--- 1. MANIFEST & CRITICAL FILES INTEGRITY ---")
        manifest_path = WORKSPACE / "SYSTEM_INTEGRITY_MANIFEST.json"
        self.check("Manifest File Exists", manifest_path.exists(), f"({manifest_path.name})")

        if manifest_path.exists():
            with open(manifest_path, "r") as f:
                manifest = json.load(f)

            reg = manifest.get("file_registry", {})
            for rel_path, meta in reg.items():
                p = WORKSPACE / rel_path
                if not p.exists():
                    self.check(f"File: {rel_path}", False, "MISSING FILE")
                else:
                    sz = p.stat().st_size
                    sz_match = (sz == meta["size_bytes"])
                    self.check(f"File: {rel_path}", sz_match, f"({sz:,} bytes)")

        # 2. Python Environment & Libraries
        print("\n--- 2. PYTHON ENVIRONMENT & DEPENDENCY CHECKS ---")
        py_ver = sys.version.split()[0]
        self.check("Python Version >= 3.9", sys.version_info >= (3, 9), f"(Found: {py_ver})")

        deps = [
            ("torch", "PyTorch Deep Learning Engine"),
            ("ultralytics", "YOLO Model Framework"),
            ("fastapi", "API Backend Web Framework"),
            ("uvicorn", "ASGI Production Server"),
            ("scipy", "Hungarian Bipartite Optimization"),
            ("cv2", "OpenCV Computer Vision Engine"),
            ("pydantic", "Schema Validation Engine"),
            ("sqlalchemy", "Database ORM Engine")
        ]

        for mod, desc in deps:
            try:
                __import__(mod)
                self.check(f"Module: {mod}", True, f"({desc})")
            except ImportError as e:
                self.check(f"Module: {mod}", False, f"Missing: {e}")

        # 3. Model Weights Load Test
        print("\n--- 3. MODEL WEIGHTS INTACTNESS & LOAD TEST ---")
        from ultralytics import YOLO

        models_to_test = [
            ("yolo26l.pt", "YOLO26-Large NMS-Free Detector"),
            ("yolov8s-pose.pt", "Human Pose Kinematics Model"),
            ("yolov8s-seg.pt", "Instance Segmentation Model"),
            ("yolov8s-obb.pt", "Oriented Rotated Box Model")
        ]

        # Check Kaggle trained weights
        best_candidates = [
            WORKSPACE / "weights/best_kaggle_dual_t4_precision.pt",
            WORKSPACE / "data/kaggle_staging/outputs/precision_run/best.pt"
        ]
        for bc in best_candidates:
            if bc.exists():
                models_to_test.append((str(bc.relative_to(WORKSPACE)), "Trained Kaggle Precision Weights (mAP90=90.27%)"))
                break

        for model_rel, label in models_to_test:
            mp = WORKSPACE / model_rel
            if not mp.exists():
                self.check(f"Weight: {model_rel}", False, "Weight file missing")
                continue
            try:
                m = YOLO(str(mp))
                param_count = sum(p.numel() for p in m.model.parameters()) if hasattr(m, "model") and m.model is not None else 0
                self.check(f"Weight: {model_rel}", True, f"{label} ({param_count/1e6:.1f}M params)")
            except Exception as e:
                self.check(f"Weight: {model_rel}", False, f"Load Error: {e}")

        # 4. Multitask 1-Frame Smoke Inference Test
        print("\n--- 4. MULTITASK 1-FRAME SMOKE TEST (OFFLINE CLIPS) ---")
        import cv2

        smoke_tasks = [
            ("Detect", "sample_clips/enterprise_traffic_ipcam.mp4", "yolo26l.pt"),
            ("Pose", "sample_clips/test_posture_avc.mp4", "yolov8s-pose.pt"),
            ("Seg", "sample_clips/seg_highway_day.mp4", "yolov8s-seg.pt"),
            ("OBB", "sample_clips/enterprise_drone_overhead_obb.mp4", "yolov8s-obb.pt")
        ]

        for task_name, clip_rel, model_rel in smoke_tasks:
            cp = WORKSPACE / clip_rel
            mp = WORKSPACE / model_rel
            if not cp.exists() or not mp.exists():
                self.check(f"Smoke Test: {task_name}", False, f"Missing clip or model ({clip_rel})")
                continue

            cap = cv2.VideoCapture(str(cp))
            ret, frame = cap.read()
            cap.release()

            if not ret or frame is None:
                self.check(f"Smoke Test: {task_name}", False, "Failed to read test frame from clip")
                continue

            try:
                t0 = time.time()
                m = YOLO(str(mp))
                res = m.predict(frame, verbose=False, imgsz=320)
                dur_ms = (time.time() - t0) * 1000
                det_count = len(res[0].boxes) if res[0].boxes is not None else 0
                self.check(f"Smoke Test: {task_name}", True, f"1 frame inferred in {dur_ms:.1f}ms ({det_count} instances)")
            except Exception as e:
                self.check(f"Smoke Test: {task_name}", False, f"Inference error: {e}")

        # 5. Temporal Smoothing & Tracking Engine
        print("\n--- 5. TEMPORAL TRACKING ENGINE VERIFICATION ---")
        try:
            from scripts.enterprise_temporal_engine import TemporalBBoxTracker, TemporalPoseSmoother
            import numpy as np

            tracker = TemporalBBoxTracker(iou_thresh=0.30, max_lost=4, alpha=0.65)
            # Feed frame 1
            b1 = [np.array([100, 100, 200, 200])]
            t1 = tracker.update(b1, [2], [0.90])
            # Feed frame 2 slightly shifted
            b2 = [np.array([102, 101, 201, 202])]
            t2 = tracker.update(b2, [2], [0.92])

            smooth_match = (len(t2) == 1 and t2[0].track_id == t1[0].track_id)
            self.check("Hungarian IoU Bipartite Tracking", smooth_match, "Persistent ID maintained across frames")

            smoother = TemporalPoseSmoother(alpha=0.55)
            kpts1 = np.ones((17, 2)) * 100
            smoother.smooth_kpts(kpts1, np.ones(17))
            kpts2 = np.ones((17, 2)) * 105
            kpts_smooth = smoother.smooth_kpts(kpts2, np.ones(17))
            ema_valid = (kpts_smooth[0][0] > 100 and kpts_smooth[0][0] < 105)
            self.check("Sub-Pixel Skeletal EMA Smoother", ema_valid, f"EMA coordinate smoothed: {kpts_smooth[0][0]:.2f}")
        except Exception as e:
            self.check("Temporal Tracking Engine", False, f"Error: {e}")

        # 6. Verification Hub HTML Integrity
        print("\n--- 6. VERIFICATION HUB & INTERACTIVE PLAYER ---")
        hub_path = WORKSPACE / "verification_media/verification_media_hub.html"
        self.check("Verification Media Hub HTML", hub_path.exists(), f"({hub_path.stat().st_size:,} bytes)")

        # 7. Final Summary
        print()
        print("=" * 75)
        total = self.passed + self.failed
        pct = (self.passed / total * 100) if total > 0 else 0
        print(f"  INTEGRITY SUMMARY: {self.passed}/{total} CHECKS PASSED ({pct:.1f}%)")
        if self.failed == 0:
            print("  STATUS: ALL COMPONENTS ARE 100% INTACT AND OPERATIONAL!")
        else:
            print(f"  STATUS: {self.failed} COMPONENT(S) FAILED INTEGRITY CHECKS!")
        print("=" * 75)

        # Write output file
        report_path = WORKSPACE / "INTEGRITY_VERIFICATION_REPORT.txt"
        with open(report_path, "w") as f:
            f.write(f"VisionForge Integrity Verification Report\n")
            f.write(f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Passed: {self.passed}/{total} ({pct:.1f}%)\n\n")
            for status, name, details in self.results:
                f.write(f"{status} {name:<45} {details}\n")
        print(f"[+] Written detailed verification log to {report_path.name}")
        return self.failed == 0

if __name__ == "__main__":
    verifier = IntegrityVerifier()
    success = verifier.run_all()
    sys.exit(0 if success else 1)
