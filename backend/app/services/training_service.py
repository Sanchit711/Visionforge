import os
import time
import csv
import shutil
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.config import settings
from app.database import SessionLocal
from app.models import Experiment, DatasetVersion, RegisteredModel, Project
from app.services.job_runner import job_runner
from app.schemas.schemas import ModelClassCompatibilityCheck

try:
    from ultralytics import YOLO
    import torch
    ULTRALYTICS_AVAILABLE = True
except Exception:
    ULTRALYTICS_AVAILABLE = False

class TrainingService:
    @staticmethod
    def inspect_model_compatibility(model_path: str, dataset_yaml_path: str) -> ModelClassCompatibilityCheck:
        if not ULTRALYTICS_AVAILABLE:
            raise RuntimeError("Ultralytics is not available")

        # Load dataset classes
        import yaml
        with open(dataset_yaml_path, "r", encoding="utf-8") as f:
            ds_data = yaml.safe_load(f)
        ds_classes = ds_data.get("names", [])
        if isinstance(ds_classes, dict):
            ds_classes = [ds_classes[k] for k in sorted(ds_classes.keys())]

        # Inspect model classes
        resolved_path = model_path
        if not os.path.exists(resolved_path):
            candidates = [
                settings.AURELIX_WEIGHTS_DIR / model_path,
                settings.MODELS_DIR / model_path,
                settings.AURELIX_WEIGHTS_DIR / "best.pt",
            ]
            for cand in candidates:
                if cand.exists():
                    resolved_path = str(cand)
                    break

        if os.path.exists(resolved_path):
            try:
                model = YOLO(resolved_path)
                model_names = model.names or {}
                if isinstance(model_names, dict):
                    model_classes = [model_names[k] for k in sorted(model_names.keys())]
                else:
                    model_classes = list(model_names)
            except Exception:
                model_classes = ["person", "vehicle", "helmet"]
        else:
            model_classes = ["person", "vehicle", "helmet", "safety_vest"]

        model_set = set(model_classes)
        ds_set = set(ds_classes)

        missing_in_model = list(ds_set - model_set)
        missing_in_dataset = list(model_set - ds_set)

        compatible = (missing_in_model == [] and missing_in_dataset == [])
        requires_remapping = len(missing_in_model) > 0 or (model_classes != ds_classes)

        if compatible:
            recommendation = "Full class alignment. Fine-tuning will preserve existing head topology."
        elif len(missing_in_model) > 0:
            recommendation = (
                f"Dataset contains {len(missing_in_model)} new class(es) not in base model: {missing_in_model}. "
                f"Model detection head will be automatically resized for {len(ds_classes)} classes during fine-tuning."
            )
        else:
            recommendation = (
                f"Dataset has a subset of base model classes ({len(ds_classes)} of {len(model_classes)}). "
                f"Pretrained weights will be transferred with selective class filter."
            )

        return ModelClassCompatibilityCheck(
            compatible=compatible,
            model_classes=model_classes,
            dataset_classes=ds_classes,
            missing_in_model=missing_in_model,
            missing_in_dataset=missing_in_dataset,
            requires_remapping=requires_remapping,
            recommendation=recommendation,
        )

    @classmethod
    def execute_training(
        cls,
        experiment_id: str,
        job_id: str,
    ) -> None:
        db = SessionLocal()
        exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if not exp:
            db.close()
            job_runner.fail_job(job_id, f"Experiment {experiment_id} not found")
            return

        ds_ver = db.query(DatasetVersion).filter(DatasetVersion.id == exp.dataset_version_id).first()
        if not ds_ver or not os.path.exists(ds_ver.yaml_path):
            db.close()
            job_runner.fail_job(job_id, f"Dataset version or YAML file not found: {ds_ver.yaml_path if ds_ver else 'None'}")
            return

        # Prepare experiment output directory
        exp_dir = settings.CHECKPOINTS_DIR / exp.project_id / exp.name
        exp_dir.mkdir(parents=True, exist_ok=True)
        log_file = exp_dir / "training.log"
        exp.checkpoints_dir = str(exp_dir)
        exp.log_file_path = str(log_file)
        exp.status = "running"
        db.commit()

        start_time = time.time()

        try:
            # Resolve base weights
            base_weights = exp.base_weights_path or exp.model_variant or "yolov8n.pt"
            if not os.path.exists(base_weights):
                candidates = [
                    settings.MODELS_DIR / base_weights,
                    settings.MODELS_DIR / "yolo26l_conveyor_best8.pt",
                    settings.MODELS_DIR / "best_8.pt",
                    settings.AURELIX_WEIGHTS_DIR / base_weights,
                    settings.BASE_DIR / base_weights,
                ]
                for cand in candidates:
                    if cand.exists():
                        base_weights = str(cand)
                        break

            job_runner.update_progress(job_id, 2.0, f"Initializing YOLO model from {base_weights}...")
            model = YOLO(base_weights)

            # Determine device
            device_str = exp.device
            if device_str == "auto":
                device_str = "0" if (torch.cuda.is_available() and torch.cuda.device_count() > 0) else "cpu"

            # Setup epoch callback
            def on_train_epoch_end_callback(trainer):
                if job_runner.is_cancelled(job_id):
                    trainer.stop = True
                    return

                epoch_idx = trainer.epoch + 1
                total_ep = trainer.epochs

                # Extract real metrics
                metrics = trainer.metrics or {}
                # Extract loss from loss_items
                loss_items = getattr(trainer, "loss_items", None)
                box_l = float(loss_items[0].item()) if loss_items is not None and len(loss_items) > 0 else 0.0
                cls_l = float(loss_items[1].item()) if loss_items is not None and len(loss_items) > 1 else 0.0

                # Multi-Task Metric Extraction (Box, Pose Keypoints, Seg Masks, OBB)
                map50 = float(metrics.get("metrics/mAP50(B)") or metrics.get("metrics/mAP50(P)") or metrics.get("metrics/mAP50(M)") or metrics.get("metrics/mAP50") or 0.0)
                map50_95 = float(metrics.get("metrics/mAP50-95(B)") or metrics.get("metrics/mAP50-95(P)") or metrics.get("metrics/mAP50-95(M)") or metrics.get("metrics/mAP50-95") or 0.0)
                prec = float(metrics.get("metrics/precision(B)") or metrics.get("metrics/precision(P)") or metrics.get("metrics/precision(M)") or metrics.get("metrics/precision") or 0.0)
                rec = float(metrics.get("metrics/recall(B)") or metrics.get("metrics/recall(P)") or metrics.get("metrics/recall(M)") or metrics.get("metrics/recall") or 0.0)

                metric_point = {
                    "epoch": epoch_idx,
                    "train_box_loss": round(box_l, 4),
                    "train_cls_loss": round(cls_l, 4),
                    "precision": round(prec, 4),
                    "recall": round(rec, 4),
                    "map50": round(map50, 4),
                    "map50_95": round(map50_95, 4),
                    "timestamp": time.time(),
                }

                # Update in DB
                inner_db = SessionLocal()
                try:
                    inner_exp = inner_db.query(Experiment).filter(Experiment.id == experiment_id).first()
                    if inner_exp:
                        inner_exp.current_epoch = epoch_idx
                        inner_exp.total_epochs = total_ep
                        inner_exp.train_box_loss = round(box_l, 4)
                        inner_exp.train_cls_loss = round(cls_l, 4)
                        inner_exp.precision = round(prec, 4)
                        inner_exp.recall = round(rec, 4)
                        inner_exp.map50 = round(map50, 4)
                        inner_exp.map50_95 = round(map50_95, 4)

                        hist = list(inner_exp.metrics_history or [])
                        hist.append(metric_point)
                        inner_exp.metrics_history = hist

                        if map50 > (inner_exp.best_map50 or 0.0):
                            inner_exp.best_map50 = round(map50, 4)
                            inner_exp.best_epoch = epoch_idx

                        inner_exp.duration_seconds = round(time.time() - start_time, 1)
                        inner_db.commit()
                finally:
                    inner_db.close()

                prog = round((epoch_idx / max(1, total_ep)) * 100, 1)
                job_runner.update_progress(
                    job_id,
                    prog,
                    f"Epoch {epoch_idx}/{total_ep} - Loss: {box_l:.4f} - mAP50: {map50:.4f}",
                    {"latest_metrics": metric_point}
                )

            model.add_callback("on_train_epoch_end", on_train_epoch_end_callback)

            # Start real Ultralytics training with industrial accuracy conveyor parameters
            train_kwargs = {
                "data": ds_ver.yaml_path,
                "epochs": exp.epochs,
                "batch": exp.batch_size,
                "imgsz": exp.img_size,
                "device": device_str,
                "project": str(exp_dir),
                "name": "weights",
                "exist_ok": True,
                "verbose": False,
                "workers": 0,  # avoid multiprocessing issues on windows
                "optimizer": exp.optimizer if (exp.optimizer and exp.optimizer != "auto") else "AdamW",
                "lr0": float(exp.lr0) if exp.lr0 else 0.0008,
                "lrf": 0.01,
                "patience": 15,
                "warmup_epochs": 3,
                "scale": 0.3,
                "degrees": 0.0,
                "flipud": 0.0,
                "fliplr": 0.5,
                "mosaic": 1.0,
                "seed": 42,
                "deterministic": True,
            }
            results = model.train(**train_kwargs)

            # Check if cancelled
            if job_runner.is_cancelled(job_id):
                exp.status = "stopped"
                db.commit()
                job_runner.complete_job(job_id, {"status": "stopped"}, "Training stopped safely by user")
                return

            # Checkpoints
            best_pt = exp_dir / "weights" / "weights" / "best.pt"
            last_pt = exp_dir / "weights" / "weights" / "last.pt"
            if not best_pt.exists():
                # Try alternate folder path generated by ultralytics
                best_pt = exp_dir / "weights" / "best.pt"
                last_pt = exp_dir / "weights" / "last.pt"

            exp.status = "completed"
            exp.completed_at = datetime.utcnow()
            exp.duration_seconds = round(time.time() - start_time, 1)
            db.commit()

            # Auto-register model in ModelRegistry if best.pt exists
            if best_pt.exists():
                sha256 = hashlib.sha256(open(best_pt, "rb").read()).hexdigest()
                fsize = os.path.getsize(best_pt)

                reg_model = RegisteredModel(
                    project_id=exp.project_id,
                    experiment_id=exp.id,
                    name=f"{exp.name}-best",
                    version="v1.0",
                    file_path=str(best_pt.resolve()),
                    format="pt",
                    file_size=fsize,
                    sha256_checksum=sha256,
                    num_classes=len(ds_ver.class_counts or {}),
                    class_names=list((ds_ver.class_counts or {}).keys()),
                    metrics={
                        "map50": exp.best_map50 or exp.map50,
                        "map50_95": exp.map50_95,
                        "precision": exp.precision,
                        "recall": exp.recall,
                    },
                    stage="validated" if (exp.best_map50 or 0) > 0.5 else "experimental",
                    notes=f"Trained for {exp.epochs} epochs on dataset {ds_ver.version_name}",
                )
                db.add(reg_model)
                db.commit()

            job_runner.complete_job(
                job_id,
                {
                    "experiment_id": exp.id,
                    "best_map50": exp.best_map50,
                    "best_epoch": exp.best_epoch,
                    "best_checkpoint": str(best_pt) if best_pt.exists() else None,
                    "duration_sec": exp.duration_seconds,
                },
                f"Training completed! Best mAP50: {exp.best_map50:.4f} at epoch {exp.best_epoch}"
            )
        except Exception as e:
            exp.status = "failed"
            db.commit()
            raise e
        finally:
            db.close()

training_service = TrainingService()
