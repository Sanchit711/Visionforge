"""
Master Official Ultralytics YOLO Validation Pipeline
===================================================
Renders authentic, systematic validation media using native Ultralytics YOLOv8 APIs
strictly adhering to official documentation (docs.ultralytics.com).

Tasks covered:
  1. Human Pose Estimation (COCO 17 Keypoints, yolov8s-pose.pt)
     Docs: https://docs.ultralytics.com/tasks/pose/
     Source: scratch/curated_clips/pose_gym_deadlift.mp4

  2. Instance Segmentation (COCO 80-Class Pixel Masks, yolov8s-seg.pt)
     Docs: https://docs.ultralytics.com/tasks/segment/
     Source: scratch/curated_clips/seg_city_traffic.mp4

  3. Oriented Bounding Boxes (DOTA 15-Class Rotated Boxes, yolov8s-obb.pt)
     Docs: https://docs.ultralytics.com/tasks/obb/
     Source: scratch/curated_clips/obb_drone_streets.mp4
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


def draw_official_hud(frame, task_title, doc_url, model_name, stats_text):
    """
    Renders an official Ultralytics scientific HUD header banner.
    Does NOT alter detections, bounding boxes, masks, or keypoints.
    """
    h, w = frame.shape[:2]
    header_h = 56
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, header_h), (18, 22, 28), -1)
    cv2.line(overlay, (0, header_h), (w, header_h), (0, 204, 255), 2)
    cv2.addWeighted(overlay, 0.90, frame, 0.10, 0, frame)

    # Title & Task
    cv2.putText(frame, f"ULTRALYTICS OFFICIAL | {task_title}", (16, 22),
                cv2.FONT_HERSHEY_SIMPLEX, 0.58, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(frame, f"Docs: {doc_url} | Model: {model_name}", (16, 44),
                cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 210, 225), 1, cv2.LINE_AA)

    # Dynamic metrics
    (tw, _), _ = cv2.getTextSize(stats_text, cv2.FONT_HERSHEY_SIMPLEX, 0.44, 1)
    cv2.putText(frame, stats_text, (max(w - tw - 16, w // 2), 34),
                cv2.FONT_HERSHEY_SIMPLEX, 0.44, (0, 255, 200), 1, cv2.LINE_AA)
    return frame


def render_task(task_key, model_path, clip_path, task_title, doc_url, num_frames=350, frame_step=2):
    print(f"\n========================================================")
    print(f"PROCESSING: {task_title}")
    print(f"Model: {model_path} | Clip: {clip_path}")
    print(f"========================================================")

    model = YOLO(model_path)
    cap = cv2.VideoCapture(clip_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video clip: {clip_path}")

    total_cap_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    native_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    output_fps = native_fps / frame_step

    print(f"Source video: {w}x{h} @ {native_fps:.1f} fps, {total_cap_frames} frames total.")
    print(f"Rendering {num_frames} frames with step {frame_step} -> effective duration: {num_frames / output_fps:.1f}s")

    raw_mp4_path = os.path.join(OUT_DIR, f"temp_{task_key}.mp4")
    final_mp4_name = f"official_yolo_{task_key}_validation.mp4"
    final_mp4_path = os.path.join(OUT_DIR, final_mp4_name)
    gif_name = f"official_yolo_{task_key}_preview.gif"
    gif_path = os.path.join(OUT_DIR, gif_name)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(raw_mp4_path, fourcc, output_fps, (w, h))

    gif_frames = []
    sample_frames = {}
    rendered_count = 0
    t0 = time.time()

    # Skip initial frames if needed to reach active scene
    start_offset = 20 if task_key == "pose" else 0
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_offset)

    while rendered_count < num_frames:
        curr_pos = int(cap.get(cv2.CAP_PROP_POS_FRAMES))
        ret, frame = cap.read()
        if not ret:
            # Loop clip if reached end
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
            if not ret:
                break

        # Frame step sampling
        for _ in range(frame_step - 1):
            cap.read()

        # Run native Ultralytics inference
        results = model(frame, verbose=False)
        res = results[0]

        # Use native Ultralytics plot()
        plotted = res.plot()

        # Formulate stats text
        if task_key == "pose":
            num_persons = len(res.boxes) if res.boxes is not None else 0
            stats = f"Active Skeletons: {num_persons} | COCO-17 Keypoints Tracked"
        elif task_key == "seg":
            num_masks = len(res.masks) if res.masks is not None else 0
            stats = f"Segmented Masks: {num_masks} instances | Pixel-Alpha Blend"
        elif task_key == "obb":
            num_obb = len(res.obb) if res.obb is not None else 0
            stats = f"Oriented Bounding Boxes: {num_obb} | DOTA xywhr"
        else:
            stats = "Standard YOLO Inference"

        hud_frame = draw_official_hud(plotted, task_title, doc_url, os.path.basename(model_path), stats)
        writer.write(hud_frame)

        # Capture sample images
        if rendered_count == 40:
            sample_frames["sample_1"] = hud_frame.copy()
        elif rendered_count == 180:
            sample_frames["sample_2"] = hud_frame.copy()

        # Collect GIF frames (sample every 4 rendered frames, capped at 60 frames)
        if rendered_count % 4 == 0 and len(gif_frames) < 60:
            rgb_small = cv2.resize(cv2.cvtColor(hud_frame, cv2.COLOR_BGR2RGB), (w // 2, h // 2))
            gif_frames.append(Image.fromarray(rgb_small))

        rendered_count += 1
        if rendered_count % 50 == 0:
            elapsed = time.time() - t0
            fps_proc = rendered_count / elapsed
            print(f"  Rendered {rendered_count}/{num_frames} frames ({fps_proc:.1f} fps)...")

    writer.release()
    cap.release()
    print(f"Finished frame loop for {task_key}: {rendered_count} frames in {time.time() - t0:.1f}s")

    # Save PNG keyframes
    s1_path = os.path.join(OUT_DIR, f"official_yolo_{task_key}_sample_1.png")
    s2_path = os.path.join(OUT_DIR, f"official_yolo_{task_key}_sample_2.png")
    if "sample_1" in sample_frames:
        cv2.imwrite(s1_path, sample_frames["sample_1"])
        shutil.copy2(s1_path, os.path.join(ARTIFACT_DIR, os.path.basename(s1_path)))
    if "sample_2" in sample_frames:
        cv2.imwrite(s2_path, sample_frames["sample_2"])
        shutil.copy2(s2_path, os.path.join(ARTIFACT_DIR, os.path.basename(s2_path)))

    # Save GIF preview
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

    # Transcode MP4 with H.264 + faststart via ffmpeg
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
            print("FFmpeg transcoding warning, keeping raw MP4.")
            shutil.move(raw_mp4_path, final_mp4_path)
            shutil.copy2(final_mp4_path, os.path.join(ARTIFACT_DIR, os.path.basename(final_mp4_path)))
    else:
        shutil.move(raw_mp4_path, final_mp4_path)
        shutil.copy2(final_mp4_path, os.path.join(ARTIFACT_DIR, os.path.basename(final_mp4_path)))


def main():
    start_total = time.time()

    # 1. Human Pose Estimation
    render_task(
        task_key="pose",
        model_path="yolov8s-pose.pt",
        clip_path="scratch/curated_clips/pose_gym_deadlift.mp4",
        task_title="POSE ESTIMATION (17 KEYPOINTS)",
        doc_url="docs.ultralytics.com/tasks/pose/",
        num_frames=300,
        frame_step=2
    )

    # 2. Instance Segmentation
    render_task(
        task_key="seg",
        model_path="yolov8s-seg.pt",
        clip_path="scratch/curated_clips/seg_city_traffic.mp4",
        task_title="INSTANCE SEGMENTATION (PIXEL MASKS)",
        doc_url="docs.ultralytics.com/tasks/segment/",
        num_frames=300,
        frame_step=2
    )

    # 3. Oriented Bounding Boxes (OBB)
    render_task(
        task_key="obb",
        model_path="yolov8s-obb.pt",
        clip_path="scratch/curated_clips/obb_drone_streets.mp4",
        task_title="ORIENTED BOUNDING BOXES (DOTA OBB)",
        doc_url="docs.ultralytics.com/tasks/obb/",
        num_frames=300,
        frame_step=2
    )

    print(f"\n========================================================")
    print(f"ALL 3 OFFICIAL ULTRALYTICS SHOWCASES COMPLETED!")
    print(f"Total time elapsed: {time.time() - start_total:.1f}s")
    print(f"Deliverables in: {OUT_DIR} and {ARTIFACT_DIR}")
    print(f"========================================================")


if __name__ == "__main__":
    main()
