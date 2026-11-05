from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field

# ----------------- Tenant & User Schemas -----------------
class TenantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = None
    plan: Optional[str] = "enterprise"
    settings_json: Optional[Dict[str, Any]] = None

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    plan: Optional[str] = None
    settings_json: Optional[Dict[str, Any]] = None

class TenantOut(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    settings_json: Dict[str, Any] = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user_count: Optional[int] = 0
    project_count: Optional[int] = 0

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    tenant_id: str
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    password: Optional[str] = "password123"
    role: str = "annotator"  # admin, annotator, reviewer, engineer
    avatar_url: Optional[str] = ""

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(BaseModel):
    id: str
    tenant_id: str
    name: str
    email: str
    role: str
    avatar_url: str = ""
    is_active: bool = True
    created_at: datetime
    tenant_name: Optional[str] = None

    class Config:
        from_attributes = True

# ----------------- Auth & Session Schemas -----------------
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "annotator"
    tenant_id: Optional[str] = None
    workspace_name: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]
    tenant: Dict[str, Any]
    workspaces: List[Dict[str, Any]]
    permissions: List[str]
    allowed_stages: Optional[List[str]] = []

# ----------------- Workspace Schemas -----------------
class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: Optional[str] = None
    description: Optional[str] = ""
    is_shared: bool = True
    tenant_id: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_shared: Optional[bool] = None

class WorkspaceOut(BaseModel):
    id: str
    tenant_id: str
    name: str
    slug: str
    description: str = ""
    is_shared: bool = True
    owner_user_id: Optional[str] = None
    owner_name: Optional[str] = None
    tenant_name: Optional[str] = None
    project_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ----------------- Project Schemas -----------------
class ClassItem(BaseModel):
    id: int
    name: str
    color: str = "#3b82f6"
    hotkey: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = ""
    task_type: str = "detection"
    classes: List[ClassItem] = []
    tenant_id: Optional[str] = None
    workspace_id: Optional[str] = None
    created_by_user_id: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    classes: Optional[List[ClassItem]] = None
    tenant_id: Optional[str] = None
    workspace_id: Optional[str] = None

class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    task_type: str
    classes: List[Any]
    storage_path: str
    tenant_id: Optional[str] = None
    workspace_id: Optional[str] = None
    created_by_user_id: Optional[str] = None
    tenant_name: Optional[str] = None
    workspace_name: Optional[str] = None
    creator_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    video_count: Optional[int] = 0
    frame_count: Optional[int] = 0
    annotation_count: Optional[int] = 0
    dataset_version_count: Optional[int] = 0
    model_count: Optional[int] = 0

    class Config:
        from_attributes = True

# ----------------- Video Schemas -----------------
class CropBox(BaseModel):
    x: float
    y: float
    w: float
    h: float
    normalized: bool = True

class VideoCropRequest(BaseModel):
    crop_box: CropBox
    trim_start: Optional[float] = 0.0
    trim_end: Optional[float] = None
    preset_name: Optional[str] = None

class VideoOut(BaseModel):
    id: str
    project_id: str
    filename: str
    original_filename: str
    file_size: int
    duration: float
    width: int
    height: int
    fps: float
    total_frames: int
    codec: str
    status: str
    trim_start: Optional[float] = 0.0
    trim_end: Optional[float] = None
    crop_box: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Frame Schemas -----------------
class FrameExtractRequest(BaseModel):
    video_id: str
    mode: str = "interval_sec"  # "interval_sec", "interval_frame", "fps", "keyframes", "custom_timestamps"
    interval_value: float = 1.0  # seconds or frames or fps
    min_sharpness: float = 10.0  # blur filtering
    deduplicate: bool = True  # perceptual deduplication
    use_crop: bool = True  # apply current video crop if available
    clear_existing: bool = False  # clear previous frames before extracting
    start_time: Optional[float] = None  # custom start timestamp in seconds
    end_time: Optional[float] = None  # custom end timestamp in seconds
    custom_timestamps: Optional[List[float]] = None  # list of specific timestamps in seconds

