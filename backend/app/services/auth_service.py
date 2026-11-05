import base64
import hashlib
import hmac
import os
import secrets
import time
from typing import Optional, Dict, Any, List

# Global in-memory token session cache
_ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}
_SECRET_KEY = os.getenv("VF_AUTH_SECRET", "visionforge_enterprise_rbac_hmac_secret_2026")

def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Generate salted SHA-256 hash formatted as salt$hash."""
    if not salt:
        salt = secrets.token_hex(16)
    combined = f"{salt}:{password}".encode("utf-8")
    pwd_hash = hashlib.sha256(combined).hexdigest()
    return f"{salt}${pwd_hash}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored salt$hash."""
    if not stored_hash:
        return False
    # If unhashed demo password stored directly
    if "$" not in stored_hash:
        return password == stored_hash
    salt, expected_hash = stored_hash.split("$", 1)
    test_hash = hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()
    return secrets.compare_digest(expected_hash, test_hash)

def create_session(user_id: str, email: str, role: str, tenant_id: str) -> str:
    """Create a new signed session token valid for 7 days that survives server reboots."""
    expires_at = int(time.time() + (7 * 24 * 3600))
    nonce = secrets.token_hex(8)
    payload_str = f"{user_id}|{email}|{role}|{tenant_id}|{expires_at}|{nonce}"
    sig = hmac.new(_SECRET_KEY.encode("utf-8"), payload_str.encode("utf-8"), hashlib.sha256).hexdigest()[:32]
    encoded = base64.urlsafe_b64encode(f"{payload_str}|{sig}".encode("utf-8")).decode("utf-8")
    token = f"vf_sec_{encoded}"

    _ACTIVE_SESSIONS[token] = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "tenant_id": tenant_id,
        "expires_at": expires_at,
    }
    return token

def get_session(token: str) -> Optional[Dict[str, Any]]:
    """Retrieve active session if valid and not expired."""
    if not token:
        return None

    # Check cache first
    session = _ACTIVE_SESSIONS.get(token)
    if session:
        if time.time() > session["expires_at"]:
            _ACTIVE_SESSIONS.pop(token, None)
            return None
        return session

    # Otherwise decode signed token to survive server restarts
    if token.startswith("vf_sec_"):
        try:
            raw_b64 = token[7:]
            decoded = base64.urlsafe_b64decode(raw_b64.encode("utf-8")).decode("utf-8")
            parts = decoded.split("|")
            if len(parts) == 7:
                user_id, email, role, tenant_id, exp_str, nonce, sig = parts
                expires_at = int(exp_str)
                if time.time() > expires_at:
                    return None
                payload_str = f"{user_id}|{email}|{role}|{tenant_id}|{expires_at}|{nonce}"
                expected_sig = hmac.new(_SECRET_KEY.encode("utf-8"), payload_str.encode("utf-8"), hashlib.sha256).hexdigest()[:32]
                if secrets.compare_digest(sig, expected_sig):
                    sess = {
                        "user_id": user_id,
                        "email": email,
                        "role": role,
                        "tenant_id": tenant_id,
                        "expires_at": expires_at,
                    }
                    _ACTIVE_SESSIONS[token] = sess
                    return sess
        except Exception:
            pass

    return None

def invalidate_session(token: str) -> bool:
    """Log out / invalidate token."""
    if token in _ACTIVE_SESSIONS:
        del _ACTIVE_SESSIONS[token]
        return True
    return False

