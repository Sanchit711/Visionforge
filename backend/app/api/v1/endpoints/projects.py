from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Project, Video, Frame, Annotation, DatasetVersion, Experiment, RegisteredModel, CropPreset, ActivityLog, Tenant, User, Workspace
)
from app.schemas.schemas import (
    ProjectCreate, ProjectUpdate, ProjectOut, CropPresetCreate, CropPresetOut
)

router = APIRouter()

@router.get("", response_model=List[ProjectOut])
def list_projects(
    tenant_id: Optional[str] = Query(None, description="Optional tenant ID to filter projects"),
    workspace_id: Optional[str] = Query(None, description="Optional workspace ID to filter projects"),
    db: Session = Depends(get_db),
):
    query = db.query(Project)
    if tenant_id:
        query = query.filter(Project.tenant_id == tenant_id)
    if workspace_id:
        query = query.filter(Project.workspace_id == workspace_id)
    projects = query.order_by(Project.created_at.desc()).all()
    results = []
    for p in projects:
        vid_count = db.query(Video).filter(Video.project_id == p.id).count()
        frame_count = db.query(Frame).filter(Frame.project_id == p.id).count()
        ann_count = db.query(Annotation).filter(Annotation.project_id == p.id).count()
        ds_count = db.query(DatasetVersion).filter(DatasetVersion.project_id == p.id).count()
        mod_count = db.query(RegisteredModel).filter(RegisteredModel.project_id == p.id).count()

        p_out = ProjectOut(
            id=p.id,
            name=p.name,
            description=p.description or "",
            task_type=p.task_type or "detection",
            classes=p.classes or [],
            storage_path=p.storage_path or "",
            tenant_id=p.tenant_id,
            workspace_id=p.workspace_id,
            created_by_user_id=p.created_by_user_id,
            tenant_name=p.tenant.name if p.tenant else None,
            workspace_name=p.workspace.name if p.workspace else None,
            creator_name=p.creator.name if p.creator else None,
            created_at=p.created_at,
            updated_at=p.updated_at,
            video_count=vid_count,
            frame_count=frame_count,
            annotation_count=ann_count,
            dataset_version_count=ds_count,
            model_count=mod_count,
        )
        results.append(p_out)
    return results