class FrameOut(BaseModel):
    id: str
    project_id: str
    video_id: Optional[str] = None
    frame_index: int
    timestamp_sec: float
    file_path: str
    thumbnail_path: str
    width: int
    height: int
    sharpness_score: float
    is_duplicate: bool
    split: str
    status: str
    annotation_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True

class BulkFrameDeleteRequest(BaseModel):
    frame_ids: List[str]

class BulkFrameUpdateRequest(BaseModel):
    frame_ids: List[str]
    split: Optional[str] = None
    status: Optional[str] = None

# ----------------- Annotation Schemas -----------------
class AnnotationCreate(BaseModel):
    frame_id: str
    class_id: int
    class_name: str
    annotation_type: str = "bbox"  # "bbox", "polygon", "mask"
    coordinates: Union[List[float], List[List[float]]]  # [x, y, w, h] normalized or [[x,y],...]
    confidence: float = 1.0
    source: str = "manual"  # manual, yolo_assisted, sam_assisted, propagated
    is_reviewed: bool = False

class AnnotationUpdate(BaseModel):
    class_id: Optional[int] = None
    class_name: Optional[str] = None
    coordinates: Optional[Union[List[float], List[List[float]]]] = None
    is_reviewed: Optional[bool] = None
    confidence: Optional[float] = None

class AnnotationOut(BaseModel):
    id: str
    frame_id: str
    project_id: str
    class_id: int
    class_name: str
    annotation_type: str
    coordinates: Any
    confidence: float
    source: str
    is_reviewed: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AIAssistRequest(BaseModel):
    frame_id: str
    provider: str = "sam2"  # "sam2", "florence2", "ultralytics_yolo", "open_vocab"
    model_name: Optional[str] = "sam2.1_t.pt"
    confidence_threshold: float = 0.25
    selected_classes: Optional[List[str]] = None
    text_prompt: Optional[str] = None
    box_prompt: Optional[List[float]] = None  # Normalized [x, y, w, h] or [x1, y1, x2, y2]
    point_prompts: Optional[List[List[float]]] = None  # List of normalized [[x, y], ...]
    point_labels: Optional[List[int]] = None  # 1 for foreground, 0 for background
    output_type: Optional[str] = "bbox"  # "bbox", "polygon", "both"
    refine_with_sam: Optional[bool] = True

class SAMSegmentRequest(BaseModel):
    frame_id: str
    model_name: str = "sam2.1_t.pt"
    box_prompt: Optional[List[float]] = None
    point_prompts: Optional[List[List[float]]] = None
    point_labels: Optional[List[int]] = None
    class_id: int = 0
    class_name: str = "sam_segment"

class SAMModelInfo(BaseModel):
    model_id: str
    name: str
    variant: str
    file_name: str
    file_size_mb: float
    is_downloaded: bool
    path: Optional[str] = None
    description: str

class SAMDownloadRequest(BaseModel):
    model_name: str = "sam2.1_t.pt"

class BatchPropagateRequest(BaseModel):
    provider: str = "ultralytics_yolo"
    model_name: Optional[str] = "yolov8n.pt"
    confidence_threshold: float = 0.35
    target_frame_ids: Optional[List[str]] = None  # None means all unannotated frames in project
    target_all_unannotated: bool = True

class PropagateTrackRequest(BaseModel):
    source_frame_id: str
    project_id: str
    annotation_ids: Optional[List[str]] = None  # None means all annotations on source frame
    direction: str = "forward"  # "forward", "backward", "all", "next_10", "next_30"
    model_name: str = "sam2.1_t.pt"
    output_type: str = "bbox"  # "bbox", "polygon", "both"
    match_threshold: float = 0.30
    clear_existing_tracked: bool = True  # Avoid duplicate stacked annotations
    tracker_engine: str = "optical_flow"  # "optical_flow", "tracker_mil", "hybrid"

class RefineBBoxRequest(BaseModel):
    frame_id: str
    bbox: List[float]  # [x, y, w, h] normalized
    model_name: Optional[str] = "sam2.1_t.pt"

