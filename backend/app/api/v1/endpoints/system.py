import os
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import (
    Project, Video, Frame, Annotation, DatasetVersion, Experiment, RegisteredModel, ComputeRuntime, Job, ActivityLog
)
from app.schemas.schemas import HardwareTelemetryOut, JobOut
from app.services.hardware_service import get_hardware_telemetry
from app.services.job_runner import job_runner

router = APIRouter()

@router.get("/telemetry", response_model=HardwareTelemetryOut)
def get_system_telemetry():
    return get_hardware_telemetry()

@router.get("/overview")
def get_system_overview(db: Session = Depends(get_db)):
    proj_count = db.query(Project).count()
    vid_count = db.query(Video).count()
    frame_count = db.query(Frame).count()
    ann_count = db.query(Annotation).count()
    ds_count = db.query(DatasetVersion).count()
    exp_count = db.query(Experiment).count()
    mod_count = db.query(RegisteredModel).count()
    online_runtimes = db.query(ComputeRuntime).filter(ComputeRuntime.status == "online").count()
    active_jobs = db.query(Job).filter(Job.status == "running").count()

    recent_projects = db.query(Project).order_by(Project.updated_at.desc()).limit(5).all()
    recent_experiments = db.query(Experiment).order_by(Experiment.created_at.desc()).limit(5).all()
    recent_activities = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(10).all()

    telemetry = get_hardware_telemetry()

    return {
        "metrics": {
            "projects": proj_count,
            "videos": vid_count,
            "frames": frame_count,
            "annotations": ann_count,
            "datasets": ds_count,
            "experiments": exp_count,
            "registered_models": mod_count,
            "online_runtimes": online_runtimes,
            "active_jobs": active_jobs,
        },
        "telemetry": telemetry,
        "recent_projects": [
            {
                "id": p.id,
                "name": p.name,
                "task_type": p.task_type,
                "created_at": p.created_at,
                "video_count": len(p.videos),
                "frame_count": len(p.frames),
                "annotation_count": len(p.annotations),
            }
            for p in recent_projects
        ],
        "recent_experiments": [
            {
                "id": e.id,
                "project_id": e.project_id,
                "name": e.name,
                "model_variant": e.model_variant,
                "status": e.status,
                "current_epoch": e.current_epoch,
                "total_epochs": e.total_epochs,
                "best_map50": e.best_map50,
                "created_at": e.created_at,
            }
            for e in recent_experiments
        ],
        "recent_activities": [
            {
                "id": a.id,
                "project_id": a.project_id,
                "stage": a.stage,
                "action": a.action,
                "details": a.details,
                "timestamp": a.timestamp,
            }
            for a in recent_activities
        ],
    }

@router.get("/jobs", response_model=List[JobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(Job).order_by(Job.created_at.desc()).limit(50).all()

@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: str):
    success = job_runner.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found or already finished")
    return {"message": "Job cancellation initiated", "job_id": job_id}

@router.get("/integrations")
def get_integrations_catalog():
    telemetry = get_hardware_telemetry()
    return [
        {
            "id": "opencv_video",
            "name": "OpenCV Video Processing Engine",
            "category": "Video & Frames",
            "status": "connected",
            "version": telemetry.opencv_version,
            "capabilities": ["Video Inspection", "ROI Rectangular Cropping", "Frame Stepping", "Laplacian Blur Detection", "Deduplication Hash"],
            "setup_required": False,
            "details": "Native high-performance video processing active.",
        },
        {
            "id": "ultralytics_yolo",
            "name": "Ultralytics YOLO Engine",
            "category": "AI Training & Inference",
            "status": "connected",
            "version": telemetry.ultralytics_version,
            "capabilities": ["Assisted Annotation", "Fine-Tuning", "Training from Scratch", "Validation Benchmark", "ONNX Export"],
            "setup_required": False,
            "details": f"PyTorch {telemetry.pytorch_version} backend active.",
        },
        {
            "id": "sam_adapter",
            "name": "Segment Anything Model (SAM 2 / SAM 3)",
            "category": "AI Assisted Annotation",
            "status": "available",
            "version": "Adapter v2.1",
            "capabilities": ["Box-prompt Polygon Generation", "Point-prompt Segmentation", "Polygon Mask Approximator"],
            "setup_required": False,
            "details": "SAM adapter interface enabled. Ready for prompt segmentation.",
        },
        {
            "id": "google_colab",
            "name": "Google Colab Pro Compute Adapter",
            "category": "Cloud Compute",
            "status": "connected",
            "version": "Colab Runner v1.2",
            "capabilities": ["Notebook Generation", "Google Drive Checkpoint Sync", "T4/A100 GPU Offload", "Failover Recovery"],
            "setup_required": False,
            "details": "Official user-authorized Colab workflow ready.",
        },
        {
            "id": "jetson_runtime",
            "name": "NVIDIA Jetson Edge Profile",
            "category": "Edge Compute",
            "status": "configured",
            "version": "JetPack 5.x / 6.x",
            "capabilities": ["TensorRT Export", "Edge Device Profile", "Network Heartbeat"],
            "setup_required": True,
            "details": "Configure IP address and SSH credentials in Compute Runtimes to connect live device.",
        },
        {
            "id": "local_storage",
            "name": "Local Persistent Storage Engine",
            "category": "Storage",
            "status": "connected",
            "version": "1.0.0",
            "capabilities": ["Artifacts", "Checkpoints", "Videos", "Datasets", "Exports"],
            "setup_required": False,
            "details": f"Storing data in {settings.DATA_DIR}",
        },
    ]
