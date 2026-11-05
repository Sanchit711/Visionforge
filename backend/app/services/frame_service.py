import os
import cv2
import json
import uuid
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.database import SessionLocal
from app.models import Frame, Video, Annotation
from app.services.job_runner import job_runner

class FrameService:
    @staticmethod
    def calculate_sharpness(img: np.ndarray) -> float:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        score = cv2.Laplacian(gray, cv2.CV_64F).var()
        return round(float(score), 2)

    @staticmethod
    def compute_dhash(img: np.ndarray, hash_size: int = 8) -> int:
        # Resize to (hash_size + 1, hash_size), grayscale
        resized = cv2.resize(img, (hash_size + 1, hash_size), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        diff = gray[:, 1:] > gray[:, :-1]
        return sum([2 ** i for (i, v) in enumerate(diff.flatten()) if v])

    @staticmethod
    def hamming_distance(h1: int, h2: int) -> int:
        return bin(h1 ^ h2).count("1")

    @classmethod
    def extract_frames(
        cls,
        video_path: str,
        project_id: str,
        video_id: str,
        mode: str = "interval_sec",
        interval_value: float = 1.0,
        min_sharpness: float = 10.0,
        deduplicate: bool = True,
        use_crop: bool = True,
        crop_box: Optional[Dict[str, Any]] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        custom_timestamps: Optional[List[float]] = None,
        clear_existing: bool = False,
        job_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Unable to open video: {video_path}")

        src_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        src_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0.0

        # Calculate time bounds (start_frame & end_frame)
        start_frame = 0
        if start_time is not None and start_time > 0:
            start_frame = max(0, min(total_frames - 1, int(start_time * fps)))

        end_frame = total_frames
        if end_time is not None and end_time > 0 and end_time < duration:
            end_frame = max(start_frame + 1, min(total_frames, int(end_time * fps)))

        # Calculate frame step for interval modes
        if mode in ("all_frames", "all"):
            step = 1
        elif mode == "interval_sec":
            step = max(1, int(interval_value * fps))
        elif mode == "fps":
            target_fps = max(0.1, interval_value)
            step = max(1, int(fps / target_fps))
        elif mode == "interval_frame":
            step = max(1, int(interval_value))
        else:
            step = max(1, int(fps))  # default 1 frame per second

        # Calculate crop coordinates
        x1, y1, x2, y2 = 0, 0, src_width, src_height
        if use_crop and crop_box and crop_box.get("w", 0) > 0 and crop_box.get("h", 0) > 0:
            is_norm = crop_box.get("normalized", True)
            bx, by, bw, bh = crop_box["x"], crop_box["y"], crop_box["w"], crop_box["h"]
            if is_norm:
                x1 = int(bx * src_width)
                y1 = int(by * src_height)
                x2 = int((bx + bw) * src_width)
                y2 = int((by + bh) * src_height)
            else:
                x1, y1 = int(bx), int(by)
                x2, y2 = int(bx + bw), int(by + bh)

            x1 = max(0, min(src_width - 1, x1))
            y1 = max(0, min(src_height - 1, y1))
            x2 = max(x1 + 1, min(src_width, x2))
            y2 = max(y1 + 1, min(src_height, y2))

        # Frame destination dir
        out_dir = settings.FRAMES_DIR / project_id
        thumbs_dir = out_dir / "thumbs"
        out_dir.mkdir(parents=True, exist_ok=True)
        thumbs_dir.mkdir(parents=True, exist_ok=True)

        db = SessionLocal()
        extracted_records = []
        prev_hash = None
        extracted_count = 0
        seen_timestamps = set()

        try:
            if clear_existing:
                # Remove previous frames for this video to ensure clean sequence
                existing_frames = db.query(Frame).filter(Frame.video_id == video_id).all()
                for ef in existing_frames:
                    db.query(Annotation).filter(Annotation.frame_id == ef.id).delete()
                    if os.path.exists(ef.file_path):
                        try:
                            os.remove(ef.file_path)
                        except Exception:
                            pass
                    if ef.thumbnail_path and os.path.exists(ef.thumbnail_path):
                        try:
                            os.remove(ef.thumbnail_path)
                        except Exception:
                            pass
                    db.delete(ef)
                db.commit()
            # Mode A: Custom Timestamps list
            if mode == "custom_timestamps" and custom_timestamps:
                valid_ts = sorted(list(set([t for t in custom_timestamps if 0 <= t <= duration])))
                total_steps = max(1, len(valid_ts))

                for step_idx, ts in enumerate(valid_ts):
                    if job_id and job_runner.is_cancelled(job_id):
                        break

                    target_frame_idx = int(ts * fps)
                    cap.set(cv2.CAP_PROP_POS_MSEC, ts * 1000.0)
                    ret, frame = cap.read()
                    if not ret:
                        continue

                    # Apply crop if needed
                    if use_crop and (x2 - x1 > 0) and (y2 - y1 > 0):
                        proc_frame = frame[y1:y2, x1:x2]
                    else:
                        proc_frame = frame

                    h, w = proc_frame.shape[:2]
                    sharpness = cls.calculate_sharpness(proc_frame)

                    if min_sharpness > 0 and sharpness < min_sharpness:
                        continue

                    is_duplicate = False
                    frame_hash = cls.compute_dhash(proc_frame)
                    if deduplicate and prev_hash is not None:
                        dist = cls.hamming_distance(frame_hash, prev_hash)
                        if dist <= 3:
                            is_duplicate = True
                    prev_hash = frame_hash

                    frame_id = str(uuid.uuid4())
                    frame_filename = f"frame_{video_id[:8]}_{target_frame_idx:06d}_{extracted_count}.jpg"
                    thumb_filename = f"thumb_{video_id[:8]}_{target_frame_idx:06d}_{extracted_count}.jpg"
                    frame_path = str(out_dir / frame_filename)
                    thumb_path = str(thumbs_dir / thumb_filename)

                    cv2.imwrite(frame_path, proc_frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
                    thumb_w = 240
                    thumb_h = max(1, int((thumb_w / w) * h))
                    thumb_img = cv2.resize(proc_frame, (thumb_w, thumb_h), interpolation=cv2.INTER_AREA)
                    cv2.imwrite(thumb_path, thumb_img, [cv2.IMWRITE_JPEG_QUALITY, 80])

                    db_frame = Frame(
                        id=frame_id,
                        project_id=project_id,
                        video_id=video_id,
                        frame_index=target_frame_idx,
                        timestamp_sec=round(ts, 3),
                        file_path=frame_path,
                        thumbnail_path=thumb_path,
                        width=w,
                        height=h,
                        sharpness_score=sharpness,
                        is_duplicate=is_duplicate,
                        split="unassigned",
                        status="unreviewed",
                    )
                    db.add(db_frame)
                    extracted_records.append(db_frame)
                    extracted_count += 1

                    if job_id:
                        prog = round(((step_idx + 1) / total_steps) * 100, 1)
                        job_runner.update_progress(
                            job_id,
                            prog,
                            f"Extracted {extracted_count}/{total_steps} timestamp frames"
                        )
            else:
                # Mode B: Range-based Interval / FPS / Frame Step
                frames_in_range = max(1, end_frame - start_frame)
                total_steps = max(1, frames_in_range // step)
                current_frame_idx = start_frame

                # High-speed sequential decode: seek once to start_frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

                while current_frame_idx < end_frame:
                    if job_id and job_runner.is_cancelled(job_id):
                        break

                    # Only seek if jumping frames (step > 1); sequential step=1 streams directly
                    if step > 1 and current_frame_idx != start_frame:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame_idx)

                    ret, frame = cap.read()
                    if not ret:
                        break

                    # Apply crop if needed
                    if use_crop and (x2 - x1 > 0) and (y2 - y1 > 0):
                        proc_frame = frame[y1:y2, x1:x2]
                    else:
                        proc_frame = frame

                    h, w = proc_frame.shape[:2]
                    
                    # Sharpness calculation (skip if min_sharpness is 0)
                    if min_sharpness > 0:
                        sharpness = cls.calculate_sharpness(proc_frame)
                        if sharpness < min_sharpness:
                            current_frame_idx += step
                            continue
                    else:
                        sharpness = 50.0

                    # Deduplication check (skip if deduplicate is False)
                    is_duplicate = False
                    if deduplicate:
                        frame_hash = cls.compute_dhash(proc_frame)
                        if prev_hash is not None:
                            dist = cls.hamming_distance(frame_hash, prev_hash)
                            if dist <= 3:
                                is_duplicate = True
                        prev_hash = frame_hash

                    timestamp_sec = round(current_frame_idx / fps, 3)
                    ts_key = round(timestamp_sec, 2)
                    if mode not in ("all_frames", "all", "interval_frame") and ts_key in seen_timestamps:
                        current_frame_idx += step
                        continue
                    seen_timestamps.add(ts_key)

                    frame_id = str(uuid.uuid4())
                    frame_filename = f"frame_{video_id[:8]}_{current_frame_idx:06d}.jpg"
                    thumb_filename = f"thumb_{video_id[:8]}_{current_frame_idx:06d}.jpg"

                    frame_path = str(out_dir / frame_filename)
                    thumb_path = str(thumbs_dir / thumb_filename)

                    # Save original extracted frame
                    cv2.imwrite(frame_path, proc_frame, [cv2.IMWRITE_JPEG_QUALITY, 92])

                    # Save thumbnail (240px width)
                    thumb_w = 240
                    thumb_h = max(1, int((thumb_w / w) * h))
                    thumb_img = cv2.resize(proc_frame, (thumb_w, thumb_h), interpolation=cv2.INTER_AREA)
                    cv2.imwrite(thumb_path, thumb_img, [cv2.IMWRITE_JPEG_QUALITY, 80])

                    # Create DB record
                    db_frame = Frame(
                        id=frame_id,
                        project_id=project_id,
                        video_id=video_id,
                        frame_index=current_frame_idx,
                        timestamp_sec=timestamp_sec,
                        file_path=frame_path,
                        thumbnail_path=thumb_path,
                        width=w,
                        height=h,
                        sharpness_score=sharpness,
                        is_duplicate=is_duplicate,
                        split="unassigned",
                        status="unreviewed",
                    )
                    db.add(db_frame)
                    extracted_records.append(db_frame)
                    extracted_count += 1

                    current_frame_idx += step

                    if extracted_count % 100 == 0:
                        db.commit()

                    if job_id and extracted_count % 10 == 0:
                        processed_frames = current_frame_idx - start_frame
                        prog = round(min(100.0, (processed_frames / frames_in_range) * 100), 1)
                        job_runner.update_progress(
                            job_id,
                            prog,
                            f"Extracted {extracted_count} frames (frame {current_frame_idx}/{end_frame})"
                        )

            db.commit()

            # Generate manifest
            manifest = {
                "project_id": project_id,
                "video_id": video_id,
                "total_frames_extracted": extracted_count,
                "step_used": step if 'step' in locals() else None,
                "mode": mode,
                "start_time": start_time,
                "end_time": end_time,
                "frames": [
                    {
                        "id": f.id,
                        "frame_index": f.frame_index,
                        "timestamp_sec": f.timestamp_sec,
                        "width": f.width,
                        "height": f.height,
                        "sharpness_score": f.sharpness_score,
                        "is_duplicate": f.is_duplicate,
                        "file_path": f.file_path,
                    }
                    for f in extracted_records
                ],
            }
            manifest_path = out_dir / f"manifest_{video_id[:8]}.json"
            with open(manifest_path, "w", encoding="utf-8") as mf:
                json.dump(manifest, mf, indent=2)

            return {
                "extracted_count": extracted_count,
                "manifest_path": str(manifest_path),
                "frames_dir": str(out_dir),
            }
        finally:
            cap.release()
            db.close()

    @staticmethod
    def generate_contact_sheet(frame_paths: List[str], output_path: str, cols: int = 5, thumb_size: int = 200) -> str:
        if not frame_paths:
            return ""

        thumbs = []
        for p in frame_paths[:50]:  # Cap at 50 frames for contact sheet
            if os.path.exists(p):
                img = cv2.imread(p)
                if img is not None:
                    t = cv2.resize(img, (thumb_size, thumb_size), interpolation=cv2.INTER_AREA)
                    thumbs.append(t)

        if not thumbs:
            return ""

        rows = (len(thumbs) + cols - 1) // cols
        sheet = np.zeros((rows * thumb_size, cols * thumb_size, 3), dtype=np.uint8)

        for i, t in enumerate(thumbs):
            r = i // cols
            c = i % cols
            y = r * thumb_size
            x = c * thumb_size
            sheet[y:y + thumb_size, x:x + thumb_size] = t

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, sheet, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return output_path

    @classmethod
    def deduplicate_project_frames(cls, project_id: str, db: Session) -> Dict[str, Any]:
        """Removes duplicate frames with identical timestamp or frame index from project, cleaning orphan annotations."""
        frames = db.query(Frame).filter(Frame.project_id == project_id).order_by(Frame.timestamp_sec.asc(), Frame.created_at.asc()).all()
        seen = set()
        deleted_count = 0
        for f in frames:
            k = (f.video_id, round(f.timestamp_sec, 2))
            if k in seen:
                # Delete annotations and duplicate frame record
                db.query(Annotation).filter(Annotation.frame_id == f.id).delete()
                db.delete(f)
                deleted_count += 1
            else:
                seen.add(k)
        db.commit()
        remaining = db.query(Frame).filter(Frame.project_id == project_id).count()
        return {
            "deleted_count": deleted_count,
            "remaining_frames": remaining,
            "message": f"Deduplication complete: removed {deleted_count} duplicate frames, {remaining} frames remaining.",
        }

frame_service = FrameService()
