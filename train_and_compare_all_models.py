# ==============================================================================
#   VISIONFORGE - MASTER END-TO-END TRAINING & MULTI-MODEL FORENSIC BENCHMARK
# ==============================================================================
# Author:            Sushant Gabhane (MSc IT Project)
# Task:              Industrial Conveyor Package Detection (SVG Sequence)
# Architecture:      YOLO Large Backbone (70 Epochs with AdamW & Cosine LR)
# Dataset:           2,391 Raw Frames (Rigid Dimension Keyframe Interpolation)
# Capabilities:      1. Auto-Discovery of Google Drive Paths (handles 'models' & 'models\')
#                    2. 70-Epoch Training on Local NVMe with Industrial Hyperparameters
#                    3. Exhaustive Forensic Benchmark of ALL .pt Checkpoints
#                    4. Side-by-Side Video Annotation Comparison Engine (H.264/yuv420p)
#                    5. Automated Google Drive Archival & Inline Colab Previews
# ==============================================================================

import os
import sys
import time
import shutil
import zipfile
import subprocess
import json

# ------------------------------------------------------------------------------
# 1. Mount Google Drive & Hardware Acceleration Verification
# ------------------------------------------------------------------------------
print("=" * 85)
print(" STEP 1: MOUNTING GOOGLE DRIVE & VERIFYING GPU ACCELERATION")
print("=" * 85)

import os
import torch

# Check if Google Drive is already mounted (e.g., via the Colab GUI Mount button)
if os.path.exists('/content/drive/MyDrive'):
    print("✅ Google Drive is ALREADY mounted and accessible at /content/drive/MyDrive")
else:
    print("Connecting to Google Drive...")
    try:
        from google.colab import drive
        drive.mount('/content/drive', force_remount=True)
        print("✅ Google Drive mounted successfully!")
    except Exception as err:
        print("\n" + "!" * 85)
        print(f"⚠️ drive.mount encountered an authorization issue: {err}")
        print("-" * 85)
        print("💡 QUICK 2-SECOND FIX (NO CODE NEEDED):")
        print("1. Look at the LEFT SIDEBAR in Google Colab.")
        print("2. Click the 'Files' folder icon (📁).")
        print("3. Click the 'Mount Drive' icon (a folder icon with the Google Drive logo).")
        print("4. When the popup appears, click 'Connect to Google Drive'.")
        print("5. After 'drive' appears in the left file tree, simply click RUN again!")
        print("!" * 85 + "\n")
        raise RuntimeError(
            "Drive authorization required. Please click 'Connect to Google Drive' on the popup "
            "or use the 'Mount Drive' button on Colab's left sidebar."
        )

if torch.cuda.is_available():
    gpu_name = torch.cuda.get_device_name(0)
    vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    print(f"✅ GPU Acceleration Active: {gpu_name} ({vram_gb:.2f} GB VRAM)")
else:
    print("⚠️ WARNING: No GPU detected! Please navigate to:")
    print("   Runtime -> Change runtime type -> Hardware accelerator -> Select T4 GPU")

