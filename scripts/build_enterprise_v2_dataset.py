"""
VisionForge Enterprise V2 Dataset Builder & Annotator
======================================================
Builds official Ultralytics multitask datasets directly from raw enterprise video footage:
  1. Detect: enterprise_traffic_ipcam.mp4 (Commercial perimeter security & vehicle detection)
  2. Pose:   test_posture_avc.mp4 (HD Biomechanical posture & ergonomic kinematics)
  3. Seg:    seg_highway_day.mp4 (Autonomous highway cruising & drivable surface)
  4. OBB:    enterprise_drone_overhead_obb.mp4 (Aerial drone logistics & rotated bounding boxes)

Outputs clean, official YOLO datasets with 80/20 train/val splits and valid YAML descriptors.
"""

import os
import sys
import cv2
import yaml
import numpy as np
from pathlib import Path
from ultralytics import YOLO

WORKSPACE_ROOT = Path("C:/Users/Sanchit/Projects/VisionForge")
DATASET_ROOT = WORKSPACE_ROOT / "data" / "datasets" / "enterprise_multitask_v2"

RAW_SOURCES = {
    "detect": {
        "video": WORKSPACE_ROOT / "scratch/enterprise_raw_clips/enterprise_traffic_ipcam.mp4",
        "model": "yolo26l.pt",
        "task_name": "Perimeter Security & Automated Traffic Ingestion",
        "names": {0: "person", 1: "bicycle", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}
    },
    "pose": {
        "video": WORKSPACE_ROOT / "scratch/test_dl/test_posture_avc.mp4",
        "model": "yolov8s-pose.pt",
        "task_name": "Workplace Ergonomic Kinematics & Posture Analysis",
        "names": {0: "person"},
        "kpt_shape": [17, 3]
    },
    "seg": {
        "video": WORKSPACE_ROOT / "scratch/curated_clips/seg_highway_day.mp4",
        "model": "yolov8s-seg.pt",
        "task_name": "Autonomous Drivable Surface & Highway Corridor Segmentation",
        "names": {2: "car", 5: "bus", 7: "truck"}
    },
    "obb": {
        "video": WORKSPACE_ROOT / "scratch/enterprise_raw_clips/enterprise_drone_overhead_obb.mp4",
        "model": "yolov8s-obb.pt",
        "task_name": "Aerial Drone Geo-Spatial Surveillance & Rotated Box Ingestion",
        "names": {0: "plane", 1: "ship", 9: "small-vehicle", 10: "large-vehicle"}
    }
}


