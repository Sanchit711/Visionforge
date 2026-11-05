import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    plan = Column(String(50), default="enterprise")  # enterprise, pro, starter
    settings_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", back_populates="tenant", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), default="")  # Salted SHA-256 password hash
    role = Column(String(50), default="admin")  # admin, annotator, reviewer, engineer
    avatar_url = Column(String(512), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")
    projects = relationship("Project", back_populates="creator")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text, default="")
    is_shared = Column(Boolean, default=True)  # True = shared team workspace, False = personal/private
    owner_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    settings_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="workspaces")
    owner = relationship("User", foreign_keys=[owner_user_id])
    projects = relationship("Project", back_populates="workspace")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True)
    created_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, default="")
    task_type = Column(String(50), default="detection")  # detection, segmentation
    classes = Column(JSON, default=list)  # [{"id": 0, "name": "person", "color": "#3b82f6"}]
    storage_path = Column(String(512), default="")
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="projects")
    workspace = relationship("Workspace", back_populates="projects")
    creator = relationship("User", back_populates="projects")
    videos = relationship("Video", back_populates="project", cascade="all, delete-orphan")
    frames = relationship("Frame", back_populates="project", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="project", cascade="all, delete-orphan")
    dataset_versions = relationship("DatasetVersion", back_populates="project", cascade="all, delete-orphan")
    experiments = relationship("Experiment", back_populates="project", cascade="all, delete-orphan")
    registered_models = relationship("RegisteredModel", back_populates="project", cascade="all, delete-orphan")
    activities = relationship("ActivityLog", back_populates="project", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)
    duration = Column(Float, default=0.0)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    fps = Column(Float, default=0.0)
    total_frames = Column(Integer, default=0)
    codec = Column(String(50), default="")
    status = Column(String(50), default="ready")  # uploaded, ready, processing, error
    trim_start = Column(Float, default=0.0)
    trim_end = Column(Float, default=0.0)
    crop_box = Column(JSON, default=dict)  # {"x": 0, "y": 0, "w": 0, "h": 0, "normalized": false}
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="videos")
    frames = relationship("Frame", back_populates="video", cascade="all, delete-orphan")


class Frame(Base):
    __tablename__ = "frames"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=True)
    frame_index = Column(Integer, default=0)
    timestamp_sec = Column(Float, default=0.0)
    file_path = Column(String(512), nullable=False)
    thumbnail_path = Column(String(512), default="")
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    sharpness_score = Column(Float, default=0.0)
    is_duplicate = Column(Boolean, default=False)
    split = Column(String(20), default="unassigned")  # train, val, test, unassigned
    status = Column(String(50), default="unreviewed")  # unreviewed, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="frames")
    video = relationship("Video", back_populates="frames")
    annotations = relationship("Annotation", back_populates="frame", cascade="all, delete-orphan")


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    frame_id = Column(String(36), ForeignKey("frames.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, nullable=False)
    class_name = Column(String(100), nullable=False)
    annotation_type = Column(String(50), default="bbox")  # bbox, polygon, mask
    coordinates = Column(JSON, nullable=False)  # bbox: [x, y, w, h] normalized; polygon: [[x,y],...]
    confidence = Column(Float, default=1.0)
    source = Column(String(50), default="manual")  # manual, yolo_assisted, sam_assisted, propagated
    is_reviewed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    frame = relationship("Frame", back_populates="annotations")
    project = relationship("Project", back_populates="annotations")


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version_name = Column(String(50), nullable=False)  # "v1.0"
    description = Column(Text, default="")
    total_images = Column(Integer, default=0)
    total_annotations = Column(Integer, default=0)
    train_count = Column(Integer, default=0)
    val_count = Column(Integer, default=0)
    test_count = Column(Integer, default=0)
    class_counts = Column(JSON, default=dict)  # {"person": 150, "car": 42}
    manifest_path = Column(String(512), default="")
    zip_export_path = Column(String(512), default="")
    yaml_path = Column(String(512), default="")
    is_frozen = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="dataset_versions")
    experiments = relationship("Experiment", back_populates="dataset_version")


class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    dataset_version_id = Column(String(36), ForeignKey("dataset_versions.id"), nullable=True)
    name = Column(String(255), nullable=False)
    model_variant = Column(String(100), default="yolov8n.pt")
    base_weights_path = Column(String(512), default="")
    epochs = Column(Integer, default=50)
    batch_size = Column(Integer, default=16)
    img_size = Column(Integer, default=640)
    optimizer = Column(String(50), default="auto")
    lr0 = Column(Float, default=0.01)
    device = Column(String(50), default="cpu")
    status = Column(String(50), default="queued")  # queued, running, completed, failed, stopped
    current_epoch = Column(Integer, default=0)
    total_epochs = Column(Integer, default=0)
    train_box_loss = Column(Float, default=0.0)
    train_cls_loss = Column(Float, default=0.0)
    val_box_loss = Column(Float, default=0.0)
    val_cls_loss = Column(Float, default=0.0)
    precision = Column(Float, default=0.0)
    recall = Column(Float, default=0.0)
    map50 = Column(Float, default=0.0)
    map50_95 = Column(Float, default=0.0)
    best_map50 = Column(Float, default=0.0)
    best_epoch = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    checkpoints_dir = Column(String(512), default="")
    log_file_path = Column(String(512), default="")
    metrics_history = Column(JSON, default=list)  # list of epoch metric dicts
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="experiments")
    dataset_version = relationship("DatasetVersion", back_populates="experiments")
    registered_models = relationship("RegisteredModel", back_populates="experiment")