# ------------------------------------------------------------------------------
# Helper: Universal Drive Path Finder (Handles 'models', 'models\', Whitespace)
# ------------------------------------------------------------------------------
def find_drive_folder():
    """Locate the models directory in Google Drive regardless of trailing backslashes."""
    drive_root = "/content/drive/MyDrive"
    candidates = [
        os.path.join(drive_root, "models"),
        os.path.join(drive_root, "models\\"),
        drive_root
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.isdir(c):
            return c
    # Fallback to any directory starting with models
    if os.path.exists(drive_root):
        for entry in os.listdir(drive_root):
            if entry.lower().startswith("models"):
                p = os.path.join(drive_root, entry)
                if os.path.isdir(p):
                    return p
    return drive_root

def find_file(filename, priority_dir=None):
    """Search for a file in priority directory, then Google Drive root."""
    search_dirs = []
    if priority_dir and os.path.exists(priority_dir):
        search_dirs.append(priority_dir)
    drive_root = "/content/drive/MyDrive"
    search_dirs.extend([
        os.path.join(drive_root, "models"),
        os.path.join(drive_root, "models\\"),
        drive_root,
        "/content"
    ])
    
    for d in search_dirs:
        if os.path.exists(d):
            direct = os.path.join(d, filename)
            if os.path.exists(direct):
                return direct
            # Case-insensitive search
            for entry in os.listdir(d):
                if entry.strip().lower() == filename.strip().lower():
                    return os.path.join(d, entry)
                    
    # Recursive search if not found
    if os.path.exists(drive_root):
        for root, _, files in os.walk(drive_root):
            for f in files:
                if f.strip().lower() == filename.strip().lower():
                    return os.path.join(root, f)
    return None

models_folder = find_drive_folder()
print(f"📁 Active Google Drive Folder: {models_folder}")

# ------------------------------------------------------------------------------
# 2. Install Packages & Extract Dataset to Fast Local NVMe SSD
# ------------------------------------------------------------------------------
print("\n" + "=" * 85)
print(" STEP 2: PREPARING DATASET ON LOCAL NVMe SSD (ZERO-THROTTLE CACHE)")
print("=" * 85)

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "ultralytics", "pyyaml", "opencv-python", "tabulate"], check=True)
import yaml
import cv2
import numpy as np
from ultralytics import YOLO

dataset_zip_name = "yolo_raw_all_frames_keyframe.zip"
zip_source = find_file(dataset_zip_name, priority_dir=models_folder)

if not zip_source or not os.path.exists(zip_source):
    raise FileNotFoundError(
        f"❌ Could not find '{dataset_zip_name}' in Google Drive!\n"
        f"Please verify that Google Drive has finished uploading the file to your 'models' folder."
    )

zip_size_mb = os.path.getsize(zip_source) / (1024 * 1024)
print(f"📦 Found dataset archive: {zip_source} ({zip_size_mb:.1f} MB)")

local_dataset_dir = "/content/dataset_keyframe"
if os.path.exists(local_dataset_dir):
    print("Cleaning up previous unzipped dataset cache...")
    shutil.rmtree(local_dataset_dir)

print(f"Unzipping 2,391 raw images & labels into '{local_dataset_dir}' on NVMe SSD...")
with zipfile.ZipFile(zip_source, 'r') as zf:
    zf.extractall(local_dataset_dir)

# Validate and point data.yaml to local NVMe paths
yaml_path = os.path.join(local_dataset_dir, "data.yaml")
with open(yaml_path, "r") as f:
    config = yaml.safe_load(f)

config["path"] = local_dataset_dir
config["train"] = "images/train"
config["val"] = "images/val"

with open(yaml_path, "w") as f:
    yaml.dump(config, f, default_flow_style=False)

print("✅ data.yaml configured for high-speed local NVMe training:")
print(open(yaml_path).read().strip())

# ------------------------------------------------------------------------------
# 3. Train New Keyframe Model (70 Epochs, Large Backbone)
# ------------------------------------------------------------------------------
print("\n" + "=" * 85)
print(" STEP 3: LAUNCHING 70-EPOCH TRAINING ON RIGID KEYFRAME GROUND TRUTH")
print("=" * 85)

# Use Large YOLO Backbone for Industrial Precision
base_weights = "yolov8l.pt"
print(f"🎯 Architecture: YOLO-Large ({base_weights}) | Target: 70 Epochs")
print("⚙️ Hyperparameters: AdamW Optimizer | Cosine LR | CIoU Box Gain: 7.5 | Close Mosaic: 10")

model_new = YOLO(base_weights)

