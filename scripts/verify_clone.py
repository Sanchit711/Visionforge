import sys
import pathlib

backend_dir = pathlib.Path(r"C:\Users\Sanchit\Projects\VisionForge_Clone\backend")
sys.path.insert(0, str(backend_dir))

from app.main import app
print(f"[OK] VisionForge_Clone Backend loaded successfully! Registered routes: {len(app.routes)}")
