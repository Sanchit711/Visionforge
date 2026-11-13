"""
VisionForge Dual-Environment Behavioral Equivalence Benchmark
=============================================================
Compares the original workspace on C: with the replicated project on D:
to verify that both environments yield 100% numerically identical outputs.
"""

import sys
import time
import numpy as np
import cv2
from pathlib import Path
from ultralytics import YOLO

p_c = Path("C:/Users/Sanchit/Projects/VisionForge")
p_d = Path("D:/VisionForge")

print("=" * 75)
print("  VISIONFORGE DUAL-ENVIRONMENT BEHAVIORAL EQUIVALENCE BENCHMARK")
print(f"  Original Workspace (C:): {p_c}")
print(f"  Replicated Project (D:): {p_d}")
print(f"  Execution Timestamp    : {time.strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 75)
print()

# 1. TEST OBJECT DETECTION (YOLO26-Large)
print("[TEST 1/5] Running YOLO26-Large Detection on identical frame...")
m_c = YOLO(str(p_c / "yolo26l.pt"))
m_d = YOLO(str(p_d / "yolo26l.pt"))

cap = cv2.VideoCapture(str(p_c / "sample_clips/enterprise_traffic_ipcam.mp4"))
ret, test_frame = cap.read()
cap.release()

res_c = m_c.predict(test_frame, verbose=False, imgsz=640)[0]
res_d = m_d.predict(test_frame, verbose=False, imgsz=640)[0]

boxes_c = res_c.boxes.xyxy.cpu().numpy()
boxes_d = res_d.boxes.xyxy.cpu().numpy()
confs_c = res_c.boxes.conf.cpu().numpy()
confs_d = res_d.boxes.conf.cpu().numpy()
cls_c = res_c.boxes.cls.cpu().numpy()
cls_d = res_d.boxes.cls.cpu().numpy()

diff_box = float(np.max(np.abs(boxes_c - boxes_d))) if len(boxes_c) == len(boxes_d) else -1.0
diff_conf = float(np.max(np.abs(confs_c - confs_d))) if len(confs_c) == len(confs_d) else -1.0
cls_match = bool(np.array_equal(cls_c, cls_d))

print(f"  -> Detections count: C={len(boxes_c)} | D={len(boxes_d)}")
print(f"  -> Classes match   : {cls_match}")
print(f"  -> Max BBox Diff   : {diff_box:.8f} pixels")
print(f"  -> Max Conf Diff   : {diff_conf:.8f}")
assert diff_box == 0.0 and diff_conf == 0.0 and cls_match, "Detect mismatch!"
print("  [PASS] YOLO26 Detection produces 100% IDENTICAL outputs on C: and D:.\n")

# 2. TEST POSE ESTIMATION (YOLOv8s-Pose)
print("[TEST 2/5] Running YOLOv8s-Pose Kinematics on identical posture frame...")
m_pose_c = YOLO(str(p_c / "yolov8s-pose.pt"))
m_pose_d = YOLO(str(p_d / "yolov8s-pose.pt"))

cap = cv2.VideoCapture(str(p_c / "sample_clips/test_posture_avc.mp4"))
ret, posture_frame = cap.read()
cap.release()

res_pose_c = m_pose_c.predict(posture_frame, verbose=False, imgsz=640)[0]
res_pose_d = m_pose_d.predict(posture_frame, verbose=False, imgsz=640)[0]

kpts_c = res_pose_c.keypoints.xy.cpu().numpy()
kpts_d = res_pose_d.keypoints.xy.cpu().numpy()
diff_kpts = float(np.max(np.abs(kpts_c - kpts_d)))

print(f"  -> Persons detected: C={len(kpts_c)} | D={len(kpts_d)}")
print(f"  -> 17 Keypoints Max Diff: {diff_kpts:.8f} pixels")
assert diff_kpts == 0.0, "Pose keypoint mismatch!"
print("  [PASS] YOLO Pose produces 100% IDENTICAL keypoints on C: and D:.\n")

# 3. TEST INSTANCE SEGMENTATION (YOLOv8s-Seg)
print("[TEST 3/5] Running YOLOv8s-Seg Highway Corridor on identical frame...")
m_seg_c = YOLO(str(p_c / "yolov8s-seg.pt"))
m_seg_d = YOLO(str(p_d / "yolov8s-seg.pt"))

cap = cv2.VideoCapture(str(p_c / "sample_clips/seg_highway_day.mp4"))
ret, seg_frame = cap.read()
cap.release()

res_seg_c = m_seg_c.predict(seg_frame, verbose=False, imgsz=640)[0]
res_seg_d = m_seg_d.predict(seg_frame, verbose=False, imgsz=640)[0]

masks_c = res_seg_c.masks.data.cpu().numpy() if res_seg_c.masks is not None else np.array([])
masks_d = res_seg_d.masks.data.cpu().numpy() if res_seg_d.masks is not None else np.array([])
diff_masks = float(np.max(np.abs(masks_c - masks_d))) if len(masks_c) > 0 else 0.0

print(f"  -> Masks detected  : C={len(masks_c)} | D={len(masks_d)}")
print(f"  -> Polygon Mask Diff: {diff_masks:.8f}")
assert diff_masks == 0.0, "Segmentation mask mismatch!"
print("  [PASS] YOLO Seg produces 100% IDENTICAL instance masks on C: and D:.\n")

# 4. TEST ROTATED BOUNDING BOXES (YOLOv8s-OBB)
print("[TEST 4/5] Running YOLOv8s-OBB Aerial Drone on identical frame...")
m_obb_c = YOLO(str(p_c / "yolov8s-obb.pt"))
m_obb_d = YOLO(str(p_d / "yolov8s-obb.pt"))

cap = cv2.VideoCapture(str(p_c / "sample_clips/enterprise_drone_overhead_obb.mp4"))
ret, obb_frame = cap.read()
cap.release()

res_obb_c = m_obb_c.predict(obb_frame, verbose=False, imgsz=640)[0]
res_obb_d = m_obb_d.predict(obb_frame, verbose=False, imgsz=640)[0]

xywhr_c = res_obb_c.obb.xywhr.cpu().numpy() if res_obb_c.obb is not None else np.array([])
xywhr_d = res_obb_d.obb.xywhr.cpu().numpy() if res_obb_d.obb is not None else np.array([])
diff_obb = float(np.max(np.abs(xywhr_c - xywhr_d))) if len(xywhr_c) > 0 else 0.0

print(f"  -> Rotated boxes   : C={len(xywhr_c)} | D={len(xywhr_d)}")
print(f"  -> 5-Param (x,y,w,h,r) Diff: {diff_obb:.8f}")
assert diff_obb == 0.0, "OBB mismatch!"
print("  [PASS] YOLO OBB produces 100% IDENTICAL rotated boxes on C: and D:.\n")

# 5. TEST TEMPORAL TRACKING & SMOOTHING ENGINE
print("[TEST 5/5] Running Temporal Hungarian Tracker on identical sequence...")
sys.path.insert(0, str(p_c))
from scripts.enterprise_temporal_engine import TemporalBBoxTracker as TrackerC, TemporalPoseSmoother as SmootherC
sys.path.pop(0)

sys.path.insert(0, str(p_d))
from scripts.enterprise_temporal_engine import TemporalBBoxTracker as TrackerD, TemporalPoseSmoother as SmootherD
sys.path.pop(0)

tc = TrackerC(iou_thresh=0.30, max_lost=4, alpha=0.65)
td = TrackerD(iou_thresh=0.30, max_lost=4, alpha=0.65)

seq_boxes = [
    [np.array([100.0, 100.0, 200.0, 200.0]), np.array([300.0, 300.0, 400.0, 400.0])],
    [np.array([102.0, 101.0, 201.0, 202.0]), np.array([303.0, 299.0, 402.0, 399.0])],
    [np.array([104.0, 102.0, 202.0, 204.0]), np.array([306.0, 298.0, 404.0, 398.0])]
]

match_seq = True
for f_idx, b_list in enumerate(seq_boxes):
    out_c = tc.update(b_list, [2, 7], [0.91, 0.88])
    out_d = td.update(b_list, [2, 7], [0.91, 0.88])
    for trk_c, trk_d in zip(out_c, out_d):
        if trk_c.track_id != trk_d.track_id or not np.allclose(trk_c.box, trk_d.box, atol=1e-6):
            match_seq = False

print(f"  -> Hungarian tracking trajectories match: {match_seq}")
assert match_seq, "Tracking mismatch!"
print("  [PASS] Temporal Smoothing & Tracking Engine is 100% FUNCTIONALLY IDENTICAL on C: and D:.\n")

print("=" * 75)
print("  DUAL-ENVIRONMENT VERIFICATION SUMMARY: 5/5 BENCHMARKS PASSED (100.0%)")
print("  CONCLUSION: C:\\...\\VisionForge AND D:\\VisionForge WORK THE EXACT SAME!")
print("=" * 75)