train_results = model_new.train(
    data=yaml_path,
    epochs=70,               # Target: exactly 70 epochs
    imgsz=640,               # Industrial standard resolution
    batch=8,                 # Optimal batch size for Large backbone on 15GB T4 GPU
    optimizer="AdamW",       # Superior weight decay convergence for bounding boxes
    lr0=0.001,               # Initial learning rate
    lrf=0.01,                # Decay learning rate to 1% by epoch 70
    cos_lr=True,             # Smooth Cosine Annealing learning rate schedule
    warmup_epochs=3.0,       # 3-epoch warmup to stabilize gradients
    close_mosaic=10,         # Disables mosaic during final 10 epochs for crisp box edges
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
    plots=True
)

new_best_weights = "/content/runs/detect/keyframe_large_70epochs/weights/best.pt"
print(f"\n✅ Training complete! New best weights generated at: {new_best_weights}")

# ------------------------------------------------------------------------------
# 4. Multi-Model Forensic Audit: Benchmark ALL .pt Files
# ------------------------------------------------------------------------------
print("\n" + "=" * 85)
print(" STEP 4: EXHAUSTIVE MULTI-MODEL FORENSIC AUDIT (BENCHMARKING ALL .PT FILES)")
print("=" * 85)

# Discover all .pt checkpoints automatically across models folder and local training run
discovered_models = []
seen_paths = set()

# 1. Newly trained model
if os.path.exists(new_best_weights):
    discovered_models.append({
        "name": "New Keyframe Model (70 Epochs)",
        "path": new_best_weights,
        "notes": "Trained on 2,391 raw keyframe frames (Rigid Lock Ground Truth)"
    })
    seen_paths.add(os.path.abspath(new_best_weights))

# 2. Search models folder for all other .pt files
if os.path.exists(models_folder):
    for f in sorted(os.listdir(models_folder)):
        if f.endswith(".pt") and "keyframe" not in f:
            full_p = os.path.join(models_folder, f)
            if os.path.abspath(full_p) not in seen_paths:
                seen_paths.add(os.path.abspath(full_p))
                discovered_models.append({
                    "name": f"Existing Checkpoint: {f}",
                    "path": full_p,
                    "notes": "Historical checkpoint in Drive models folder"
                })

audit_results = []

for m_info in discovered_models:
    m_path = m_info["path"]
    m_name = m_info["name"]
    
    if not os.path.exists(m_path):
        continue
        
    fsize_mb = os.path.getsize(m_path) / (1024 * 1024)
    print(f"\nEvaluating: {m_name} ({fsize_mb:.2f} MB)...")
    
    try:
        eval_model = YOLO(m_path)
        params_count = sum(p.numel() for p in eval_model.model.parameters())
        
        t0 = time.time()
        val_res = eval_model.val(data=yaml_path, split="val", imgsz=640, batch=8, verbose=False)
        eval_duration = time.time() - t0
        
        map50 = float(val_res.box.map50) * 100
        map50_95 = float(val_res.box.map) * 100
        precision = float(val_res.box.mp) * 100
        recall = float(val_res.box.mr) * 100
        
        # Measure inference latency on sample validation images
        val_images_dir = os.path.join(local_dataset_dir, "images", "val")
        sample_imgs = [os.path.join(val_images_dir, f) for f in os.listdir(val_images_dir)[:15]]
        
        latencies = []
        for simg in sample_imgs:
            t_inf_start = time.perf_counter()
            _ = eval_model(simg, verbose=False)
            latencies.append((time.perf_counter() - t_inf_start) * 1000)
        avg_latency = float(np.median(latencies))
        
        audit_results.append({
            "model_name": m_name,
            "file_name": os.path.basename(m_path),
            "file_size_mb": round(fsize_mb, 2),
            "total_parameters": params_count,
            "precision_mp": round(precision, 2),
            "recall_mr": round(recall, 2),
            "map_50": round(map50, 2),
            "map_50_95": round(map50_95, 2),
            "latency_ms": round(avg_latency, 2),
            "notes": m_info["notes"]
        })
        print(f"  ✓ mAP@50: {map50:.2f}% | mAP@50-95: {map50_95:.2f}% | Precision: {precision:.2f}% | Latency: {avg_latency:.1f}ms")
    except Exception as e:
        print(f"  ❌ Error evaluating {m_name}: {e}")

