from typing import List, Optional
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Workspace, Tenant, User, Project
from app.schemas.schemas import WorkspaceCreate, WorkspaceUpdate, WorkspaceOut, ProjectOut

router = APIRouter()

def slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", slug)

@router.get("", response_model=List[WorkspaceOut])
def list_workspaces(
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    is_shared: Optional[bool] = Query(None, description="Filter by shared or private"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List workspaces with project counts and shared/private status."""
    query = db.query(Workspace)
    if tenant_id:
        query = query.filter(Workspace.tenant_id == tenant_id)
    if is_shared is not None:
        query = query.filter(Workspace.is_shared == is_shared)

    workspaces = query.offset(skip).limit(limit).all()
    results = []
    for w in workspaces:
        p_count = db.query(func.count(Project.id)).filter(Project.workspace_id == w.id).scalar() or 0
        owner_name = w.owner.name if w.owner else None
        tenant_name = w.tenant.name if w.tenant else None
        results.append(
            WorkspaceOut(
                id=w.id,
                tenant_id=w.tenant_id,
                name=w.name,
                slug=w.slug,
                description=w.description or "",
                is_shared=w.is_shared,
                owner_user_id=w.owner_user_id,
                owner_name=owner_name,
                tenant_name=tenant_name,
                project_count=p_count,
                created_at=w.created_at,
                updated_at=w.updated_at,
            )
        )
    return results

@router.post("", response_model=WorkspaceOut)
def create_workspace(
    payload: WorkspaceCreate,
    db: Session = Depends(get_db),
):
    """Create a new shared or private workspace."""
    tenant_id = payload.tenant_id
    if not tenant_id:
        default_tenant = db.query(Tenant).first()
        if not default_tenant:
            raise HTTPException(status_code=400, detail="No tenant available. Please create a tenant first.")
        tenant_id = default_tenant.id

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    slug = payload.slug or slugify(payload.name)
    existing = db.query(Workspace).filter(Workspace.tenant_id == tenant_id, Workspace.slug == slug).first()
    if existing:
        import uuid
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    workspace = Workspace(
        tenant_id=tenant_id,
        name=payload.name.strip(),
        slug=slug,
        description=payload.description or "",
        is_shared=payload.is_shared,
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    return WorkspaceOut(
        id=workspace.id,
        tenant_id=workspace.tenant_id,
        name=workspace.name,
        slug=workspace.slug,
        description=workspace.description or "",
        is_shared=workspace.is_shared,
        owner_user_id=workspace.owner_user_id,
        owner_name=None,
        tenant_name=tenant.name,
        project_count=0,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
    )

@router.get("/{workspace_id}", response_model=WorkspaceOut)
def get_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
):
    """Get workspace details."""
    w = db.query(Workspace).filter((Workspace.id == workspace_id) | (Workspace.slug == workspace_id)).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    p_count = db.query(func.count(Project.id)).filter(Project.workspace_id == w.id).scalar() or 0
    return WorkspaceOut(
        id=w.id,
        tenant_id=w.tenant_id,
        name=w.name,
        slug=w.slug,
        description=w.description or "",
        is_shared=w.is_shared,
        owner_user_id=w.owner_user_id,
        owner_name=w.owner.name if w.owner else None,
        tenant_name=w.tenant.name if w.tenant else None,
        project_count=p_count,
        created_at=w.created_at,
        updated_at=w.updated_at,
    )

@router.put("/{workspace_id}", response_model=WorkspaceOut)
def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdate,
    db: Session = Depends(get_db),
):
    """Update workspace details."""
    w = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    if payload.name is not None:
        w.name = payload.name.strip()
    if payload.description is not None:
        w.description = payload.description
    if payload.is_shared is not None:
        w.is_shared = payload.is_shared

    db.commit()
    db.refresh(w)

    p_count = db.query(func.count(Project.id)).filter(Project.workspace_id == w.id).scalar() or 0
    return WorkspaceOut(
        id=w.id,
        tenant_id=w.tenant_id,
        name=w.name,
        slug=w.slug,
        description=w.description or "",
        is_shared=w.is_shared,
        owner_user_id=w.owner_user_id,
        owner_name=w.owner.name if w.owner else None,
        tenant_name=w.tenant.name if w.tenant else None,
        project_count=p_count,
        created_at=w.created_at,
        updated_at=w.updated_at,
    )

@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
):
    """Delete a workspace."""
    w = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    db.delete(w)
    db.commit()
    return {"status": "success", "message": f"Workspace '{w.name}' deleted."}
