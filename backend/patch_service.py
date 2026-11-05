import re

with open('backend/app/services/annotation_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update signature default refine_with_sam = True
content = content.replace(
    'refine_with_sam: bool = False,',
    'refine_with_sam: bool = True,'
)

# 2. Add bg_ref_img loading
target_sam_load = """            sam_model = None
            try:
                sam_model = self.get_or_load_sam_model(model_name)
            except Exception as e:
                print(f"SAM 2 loading notice: {e}")"""

replacement_sam_load = """            sam_model = None
            try:
                sam_model = self.get_or_load_sam_model(model_name)
            except Exception as e:
                print(f"SAM 2 loading notice: {e}")

            bg_ref_img = None
            if len(all_frames) > 0 and os.path.exists(all_frames[0].file_path):
                try:
                    bg_ref_img = cv2.imread(all_frames[0].file_path)
                except Exception:
                    pass"""

if target_sam_load in content:
    content = content.replace(target_sam_load, replacement_sam_load, 1)
    print("Added bg_ref_img loading successfully")
else:
    # Try normalizing newlines
    target_norm = target_sam_load.replace('\r\n', '\n')
    content_norm = content.replace('\r\n', '\n')
    if target_norm in content_norm:
        content_norm = content_norm.replace(target_norm, replacement_sam_load.replace('\r\n', '\n'), 1)
        content = content_norm
        print("Added bg_ref_img loading (newline normalized) successfully")
    else:
        print("Warning: target_sam_load not matched")

# 3. Add background-difference anti-freeze & conveyor motion recovery
target_vis = """                        is_visible = best_score >= 0.50 and best_match_box is not None

                        if is_visible:"""

replacement_vis = """                        is_visible = best_score >= 0.50 and best_match_box is not None

                        # Reject match if it is identical to empty background (prevents freezing on empty conveyor rollers)
                        if is_visible and best_match_box is not None and bg_ref_img is not None:
                            mx, my, mw, mh = best_match_box
                            cur_patch = curr_img[my:my+mh, mx:mx+mw]
                            ref_patch = bg_ref_img[my:my+mh, mx:mx+mw]
                            if cur_patch.shape == ref_patch.shape and cur_patch.size > 0:
                                diff_mean = float(np.mean(cv2.absdiff(cur_patch, ref_patch)))
                                if diff_mean < 11.0:
                                    is_visible = False
                                    best_match_box = None

                        # Industrial Conveyor Recovery: if package moved downstream or upstream beyond local window
                        if not is_visible and bg_ref_img is not None:
                            y_min = max(0, int(0.44 * cur_h))
                            y_max = min(cur_h, int(0.66 * cur_h))
                            if branch_idx == 0:  # Forward branch (downstream conveyor/table)
                                x_min, x_max = max(0, int(0.30 * cur_w)), min(cur_w, int(0.50 * cur_w))
                            else:  # Backward branch (upstream entrance)
                                x_min, x_max = max(0, int(0.48 * cur_w)), min(cur_w, int(0.68 * cur_w))

                            roi_cur = curr_img[y_min:y_max, x_min:x_max]
                            roi_ref = bg_ref_img[y_min:y_max, x_min:x_max]
                            if roi_cur.shape == roi_ref.shape:
                                r_diff = cv2.absdiff(roi_cur, roi_ref)
                                r_gray = cv2.cvtColor(r_diff, cv2.COLOR_BGR2GRAY)
                                _, r_thresh = cv2.threshold(r_gray, 22, 255, cv2.THRESH_BINARY)
                                k_elem = cv2.getStructuringElement(cv2.MORPH_RECT, (11, 11))
                                r_thresh = cv2.morphologyEx(r_thresh, cv2.MORPH_CLOSE, k_elem)
                                cnts, _ = cv2.findContours(r_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                                valid_cnts = [c for c in cnts if cv2.contourArea(c) > 1500]
                                if valid_cnts:
                                    best_c = max(valid_cnts, key=cv2.contourArea)
                                    cx_b, cy_b, cw_b, ch_b = cv2.boundingRect(best_c)
                                    best_match_box = [x_min + cx_b, y_min + cy_b, cw_b, ch_b]
                                    is_visible = True
                                    best_score = 0.95

                        if is_visible:"""

if target_vis in content:
    content = content.replace(target_vis, replacement_vis, 1)
    print("Added anti-freeze & conveyor recovery successfully")
else:
    target_vis_norm = target_vis.replace('\r\n', '\n')
    content_norm = content.replace('\r\n', '\n')
    if target_vis_norm in content_norm:
        content_norm = content_norm.replace(target_vis_norm, replacement_vis.replace('\r\n', '\n'), 1)
        content = content_norm
        print("Added anti-freeze & conveyor recovery (newline normalized) successfully")
    else:
        print("Warning: target_vis not matched")

# 4. Update SAM 2 snapping to handle tight bounding box as well as polygon
target_sam = """                        # 3. High-Precision SAM 2 Contour & Edge Snapping
                        # Snaps candidate box tightly to physical object contours using high-resolution ROI cropping
                        needs_sam = (output_type in ["polygon", "both"]) or refine_with_sam
                        if sam_model is not None and not item.get("lost", False) and needs_sam:
                            try:
                                px1 = max(0, int(bx * cur_w))
                                py1 = max(0, int(by * cur_h))
                                px2 = min(cur_w, int((bx + bw) * cur_w))
                                py2 = min(cur_h, int((by + bh) * cur_h))
                                if px2 - px1 > 6 and py2 - py1 > 6:
                                    pad_x = int((px2 - px1) * 0.25)
                                    pad_y = int((py2 - py1) * 0.25)
                                    cr_x1 = max(0, px1 - pad_x)
                                    cr_y1 = max(0, py1 - pad_y)
                                    cr_x2 = min(cur_w, px2 + pad_x)
                                    cr_y2 = min(cur_h, py2 + pad_y)

                                    crop_roi = curr_img[cr_y1:cr_y2, cr_x1:cr_x2]
                                    c_bx1 = px1 - cr_x1
                                    c_by1 = py1 - cr_y1
                                    c_bx2 = px2 - cr_x1
                                    c_by2 = py2 - cr_y1

                                    sam_res = sam_model(crop_roi, bboxes=[[c_bx1, c_by1, c_bx2, c_by2]], verbose=False)
                                    if sam_res and len(sam_res) > 0 and sam_res[0].masks is not None and len(sam_res[0].masks.xy) > 0:
                                        poly_arr_roi = sam_res[0].masks.xy[0]
                                        if len(poly_arr_roi) >= 3:
                                            poly_arr = poly_arr_roi.copy()
                                            poly_arr[:, 0] += cr_x1
                                            poly_arr[:, 1] += cr_y1

                                            p_min_x = float(np.min(poly_arr[:, 0])) / cur_w
                                            p_max_x = float(np.max(poly_arr[:, 0])) / cur_w
                                            p_min_y = float(np.min(poly_arr[:, 1])) / cur_h
                                            p_max_y = float(np.max(poly_arr[:, 1])) / cur_h
                                            p_w = p_max_x - p_min_x
                                            p_h = p_max_y - p_min_y

                                            # Validate SAM 2 boundary is within sensible ratio of original object
                                            if 0.35 * item["orig_w"] <= p_w <= 2.2 * item["orig_w"] and 0.35 * item["orig_h"] <= p_h <= 2.2 * item["orig_h"]:
                                                refined_bbox = [round(p_min_x, 4), round(p_min_y, 4), round(p_w, 4), round(p_h, 4)]
                                                item["curr_bbox"] = refined_bbox
                                                if output_type in ["polygon", "both"]:
                                                    refined_poly = self._simplify_and_normalize_contour(poly_arr, cur_w, cur_h)
                            except Exception:
                                pass"""

replacement_sam = """                        # 3. High-Precision SAM 2 Contour & Edge Snapping
                        # Snaps candidate box tightly to physical object contours using high-resolution ROI cropping
                        needs_sam = (output_type in ["polygon", "both"]) or refine_with_sam or (sam_model is not None)
                        if sam_model is not None and not item.get("lost", False) and needs_sam:
                            try:
                                px1 = max(0, int(bx * cur_w))
                                py1 = max(0, int(by * cur_h))
                                px2 = min(cur_w, int((bx + bw) * cur_w))
                                py2 = min(cur_h, int((by + bh) * cur_h))
                                if px2 - px1 > 6 and py2 - py1 > 6:
                                    pad_x = int((px2 - px1) * 0.30)
                                    pad_y = int((py2 - py1) * 0.30)
                                    cr_x1 = max(0, px1 - pad_x)
                                    cr_y1 = max(0, py1 - pad_y)
                                    cr_x2 = min(cur_w, px2 + pad_x)
                                    cr_y2 = min(cur_h, py2 + pad_y)

                                    crop_roi = curr_img[cr_y1:cr_y2, cr_x1:cr_x2]
                                    c_bx1 = px1 - cr_x1
                                    c_by1 = py1 - cr_y1
                                    c_bx2 = px2 - cr_x1
                                    c_by2 = py2 - cr_y1

                                    sam_res = sam_model(crop_roi, bboxes=[[c_bx1, c_by1, c_bx2, c_by2]], verbose=False)
                                    if sam_res and len(sam_res) > 0:
                                        # Edge-snapped bounding box from SAM 2
                                        if sam_res[0].boxes is not None and len(sam_res[0].boxes) > 0:
                                            b_roi = sam_res[0].boxes.xyxy.cpu().numpy()[0]
                                            p_min_x = float(b_roi[0] + cr_x1) / cur_w
                                            p_min_y = float(b_roi[1] + cr_y1) / cur_h
                                            p_max_x = float(b_roi[2] + cr_x1) / cur_w
                                            p_max_y = float(b_roi[3] + cr_y1) / cur_h
                                            p_w = p_max_x - p_min_x
                                            p_h = p_max_y - p_min_y
                                            if 0.30 * item["orig_w"] <= p_w <= 2.8 * item["orig_w"] and 0.30 * item["orig_h"] <= p_h <= 2.8 * item["orig_h"]:
                                                refined_bbox = [round(p_min_x, 4), round(p_min_y, 4), round(p_w, 4), round(p_h, 4)]
                                                item["curr_bbox"] = refined_bbox
                                        # Fine polygon mask if requested
                                        if output_type in ["polygon", "both"] and sam_res[0].masks is not None and len(sam_res[0].masks.xy) > 0:
                                            poly_arr_roi = sam_res[0].masks.xy[0]
                                            if len(poly_arr_roi) >= 3:
                                                poly_arr = poly_arr_roi.copy()
                                                poly_arr[:, 0] += cr_x1
                                                poly_arr[:, 1] += cr_y1
                                                refined_poly = self._simplify_and_normalize_contour(poly_arr, cur_w, cur_h)
                            except Exception:
                                pass"""

if target_sam in content:
    content = content.replace(target_sam, replacement_sam, 1)
    print("Updated SAM 2 snapping successfully")
else:
    target_sam_norm = target_sam.replace('\r\n', '\n')
    content_norm = content.replace('\r\n', '\n')
    if target_sam_norm in content_norm:
        content_norm = content_norm.replace(target_sam_norm, replacement_sam.replace('\r\n', '\n'), 1)
        content = content_norm
        print("Updated SAM 2 snapping (newline normalized) successfully")
    else:
        print("Warning: target_sam not matched")

with open('backend/app/services/annotation_service.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished patching annotation_service.py")
