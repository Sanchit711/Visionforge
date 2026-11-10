"""
Official Ultralytics YOLOv8 Multitask Training & Validation Pipeline
===================================================================
Production-grade training script strictly grounded in official Ultralytics
documentation for all three vision tasks:
  1. Human Pose Estimation (docs.ultralytics.com/tasks/pose/)
  2. Instance Segmentation (docs.ultralytics.com/tasks/segment/)
  3. Oriented Bounding Boxes / OBB (docs.ultralytics.com/tasks/obb/)

Usage Examples:
---------------
# Train Pose model on COCO8-Pose (or custom dataset):
python scripts/train_official_yolo_tasks.py --task pose --data coco8-pose.yaml --epochs 50 --imgsz 640

# Train Segmentation model on COCO8-Seg:
python scripts/train_official_yolo_tasks.py --task seg --data coco8-seg.yaml --epochs 50 --imgsz 640

# Train Oriented Bounding Box model on DOTA8:
python scripts/train_official_yolo_tasks.py --task obb --data dota8.yaml --epochs 50 --imgsz 1024

# Validate trained model:
python scripts/train_official_yolo_tasks.py --task pose --weights runs/pose/train/weights/best.pt --mode val
"""

import argparse
import sys
import os
from pathlib import Path
from ultralytics import YOLO


# Task-specific default configurations per Ultralytics documentation
TASK_DEFAULTS = {
    "pose": {
        "model": "yolov8s-pose.pt",
        "data": "coco8-pose.yaml",
        "imgsz": 640,
        "batch": 16,
        "doc": "https://docs.ultralytics.com/tasks/pose/",
        "metric_key": "metrics/mAP50-95(P)",
        "desc": "Human Pose Estimation (17 COCO Keypoints: nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles)"
    },
    "seg": {
        "model": "yolov8s-seg.pt",
        "data": "coco8-seg.yaml",
        "imgsz": 640,
        "batch": 16,
        "doc": "https://docs.ultralytics.com/tasks/segment/",
        "metric_key": "metrics/mAP50-95(M)",
        "desc": "Instance Segmentation (Pixel-level alpha masks and polygon contours per object)"
    },
    "obb": {
        "model": "yolov8s-obb.pt",
        "data": "dota8.yaml",
        "imgsz": 1024,
        "batch": 8,
        "doc": "https://docs.ultralytics.com/tasks/obb/",
        "metric_key": "metrics/mAP50-95(B)",
        "desc": "Oriented Bounding Boxes (DOTA 4-vertex rotated rectangles with orientation angle theta)"
    }
}


def train_task(task: str, data: str, epochs: int, imgsz: int, batch: int, device: str = None, pretrained_weights: str = None):
    cfg = TASK_DEFAULTS[task]
    model_weights = pretrained_weights or cfg["model"]

    print("=" * 70)
    print(f"ULTRALYTICS OFFICIAL TRAINING PIPELINE - TASK: {task.upper()}")
    print(f"Documentation: {cfg['doc']}")
    print(f"Description:   {cfg['desc']}")
    print(f"Base Weights:  {model_weights}")
    print(f"Dataset YAML:  {data}")
    print(f"Hyperparams:   epochs={epochs}, imgsz={imgsz}, batch={batch}, device={device or 'auto'}")
    print("=" * 70)

    # Initialize model using official Ultralytics YOLO loader
    model = YOLO(model_weights)

    # Execute training loop strictly adhering to Ultralytics guidelines
    train_args = {
        "data": data,
        "epochs": epochs,
        "imgsz": imgsz,
        "batch": batch,
        "project": f"runs/{task}",
        "name": "train",
        "exist_ok": True,
        "verbose": True,
        "plots": True,
        "save": True,
        "val": True,
        "amp": True,
    }
    if device is not None:
        train_args["device"] = device

    results = model.train(**train_args)
    print("\nTraining completed successfully.")
    print(f"Results saved to: runs/{task}/train")
    return results


