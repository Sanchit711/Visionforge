import sqlite3
import json

conn = sqlite3.connect('data/visionforge.db')
c = conn.cursor()

# Get all 126 frames ordered by frame_index
c.execute("""
    SELECT id, frame_index, file_path 
    FROM frames 
    WHERE project_id = '34ab26f3-2778-4618-a7d4-cfae4bf561da' 
    ORDER BY frame_index ASC
""")
frames = c.fetchall()

print(f"Total frames in SVG project: {len(frames)}")

c.execute("""
    SELECT frame_id, class_name, coordinates, source, confidence 
    FROM annotations 
    WHERE project_id = '34ab26f3-2778-4618-a7d4-cfae4bf561da'
""")
ann_map = {}
for r in c.fetchall():
    ann_map[r[0]] = (r[1], json.loads(r[2]), r[3], r[4])

check_indices = [1, 2, 5, 7, 24, 48, 60, 63, 66, 80, 100, 126]
for num in check_indices:
    idx = num - 1
    if idx < len(frames):
        f_id, f_vid_idx, path = frames[idx]
        if f_id in ann_map:
            cname, bbox, src, conf = ann_map[f_id]
            print(f"Frame {num:3d}/126 (video_idx {f_vid_idx}): class={cname} coords=[x={bbox[0]:.4f}, y={bbox[1]:.4f}, w={bbox[2]:.4f}, h={bbox[3]:.4f}] src={src} conf={conf}")
        else:
            print(f"Frame {num:3d}/126 (video_idx {f_vid_idx}): NO ANNOTATION (Empty conveyor)")