# Format and Print Master Audit Table
print("\n" + "=" * 95)
print("                   MASTER FORENSIC AUDIT: ALL MODEL CHECKPOINTS")
print("=" * 95)
header_fmt = f"{'Model Name':<34} | {'Size (MB)':<10} | {'Params (M)':<11} | {'mAP@50':<9} | {'mAP@50-95':<11} | {'Latency':<8}"
print(header_fmt)
print("-" * 95)

for res in audit_results:
    p_millions = f"{res['total_parameters'] / 1e6:.2f}M"
    print(f"{res['model_name']:<34} | {res['file_size_mb']:<10.1f} | {p_millions:<11} | {res['map_50']:<8.2f}% | {res['map_50_95']:<10.2f}% | {res['latency_ms']:<6.1f}ms")
print("=" * 95)

# Save JSON and Markdown forensic reports
report_json_path = "/content/multi_model_forensic_report.json"
with open(report_json_path, "w") as jf:
    json.dump(audit_results, jf, indent=2)

report_md_path = "/content/multi_model_forensic_report.md"
with open(report_md_path, "w") as mf:
    mf.write("# VisionForge Multi-Model Forensic Benchmark Report\n\n")
    mf.write("| Model Name | File Size (MB) | Parameters | mAP@50 (%) | mAP@50-95 (%) | Latency (ms) |\n")
    mf.write("| :--- | :--- | :--- | :--- | :--- | :--- |\n")
    for r in audit_results:
        mf.write(f"| **{r['model_name']}** | {r['file_size_mb']} MB | {r['total_parameters']/1e6:.2f}M | {r['map_50']}% | {r['map_50_95']}% | {r['latency_ms']} ms |\n")

# ------------------------------------------------------------------------------
# 5. Side-by-Side Video Annotation Comparison Engine
# ------------------------------------------------------------------------------
print("\n" + "=" * 85)
print(" STEP 5: SIDE-BY-SIDE VIDEO ANNOTATION COMPARISON GENERATOR")
print("=" * 85)

video_target_name = "sushant_gabhane_D09_20261009102400.mp4"
video_path = find_file(video_target_name, priority_dir=models_folder)

# If exact name not found, pick any .mp4 file in models folder
if not video_path and os.path.exists(models_folder):
    for f in os.listdir(models_folder):
        if f.endswith(".mp4"):
            video_path = os.path.join(models_folder, f)
            break

# Identify the previous model for direct comparison (best (9).pt, then best (8).pt, then best.pt)
prev_model_candidates = ["best (9).pt", "best (8).pt", "best.pt"]
prev_model_path = None
for cand in prev_model_candidates:
    p = find_file(cand, priority_dir=models_folder)
    if p and os.path.exists(p):
        prev_model_path = p
        break

out_video_h264 = "/content/side_by_side_model_comparison.mp4"
preview_snapshots = []

