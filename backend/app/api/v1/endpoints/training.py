import os
import json
import shutil
import hashlib
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models import Experiment, DatasetVersion, Project, ActivityLog, RegisteredModel
from app.schemas.schemas import (
    ExperimentCreate, ExperimentOut, ModelClassCompatibilityCheck, ColabSyncRequest
)
from app.services.training_service import training_service
from app.services.colab_service import colab_service
from app.services.job_runner import job_runner

router = APIRouter()

@router.get("/experiments", response_model=List[ExperimentOut])
def list_experiments(project_id: str, db: Session = Depends(get_db)):
    return db.query(Experiment).filter(Experiment.project_id == project_id).order_by(Experiment.created_at.desc()).all()

@router.post("/check-compatibility", response_model=ModelClassCompatibilityCheck)
def check_compatibility(
    model_name_or_path: str = Query("yolov8n.pt"),
    dataset_version_id: str = Query(...),
    db: Session = Depends(get_db),
):
    ds = db.query(DatasetVersion).filter(DatasetVersion.id == dataset_version_id).first()
    if not ds or not os.path.exists(ds.yaml_path):
        raise HTTPException(status_code=404, detail="Dataset version or YAML file not found")

    try:
        return training_service.inspect_model_compatibility(model_name_or_path, ds.yaml_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to inspect model compatibility: {str(e)}")

@router.post("/start", response_model=ExperimentOut)
def start_training(
    project_id: str,
    data: ExperimentCreate,
    db: Session = Depends(get_db),
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    ds = db.query(DatasetVersion).filter(DatasetVersion.id == data.dataset_version_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    exp = Experiment(
        project_id=project_id,
        dataset_version_id=ds.id,
        name=data.name,
        model_variant=data.model_variant,
        base_weights_path=data.base_weights_path or data.model_variant,
        epochs=data.epochs,
        batch_size=data.batch_size,
        img_size=data.img_size,
        optimizer=data.optimizer,
        lr0=data.lr0,
        device=data.device,
        status="queued",
        current_epoch=0,
        total_epochs=data.epochs,
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    # Launch in job runner
    job_id = job_runner.create_job(
        job_type="train",
        project_id=project_id,
        message=f"Training model '{data.name}' on dataset '{ds.version_name}' ({data.epochs} epochs)"
    )

    def train_worker(jid):
        training_service.execute_training(experiment_id=exp.id, job_id=jid)

    job_runner.run_in_background(job_id, train_worker)

    # Activity log
    log = ActivityLog(
        project_id=project_id,
        stage="training",
        action="Launched Training Run",
        details={"experiment": data.name, "epochs": data.epochs, "model": data.model_variant},
    )
    db.add(log)
    db.commit()

    return exp

@router.get("/experiments/{experiment_id}", response_model=ExperimentOut)
def get_experiment(experiment_id: str, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return exp

@router.post("/experiments/{experiment_id}/stop")
def stop_training(experiment_id: str, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if exp.status != "running":
        return {"message": f"Experiment is not currently running (status: {exp.status})"}

    # Signal stop
    exp.status = "stopped"
    db.commit()
    return {"message": "Safe stop signal sent to training process", "experiment_id": experiment_id}

@router.get("/experiments/{experiment_id}/logs")
def get_experiment_logs(experiment_id: str, db: Session = Depends(get_db)):
    exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found")

    if exp.log_file_path and os.path.exists(exp.log_file_path):
        with open(exp.log_file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            return {"log_file": exp.log_file_path, "logs": content[-10000:]}
    return {"log_file": exp.log_file_path, "logs": "No log file generated yet."}

# ================================================================
#                 GOOGLE COLAB TRAINING INTEGRATION
# ================================================================

@router.get("/colab/notebook")
def download_colab_notebook(
    project_id: str,
    dataset_version_id: Optional[str] = None,
    model_default: str = "yolo26l.pt",
    epochs: int = 50,
    batch_size: int = 4,
    img_size: int = 640,
    optimizer: str = "AdamW",
    learning_rate: float = 0.001,
    db: Session = Depends(get_db),
):
    """
    Generates and downloads a custom Google Colab Jupyter Notebook (.ipynb)
    configured with the YOLO Master Training Script, Google Drive checkpoints,
    and VisionForge synchronization.
    """
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    ds = None
    if dataset_version_id:
        ds = db.query(DatasetVersion).filter(DatasetVersion.id == dataset_version_id).first()
    else:
        ds = db.query(DatasetVersion).filter(DatasetVersion.project_id == project_id).order_by(DatasetVersion.created_at.desc()).first()

    notebook_dict = colab_service.generate_colab_notebook(
        project_name=proj.name,
        project_id=proj.id,
        dataset_version_id=ds.id if ds else None,
        dataset_name=ds.version_name if ds else "v1.0",
        model_default=model_default,
        epochs=epochs,
        batch_size=batch_size,
        img_size=img_size,
        optimizer=optimizer,
        learning_rate=learning_rate,
        server_ip="192.168.0.38",
        server_port=8000,
    )

    notebook_json = json.dumps(notebook_dict, indent=2)
    filename = f"{proj.name}_YOLO_Master_Colab.ipynb"

    return Response(
        content=notebook_json,
        media_type="application/x-ipynb+json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

@router.post("/colab/sync-metrics", response_model=ExperimentOut)
def sync_colab_metrics(
    data: ColabSyncRequest,
    db: Session = Depends(get_db),
):
    """
    Receives training validation metrics and run status from Google Colab,
    recording or updating the experiment in VisionForge.
    """
    proj = db.query(Project).filter(Project.id == data.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if experiment already exists
    exp = db.query(Experiment).filter(
        Experiment.project_id == data.project_id,
        Experiment.name == data.experiment_name
    ).first()

    if not exp:
        exp = Experiment(
            project_id=data.project_id,
            dataset_version_id=data.dataset_version_id,
            name=data.experiment_name,
            model_variant=data.model_variant,
            base_weights_path=data.model_variant,
            epochs=data.epochs,
            batch_size=4,
            img_size=640,
            optimizer="AdamW",
            lr0=0.001,
            device="Colab Cloud GPU (T4/A100)",
            status="completed",
            current_epoch=data.epochs,
            total_epochs=data.epochs,
            precision=data.precision,
            recall=data.recall,
            map50=data.map50,
            map50_95=data.map50_95,
            best_map50=data.map50,
            completed_at=datetime.utcnow(),
        )
        db.add(exp)
    else:
        exp.status = "completed"
        exp.precision = data.precision
        exp.recall = data.recall
        exp.map50 = data.map50
        exp.map50_95 = data.map50_95
        exp.best_map50 = max(exp.best_map50 or 0.0, data.map50)
        exp.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(exp)

    log = ActivityLog(
        project_id=data.project_id,
        stage="training",
        action="Synced Colab Training Metrics",
        details={
            "experiment": exp.name,
            "mAP50": data.map50,
            "precision": data.precision,
            "recall": data.recall,
            "notes": data.notes or "Completed in Google Colab"
        },
    )
    db.add(log)
    db.commit()

    return exp

@router.post("/colab/upload-model")
async def upload_colab_model(
    project_id: str = Form(...),
    experiment_id: Optional[str] = Form(None),
    model_name: str = Form("colab_trained_best.pt"),
    version: str = Form("v1.0"),
    stage: str = Form("candidate"),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Uploads trained YOLO best.pt weights from Google Colab / Drive directly
    into the VisionForge Model Registry.
    """
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    target_dir = settings.MODELS_DIR / project_id
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / file.filename

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    fsize = os.path.getsize(target_path)
    sha256 = hashlib.sha256(open(target_path, "rb").read()).hexdigest()

    registered = RegisteredModel(
        project_id=project_id,
        experiment_id=experiment_id,
        name=model_name,
        version=version,
        file_path=str(target_path),
        format="pt",
        file_size=fsize,
        sha256_checksum=sha256,
        stage=stage,
        notes=notes or "Trained on Google Colab with GPU acceleration and Drive checkpoints",
    )
    db.add(registered)

    if experiment_id:
        exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if exp:
            exp.best_weights_path = str(target_path)

    db.commit()
    db.refresh(registered)

    log = ActivityLog(
        project_id=project_id,
        stage="models",
        action="Imported Colab Trained Model",
        details={"name": model_name, "version": version, "file_size": fsize},
    )
    db.add(log)
    db.commit()

    return {
        "message": "Model weights successfully registered in VisionForge Studio",
        "model_id": registered.id,
        "name": registered.name,
        "file_path": str(target_path),
        "file_size": fsize,
    }
