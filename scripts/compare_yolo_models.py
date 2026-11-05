"""
VisionForge: Dedicated Model-vs-Model YOLO Comparison & Video Verification Engine
Takes 3 inputs: VIDEO_PATH, OLD_MODEL_PATH, NEW_MODEL_PATH
Outputs: Detailed .pt comparison + Side-by-side annotated video + Benchmark report
"""

import os
import sys
import time
import json
import base64
import shutil
import subprocess
from pathlib import Path
import cv2
import numpy as np

# Verify Ultralytics
try:
    import torch
    from ultralytics import YOLO
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "-U", "ultralytics", "opencv-python", "PyYAML"])
    import torch
    from ultralytics import YOLO


def inspect_model(path: str) -> dict:
    """Extracts deep structural, class, and parameter metadata from a YOLO .pt file."""
    p = Path(path)
    res = {
        "path": str(p),
        "name": p.stem,
        "exists": p.exists(),
        "size_mb": round(p.stat().st_size / (1024 * 1024), 2) if p.exists() else 0.0,
        "classes": {},
        "num_classes": 0,
        "parameters": 0,
        "layers": 0,
        "task": "detect"
    }
    if not p.exists() and not str(path).endswith(".pt"):
        # Ultralytics pretrained alias like yolov8s.pt
        pass

    try:
        model = YOLO(path)
        res["task"] = getattr(model, "task", "detect")
        res["classes"] = getattr(model, "names", {})
        res["num_classes"] = len(res["classes"])
        if hasattr(model, "model") and model.model is not None:
            res["parameters"] = sum(param.numel() for param in model.model.parameters())
            res["layers"] = len(list(model.model.modules()))
    except Exception as e:
        res["load_error"] = str(e)
    return res


def calculate_iou(boxA, boxB):
    xA, yA = max(boxA[0], boxB[0]), max(boxA[1], boxB[1])
    xB, yB = min(boxA[2], boxB[2]), min(boxA[3], boxB[3])
    inter = max(0.0, xB - xA) * max(0.0, yB - yA)
    areaA = max(0.0, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    areaB = max(0.0, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))
    union = areaA + areaB - inter
    return float(inter / union) if union > 0 else 0.0