if video_path and os.path.exists(video_path) and prev_model_path and os.path.exists(prev_model_path):
    print(f"🎬 Processing video: {video_path}")
    print(f"   Model A (Left - Red):    Previous Checkpoint ({os.path.basename(prev_model_path)})")
    print(f"   Model B (Right - Green):  New 70-Epoch Keyframe Model ({os.path.basename(new_best_weights)})")
    
    model_prev = YOLO(prev_model_path)
    model_curr = YOLO(new_best_weights)
    
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 20.0
    
    # Process up to 500 representative transit frames starting from active entrance (~frame 750)
    start_f = min(750, max(0, total_frames - 550))
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_f)
    
    vw, vh = 640, 360
    out_w, out_h = vw * 2, vh + 60
    
    temp_raw_vid = "/content/temp_comparison.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(temp_raw_vid, fourcc, 15.0, (out_w, out_h))
    
    frames_to_process = min(400, total_frames - start_f)
    print(f"Rendering {frames_to_process} side-by-side frames (Frame {start_f} -> {start_f + frames_to_process})...")
    
    snapshot_indices = [int(frames_to_process * 0.15), int(frames_to_process * 0.50), int(frames_to_process * 0.85)]
    
    for i in range(frames_to_process):
        ret, frame = cap.read()
        if not ret:
            break
            
        cur_frame_num = start_f + i
        
        # Inference with Model A (Previous) and Model B (New Keyframe)
        res_a = model_prev(frame, conf=0.25, verbose=False)[0]
        res_b = model_curr(frame, conf=0.25, verbose=False)[0]
        
        # Prepare display panels
        panel_a = cv2.resize(frame, (vw, vh))
        panel_b = cv2.resize(frame, (vw, vh))
        
        # Draw Model A (Coral/Red Bounding Box - Historical Model)
        conf_a_str = "None"
        box_a_dims = "N/A"
        for box in res_a.boxes:
            bx1, by1, bx2, by2 = map(int, box.xyxy[0].tolist())
            sx1 = int(bx1 * vw / frame.shape[1])
            sy1 = int(by1 * vh / frame.shape[0])
            sx2 = int(bx2 * vw / frame.shape[1])
            sy2 = int(by2 * vh / frame.shape[0])
            conf_val = float(box.conf[0])
            conf_a_str = f"{conf_val * 100:.1f}%"
            box_a_dims = f"{bx2-bx1}x{by2-by1}"
            cv2.rectangle(panel_a, (sx1, sy1), (sx2, sy2), (50, 70, 240), 2)
            cv2.putText(panel_a, f"Package {conf_a_str}", (sx1, max(18, sy1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 110, 255), 2)
            
        # Top banner for Panel A
        cv2.rectangle(panel_a, (0, 0), (vw, 36), (20, 20, 30), -1)
        cv2.putText(panel_a, f"PREVIOUS MODEL: {os.path.basename(prev_model_path)}", (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (80, 110, 255), 2)
        
        # Draw Model B (Emerald Green Bounding Box - New Keyframe Model)
        conf_b_str = "None"
        box_b_dims = "N/A"
        for box in res_b.boxes:
            bx1, by1, bx2, by2 = map(int, box.xyxy[0].tolist())
            sx1 = int(bx1 * vw / frame.shape[1])
            sy1 = int(by1 * vh / frame.shape[0])
            sx2 = int(bx2 * vw / frame.shape[1])
            sy2 = int(by2 * vh / frame.shape[0])
            conf_val = float(box.conf[0])
            conf_b_str = f"{conf_val * 100:.1f}%"
            box_b_dims = f"{bx2-bx1}x{by2-by1}"
            cv2.rectangle(panel_b, (sx1, sy1), (sx2, sy2), (30, 210, 80), 2)
            cv2.putText(panel_b, f"Package {conf_b_str}", (sx1, max(18, sy1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 240, 120), 2)
            
        # Top banner for Panel B
        cv2.rectangle(panel_b, (0, 0), (vw, 36), (20, 30, 20), -1)
        cv2.putText(panel_b, f"NEW 70-EPOCH KEYFRAME MODEL", (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 240, 120), 2)
        
        # Bottom telemetry status bar
        frame_body = np.hstack([panel_a, panel_b])
        bar = np.full((60, out_w, 3), 24, dtype=np.uint8)
        telemetry_txt = (
            f"Frame {cur_frame_num}/{total_frames} | "
            f"Previous Model: Conf {conf_a_str} (Box: {box_a_dims})  VS  "
            f"New Keyframe Model: Conf {conf_b_str} (Box: {box_b_dims} - Rigid Lock)"
        )
        cv2.putText(bar, telemetry_txt, (20, 38), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (220, 220, 220), 1)
        
        composed = np.vstack([frame_body, bar])
        writer.write(composed)
        
        # Capture snapshot for inline Colab preview
        if i in snapshot_indices:
            snap_path = f"/content/side_by_side_preview_frame_{cur_frame_num}.png"
            cv2.imwrite(snap_path, composed)
            preview_snapshots.append(snap_path)
            
        if (i + 1) % 100 == 0 or (i + 1) == frames_to_process:
            print(f"  ✓ Rendered frame {i + 1} / {frames_to_process} ({(i + 1) / frames_to_process * 100:.1f}%)")
        
    writer.release()
    cap.release()
    
    # Transcode to high-compatibility H.264/yuv420p video for instant web browser playback
    print("\nRe-encoding side-by-side video to browser-compatible H.264 format...")
    subprocess.run(["ffmpeg", "-y", "-i", temp_raw_vid, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "fast", out_video_h264], check=True)
    if os.path.exists(temp_raw_vid):
        os.remove(temp_raw_vid)
    print(f"✅ Comparison video generated: {out_video_h264} ({os.path.getsize(out_video_h264)/(1024**2):.1f} MB)")
else:
    print("⚠️ Notice: Raw video or previous checkpoint not located. Skipping video render.")

# ------------------------------------------------------------------------------
# 6. Automatic Persistent Backup to Google Drive
# ------------------------------------------------------------------------------
print("\n" + "=" * 85)
print(" STEP 6: SECURING ALL WEIGHTS, REPORTS & VIDEOS TO GOOGLE DRIVE")
print("=" * 85)

drive_backup_dir = os.path.join(models_folder, "keyframe_benchmark_results")
os.makedirs(drive_backup_dir, exist_ok=True)

runs_output_dir = "/content/runs/detect/keyframe_large_70epochs"

artifacts = [
    (new_best_weights, "best_keyframe_70ep.pt"),
    (os.path.join(runs_output_dir, "weights/last.pt"), "last_keyframe_70ep.pt"),
    (os.path.join(runs_output_dir, "results.csv"), "training_results.csv"),
    (os.path.join(runs_output_dir, "results.png"), "training_loss_curves.png"),
    (os.path.join(runs_output_dir, "confusion_matrix.png"), "confusion_matrix.png"),
    (os.path.join(runs_output_dir, "F1_curve.png"), "F1_curve.png"),
    (report_json_path, "multi_model_forensic_report.json"),
    (report_md_path, "multi_model_forensic_report.md"),
]

if os.path.exists(out_video_h264):
    artifacts.append((out_video_h264, "side_by_side_model_comparison.mp4"))

for snap in preview_snapshots:
    artifacts.append((snap, os.path.basename(snap)))

print(f"💾 Preserving all deliverables directly to Google Drive:\n   -> {drive_backup_dir}")
for src, out_name in artifacts:
    if os.path.exists(src):
        dst = os.path.join(drive_backup_dir, out_name)
        shutil.copy2(src, dst)
        size_mb = os.path.getsize(dst) / (1024 * 1024)
        print(f"  ✓ Preserved: {out_name:<34} ({size_mb:.2f} MB)")

print("\n🎉 ALL DELIVERABLES PERMANENTLY SAVED TO GOOGLE DRIVE!")

# ------------------------------------------------------------------------------
# 7. Inline Visual Display in Colab
# ------------------------------------------------------------------------------
from IPython.display import Image, display

loss_curve = os.path.join(runs_output_dir, "results.png")
if os.path.exists(loss_curve):
    print("\n--- Training Loss & Metric Curves ---")
    display(Image(filename=loss_curve))

if preview_snapshots:
    print("\n--- Side-by-Side Model Comparison Snapshots ---")
    for snap in preview_snapshots:
        print(f"Snapshot: {os.path.basename(snap)}")
        display(Image(filename=snap))