ROLES_PERMISSIONS: Dict[str, Dict[str, Any]] = {
    "admin": {
        "title": "Organization Administrator",
        "description": "Full root governance across organization tenants, workspaces, users, API keys, models, and runtimes.",
        "badge_color": "emerald",
        "allowed_stages": [
            "overview", "projects", "video_lab", "frame_studio", "annotation",
            "datasets", "training", "experiments", "model_registry", "validation",
            "runtimes", "integrations", "settings"
        ],
        "responsibilities": [
            "Organization & Multi-Tenant Governance",
            "Create & Delete Workspaces (Shared or Private)",
            "Invite Team Members & Assign RBAC Roles",
            "Manage Projects, Datasets & Export Packages",
            "Model Registry Production Deployment & Compute Runtimes",
            "Access to All 13 Mission Stages & Root Settings"
        ],
        "permissions": [
            "*",
            "workspaces:create", "workspaces:delete", "workspaces:manage",
            "users:invite", "users:manage", "users:roles",
            "projects:create", "projects:delete", "projects:export",
            "annotations:create", "annotations:edit", "annotations:delete", "annotations:review",
            "training:start", "training:stop", "training:colab",
            "models:register", "models:promote", "models:delete",
            "runtimes:manage", "settings:manage"
        ]
    },
    "engineer": {
        "title": "ML / AI Systems Engineer",
        "description": "Configures YOLO & SAM fine-tuning pipelines, executes Colab GPU runs, evaluates validation benchmarks, and manages model weights.",
        "badge_color": "purple",
        "allowed_stages": [
            "overview", "projects", "video_lab", "frame_studio", "annotation",
            "datasets", "training", "experiments", "model_registry", "validation",
            "runtimes", "integrations"
        ],
        "responsibilities": [
            "YOLO Training Hyperparameter Setup & Experiment Runs",
            "Colab Automated Cloud GPU Training Execution",
            "Loss & mAP Curve Analysis & Weight Optimization",
            "Compute Hardware & Remote Worker Configuration",
            "Model Registry Staging & Inference Benchmarking"
        ],
        "permissions": [
            "workspaces:read",
            "projects:read", "projects:create",
            "training:start", "training:stop", "training:colab",
            "models:register", "models:stage", "validation:run",
            "runtimes:manage", "annotations:create", "annotations:edit"
        ]
    },
    "reviewer": {
        "title": "Dataset QA Lead & Reviewer",
        "description": "Responsible for dataset quality control, reviewing & approving annotations, validating model metrics and split freezing.",
        "badge_color": "indigo",
        "allowed_stages": [
            "overview", "projects", "video_lab", "frame_studio", "annotation",
            "datasets", "experiments", "model_registry", "validation"
        ],
        "responsibilities": [
            "Audit & Review Extracted Frames & Deduplication",
            "Approve or Reject AI-Assisted Annotations",
            "Freeze and Sign-Off on Dataset Versions (Train/Val/Test)",
            "Run Model Inference Benchmark & Validation Suites"
        ],
        "permissions": [
            "workspaces:read",
            "projects:read", "projects:export",
            "annotations:create", "annotations:edit", "annotations:delete", "annotations:review", "annotations:approve", "annotations:reject",
            "datasets:create_version", "validation:run"
        ]
    },
    "annotator": {
        "title": "Annotation Specialist",
        "description": "Performs high-speed manual, SAM 2, and AI-assisted object segmentation and bounding box labeling on conveyor frames.",
        "badge_color": "amber",
        "allowed_stages": [
            "overview", "projects", "video_lab", "frame_studio", "annotation", "datasets"
        ],
        "responsibilities": [
            "Interactive Bounding Box (B) & Polygon (P) Labeling",
            "One-Click SAM 2 Interactive Point (S) & Box (X) Segmentation",
            "Auto-Track Across Video Conveyor Sequences",
            "Class Hotkey Switching & Rapid Verification"
        ],
        "permissions": [
            "workspaces:read",
            "projects:read",
            "annotations:create", "annotations:edit", "annotations:delete",
            "ai:assist", "ai:track"
        ]
    },
    "viewer": {
        "title": "Auditor & Read-Only Observer",
        "description": "Read-only access to view project progress, dataset distributions, validation charts, and forensic model reports.",
        "badge_color": "cyan",
        "allowed_stages": [
            "overview", "projects", "video_lab", "frame_studio", "annotation",
            "datasets", "experiments", "model_registry", "validation"
        ],
        "responsibilities": [
            "Inspect Project Dashboards and Statuses",
            "View Dataset Class Balances and Frame Volumes",
            "Review Validation Benchmark Scores and Confusion Matrices",
            "Audit Forensic Checkpoint Logs Without Modifying Pipeline"
        ],
        "permissions": [
            "workspaces:read",
            "projects:read",
            "datasets:read",
            "models:read",
            "validation:read"
        ]
    }
}
