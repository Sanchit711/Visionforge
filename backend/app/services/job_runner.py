import threading
import traceback
import logging
from typing import Callable, Any, Dict
from datetime import datetime
from app.database import SessionLocal
from app.models import Job

logger = logging.getLogger("visionforge.jobs")

class JobRunner:
    def __init__(self):
        self._lock = threading.Lock()
        self._active_threads: Dict[str, threading.Thread] = {}
        self._cancel_flags: Dict[str, bool] = {}

    def create_job(self, job_type: str, project_id: str = None, message: str = "Job queued") -> str:
        db = SessionLocal()
        try:
            job = Job(
                type=job_type,
                project_id=project_id,
                status="pending",
                progress=0.0,
                message=message,
                result_json={},
                error_detail="",
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            job_id = job.id
            return job_id
        finally:
            db.close()

    def update_progress(self, job_id: str, progress: float, message: str = None, result_data: Dict[str, Any] = None):
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job and job.status not in ["cancelled", "failed"]:
                job.status = "running"
                job.progress = min(max(float(progress), 0.0), 100.0)
                if message:
                    job.message = message
                if result_data:
                    current_res = dict(job.result_json or {})
                    current_res.update(result_data)
                    job.result_json = current_res
                job.updated_at = datetime.utcnow()
                db.commit()
        except Exception as e:
            logger.error(f"Failed to update progress for job {job_id}: {e}")
        finally:
            db.close()

    def complete_job(self, job_id: str, result_data: Dict[str, Any] = None, message: str = "Completed successfully"):
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = "completed"
                job.progress = 100.0
                job.message = message
                if result_data:
                    current_res = dict(job.result_json or {})
                    current_res.update(result_data)
                    job.result_json = current_res
                job.updated_at = datetime.utcnow()
                db.commit()
        except Exception as e:
            logger.error(f"Failed to complete job {job_id}: {e}")
        finally:
            db.close()
            with self._lock:
                self._active_threads.pop(job_id, None)
                self._cancel_flags.pop(job_id, None)

    def fail_job(self, job_id: str, error_message: str):
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = "failed"
                job.message = f"Failed: {error_message[:200]}"
                job.error_detail = error_message
                job.updated_at = datetime.utcnow()
                db.commit()
        except Exception as e:
            logger.error(f"Failed to mark failure for job {job_id}: {e}")
        finally:
            db.close()
            with self._lock:
                self._active_threads.pop(job_id, None)
                self._cancel_flags.pop(job_id, None)

    def is_cancelled(self, job_id: str) -> bool:
        with self._lock:
            return self._cancel_flags.get(job_id, False)

    def cancel_job(self, job_id: str) -> bool:
        with self._lock:
            self._cancel_flags[job_id] = True
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = "cancelled"
                job.message = "Cancelled by user"
                job.updated_at = datetime.utcnow()
                db.commit()
                return True
            return False
        finally:
            db.close()

    def run_in_background(self, job_id: str, target: Callable, *args, **kwargs):
        def worker():
            try:
                self.update_progress(job_id, 0.0, "Starting job...")
                target(job_id, *args, **kwargs)
            except Exception as e:
                err = traceback.format_exc()
                logger.error(f"Job {job_id} raised unhandled exception:\n{err}")
                self.fail_job(job_id, err)

        t = threading.Thread(target=worker, daemon=True)
        with self._lock:
            self._active_threads[job_id] = t
            self._cancel_flags[job_id] = False
        t.start()

job_runner = JobRunner()