def validate_task(task: str, weights: str, data: str = None, imgsz: int = None, device: str = None):
    cfg = TASK_DEFAULTS[task]
    data_yaml = data or cfg["data"]
    img_size = imgsz or cfg["imgsz"]

    print("=" * 70)
    print(f"ULTRALYTICS OFFICIAL VALIDATION - TASK: {task.upper()}")
    print(f"Documentation: {cfg['doc']}")
    print(f"Weights:       {weights}")
    print(f"Dataset:       {data_yaml}")
    print("=" * 70)

    model = YOLO(weights)
    val_args = {
        "data": data_yaml,
        "imgsz": img_size,
        "project": f"runs/{task}",
        "name": "val",
        "exist_ok": True,
        "verbose": True,
        "plots": True
    }
    if device is not None:
        val_args["device"] = device

    metrics = model.val(**val_args)
    print("\nValidation completed successfully.")
    print(f"Validation plots and confusion matrices saved to: runs/{task}/val")
    return metrics


def predict_task(task: str, weights: str, source: str, conf: float = 0.25, save: bool = True, device: str = None):
    cfg = TASK_DEFAULTS[task]
    print("=" * 70)
    print(f"ULTRALYTICS OFFICIAL PREDICTION - TASK: {task.upper()}")
    print(f"Source:  {source}")
    print(f"Weights: {weights}")
    print("=" * 70)

    model = YOLO(weights)
    results = model.predict(
        source=source,
        conf=conf,
        save=save,
        project=f"runs/{task}",
        name="predict",
        exist_ok=True,
        device=device or "auto"
    )
    print(f"Predictions saved to: runs/{task}/predict")
    return results


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Official Ultralytics YOLOv8 Training, Validation, and Prediction for Pose, Seg, and OBB"
    )
    parser.add_argument("--task", type=str, required=True, choices=["pose", "seg", "obb"],
                        help="Vision task to execute: 'pose', 'seg', or 'obb'")
    parser.add_argument("--mode", type=str, default="train", choices=["train", "val", "predict"],
                        help="Operation mode: 'train', 'val', or 'predict'")
    parser.add_argument("--weights", type=str, default=None,
                        help="Pretrained weights path (defaults to official yolov8s-{task}.pt)")
    parser.add_argument("--data", type=str, default=None,
                        help="Dataset YAML config path (defaults to official sample yaml)")
    parser.add_argument("--source", type=str, default=None,
                        help="Input video or image path for prediction mode")
    parser.add_argument("--epochs", type=int, default=50,
                        help="Number of training epochs (default: 50)")
    parser.add_argument("--imgsz", type=int, default=None,
                        help="Image resolution (default: 640 for pose/seg, 1024 for obb)")
    parser.add_argument("--batch", type=int, default=None,
                        help="Batch size (default: 16 for pose/seg, 8 for obb)")
    parser.add_argument("--conf", type=float, default=0.25,
                        help="Confidence threshold for prediction (default: 0.25)")
    parser.add_argument("--device", type=str, default=None,
                        help="Compute device: '0', '0,1', 'cpu', or None for auto")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_arguments()
    task_cfg = TASK_DEFAULTS[args.task]

    data_path = args.data or task_cfg["data"]
    weights_path = args.weights or task_cfg["model"]
    img_size = args.imgsz or task_cfg["imgsz"]
    batch_size = args.batch or task_cfg["batch"]

    if args.mode == "train":
        train_task(
            task=args.task,
            data=data_path,
            epochs=args.epochs,
            imgsz=img_size,
            batch=batch_size,
            device=args.device,
            pretrained_weights=weights_path
        )
    elif args.mode == "val":
        validate_task(
            task=args.task,
            weights=weights_path,
            data=data_path,
            imgsz=img_size,
            device=args.device
        )
    elif args.mode == "predict":
        if not args.source:
            raise ValueError("--source argument is required when mode is 'predict'")
        predict_task(
            task=args.task,
            weights=weights_path,
            source=args.source,
            conf=args.conf,
            device=args.device
        )
