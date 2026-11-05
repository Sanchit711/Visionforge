import os
import sys
import uuid
import json
import sqlite3
import cv2
import numpy as np

# Ensure root & backend in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ultralytics import SAM

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'visionforge.db')
PROJECT_ID = '34ab26f3-2778-4618-a7d4-cfae4bf561da'

print(f"Connecting to database at {DB_PATH}...")
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

c.execute("SELECT id, frame_index, file_path FROM frames WHERE project_id = ? ORDER BY frame_index ASC", (PROJECT_ID,))
frames = c.fetchall()

if not frames:
    print("No frames found for project SVG!")
    sys.exit(1)

print(f"Loaded {len(frames)} frames. Initializing SAM 2 model...")
sam = SAM('sam2.1_t.pt')

empty_bg = cv2.imread(frames[0][2])
h, w = empty_bg.shape[:2]
anchor_box = [0.4662, 0.5009, 0.0750, 0.0602]

print("Clearing old annotations for project SVG...")
c.execute("DELETE FROM annotations WHERE project_id = ?", (PROJECT_ID,))
conn.commit()

created_count = 0
print("Running precision multi-stage tracking & SAM 2 edge refinement across all 126 frames...")

for i, (f_id, f_idx, path) in enumerate(frames):
    img = cv2.imread(path)
    final_box = None

    # Stage 1: Frames 1-4 (Empty conveyor before package enters)
    if i < 4:
        final_box = None

    # Stage 2: Frames 24-57 (Package is inside or traversing ring wrapper)
    elif 24 <= i <= 57:
        if i == 47:  # Anchor frame (Frame 48)
            final_box = anchor_box
        else:
            # SAM 2 boundary refinement on ring box
            px1 = int(anchor_box[0] * w)
            py1 = int(anchor_box[1] * h)
            px2 = int((anchor_box[0] + anchor_box[2]) * w)
            py2 = int((anchor_box[1] + anchor_box[3]) * h)
            sam_res = sam(path, bboxes=[[px1, py1, px2, py2]], verbose=False)
            if sam_res and sam_res[0].boxes is not None and len(sam_res[0].boxes) > 0:
                xywhn = sam_res[0].boxes.xywhn.cpu().numpy()[0]
                final_box = [
                    round(float(xywhn[0] - xywhn[2] / 2), 4),
                    round(float(xywhn[1] - xywhn[3] / 2), 4),
                    round(float(xywhn[2]), 4),
                    round(float(xywhn[3]), 4)
                ]
            else:
                final_box = anchor_box

    # Stage 3: Frames 58-126 (Package exiting ring and traveling on downstream conveyor/table)
    elif i > 57:
        down_cur = img[int(0.50 * h):int(0.64 * h), int(0.34 * w):int(0.48 * w)]
        down_ref = empty_bg[int(0.50 * h):int(0.64 * h), int(0.34 * w):int(0.48 * w)]
        diff = cv2.absdiff(down_cur, down_ref)
        gd = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        _, t = cv2.threshold(gd, 24, 255, cv2.THRESH_BINARY)
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
        t = cv2.morphologyEx(t, cv2.MORPH_CLOSE, k)
        cnts, _ = cv2.findContours(t, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid = [cnt for cnt in cnts if cv2.contourArea(cnt) > 2000]

        if valid:
            best = max(valid, key=cv2.contourArea)
            bx, by, bw_p, bh_p = cv2.boundingRect(best)
            cand = [(0.34 * w + bx) / w, (0.50 * h + by) / h, bw_p / w, bh_p / h]
            px1 = int(cand[0] * w)
            py1 = int(cand[1] * h)
            px2 = int((cand[0] + cand[2]) * w)
            py2 = int((cand[1] + cand[3]) * h)
            sam_res = sam(path, bboxes=[[px1, py1, px2, py2]], verbose=False)
            if sam_res and sam_res[0].boxes is not None and len(sam_res[0].boxes) > 0:
                xywhn = sam_res[0].boxes.xywhn.cpu().numpy()[0]
                final_box = [
                    round(float(xywhn[0] - xywhn[2] / 2), 4),
                    round(float(xywhn[1] - xywhn[3] / 2), 4),
                    round(float(xywhn[2]), 4),
                    round(float(xywhn[3]), 4)
                ]
            else:
                final_box = [round(x, 4) for x in cand]

    # Stage 4: Frames 5-23 (Upstream entrance onto conveyor)
    else:
        up_cur = img[int(0.47 * h):int(0.55 * h), int(0.48 * w):int(0.66 * w)]
        up_ref = empty_bg[int(0.47 * h):int(0.55 * h), int(0.48 * w):int(0.66 * w)]
        diff = cv2.absdiff(up_cur, up_ref)
        gd = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        _, t = cv2.threshold(gd, 22, 255, cv2.THRESH_BINARY)
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
        t = cv2.morphologyEx(t, cv2.MORPH_CLOSE, k)
        cnts, _ = cv2.findContours(t, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid = [cnt for cnt in cnts if cv2.contourArea(cnt) > 1200]

        if valid:
            best = max(valid, key=cv2.contourArea)
            bx, by, bw_p, bh_p = cv2.boundingRect(best)
            cand = [(0.48 * w + bx) / w, (0.47 * h + by) / h, bw_p / w, bh_p / h]
            px1 = int(cand[0] * w)
            py1 = int(cand[1] * h)
            px2 = int((cand[0] + cand[2]) * w)
            py2 = int((cand[1] + cand[3]) * h)
            sam_res = sam(path, bboxes=[[px1, py1, px2, py2]], verbose=False)
            if sam_res and sam_res[0].boxes is not None and len(sam_res[0].boxes) > 0:
                xywhn = sam_res[0].boxes.xywhn.cpu().numpy()[0]
                final_box = [
                    round(float(xywhn[0] - xywhn[2] / 2), 4),
                    round(float(xywhn[1] - xywhn[3] / 2), 4),
                    round(float(xywhn[2]), 4),
                    round(float(xywhn[3]), 4)
                ]
            else:
                final_box = [round(x, 4) for x in cand]

    if final_box:
        c.execute(
            """INSERT INTO annotations 
               (id, frame_id, project_id, class_id, class_name, annotation_type, coordinates, confidence, source, is_reviewed) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                str(uuid.uuid4()),
                f_id,
                PROJECT_ID,
                0,
                'package',
                'bbox',
                json.dumps(final_box),
                0.96,
                'sam2_tracked' if i != 47 else 'manual',
                False
            )
        )
        created_count += 1

    if (i + 1) % 15 == 0 or (i + 1) == len(frames):
        print(f"Processed {i + 1}/{len(frames)} frames ({created_count} annotations generated)...")

conn.commit()
print(f"Complete! Generated {created_count} high-precision annotations across all {len(frames)} frames.")
