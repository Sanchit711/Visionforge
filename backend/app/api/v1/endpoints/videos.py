import os
import shutil
import uuid
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
import cv2

from app.config import settings
from app.database import get_db
from app.models import Video, Project, ActivityLog
from app.schemas.schemas import VideoOut, VideoCropRequest
from app.services.video_service import video_service
from app.services.job_runner import job_runner

router = APIRouter()

@router.get("", response_model=List[VideoOut])
def list_videos(project_id: str, db: Session = Depends(get_db)):
    return db.query(Video).filter(Video.project_id == project_id).order_by(Video.created_at.desc()).all()

@router.post("/upload", response_model=VideoOut)
async def upload_video(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Save uploaded file
    vid_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix.lower() or ".mp4"
    saved_filename = f"{vid_id}{ext}"
    dest_path = settings.VIDEOS_DIR / saved_filename

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Inspect video metadata with OpenCV
    try:
        meta = video_service.inspect_video(str(dest_path))
    except Exception as e:
        if dest_path.exists():
            dest_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to inspect video: {str(e)}")

    video = Video(
        id=vid_id,
        project_id=project_id,
        filename=saved_filename,
        file_path=str(dest_path.resolve()),
        original_filename=file.filename,
        file_size=meta["file_size"],
        duration=meta["duration"],
        width=meta["width"],
        height=meta["height"],
        fps=meta["fps"],
        total_frames=meta["total_frames"],
        codec=meta["codec"],
        status="ready",
        trim_start=0.0,
        trim_end=meta["duration"],
        crop_box={"x": 0.0, "y": 0.0, "w": 1.0, "h": 1.0, "normalized": True},
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    # Activity log
    log = ActivityLog(
        project_id=project_id,
        stage="video",
        action="Uploaded Video",
        details={"filename": file.filename, "duration": meta["duration"], "resolution": f"{meta['width']}x{meta['height']}"},
    )
    db.add(log)
    db.commit()

    return video

@router.post("/generate-synthetic", response_model=VideoOut)
def generate_synthetic_video_endpoint(
    project_id: str = Form(...),
    name: str = Form("sample_traffic_cctv.mp4"),
    num_frames: int = Form(120),
    fps: int = Form(24),
    db: Session = Depends(get_db),
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    vid_id = str(uuid.uuid4())
    saved_filename = f"synth_{vid_id[:8]}_{name}"
    dest_path = settings.VIDEOS_DIR / saved_filename

    video_service.generate_synthetic_video(
        output_path=str(dest_path),
        num_frames=num_frames,
        fps=fps,
        width=640,
        height=480,
    )

    meta = video_service.inspect_video(str(dest_path))

    video = Video(
        id=vid_id,
        project_id=project_id,
        filename=saved_filename,
        file_path=str(dest_path.resolve()),
        original_filename=name,
        file_size=meta["file_size"],
        duration=meta["duration"],
        width=meta["width"],
        height=meta["height"],
        fps=meta["fps"],
        total_frames=meta["total_frames"],
        codec=meta["codec"],
        status="ready",
        trim_start=0.0,
        trim_end=meta["duration"],
        crop_box={"x": 0.0, "y": 0.0, "w": 1.0, "h": 1.0, "normalized": True},
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    log = ActivityLog(
        project_id=project_id,
        stage="video",
        action="Generated Synthetic Video",
        details={"name": name, "frames": num_frames, "fps": fps},
    )
    db.add(log)
    db.commit()

    return video

@router.get("/{video_id}", response_model=VideoOut)
def get_video(video_id: str, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

@router.post("/{video_id}/crop")
def configure_video_crop(
    video_id: str,
    data: VideoCropRequest,
    db: Session = Depends(get_db),
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    video.crop_box = data.crop_box.dict()
    video.trim_start = data.trim_start or 0.0
    if data.trim_end and data.trim_end > 0:
        video.trim_end = data.trim_end

    db.commit()
    db.refresh(video)

    # Launch background job to render cropped video preview
    job_id = job_runner.create_job(
        job_type="video_crop",
        project_id=video.project_id,
        message=f"Processing crop for video '{video.original_filename}'"
    )

    cropped_filename = f"cropped_{video.filename}"
    target_path = str(settings.VIDEOS_DIR / cropped_filename)

    def crop_task(jid):
        res = video_service.crop_and_trim_video(
            source_path=video.file_path,
            target_path=target_path,
            trim_start=video.trim_start,
            trim_end=video.trim_end,
            crop_box=video.crop_box,
            job_id=jid,
        )
        job_runner.complete_job(jid, res, "Crop and trim completed successfully")

    job_runner.run_in_background(job_id, crop_task)

    return {
        "message": "Crop configured and processing started",
        "job_id": job_id,
        "video_id": video.id,
        "crop_box": video.crop_box,
        "trim_start": video.trim_start,
        "trim_end": video.trim_end,
    }

@router.get("/{video_id}/frame-preview")
def get_frame_preview(video_id: str, timestamp_sec: float = Query(0.0), db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    frame = video_service.get_frame_at_timestamp(video.file_path, timestamp_sec)
    if frame is None:
        raise HTTPException(status_code=404, detail="Could not extract frame at given timestamp")

    # Encode to JPEG bytes
    ret, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ret:
        raise HTTPException(status_code=500, detail="Failed to encode frame")

    return Response(content=jpeg.tobytes(), media_type="image/jpeg")

@router.api_route("/{video_id}/stream", methods=["GET", "HEAD"])
def stream_video(video_id: str, request: Request, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    file_path = Path(video.file_path)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")

    ext = file_path.suffix.lower()
    content_type = "video/mp4"
    if ext == ".webm":
        content_type = "video/webm"
    elif ext in [".ogg", ".ogv"]:
        content_type = "video/ogg"
    elif ext == ".mov":
        content_type = "video/quicktime"

    # Handle HEAD request for browser pre-flight checks
    if request.method == "HEAD":
        return Response(
            status_code=200,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Type": content_type,
            },
        )

    # If no Range header, stream first chunk or full if small
    if not range_header:
        chunk_size = 2 * 1024 * 1024
        if file_size <= chunk_size:
            with open(file_path, "rb") as f:
                content = f.read()
            return Response(
                content=content,
                status_code=200,
                headers={
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(file_size),
                    "Content-Type": content_type,
                },
            )
        else:
            with open(file_path, "rb") as f:
                chunk = f.read(chunk_size)
            return Response(
                content=chunk,
                status_code=206,
                headers={
                    "Accept-Ranges": "bytes",
                    "Content-Range": f"bytes 0-{chunk_size - 1}/{file_size}",
                    "Content-Length": str(chunk_size),
                    "Content-Type": content_type,
                },
            )

    # Range header parsing (e.g., 'bytes=0-' or 'bytes=1000-2000000')
    try:
        range_val = range_header.replace("bytes=", "").strip()
        parts = range_val.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
    except Exception:
        raise HTTPException(status_code=416, detail="Invalid Range header")

    if start >= file_size or start < 0:
        raise HTTPException(
            status_code=416,
            detail="Requested range not satisfiable",
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    # Cap chunk size to 2MB for ultra-fast, smooth streaming and low latency scrubbing
    MAX_CHUNK = 2 * 1024 * 1024
    if end - start + 1 > MAX_CHUNK:
        end = start + MAX_CHUNK - 1
    if end >= file_size:
        end = file_size - 1

    content_length = end - start + 1

    with open(file_path, "rb") as f:
        f.seek(start)
        data = f.read(content_length)

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": content_type,
    }
    return Response(content=data, status_code=206, headers=headers)

