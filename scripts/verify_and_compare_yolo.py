#!/usr/bin/env python3
"""
=============================================================================
VisionForge Studio: YOLO Master Video Verification & Comparison Engine
Evaluates trained YOLO models (e.g. best.pt) on full video / frame streams,
performs side-by-side ground truth comparison, calculates frame-by-frame IoU,
and renders a high-definition annotated video with an enterprise telemetry HUD.

Compatible with:
- Google Colab (Cloud GPU T4 / A100)
- Local Workstation (CUDA / CPU)
=============================================================================
"""

import os
import sys
import time
import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any

import cv2
import numpy as np

try:
    import torch
    from ultralytics import YOLO
    ULTRALYTICS_OK = True
except ImportError:
    ULTRALYTICS_OK = False


def calculate_iou(boxA: List[float], boxB: List[float]) -> float:
    """
    Computes Intersection over Union (IoU) between two bounding boxes.
    Format: [x1, y1, x2, y2] in absolute pixel coordinates.
    """
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interWidth = max(0.0, xB - xA)
    interHeight = max(0.0, yB - yA)
    interArea = interWidth * interHeight

    boxAArea = max(0.0, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    boxBArea = max(0.0, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

    unionArea = boxAArea + boxBArea - interArea
    if unionArea <= 0:
        return 0.0
    return float(interArea / unionArea)


def draw_hud(
    frame: np.ndarray,
    frame_idx: int,
    total_frames: int,
    fps: float,
    latency_ms: float,
    tp_count: int,
    fp_count: int,
    fn_count: int,
    mean_iou: float,
    active_det_count: int
) -> None:
    """Renders a sleek, modern telemetry HUD bar at the top of the video frame."""
    h, w = frame.shape[:2]
    hud_h = 58
    
    # Semi-transparent overlay banner
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, hud_h), (15, 23, 42), -1)
    cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)
    cv2.line(frame, (0, hud_h), (w, hud_h), (51, 65, 85), 1)

    # Calculate metrics
    precision = (tp_count / (tp_count + fp_count)) * 100 if (tp_count + fp_count) > 0 else 100.0
    recall = (tp_count / (tp_count + fn_count)) * 100 if (tp_count + fn_count) > 0 else 100.0
    progress_pct = (frame_idx / total_frames * 100) if total_frames > 0 else 0.0

    # Fonts
    font = cv2.FONT_HERSHEY_SIMPLEX
    
    # Left column: Brand & Progress
    cv2.putText(frame, "VISIONFORGE  YOLO VERIFICATION", (16, 22), font, 0.52, (255, 255, 255), 1, cv2.LINE_AA)
    progress_str = f"Frame: {frame_idx}/{total_frames} ({progress_pct:.1f}%)"
    cv2.putText(frame, progress_str, (16, 44), font, 0.45, (148, 163, 184), 1, cv2.LINE_AA)

    # Center-left column: Inference Telemetry
    center_x1 = int(w * 0.32)
    cv2.putText(frame, f"INFERENCE SPEED", (center_x1, 22), font, 0.45, (148, 163, 184), 1, cv2.LINE_AA)
    fps_str = f"{latency_ms:.1f} ms  ({1000.0/max(1.0, latency_ms):.1f} FPS)"
    cv2.putText(frame, fps_str, (center_x1, 44), font, 0.52, (56, 189, 248), 1, cv2.LINE_AA)

    # Center-right column: Overlap Quality
    center_x2 = int(w * 0.56)
    cv2.putText(frame, f"OVERLAP QUALITY", (center_x2, 22), font, 0.45, (148, 163, 184), 1, cv2.LINE_AA)
    iou_str = f"Mean IoU: {mean_iou*100:.1f}%  |  Active: {active_det_count}"
    cv2.putText(frame, iou_str, (center_x2, 44), font, 0.52, (52, 211, 153), 1, cv2.LINE_AA)

    # Right column: Live Precision & Recall
    right_x = int(w * 0.78)
    cv2.putText(frame, "CUMULATIVE BENCHMARK", (right_x, 22), font, 0.45, (148, 163, 184), 1, cv2.LINE_AA)
    metrics_str = f"P: {precision:.1f}%  |  R: {recall:.1f}%  |  TP: {tp_count}"
    cv2.putText(frame, metrics_str, (right_x, 44), font, 0.52, (250, 204, 21), 1, cv2.LINE_AA)


def draw_dual_hud(
    frame: np.ndarray,
    frame_idx: int,
    total_frames: int,
    old_name: str,
    new_name: str,
    old_count: int,
    new_count: int,
    old_avg_conf: float,
    new_avg_conf: float,
    mean_agreement_iou: float,
    speed_fps: float
) -> None:
    """Renders side-by-side comparative telemetry HUD across the dual-pane video frame."""
    h, w = frame.shape[:2]
    hud_h = 62
    half_w = w // 2

    # Semi-transparent overlay banner across top
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, hud_h), (15, 23, 42), -1)
    cv2.addWeighted(overlay, 0.88, frame, 0.12, 0, frame)
    cv2.line(frame, (0, hud_h), (w, hud_h), (51, 65, 85), 1)

    # Font
    font = cv2.FONT_HERSHEY_SIMPLEX
    progress_pct = (frame_idx / total_frames * 100) if total_frames > 0 else 0.0

    # ----- LEFT PANE (PREVIOUS MODEL) -----
    cv2.putText(frame, f"PREVIOUS: {old_name.upper()}", (16, 24), font, 0.52, (245, 158, 11), 1, cv2.LINE_AA)
    old_stat = f"Active: {old_count}  |  Avg Conf: {old_avg_conf*100:.1f}%"
    cv2.putText(frame, old_stat, (16, 48), font, 0.45, (203, 213, 225), 1, cv2.LINE_AA)

    # ----- CENTER TELEMETRY & PROGRESS -----
    center_x = half_w - 140
    cv2.putText(frame, f"PROGRESS: {frame_idx}/{total_frames} ({progress_pct:.1f}%)", (center_x, 24), font, 0.48, (255, 255, 255), 1, cv2.LINE_AA)
    center_stat = f"Agreement: {mean_agreement_iou*100:.1f}%  |  {speed_fps:.1f} FPS"
    cv2.putText(frame, center_stat, (center_x, 48), font, 0.45, (52, 211, 153), 1, cv2.LINE_AA)

    # ----- RIGHT PANE (NEW MODEL / BEST.PT) -----
    right_x = half_w + 16
    cv2.putText(frame, f"NEW MODEL (BEST.PT): {new_name.upper()}", (right_x, 24), font, 0.52, (56, 189, 248), 1, cv2.LINE_AA)
    new_stat = f"Active: {new_count}  |  Avg Conf: {new_avg_conf*100:.1f}%"
    cv2.putText(frame, new_stat, (right_x, 48), font, 0.45, (203, 213, 225), 1, cv2.LINE_AA)


