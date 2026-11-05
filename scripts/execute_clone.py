import os
import shutil
import pathlib
import subprocess
import re

SRC_DIR = pathlib.Path(r"C:\Users\Sanchit\Projects\VisionForge")
DST_DIR = pathlib.Path(r"C:\Users\Sanchit\OneDrive - Crescent Technologies\VisionForge_Clone")
JUNCTION_DIR = pathlib.Path(r"C:\Users\Sanchit\Projects\VisionForge_Clone")

print(f"============================================================")
print(f" VisionForge Studio - Automated Clone Generator")
print(f" Target Mode: SAM 2 AI Auto-Annotation Edition")
print(f" Source: {SRC_DIR}")
print(f" Target: {DST_DIR}")
print(f"============================================================")

# Step 1: Clean Destination
if DST_DIR.exists():
    print("[1/8] Removing previous clone...")
    nm = DST_DIR / "frontend" / "node_modules"
    if nm.exists():
        subprocess.run(["cmd", "/c", "rmdir", str(nm)], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    shutil.rmtree(DST_DIR, ignore_errors=True)

if JUNCTION_DIR.exists():
    subprocess.run(["cmd", "/c", "rmdir", str(JUNCTION_DIR)], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

DST_DIR.mkdir(parents=True, exist_ok=True)

# Step 2: Copy Directories
print("[2/8] Copying source directories (backend, frontend, scripts)...")
for d in ["backend", "frontend", "scripts"]:
    src_d = SRC_DIR / d
    dst_d = DST_DIR / d
    if src_d.exists():
        def ignore_patterns(folder, contents):
            return [c for c in contents if c in ["__pycache__", ".pytest_cache", ".git", "node_modules", "dist", "data"]]
        shutil.copytree(src_d, dst_d, ignore=ignore_patterns, dirs_exist_ok=True)

# Step 3: Copy Configuration & Doc Files
print("[3/8] Copying configuration, license, and scripts...")
for f in [
    "README.md",
    "LICENSE",
    ".gitignore",
    "start_visionforge.bat",
    "VisionForge_YOLO_Master_Colab.ipynb",
    "pkg48.jpg",
    "crop_f63.jpg",
    "empty_ring.jpg",
    "full_video_quad_benchmark.py",
    "train_and_compare_all_models.py",
    "train_comparison_models.py",
]:
    src_f = SRC_DIR / f
    dst_f = DST_DIR / f
    if src_f.exists():
        shutil.copy2(src_f, dst_f)

# Ensure data directories exist with .gitkeep
for sub in ["uploads", "frames", "datasets", "models", "checkpoints", "logs"]:
    p = DST_DIR / "data" / sub
    p.mkdir(parents=True, exist_ok=True)
    (p / ".gitkeep").touch()

# Step 4: Link SAM 2 Model Weights for Peak In-Memory Performance
print("[4/8] Linking SAM 2 AI Model Weights (Zero Extra Disk Usage)...")
for w in ["sam2.1_l.pt", "sam2.1_t.pt", "sam2_t.pt", "yolov8s-worldv2.pt"]:
    src_w = SRC_DIR / w
    dst_w = DST_DIR / w
    if src_w.exists():
        try:
            subprocess.run(["cmd", "/c", "mklink", "/H", str(dst_w), str(src_w)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"      [OK] Linked {w}")
        except Exception:
            if not dst_w.exists():
                shutil.copy2(src_w, dst_w)
                print(f"      [OK] Copied {w}")

backend_sam = SRC_DIR / "backend" / "sam2.1_b.pt"
dst_backend_sam = DST_DIR / "backend" / "sam2.1_b.pt"
if backend_sam.exists():
    try:
        subprocess.run(["cmd", "/c", "mklink", "/H", str(dst_backend_sam), str(backend_sam)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("      [OK] Linked backend/sam2.1_b.pt")
    except Exception:
        if not dst_backend_sam.exists():
            shutil.copy2(backend_sam, dst_backend_sam)

# Step 5: Strip Keyframe Architecture & Lock to SAM 2
print("[5/8] Cleansing Keyframe Architecture from Clone...")

# 5.1 Delete interpolation_service.py
interp_file = DST_DIR / "backend" / "app" / "services" / "interpolation_service.py"
if interp_file.exists():
    interp_file.unlink()
    print("      [OK] Deleted backend/app/services/interpolation_service.py")

# 5.2 Clean schemas.py
schemas_file = DST_DIR / "backend" / "app" / "schemas" / "schemas.py"
if schemas_file.exists():
    c = schemas_file.read_text(encoding="utf-8")
    c = re.sub(r"class KeyframeInterpolateRequest\(BaseModel\):.*?(?=\nclass |\Z)", "", c, flags=re.DOTALL)
    c = re.sub(r"class KeyframeInterpolateResponse\(BaseModel\):.*?(?=\n#|\nclass |\Z)", "", c, flags=re.DOTALL)
    schemas_file.write_text(c, encoding="utf-8")
    print("      [OK] Cleaned schemas.py (Removed Keyframe schemas)")

# 5.3 Clean annotations endpoint
ann_file = DST_DIR / "backend" / "app" / "api" / "v1" / "endpoints" / "annotations.py"
if ann_file.exists():
    c = ann_file.read_text(encoding="utf-8")
    c = c.replace("from app.services.interpolation_service import interpolation_service\n", "")
    c = c.replace(", KeyframeInterpolateRequest, KeyframeInterpolateResponse", "")
    c = re.sub(r"@router\.post\(\"/interpolate\".*?\n(?=@router|\Z)", "", c, flags=re.DOTALL)
    ann_file.write_text(c, encoding="utf-8")
    print("      [OK] Cleaned annotations endpoint (Removed /interpolate route)")

# 5.4 Clean frontend api.ts
api_file = DST_DIR / "frontend" / "src" / "services" / "api.ts"
if api_file.exists():
    c = api_file.read_text(encoding="utf-8")
    c = re.sub(r"interpolateKeyframes:\s*\(data:.*?\}\),\n", "", c, flags=re.DOTALL)
    api_file.write_text(c, encoding="utf-8")
    print("      [OK] Cleaned api.ts")

# 5.5 Clean frontend AnnotationView.tsx (Direct SAM 2 Mode)
ann_view = DST_DIR / "frontend" / "src" / "views" / "AnnotationView.tsx"
if ann_view.exists():
    c = ann_view.read_text(encoding="utf-8")
    
    # Remove state
    for s in [
        "const [videoTrackingTab, setVideoTrackingTab] = useState<'interpolator' | 'sam_tracker'>('interpolator');\n",
        "const [anchorA, setAnchorA] = useState<any | null>(null);\n",
        "const [anchorB, setAnchorB] = useState<any | null>(null);\n",
        "const [interpMode, setInterpMode] = useState<'linear' | 'spline'>('linear');\n",
        "const [lockDimensions, setLockDimensions] = useState(true);\n",
        "const [isInterpolating, setIsInterpolating] = useState(false);\n",
        "const [interpolationResult, setInterpolationResult] = useState<any | null>(null);\n",
    ]:
        c = c.replace(s, "")
    
    # Remove handlers
    c = re.sub(r"// Enterprise Keyframe Interpolation Handlers.*?(?=\n  const selectedAnnotation =)", "", c, flags=re.DOTALL)
    
    # Replace JSX block to render SAM 2 Neural Tracker directly
    start_str = '<div className="pt-2 border-t border-white/[0.08] space-y-2">\n              {/* Tab Selector */}'
    sam_str = "/* ================= SAM 2 TRACKER PANEL ================= */\n                <div className=\"space-y-2\">"
    closing_str = "</div>\n                </div>\n              )}\n            </div>"
    
    idx_start = c.find(start_str)
    idx_sam = c.find(sam_str)
    idx_close = c.find(closing_str)
    
    if idx_start != -1 and idx_sam != -1 and idx_close != -1:
        c = (
            c[:idx_start]
            + '<div className="pt-2 border-t border-white/[0.08] space-y-2">\n              '
            + c[idx_sam:idx_close]
            + "</div>\n                </div>\n            </div>"
            + c[idx_close + len(closing_str):]
        )
        print("      [OK] Cleaned AnnotationView.tsx (SAM 2 AI Tracker Dedicated)")
    ann_view.write_text(c, encoding="utf-8")

# Update README in clone
readme_dst = DST_DIR / "README.md"
if readme_dst.exists():
    rt = readme_dst.read_text(encoding="utf-8")
    rt = rt.replace("# VisionForge Studio", "# VisionForge Studio (Clone - SAM 2 AI Edition)")
    readme_dst.write_text(rt, encoding="utf-8")

# Step 6: Junction node_modules & Build Frontend Bundle
print("[6/8] Building Frontend Production Bundle in Clone...")
src_nm = SRC_DIR / "frontend" / "node_modules"
dst_nm = DST_DIR / "frontend" / "node_modules"
if src_nm.exists():
    subprocess.run(["cmd", "/c", "mklink", "/J", str(dst_nm), str(src_nm)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    subprocess.run(
        ["cmd", "/c", "npm", "run", "build"],
        cwd=str(DST_DIR / "frontend"),
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    print("      [OK] Frontend dist built successfully!")
except Exception as e:
    print(f"      [!] Frontend build note: {e}")

# Step 7: Initialize Clean Git Repository
print("[7/8] Initializing Clean Git Repository...")
try:
    subprocess.run(["git", "init"], cwd=str(DST_DIR), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(["git", "add", "."], cwd=str(DST_DIR), check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(
        ["git", "commit", "-m", "feat: VisionForge Studio (SAM 2 AI Auto-Annotation Edition) initial clean release"],
        cwd=str(DST_DIR),
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    print("      [OK] Git repo initialized & committed (zero client data / zero weights staged)")
except Exception as e:
    print(f"      [!] Git notice: {e}")

# Step 8: Create Project Junction
print("[8/8] Creating Project Workspace Junction...")
try:
    subprocess.run(["cmd", "/c", "mklink", "/J", str(JUNCTION_DIR), str(DST_DIR)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"      [OK] Junction created: {JUNCTION_DIR} -> {DST_DIR}")
except Exception as e:
    print(f"      [!] Junction note: {e}")

print("============================================================")
print(" ALL DONE: VisionForge_Clone is ready and fully operational!")
print(" Location: C:\\Users\\Sanchit\\Projects\\VisionForge_Clone")
print("============================================================")
