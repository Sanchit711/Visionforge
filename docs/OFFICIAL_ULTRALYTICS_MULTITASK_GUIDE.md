# VisionForge: Official Ultralytics YOLOv8 Multitask Vision Architecture & Verification Guide

This guide establishes the production-grade, standardized computer vision pipeline for **VisionForge**, directly aligned with official **[Ultralytics YOLOv8 Documentation](https://docs.ultralytics.com/)**.

---

## 1. Executive Overview: Returning to Official Ultralytics Standards

### The Challenge of Heuristic Over-Engineering
In computer vision, building complex manual biomechanical rules (e.g., custom trigonometric knee/trunk angle thresholds, arbitrary NIOSH ergonomic indices, custom OpenCV gauges) frequently causes:
- **High False Positive Rates**: Rigid angle thresholds fail under perspective changes, camera tilts, or subject rotation.
- **Occlusion Brittleness**: When a joint or object is partially hidden, manual trigonometry returns erratic values or div-by-zero errors.
- **Architectural Debt**: Custom drawing functions clutter output frames and obscure underlying neural network feature maps.

### The Ultralytics Standard Solution
By adhering to official **Ultralytics YOLOv8** standards:
1. **Pose Estimation** uses the standardized **COCO 17-Keypoint Topology** with confidence-weighted limb graphs.
2. **Instance Segmentation** uses **ProtoNet Mask Heads** with alpha-blended transparent overlays and polygon contours.
3. **Oriented Bounding Boxes (OBB)** uses the **DOTA Standard** ($xywhr$ rotated bounding boxes) with orientation angles $\theta \in [-\pi/2, \pi/2]$.
4. Visual rendering relies on native `result.plot()`, providing calibrated colors, confidence badges, and zero synthetic distortion.

---

## 2. Official Ultralytics Task Specifications

| Task | Official Documentation | Standard Dataset | Output Representation | Pretrained Weights |
| :--- | :--- | :--- | :--- | :--- |
| **Pose Estimation** | [`docs.ultralytics.com/tasks/pose/`](https://docs.ultralytics.com/tasks/pose/) | COCO Keypoints | 17 Keypoints $[x, y, v]$ + Bounding Box | `yolov8s-pose.pt` |
| **Instance Segmentation** | [`docs.ultralytics.com/tasks/segment/`](https://docs.ultralytics.com/tasks/segment/) | COCO Segmentation | Pixel Masks + Polygon Contours | `yolov8s-seg.pt` |
| **Oriented Bounding Box** | [`docs.ultralytics.com/tasks/obb/`](https://docs.ultralytics.com/tasks/obb/) | DOTA (Aerial/Overhead) | 4 Vertices $[(x_i, y_i)_{i=1}^4]$ or $[x, y, w, h, \theta]$ | `yolov8s-obb.pt` |

---

## 3. Dataset Formats & Annotations

### Task 1: Human Pose Estimation (COCO Format)
Official reference: [Ultralytics Pose Dataset Guide](https://docs.ultralytics.com/datasets/pose/)

Each annotation line in the label `.txt` file represents one person:
```
<class-index> <x_center> <y_center> <width> <height> <px1> <py1> <pz1> ... <px17> <py17> <pz17>
```
- All coordinates are normalized to $[0, 1]$.
- Visibility flag $pz_i$:
  - `0`: Keypoint not labeled (not in image).
  - `1`: Keypoint labeled but occluded / invisible.
  - `2`: Keypoint labeled and fully visible.
- **17 Keypoints**:
  1. Nose, 2. Left Eye, 3. Right Eye, 4. Left Ear, 5. Right Ear
  6. Left Shoulder, 7. Right Shoulder, 8. Left Elbow, 9. Right Elbow
  10. Left Wrist, 11. Right Wrist, 12. Left Hip, 13. Right Hip
  14. Left Knee, 15. Right Knee, 16. Left Ankle, 17. Right Ankle

### Task 2: Instance Segmentation (COCO Polygon Format)
Official reference: [Ultralytics Segment Dataset Guide](https://docs.ultralytics.com/datasets/segment/)

Each annotation line represents an object polygon:
```
<class-index> <x1> <y1> <x2> <y2> <x3> <y3> ... <xn> <yn>
```
- Normalized to $[0, 1]$.
- Supports arbitrary polygon vertex counts $n \ge 3$.
- Multiple disconnected masks for the same object are represented as separate polygon entries sharing the same instance ID.

### Task 3: Oriented Bounding Boxes (DOTA Format)
Official reference: [Ultralytics OBB Dataset Guide](https://docs.ultralytics.com/datasets/obb/)

Each annotation line represents a rotated rectangle:
```
<class-index> <x1> <y1> <x2> <y2> <x3> <y3> <x4> <y4>
```
- The 4 vertices are ordered clockwise starting from the top-left vertex relative to object orientation.
- In memory, Ultralytics represents OBBs as `[x_center, y_center, width, height, angle_radians]`.

---

## 4. Production Training & Validation Pipelines

### Python Training API
```python
from ultralytics import YOLO

# 1. Pose Estimation
pose_model = YOLO("yolov8s-pose.pt")
pose_model.train(data="coco8-pose.yaml", epochs=50, imgsz=640, batch=16, project="runs/pose")

# 2. Instance Segmentation
seg_model = YOLO("yolov8s-seg.pt")
seg_model.train(data="coco8-seg.yaml", epochs=50, imgsz=640, batch=16, project="runs/seg")

# 3. Oriented Bounding Boxes
obb_model = YOLO("yolov8s-obb.pt")
obb_model.train(data="dota8.yaml", epochs=50, imgsz=1024, batch=8, project="runs/obb")
```

### CLI Training Commands
```bash
# Pose
yolo pose train data=coco8-pose.yaml model=yolov8s-pose.pt epochs=50 imgsz=640 batch=16

# Segmentation
yolo segment train data=coco8-seg.yaml model=yolov8s-seg.pt epochs=50 imgsz=640 batch=16

# Oriented Bounding Boxes
yolo obb train data=dota8.yaml model=yolov8s-obb.pt epochs=50 imgsz=1024 batch=8
```

---

## 5. Official Verification Media & Deliverables

All validation media are rendered from authentic real-world video footage and processed using native Ultralytics inference and `result.plot()` APIs.

### Deliverables Manifest
1. **Pose Estimation (Gym Deadlift & Squat)**
   - MP4 Video: [`official_yolo_pose_validation.mp4`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_pose_validation.mp4)
   - Animated Preview: [`official_yolo_pose_preview.gif`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_pose_preview.gif)
   - Keyframe Sample 1: [`official_yolo_pose_sample_1.png`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_pose_sample_1.png)
   - Keyframe Sample 2: [`official_yolo_pose_sample_2.png`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_pose_sample_2.png)

2. **Instance Segmentation (Urban City Traffic)**
   - MP4 Video: [`official_yolo_seg_validation.mp4`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_seg_validation.mp4)
   - Animated Preview: [`official_yolo_seg_preview.gif`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_seg_preview.gif)
   - Keyframe Sample 1: [`official_yolo_seg_sample_1.png`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_seg_sample_1.png)
   - Keyframe Sample 2: [`official_yolo_seg_sample_2.png`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_seg_sample_2.png)

3. **Oriented Bounding Boxes (Aerial Drone City Streets)**
   - MP4 Video: [`official_yolo_obb_validation.mp4`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_obb_validation.mp4)
   - Animated Preview: [`official_yolo_obb_preview.gif`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_obb_preview.gif)
   - Keyframe Sample 1: [`official_yolo_obb_sample_1.png`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_obb_sample_1.png)
   - Keyframe Sample 2: [`official_yolo_obb_sample_2.png`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/official_yolo_obb_sample_2.png)

4. **Interactive Media Hub**
   - [`verification_media_hub.html`](file:///c:/Users/Sanchit/Projects/VisionForge/verification_media/verification_media_hub.html)
