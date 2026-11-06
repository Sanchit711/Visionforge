# ==============================================================================
# VisionForge Studio - Industrial Computer Vision & Video Forensic Suite
# Copyright (C) 2026 Sushant Gabhane (MSc IT - ID: D09)
# Licensed under GNU Affero General Public License v3.0 (GNU AGPLv3)
# ==============================================================================

import os
import re
import json
import time
import shutil
import zipfile
import hashlib
import pathlib
from typing import Dict, Any, List, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from app.config import settings
from app.models import Project, DatasetVersion, Experiment, RegisteredModel, ActivityLog

class KaggleCloudService:
    """
    Enterprise Kaggle Cloud Integration Engine:
    Automates dataset packaging, Kaggle Dataset creation, GPU execution kernel
    dispatch (NVIDIA T4 x2 / P100), real-time status monitoring, and automated
    model weight pulling directly into VisionForge Model Registry.
    """

    def __init__(self):
        self.staging_dir = settings.DATA_DIR / "kaggle_staging"
        self.staging_dir.mkdir(parents=True, exist_ok=True)

    def get_auth_status(self) -> Dict[str, Any]:
        """Validates whether Kaggle API credentials are authenticated and operational."""
        try:
            # Check ~/.kaggle/kaggle.json or env vars
            kaggle_json_path = pathlib.Path.home() / ".kaggle" / "kaggle.json"
            env_user = os.environ.get("KAGGLE_USERNAME")
            env_key = os.environ.get("KAGGLE_KEY")

            has_creds = kaggle_json_path.exists() or (bool(env_user) and bool(env_key))
            if not has_creds:
                return {
                    "authenticated": False,
                    "requires_verification": False,
                    "username": None,
                    "message": "Kaggle credentials not detected. Enter your Kaggle API key above.",
                }

            from kaggle.api.kaggle_api_extended import KaggleApi
            api = KaggleApi()
            api.authenticate()

            # Retrieve active username
            username = env_user
            if kaggle_json_path.exists() and not username:
                with open(kaggle_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    username = data.get("username")

            # Validate real API permissions by testing a lightweight ping request
            try:
                api.kernels_list(mine=True, page_size=1)
                return {
                    "authenticated": True,
                    "requires_verification": False,
                    "username": username or "kaggle_user",
                    "message": f"Successfully authenticated with Kaggle Cloud API as @{username} (Dual-T4 Cloud GPU Enabled).",
                }
            except Exception as test_err:
                err_str = str(test_err).lower()
                if "401" in err_str or "unauthorized" in err_str or "forbidden" in err_str:
                    return {
                        "authenticated": False,
                        "requires_verification": True,
                        "username": username,
                        "message": f"Kaggle returned 401 Unauthorized for @{username}. Kaggle strictly requires SMS Phone Verification at https://www.kaggle.com/settings before allowing API uploads or GPU jobs.",
                    }
                return {
                    "authenticated": False,
                    "requires_verification": False,
                    "username": username,
                    "message": f"Kaggle API connectivity error: {str(test_err)}",
                }
        except Exception as e:
            return {
                "authenticated": False,
                "requires_verification": False,
                "username": None,
                "message": f"Kaggle configuration error: {str(e)}",
            }

    def sanitize_slug(self, text: str) -> str:
        """Converts arbitrary strings into valid Kaggle dataset/kernel slugs (lowercase, alphanumeric, hyphens)."""
        slug = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower())
        slug = re.sub(r"-+", "-", slug).strip("-")
        return slug or "visionforge-job"

    def prepare_and_upload_dataset(
        self,
        project_id: str,
        dataset_version_id: str,
        db: Session,
        username: str
    ) -> Dict[str, Any]:
        """
        Prepares and pushes the project's YOLO dataset to Kaggle as a private dataset.
        Uses kaggle.api.dataset_create_new or dataset_create_version.
        """
        ds = db.query(DatasetVersion).filter(DatasetVersion.id == dataset_version_id).first()
        proj = db.query(Project).filter(Project.id == project_id).first()
        if ds and ds.project:
            proj = ds.project
        if not proj or not ds:
            raise ValueError("Project or Dataset Version not found in database.")

        if not ds.zip_export_path or not os.path.exists(ds.zip_export_path):
            raise ValueError("Dataset version has not been exported to ZIP. Please export in Datasets view first.")

        dataset_slug = f"vf-{self.sanitize_slug(proj.name)}-{self.sanitize_slug(ds.version_name)}"
        dataset_folder = self.staging_dir / "datasets" / dataset_slug
        dataset_folder.mkdir(parents=True, exist_ok=True)

        # Unpack the exported YOLO zip so Kaggle hosts proper directories (skip if already extracted)
        yaml_check = dataset_folder / "data.yaml"
        if not yaml_check.exists():
            print(f"[*] Extracting dataset {ds.zip_export_path} to {dataset_folder}...")
            with zipfile.ZipFile(ds.zip_export_path, "r") as zf:
                zf.extractall(dataset_folder)
        else:
            print(f"[*] Dataset already extracted in {dataset_folder}, skipping re-extraction.")

        tot = ds.total_images or (ds.train_count + ds.val_count + ds.test_count) or 1
        tr_pct = round((ds.train_count / tot) * 100) if ds.train_count else 70
        va_pct = round((ds.val_count / tot) * 100) if ds.val_count else 20
        te_pct = round((ds.test_count / tot) * 100) if ds.test_count else 10

        # Generate dataset-metadata.json
        metadata = {
            "title": f"VisionForge - {proj.name} ({ds.version_name})",
            "id": f"{username}/{dataset_slug}",
            "licenses": [{"name": "CC0-1.0"}],
            "description": f"Automated industrial dataset export from VisionForge Studio. Project: {proj.name}, Split: {tr_pct}/{va_pct}/{te_pct}."
        }
        metadata_file = dataset_folder / "dataset-metadata.json"
        with open(metadata_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()

        # Check if dataset already exists on Kaggle
        dataset_full_slug = f"{username}/{dataset_slug}"
        print(f"[*] Uploading dataset {dataset_full_slug} to Kaggle...")
        try:
            api.dataset_status(dataset_full_slug)
            # Exists, create new version
            api.dataset_create_version(
                folder=str(dataset_folder),
                version_notes=f"Auto-sync from VisionForge at {datetime.utcnow().isoformat()}",
                dir_mode="zip"
            )
            action = "updated_version"
        except Exception as e:
            err_str = str(e).lower()
            if "401" in err_str or "unauthorized" in err_str or "forbidden" in err_str:
                raise PermissionError(
                    f"Kaggle returned 401 Unauthorized for account @{username}. "
                    "Kaggle strictly requires SMS Phone Verification at https://www.kaggle.com/settings "
                    "or a fresh API token before datasets or GPU kernels can be created via API."
                )
            # Does not exist, create new
            try:
                api.dataset_create_new(
                    folder=str(dataset_folder),
                    dir_mode="zip",
                    public=False,
                    quiet=False
                )
                action = "created_new"
            except Exception as e2:
                err2_str = str(e2).lower()
                if "401" in err2_str or "unauthorized" in err2_str or "forbidden" in err2_str:
                    raise PermissionError(
                        f"Kaggle returned 401 Unauthorized for account @{username}. "
                        "Kaggle strictly requires SMS Phone Verification at https://www.kaggle.com/settings "
                        "or a fresh API token before datasets or GPU kernels can be created via API."
                    )
                raise

        return {
            "dataset_slug": dataset_slug,
            "dataset_full_slug": dataset_full_slug,
            "action": action,
            "metadata": metadata
        }

    def generate_training_kernel_code(
        self,
        dataset_full_slug: str,
        dataset_folder_name: str,
        model_variant: str = "yolo26l.pt",
        epochs: int = 50,
        batch_size: int = 8,
        img_size: int = 640,
        optimizer: str = "AdamW",
        learning_rate: float = 0.0008,
        patience: int = 15
    ) -> str:
        """
        Generates clean, headless, enterprise Python code to run inside Kaggle's dual-GPU container.
        Automatically outputs best.pt, results.csv, and metrics to /kaggle/working/.
        """
        code = f'''# ==============================================================================
# VisionForge Studio - Automated Kaggle GPU Training Runner
# Generated: {datetime.utcnow().isoformat()} UTC
# ==============================================================================
import os
import sys
import glob
import json
import shutil
import pathlib
import subprocess

print("==================================================================")
print(" VisionForge Studio - Kaggle Cloud GPU Training Engine")
print("==================================================================")

# 1. Environment & GPU Audit
os.system("nvidia-smi")

import torch
print(f"[*] PyTorch Version: {{torch.__version__}}")
print(f"[*] CUDA Available:  {{torch.cuda.is_available()}}")
gpu_count = torch.cuda.device_count()
print(f"[*] GPU Device Count: {{gpu_count}}")
for i in range(gpu_count):
    print(f"    - GPU [{{i}}]: {{torch.cuda.get_device_name(i)}}")

# 2. Install Ultralytics
print("[*] Ensuring Ultralytics YOLO is installed...")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "ultralytics"], check=True)

from ultralytics import YOLO

# 3. Locate Dataset
input_root = pathlib.Path("/kaggle/input")
print(f"[*] Searching for dataset in {{input_root}}...")

# Search for data.yaml in /kaggle/input
yaml_candidates = list(input_root.rglob("data.yaml"))
if not yaml_candidates:
    raise FileNotFoundError("Could not find data.yaml in /kaggle/input! Available files: " + str(list(input_root.rglob("*"))[:20]))

data_yaml_path = yaml_candidates[0]
print(f"[*] Located Dataset YAML at: {{data_yaml_path}}")

# 4. Initialize Model
model_name = "{model_variant}"
print(f"[*] Initializing YOLO architecture: {{model_name}}...")
model = YOLO(model_name)

# 5. Training Execution with Multi-GPU PyTorch DDP
device_spec = "0,1" if gpu_count > 1 else "0" if gpu_count == 1 else "cpu"
print(f"[*] Launching training on device(s): {{device_spec}} | Epochs: {epochs} | Batch: {batch_size}...")

results = model.train(
    data=str(data_yaml_path),
    epochs={epochs},
    batch={batch_size},
    imgsz={img_size},
    optimizer="{optimizer}",
    lr0={learning_rate},
    patience={patience},
    device=device_spec,
    project="/kaggle/working/vf_run",
    name="conveyor_exp",
    save=True,
    plots=True,
    verbose=True
)

# 6. Harvest and Structure Output Deliverables
working_dir = pathlib.Path("/kaggle/working")
run_dir = working_dir / "vf_run" / "conveyor_exp"

print(f"[*] Processing completed run in {{run_dir}}...")

# Copy best.pt, last.pt, and evaluation graphics directly to /kaggle/working root for instant API download
best_pt = run_dir / "weights" / "best.pt"
last_pt = run_dir / "weights" / "last.pt"
results_csv = run_dir / "results.csv"

if best_pt.exists():
    shutil.copy2(best_pt, working_dir / "best.pt")
    print("    [✓] Exported best.pt to /kaggle/working/best.pt")

if last_pt.exists():
    shutil.copy2(last_pt, working_dir / "last.pt")
    print("    [✓] Exported last.pt to /kaggle/working/last.pt")

if results_csv.exists():
    shutil.copy2(results_csv, working_dir / "results.csv")
    print("    [✓] Exported results.csv to /kaggle/working/results.csv")

# Copy plots
for plot_file in run_dir.glob("*.png"):
    shutil.copy2(plot_file, working_dir / plot_file.name)

# 7. Write Execution Manifest
manifest = {{
    "status": "complete",
    "model_variant": "{model_variant}",
    "epochs_trained": {epochs},
    "batch_size": {batch_size},
    "img_size": {img_size},
    "optimizer": "{optimizer}",
    "learning_rate": {learning_rate},
    "device_used": device_spec,
    "completed_at": str(pathlib.Path("/kaggle/working/best.pt").stat().st_mtime) if (working_dir / "best.pt").exists() else None
}}

with open(working_dir / "vf_kaggle_manifest.json", "w") as f:
    json.dump(manifest, f, indent=2)

print("==================================================================")
print(" 🎉 VISIONFORGE KAGGLE TRAINING FINISHED SUCCESSFULLY!")
print("==================================================================")
'''
        return code

    def dispatch_training_kernel(
        self,
        project_id: str,
        dataset_version_id: str,
        experiment_name: str,
        model_variant: str = "yolo26l.pt",
        epochs: int = 50,
        batch_size: int = 8,
        img_size: int = 640,
        optimizer: str = "AdamW",
        learning_rate: float = 0.0008,
        patience: int = 15,
        db: Session = None,
    ) -> Dict[str, Any]:
        """
        Orchestrates full dispatch:
        1. Authenticates & gets username.
        2. Uploads/verifies Kaggle dataset.
        3. Prepares kernel directory and Python script.
        4. Writes kernel-metadata.json with GPU acceleration enabled.
        5. Pushes kernel to Kaggle.
        6. Records Experiment in SQLite database.
        """
        auth = self.get_auth_status()
        if not auth["authenticated"]:
            raise PermissionError(auth["message"])

        username = auth["username"]
        ds = db.query(DatasetVersion).filter(DatasetVersion.id == dataset_version_id).first()
        proj = db.query(Project).filter(Project.id == project_id).first()
        if ds and ds.project:
            proj = ds.project
        if not proj:
            raise ValueError("Project not found.")

        # 1. Package and upload dataset
        ds_info = self.prepare_and_upload_dataset(project_id, dataset_version_id, db, username)
        dataset_full_slug = ds_info["dataset_full_slug"]
        dataset_slug = ds_info["dataset_slug"]

        # 2. Prepare Kernel Directory
        kernel_slug = f"vf-train-{self.sanitize_slug(proj.name)}-{int(time.time())}"
        kernel_folder = self.staging_dir / "kernels" / kernel_slug
        kernel_folder.mkdir(parents=True, exist_ok=True)

        # 3. Generate train.py
        kernel_code = self.generate_training_kernel_code(
            dataset_full_slug=dataset_full_slug,
            dataset_folder_name=dataset_slug,
            model_variant=model_variant,
            epochs=epochs,
            batch_size=batch_size,
            img_size=img_size,
            optimizer=optimizer,
            learning_rate=learning_rate,
            patience=patience
        )
        script_file = kernel_folder / "train.py"
        script_file.write_text(kernel_code, encoding="utf-8")

        # 4. Generate kernel-metadata.json
        kernel_metadata = {
            "id": f"{username}/{kernel_slug}",
            "title": f"VisionForge YOLO - {proj.name} ({experiment_name})",
            "code_file": "train.py",
            "language": "python",
            "kernel_type": "script",
            "is_private": True,
            "enable_gpu": True,
            "enable_tpu": False,
            "enable_internet": True,
            "dataset_sources": [dataset_full_slug],
            "competition_sources": [],
            "kernel_sources": [],
            "model_sources": []
        }
        meta_file = kernel_folder / "kernel-metadata.json"
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(kernel_metadata, f, indent=2)

        # 5. Push Kernel via Kaggle API
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()

        print(f"[*] Pushing training kernel {username}/{kernel_slug} to Kaggle GPU accelerator...")
        try:
            api.kernel_push(str(kernel_folder))
        except Exception as kp_err:
            kp_str = str(kp_err).lower()
            if "401" in kp_str or "unauthorized" in kp_str or "forbidden" in kp_str:
                raise PermissionError(
                    f"Kaggle returned 401 Unauthorized for account @{username}. "
                    "Kaggle strictly requires SMS Phone Verification at https://www.kaggle.com/settings "
                    "or a fresh API token before GPU kernels can be dispatched."
                )
            raise

        # 6. Record Experiment in Database
        exp = Experiment(
            project_id=project_id,
            dataset_version_id=dataset_version_id,
            name=experiment_name,
            model_variant=model_variant,
            epochs=epochs,
            batch_size=batch_size,
            img_size=img_size,
            optimizer=optimizer,
            lr0=learning_rate,
            device="Kaggle Dual-T4 GPU",
            status="running",
            current_epoch=0,
            total_epochs=epochs,
            notes=f"Dispatched to Kaggle Cloud API ({username}/{kernel_slug}) with 2x T4 GPU acceleration.",
            log_file_path=str(kernel_folder / "train.py"),
            checkpoints_dir=str(self.staging_dir / "outputs" / kernel_slug)
        )
        db.add(exp)
        db.commit()
        db.refresh(exp)

        # Activity Log
        log = ActivityLog(
            project_id=project_id,
            stage="training",
            action="Dispatched Kaggle Cloud Training",
            details={
                "experiment_id": exp.id,
                "kernel_slug": f"{username}/{kernel_slug}",
                "dataset_slug": dataset_full_slug,
                "epochs": epochs,
                "model_variant": model_variant
            }
        )
        db.add(log)
        db.commit()

        return {
            "status": "queued",
            "experiment_id": exp.id,
            "kernel_slug": f"{username}/{kernel_slug}",
            "kernel_url": f"https://www.kaggle.com/code/{username}/{kernel_slug}",
            "dataset_full_slug": dataset_full_slug,
            "message": f"Successfully launched training kernel @{username}/{kernel_slug} on Kaggle Cloud GPU!"
        }

    def get_kernel_execution_status(self, kernel_slug: str) -> Dict[str, Any]:
        """Fetches the real-time execution status of a Kaggle kernel from the API."""
        try:
            from kaggle.api.kaggle_api_extended import KaggleApi
            api = KaggleApi()
            api.authenticate()

            res = api.kernel_status(kernel_slug)
            # res has fields like status (queued, running, complete, error), failureMessage
            status_str = getattr(res, "status", "unknown").lower()
            error_msg = getattr(res, "failure_message", None) or getattr(res, "failureMessage", None)

            return {
                "kernel_slug": kernel_slug,
                "status": status_str,
                "is_running": status_str in ["queued", "running"],
                "is_complete": status_str == "complete",
                "is_error": status_str == "error",
                "error_message": error_msg,
            }
        except Exception as e:
            return {
                "kernel_slug": kernel_slug,
                "status": "unknown",
                "is_running": False,
                "is_complete": False,
                "is_error": True,
                "error_message": str(e)
            }

    def download_and_ingest_model(
        self,
        kernel_slug: str,
        project_id: str,
        experiment_id: Optional[str],
        db: Session,
        model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Pulls completed output files from Kaggle working directory (/kaggle/working/),
        extracts best.pt and results.csv, updates the Experiment record,
        and registers the model in VisionForge Model Registry.
        """
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()

        output_dir = self.staging_dir / "outputs" / kernel_slug.replace("/", "_")
        output_dir.mkdir(parents=True, exist_ok=True)

        print(f"[*] Downloading output artifacts for kernel {kernel_slug} to {output_dir}...")
        api.kernel_output(kernel_slug, path=str(output_dir), quiet=False)

        # Check for best.pt
        best_pt_candidates = list(output_dir.rglob("best.pt"))
        if not best_pt_candidates:
            # Check if there are any .pt files in output
            all_pt = list(output_dir.rglob("*.pt"))
            if not all_pt:
                raise FileNotFoundError(f"No trained .pt weights found in Kaggle output for {kernel_slug}. Contents: {list(output_dir.rglob('*'))}")
            best_pt_candidates = all_pt

        best_pt_path = best_pt_candidates[0]

        # Parse results.csv if present to grab exact metrics
        precision, recall, map50, map50_95 = 0.0, 0.0, 0.0, 0.0
        results_csv_candidates = list(output_dir.rglob("results.csv"))
        if results_csv_candidates:
            try:
                import csv
                with open(results_csv_candidates[0], "r", encoding="utf-8") as f:
                    reader = list(csv.DictReader(f))
                    if reader:
                        last_row = reader[-1]
                        # Standard Ultralytics results.csv column headers
                        for k, v in last_row.items():
                            k_clean = k.strip().lower()
                            try:
                                if "metrics/precision" in k_clean:
                                    precision = round(float(v), 4)
                                elif "metrics/recall" in k_clean:
                                    recall = round(float(v), 4)
                                elif "metrics/mAP50(B)" in k_clean or "metrics/map50" in k_clean:
                                    map50 = round(float(v), 4)
                                elif "metrics/mAP50-95(B)" in k_clean or "metrics/map50-95" in k_clean:
                                    map50_95 = round(float(v), 4)
                            except Exception:
                                pass
            except Exception as e:
                print(f"[!] Warning reading results.csv: {e}")

        # Destination in VisionForge Model Storage
        target_dir = settings.MODELS_DIR / project_id
        target_dir.mkdir(parents=True, exist_ok=True)
        final_model_name = model_name or f"kaggle_{kernel_slug.split('/')[-1]}_best.pt"
        target_path = target_dir / final_model_name

        shutil.copy2(best_pt_path, target_path)

        # Compute SHA256 checksum
        hasher = hashlib.sha256()
        with open(target_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        sha256 = hasher.hexdigest()

        # Update Experiment in Database if linked
        if experiment_id:
            exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
            if exp:
                exp.status = "completed"
                exp.precision = precision
                exp.recall = recall
                exp.map50 = map50
                exp.map50_95 = map50_95
                exp.best_map50 = map50
                exp.best_weights_path = str(target_path)
                exp.completed_at = datetime.utcnow()

        # Register in Model Registry
        proj = db.query(Project).filter(Project.id == project_id).first()
        class_names = [c.name for c in proj.classes] if (proj and proj.classes) else ["Package"]
        num_classes = len(class_names)

        registered = RegisteredModel(
            project_id=project_id,
            experiment_id=experiment_id,
            name=final_model_name,
            version="v1.0",
            file_path=str(target_path),
            format="pt",
            file_size=target_path.stat().st_size,
            sha256_checksum=sha256,
            num_classes=num_classes,
            class_names=class_names,
            metrics={
                "map50": map50,
                "map50_95": map50_95,
                "precision": precision,
                "recall": recall,
                "cloud_source": "Kaggle Cloud Dual-T4",
                "kernel_slug": kernel_slug
            },
            stage="candidate",
            notes=f"Trained on Kaggle Cloud GPU ({kernel_slug}) and ingested automatically."
        )
        db.add(registered)
        db.commit()
        db.refresh(registered)

        # Log Activity
        log = ActivityLog(
            project_id=project_id,
            stage="models",
            action="Ingested Kaggle Cloud Trained Model",
            details={
                "model_id": registered.id,
                "model_name": final_model_name,
                "mAP50": map50,
                "mAP50-95": map50_95,
                "kernel_slug": kernel_slug
            }
        )
        db.add(log)
        db.commit()

        return {
            "success": True,
            "model_id": registered.id,
            "model_name": registered.name,
            "file_path": str(target_path),
            "file_size_mb": round(registered.file_size / (1024 * 1024), 2),
            "metrics": registered.metrics,
            "message": f"Successfully imported {registered.name} directly into VisionForge Model Registry!"
        }

# Global Singleton
kaggle_service = KaggleCloudService()
