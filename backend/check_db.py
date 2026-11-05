import sqlite3
import json

conn = sqlite3.connect('data/visionforge.db')
c = conn.cursor()
c.execute("SELECT count(*) FROM annotations WHERE project_id='34ab26f3-2778-4618-a7d4-cfae4bf561da'")
print("Total annotations for SVG:", c.fetchone()[0])

c.execute("""
    SELECT f.frame_index, a.class_name, a.coordinates, a.source 
    FROM annotations a 
    JOIN frames f ON a.frame_id = f.id 
    WHERE a.project_id = '34ab26f3-2778-4618-a7d4-cfae4bf561da' 
    AND f.frame_index IN (0, 1, 6, 47, 62, 65, 100)
    ORDER BY f.frame_index ASC
""")
rows = c.fetchall()
for r in rows:
    print(f"Frame {r[0]+1} (index {r[0]}): class={r[1]} coords={r[2]} source={r[3]}")
