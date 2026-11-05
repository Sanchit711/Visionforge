import os
import shutil
import uuid
from typing import Optional, List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import Video, Frame, RegisteredModel
from app.services.validation_service import validation_service
from app.services.multi_model_service import multi_model_service
from app.services.video_benchmark_service import video_benchmark_service

router = APIRouter()

class MultiModelIntrospectRequest(BaseModel):
    models: List[str]

class MultiModelBenchmarkRequest(BaseModel):
    models: List[str]
    frame_paths: Optional[List[str]] = None
    project_id: Optional[str] = None
    sample_count: int = 15
    conf_threshold: float = 0.25
    iou_threshold: float = 0.45

class VideoBenchmarkRequest(BaseModel):
    video_path: Optional[str] = None
    video_id: Optional[str] = None
    models: List[str]
    max_frames: int = 180
    conf_threshold: float = 0.25
    iou_threshold: float = 0.45
    generate_video: bool = True

@router.post("/infer")
async def run_validation_inference(
    file: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
    model_name_or_path: str = Form("yolov8n.pt"),
    confidence_threshold: float = Form(0.25),
    iou_threshold: float = Form(0.45),
):
    target_image_path = None
    if file:
        dest_name = f"val_input_{uuid.uuid4().hex[:8]}_{file.filename}"
        dest_path = settings.UPLOADS_DIR / dest_name
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        target_image_path = str(dest_path.resolve())
    elif image_path:
        target_image_path = image_path
    else:
        raise HTTPException(status_code=400, detail="Must provide either an uploaded image file or an existing image_path")

    try:
        res = validation_service.run_image_inference(
            image_path=target_image_path,
            model_name_or_path=model_name_or_path,
            confidence_threshold=confidence_threshold,
            iou_threshold=iou_threshold,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Inference failed: {str(e)}")

@router.post("/compare")
async def compare_models_inference(
    file: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
    model_a_path: str = Form("yolov8n.pt"),
    model_b_path: str = Form("yolov8s.pt"),
    confidence_threshold: float = Form(0.25),
):
    target_image_path = None
    if file:
        dest_name = f"val_comp_{uuid.uuid4().hex[:8]}_{file.filename}"
        dest_path = settings.UPLOADS_DIR / dest_name
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        target_image_path = str(dest_path.resolve())
    elif image_path:
        target_image_path = image_path
    else:
        raise HTTPException(status_code=400, detail="Must provide either an uploaded image file or an existing image_path")

    try:
        return validation_service.compare_models(
            image_path=target_image_path,
            model_a_path=model_a_path,
            model_b_path=model_b_path,
            conf_threshold=confidence_threshold,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Comparison failed: {str(e)}")

@router.post("/multi-model/introspect")
async def introspect_models_endpoint(req: MultiModelIntrospectRequest):
    try:
        results = [multi_model_service.introspect_model(m) for m in req.models]
        return {"models": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Introspection failed: {str(e)}")

@router.post("/multi-model/benchmark-frames")
async def benchmark_models_on_frames_endpoint(
    req: MultiModelBenchmarkRequest,
    db: Session = Depends(get_db)
):
    try:
        frame_paths = req.frame_paths or []
        if not frame_paths and req.project_id:
            frames = (
                db.query(Frame)
                .filter(Frame.project_id == req.project_id)
                .limit(req.sample_count)
                .all()
            )
            frame_paths = [f.file_path for f in frames if os.path.exists(f.file_path)]

        if not frame_paths:
            raise HTTPException(status_code=400, detail="No valid test frames found for evaluation.")

        return multi_model_service.benchmark_models_on_frames(
            model_identifiers=req.models,
            frame_paths=frame_paths,
            conf_threshold=req.conf_threshold,
            iou_threshold=req.iou_threshold,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Multi-model frame benchmark failed: {str(e)}")

@router.post("/video-benchmark")
async def run_video_benchmark_endpoint(
    req: VideoBenchmarkRequest,
    db: Session = Depends(get_db)
):
    try:
        target_video_path = req.video_path
        if not target_video_path and req.video_id:
            vid = db.query(Video).filter(Video.id == req.video_id).first()
            if vid:
                target_video_path = vid.file_path

        if not target_video_path:
            # Fallback to first video in DB
            vid = db.query(Video).first()
            if vid:
                target_video_path = vid.file_path

        if not target_video_path:
            raise HTTPException(status_code=400, detail="No target video provided or found in database.")

        return video_benchmark_service.run_video_benchmark(
            video_path=target_video_path,
            model_identifiers=req.models,
            max_frames=req.max_frames,
            conf_threshold=req.conf_threshold,
            iou_threshold=req.iou_threshold,
            generate_video=req.generate_video,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Video benchmark failed: {str(e)}")
