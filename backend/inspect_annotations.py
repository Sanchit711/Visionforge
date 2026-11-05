import sqlite3

conn = sqlite3.connect('data/visionforge.db')
c = conn.cursor()

c.execute("SELECT id, name, created_at FROM projects WHERE name LIKE '%Raw%'")
print("Projects:", c.fetchall())

c.execute("SELECT COUNT(*) FROM frames WHERE project_id='0df2d573-2e40-4b3d-9a94-87a043e7322c'")
print("Frames count in project:", c.fetchone())

c.execute("PRAGMA table_info(frames)")
print("Frames schema:", [col[1] for col in c.fetchall()])

c.execute("SELECT id, frame_index, timestamp_sec FROM frames WHERE project_id='0df2d573-2e40-4b3d-9a94-87a043e7322c' ORDER BY frame_index ASC LIMIT 5")
print("First 5 frames:", c.fetchall())

c.execute("""
    SELECT a.id, f.frame_index, a.class_name, a.coordinates, a.source 
    FROM annotations a 
    JOIN frames f ON a.frame_id = f.id 
    WHERE a.project_id='0df2d573-2e40-4b3d-9a94-87a043e7322c'
    ORDER BY f.frame_index ASC
""")
print("Annotations:", c.fetchall())
conn.close()
