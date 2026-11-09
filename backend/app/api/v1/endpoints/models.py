import os
import io
import time
import base64
import hashlib
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from PIL import Image

from app.config import settings
from app.database import get_db
from app.models import RegisteredModel, Project, ActivityLog
from app.schemas.schemas import (
    RegisteredModelCreate, RegisteredModelUpdate, RegisteredModelOut,
    EdgeExportRequest, EdgeInferenceRequest
)

router = APIRouter()

@router.get("", response_model=List[RegisteredModelOut])
def list_registered_models(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(RegisteredModel)
    if project_id:
        query = query.filter(RegisteredModel.project_id == project_id)
    return query.order_by(RegisteredModel.created_at.desc()).all()

@router.post("", response_model=RegisteredModelOut)
def register_model(data: RegisteredModelCreate, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    if not os.path.exists(data.file_path):
        raise HTTPException(status_code=400, detail=f"Model file not found at: {data.file_path}")

    fsize = os.path.getsize(data.file_path)
    sha256 = hashlib.sha256(open(data.file_path, "rb").read()).hexdigest()

    model = RegisteredModel(
        project_id=project_id,
        experiment_id=data.experiment_id,
        name=data.name,
        version=data.version,
        file_path=data.file_path,
        format=data.format,
        file_size=fsize,
        sha256_checksum=sha256,
        stage=data.stage,
        notes=data.notes or "",
    )
    db.add(model)
    db.commit()
    db.refresh(model)

    if project_id:
        log = ActivityLog(
            project_id=project_id,
            stage="validation",
            action="Registered Model",
            details={"name": data.name, "version": data.version, "format": data.format},
        )
        db.add(log)
        db.commit()

    return model

@router.get("/supported-edge-targets")
def get_supported_edge_targets():
    """Returns available edge compile targets, runtime compatibility, and acceleration hardware."""
    return [
        {
            "id": "onnx",
            "name": "ONNX (Open Neural Network Exchange)",
            "extension": ".onnx",
            "hardware": "Universal CPU, GPU, WebAssembly, Triton, Edge TPU",
            "description": "Standard cross-platform format with onnxslim optimization.",
            "recommended_for": "Web browsers, generic cloud, edge IPCs"
        },
        {
            "id": "openvino",
            "name": "Intel OpenVINO IR",
            "extension": ".xml / .bin",
            "hardware": "Intel Core / Xeon CPUs, Intel Iris Xe, Intel NPU",
            "description": "Accelerates inference up to 3x on Intel hardware with FP16/INT8 quant.",
            "recommended_for": "Industrial Intel mini-PCs, warehouse gateway computers"
        },
        {
            "id": "engine",
            "name": "NVIDIA TensorRT Engine",
            "extension": ".engine",
            "hardware": "NVIDIA Jetson Orin AGX, Xavier NX, RTX 4090 / L40S",
            "description": "Ultra-low latency sub-2ms FP16/INT8 compilation.",
            "recommended_for": "Robotic manipulators, high-speed gantry inspection"
        },
        {
            "id": "coreml",
            "name": "Apple Silicon CoreML",
            "extension": ".mlpackage",
            "hardware": "Apple Silicon Neural Engine (M1/M2/M3/M4, iPad, iPhone)",
            "description": "Dedicated 16-core Apple Neural Engine acceleration.",
            "recommended_for": "MacBook / iPad factory inspection apps"
        },
        {
            "id": "tflite",
            "name": "TensorFlow Lite",
            "extension": ".tflite",
            "hardware": "ARM Cortex-A, Android mobile, Raspberry Pi 5",
            "description": "Compact quantization for mobile handheld scanners.",
            "recommended_for": "Handheld terminal scanners and barcode-vision hybrids"
        }
    ]

@router.get("/{model_id}", response_model=RegisteredModelOut)
def get_registered_model(model_id: str, db: Session = Depends(get_db)):
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    return m

@router.put("/{model_id}", response_model=RegisteredModelOut)
def update_registered_model(model_id: str, data: RegisteredModelUpdate, db: Session = Depends(get_db)):
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")

    if data.name:
        m.name = data.name
    if data.stage:
        m.stage = data.stage
    if data.notes is not None:
        m.notes = data.notes

    db.commit()
    db.refresh(m)
    return m

@router.delete("/{model_id}")
def delete_registered_model(model_id: str, db: Session = Depends(get_db)):
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")

    db.delete(m)
    db.commit()
    return {"message": "Model removed from registry", "id": model_id}

@router.get("/{model_id}/download")
def download_model_file(model_id: str, db: Session = Depends(get_db)):
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")

    if not os.path.exists(m.file_path):
        raise HTTPException(status_code=404, detail="Model binary file missing on disk")

    return FileResponse(
        path=m.file_path,
        filename=os.path.basename(m.file_path),
        media_type="application/octet-stream",
    )

@router.post("/{model_id}/export-edge")
def export_edge_model(
    model_id: str,
    data: EdgeExportRequest,
    db: Session = Depends(get_db)
):
    """
    Exports a registered model to ONNX, OpenVINO, CoreML, or TensorRT engine
    for high-throughput edge deployment.
    """
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")

    if not os.path.exists(m.file_path):
        raise HTTPException(status_code=400, detail=f"Model binary not found on disk at: {m.file_path}")

    fmt = data.format.lower().strip()
    try:
        start_t = time.perf_counter()
        from ultralytics import YOLO
        yolo_model = YOLO(m.file_path)

        if fmt in ("tensorrt", "engine"):
            import torch
            if not torch.cuda.is_available():
                onnx_path = yolo_model.export(format="onnx", dynamic=True, simplify=True)
                return {
                    "status": "instructions_required",
                    "model_id": model_id,
                    "export_format": "TensorRT (engine)",
                    "exported_file_path": str(onnx_path),
                    "download_url": f"/api/v1/files/raw?path={str(onnx_path)}&download=true",
                    "message": "NVIDIA TensorRT compilation requires a local NVIDIA GPU. We have generated the optimized ONNX model. Compile it to TensorRT on your Jetson/RTX target in 1 command: `trtexec --onnx=model.onnx --saveEngine=model.engine --fp16`",
                    "trtexec_command": f"trtexec --onnx={Path(onnx_path).name} --saveEngine={Path(onnx_path).stem}.engine --fp16"
                }

        exported_path = yolo_model.export(
            format=fmt if fmt != "tensorrt" else "engine",
            imgsz=data.imgsz,
            half=data.half,
            dynamic=data.dynamic,
            simplify=data.simplify
        )
        elapsed = round(time.perf_counter() - start_t, 2)
        fsize_mb = round(os.path.getsize(exported_path) / (1024 * 1024), 2) if os.path.exists(exported_path) else 0.0

        return {
            "status": "success",
            "model_id": model_id,
            "export_format": fmt,
            "exported_file_path": str(exported_path),
            "export_time_seconds": elapsed,
            "file_size_mb": fsize_mb,
            "download_url": f"/api/v1/files/raw?path={str(exported_path)}&download=true",
            "message": f"Successfully compiled {fmt.upper()} edge package in {elapsed}s ({fsize_mb} MB)."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Edge export failed: {str(e)}")

@router.post("/{model_id}/predict-frame")
def predict_frame_edge(
    model_id: str,
    data: EdgeInferenceRequest,
    db: Session = Depends(get_db)
):
    """
    Real-time inference endpoint for in-browser live webcam and video testing.
    Accepts base64-encoded frame and returns bounding boxes, keypoints, and FPS telemetry.
    """
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    model_path = m.file_path if m else model_id
    if not os.path.exists(model_path):
        # Fallback to local scratch weights or Aurelix weights if available
        candidates = [
            Path("scratch/test_train_out/real_run/weights/best.pt"),
            settings.AURELIX_WEIGHTS_DIR / "best.pt",
            Path("yolov8n.pt")
        ]
        found = None
        for c in candidates:
            if c.exists():
                found = str(c)
                break
        if found:
            model_path = found
        else:
            raise HTTPException(status_code=404, detail="Model binary not found on disk")

    img_b64 = data.image_base64
    if "," in img_b64:
        img_b64 = img_b64.split(",", 1)[1]

    try:
        raw_bytes = base64.b64decode(img_b64)
        pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        w, h = pil_img.size
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

    start_t = time.perf_counter()
    from ultralytics import YOLO
    yolo_model = YOLO(model_path)
    results = yolo_model(pil_img, conf=data.conf_threshold, iou=data.iou_threshold, verbose=False)
    elapsed_ms = round((time.perf_counter() - start_t) * 1000, 2)
    fps = round(1000.0 / max(elapsed_ms, 0.001), 1)

    detections = []
    if results and len(results) > 0:
        res = results[0]
        if hasattr(res, "boxes") and res.boxes is not None:
            boxes_data = res.boxes
            for i in range(len(boxes_data)):
                xyxy = boxes_data.xyxy[i].cpu().numpy()
                conf = float(boxes_data.conf[i].cpu().numpy())
                cls_id = int(boxes_data.cls[i].cpu().numpy())
                cls_name = yolo_model.names.get(cls_id, str(cls_id)) if hasattr(yolo_model, "names") else str(cls_id)
                nx = max(0.0, min(1.0, float(xyxy[0]) / w))
                ny = max(0.0, min(1.0, float(xyxy[1]) / h))
                nw = max(0.0, min(1.0, float(xyxy[2] - xyxy[0]) / w))
                nh = max(0.0, min(1.0, float(xyxy[3] - xyxy[1]) / h))
                detections.append({
                    "type": "bbox",
                    "box": [round(nx, 4), round(ny, 4), round(nw, 4), round(nh, 4)],
                    "confidence": round(conf, 3),
                    "class_id": cls_id,
                    "class_name": cls_name
                })

        if hasattr(res, "keypoints") and res.keypoints is not None:
            kpts_data = res.keypoints
            for i in range(len(kpts_data)):
                kpts_xy = kpts_data.xy[i].cpu().numpy()
                norm_kpts = [[round(float(pt[0]) / w, 4), round(float(pt[1]) / h, 4)] for pt in kpts_xy]
                detections.append({
                    "type": "pose",
                    "keypoints": norm_kpts
                })

        if hasattr(res, "obb") and res.obb is not None:
            obb_data = res.obb
            for i in range(len(obb_data)):
                xyxyxyxy = obb_data.xyxyxyxy[i].cpu().numpy()
                norm_pts = [[round(float(p[0]) / w, 4), round(float(p[1]) / h, 4)] for p in xyxyxyxy]
                detections.append({
                    "type": "obb",
                    "points": norm_pts
                })

    return {
        "status": "success",
        "model_id": model_id,
        "inference_time_ms": elapsed_ms,
        "fps": fps,
        "detections_count": len(detections),
        "detections": detections,
        "image_width": w,
        "image_height": h
    }

@router.post("/{model_id}/export")
def export_registered_model(model_id: str, format: str = "onnx", db: Session = Depends(get_db)):
    """
    Exports a registered model to ONNX, TorchScript, or TensorRT engine
    for high-throughput production and edge deployment.
    """
    m = db.query(RegisteredModel).filter(RegisteredModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")

    if not os.path.exists(m.file_path):
        raise HTTPException(status_code=400, detail=f"Model binary not found on disk at: {m.file_path}")

    try:
        from ultralytics import YOLO
        yolo_model = YOLO(m.file_path)
        exported_path = yolo_model.export(format=format, dynamic=True, simplify=True)
        return {
            "status": "success",
            "model_id": model_id,
            "export_format": format,
            "exported_file_path": str(exported_path),
            "download_url": f"/api/v1/files/raw?path={str(exported_path)}&download=true",
            "file_size_mb": round(os.path.getsize(exported_path) / (1024 * 1024), 2) if os.path.exists(exported_path) else None,
            "message": f"Successfully exported to {format.upper()} for edge deployment."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model export failed: {str(e)}")
