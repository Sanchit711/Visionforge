import os
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from app.services.job_runner import job_runner

class VideoService:
    @staticmethod
    def inspect_video(file_path: str) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Video file not found: {file_path}")

        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            raise ValueError(f"OpenCV could not open video: {file_path}")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        if fps <= 0:
            fps = 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = round(total_frames / fps, 3) if fps > 0 else 0.0

        fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
        fourcc_str = "".join([chr((fourcc_int >> 8 * i) & 0xFF) for i in range(4)]).strip()
        if not fourcc_str:
            fourcc_str = "H264"

        cap.release()
        file_size = os.path.getsize(file_path)

        return {
            "width": width,
            "height": height,
            "fps": round(fps, 2),
            "total_frames": total_frames,
            "duration": duration,
            "codec": fourcc_str,
            "file_size": file_size,
        }

    @staticmethod
    def get_frame_at_timestamp(video_path: str, timestamp_sec: float) -> Optional[np.ndarray]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None

        cap.set(cv2.CAP_PROP_POS_MSEC, timestamp_sec * 1000.0)
        ret, frame = cap.read()
        cap.release()
        if ret:
            return frame
        return None

    @staticmethod
    def crop_and_trim_video(
        source_path: str,
        target_path: str,
        trim_start: float = 0.0,
        trim_end: Optional[float] = None,
        crop_box: Optional[Dict[str, Any]] = None,
        job_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        cap = cv2.VideoCapture(source_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open source video: {source_path}")

        src_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        src_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        src_duration = total_frames / fps if fps > 0 else 0.0

        if trim_end is None or trim_end <= 0 or trim_end > src_duration:
            trim_end = src_duration

        start_frame = max(0, int(trim_start * fps))
        end_frame = min(total_frames, int(trim_end * fps))
        frames_to_process = max(1, end_frame - start_frame)

        # Parse crop coordinates
        x1, y1, x2, y2 = 0, 0, src_width, src_height
        if crop_box and crop_box.get("w", 0) > 0 and crop_box.get("h", 0) > 0:
            is_norm = crop_box.get("normalized", True)
            bx = crop_box["x"]
            by = crop_box["y"]
            bw = crop_box["w"]
            bh = crop_box["h"]

            if is_norm:
                x1 = int(bx * src_width)
                y1 = int(by * src_height)
                x2 = int((bx + bw) * src_width)
                y2 = int((by + bh) * src_height)
            else:
                x1 = int(bx)
                y1 = int(by)
                x2 = int(bx + bw)
                y2 = int(by + bh)

            # Clamp coordinates
            x1 = max(0, min(src_width - 1, x1))
            y1 = max(0, min(src_height - 1, y1))
            x2 = max(x1 + 1, min(src_width, x2))
            y2 = max(y1 + 1, min(src_height, y2))

        crop_w = x2 - x1
        crop_h = y2 - y1

        # Use mp4v fourcc for broad compatibility
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        out = cv2.VideoWriter(target_path, fourcc, fps, (crop_w, crop_h))

        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        current_frame = start_frame
        written_frames = 0

        while current_frame < end_frame:
            if job_id and job_runner.is_cancelled(job_id):
                break

            ret, frame = cap.read()
            if not ret:
                break

            cropped = frame[y1:y2, x1:x2]
            out.write(cropped)
            written_frames += 1
            current_frame += 1

            if job_id and written_frames % 15 == 0:
                progress = round((written_frames / frames_to_process) * 100, 1)
                job_runner.update_progress(job_id, progress, f"Processing frame {written_frames}/{frames_to_process}")

        cap.release()
        out.release()

        return {
            "output_path": target_path,
            "processed_frames": written_frames,
            "output_width": crop_w,
            "output_height": crop_h,
            "fps": fps,
            "duration": round(written_frames / fps, 3) if fps > 0 else 0.0,
        }

    @staticmethod
    def generate_synthetic_video(
        output_path: str,
        num_frames: int = 150,
        fps: int = 30,
        width: int = 640,
        height: int = 480,
    ) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        # Objects with starting positions and velocities
        objects = [
            {"label": "person", "x": 50, "y": 200, "vx": 2, "vy": 0, "w": 40, "h": 90, "color": (59, 130, 246)},
            {"label": "car", "x": 400, "y": 280, "vx": -3, "vy": 0, "w": 120, "h": 60, "color": (16, 185, 129)},
            {"label": "forklift", "x": 200, "y": 320, "vx": 1, "vy": 1, "w": 70, "h": 70, "color": (245, 158, 11)},
        ]

        for f in range(num_frames):
            # Background gradient: dark asphalt / warehouse floor
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            frame[:] = (30, 35, 45)  # dark slate

            # Road / floor lanes
            cv2.line(frame, (0, 260), (width, 260), (70, 80, 95), 2)
            cv2.line(frame, (0, 360), (width, 360), (70, 80, 95), 2)
            # Dashed center line
            for dash_x in range(0, width, 40):
                cv2.line(frame, (dash_x, 310), (dash_x + 20, 310), (120, 130, 145), 2)

            # Move and draw objects
            for obj in objects:
                ox = int(obj["x"] + obj["vx"] * f) % (width + 50) - 40
                oy = int(obj["y"] + obj["vy"] * (f % 20 - 10))
                ow = obj["w"]
                oh = obj["h"]
                cv2.rectangle(frame, (ox, oy), (ox + ow, oy + oh), obj["color"], -1)
                cv2.rectangle(frame, (ox, oy), (ox + ow, oy + oh), (255, 255, 255), 2)
                cv2.putText(frame, obj["label"], (ox, max(15, oy - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

            # Frame timestamp watermark
            time_sec = f / fps
            time_str = f"Time: {time_sec:05.2f}s | Frame: {f:04d}/{num_frames} | VisionForge Studio"
            cv2.putText(frame, time_str, (16, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 255), 1)

            writer.write(frame)

        writer.release()
        return output_path

video_service = VideoService()
