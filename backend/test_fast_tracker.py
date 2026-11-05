import os
import sys
import time
import cv2
import numpy as np
from ultralytics import SAM
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'visionforge.db')
PROJECT_ID = '34ab26f3-2778-4618-a7d4-cfae4bf561da'

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
c.execute("SELECT id, frame_index, file_path FROM frames WHERE project_id = ? ORDER BY frame_index ASC", (PROJECT_ID,))
frames = c.fetchall()

print(f"Loaded {len(frames)} frames. Initializing SAM 2...")
sam = SAM('sam2.1_t.pt')

# Empty background from frame 1
bg_img = cv2.imread(frames[0][2])
h, w = bg_img.shape[:2]

anchor_box = [0.4662, 0.5009, 0.0750, 0.0602]

t0 = time.time()
# Test on frames 60 to 70 (downstream rollout)
for test_idx in range(58, 68):
    f_id, f_idx, path = frames[test_idx]
    img = cv2.imread(path)
    
    # Downstream difference
    down_cur = img[int(0.50 * h):int(0.64 * h), int(0.34 * w):int(0.48 * w)]
    down_ref = bg_img[int(0.50 * h):int(0.64 * h), int(0.34 * w):int(0.48 * w)]
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
        
        # Test fast ROI SAM 2
        px1 = int(cand[0] * w)
        py1 = int(cand[1] * h)
        px2 = int((cand[0] + cand[2]) * w)
        py2 = int((cand[1] + cand[3]) * h)
        
        pad_x = int((px2 - px1) * 0.3)
        pad_y = int((py2 - py1) * 0.3)
        cr_x1 = max(0, px1 - pad_x)
        cr_y1 = max(0, py1 - pad_y)
        cr_x2 = min(w, px2 + pad_x)
        cr_y2 = min(h, py2 + pad_y)
        
        crop_roi = img[cr_y1:cr_y2, cr_x1:cr_x2]
        c_bx1 = px1 - cr_x1
        c_by1 = py1 - cr_y1
        c_bx2 = px2 - cr_x1
        c_by2 = py2 - cr_y1
        
        sam_t0 = time.time()
        sam_res = sam(crop_roi, bboxes=[[c_bx1, c_by1, c_bx2, c_by2]], verbose=False)
        sam_elapsed = time.time() - sam_t0
        
        if sam_res and len(sam_res) > 0 and sam_res[0].boxes is not None and len(sam_res[0].boxes) > 0:
            box_roi = sam_res[0].boxes.xyxy.cpu().numpy()[0]
            # Map back to full frame
            glob_x1 = (box_roi[0] + cr_x1) / w
            glob_y1 = (box_roi[1] + cr_y1) / h
            glob_x2 = (box_roi[2] + cr_x1) / w
            glob_y2 = (box_roi[3] + cr_y1) / h
            final_box = [round(glob_x1, 4), round(glob_y1, 4), round(glob_x2 - glob_x1, 4), round(glob_y2 - glob_y1, 4)]
            print(f"Frame {test_idx+1}: ROI SAM 2 finished in {sam_elapsed:.3f}s -> box: {final_box}")

total_elapsed = time.time() - t0
print(f"Total time for 10 frames: {total_elapsed:.2f}s (avg: {total_elapsed/10:.3f}s/frame)")
