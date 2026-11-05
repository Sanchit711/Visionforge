import os

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

from app.config import settings

from app.database import get_db

from app.models import Frame, Video, Annotation, ActivityLog

from app.schemas.schemas import FrameOut, FrameExtractRequest, BulkFrameDeleteRequest, BulkFrameUpdateRequest

from app.services.frame_service import frame_service

from app.services.job_runner import job_runner



router = APIRouter()



@router.get("", response_model=List[FrameOut])

def list_frames(

    project_id: str,

    video_id: Optional[str] = None,

    split: Optional[str] = None,

    status: Optional[str] = None,

    skip: int = Query(0, ge=0),

    limit: int = Query(1000, ge=1, le=10000),

    db: Session = Depends(get_db),

):

    query = db.query(Frame).filter(Frame.project_id == project_id)

    if video_id:

        query = query.filter(Frame.video_id == video_id)

    if split:

        query = query.filter(Frame.split == split)

    if status:

        query = query.filter(Frame.status == status)



    frames = query.order_by(Frame.frame_index.asc()).offset(skip).limit(limit).all()



    results = []

    for f in frames:

        ann_count = db.query(Annotation).filter(Annotation.frame_id == f.id).count()

        f_out = FrameOut(

            id=f.id,

            project_id=f.project_id,

            video_id=f.video_id,

            frame_index=f.frame_index,

            timestamp_sec=f.timestamp_sec,

            file_path=f.file_path,

            thumbnail_path=f.thumbnail_path or f.file_path,

            width=f.width,

            height=f.height,

            sharpness_score=f.sharpness_score,

            is_duplicate=f.is_duplicate,

            split=f.split,

            status=f.status,

            annotation_count=ann_count,

            created_at=f.created_at,

        )

        results.append(f_out)

    return results



@router.post("/extract")

def extract_frames_endpoint(

    data: FrameExtractRequest,

    db: Session = Depends(get_db),

):

    video = db.query(Video).filter(Video.id == data.video_id).first()

    if not video:

        raise HTTPException(status_code=404, detail="Video not found")



    job_id = job_runner.create_job(

        job_type="frame_extract",

        project_id=video.project_id,

        message=f"Extracting frames from '{video.original_filename}'"

    )



    def extract_task(jid):

        res = frame_service.extract_frames(

            video_path=video.file_path,

            project_id=video.project_id,

            video_id=video.id,

            mode=data.mode,

            interval_value=data.interval_value,

            min_sharpness=data.min_sharpness,

            deduplicate=data.deduplicate,

            use_crop=data.use_crop,

            crop_box=video.crop_box if data.use_crop else None,

            start_time=data.start_time,

            end_time=data.end_time,

            custom_timestamps=data.custom_timestamps,

            clear_existing=data.clear_existing,

            job_id=jid,

        )

        job_runner.complete_job(jid, res, f"Extraction complete: {res['extracted_count']} frames extracted")



    job_runner.run_in_background(job_id, extract_task)



    # Activity log

    log = ActivityLog(

        project_id=video.project_id,

        stage="frame",

        action="Initiated Frame Extraction",

        details={

            "mode": data.mode,

            "interval": data.interval_value,

            "start_time": data.start_time,

            "end_time": data.end_time,

            "video": video.original_filename,

            "clear_existing": data.clear_existing,

        },

    )

    db.add(log)

    db.commit()



    return {

        "message": "Frame extraction started",

        "job_id": job_id,

        "video_id": video.id,

    }



@router.post("/deduplicate")

def deduplicate_frames_endpoint(

    project_id: str = Query(...),

    db: Session = Depends(get_db),

):

    """Clean duplicate frames and orphan annotations in the project."""

    res = frame_service.deduplicate_project_frames(project_id, db)

    return res



@router.get("/contact-sheet")

