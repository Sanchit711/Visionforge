import os
import yaml
import json
import shutil
import zipfile
import random
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from collections import defaultdict, Counter
from app.config import settings
from app.database import SessionLocal
from app.models import Project, Frame, Annotation, DatasetVersion
from app.schemas.schemas import DatasetQualitySummary, QualityAnomaly

def force_rmtree(path: Path):
    """Safely and forcefully deletes a directory on Windows, stripping ReadOnly attributes and bypassing file locks."""
    if not path.exists():
        return
    import stat
    def _handle_readonly(func, p, exc):
        try:
            os.chmod(p, stat.S_IWRITE)
            func(p)
        except Exception:
            pass

    try:
        for root, dirs, files in os.walk(path):
            for d in dirs:
                try:
                    os.chmod(os.path.join(root, d), stat.S_IWRITE)
                except Exception:
                    pass
            for f in files:
                try:
                    os.chmod(os.path.join(root, f), stat.S_IWRITE)
                except Exception:
                    pass
        os.chmod(path, stat.S_IWRITE)
        shutil.rmtree(path, onerror=_handle_readonly)
    except Exception:
        import subprocess
        subprocess.run(["cmd", "/c", "rmdir", "/s", "/q", str(path)], check=False)

class DatasetService:
    @staticmethod
    def inspect_dataset_quality(project_id: str) -> DatasetQualitySummary:
        db = SessionLocal()
        try:
            frames = db.query(Frame).filter(Frame.project_id == project_id).all()
            total_images = len(frames)
            annotations = db.query(Annotation).filter(Annotation.project_id == project_id).all()
            total_annotations = len(annotations)

            frame_ann_map = defaultdict(list)
            class_counter = Counter()

            anomalies: List[QualityAnomaly] = []

            for ann in annotations:
                frame_ann_map[ann.frame_id].append(ann)
                class_counter[ann.class_name] += 1

                # Check box size / coordinate anomaly
                if ann.annotation_type == "bbox" and isinstance(ann.coordinates, list) and len(ann.coordinates) == 4:
                    x, y, w, h = ann.coordinates
                    if w <= 0.01 or h <= 0.01:
                        anomalies.append(QualityAnomaly(
                            frame_id=ann.frame_id,
                            anomaly_type="tiny_bounding_box",
                            message=f"Tiny box on '{ann.class_name}' ({w*100:.1f}% x {h*100:.1f}%)",
                            severity="warning"
                        ))
                    if x < 0 or y < 0 or (x + w) > 1.05 or (y + h) > 1.05:
                        anomalies.append(QualityAnomaly(
                            frame_id=ann.frame_id,
                            anomaly_type="out_of_bounds",
                            message=f"Box for '{ann.class_name}' exceeds image boundaries",
                            severity="error"
                        ))

            unannotated_count = 0
            for f in frames:
                if f.id not in frame_ann_map:
                    unannotated_count += 1

            if unannotated_count > 0:
                anomalies.append(QualityAnomaly(
                    frame_id="",
                    anomaly_type="unannotated_images",
                    message=f"{unannotated_count} images have no annotations",
                    severity="info"
                ))

            # Imbalance calculation
            class_dist = dict(class_counter)
            counts = list(class_dist.values())
            imbalance_ratio = 1.0
            imbalance_warning = False

            if len(counts) > 1:
                max_c = max(counts)
                min_c = min(counts)
                imbalance_ratio = round(max_c / max(1, min_c), 2)
                if imbalance_ratio > 5.0:
                    imbalance_warning = True
                    anomalies.append(QualityAnomaly(
                        frame_id="",
                        anomaly_type="class_imbalance",
                        message=f"Severe class imbalance detected: ratio is {imbalance_ratio}:1 between dominant and minor classes",
                        severity="warning"
                    ))

            return DatasetQualitySummary(
                total_images=total_images,
                total_annotations=total_annotations,
                unannotated_images=unannotated_count,
                class_distribution=class_dist,
                class_imbalance_ratio=imbalance_ratio,
                imbalance_warning=imbalance_warning,
                anomalies=anomalies[:50],  # cap list
            )
        finally:
            db.close()

    @classmethod
    def create_dataset_version(
        cls,
        project_id: str,
        version_name: str = "v1.0",
        description: str = "",
        train_ratio: float = 0.70,
        val_ratio: float = 0.20,
        test_ratio: float = 0.10,
        random_seed: int = 42,
        prevent_video_leakage: bool = True,
    ) -> Dict[str, Any]:
        random.seed(random_seed)
        db = SessionLocal()
        try:
            proj = db.query(Project).filter(Project.id == project_id).first()
            if not proj:
                raise ValueError("Project not found")

            # Check if version already exists
            existing = db.query(DatasetVersion).filter(
                DatasetVersion.project_id == project_id,
                DatasetVersion.version_name == version_name
            ).first()
            if existing:
                raise ValueError(f"Dataset version {version_name} already exists. Pick a new version name like v1.1 or v2.0.")

            # Load project class mapping
            proj_classes = proj.classes or []
            class_name_to_id = {}
            for i, c in enumerate(proj_classes):
                if isinstance(c, dict):
                    class_name_to_id[c["name"]] = c.get("id", i)
                else:
                    class_name_to_id[str(c)] = i

            frames = db.query(Frame).filter(Frame.project_id == project_id).all()
            if not frames:
                raise ValueError("No frames found in project to create dataset")

            # Group frames
            if prevent_video_leakage:
                # Group by video_id
                video_groups = defaultdict(list)
                for f in frames:
                    vkey = f.video_id or "no_video"
                    video_groups[vkey].append(f)

                video_keys = list(video_groups.keys())
                random.shuffle(video_keys)

                train_frames, val_frames, test_frames = [], [], []
                n_vids = len(video_keys)
                n_train = max(1, int(round(n_vids * train_ratio)))
                n_val = max(1 if n_vids > 1 and val_ratio > 0 else 0, int(round(n_vids * val_ratio)))

                train_vids = set(video_keys[:n_train])
                val_vids = set(video_keys[n_train:n_train + n_val])
                test_vids = set(video_keys[n_train + n_val:])

                for vkey, vframes in video_groups.items():
                    if vkey in train_vids:
                        train_frames.extend(vframes)
                    elif vkey in val_vids:
                        val_frames.extend(vframes)
                    else:
                        test_frames.extend(vframes)
            elif split_strategy == "temporal":
                # Contiguous temporal chunk split: sorts by frame_index to eliminate adjacent frame leakage
                sorted_frames = sorted(list(frames), key=lambda x: (x.video_id or "", x.frame_index if x.frame_index is not None else 0))
                n_total = len(sorted_frames)
                n_train = int(round(n_total * train_ratio))
                n_val = int(round(n_total * val_ratio))

                train_frames = sorted_frames[:n_train]
                val_frames = sorted_frames[n_train:n_train + n_val]
                test_frames = sorted_frames[n_train + n_val:]
            else:
                shuffled = list(frames)
                random.shuffle(shuffled)
                n_total = len(shuffled)
                n_train = int(round(n_total * train_ratio))
                n_val = int(round(n_total * val_ratio))

                train_frames = shuffled[:n_train]
                val_frames = shuffled[n_train:n_train + n_val]
                test_frames = shuffled[n_train + n_val:]

            # Ensure at least 1 validation frame if possible
            if len(val_frames) == 0 and len(train_frames) > 1:
                val_frames.append(train_frames.pop())

            # Export Directory for Version
            version_dir = settings.DATASETS_DIR / project_id / version_name
            if version_dir.exists():
                force_rmtree(version_dir)

            for split in ["train", "val", "test"]:
                (version_dir / "images" / split).mkdir(parents=True, exist_ok=True)
                (version_dir / "labels" / split).mkdir(parents=True, exist_ok=True)

            total_annotations = 0
            class_counts = Counter()

            split_mapping = [
                ("train", train_frames),
                ("val", val_frames),
                ("test", test_frames),
            ]

            for split_name, split_list in split_mapping:
                for f in split_list:
                    # Update frame split in db
                    f.split = split_name

                    # Copy image
                    src_img_path = f.file_path
                    if not os.path.exists(src_img_path):
                        continue

                    img_filename = f"{f.id}.jpg"
                    dst_img_path = version_dir / "images" / split_name / img_filename
                    shutil.copy2(src_img_path, dst_img_path)

                    # Export YOLO label txt (Empty file = Negative background sample for hard negative mining)
                    anns = db.query(Annotation).filter(Annotation.frame_id == f.id).all()
                    label_lines = []
                    for ann in anns:
                        total_annotations += 1
                        norm_name = str(ann.class_name).strip().lower()
                        class_counts[norm_name] += 1
                        cid = class_name_to_id.get(norm_name, class_name_to_id.get(ann.class_name, ann.class_id))

                        if ann.annotation_type == "bbox" and len(ann.coordinates) == 4:
                            x, y, w, h = ann.coordinates
                            # YOLO format is center_x, center_y, width, height (normalized)
                            cx = round(x + w / 2.0, 6)
                            cy = round(y + h / 2.0, 6)
                            nw = round(w, 6)
                            nh = round(h, 6)
                            label_lines.append(f"{cid} {cx} {cy} {nw} {nh}")
                        elif ann.annotation_type == "polygon" and isinstance(ann.coordinates, list):
                            # YOLO segmentation format: class x1 y1 x2 y2 ...
                            coords_str = " ".join([f"{pt[0]:.6f} {pt[1]:.6f}" for pt in ann.coordinates])
                            label_lines.append(f"{cid} {coords_str}")

                    label_filename = f"{f.id}.txt"
                    dst_label_path = version_dir / "labels" / split_name / label_filename
                    with open(dst_label_path, "w", encoding="utf-8") as lf:
                        if label_lines:
                            lf.write("\n".join(label_lines) + "\n")
                        else:
                            # 0-byte file represents an explicit negative sample (empty conveyor belt)
                            lf.write("")

            # Generate valid data.yaml
            names_dict = {}
            for name, cid in class_name_to_id.items():
                names_dict[cid] = name
            sorted_names = [names_dict[i] for i in sorted(names_dict.keys())]

            yaml_data = {
                "path": str(version_dir.resolve()).replace("\\", "/"),
                "train": "images/train",
                "val": "images/val",
                "test": "images/test" if len(test_frames) > 0 else "images/val",
                "nc": len(sorted_names),
                "names": sorted_names,
            }

            yaml_path = version_dir / "data.yaml"
            with open(yaml_path, "w", encoding="utf-8") as yf:
                yaml.dump(yaml_data, yf, default_flow_style=False, sort_keys=False)

            # Generate Dataset Manifest JSON
            manifest_data = {
                "project_id": project_id,
                "project_name": proj.name,
                "version": version_name,
                "description": description,
                "created_at": str(Path(yaml_path).stat().st_ctime),
                "classes": sorted_names,
                "counts": {
                    "total_images": len(frames),
                    "train_images": len(train_frames),
                    "val_images": len(val_frames),
                    "test_images": len(test_frames),
                    "total_annotations": total_annotations,
                    "class_distribution": dict(class_counts),
                },
                "split_ratios": {
                    "train": train_ratio,
                    "val": val_ratio,
                    "test": test_ratio,
                },
                "prevent_video_leakage": prevent_video_leakage,
            }
            manifest_path = version_dir / "manifest.json"
            with open(manifest_path, "w", encoding="utf-8") as mf:
                json.dump(manifest_data, mf, indent=2)

            # Create ZIP Archive export
            zip_export_dir = settings.EXPORTS_DIR / project_id
            zip_export_dir.mkdir(parents=True, exist_ok=True)
            zip_path = zip_export_dir / f"{proj.name}_{version_name}_yolo.zip"

            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for root, dirs, files in os.walk(version_dir):
                    for file in files:
                        full_p = Path(root) / file
                        arc_name = full_p.relative_to(version_dir)
                        zf.write(full_p, arc_name)

            # Save DatasetVersion in DB
            ds_version = DatasetVersion(
                project_id=project_id,
                version_name=version_name,
                description=description,
                total_images=len(frames),
                total_annotations=total_annotations,
                train_count=len(train_frames),
                val_count=len(val_frames),
                test_count=len(test_frames),
                class_counts=dict(class_counts),
                manifest_path=str(manifest_path),
                zip_export_path=str(zip_path),
                yaml_path=str(yaml_path),
                is_frozen=True,
            )
            db.add(ds_version)
            db.commit()
            db.refresh(ds_version)

            return {
                "id": ds_version.id,
                "version_name": version_name,
                "yaml_path": str(yaml_path),
                "zip_export_path": str(zip_path),
                "train_count": len(train_frames),
                "val_count": len(val_frames),
                "test_count": len(test_frames),
                "total_annotations": total_annotations,
                "class_counts": dict(class_counts),
            }
        finally:
            db.close()

dataset_service = DatasetService()
