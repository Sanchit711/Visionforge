from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Tenant, Workspace, Project
from app.schemas.schemas import LoginRequest, RegisterRequest, AuthResponse
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_session,
    get_session,
    invalidate_session,
    ROLES_PERMISSIONS,
)

router = APIRouter()

@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    """Log in with email and password."""
    email = payload.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Contact your administrator.")

    # Verify password (demo accounts accept 'password123' if not hashed yet)
    is_valid = False
    if not user.password_hash:
        if payload.password == "password123":
            user.password_hash = hash_password(payload.password)
            db.commit()
            is_valid = True
    else:
        is_valid = verify_password(payload.password, user.password_hash)

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    tenant = user.tenant
    if not tenant:
        tenant = db.query(Tenant).first()

    # Get accessible workspaces for this tenant & user
    workspaces = db.query(Workspace).filter(Workspace.tenant_id == tenant.id).all()
    ws_list = []
    for w in workspaces:
        p_count = db.query(func.count(Project.id)).filter(Project.workspace_id == w.id).scalar() or 0
        ws_list.append({
            "id": w.id,
            "name": w.name,
            "slug": w.slug,
            "is_shared": w.is_shared,
            "description": w.description or "",
            "project_count": p_count,
        })

    token = create_session(user.id, user.email, user.role, tenant.id)
    role_info = ROLES_PERMISSIONS.get(user.role.lower(), ROLES_PERMISSIONS["annotator"])

    return AuthResponse(
        token=token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "role_title": role_info["title"],
            "avatar_url": user.avatar_url or "",
            "is_active": user.is_active,
            "tenant_id": user.tenant_id,
            "tenant_name": tenant.name,
        },
        tenant={
            "id": tenant.id,
            "name": tenant.name,
            "slug": tenant.slug,
            "plan": tenant.plan or "enterprise",
        },
        workspaces=ws_list,
        permissions=role_info.get("permissions", []),
        allowed_stages=role_info.get("allowed_stages", []),
    )

@router.post("/register", response_model=AuthResponse)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    """Register a new user account with email and password."""
    email = payload.email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    tenant_id = payload.tenant_id
    if not tenant_id:
        default_tenant = db.query(Tenant).first()
        if not default_tenant:
            default_tenant = Tenant(name="Enterprise Global", slug="enterprise-global", plan="enterprise")
            db.add(default_tenant)
            db.commit()
            db.refresh(default_tenant)
        tenant_id = default_tenant.id

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()

    pwd_hash = hash_password(payload.password)
    new_user = User(
        tenant_id=tenant_id,
        name=payload.name.strip(),
        email=email,
        password_hash=pwd_hash,
        role=payload.role or "annotator",
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Automatically create user's personal private workspace
    user_ws = Workspace(
        tenant_id=tenant_id,
        name=f"{new_user.name}'s Personal Workspace",
        slug=f"user-{new_user.id[:8]}",
        is_shared=False,
        owner_user_id=new_user.id,
    )
    db.add(user_ws)
    db.commit()

    token = create_session(new_user.id, new_user.email, new_user.role, tenant_id)
    role_info = ROLES_PERMISSIONS.get(new_user.role.lower(), ROLES_PERMISSIONS["annotator"])

    # Load workspaces
    workspaces = db.query(Workspace).filter(Workspace.tenant_id == tenant_id).all()
    ws_list = [
        {
            "id": w.id,
            "name": w.name,
            "slug": w.slug,
            "is_shared": w.is_shared,
            "description": w.description or "",
            "project_count": 0,
        }
        for w in workspaces
    ]

    return AuthResponse(
        token=token,
        user={
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role,
            "role_title": role_info["title"],
            "avatar_url": "",
            "is_active": True,
            "tenant_id": tenant_id,
            "tenant_name": tenant.name,
        },
        tenant={
            "id": tenant.id,
            "name": tenant.name,
            "slug": tenant.slug,
            "plan": tenant.plan or "enterprise",
        },
        workspaces=ws_list,
        permissions=role_info.get("permissions", []),
        allowed_stages=role_info.get("allowed_stages", []),
    )

@router.get("/me")
def get_current_auth(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Retrieve current authenticated user, role permissions, and workspace context."""
    user = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        session = get_session(token)
        if session:
            user = db.query(User).filter(User.id == session["user_id"]).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Missing, invalid, or expired session token."
        )

    tenant = user.tenant or db.query(Tenant).first()
    role_key = (user.role or "annotator").lower()
    role_info = ROLES_PERMISSIONS.get(role_key, ROLES_PERMISSIONS["annotator"])

    workspaces = db.query(Workspace).filter(Workspace.tenant_id == tenant.id).all()
    ws_list = []
    for w in workspaces:
        p_count = db.query(func.count(Project.id)).filter(Project.workspace_id == w.id).scalar() or 0
        ws_list.append({
            "id": w.id,
            "name": w.name,
            "slug": w.slug,
            "is_shared": w.is_shared,
            "description": w.description or "",
            "project_count": p_count,
        })

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "role_title": role_info.get("title", user.role.capitalize()),
            "badge_color": role_info.get("badge_color", "slate"),
            "avatar_url": user.avatar_url or "",
            "is_active": user.is_active,
            "tenant_id": user.tenant_id,
            "tenant_name": tenant.name if tenant else "Default Tenant",
        },
        "tenant": {
            "id": tenant.id if tenant else "",
            "name": tenant.name if tenant else "Default Tenant",
            "slug": tenant.slug if tenant else "default",
            "plan": (tenant.plan if tenant else "enterprise") or "enterprise",
        },
        "workspaces": ws_list,
        "permissions": role_info.get("permissions", []),
        "allowed_stages": role_info.get("allowed_stages", []),
    }

@router.get("/demo-users")
def get_demo_users(db: Session = Depends(get_db)):
    """Return available seeded demo users for quick 1-click RBAC testing."""
    users = db.query(User).filter(User.is_active == True).all()
    results = []
    for u in users:
        role_key = (u.role or "annotator").lower()
        role_info = ROLES_PERMISSIONS.get(role_key, {})
        results.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "role_title": role_info.get("title", u.role.capitalize()),
            "badge_color": role_info.get("badge_color", "slate"),
            "description": role_info.get("description", ""),
            "allowed_stages": role_info.get("allowed_stages", []),
            "tenant_id": u.tenant_id,
            "tenant_name": u.tenant.name if u.tenant else "Default Tenant",
            "password_hint": "password123",
        })
    return results

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    """Log out active session."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        invalidate_session(token)
    return {"status": "success", "message": "Logged out successfully."}

@router.get("/roles")
def get_roles_and_responsibilities():
    """Return the complete RBAC Matrix of roles, descriptions, and granular permissions."""
    return ROLES_PERMISSIONS
