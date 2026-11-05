import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DatasetVersion, Project, ActivityLog
from app.schemas.schemas import (
    DatasetVersionCreate, DatasetVersionOut, DatasetQualitySummary
)
from app.services.dataset_service import dataset_service

router = APIRouter()

@router.get("", response_model=List[DatasetVersionOut])
def list_dataset_versions(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(DatasetVersion)
    if project_id:
        q = q.filter(DatasetVersion.project_id == project_id)
    return q.order_by(DatasetVersion.created_at.desc()).all()

@router.get("/quality-summary", response_model=DatasetQualitySummary)
def get_dataset_quality_summary(project_id: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    return dataset_service.inspect_dataset_quality(project_id)

@router.post("/versions", response_model=DatasetVersionOut)
def create_dataset_version(
    project_id: str,
    data: DatasetVersionCreate,
    db: Session = Depends(get_db),
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        res = dataset_service.create_dataset_version(
            project_id=project_id,
            version_name=data.version_name,
            description=data.description or "",
            train_ratio=data.train_ratio,
            val_ratio=data.val_ratio,
            test_ratio=data.test_ratio,
            random_seed=data.random_seed,
            prevent_video_leakage=data.prevent_video_leakage,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    ds_ver = db.query(DatasetVersion).filter(DatasetVersion.id == res["id"]).first()

    # Activity log
    log = ActivityLog(
        project_id=project_id,
        stage="dataset",
        action="Created Dataset Version",
        details={"version": data.version_name, "images": ds_ver.total_images, "annotations": ds_ver.total_annotations},
    )
    db.add(log)
    db.commit()

    return ds_ver

@router.get("/versions/{version_id}", response_model=DatasetVersionOut)
def get_dataset_version(version_id: str, db: Session = Depends(get_db)):
    ds = db.query(DatasetVersion).filter(DatasetVersion.id == version_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset version not found")
    return ds

@router.get("/versions/{version_id}/download-zip")
def download_dataset_zip(version_id: str, db: Session = Depends(get_db)):
    ds = db.query(DatasetVersion).filter(DatasetVersion.id == version_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    if not ds.zip_export_path or not os.path.exists(ds.zip_export_path):
        raise HTTPException(status_code=404, detail="Exported ZIP file not found on disk")

    filename = os.path.basename(ds.zip_export_path)
    return FileResponse(
        path=ds.zip_export_path,
        media_type="application/zip",
        filename=filename,
    )
