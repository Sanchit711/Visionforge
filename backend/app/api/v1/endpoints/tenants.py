from typing import List, Optional
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Tenant, User, Project
from app.schemas.schemas import TenantCreate, TenantUpdate, TenantOut, UserCreate, UserOut

router = APIRouter()

def slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", slug)

@router.get("", response_model=List[TenantOut])
def list_tenants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List all workspace tenants with user and project counts."""
    tenants = db.query(Tenant).offset(skip).limit(limit).all()
    results = []
    for t in tenants:
        u_count = db.query(func.count(User.id)).filter(User.tenant_id == t.id).scalar() or 0
        p_count = db.query(func.count(Project.id)).filter(Project.tenant_id == t.id).scalar() or 0
        t_out = TenantOut(
            id=t.id,
            name=t.name,
            slug=t.slug,
            plan=t.plan or "enterprise",
            settings_json=t.settings_json or {},
            created_at=t.created_at,
            updated_at=t.updated_at,
            user_count=u_count,
            project_count=p_count,
        )
        results.append(t_out)
    return results

@router.post("", response_model=TenantOut)
def create_tenant(
    payload: TenantCreate,
    db: Session = Depends(get_db),
):
    """Create a new workspace tenant."""
    slug = payload.slug or slugify(payload.name)
    existing = db.query(Tenant).filter(Tenant.slug == slug).first()
    if existing:
        # Append unique suffix
        import uuid
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    tenant = Tenant(
        name=payload.name,
        slug=slug,
        plan=payload.plan or "enterprise",
        settings_json=payload.settings_json or {},
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    # Automatically create a default Admin user for this new workspace
    admin_user = User(
        tenant_id=tenant.id,
        name=f"{payload.name} Admin",
        email=f"admin@{tenant.slug}.local",
        role="admin",
    )
    db.add(admin_user)
    db.commit()

    return TenantOut(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        plan=tenant.plan,
        settings_json=tenant.settings_json or {},
        created_at=tenant.created_at,
        updated_at=tenant.updated_at,
        user_count=1,
        project_count=0,
    )

@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
):
    """Get tenant by ID or slug."""
    tenant = db.query(Tenant).filter((Tenant.id == tenant_id) | (Tenant.slug == tenant_id)).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant workspace not found")

    u_count = db.query(func.count(User.id)).filter(User.tenant_id == tenant.id).scalar() or 0
    p_count = db.query(func.count(Project.id)).filter(Project.tenant_id == tenant.id).scalar() or 0

    return TenantOut(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        plan=tenant.plan or "enterprise",
        settings_json=tenant.settings_json or {},
        created_at=tenant.created_at,
        updated_at=tenant.updated_at,
        user_count=u_count,
        project_count=p_count,
    )

@router.put("/{tenant_id}", response_model=TenantOut)
def update_tenant(
    tenant_id: str,
    payload: TenantUpdate,
    db: Session = Depends(get_db),
):
    """Update tenant information."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant workspace not found")

    if payload.name is not None:
        tenant.name = payload.name
    if payload.plan is not None:
        tenant.plan = payload.plan
    if payload.settings_json is not None:
        tenant.settings_json = payload.settings_json

    db.commit()
    db.refresh(tenant)

    u_count = db.query(func.count(User.id)).filter(User.tenant_id == tenant.id).scalar() or 0
    p_count = db.query(func.count(Project.id)).filter(Project.tenant_id == tenant.id).scalar() or 0

    return TenantOut(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        plan=tenant.plan,
        settings_json=tenant.settings_json or {},
        created_at=tenant.created_at,
        updated_at=tenant.updated_at,
        user_count=u_count,
        project_count=p_count,
    )

@router.get("/{tenant_id}/users", response_model=List[UserOut])
def list_tenant_users(
    tenant_id: str,
    db: Session = Depends(get_db),
):
    """List all users belonging to this tenant."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant workspace not found")

    users = db.query(User).filter(User.tenant_id == tenant_id).all()
    return [
        UserOut(
            id=u.id,
            tenant_id=u.tenant_id,
            name=u.name,
            email=u.email,
            role=u.role,
            avatar_url=u.avatar_url or "",
            is_active=u.is_active,
            created_at=u.created_at,
            tenant_name=tenant.name,
        )
        for u in users
    ]

@router.post("/{tenant_id}/users", response_model=UserOut)
def add_user_to_tenant(
    tenant_id: str,
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    """Add a new user member to the tenant workspace."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant workspace not found")

    existing_email = db.query(User).filter(User.email == payload.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user = User(
        tenant_id=tenant_id,
        name=payload.name,
        email=payload.email,
        role=payload.role or "annotator",
        avatar_url=payload.avatar_url or "",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserOut(
        id=user.id,
        tenant_id=user.tenant_id,
        name=user.name,
        email=user.email,
        role=user.role,
        avatar_url=user.avatar_url or "",
        is_active=user.is_active,
        created_at=user.created_at,
        tenant_name=tenant.name,
    )