@router.post("", response_model=ProjectOut)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Project).filter(Project.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Project with name '{data.name}' already exists")

    # If tenant_id not specified, assign to default tenant
    tenant_id = data.tenant_id
    if not tenant_id:
        default_t = db.query(Tenant).first()
        if default_t:
            tenant_id = default_t.id

    # If workspace_id not specified, assign to default shared workspace for this tenant
    workspace_id = data.workspace_id
    if not workspace_id and tenant_id:
        default_ws = db.query(Workspace).filter(Workspace.tenant_id == tenant_id, Workspace.is_shared == True).first()
        if not default_ws:
            default_ws = db.query(Workspace).filter(Workspace.tenant_id == tenant_id).first()
        if default_ws:
            workspace_id = default_ws.id

    # If user not specified, assign to default admin
    user_id = data.created_by_user_id
    if not user_id:
        default_u = db.query(User).first()
        if default_u:
            user_id = default_u.id

    classes_dict = [c.dict() for c in data.classes] if data.classes else [
        {"id": 0, "name": "person", "color": "#3b82f6", "hotkey": "1"},
        {"id": 1, "name": "vehicle", "color": "#10b981", "hotkey": "2"},
        {"id": 2, "name": "helmet", "color": "#f59e0b", "hotkey": "3"},
    ]

    project = Project(
        name=data.name,
        description=data.description or "",
        task_type=data.task_type,
        classes=classes_dict,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        created_by_user_id=user_id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Activity log
    log = ActivityLog(
        project_id=project.id,
        stage="overview",
        action="Created Project",
        details={"name": project.name, "task_type": project.task_type},
    )
    db.add(log)
    db.commit()

    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first() if workspace_id else None
    return ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        task_type=project.task_type,
        classes=project.classes,
        storage_path=project.storage_path or "",
        tenant_id=project.tenant_id,
        workspace_id=project.workspace_id,
        created_by_user_id=project.created_by_user_id,
        tenant_name=project.tenant.name if project.tenant else None,
        workspace_name=ws.name if ws else None,
        creator_name=project.creator.name if project.creator else None,
        created_at=project.created_at,
        updated_at=project.updated_at,
        video_count=0,
        frame_count=0,
        annotation_count=0,
        dataset_version_count=0,
        model_count=0,
    )

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    vid_count = db.query(Video).filter(Video.project_id == p.id).count()
    frame_count = db.query(Frame).filter(Frame.project_id == p.id).count()
    ann_count = db.query(Annotation).filter(Annotation.project_id == p.id).count()
    ds_count = db.query(DatasetVersion).filter(DatasetVersion.project_id == p.id).count()
    mod_count = db.query(RegisteredModel).filter(RegisteredModel.project_id == p.id).count()

    return ProjectOut(
        id=p.id,
        name=p.name,
        description=p.description or "",
        task_type=p.task_type or "detection",
        classes=p.classes or [],
        storage_path=p.storage_path or "",
        tenant_id=p.tenant_id,
        workspace_id=p.workspace_id,
        created_by_user_id=p.created_by_user_id,
        tenant_name=p.tenant.name if p.tenant else None,
        workspace_name=p.workspace.name if p.workspace else None,
        creator_name=p.creator.name if p.creator else None,
        created_at=p.created_at,
        updated_at=p.updated_at,
        video_count=vid_count,
        frame_count=frame_count,
        annotation_count=ann_count,
        dataset_version_count=ds_count,
        model_count=mod_count,
    )

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name:
        p.name = data.name
    if data.description is not None:
        p.description = data.description
    if data.classes is not None:
        p.classes = [c.dict() for c in data.classes]

    db.commit()
    db.refresh(p)
    return get_project(project_id, db)

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(p)
    db.commit()
    return {"message": "Project deleted successfully", "id": project_id}

@router.get("/{project_id}/workflow-timeline")
def get_workflow_timeline(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    vid_count = db.query(Video).filter(Video.project_id == p.id).count()
    frame_count = db.query(Frame).filter(Frame.project_id == p.id).count()
    ann_count = db.query(Annotation).filter(Annotation.project_id == p.id).count()
    ds_count = db.query(DatasetVersion).filter(DatasetVersion.project_id == p.id).count()
    exp_count = db.query(Experiment).filter(Experiment.project_id == p.id).count()
    mod_count = db.query(RegisteredModel).filter(RegisteredModel.project_id == p.id).count()

    stages = [
        {
            "id": "video_lab",
            "name": "Video Lab",
            "status": "completed" if vid_count > 0 else "pending",
            "count": vid_count,
            "description": f"{vid_count} video(s) ingested",
            "can_rerun": True,
        },
        {
            "id": "crop",
            "name": "ROI Crop",
            "status": "completed" if any(v.crop_box for v in p.videos) else "ready",
            "count": sum(1 for v in p.videos if v.crop_box),
            "description": "Region of Interest configured",
            "can_rerun": True,
        },
        {
            "id": "frame_studio",
            "name": "Frame Extraction",
            "status": "completed" if frame_count > 0 else "pending",
            "count": frame_count,
            "description": f"{frame_count} frames extracted & deduplicated",
            "can_rerun": True,
        },
        {
            "id": "annotation",
            "name": "AI Annotation Studio",
            "status": "completed" if ann_count > 0 else "pending",
            "count": ann_count,
            "description": f"{ann_count} annotations curated",
            "can_rerun": True,
        },
        {
            "id": "datasets",
            "name": "Dataset Curation",
            "status": "completed" if ds_count > 0 else "pending",
            "count": ds_count,
            "description": f"{ds_count} immutable version(s) frozen",
            "can_rerun": True,
        },
        {
            "id": "training",
            "name": "Model Training",
            "status": "completed" if exp_count > 0 else "pending",
            "count": exp_count,
            "description": f"{exp_count} experiment runs executed",
            "can_rerun": True,
        },
        {
            "id": "validation",
            "name": "Validation & Inference",
            "status": "completed" if mod_count > 0 else "pending",
            "count": mod_count,
            "description": f"{mod_count} model(s) verified & registered",
            "can_rerun": True,
        },
    ]

    return {
        "project_id": project_id,
        "project_name": p.name,
        "stages": stages,
    }

# ----------------- Crop Presets -----------------
@router.get("/crop-presets", response_model=List[CropPresetOut])
def list_crop_presets(db: Session = Depends(get_db)):
    return db.query(CropPreset).all()

@router.post("/crop-presets", response_model=CropPresetOut)
def create_crop_preset(data: CropPresetCreate, db: Session = Depends(get_db)):
    preset = CropPreset(
        name=data.name,
        x=data.x,
        y=data.y,
        width=data.width,
        height=data.height,
        is_normalized=data.is_normalized,
        aspect_ratio=data.aspect_ratio,
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset
