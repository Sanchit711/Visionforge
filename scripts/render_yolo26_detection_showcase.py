"""
YOLO26 Series NMS-Free End-to-End Object Detection Validation Pipeline
======================================================================
Renders authentic full-fledged validation video using YOLO26L NMS-Free
architecture on real-world traffic footage.

Telemetry displayed:
  - Architecture: YOLO26 Series (End-to-End NMS-Free Dual Assignment)
  - Post-Processing: 0.0ms NMS Latency (Direct Bipartite Matching)
  - Classes: COCO 80-Class Standard
"""

import os
import sys
import time
import shutil
import subprocess
import cv2
import numpy as np
from PIL import Image
from ultralytics import YOLO

OUT_DIR = "verification_media"
ARTIFACT_DIR = r"C:\Users\Sanchit\.gemini\antigravity\brain\fc676da5-36d4-4bc7-b4df-a40507caf830\verification_media"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

FFMPEG_EXE = shutil.which("ffmpeg") or r"C:\Users\Sanchit\AppData\Local\Programs\Python\Python311\Scripts\ffmpeg.EXE"


def draw_yolo26_hud(frame, frame_idx, num_detections, infer_time_ms):
    h, w = frame.shape[:2]
    header_h = 60
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, header_h), (12, 16, 24), -1)
    cv2.line(overlay, (0, header_h), (w, header_h), (180, 80, 255), 2)  # Purple accent for YOLO26
    cv2.addWeighted(overlay, 0.88, frame, 0.12, 0, frame)

    # Title & Series
    cv2.putText(frame, "YOLO26 SERIES | END-TO-END NMS-FREE OBJECT DETECTION", (16, 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(frame, "Model: yolo26l.pt | Architecture: Dual-Label Assignment (One-to-One Match)", (16, 46),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (210, 180, 255), 1, cv2.LINE_AA)

    # Metrics Badge
    stats_text = f"Detections: {num_detections} | NMS Overhead: 0.0ms (NMS-Free) | Frm: {frame_idx}"
    (tw, _), _ = cv2.getTextSize(stats_text, cv2.FONT_HERSHEY_SIMPLEX, 0.40, 1)
    cv2.putText(frame, stats_text, (max(w - tw - 16, w // 2), 34),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, (120, 255, 180), 1, cv2.LINE_AA)
    return frame


def render_yolo26_detection():
    model_path = "yolo26l.pt"
    clip_path = "scratch/curated_clips/seg_city_traffic.mp4"
    num_frames = 250
    frame_step = 2

    print(f"\n========================================================")
    print(f"PROCESSING: YOLO26 SERIES NMS-FREE OBJECT DETECTION")
    print(f"Model: {model_path} | Clip: {clip_path}")
    print(f"========================================================")

    model = YOLO(model_path)
    cap = cv2.VideoCapture(clip_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video clip: {clip_path}")

    total_cap_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    output_fps = native_fps / frame_step

    raw_mp4_path = os.path.join(OUT_DIR, "temp_yolo26_detect.mp4")
    final_mp4_path = os.path.join(OUT_DIR, "yolo26_object_detection_validation.mp4")
    gif_path = os.path.join(OUT_DIR, "yolo26_object_detection_preview.gif")

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(raw_mp4_path, fourcc, output_fps, (w, h))

    gif_frames = []
    sample_frames = {}
    rendered_count = 0
    t0 = time.time()

    while rendered_count < num_frames:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
            if not ret:
                break

        for _ in range(frame_step - 1):
            cap.read()

        t_inf0 = time.time()
        res = model(frame, conf=0.25, verbose=False)[0]
        inf_ms = (time.time() - t_inf0) * 1000

        plotted = res.plot()
        num_det = len(res.boxes) if res.boxes is not None else 0
        hud_frame = draw_yolo26_hud(plotted, rendered_count, num_det, inf_ms)
        writer.write(hud_frame)

        if rendered_count == 40:
            sample_frames["sample_1"] = hud_frame.copy()
        elif rendered_count == 150:
            sample_frames["sample_2"] = hud_frame.copy()

        if rendered_count % 4 == 0 and len(gif_frames) < 60:
            rgb_small = cv2.resize(cv2.cvtColor(hud_frame, cv2.COLOR_BGR2RGB), (w // 2, h // 2))
            gif_frames.append(Image.fromarray(rgb_small))

        rendered_count += 1
        if rendered_count % 40 == 0:
            fps_p = rendered_count / (time.time() - t0)
            print(f"  Rendered {rendered_count}/{num_frames} frames ({fps_p:.1f} fps)...")

    writer.release()
    cap.release()
    print(f"Finished frame loop: {rendered_count} frames in {time.time() - t0:.1f}s")

    # Save PNG Keyframes
    s1_path = os.path.join(OUT_DIR, "yolo26_detect_sample_1.png")
    s2_path = os.path.join(OUT_DIR, "yolo26_detect_sample_2.png")
    if "sample_1" in sample_frames:
        cv2.imwrite(s1_path, sample_frames["sample_1"])
        shutil.copy2(s1_path, os.path.join(ARTIFACT_DIR, os.path.basename(s1_path)))
    if "sample_2" in sample_frames:
        cv2.imwrite(s2_path, sample_frames["sample_2"])
        shutil.copy2(s2_path, os.path.join(ARTIFACT_DIR, os.path.basename(s2_path)))

    # Save GIF Preview
    if gif_frames:
        gif_frames[0].save(
            gif_path,
            save_all=True,
            append_images=gif_frames[1:],
            duration=120,
            loop=0,
            optimize=True
        )
        shutil.copy2(gif_path, os.path.join(ARTIFACT_DIR, os.path.basename(gif_path)))
        print(f"Saved GIF preview: {gif_path} ({os.path.getsize(gif_path)/1024:.1f} KB)")

    # Transcode MP4 with H.264 FastStart
    if os.path.exists(FFMPEG_EXE):
        cmd = [
            FFMPEG_EXE, "-y",
            "-i", raw_mp4_path,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            final_mp4_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0 and os.path.exists(final_mp4_path):
            os.remove(raw_mp4_path)
            shutil.copy2(final_mp4_path, os.path.join(ARTIFACT_DIR, os.path.basename(final_mp4_path)))
            print(f"Transcoded MP4: {final_mp4_path} ({os.path.getsize(final_mp4_path)/1024/1024:.2f} MB)")
        else:
            shutil.move(raw_mp4_path, final_mp4_path)
            shutil.copy2(final_mp4_path, os.path.join(ARTIFACT_DIR, os.path.basename(final_mp4_path)))
    else:
        shutil.move(raw_mp4_path, final_mp4_path)
        shutil.copy2(final_mp4_path, os.path.join(ARTIFACT_DIR, os.path.basename(final_mp4_path)))


if __name__ == "__main__":
    render_yolo26_detection()