def get_contact_sheet(project_id: str, db: Session = Depends(get_db)):

    frames = db.query(Frame).filter(Frame.project_id == project_id).limit(40).all()

    if not frames:

        raise HTTPException(status_code=404, detail="No frames found in project")



    paths = [f.file_path for f in frames if os.path.exists(f.file_path)]

    sheet_dir = settings.EXPORTS_DIR / project_id

    sheet_path = sheet_dir / f"contact_sheet_{project_id[:8]}.jpg"



    frame_service.generate_contact_sheet(paths, str(sheet_path), cols=5)



    if not sheet_path.exists():

        raise HTTPException(status_code=500, detail="Failed to generate contact sheet")



    return FileResponse(str(sheet_path))



@router.post("/bulk-delete")

def bulk_delete_frames(data: BulkFrameDeleteRequest, db: Session = Depends(get_db)):

    """Bulk delete selected frames from disk and database."""

    if not data.frame_ids:

        return {"deleted_count": 0, "message": "No frames specified"}



    frames = db.query(Frame).filter(Frame.id.in_(data.frame_ids)).all()

    deleted_count = 0

    for f in frames:

        # Delete annotations associated with this frame

        db.query(Annotation).filter(Annotation.frame_id == f.id).delete()

        if os.path.exists(f.file_path):

            try:

                os.remove(f.file_path)

            except Exception:

                pass

        if f.thumbnail_path and os.path.exists(f.thumbnail_path):

            try:

                os.remove(f.thumbnail_path)

            except Exception:

                pass

        db.delete(f)

        deleted_count += 1



    db.commit()

    return {"deleted_count": deleted_count, "message": f"Successfully deleted {deleted_count} frames."}



@router.post("/bulk-update")

def bulk_update_frames(data: BulkFrameUpdateRequest, db: Session = Depends(get_db)):

    """Bulk assign split or review status to selected frames."""

    if not data.frame_ids:

        return {"updated_count": 0, "message": "No frames specified"}



    frames = db.query(Frame).filter(Frame.id.in_(data.frame_ids)).all()

    for f in frames:

        if data.split is not None:

            f.split = data.split

        if data.status is not None:

            f.status = data.status



    db.commit()

    return {"updated_count": len(frames), "message": f"Successfully updated {len(frames)} frames."}



@router.get("/{frame_id}", response_model=FrameOut)

def get_frame(frame_id: str, db: Session = Depends(get_db)):

    f = db.query(Frame).filter(Frame.id == frame_id).first()

    if not f:

        raise HTTPException(status_code=404, detail="Frame not found")



    ann_count = db.query(Annotation).filter(Annotation.frame_id == f.id).count()

    return FrameOut(

        id=f.id,

        project_id=f.project_id,

        video_id=f.video_id,

        frame_index=f.frame_index,

        timestamp_sec=f.timestamp_sec,

        file_path=f.file_path,

        thumbnail_path=f.thumbnail_path or f.file_path,

        width=f.width,

        height=f.height,

        sharpness_score=f.sharpness_score,

        is_duplicate=f.is_duplicate,

        split=f.split,

        status=f.status,

        annotation_count=ann_count,

        created_at=f.created_at,

    )



@router.post("/{frame_id}/review")

def review_frame(frame_id: str, status: str = Query(..., pattern="^(unreviewed|approved|rejected)$"), db: Session = Depends(get_db)):

    f = db.query(Frame).filter(Frame.id == frame_id).first()

    if not f:

        raise HTTPException(status_code=404, detail="Frame not found")



    f.status = status

    db.commit()

    return {"message": "Review status updated", "frame_id": frame_id, "status": status}



@router.delete("/{frame_id}")

def delete_frame(frame_id: str, db: Session = Depends(get_db)):

    f = db.query(Frame).filter(Frame.id == frame_id).first()

    if not f:

        raise HTTPException(status_code=404, detail="Frame not found")



    if os.path.exists(f.file_path):

        os.remove(f.file_path)

    if f.thumbnail_path and os.path.exists(f.thumbnail_path):

        os.remove(f.thumbnail_path)



    db.delete(f)

    db.commit()

    return {"message": "Frame deleted", "id": frame_id}