class RefineBBoxResponse(BaseModel):
    bbox: List[float]
    polygon: Optional[List[List[float]]] = None
    confidence: float
    snapped: bool

class KeyframeInterpolateRequest(BaseModel):
    project_id: str
    start_frame_id: str
    end_frame_id: str
    annotation_id: Optional[str] = None
    mode: str = "linear"  # "linear" or "spline"
    lock_dimensions: bool = True
    clear_existing: bool = True

class KeyframeInterpolateResponse(BaseModel):
    status: str
    message: str
    start_frame_index: Optional[int] = 0
    end_frame_index: Optional[int] = 0
    interpolated_frames_count: int = 0
    total_annotations_created: int = 0
    execution_time_ms: float = 0.0
    telemetry: Optional[List[Dict[str, Any]]] = None

# ----------------- Dataset Version Schemas -----------------
class DatasetVersionCreate(BaseModel):
    version_name: str = "v1.0"
    description: Optional[str] = ""
    train_ratio: float = 0.70
    val_ratio: float = 0.20
    test_ratio: float = 0.10
    random_seed: int = 42
    prevent_video_leakage: bool = True  # Group frames by source video
    min_annotations_per_image: int = 0

class DatasetVersionOut(BaseModel):
    id: str
    project_id: str
    version_name: str
    description: str
    total_images: int
    total_annotations: int
    train_count: int
    val_count: int
    test_count: int
    class_counts: Dict[str, int]
    manifest_path: str
    zip_export_path: str
    yaml_path: str
    is_frozen: bool
    created_at: datetime

    class Config:
        from_attributes = True

class QualityAnomaly(BaseModel):
    frame_id: str
    anomaly_type: str
    message: str
    severity: str  # warning, error, info

class DatasetQualitySummary(BaseModel):
    total_images: int
    total_annotations: int
    unannotated_images: int
    class_distribution: Dict[str, int]
    class_imbalance_ratio: float
    imbalance_warning: bool
    anomalies: List[QualityAnomaly]

# ----------------- Training & Experiments -----------------
class ExperimentCreate(BaseModel):
    dataset_version_id: str
    name: str
    model_variant: str = "yolov8n.pt"
    base_weights_path: Optional[str] = None
    fine_tune: bool = False
    epochs: int = 50
    batch_size: int = 16
    img_size: int = 640
    optimizer: str = "auto"
    lr0: float = 0.01
    patience: int = 20
    workers: int = 2
    device: str = "auto"  # "auto", "cpu", "0", "1"
    runtime_id: Optional[str] = None

class ExperimentOut(BaseModel):
    id: str
    project_id: str
    dataset_version_id: Optional[str] = None
    name: str
    model_variant: str
    base_weights_path: str
    epochs: int
    batch_size: int
    img_size: int
    optimizer: str
    lr0: float
    device: str
    status: str
    current_epoch: int
    total_epochs: int
    train_box_loss: float
    train_cls_loss: float
    val_box_loss: float
    val_cls_loss: float
    precision: float
    recall: float
    map50: float
    map50_95: float
    best_map50: float
    best_epoch: int
    duration_seconds: float
    checkpoints_dir: str
    log_file_path: str
    metrics_history: List[Any]
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ColabSyncRequest(BaseModel):
    project_id: str
    dataset_version_id: Optional[str] = None
    experiment_name: str
    model_variant: str = "yolo26l.pt"
    epochs: int = 50
    precision: float = 0.0
    recall: float = 0.0
    map50: float = 0.0
    map50_95: float = 0.0
    notes: Optional[str] = None

class ModelClassCompatibilityCheck(BaseModel):
    compatible: bool
    model_classes: List[str]
    dataset_classes: List[str]
    missing_in_model: List[str]
    missing_in_dataset: List[str]
    requires_remapping: bool
    recommendation: str

# ----------------- Model Registry -----------------
class RegisteredModelCreate(BaseModel):
    name: str
    version: str = "v1.0"
    file_path: str
    format: str = "pt"
    experiment_id: Optional[str] = None
    stage: str = "experimental"
    notes: Optional[str] = ""

