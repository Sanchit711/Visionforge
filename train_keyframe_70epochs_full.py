# ==============================================================================
#      VISIONFORGE - FULL 70-EPOCH KEYFRAME MODEL TRAINING SCRIPT
# ==============================================================================
# Model Architecture: YOLOv8-Large / YOLO11-Large (43.7M parameters)
# Dataset:            2,391 Raw Conveyor Video Frames (Rigid Dimension Lock)
# Execution:          Google Colab (Single-Cell Execution) + Persistent Drive
# ==============================================================================

import os
import sys
import shutil
import zipfile
import subprocess

# ------------------------------------------------------------------------------
# 1. Mount Google Drive & Verify Hardware Acceleration
# ------------------------------------------------------------------------------
print("=" * 70)
print(" STEP 1: MOUNTING GOOGLE DRIVE & VERIFYING GPU ACCELERATION")
print("=" * 70)

from google.colab import drive
import torch

drive.mount('/content/drive')

if torch.cuda.is_available():
    gpu_name = torch.cuda.get_device_name(0)
    vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    print(f"✅ GPU Accelerated: {gpu_name} ({vram_gb:.2f} GB VRAM)")
else:
    print("⚠️ WARNING: No GPU detected! Please navigate to:")
    print("   Runtime -> Change runtime type -> Hardware accelerator -> T4 GPU")

# ------------------------------------------------------------------------------
# 2. Install Ultralytics and Extract Dataset to Fast Local NVMe SSD
# ------------------------------------------------------------------------------
print("\n" + "=" * 70)
print(" STEP 2: PREPARING DATASET ON LOCAL NVMe SSD")
print("=" * 70)

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "ultralytics", "pyyaml"], check=True)
import yaml
from ultralytics import YOLO

# Search common Google Drive paths for the uploaded zip
possible_zip_locations = [
    "/content/drive/MyDrive/models/yolo_raw_all_frames_keyframe.zip",
    "/content/drive/MyDrive/yolo_raw_all_frames_keyframe.zip",
    "/content/yolo_raw_all_frames_keyframe.zip",
]

zip_source = None
for p in possible_zip_locations:
    if os.path.exists(p):
        zip_source = p
        break

if not zip_source:
    raise FileNotFoundError(
        "❌ Could not find 'yolo_raw_all_frames_keyframe.zip' in Google Drive!\n"
        "Please ensure the file has finished uploading to your Google Drive 'models' folder."
    )

zip_mb = os.path.getsize(zip_source) / (1024 * 1024)
print(f"📦 Found dataset archive at: {zip_source} ({zip_mb:.1f} MB)")

local_dataset_dir = "/content/dataset_keyframe"
if os.path.exists(local_dataset_dir):
    print("Cleaning up previous unzipped dataset cache...")
    shutil.rmtree(local_dataset_dir)

print(f"Unzipping 2,391 raw images & labels into '{local_dataset_dir}'...")
with zipfile.ZipFile(zip_source, 'r') as zf:
    zf.extractall(local_dataset_dir)

# Automatically adapt data.yaml paths for Colab Linux environment
yaml_path = os.path.join(local_dataset_dir, "data.yaml")
with open(yaml_path, "r") as f:
    config = yaml.safe_load(f)

config["path"] = local_dataset_dir
config["train"] = "images/train"
config["val"] = "images/val"

with open(yaml_path, "w") as f:
    yaml.dump(config, f, default_flow_style=False)

print("✅ data.yaml configured:")
print(open(yaml_path).read().strip())

# ------------------------------------------------------------------------------
# 3. Model Weight Selection (Large Architecture)
# ------------------------------------------------------------------------------
print("\n" + "=" * 70)
print(" STEP 3: SELECTING MODEL ARCHITECTURE")
print("=" * 70)

# Default: Official YOLOv8-Large model (43.7M parameters)
selected_weights = "yolov8l.pt"

# If you prefer to fine-tune from your existing Drive checkpoint:
drive_checkpoint = "/content/drive/MyDrive/models/best (9).pt"
if os.path.exists(drive_checkpoint):
    print(f"💡 Found previous checkpoint in Drive: {drive_checkpoint}")
    # To fine-tune from best (9).pt instead of COCO pretrained, uncomment line below:
    # selected_weights = drive_checkpoint

print(f"🎯 Starting training with base weights: {selected_weights}")

# ------------------------------------------------------------------------------
# 4. Launch 70-Epoch Training with Optimal Hyperparameters
# ------------------------------------------------------------------------------
print("\n" + "=" * 70)
print(" STEP 4: LAUNCHING 70-EPOCH TRAINING ON 2,391 RAW KEYFRAME IMAGES")
print("=" * 70)