class RegisteredModel(Base):
    __tablename__ = "registered_models"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    experiment_id = Column(String(36), ForeignKey("experiments.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    version = Column(String(50), default="v1.0")
    file_path = Column(String(512), nullable=False)
    format = Column(String(50), default="pt")  # pt, onnx, engine
    file_size = Column(Integer, default=0)
    sha256_checksum = Column(String(64), default="")
    num_classes = Column(Integer, default=0)
    class_names = Column(JSON, default=list)
    metrics = Column(JSON, default=dict)  # {"map50": 0.88, "precision": 0.91, ...}
    stage = Column(String(50), default="experimental")  # experimental, staging, production
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="registered_models")
    experiment = relationship("Experiment", back_populates="registered_models")


class ComputeRuntime(Base):
    __tablename__ = "compute_runtimes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    provider = Column(String(50), default="local")  # local, remote_ssh, jetson, colab
    host = Column(String(255), default="localhost")
    status = Column(String(50), default="online")  # online, busy, offline, disabled
    device_name = Column(String(255), default="CPU")
    gpu_model = Column(String(255), default="")
    vram_total_mb = Column(Integer, default=0)
    vram_free_mb = Column(Integer, default=0)
    ram_total_mb = Column(Integer, default=0)
    ram_free_mb = Column(Integer, default=0)
    disk_free_gb = Column(Float, default=0.0)
    is_active = Column(Boolean, default=False)
    priority = Column(Integer, default=1)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    error_reason = Column(Text, default="")
    config_json = Column(JSON, default=dict)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(50), nullable=False)  # video_crop, frame_extract, ai_annotate, batch_propagate, dataset_export, train, validate
    status = Column(String(50), default="pending")  # pending, running, completed, failed, cancelled
    progress = Column(Float, default=0.0)  # 0.0 - 100.0
    message = Column(String(512), default="")
    result_json = Column(JSON, default=dict)
    error_detail = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CropPreset(Base):
    __tablename__ = "crop_presets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, unique=True)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    is_normalized = Column(Boolean, default=True)
    aspect_ratio = Column(String(50), default="custom")
    created_at = Column(DateTime, default=datetime.utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(50), nullable=False)  # video, frame, annotation, dataset, training, validation
    action = Column(String(255), nullable=False)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="activities")
