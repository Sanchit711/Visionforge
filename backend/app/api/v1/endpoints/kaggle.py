# ==============================================================================
# VisionForge Studio - Industrial Computer Vision & Video Forensic Suite
# Copyright (C) 2026 Sushant Gabhane (MSc IT - ID: D09)
# Licensed under GNU Affero General Public License v3.0 (GNU AGPLv3)
# ==============================================================================

import os
import json
import pathlib
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.kaggle_service import kaggle_service

router = APIRouter()

class KaggleTrainRequest(BaseModel):
    project_id: str
    dataset_version_id: str
    experiment_name: str = "SVG_Kaggle_YOLO_Exp"
    model_variant: str = "yolo26l.pt"
    epochs: int = 50
    batch_size: int = 8
    img_size: int = 640
    optimizer: str = "AdamW"
    learning_rate: float = 0.0008
    patience: int = 15

class KaggleCredentialsRequest(BaseModel):
    username: str
    key: str

@router.get("/status")
def get_kaggle_status():
    """Checks whether the backend has authenticated access to the Kaggle REST API."""
    return kaggle_service.get_auth_status()

@router.post("/credentials")
def save_kaggle_credentials(data: KaggleCredentialsRequest):
    """
    Saves Kaggle credentials to ~/.kaggle/kaggle.json and verifies connectivity.
    """
    try:
        kaggle_dir = pathlib.Path.home() / ".kaggle"
        kaggle_dir.mkdir(parents=True, exist_ok=True)
        kaggle_file = kaggle_dir / "kaggle.json"
        with open(kaggle_file, "w", encoding="utf-8") as f:
            json.dump({"username": data.username.strip(), "key": data.key.strip()}, f, indent=2)

        # Set environment variables for the current process
        clean_key = data.key.strip()
        clean_user = data.username.strip()
        os.environ["KAGGLE_USERNAME"] = clean_user
        if clean_key.startswith("KGAT") or len(clean_key) > 32:
            os.environ["KAGGLE_API_TOKEN"] = clean_key
            os.environ.pop("KAGGLE_KEY", None)
            # Write access_token file natively supported by kaggle-api
            (kaggle_dir / "access_token").write_text(clean_key, encoding="utf-8")
        else:
            os.environ["KAGGLE_KEY"] = clean_key

        # Re-verify
        auth = kaggle_service.get_auth_status()
        return auth
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save Kaggle credentials: {str(e)}")

@router.post("/train")
def launch_kaggle_training(data: KaggleTrainRequest, db: Session = Depends(get_db)):
    """
    Launches end-to-end cloud training on Kaggle's dual NVIDIA T4 GPU accelerator:
    1. Extracts & packages project dataset.
    2. Creates/updates private Kaggle dataset.
    3. Generates headless training script & metadata.
    4. Pushes execution kernel via Kaggle API.
    5. Records Experiment in VisionForge database.
    """
    try:
        res = kaggle_service.dispatch_training_kernel(
            project_id=data.project_id,
            dataset_version_id=data.dataset_version_id,
            experiment_name=data.experiment_name,
            model_variant=data.model_variant,
            epochs=data.epochs,
            batch_size=data.batch_size,
            img_size=data.img_size,
            optimizer=data.optimizer,
            learning_rate=data.learning_rate,
            patience=data.patience,
            db=db
        )
        return res
    except PermissionError as pe:
        raise HTTPException(status_code=401, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to launch Kaggle training job: {str(e)}")

@router.get("/jobs/{kernel_slug:path}/status")
def get_kaggle_job_status(kernel_slug: str):
    """Polls real-time execution status of a running Kaggle kernel."""
    return kaggle_service.get_kernel_execution_status(kernel_slug)

@router.post("/jobs/{kernel_slug:path}/download")
def download_kaggle_model(
    kernel_slug: str,
    project_id: str,
    experiment_id: Optional[str] = None,
    model_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Pulls output deliverables from Kaggle (/kaggle/working/),
    extracts best.pt and results.csv metrics, and registers the model in VisionForge Model Registry.
    """
    try:
        return kaggle_service.download_and_ingest_model(
            kernel_slug=kernel_slug,
            project_id=project_id,
            experiment_id=experiment_id,
            db=db,
            model_name=model_name
        )
    except FileNotFoundError as fe:
        raise HTTPException(status_code=404, detail=str(fe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download model from Kaggle: {str(e)}")