def build_task_dataset(task_key: str, config: dict, num_frames: int = 20):
    print(f"\n==================================================")
    print(f"[*] Processing Task: {task_key.upper()} - {config['task_name']}")
    print(f"[*] Raw Video Source: {config['video']}")
    print(f"==================================================")

    if not config["video"].exists():
        raise FileNotFoundError(f"Source video not found: {config['video']}")

    task_dir = DATASET_ROOT / task_key
    for split in ["train", "val"]:
        (task_dir / "images" / split).mkdir(parents=True, exist_ok=True)
        (task_dir / "labels" / split).mkdir(parents=True, exist_ok=True)

    # Load official model for ground truth labeling
    model_path = WORKSPACE_ROOT / config["model"]
    if not model_path.exists():
        model_path = config["model"]
    print(f"[*] Initializing model {model_path} for frame annotation...")
    model = YOLO(str(model_path))

    cap = cv2.VideoCapture(str(config["video"]))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[*] Video Specs: {w}x{h} @ {fps:.1f} fps ({total_frames} total frames)")

    # Select evenly distributed frame indices avoiding first few and last frames
    step = max(1, (total_frames - 20) // num_frames)
    frame_indices = [10 + i * step for i in range(num_frames) if 10 + i * step < total_frames]
    
    extracted_counts = {"train": 0, "val": 0}
    total_annotations = 0

    for idx, f_idx in enumerate(frame_indices):
        split = "val" if (idx % 5 == 0) else "train"  # 20% validation split
        cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
        ret, frame = cap.read()
        if not ret or frame is None:
            continue

        img_stem = f"{task_key}_{idx:04d}_frame_{f_idx:06d}"
        img_file = task_dir / "images" / split / f"{img_stem}.jpg"
        lbl_file = task_dir / "labels" / split / f"{img_stem}.txt"

        # Save frame image
        cv2.imwrite(str(img_file), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
        extracted_counts[split] += 1

        # Run inference to extract annotations
        results = model.predict(frame, verbose=False, conf=0.25)
        res = results[0]
        lines = []

        if task_key == "detect":
            boxes = res.boxes
            if boxes is not None and len(boxes) > 0:
                for b in boxes:
                    cls_id = int(b.cls[0].item())
                    # filter relevant classes
                    if cls_id in config["names"]:
                        xywhn = b.xywhn[0].tolist()
                        lines.append(f"{cls_id} {xywhn[0]:.6f} {xywhn[1]:.6f} {xywhn[2]:.6f} {xywhn[3]:.6f}")

        elif task_key == "pose":
            boxes = res.boxes
            keypoints = res.keypoints
            if boxes is not None and keypoints is not None and len(boxes) > 0:
                for b, k in zip(boxes, keypoints):
                    cls_id = 0  # person
                    xywhn = b.xywhn[0].tolist()
                    kpts_norm = k.xyn[0].tolist()  # list of [x, y]
                    kpts_conf = k.conf[0].tolist() if k.conf is not None else [1.0] * len(kpts_norm)
                    
                    kpt_str_list = []
                    for (kx, ky), kc in zip(kpts_norm, kpts_conf):
                        # visibility: 2=visible, 1=occluded, 0=absent
                        vis = 2 if kc > 0.5 else (1 if kc > 0.2 else 0)
                        kpt_str_list.append(f"{kx:.6f} {ky:.6f} {vis}")
                    
                    line_str = f"{cls_id} {xywhn[0]:.6f} {xywhn[1]:.6f} {xywhn[2]:.6f} {xywhn[3]:.6f} " + " ".join(kpt_str_list)
                    lines.append(line_str)

        elif task_key == "seg":
            masks = res.masks
            boxes = res.boxes
            if masks is not None and boxes is not None and len(boxes) > 0:
                for b, poly in zip(boxes, masks.xyn):
                    cls_id = int(b.cls[0].item())
                    if len(poly) >= 3:
                        poly_str = " ".join([f"{pt[0]:.6f} {pt[1]:.6f}" for pt in poly])
                        lines.append(f"{cls_id} {poly_str}")

        elif task_key == "obb":
            obb = res.obb
            if obb is not None and len(obb) > 0:
                # xyxyxyxy normalized format
                xyxyxyxyn = obb.xyxyxyxyn
                classes = obb.cls
                for cls_t, poly in zip(classes, xyxyxyxyn):
                    cls_id = int(cls_t.item())
                    poly_flat = poly.reshape(-1).tolist()
                    poly_str = " ".join([f"{val:.6f}" for val in poly_flat])
                    lines.append(f"{cls_id} {poly_str}")

        total_annotations += len(lines)
        with open(lbl_file, "w") as f:
            f.write("\n".join(lines) + "\n")

    cap.release()

    # Generate task YAML
    yaml_dict = {
        "path": str(task_dir).replace("\\", "/"),
        "train": "images/train",
        "val": "images/val",
        "names": {int(k): v for k, v in config["names"].items()}
    }
    if task_key == "pose":
        yaml_dict["kpt_shape"] = [17, 3]

    yaml_file = task_dir / f"{task_key}.yaml"
    with open(yaml_file, "w") as yf:
        yaml.safe_dump(yaml_dict, yf, sort_keys=False)

    print(f"[+] Task {task_key.upper()} Complete:")
    print(f"    - Extracted: {extracted_counts['train']} train, {extracted_counts['val']} val images")
    print(f"    - Generated {total_annotations} annotations across frames")
    print(f"    - YAML Config: {yaml_file}")

    return {
        "task": task_key,
        "train_images": extracted_counts["train"],
        "val_images": extracted_counts["val"],
        "total_annotations": total_annotations,
        "yaml": str(yaml_file)
    }


def main():
    print("==================================================================")
    print("  VISIONFORGE ENTERPRISE V2: RAW VIDEO TO DATASET PIPELINE")
    print("==================================================================")
    
    summary = []
    for task_key, config in RAW_SOURCES.items():
        res = build_task_dataset(task_key, config, num_frames=20)
        summary.append(res)

    # Master YAML for entire unified dataset
    master_yaml = {
        "name": "VisionForge Enterprise Multitask Dataset V2",
        "description": "Multi-domain ground truth extracted from enterprise raw video clips for Detect, Pose, Seg, and OBB.",
        "tasks": {s["task"]: s["yaml"].replace("\\", "/") for s in summary}
    }
    master_file = DATASET_ROOT / "enterprise_multitask_v2.yaml"
    with open(master_file, "w") as mf:
        yaml.safe_dump(master_yaml, mf, sort_keys=False)

    print("\n==================================================================")
    print("  ALL 4 TASKS SUCCESSFULLY EXTRACTED & ANNOTATED")
    print("==================================================================")
    for s in summary:
        print(f" - [{s['task'].upper()}]: {s['train_images']} train + {s['val_images']} val images | {s['total_annotations']} annotations | {s['yaml']}")
    print(f" - Master Unified YAML: {master_file}")
    print("==================================================================")


if __name__ == "__main__":
    main()