class RegisteredModelUpdate(BaseModel):
    name: Optional[str] = None
    stage: Optional[str] = None  # experimental, staging, production
    notes: Optional[str] = None

class RegisteredModelOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    experiment_id: Optional[str] = None
    name: str
    version: str
    file_path: str
    format: str
    file_size: int
    sha256_checksum: str
    num_classes: int
    class_names: List[str]
    metrics: Dict[str, Any]
    stage: str
    notes: str
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Compute Runtime -----------------
class ComputeRuntimeCreate(BaseModel):
    name: str
    provider: str = "local"  # local, remote_ssh, jetson, colab
    host: str = "localhost"
    priority: int = 1
    config_json: Optional[Dict[str, Any]] = {}

class ComputeRuntimeUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    config_json: Optional[Dict[str, Any]] = None

class ComputeRuntimeOut(BaseModel):
    id: str
    name: str
    provider: str
    host: str
    status: str
    device_name: str
    gpu_model: str
    vram_total_mb: int
    vram_free_mb: int
    ram_total_mb: int
    ram_free_mb: int
    disk_free_gb: float
    is_active: bool
    priority: int
    last_heartbeat: datetime
    error_reason: str
    config_json: Dict[str, Any]

    class Config:
        from_attributes = True

# ----------------- Jobs & Presets -----------------
class JobOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    type: str
    status: str
    progress: float
    message: str
    result_json: Dict[str, Any]
    error_detail: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CropPresetCreate(BaseModel):
    name: str
    x: float
    y: float
    width: float
    height: float
    is_normalized: bool = True
    aspect_ratio: str = "custom"

class CropPresetOut(BaseModel):
    id: str
    name: str
    x: float
    y: float
    width: float
    height: float
    is_normalized: bool
    aspect_ratio: str
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Validation & Inference -----------------
class ValidationInferenceRequest(BaseModel):
    model_id: Optional[str] = None
    model_path: Optional[str] = None
    confidence_threshold: float = 0.25
    iou_threshold: float = 0.45
    selected_classes: Optional[List[str]] = None

class DetectionBox(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [x, y, w, h] normalized

class ValidationInferenceResponse(BaseModel):
    image_url: str
    annotated_image_url: str
    detections: List[DetectionBox]
    latency_ms: float
    fps: float
    device_used: str

class HardwareTelemetryOut(BaseModel):
    cpu_count: int
    cpu_percent: float
    ram_total_gb: float
    ram_used_gb: float
    ram_free_gb: float
    ram_percent: float
    disk_total_gb: float
    disk_free_gb: float
    disk_percent: float
    cuda_available: bool
    gpu_count: int
    gpu_devices: List[Dict[str, Any]]
    pytorch_version: str
    ultralytics_version: str
    opencv_version: str
    platform_system: str
    python_version: str


# ----------------- Dynamic Models & Vision LLM -----------------
class ModelCatalogItem(BaseModel):
    id: str
    name: str
    engine: str  # "florence2", "sam2", "yolo"
    size_mb: int
    is_installed: bool
    description: str
    recommended_for: str
    supports_bounding_box: bool
    supports_polygon: bool

class DynamicModelDownloadRequest(BaseModel):
    model_id: str

class FlorencePredictRequest(BaseModel):
    frame_id: str
    project_id: str
    model_id: str = "microsoft/Florence-2-base"
    prompt_text: Optional[str] = "package"
    task: str = "<CAPTION_TO_PHRASE_GROUNDING>"
    output_type: str = "bbox"  # "bbox", "polygon", "both"
    refine_with_sam: bool = True

class FlorencePropagateRequest(BaseModel):
    project_id: str
    model_id: str = "microsoft/Florence-2-base"
    prompt_text: Optional[str] = "package"
    class_name: Optional[str] = "package"
    task: str = "<CAPTION_TO_PHRASE_GROUNDING>"
    output_type: str = "bbox"  # "bbox", "polygon", "both"
    refine_with_sam: bool = True
    frame_limit: Optional[int] = None