def compare_models_video(
    model_new_path: str,
    model_old_path: str,
    video_path: str,
    output_path: str = "SVG_Model_Comparison_SideBySide.mp4",
    conf_thresh: float = 0.25,
    iou_thresh: float = 0.50,
    img_size: int = 640,
    max_frames: Optional[int] = None,
    render_mode: str = "side_by_side",
    device: str = "auto",
    show_window: bool = False,
) -> Dict[str, Any]:
    """
    Executes full comparative verification of two YOLO models (e.g. Previous best vs New best)
    on a video stream, producing a synchronized side-by-side or overlay video and analytical report.
    """
    if not ULTRALYTICS_OK:
        raise ImportError("ultralytics and torch are required. Run: pip install ultralytics torch")

    if not os.path.exists(model_new_path):
        raise FileNotFoundError(f"New model file not found: {model_new_path}")

    # Old model can be local file or standard ultralytics model name (e.g. yolov8s.pt)
    print("=" * 75)
    print("      VISIONFORGE YOLO MODEL-VS-MODEL VIDEO COMPARISON ENGINE")
    print("=" * 75)
    print(f"Previous Model (Base/Old): {model_old_path}")
    print(f"New Model (Trained/Best):  {model_new_path}")
    print(f"Video Source:              {video_path}")
    print(f"Confidence Threshold:      {conf_thresh:.2f}")
    print(f"Render Mode:               {render_mode.upper()}")

    print("Loading models into memory...")
    dev_str = 0 if (torch.cuda.is_available() and device != "cpu") else "cpu"
    model_old = YOLO(model_old_path)
    model_new = YOLO(model_new_path)
    print(f"[OK] Models loaded successfully. Inference device: {dev_str}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video file: {video_path}")

    total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 20.0
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frames_to_process = min(total_video_frames, max_frames) if max_frames else total_video_frames

    # Standardize dimensions for smooth playback and fast encoding
    target_pane_w = frame_w
    target_pane_h = frame_h
    if render_mode == "side_by_side":
        max_total_w = 1920
        if (frame_w * 2) > max_total_w:
            scale = (max_total_w / 2.0) / frame_w
            target_pane_w = int(frame_w * scale)
            target_pane_h = int(frame_h * scale)
        out_w = target_pane_w * 2
        out_h = target_pane_h
    else:
        max_single_w = 1920
        if frame_w > max_single_w:
            scale = max_single_w / frame_w
            target_pane_w = int(frame_w * scale)
            target_pane_h = int(frame_h * scale)
        out_w = target_pane_w
        out_h = target_pane_h

    print(f"Input: {frame_w}x{frame_h} @ {video_fps:.1f} FPS | Output: {out_w}x{out_h} | Frames: {frames_to_process}")

    out_dir = os.path.dirname(os.path.abspath(output_path))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(output_path, fourcc, video_fps, (out_w, out_h))

    # Analytical accumulators
    old_total_dets = 0
    new_total_dets = 0
    old_conf_sum = 0.0
    new_conf_sum = 0.0
    mutual_agreements = 0
    new_unique_dets = 0
    agreement_ious = []
    latencies_old = []
    latencies_new = []

    old_name = Path(model_old_path).stem
    new_name = Path(model_new_path).stem

    frame_idx = 0
    start_time = time.time()
    print("\nProcessing frames and generating synchronized comparison video...")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if max_frames and frame_idx > max_frames:
            break

        # 1. Run Old Model Inference
        t0 = time.time()
        res_old = model_old.predict(source=frame, imgsz=img_size, conf=conf_thresh, device=dev_str, verbose=False)
        lat_old = (time.time() - t0) * 1000.0
        latencies_old.append(lat_old)

        # 2. Run New Model Inference
        t1 = time.time()
        res_new = model_new.predict(source=frame, imgsz=img_size, conf=conf_thresh, device=dev_str, verbose=False)
        lat_new = (time.time() - t1) * 1000.0
        latencies_new.append(lat_new)

        # Parse detections
        old_boxes = []
        if res_old and len(res_old) > 0 and res_old[0].boxes is not None:
            for b in res_old[0].boxes.data.cpu().numpy():
                old_boxes.append({
                    "box": [float(b[0]), float(b[1]), float(b[2]), float(b[3])],
                    "conf": float(b[4]),
                    "cls": int(b[5]),
                })
        old_total_dets += len(old_boxes)
        old_conf_sum += sum(b["conf"] for b in old_boxes)

        new_boxes = []
        if res_new and len(res_new) > 0 and res_new[0].boxes is not None:
            for b in res_new[0].boxes.data.cpu().numpy():
                new_boxes.append({
                    "box": [float(b[0]), float(b[1]), float(b[2]), float(b[3])],
                    "conf": float(b[4]),
                    "cls": int(b[5]),
                    "matched": False,
                    "iou": 0.0
                })
        new_total_dets += len(new_boxes)
        new_conf_sum += sum(b["conf"] for b in new_boxes)

        # Calculate mutual IoU agreement
        frame_agreements = 0
        for nb in new_boxes:
            best_iou = 0.0
            for ob in old_boxes:
                val = calculate_iou(nb["box"], ob["box"])
                if val > best_iou:
                    best_iou = val
            nb["iou"] = best_iou
            if best_iou >= iou_thresh:
                nb["matched"] = True
                frame_agreements += 1
                agreement_ious.append(best_iou)
            else:
                new_unique_dets += 1

        mutual_agreements += frame_agreements

        # Frame averages for HUD
        old_frame_avg_conf = (sum(b["conf"] for b in old_boxes) / len(old_boxes)) if old_boxes else 0.0
        new_frame_avg_conf = (sum(b["conf"] for b in new_boxes) / len(new_boxes)) if new_boxes else 0.0
        frame_agreement_pct = (frame_agreements / max(1, len(new_boxes)))

        # ----------------- RENDERING -----------------
        if render_mode == "side_by_side":
            # Left pane: Old Model
            frame_left = frame.copy()
            for ob in old_boxes:
                ox1, oy1, ox2, oy2 = map(int, ob["box"])
                # Orange bounding box for old model
                cv2.rectangle(frame_left, (ox1, oy1), (ox2, oy2), (245, 158, 11), 2)
                lbl = f"OLD {int(ob['conf']*100)}%"
                (tw, th), _ = cv2.getTextSize(lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
                cv2.rectangle(frame_left, (ox1, oy1 - th - 6), (ox1 + tw + 6, oy1), (245, 158, 11), -1)
                cv2.putText(frame_left, lbl, (ox1 + 3, oy1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (15, 23, 42), 1, cv2.LINE_AA)

            # Sub-banner at top of left pane
            cv2.rectangle(frame_left, (0, 0), (frame_w, 28), (15, 23, 42), -1)
            cv2.putText(frame_left, f"PREVIOUS MODEL: {old_name}", (14, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (245, 158, 11), 1, cv2.LINE_AA)

            # Right pane: New Model (best.pt)
            frame_right = frame.copy()
            for nb in new_boxes:
                nx1, ny1, nx2, ny2 = map(int, nb["box"])
                # Cyan bounding box for new model
                is_unique = not nb["matched"]
                box_col = (52, 211, 153) if is_unique else (56, 189, 248) # Green if newly discovered, Cyan if confirmed
                cv2.rectangle(frame_right, (nx1, ny1), (nx2, ny2), box_col, 2)
                
                badge_lbl = f"NEW {int(nb['conf']*100)}%" if not is_unique else f"NEW+ {int(nb['conf']*100)}%"
                (tw, th), _ = cv2.getTextSize(badge_lbl, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
                cv2.rectangle(frame_right, (nx1, ny1 - th - 6), (nx1 + tw + 6, ny1), box_col, -1)
                cv2.putText(frame_right, badge_lbl, (nx1 + 3, ny1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (15, 23, 42), 1, cv2.LINE_AA)

            # Sub-banner at top of right pane
            cv2.rectangle(frame_right, (0, 0), (frame_w, 28), (15, 23, 42), -1)
            cv2.putText(frame_right, f"NEW MODEL (BEST.PT): {new_name}", (14, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (56, 189, 248), 1, cv2.LINE_AA)

            # Combine horizontally
            if (target_pane_w, target_pane_h) != (frame_w, frame_h):
                frame_left = cv2.resize(frame_left, (target_pane_w, target_pane_h), interpolation=cv2.INTER_AREA)
                frame_right = cv2.resize(frame_right, (target_pane_w, target_pane_h), interpolation=cv2.INTER_AREA)

            combined = np.hstack([frame_left, frame_right])

            # Draw vertical center line
            cv2.line(combined, (target_pane_w, 0), (target_pane_w, target_pane_h), (51, 65, 85), 2)
            cv2.rectangle(combined, (target_pane_w - 24, target_pane_h // 2 - 14), (target_pane_w + 24, target_pane_h // 2 + 14), (15, 23, 42), -1)
            cv2.putText(combined, "VS", (target_pane_w - 12, target_pane_h // 2 + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

            # Draw Master Dual Telemetry HUD
            instant_fps = 1000.0 / max(1.0, lat_old + lat_new)
            draw_dual_hud(
                frame=combined,
                frame_idx=frame_idx,
                total_frames=frames_to_process,
                old_name=old_name,
                new_name=new_name,
                old_count=len(old_boxes),
                new_count=len(new_boxes),
                old_avg_conf=old_frame_avg_conf,
                new_avg_conf=new_frame_avg_conf,
                mean_agreement_iou=float(np.mean(agreement_ious)) if agreement_ious else 0.0,
                speed_fps=instant_fps
            )
            out_frame = combined
        else:
            # Overlay Mode
            out_frame = frame.copy()
            for ob in old_boxes:
                ox1, oy1, ox2, oy2 = map(int, ob["box"])
                cv2.rectangle(out_frame, (ox1, oy1), (ox2, oy2), (245, 158, 11), 1)
                cv2.putText(out_frame, f"OLD {int(ob['conf']*100)}%", (ox1, oy1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (245, 158, 11), 1, cv2.LINE_AA)
            for nb in new_boxes:
                nx1, ny1, nx2, ny2 = map(int, nb["box"])
                cv2.rectangle(out_frame, (nx1, ny1), (nx2, ny2), (56, 189, 248), 2)
                cv2.putText(out_frame, f"NEW {int(nb['conf']*100)}%", (nx1, ny2 + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (56, 189, 248), 1, cv2.LINE_AA)

            if (target_pane_w, target_pane_h) != (frame_w, frame_h):
                out_frame = cv2.resize(out_frame, (target_pane_w, target_pane_h), interpolation=cv2.INTER_AREA)

            draw_hud(
                frame=out_frame,
                frame_idx=frame_idx,
                total_frames=frames_to_process,
                fps=video_fps,
                latency_ms=lat_new,
                tp_count=mutual_agreements,
                fp_count=new_unique_dets,
                fn_count=max(0, old_total_dets - mutual_agreements),
                mean_iou=float(np.mean(agreement_ious)) if agreement_ious else 0.0,
                active_det_count=len(new_boxes)
            )

        writer.write(out_frame)

        if show_window:
            cv2.imshow("VisionForge YOLO Comparison Stream", out_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("\nComparison stopped by user.")
                break

        if frame_idx % 40 == 0 or frame_idx == frames_to_process:
            pct = (frame_idx / frames_to_process) * 100
            print(f"Frame {frame_idx:4d}/{frames_to_process} ({pct:5.1f}%) | Old Dets: {len(old_boxes)} | New Dets: {len(new_boxes)} | Agreements: {frame_agreements}")

    cap.release()
    writer.release()
    if show_window:
        cv2.destroyAllWindows()

    total_time = time.time() - start_time
    avg_old_conf = (old_conf_sum / max(1, old_total_dets))
    avg_new_conf = (new_conf_sum / max(1, new_total_dets))
    mean_agreement = float(np.mean(agreement_ious)) if agreement_ious else 0.0

    report = {
        "comparison_mode": render_mode,
        "previous_model": {
            "model_path": model_old_path,
            "name": old_name,
            "total_detections": old_total_dets,
            "avg_confidence": round(avg_old_conf, 4),
            "mean_latency_ms": round(float(np.mean(latencies_old)), 2) if latencies_old else 0.0
        },
        "new_model": {
            "model_path": model_new_path,
            "name": new_name,
            "total_detections": new_total_dets,
            "avg_confidence": round(avg_new_conf, 4),
            "mean_latency_ms": round(float(np.mean(latencies_new)), 2) if latencies_new else 0.0
        },
        "comparison_metrics": {
            "total_frames_evaluated": frame_idx,
            "total_processing_time_sec": round(total_time, 2),
            "mutual_agreements": mutual_agreements,
            "new_unique_detections": new_unique_dets,
            "agreement_rate": round(mutual_agreements / max(1, new_total_dets), 4),
            "mean_agreement_iou": round(mean_agreement, 4),
            "confidence_gain_pct": round((avg_new_conf - avg_old_conf) * 100, 2)
        },
        "output_video": output_path
    }

    json_path = os.path.splitext(output_path)[0] + "_report.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 75)
    print("                    MODEL COMPARISON BENCHMARK SUMMARY")
    print("=" * 75)
    print(f"Total Frames Evaluated:       {frame_idx}")
    print(f"Previous Model Detections:   {old_total_dets} (Avg Conf: {avg_old_conf*100:.1f}%)")
    print(f"New Model (best.pt) Dets:    {new_total_dets} (Avg Conf: {avg_new_conf*100:.1f}%)")
    print(f"Mutual Agreement Detections: {mutual_agreements} (Mean Overlap IoU: {mean_agreement*100:.1f}%)")
    print(f"New Unique Detections:       {new_unique_dets}")
    print(f"Confidence Delta:            {'+' if report['comparison_metrics']['confidence_gain_pct'] >= 0 else ''}{report['comparison_metrics']['confidence_gain_pct']:.2f}%")
    print(f"Annotated Comparison Video:  {output_path}")
    print(f"JSON Benchmark Report:       {json_path}")
    print("=" * 75 + "\n")

    return report


def verify_video(
    model_path: str,
    video_path: str,
    output_path: str = "verified_annotated_video.mp4",
    ground_truth_map: Optional[Dict[int, List[List[float]]]] = None,
    conf_thresh: float = 0.30,
    iou_thresh: float = 0.50,
    img_size: int = 640,
    device: str = "auto",
    max_frames: Optional[int] = None,
    show_window: bool = False,
) -> Dict[str, Any]:
    """
    Executes full verification of a trained YOLO model against a video.
    """
    if not ULTRALYTICS_OK:
        raise ImportError("ultralytics and torch are required. Run: pip install ultralytics torch")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    print("=" * 70)
    print("      VISIONFORGE YOLO VIDEO VERIFICATION & COMPARISON ENGINE")
    print("=" * 70)
    print(f"Model: {model_path}")
    print(f"Video: {video_path}")
    print(f"Confidence Threshold: {conf_thresh:.2f} | IoU Match Threshold: {iou_thresh:.2f}")

    # Load Model
    print("Loading YOLO model weights...")
    model = YOLO(model_path)
    
    # Inspect video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video source: {video_path}")

    total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 20.0
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    frames_to_process = min(total_video_frames, max_frames) if max_frames else total_video_frames
    print(f"Video Resolution: {frame_w}x{frame_h} @ {video_fps:.2f} FPS | Total Frames: {frames_to_process}")

    # Prepare Video Writer
    # Use avc1 / mp4v codec for universal playback
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out_dir = os.path.dirname(os.path.abspath(output_path))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    writer = cv2.VideoWriter(output_path, fourcc, video_fps, (frame_w, frame_h))

    # Benchmark counters
    total_tp = 0
    total_fp = 0
    total_fn = 0
    iou_scores = []
    latencies = []

    frame_idx = 0
    start_time = time.time()

    print("\nRunning inference & side-by-side verification...")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if max_frames and frame_idx > max_frames:
            break

        t0 = time.time()
        # Run YOLO inference on frame
        res = model.predict(
            source=frame,
            imgsz=img_size,
            conf=conf_thresh,
            device=0 if (torch.cuda.is_available() and device != "cpu") else "cpu",
            verbose=False
        )
        latency_ms = (time.time() - t0) * 1000.0
        latencies.append(latency_ms)

        # Extract predictions
        pred_boxes = []
        if res and len(res) > 0 and res[0].boxes is not None:
            boxes_data = res[0].boxes.data.cpu().numpy()
            for b in boxes_data:
                # b: [x1, y1, x2, y2, conf, cls]
                pred_boxes.append({
                    "box": [float(b[0]), float(b[1]), float(b[2]), float(b[3])],
                    "conf": float(b[4]),
                    "cls": int(b[5]),
                    "matched": False
                })

        # Get Ground Truth boxes for this frame if available
        gt_boxes = ground_truth_map.get(frame_idx, []) if ground_truth_map else []
        gt_matched = [False] * len(gt_boxes)

        # Match Predictions against Ground Truth
        frame_ious = []
        for p in pred_boxes:
            best_iou = 0.0
            best_gt_idx = -1
            for g_i, gt in enumerate(gt_boxes):
                if gt_matched[g_i]:
                    continue
                # Ground truth in [x1, y1, x2, y2]
                iou_val = calculate_iou(p["box"], gt)
                if iou_val > best_iou:
                    best_iou = iou_val
                    best_gt_idx = g_i

            if best_iou >= iou_thresh and best_gt_idx != -1:
                p["matched"] = True
                p["iou"] = best_iou
                gt_matched[best_gt_idx] = True
                total_tp += 1
                iou_scores.append(best_iou)
                frame_ious.append(best_iou)
            else:
                p["matched"] = False
                p["iou"] = best_iou
                if ground_truth_map and len(gt_boxes) > 0:
                    total_fp += 1

        # Unmatched Ground Truth boxes are False Negatives
        if ground_truth_map and len(gt_boxes) > 0:
            for g_i, matched in enumerate(gt_matched):
                if not matched:
                    total_fn += 1

        # ----------------- DRAW VISUALIZATIONS -----------------
        # 1. Draw Ground Truth boxes (GREEN)
        for gt in gt_boxes:
            gx1, gy1, gx2, gy2 = map(int, gt)
            cv2.rectangle(frame, (gx1, gy1), (gx2, gy2), (16, 185, 129), 2)
            cv2.putText(
                frame,
                "GROUND TRUTH",
                (gx1, max(18, gy1 - 6)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (16, 185, 129),
                1,
                cv2.LINE_AA
            )

        # 2. Draw YOLO Predictions (CYAN / BLUE for TP, ORANGE for unconfirmed)
        for p in pred_boxes:
            px1, py1, px2, py2 = map(int, p["box"])
            is_match = p.get("matched", False)
            box_color = (245, 158, 11) if not is_match and ground_truth_map else (56, 189, 248)
            cv2.rectangle(frame, (px1, py1), (px2, py2), box_color, 2)

            # Label badge
            conf_pct = int(p["conf"] * 100)
            if "iou" in p and p["iou"] > 0:
                label_txt = f"YOLO {conf_pct}% (IoU: {p['iou']*100:.1f}%)"
            else:
                label_txt = f"YOLO {conf_pct}%"

            # Label background box
            (txt_w, txt_h), _ = cv2.getTextSize(label_txt, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
            cv2.rectangle(frame, (px1, py2 + 4), (px1 + txt_w + 8, py2 + 4 + txt_h + 8), box_color, -1)
            cv2.putText(
                frame,
                label_txt,
                (px1 + 4, py2 + txt_h + 8),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.48,
                (15, 23, 42),
                1,
                cv2.LINE_AA
            )

        # 3. Draw Telemetry HUD
        mean_iou_curr = float(np.mean(iou_scores)) if iou_scores else 0.0
        draw_hud(
            frame=frame,
            frame_idx=frame_idx,
            total_frames=frames_to_process,
            fps=video_fps,
            latency_ms=latency_ms,
            tp_count=total_tp,
            fp_count=total_fp,
            fn_count=total_fn,
            mean_iou=mean_iou_curr,
            active_det_count=len(pred_boxes)
        )

        writer.write(frame)

        if show_window:
            cv2.imshow("VisionForge YOLO Verification Stream", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("\nVerification aborted by user.")
                break

        if frame_idx % 50 == 0 or frame_idx == frames_to_process:
            pct = (frame_idx / frames_to_process) * 100
            print(f"Processed {frame_idx:4d}/{frames_to_process} frames ({pct:5.1f}%) | Avg Latency: {np.mean(latencies):.1f} ms | TP: {total_tp} | Mean IoU: {mean_iou_curr*100:.1f}%")

    cap.release()
    writer.release()
    if show_window:
        cv2.destroyAllWindows()

    total_time = time.time() - start_time
    mean_latency = float(np.mean(latencies)) if latencies else 0.0
    overall_mean_iou = float(np.mean(iou_scores)) if iou_scores else 0.0

    precision = (total_tp / (total_tp + total_fp)) if (total_tp + total_fp) > 0 else 1.0
    recall = (total_tp / (total_tp + total_fn)) if (total_tp + total_fn) > 0 else 1.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    summary = {
        "model_path": model_path,
        "video_path": video_path,
        "output_video_path": output_path,
        "total_frames_processed": frame_idx,
        "total_time_seconds": round(total_time, 2),
        "mean_latency_ms": round(mean_latency, 2),
        "throughput_fps": round(1000.0 / max(1.0, mean_latency), 1),
        "true_positives": total_tp,
        "false_positives": total_fp,
        "false_negatives": total_fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "mean_iou": round(overall_mean_iou, 4),
    }

    # Save summary json
    json_path = os.path.splitext(output_path)[0] + "_report.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 70)
    print("                    FINAL VERIFICATION SUMMARY")
    print("=" * 70)
    print(f"Total Frames Processed:    {frame_idx}")
    print(f"Inference Latency:         {mean_latency:.2f} ms ({1000.0/max(1.0, mean_latency):.1f} FPS)")
    print(f"True Positive Detections:  {total_tp}")
    if ground_truth_map:
        print(f"False Positives:           {total_fp}")
        print(f"False Negatives (Missed):  {total_fn}")
        print(f"Verification Precision:    {precision*100:.2f}%")
        print(f"Verification Recall:       {recall*100:.2f}%")
        print(f"F1-Score:                  {f1:.4f}")
    print(f"Mean IoU Overlap:          {overall_mean_iou*100:.2f}%")
    print(f"Annotated Video Output:    {output_path}")
    print(f"Metrics Report:            {json_path}")
    print("=" * 70 + "\n")

    return summary


def parse_ground_truth_from_db(db_path: str, project_id: str, frame_w: int, frame_h: int) -> Dict[int, List[List[float]]]:
    """Extracts ground truth bounding boxes from VisionForge SQLite database mapped to video frame indices."""
    import sqlite3
    if not os.path.exists(db_path):
        return {}

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("""
        SELECT f.frame_index, a.coordinates 
        FROM annotations a 
        JOIN frames f ON a.frame_id = f.id 
        WHERE a.project_id = ? AND a.annotation_type = 'bbox'
    """, (project_id,))

    gt_map = {}
    for f_idx, coords_str in c.fetchall():
        coords = json.loads(coords_str)
        # coords is [x, y, w, h] normalized
        x1 = coords[0] * frame_w
        y1 = coords[1] * frame_h
        x2 = (coords[0] + coords[2]) * frame_w
        y2 = (coords[1] + coords[3]) * frame_h
        
        # In VisionForge, frame_index is 0-indexed in video
        # We store both 0-indexed and 1-indexed to be safe
        gt_map.setdefault(f_idx, []).append([x1, y1, x2, y2])
        gt_map.setdefault(f_idx + 1, []).append([x1, y1, x2, y2])

    conn.close()
    return gt_map


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VisionForge YOLO Video Verification & Comparison Engine")
    parser.add_argument("--model", type=str, default="best.pt", help="Path to trained YOLO weights (.pt) [New Model]")
    parser.add_argument("--previous-model", "--compare-model", dest="previous_model", type=str, default=None,
                        help="Optional previous model weights (.pt) to run side-by-side comparative benchmark")
    parser.add_argument("--source", type=str, required=True, help="Path to input video (.mp4) or image directory")
    parser.add_argument("--output", type=str, default=None, help="Output annotated video path")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold (default: 0.25)")
    parser.add_argument("--iou", type=float, default=0.50, help="IoU match threshold (default: 0.50)")
    parser.add_argument("--render-mode", type=str, default="side_by_side", choices=["side_by_side", "overlay"],
                        help="Comparison render mode (side_by_side or overlay)")
    parser.add_argument("--max-frames", type=int, default=None, help="Maximum number of frames to process")
    parser.add_argument("--db", type=str, default=None, help="Optional VisionForge SQLite DB path to compare Ground Truth")
    parser.add_argument("--project-id", type=str, default="34ab26f3-2778-4618-a7d4-cfae4bf561da", help="VisionForge Project ID")
    parser.add_argument("--show", action="store_true", help="Show live visualization window")

    args = parser.parse_args()

    if args.previous_model:
        # Run Dual Model Comparison
        out_path = args.output or "SVG_Model_Comparison_SideBySide.mp4"
        compare_models_video(
            model_new_path=args.model,
            model_old_path=args.previous_model,
            video_path=args.source,
            output_path=out_path,
            conf_thresh=args.conf,
            iou_thresh=args.iou,
            max_frames=args.max_frames,
            render_mode=args.render_mode,
            show_window=args.show
        )
    else:
        # Run Single Model Verification with HUD & Ground Truth
        out_path = args.output or "SVG_YOLO_Full_Verification.mp4"
        gt_dict = None
        if args.db and os.path.exists(args.db):
            c_temp = cv2.VideoCapture(args.source)
            if c_temp.isOpened():
                vw = int(c_temp.get(cv2.CAP_PROP_FRAME_WIDTH))
                vh = int(c_temp.get(cv2.CAP_PROP_FRAME_HEIGHT))
                c_temp.release()
                print(f"Loading Ground Truth annotations from VisionForge database ({args.db})...")
                gt_dict = parse_ground_truth_from_db(args.db, args.project_id, vw, vh)
                print(f"Loaded {len(gt_dict)} ground truth frame annotations.")

        verify_video(
            model_path=args.model,
            video_path=args.source,
            output_path=out_path,
            ground_truth_map=gt_dict,
            conf_thresh=args.conf,
            iou_thresh=args.iou,
            max_frames=args.max_frames,
            show_window=args.show,
        )