model = YOLO(selected_weights)

train_results = model.train(
    data=yaml_path,
    epochs=70,               # Target: exactly 70 epochs
    imgsz=640,               # Industrial high-resolution inference scale
    batch=8,                 # Optimal batch size for Large backbone on T4 GPU
    optimizer="AdamW",       # Weight decay convergence optimal for bounding boxes
    lr0=0.001,               # Initial learning rate
    lrf=0.01,                # Decay learning rate to 1% by epoch 70
    cos_lr=True,             # Smooth Cosine Annealing learning rate schedule
    warmup_epochs=3.0,       # 3-epoch warmup to stabilize gradients
    close_mosaic=10,         # Disable mosaic augmentation during final 10 epochs
    box=7.5,                 # Heavy penalty on bounding box spatial drift (CIoU loss)
    cls=0.5,                 # Classification loss gain
    dfl=1.5,                 # Distribution Focal Loss gain
    patience=25,             # Early stopping patience if validation metrics plateau
    save=True,               # Save model checkpoints
    save_period=10,          # Save periodic weights every 10 epochs
    amp=True,                # Automatic Mixed Precision (FP16) for 2x faster compute
    workers=4,               # DataLoader worker threads
    project="/content/runs/detect",
    name="keyframe_large_70epochs",
    exist_ok=True,
    plots=True               # Generate training curves and confusion matrix
)

print("\n" + "=" * 70)
print("✅ 70-EPOCH TRAINING COMPLETED SUCCESSFULLY!")
print("=" * 70)

# ------------------------------------------------------------------------------
# 5. Model Validation & Accuracy Scoring
# ------------------------------------------------------------------------------
print("\n" + "=" * 70)
print(" STEP 5: FINAL VALIDATION & ACCURACY AUDIT")
print("=" * 70)

val_results = model.val(
    data=yaml_path,
    split="val",
    imgsz=640,
    batch=8
)

print("\n" + "=" * 70)
print("📊 FINAL VALIDATION SCORECARD (70 EPOCHS - KEYFRAME MODEL)")
print("=" * 70)
print(f"Mean Precision (mP):      {val_results.box.mp * 100:.2f}%")
print(f"Mean Recall (mR):         {val_results.box.mr * 100:.2f}%")
print(f"mAP @ 0.50 (IoU 50%):     {val_results.box.map50 * 100:.2f}%")
print(f"mAP @ 0.50:0.95 (Strict): {val_results.box.map * 100:.2f}%")
print("=" * 70)

# ------------------------------------------------------------------------------
# 6. Automatic Persistent Backup to Google Drive
# ------------------------------------------------------------------------------
print("\n" + "=" * 70)
print(" STEP 6: BACKING UP WEIGHTS AND AUDIT CHARTS TO GOOGLE DRIVE")
print("=" * 70)

drive_backup_dir = "/content/drive/MyDrive/models/keyframe_model_70epochs"
os.makedirs(drive_backup_dir, exist_ok=True)

runs_output_dir = "/content/runs/detect/keyframe_large_70epochs"

artifacts_to_save = [
    ("weights/best.pt", "best_keyframe_70ep.pt"),
    ("weights/last.pt", "last_keyframe_70ep.pt"),
    ("results.csv", "training_results.csv"),
    ("results.png", "training_loss_curves.png"),
    ("confusion_matrix.png", "confusion_matrix.png"),
    ("F1_curve.png", "F1_curve.png")
]

print(f"💾 Securing weights to: {drive_backup_dir}")
for rel_path, out_name in artifacts_to_save:
    src_file = os.path.join(runs_output_dir, rel_path)
    dst_file = os.path.join(drive_backup_dir, out_name)
    if os.path.exists(src_file):
        shutil.copy2(src_file, dst_file)
        f_mb = os.path.getsize(dst_file) / (1024 * 1024)
        print(f"  ✓ Saved '{out_name}' ({f_mb:.2f} MB)")

print("\n🎉 Weights and validation charts are permanently saved in Google Drive!")

# ------------------------------------------------------------------------------
# 7. Display Results Inline in Colab
# ------------------------------------------------------------------------------
from IPython.display import Image, display

loss_curve_img = os.path.join(runs_output_dir, "results.png")
if os.path.exists(loss_curve_img):
    print("\n--- Training Loss & Metric Curves ---")
    display(Image(filename=loss_curve_img))
