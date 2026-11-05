"""
VisionForge Model Training & Empirical Accuracy Benchmark Script
================================================================
Compares downstream YOLO model performance when trained on:
  1. Meta SAM 2.1 Video Tracking Dataset (Stochastic & Bleeding Labels)
  2. VisionForge Keyframe Interpolation Dataset (Deterministic & Rigid Labels)

Academic Context: MSc IT Project - Empirical Comparative Analysis
"""

import os
import json
from pathlib import Path
from ultralytics import YOLO

def train_and_benchmark():
    base_dir = Path(__file__).resolve().parent
    
    # Dataset YAML configs
    sam2_yaml = base_dir / "data" / "datasets" / "proj-sam2-benchmark-svg" / "v1.0_sam2" / "data.yaml"
    keyframe_yaml = base_dir / "data" / "datasets" / "proj-keyframe-benchmark-svg" / "v1.0_keyframe" / "data.yaml"
    
    epochs = 40
    imgsz = 640
    batch_size = 8
    base_weights = "yolov8m.pt"
    
    print("=" * 70)
    print(" VISIONFORGE EMPIRICAL BENCHMARK: SAM 2 VS. KEYFRAME DATASET")
    print("=" * 70)
    print(f"Base Weights: {base_weights}")
    print(f"Epochs:       {epochs}")
    print(f"Image Size:   {imgsz}")
    print(f"Batch Size:   {batch_size}")
    print("-" * 70)
    
    # -------------------------------------------------------------
    # Experiment 1: Train on SAM 2 Tracking Dataset
    # -------------------------------------------------------------
    print("\n[1/2] Starting Training on SAM 2 Tracking Dataset...")
    model_sam2 = YOLO(base_weights)
    results_sam2 = model_sam2.train(
        data=str(sam2_yaml),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        project="runs/detect",
        name="sam2_tracking_exp",
        exist_ok=True,
        verbose=True
    )
    
    print("\nEvaluating SAM 2 Model on Validation Split...")
    val_sam2 = model_sam2.val(data=str(sam2_yaml), split="val")
    
    # -------------------------------------------------------------
    # Experiment 2: Train on Keyframe Interpolation Dataset
    # -------------------------------------------------------------
    print("\n[2/2] Starting Training on Keyframe Interpolation Dataset...")
    model_kf = YOLO(base_weights)
    results_kf = model_kf.train(
        data=str(keyframe_yaml),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        project="runs/detect",
        name="keyframe_interpolation_exp",
        exist_ok=True,
        verbose=True
    )
    
    print("\nEvaluating Keyframe Model on Validation Split...")
    val_kf = model_kf.val(data=str(keyframe_yaml), split="val")
    
    # -------------------------------------------------------------
    # Comparative Summary Report
    # -------------------------------------------------------------
    sam2_map50 = round(float(val_sam2.box.map50) * 100, 2)
    sam2_map = round(float(val_sam2.box.map) * 100, 2)
    sam2_p = round(float(val_sam2.box.mp) * 100, 2)
    sam2_r = round(float(val_sam2.box.mr) * 100, 2)
    
    kf_map50 = round(float(val_kf.box.map50) * 100, 2)
    kf_map = round(float(val_kf.box.map) * 100, 2)
    kf_p = round(float(val_kf.box.mp) * 100, 2)
    kf_r = round(float(val_kf.box.mr) * 100, 2)
    
    print("\n" + "=" * 70)
    print(" FINAL EMPIRICAL ACCURACY AUDIT: SAM 2 VS. KEYFRAME INTERPOLATION")
    print("=" * 70)
    print(f"{'Performance Metric':<25} | {'SAM 2 Dataset':<18} | {'Keyframe Dataset':<18} | {'Delta':<10}")
    print("-" * 70)
    print(f"{'mAP @ 0.50 (%)':<25} | {sam2_map50:<18} | {kf_map50:<18} | {kf_map50 - sam2_map50:+0.2f}%")
    print(f"{'mAP @ 0.50:0.95 (%)':<25} | {sam2_map:<18} | {kf_map:<18} | {kf_map - sam2_map:+0.2f}%")
    print(f"{'Precision (mP) (%)':<25} | {sam2_p:<18} | {kf_p:<18} | {kf_p - sam2_p:+0.2f}%")
    print(f"{'Recall (mR) (%)':<25} | {sam2_r:<18} | {kf_r:<18} | {kf_r - sam2_r:+0.2f}%")
    print("=" * 70)
    
    summary_path = base_dir / "accuracy_comparison_results.json"
    summary_data = {
        "sam2_dataset": {
            "mAP50": sam2_map50,
            "mAP50_95": sam2_map,
            "precision": sam2_p,
            "recall": sam2_r,
            "best_weights": str(Path("runs/detect/sam2_tracking_exp/weights/best.pt").resolve())
        },
        "keyframe_dataset": {
            "mAP50": kf_map50,
            "mAP50_95": kf_map,
            "precision": kf_p,
            "recall": kf_r,
            "best_weights": str(Path("runs/detect/keyframe_interpolation_exp/weights/best.pt").resolve())
        }
    }
    with open(summary_path, "w") as sf:
        json.dump(summary_data, sf, indent=2)
    print(f"\nAudit results successfully saved to {summary_path}")

if __name__ == "__main__":
    train_and_benchmark()
