from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Tenant
from app.schemas.schemas import UserCreate, UserUpdate, UserOut

router = APIRouter()

@router.get("", response_model=List[UserOut])
def list_users(
    tenant_id: Optional[str] = Query(None, description="Filter users by tenant ID"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List users, optionally filtered by tenant workspace."""
    query = db.query(User)
    if tenant_id:
        query = query.filter(User.tenant_id == tenant_id)
    users = query.offset(skip).limit(limit).all()

    results = []
    for u in users:
        t_name = u.tenant.name if u.tenant else "Default"
        results.append(
            UserOut(
                id=u.id,
                tenant_id=u.tenant_id,
                name=u.name,
                email=u.email,
                role=u.role,
                avatar_url=u.avatar_url or "",
                is_active=u.is_active,
                created_at=u.created_at,
                tenant_name=t_name,
            )
        )
    return results

@router.get("/me", response_model=UserOut)
def get_current_user_profile(
    db: Session = Depends(get_db),
):
    """Return the currently active user profile (defaults to primary admin user)."""
    user = db.query(User).filter(User.role == "admin").first()
    if not user:
        user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="No users found in system")

    t_name = user.tenant.name if user.tenant else "Default"
    return UserOut(
        id=user.id,
        tenant_id=user.tenant_id,
        name=user.name,
        email=user.email,
        role=user.role,
        avatar_url=user.avatar_url or "",
        is_active=user.is_active,
        created_at=user.created_at,
        tenant_name=t_name,
    )

@router.post("", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    """Create a new user account."""
    tenant = db.query(Tenant).filter(Tenant.id == payload.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant workspace not found")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user = User(
        tenant_id=payload.tenant_id,
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

@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
):
    """Get user details by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    t_name = user.tenant.name if user.tenant else "Default"
    return UserOut(
        id=user.id,
        tenant_id=user.tenant_id,
        name=user.name,
        email=user.email,
        role=user.role,
        avatar_url=user.avatar_url or "",
        is_active=user.is_active,
        created_at=user.created_at,
        tenant_name=t_name,
    )

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
):
    """Update user information or role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        user.email = payload.email
    if payload.role is not None:
        user.role = payload.role
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)

    t_name = user.tenant.name if user.tenant else "Default"
    return UserOut(
        id=user.id,
        tenant_id=user.tenant_id,
        name=user.name,
        email=user.email,
        role=user.role,
        avatar_url=user.avatar_url or "",
        is_active=user.is_active,
        created_at=user.created_at,
        tenant_name=t_name,
    )
