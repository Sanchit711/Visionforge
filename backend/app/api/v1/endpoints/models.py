import os
import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import RegisteredModel, Project, ActivityLog
from app.schemas.schemas import (
    RegisteredModelCreate, RegisteredModelUpdate, RegisteredModelOut
)

router = APIRouter()

@router.get("", response_model=List[RegisteredModelOut])
def list_registered_models(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(RegisteredModel)
    if project_id:
        query = query.filter(RegisteredModel.project_id == project_id)
    return query.order_by(RegisteredModel.created_at.desc()).all()

@router.post("", response_model=RegisteredModelOut)
def register_model(data: RegisteredModelCreate, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    if not os.path.exists(data.file_path):
        raise HTTPException(status_code=400, detail=f"Model file not found at: {data.file_path}")

    fsize = os.path.getsize(data.file_path)
    sha256 = hashlib.sha256(open(data.file_path, "rb").read()).hexdigest()

    model = RegisteredModel(
        project_id=project_id,
        experiment_id=data.experiment_id,
        name=data.name,
        version=data.version,
        file_path=data.file_path,
        format=data.format,
        file_size=fsize,
        sha256_checksum=sha256,
        stage=data.stage,
        notes=data.notes or "",
    )
    db.add(model)
    db.commit()
    db.refresh(model)

    if project_id:
        log = ActivityLog(
            project_id=project_id,
            stage="validation",
            action="Registered Model",
            details={"name": data.name, "version": data.version, "format": data.format},
        )
        db.add(log)
        db.commit()

    return model

@router.get("/{model_id}", response_model=RegisteredModelOut)
def get_registered_model(model_id: str, db: Session = Depends(get_db)):
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    return m

@router.put("/{model_id}", response_model=RegisteredModelOut)
def update_registered_model(model_id: str, data: RegisteredModelUpdate, db: Session = Depends(get_db)):
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")

    if data.name:
        m.name = data.name
    if data.stage:
        m.stage = data.stage
    if data.notes is not None:
        m.notes = data.notes

    db.commit()
    db.refresh(m)
    return m

@router.delete("/{model_id}")
def delete_registered_model(model_id: str, db: Session = Depends(get_db)):
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")

    db.delete(m)
    db.commit()
    return {"message": "Model removed from registry", "id": model_id}

@router.get("/{model_id}/download")
def download_model_file(model_id: str, db: Session = Depends(get_db)):
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")

    if not os.path.exists(m.file_path):
        raise HTTPException(status_code=404, detail="Model binary file missing on disk")

    return FileResponse(
        path=m.file_path,
        filename=os.path.basename(m.file_path),
        media_type="application/octet-stream",
    )

@router.post("/{model_id}/export")
def export_registered_model(model_id: str, format: str = "onnx", db: Session = Depends(get_db)):
    """
    Exports a registered model to ONNX, TorchScript, or TensorRT engine
    for high-throughput production and edge deployment.
    """
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")

    if not os.path.exists(m.file_path):
        raise HTTPException(status_code=400, detail=f"Model binary not found on disk at: {m.file_path}")

    try:
        from ultralytics import YOLO
        yolo_model = YOLO(m.file_path)
        exported_path = yolo_model.export(format=format, dynamic=True, simplify=True)
        return {
            "status": "success",
            "model_id": model_id,
            "export_format": format,
            "exported_file_path": str(exported_path),
            "download_url": f"/api/v1/files/raw?path={str(exported_path)}&download=true",
            "file_size_mb": round(os.path.getsize(exported_path) / (1024 * 1024), 2) if os.path.exists(exported_path) else None,
            "message": f"Successfully exported to {format.upper()} for edge deployment."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model export failed: {str(e)}")
