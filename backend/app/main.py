# ==============================================================================
# VisionForge Studio - Industrial Computer Vision & Video Forensic Suite
# Copyright (C) 2026 VisionForge Studio. All rights reserved.
# Licensed under VisionForge Community Source-Available License (v1.0)
# ==============================================================================

import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import init_db, SessionLocal
from app.api.v1.router import api_router
from app.services.runtime_service import runtime_service
from app.services.video_service import video_service
from app.models import Project, Video, CropPreset, Tenant, User, Workspace
from app.services.auth_service import hash_password

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure directories and database initialized
    settings.ensure_directories()
    init_db()
    runtime_service.initialize_default_runtimes()

    # Seed default Workspace Tenants and Users if needed
    db = SessionLocal()
    try:
        default_tenant = db.query(Tenant).filter(Tenant.slug == "svg-global").first()
        if not default_tenant:
            default_tenant = Tenant(
                name="SVG Enterprise Global",
                slug="svg-global",
                plan="enterprise",
                settings_json={"industry": "Logistics & Manufacturing", "retention_days": 90},
            )
            db.add(default_tenant)
            db.flush()

        # Demo secondary workspace
        partner_tenant = db.query(Tenant).filter(Tenant.slug == "partner-robotics").first()
        if not partner_tenant:
            partner_tenant = Tenant(
                name="Robotics Partner Lab",
                slug="partner-robotics",
                plan="pro",
                settings_json={"industry": "Autonomous Robotics", "retention_days": 30},
            )
            db.add(partner_tenant)
            db.flush()

        # Seed primary admin user (VisionForge Admin)
        admin_user = db.query(User).filter((User.email == "admin@visionforge.ai") | (User.role == "admin")).first()
        if not admin_user:
            admin_user = User(
                tenant_id=default_tenant.id,
                name="Admin",
                email="admin@visionforge.ai",
                password_hash=hash_password("password123"),
                role="admin",
                avatar_url="",
            )
            db.add(admin_user)
            db.flush()
        else:
            admin_user.name = "Admin"
            admin_user.email = "admin@visionforge.ai"
            if not admin_user.password_hash:
                admin_user.password_hash = hash_password("password123")

        # Seed additional workspace team members with default passwords
        if not db.query(User).filter(User.email == "alex@visionforge.ai").first():
            db.add(User(
                tenant_id=default_tenant.id,
                name="Alex Chen",
                email="alex@visionforge.ai",
                password_hash=hash_password("password123"),
                role="engineer",
            ))
        if not db.query(User).filter(User.email == "marcus@visionforge.ai").first():
            db.add(User(
                tenant_id=default_tenant.id,
                name="Marcus Vance",
                email="marcus@visionforge.ai",
                password_hash=hash_password("password123"),
                role="reviewer",
            ))
        if not db.query(User).filter(User.email == "elena@visionforge.ai").first():
            db.add(User(
                tenant_id=default_tenant.id,
                name="Elena Rostova",
                email="elena@visionforge.ai",
                password_hash=hash_password("password123"),
                role="annotator",
            ))
        if not db.query(User).filter(User.email == "sarah@visionforge.ai").first():
            db.add(User(
                tenant_id=default_tenant.id,
                name="Sarah Jenkins",
                email="sarah@visionforge.ai",
                password_hash=hash_password("password123"),
                role="viewer",
            ))
        if not db.query(User).filter(User.email == "partner@visionforge.ai").first():
            db.add(User(
                tenant_id=partner_tenant.id,
                name="Industrial Partner",
                email="partner@visionforge.ai",
                password_hash=hash_password("password123"),
                role="admin",
            ))

        # Ensure all existing users have password_hash populated
        for u in db.query(User).all():
            if not u.password_hash:
                u.password_hash = hash_password("password123")
        db.commit()

        # Seed Workspaces (Shared & Private) for default tenant
        primary_shared_ws = db.query(Workspace).filter(Workspace.slug == "svg-production").first()
        if not primary_shared_ws:
            primary_shared_ws = Workspace(
                tenant_id=default_tenant.id,
                name="SVG Production & Conveyor Lab (Shared)",
                slug="svg-production",
                description="Main shared team workspace for conveyor video ingestion, auto-tracking & YOLO datasets",
                is_shared=True,
                owner_user_id=admin_user.id,
            )
            db.add(primary_shared_ws)
            db.flush()

        qa_shared_ws = db.query(Workspace).filter(Workspace.slug == "warehouse-qa").first()
        if not qa_shared_ws:
            qa_shared_ws = Workspace(
                tenant_id=default_tenant.id,
                name="Warehouse QA & Review (Shared)",
                slug="warehouse-qa",
                description="Shared workspace for reviewing and validating automated annotations",
                is_shared=True,
                owner_user_id=admin_user.id,
            )
            db.add(qa_shared_ws)
            db.flush()

        private_ws = db.query(Workspace).filter((Workspace.slug == "admin-private") | (~Workspace.is_shared)).first()
        if not private_ws:
            private_ws = Workspace(
                tenant_id=default_tenant.id,
                name="Admin Private Sandbox (Private)",
                slug="admin-private",
                description="Personal isolated workspace for experimental models and test videos",
                is_shared=False,
                owner_user_id=admin_user.id,
            )
            db.add(private_ws)
            db.flush()
        else:
            private_ws.name = "Admin Private Sandbox (Private)"
            private_ws.slug = "admin-private"

        # Seed partner shared workspace
        partner_ws = db.query(Workspace).filter(Workspace.slug == "partner-assembly").first()
        if not partner_ws:
            partner_ws = Workspace(
                tenant_id=partner_tenant.id,
                name="Partner Assembly & Robotics (Shared)",
                slug="partner-assembly",
                description="Robotics inspection line workspace",
                is_shared=True,
            )
            db.add(partner_ws)
            db.flush()

        db.commit()

        # Associate any unassigned projects with default tenant, workspace, and user
        all_projects = db.query(Project).all()
        for p in all_projects:
            if not p.tenant_id:
                p.tenant_id = default_tenant.id
            if not p.workspace_id:
                p.workspace_id = primary_shared_ws.id
            if not p.created_by_user_id:
                p.created_by_user_id = admin_user.id
        db.commit()

        # Seed demo project if database has no projects at all
        if db.query(Project).count() == 0:
            demo_proj = Project(
                tenant_id=default_tenant.id,
                created_by_user_id=admin_user.id,
                name="VisionForge Demo - Traffic & Workplace Safety",
                description="End-to-end demo project featuring video ingestion, ROI cropping, AI annotation, and YOLO fine-tuning.",
                task_type="detection",
                classes=[
                    {"id": 0, "name": "person", "color": "#3b82f6", "hotkey": "1"},
                    {"id": 1, "name": "car", "color": "#10b981", "hotkey": "2"},
                    {"id": 2, "name": "forklift", "color": "#f59e0b", "hotkey": "3"},
                ],
            )
            db.add(demo_proj)
            db.commit()
            db.refresh(demo_proj)

            # Generate sample synthetic video for instant testing
            sample_vid_path = settings.VIDEOS_DIR / f"demo_traffic_{demo_proj.id[:8]}.mp4"
            video_service.generate_synthetic_video(
                output_path=str(sample_vid_path),
                num_frames=90,
                fps=24,
                width=640,
                height=480,
            )
            meta = video_service.inspect_video(str(sample_vid_path))

            demo_vid = Video(
                project_id=demo_proj.id,
                filename=sample_vid_path.name,
                file_path=str(sample_vid_path.resolve()),
                original_filename="sample_traffic_cctv.mp4",
                file_size=meta["file_size"],
                duration=meta["duration"],
                width=meta["width"],
                height=meta["height"],
                fps=meta["fps"],
                total_frames=meta["total_frames"],
                codec=meta["codec"],
                status="ready",
                trim_start=0.0,
                trim_end=meta["duration"],
                crop_box={"x": 0.05, "y": 0.1, "w": 0.9, "h": 0.8, "normalized": True},
            )
            db.add(demo_vid)

            # Add default crop presets
            p1 = CropPreset(name="Square 1:1 ROI", x=0.1, y=0.1, width=0.8, height=0.8, is_normalized=True, aspect_ratio="1:1")
            p2 = CropPreset(name="Entrance Focus 16:9", x=0.0, y=0.2, width=1.0, height=0.56, is_normalized=True, aspect_ratio="16:9")
            db.add_all([p1, p2])

            db.commit()
    finally:
        db.close()

    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Unified AI/ML Dataset, Annotation, Training & Compute Studio",
    version=settings.VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Static Verification Media mounting for instant in-browser playback
verification_media_dir = Path.cwd() / "verification_media"
if not verification_media_dir.exists():
    verification_media_dir = settings.BASE_DIR / "verification_media"
if not verification_media_dir.exists():
    verification_media_dir = Path(__file__).resolve().parent.parent.parent / "verification_media"
if verification_media_dir.exists():
    app.mount("/verification_media", StaticFiles(directory=str(verification_media_dir)), name="verification_media")

# Static Frontend mounting if built
frontend_dist = settings.BASE_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "app": settings.APP_NAME,
            "version": settings.VERSION,
            "status": "online",
            "docs_url": "/docs",
            "api_prefix": settings.API_V1_PREFIX,
        }