def compare_models_and_video(
    video_path: str,
    old_model_path: str,
    new_model_path: str,
    conf_thresh: float = 0.25,
    iou_thresh: float = 0.50,
    max_frames: int = 0,
    output_video: str = "model_comparison_side_by_side.mp4",
    output_report: str = "model_comparison_report.json"
):
    print("=" * 75)
    print("        VISIONFORGE: YOLO MASTER MODEL & VIDEO COMPARISON ENGINE")
    print("=" * 75)

    # 1. DEEP MODEL INSPECTION
    print("\n[STEP 1/4] Inspecting and Comparing Model Checkpoints (.pt)...")
    old_info = inspect_model(old_model_path)
    new_info = inspect_model(new_model_path)

    old_size_str = f"{old_info['size_mb']} MB"
    new_size_str = f"{new_info['size_mb']} MB"
    old_param_str = f"{old_info['parameters']:,}"
    new_param_str = f"{new_info['parameters']:,}"

    print("\n" + "-" * 75)
    print(f"{'ATTRIBUTE':<28} | {'PREVIOUS MODEL':<22} | {'NEW MODEL (best.pt)':<22}")
    print("-" * 75)
    print(f"{'Model Name':<28} | {old_info['name'][:20]:<22} | {new_info['name'][:20]:<22}")
    print(f"{'Checkpoint File Size':<28} | {old_size_str:<22} | {new_size_str:<22}")
    print(f"{'Total Parameters':<28} | {old_param_str:<22} | {new_param_str:<22}")
    print(f"{'Architecture Layers':<28} | {str(old_info['layers']):<22} | {str(new_info['layers']):<22}")
    print(f"{'Number of Classes':<28} | {str(old_info['num_classes']):<22} | {str(new_info['num_classes']):<22}")
    
    old_classes_preview = ", ".join([str(v) for v in list(old_info['classes'].values())[:3]])
    if old_info['num_classes'] > 3: old_classes_preview += "..."
    new_classes_preview = ", ".join([str(v) for v in list(new_info['classes'].values())[:3]])
    if new_info['num_classes'] > 3: new_classes_preview += "..."
    print(f"{'Trained Classes':<28} | {old_classes_preview:<22} | {new_classes_preview:<22}")
    print("-" * 75)

    # 2. LOAD MODELS INTO GPU/CPU
    print("\n[STEP 2/4] Loading models into PyTorch / Ultralytics inference engine...")
    dev = 0 if torch.cuda.is_available() else "cpu"
    m_old = YOLO(old_model_path)
    m_new = YOLO(new_model_path)
    print(f"[OK] Both models loaded. Device: {dev}")

    # 3. VIDEO PROCESSING
    print(f"\n[STEP 3/4] Opening video stream: {video_path}")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video file: {video_path}")

    tot_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 20.0
    fw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    fh = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    limit_frames = min(tot_frames, max_frames) if max_frames > 0 else tot_frames

    # Standardize dimensions (cap combined width at 1920 for web streaming)
    pane_w, pane_h = fw, fh
    if (fw * 2) > 1920:
        scale = 960.0 / fw
        pane_w, pane_h = int(fw * scale), int(fh * scale)
    out_w, out_h = pane_w * 2, pane_h

    raw_output = "temp_raw_comparison.mp4"
    writer = cv2.VideoWriter(raw_output, cv2.VideoWriter_fourcc(*'mp4v'), fps, (out_w, out_h))

    # Analytical tracking
    f_idx = 0
    old_total_dets = 0
    new_total_dets = 0
    old_conf_sum = 0.0
    new_conf_sum = 0.0
    mutual_agreements = 0
    new_unique_dets = 0
    agreement_ious = []
    latencies_old = []
    latencies_new = []
    t_start = time.time()

    print(f"Processing {limit_frames} frames ({out_w}x{out_h} @ {fps:.1f} FPS)...")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        f_idx += 1
        if max_frames > 0 and f_idx > max_frames:
            break

        # Inference Old Model
        t0 = time.time()
        r_old = m_old.predict(frame, imgsz=640, conf=conf_thresh, device=dev, verbose=False)
        lat_old = (time.time() - t0) * 1000.0
        latencies_old.append(lat_old)

        boxes_old = []
        if r_old and len(r_old) > 0 and r_old[0].boxes is not None:
            for b in r_old[0].boxes.data.cpu().numpy():
                boxes_old.append({"box": [float(b[0]), float(b[1]), float(b[2]), float(b[3])], "conf": float(b[4]), "cls": int(b[5])})
        old_total_dets += len(boxes_old)
        old_conf_sum += sum(b["conf"] for b in boxes_old)

        # Inference New Model
        t1 = time.time()
        r_new = m_new.predict(frame, imgsz=640, conf=conf_thresh, device=dev, verbose=False)
        lat_new = (time.time() - t1) * 1000.0
        latencies_new.append(lat_new)

        boxes_new = []
        if r_new and len(r_new) > 0 and r_new[0].boxes is not None:
            for b in r_new[0].boxes.data.cpu().numpy():
                boxes_new.append({"box": [float(b[0]), float(b[1]), float(b[2]), float(b[3])], "conf": float(b[4]), "cls": int(b[5]), "matched": False})
        new_total_dets += len(boxes_new)
        new_conf_sum += sum(b["conf"] for b in boxes_new)

        # Calculate mutual agreement IoU
        frame_agreements = 0
        for nb in boxes_new:
            best_iou = 0.0
            for ob in boxes_old:
                val = calculate_iou(nb["box"], ob["box"])
                if val > best_iou:
                    best_iou = val
            if best_iou >= iou_thresh:
                nb["matched"] = True
                frame_agreements += 1
                agreement_ious.append(best_iou)
            else:
                new_unique_dets += 1
        mutual_agreements += frame_agreements

        # ---- RENDER LEFT PANE (PREVIOUS MODEL - ORANGE) ----
        f_left = frame.copy()
        for ob in boxes_old:
            ox1, oy1, ox2, oy2 = map(int, ob["box"])
            cv2.rectangle(f_left, (ox1, oy1), (ox2, oy2), (245, 158, 11), 2)
            lbl = f"OLD {int(ob['conf']*100)}%"
            (tw, th), _ = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(f_left, (ox1, oy1 - th - 6), (ox1 + tw + 6, oy1), (245, 158, 11), -1)
            cv2.putText(f_left, lbl, (ox1 + 3, oy1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (15, 23, 42), 1, cv2.LINE_AA)
        cv2.rectangle(f_left, (0, 0), (fw, 30), (15, 23, 42), -1)
        cv2.putText(f_left, f"PREVIOUS: {old_info['name'].upper()}", (14, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (245, 158, 11), 1, cv2.LINE_AA)

        # ---- RENDER RIGHT PANE (NEW MODEL - CYAN / GREEN) ----
        f_right = frame.copy()
        for nb in boxes_new:
            nx1, ny1, nx2, ny2 = map(int, nb["box"])
            bcol = (56, 189, 248) if nb["matched"] else (52, 211, 153)
            cv2.rectangle(f_right, (nx1, ny1), (nx2, ny2), bcol, 2)
            tag = f"NEW {int(nb['conf']*100)}%" if nb["matched"] else f"NEW+ {int(nb['conf']*100)}%"
            (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(f_right, (nx1, ny1 - th - 6), (nx1 + tw + 6, ny1), bcol, -1)
            cv2.putText(f_right, tag, (nx1 + 3, ny1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (15, 23, 42), 1, cv2.LINE_AA)
        cv2.rectangle(f_right, (0, 0), (fw, 30), (15, 23, 42), -1)
        cv2.putText(f_right, f"NEW (BEST.PT): {new_info['name'].upper()}", (14, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (56, 189, 248), 1, cv2.LINE_AA)

        if (pane_w, pane_h) != (fw, fh):
            f_left = cv2.resize(f_left, (pane_w, pane_h), interpolation=cv2.INTER_AREA)
            f_right = cv2.resize(f_right, (pane_w, pane_h), interpolation=cv2.INTER_AREA)

        combined = np.hstack([f_left, f_right])
        cv2.line(combined, (pane_w, 0), (pane_w, pane_h), (51, 65, 85), 2)
        cv2.rectangle(combined, (pane_w - 22, pane_h // 2 - 12), (pane_w + 22, pane_h // 2 + 12), (15, 23, 42), -1)
        cv2.putText(combined, "VS", (pane_w - 11, pane_h // 2 + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

        # ---- MASTER TELEMETRY HUD ----
        cv2.rectangle(combined, (0, 0), (out_w, 56), (15, 23, 42), -1)
        cv2.putText(combined, f"OLD: {len(boxes_old)} dets", (16, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (245, 158, 11), 1, cv2.LINE_AA)
        cv2.putText(combined, f"FRAME {f_idx}/{limit_frames}", (pane_w - 70, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(combined, f"NEW: {len(boxes_new)} dets | Agreement: {frame_agreements}", (pane_w + 16, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (56, 189, 248), 1, cv2.LINE_AA)

        writer.write(combined)

        if f_idx % 25 == 0 or f_idx == limit_frames:
            pct = (f_idx / limit_frames) * 100
            print(f"  Frame {f_idx:4d}/{limit_frames} ({pct:5.1f}%) | Old Dets: {len(boxes_old)} | New Dets: {len(boxes_new)} | Agreements: {frame_agreements}")

    cap.release()
    writer.release()

    # Transcode to web-compatible H.264 MP4
    print("\n[STEP 4/4] Transcoding comparison video to H.264 MP4 for instant web streaming...")
    subprocess.run([
        "ffmpeg", "-y", "-i", raw_output, "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", "23", "-preset", "fast", output_video
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(raw_output):
        os.remove(raw_output)

    # 4. BENCHMARK SUMMARY REPORT
    tot_time = time.time() - t_start
    avg_old_conf = (old_conf_sum / max(1, old_total_dets))
    avg_new_conf = (new_conf_sum / max(1, new_total_dets))
    mean_agreement = float(np.mean(agreement_ious)) if agreement_ious else 0.0
    conf_gain = (avg_new_conf - avg_old_conf) * 100

    report = {
        "model_comparison": {
            "old_model": old_info,
            "new_model": new_info
        },
        "video_metrics": {
            "video_path": video_path,
            "total_frames_evaluated": f_idx,
            "total_processing_time_sec": round(tot_time, 2),
            "old_model_detections": old_total_dets,
            "new_model_detections": new_total_dets,
            "old_model_avg_conf": round(avg_old_conf, 4),
            "new_model_avg_conf": round(avg_new_conf, 4),
            "confidence_gain_pct": round(conf_gain, 2),
            "mutual_agreements": mutual_agreements,
            "new_unique_detections": new_unique_dets,
            "mean_agreement_iou": round(mean_agreement, 4),
            "old_mean_latency_ms": round(float(np.mean(latencies_old)), 2) if latencies_old else 0.0,
            "new_mean_latency_ms": round(float(np.mean(latencies_new)), 2) if latencies_new else 0.0,
        },
        "output_video": output_video
    }

    with open(output_report, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 75)
    print("                    FINAL BENCHMARK COMPARISON REPORT")
    print("=" * 75)
    print(f"Total Video Frames Evaluated: {f_idx}")
    print(f"Previous Model Detections:   {old_total_dets:<6} (Avg Confidence: {avg_old_conf*100:.1f}%)")
    print(f"New Model (best.pt) Dets:    {new_total_dets:<6} (Avg Confidence: {avg_new_conf*100:.1f}%)")
    print(f"Mutual Agreement Detections: {mutual_agreements:<6} (Mean Overlap IoU: {mean_agreement*100:.1f}%)")
    print(f"New Unique Detections:       {new_unique_dets:<6} (Objects detected only by New model)")
    print(f"Confidence Delta Gain:       {'+' if conf_gain >= 0 else ''}{conf_gain:.2f}%")
    print(f"Annotated Comparison Video:  {output_video}")
    print(f"Detailed JSON Report:        {output_report}")
    print("=" * 75)

    return report
