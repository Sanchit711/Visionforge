import os
import time
import cv2
import uuid
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from app.config import settings
from app.services.annotation_service import annotation_service

try:
    from ultralytics import YOLO
    import torch
    ULTRALYTICS_AVAILABLE = True
except Exception:
    ULTRALYTICS_AVAILABLE = False

class ValidationService:
    @staticmethod
    def run_image_inference(
        image_path: str,
        model_name_or_path: str = "yolov8n.pt",
        confidence_threshold: float = 0.25,
        iou_threshold: float = 0.45,
        selected_classes: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        if not ULTRALYTICS_AVAILABLE:
            raise RuntimeError("Ultralytics is not available")

        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")

        h, w = img.shape[:2]
        model = annotation_service.get_or_load_yolo_model(model_name_or_path)

        # Warmup
        _ = model.predict(source=np.zeros((64, 64, 3), dtype=np.uint8), conf=0.5, verbose=False)

        # Timed benchmark
        t0 = time.perf_counter()
        results = model.predict(
            source=img,
            conf=confidence_threshold,
            iou=iou_threshold,
            verbose=False,
        )
        latency_sec = time.perf_counter() - t0
        latency_ms = round(latency_sec * 1000, 2)
        fps = round(1.0 / max(0.0001, latency_sec), 1)

        annotated_img = img.copy()
        detections = []

        # Color palette for classes
        colors = [
            (59, 130, 246),   # blue
            (16, 185, 129),   # green
            (245, 158, 11),   # amber
            (236, 72, 153),   # pink
            (168, 85, 247),   # purple
            (14, 165, 233),   # sky
            (239, 68, 68),    # red
        ]

        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            names = results[0].names

            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                cls_name = names.get(cls_id, f"class_{cls_id}")
                conf = round(float(boxes.conf[i].item()), 3)

                if selected_classes and cls_name not in selected_classes:
                    continue

                xyxy = boxes.xyxy[i].tolist()  # [x1, y1, x2, y2]
                xywhn = boxes.xywhn[i].tolist()  # normalized [cx, cy, nw, nh]
                cx, cy, nw, nh = xywhn
                x = round(cx - nw / 2.0, 4)
                y = round(cy - nh / 2.0, 4)

                detections.append({
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": conf,
                    "bbox": [x, y, round(nw, 4), round(nh, 4)],
                })

                # Draw on annotated image
                x1, y1, x2, y2 = [int(v) for v in xyxy]
                color = colors[cls_id % len(colors)]
                cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 2)

                # Label text with background box
                label_text = f"{cls_name} {conf:.2f}"
                (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(annotated_img, (x1, max(0, y1 - th - 6)), (x1 + tw + 6, y1), color, -1)
                cv2.putText(
                    annotated_img,
                    label_text,
                    (x1 + 3, max(th, y1 - 3)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 255, 255),
                    1,
                    cv2.LINE_AA,
                )

        # Save annotated image in exports
        out_name = f"val_{uuid.uuid4().hex[:8]}.jpg"
        out_dir = settings.EXPORTS_DIR / "validation"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / out_name
        cv2.imwrite(str(out_path), annotated_img, [cv2.IMWRITE_JPEG_QUALITY, 90])

        device_used = "CUDA GPU" if torch.cuda.is_available() else "Host CPU"

        return {
            "image_url": f"/api/v1/files/raw?path={image_path}",
            "annotated_image_url": f"/api/v1/files/raw?path={out_path}",
            "detections": detections,
            "latency_ms": latency_ms,
            "fps": fps,
            "device_used": device_used,
            "width": w,
            "height": h,
        }

    @classmethod
    def compare_models(
        cls,
        image_path: str,
        model_a_path: str,
        model_b_path: str,
        conf_threshold: float = 0.25,
    ) -> Dict[str, Any]:
        res_a = cls.run_image_inference(image_path, model_a_path, confidence_threshold=conf_threshold)
        res_b = cls.run_image_inference(image_path, model_b_path, confidence_threshold=conf_threshold)

        return {
            "model_a": {
                "name": Path(model_a_path).name,
                "result": res_a,
                "detection_count": len(res_a["detections"]),
            },
            "model_b": {
                "name": Path(model_b_path).name,
                "result": res_b,
                "detection_count": len(res_b["detections"]),
            },
            "latency_diff_ms": round(res_b["latency_ms"] - res_a["latency_ms"], 2),
        }

validation_service = ValidationService()
