import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Annotation, Frame, Project, ActivityLog
from app.schemas.schemas import (
    AnnotationCreate, AnnotationUpdate, AnnotationOut, AIAssistRequest, BatchPropagateRequest,
    SAMSegmentRequest, SAMDownloadRequest, SAMModelInfo, PropagateTrackRequest,
    ModelCatalogItem, DynamicModelDownloadRequest, FlorencePredictRequest, FlorencePropagateRequest,
    RefineBBoxRequest, RefineBBoxResponse, KeyframeInterpolateRequest, KeyframeInterpolateResponse
)
from app.services.annotation_service import annotation_service
from app.services.interpolation_service import interpolation_service
from app.services.job_runner import job_runner

router = APIRouter()

@router.get("", response_model=List[AnnotationOut])
def list_annotations(frame_id: str, db: Session = Depends(get_db)):
    return db.query(Annotation).filter(Annotation.frame_id == frame_id).all()

@router.post("", response_model=AnnotationOut)
def create_annotation(data: AnnotationCreate, db: Session = Depends(get_db)):
    frame = db.query(Frame).filter(Frame.id == data.frame_id).first()
    if not frame:
        raise HTTPException(status_code=404, detail="Frame not found")

    ann = Annotation(
        frame_id=data.frame_id,
        project_id=frame.project_id,
        class_id=data.class_id,
        class_name=data.class_name,
        annotation_type=data.annotation_type,
        coordinates=data.coordinates,
        confidence=data.confidence,
        source=data.source,
        is_reviewed=data.is_reviewed,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann

@router.put("/{annotation_id}", response_model=AnnotationOut)
def update_annotation(annotation_id: str, data: AnnotationUpdate, db: Session = Depends(get_db)):
    ann = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Annotation not found")

    if data.class_id is not None:
        ann.class_id = data.class_id
    if data.class_name is not None:
        ann.class_name = data.class_name
    if data.coordinates is not None:
        ann.coordinates = data.coordinates
    if data.is_reviewed is not None:
        ann.is_reviewed = data.is_reviewed
    if data.confidence is not None:
        ann.confidence = data.confidence

    db.commit()
    db.refresh(ann)
    return ann

@router.delete("/{annotation_id}")
def delete_annotation(annotation_id: str, db: Session = Depends(get_db)):
    ann = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Annotation not found")

    db.delete(ann)
    db.commit()
    return {"message": "Annotation deleted", "id": annotation_id}

@router.get("/sam/models", response_model=List[SAMModelInfo])
def list_sam_models():
    """List available SAM 2 model backbones and their local download status."""
    return annotation_service.get_sam_models_catalog()

@router.post("/sam/download")
def download_sam_weights(data: SAMDownloadRequest):
    """Download requested SAM 2 model weights into the model repository."""
    try:
        res = annotation_service.download_sam_model(data.model_name)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download SAM model: {str(e)}")

@router.post("/sam/segment")
def sam_interactive_segment(data: SAMSegmentRequest, db: Session = Depends(get_db)):
    """Interactive SAM 2 real-time segmentation using box or point prompts."""
    frame = db.query(Frame).filter(Frame.id == data.frame_id).first()
    if not frame:
        raise HTTPException(status_code=404, detail="Frame not found")

    if not os.path.exists(frame.file_path):
        raise HTTPException(status_code=404, detail="Frame file not found on disk")

    try:
        preds = annotation_service.run_sam_inference(
            image_path=frame.file_path,
            box_prompt=data.box_prompt,
            point_prompts=data.point_prompts,
            point_labels=data.point_labels,
            model_name=data.model_name,
            class_id=data.class_id,
            class_name=data.class_name,
        )
        return {
            "frame_id": frame.id,
            "provider": "sam2",
            "model_name": data.model_name,
            "predictions_count": len(preds),
            "predictions": preds,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SAM 2 segmentation failed: {str(e)}")

@router.post("/ai-assist")
def ai_assist_infer(data: AIAssistRequest, db: Session = Depends(get_db)):
    frame = db.query(Frame).filter(Frame.id == data.frame_id).first()
    if not frame:
        raise HTTPException(status_code=404, detail="Frame not found")

    if not os.path.exists(frame.file_path):
        raise HTTPException(status_code=404, detail="Frame file not found on disk")

    if data.provider == "florence2":
        proj = db.query(Project).filter(Project.id == frame.project_id).first()
        target_prompt = data.text_prompt or "package"
        if not data.text_prompt and proj:
            classes = getattr(proj, "classes", None) or getattr(proj, "classes_json", None) or []
            if isinstance(classes, str):
                import json
                try: classes = json.loads(classes)
                except Exception: classes = []
            if classes and len(classes) > 0:
                target_prompt = classes[0].get("name", "package")

        preds = annotation_service.predict_florence(
            frame_id=frame.id,
            project_id=frame.project_id,
            model_id=data.model_name or "microsoft/Florence-2-base",
            prompt_text=target_prompt,
            output_type=data.output_type or "bbox",
            refine_with_sam=data.refine_with_sam if data.refine_with_sam is not None else True,
        )
    elif data.provider in ["sam2", "sam"]:
        box_p = data.box_prompt
        pt_p = data.point_prompts
        pt_l = data.point_labels
        if not box_p and not pt_p:
            pt_p = [[0.5, 0.5]]
            pt_l = [1]
        preds = annotation_service.run_sam_inference(
            image_path=frame.file_path,
            box_prompt=box_p,
            point_prompts=pt_p,
            point_labels=pt_l,
            model_name=data.model_name or "sam2.1_t.pt",
        )
    else:
        # Default: Ultralytics YOLO
        preds = annotation_service.run_yolo_inference(
            image_path=frame.file_path,
            model_name=data.model_name or "yolov8n.pt",
            confidence_threshold=data.confidence_threshold,
            selected_classes=data.selected_classes,
        )

    return {
        "frame_id": frame.id,
        "provider": data.provider,
        "model_name": data.model_name,
        "predictions_count": len(preds),
        "predictions": preds,
    }

@router.post("/batch-propagate")
def batch_propagate_endpoint(
    project_id: str,
    data: BatchPropagateRequest,
    db: Session = Depends(get_db),
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    job_id = job_runner.create_job(
        job_type="batch_propagate",
        project_id=project_id,
        message=f"Propagating AI annotations across project '{proj.name}'"
    )

    def prop_task(jid):
        res = annotation_service.batch_propagate_annotations(
            project_id=project_id,
            provider=data.provider,
            model_name=data.model_name or "yolov8n.pt",
            confidence_threshold=data.confidence_threshold,
            target_frame_ids=data.target_frame_ids,
            job_id=jid,
        )
        job_runner.complete_job(jid, res, res["message"])

    job_runner.run_in_background(job_id, prop_task)

    # Activity log
    log = ActivityLog(
        project_id=project_id,
        stage="annotation",
        action="Started AI Batch Propagation",
        details={"provider": data.provider, "model": data.model_name, "threshold": data.confidence_threshold},
    )
    db.add(log)
    db.commit()

    return {
        "message": "AI Batch propagation launched in background",
        "job_id": job_id,
        "project_id": project_id,
    }

@router.post("/propagate-track")
def propagate_track_endpoint(
    data: PropagateTrackRequest,
    db: Session = Depends(get_db),
):
    """
    Video Object Tracking & Propagation Engine:
    Takes bounding box(es) from a source frame, tracks them across subsequent frames,
    and uses Meta SAM 2 to delineate and autodetect object contours on every target frame.
    """
    proj = db.query(Project).filter(Project.id == data.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    source_frame = db.query(Frame).filter(Frame.id == data.source_frame_id).first()
    if not source_frame:
        raise HTTPException(status_code=404, detail="Source frame not found")

    job_id = job_runner.create_job(
        job_type="sam2_tracking",
        project_id=data.project_id,
        message=f"SAM 2 Tracking & Propagating objects from frame {source_frame.frame_index} across project '{proj.name}'"
    )

    def track_task(jid):
        try:
            res = annotation_service.propagate_track_annotations(
                source_frame_id=data.source_frame_id,
                project_id=data.project_id,
                annotation_ids=data.annotation_ids,
                direction=data.direction,
                model_name=data.model_name or "sam2.1_t.pt",
                output_type=data.output_type,
                match_threshold=data.match_threshold,
                clear_existing_tracked=data.clear_existing_tracked,
                tracker_engine=data.tracker_engine,
                refine_with_sam=getattr(data, "refine_with_sam", True),
                job_id=jid,
            )
            job_runner.complete_job(jid, res, res["message"])
        except Exception as e:
            job_runner.fail_job(jid, str(e))

    job_runner.run_in_background(job_id, track_task)

    # Activity log
    log = ActivityLog(
        project_id=data.project_id,
        stage="annotation",
        action="Launched SAM 2 Video Object Tracking",
        details={
            "source_frame_id": data.source_frame_id,
            "direction": data.direction,
            "model": data.model_name,
            "output_type": data.output_type,
        },
    )
    db.add(log)
    db.commit()

    return {
        "message": "SAM 2 Video Object Tracking launched in background",
        "job_id": job_id,
        "project_id": data.project_id,
        "source_frame_id": data.source_frame_id,
    }


@router.post("/refine-bbox", response_model=RefineBBoxResponse)
def refine_bbox_endpoint(data: RefineBBoxRequest, db: Session = Depends(get_db)):
    """
    Sub-pixel SAM 2 Edge Snapping:
    Snaps a candidate bounding box [x, y, w, h] tightly to the exact physical contour of the object.
    """
    frame = db.query(Frame).filter(Frame.id == data.frame_id).first()
    if not frame:
        raise HTTPException(status_code=404, detail="Frame not found")
    if not os.path.exists(frame.file_path):
        raise HTTPException(status_code=404, detail="Frame image file not found on disk")

    res = annotation_service.refine_bounding_box(
        image_path=frame.file_path,
        bbox=data.bbox,
        model_name=data.model_name or "sam2.1_t.pt",
    )
    return res

# ----------------- Dynamic Models & Florence-2 Vision LLM Endpoints -----------------

@router.get("/models/catalog", response_model=List[ModelCatalogItem])
def get_models_catalog():
    """Returns all available models across Florence-2, SAM 2, and YOLO with live on-disk status."""
    return annotation_service.get_models_catalog()

@router.post("/models/download")
def download_model_dynamic(data: DynamicModelDownloadRequest):
    """Dynamically downloads model weights in a background job with live progress."""
    job_id = job_runner.create_job(
        job_type="model_download",
        project_id=None,
        message=f"Downloading model {data.model_id}..."
    )

    def download_task(jid):
        try:
            res = annotation_service.download_model_dynamic(data.model_id, job_id=jid)
            job_runner.complete_job(jid, res, res.get("message", "Model ready"))
        except Exception as e:
            job_runner.fail_job(jid, str(e))

    job_runner.run_in_background(job_id, download_task)
    return {"message": f"Downloading {data.model_id} in background", "job_id": job_id}

@router.post("/florence-predict")
def predict_florence(data: FlorencePredictRequest, db: Session = Depends(get_db)):
    """Runs Florence-2 phrase grounding on a single frame, producing strictly clean bounding boxes."""
    proj = db.query(Project).filter(Project.id == data.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        results = annotation_service.predict_florence(
            frame_id=data.frame_id,
            project_id=data.project_id,
            model_id=data.model_id,
            prompt_text=data.prompt_text or "package",
            task=data.task,
            output_type=data.output_type,
            refine_with_sam=data.refine_with_sam,
        )
        return {"message": f"Florence-2 detected {len(results)} objects", "detections": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/florence-propagate")
def propagate_florence(data: FlorencePropagateRequest, db: Session = Depends(get_db)):
    """Runs Florence-2 across project frames in a background job, creating bounding boxes on the desired object."""
    proj = db.query(Project).filter(Project.id == data.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    job_id = job_runner.create_job(
        job_type="florence_propagate",
        project_id=data.project_id,
        message=f"Florence-2 grounding '{data.prompt_text}' across project '{proj.name}'"
    )

    def florence_task(jid):
        try:
            res = annotation_service.propagate_florence(
                project_id=data.project_id,
                model_id=data.model_id,
                prompt_text=data.prompt_text or "package",
                class_name=data.class_name or "package",
                task=data.task,
                output_type=data.output_type,
                refine_with_sam=data.refine_with_sam,
                frame_limit=data.frame_limit,
                job_id=jid,
            )
            job_runner.complete_job(jid, res, res["message"])
        except Exception as e:
            job_runner.fail_job(jid, str(e))

    job_runner.run_in_background(job_id, florence_task)
    return {
        "message": f"Florence-2 grounding queued for '{data.prompt_text}'",
        "job_id": job_id,
        "project_id": data.project_id
    }


@router.delete("/project/{project_id}/tracked")
def clear_tracked_annotations_endpoint(project_id: str, db: Session = Depends(get_db)):
    """Clears all automated/tracked annotations for a project to start fresh."""
    count = db.query(Annotation).filter(
        Annotation.project_id == project_id,
        Annotation.source.in_(["tracked_bbox", "sam2_tracked", "sam2_assisted", "ai_assist", "florence_grounding", "florence2_grounding", "propagated"])
    ).delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": count, "message": f"Removed {count} automated annotations"}


@router.delete("/project/{project_id}/all")
def clear_all_project_annotations(project_id: str, db: Session = Depends(get_db)):
    """Wipe all annotations in a project and reset frame review status."""
    count = db.query(Annotation).filter(Annotation.project_id == project_id).delete(synchronize_session=False)
    db.query(Frame).filter(Frame.project_id == project_id).update({Frame.status: "unreviewed"}, synchronize_session=False)
    db.commit()
    return {"deleted_count": count, "message": f"Wiped all {count} annotations for project"}


@router.delete("/frame/{frame_id}/all")
def clear_frame_annotations(frame_id: str, db: Session = Depends(get_db)):
    """Wipe all annotations on a single frame."""
    count = db.query(Annotation).filter(Annotation.frame_id == frame_id).delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": count, "message": f"Removed {count} annotations from frame"}


@router.post("/interpolate", response_model=KeyframeInterpolateResponse)
def interpolate_keyframes_endpoint(data: KeyframeInterpolateRequest):
    """
    Enterprise Keyframe Interpolation & Trajectory Engine:
    Mathematically interpolates bounding boxes/polygons between two anchor keyframes.
    Eliminates tedious manual frame-by-frame labeling with zero accumulative drift.
    """
    try:
        return interpolation_service.interpolate_between_keyframes(
            project_id=data.project_id,
            start_frame_id=data.start_frame_id,
            end_frame_id=data.end_frame_id,
            annotation_id=data.annotation_id,
            mode=data.mode,
            lock_dimensions=data.lock_dimensions,
            clear_existing=data.clear_existing,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interpolation engine error: {str(e)}")


