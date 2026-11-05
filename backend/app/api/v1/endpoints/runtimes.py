from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ComputeRuntime
from app.schemas.schemas import (
    ComputeRuntimeCreate, ComputeRuntimeUpdate, ComputeRuntimeOut
)
from app.services.runtime_service import runtime_service

router = APIRouter()

@router.get("", response_model=List[ComputeRuntimeOut])
def list_compute_runtimes(db: Session = Depends(get_db)):
    runtime_service.initialize_default_runtimes()
    return db.query(ComputeRuntime).order_by(ComputeRuntime.priority.asc()).all()

@router.post("", response_model=ComputeRuntimeOut)
def create_compute_runtime(data: ComputeRuntimeCreate, db: Session = Depends(get_db)):
    rt = ComputeRuntime(
        name=data.name,
        provider=data.provider,
        host=data.host,
        priority=data.priority,
        status="online" if data.provider == "local" else "offline",
        config_json=data.config_json or {},
    )
    db.add(rt)
    db.commit()
    db.refresh(rt)
    return rt

@router.get("/{runtime_id}", response_model=ComputeRuntimeOut)
def get_compute_runtime(runtime_id: str, db: Session = Depends(get_db)):
    rt = db.query(ComputeRuntime).filter(ComputeRuntime.id == runtime_id).first()
    if not rt:
        raise HTTPException(status_code=404, detail="Compute runtime not found")
    return rt

@router.put("/{runtime_id}", response_model=ComputeRuntimeOut)
def update_compute_runtime(runtime_id: str, data: ComputeRuntimeUpdate, db: Session = Depends(get_db)):
    rt = db.query(ComputeRuntime).filter(ComputeRuntime.id == runtime_id).first()
    if not rt:
        raise HTTPException(status_code=404, detail="Compute runtime not found")

    if data.name:
        rt.name = data.name
    if data.status:
        rt.status = data.status
    if data.priority is not None:
        rt.priority = data.priority
    if data.is_active is not None:
        rt.is_active = data.is_active
    if data.config_json is not None:
        rt.config_json = data.config_json

    db.commit()
    db.refresh(rt)
    return rt

@router.delete("/{runtime_id}")
def delete_compute_runtime(runtime_id: str, db: Session = Depends(get_db)):
    rt = db.query(ComputeRuntime).filter(ComputeRuntime.id == runtime_id).first()
    if not rt:
        raise HTTPException(status_code=404, detail="Compute runtime not found")

    db.delete(rt)
    db.commit()
    return {"message": "Runtime deleted", "id": runtime_id}

@router.post("/{runtime_id}/test")
def test_compute_runtime(runtime_id: str):
    res = runtime_service.test_runtime_connection(runtime_id)
    return res

@router.post("/failover")
def trigger_failover(failed_runtime_id: str = Query(...), experiment_id: str = Query(...)):
    try:
        return runtime_service.execute_failover(failed_runtime_id, experiment_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/colab/generate-notebook")
def generate_colab_notebook(
    project_id: str = Query(...),
    dataset_version_name: str = Query("v1.0"),
    experiment_name: str = Query("exp_colab_01"),
):
    try:
        return runtime_service.generate_colab_notebook(
            project_id=project_id,
            dataset_version_name=dataset_version_name,
            experiment_name=experiment_name,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
