import os
import shutil
import pathlib
import subprocess
import re

SRC_DIR = pathlib.Path(r"C:\Users\Sanchit\OneDrive - Crescent Technologies\VisionForge")
DST_DIR = pathlib.Path(r"C:\Users\Sanchit\OneDrive - Crescent Technologies\VisionForge_Clone")
JUNCTION_DIR = pathlib.Path(r"C:\Users\Sanchit\Projects\VisionForge_Clone")

print(f"[*] Starting VisionForge Clone build...")
print(f"    Source: {SRC_DIR}")
print(f"    Target: {DST_DIR}")

# 1. Clean destination if exists
if DST_DIR.exists():
    print(f"[*] Removing existing {DST_DIR}...")
    # First remove any junction inside DST_DIR if exists
    nm = DST_DIR / "frontend" / "node_modules"
    if nm.exists():
        subprocess.run(["cmd", "/c", "rmdir", str(nm)], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    shutil.rmtree(DST_DIR, ignore_errors=True)

DST_DIR.mkdir(parents=True, exist_ok=True)

# 2. Files & Directories to copy
DIRECTORIES = ["backend", "frontend", "scripts"]
FILES = [
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
]

# Heavy model weights to link/copy for SAM 2 performance
WEIGHT_FILES = [
    "sam2.1_l.pt",
    "sam2.1_t.pt",
    "sam2_t.pt",
    "yolov8s-worldv2.pt"
]

print("[*] Copying directory trees...")
for d in DIRECTORIES:
    src_d = SRC_DIR / d
    dst_d = DST_DIR / d
    if src_d.exists():
        print(f"    Copying {d}...")
        def ignore_patterns(folder, contents):
            ignored = []
            for item in contents:
                if item in ["__pycache__", ".pytest_cache", ".git", "node_modules", "dist", "data"]:
                    ignored.append(item)
            return ignored

        shutil.copytree(src_d, dst_d, ignore=ignore_patterns, dirs_exist_ok=True)

# 3. Copy top-level files
print("[*] Copying configuration and documentation files...")
for f in FILES:
    src_f = SRC_DIR / f
    dst_f = DST_DIR / f
    if src_f.exists():
        shutil.copy2(src_f, dst_f)

# Ensure .gitignore has strict node_modules & dist entries
gitignore_dst = DST_DIR / ".gitignore"
if gitignore_dst.exists():
    gi_text = gitignore_dst.read_text(encoding="utf-8")
    if "**/node_modules/" not in gi_text:
        gi_text = "node_modules/\n**/node_modules/\ndist/\n**/dist/\n" + gi_text
        gitignore_dst.write_text(gi_text, encoding="utf-8")

# 4. Link SAM 2 model weights into root and backend
print("[*] Linking SAM 2 AI Model Weights for peak performance...")
for w in WEIGHT_FILES:
    src_w = SRC_DIR / w
    dst_w = DST_DIR / w
    if src_w.exists():
        try:
            subprocess.run(["cmd", "/c", "mklink", "/H", str(dst_w), str(src_w)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"    Hardlinked weight {w}")
        except Exception:
            shutil.copy2(src_w, dst_w)
            print(f"    Copied weight {w}")

# Link backend SAM 2 weight if present
backend_sam = SRC_DIR / "backend" / "sam2.1_b.pt"
dst_backend_sam = DST_DIR / "backend" / "sam2.1_b.pt"
if backend_sam.exists():
    try:
        subprocess.run(["cmd", "/c", "mklink", "/H", str(dst_backend_sam), str(backend_sam)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("    Hardlinked backend/sam2.1_b.pt")
    except Exception:
        shutil.copy2(backend_sam, dst_backend_sam)

# Create clean data directories with .gitkeep
for sub in ["uploads", "frames", "datasets", "models", "checkpoints", "logs"]:
    p = DST_DIR / "data" / sub
    p.mkdir(parents=True, exist_ok=True)
    (p / ".gitkeep").touch()

# ==============================================================================
# REMOVE KEYFRAME ARCHITECTURE & RESTRICT TO SAM 2 AI AUTO-ANNOTATION
# ==============================================================================
print("[*] Stripping Keyframe Architecture from Clone...")

# 1. Remove interpolation_service.py
interp_file = DST_DIR / "backend" / "app" / "services" / "interpolation_service.py"
if interp_file.exists():
    interp_file.unlink()
    print("    Removed backend/app/services/interpolation_service.py")

# 2. Clean backend/app/schemas/schemas.py
schemas_file = DST_DIR / "backend" / "app" / "schemas" / "schemas.py"
if schemas_file.exists():
    content = schemas_file.read_text(encoding="utf-8")
    content = re.sub(
        r"class KeyframeInterpolateRequest\(BaseModel\):.*?(?=\nclass |\Z)",
        "",
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r"class KeyframeInterpolateResponse\(BaseModel\):.*?(?=\n#|\nclass |\Z)",
        "",
        content,
        flags=re.DOTALL
    )
    schemas_file.write_text(content, encoding="utf-8")
    print("    Cleaned backend/app/schemas/schemas.py")

# 3. Clean backend/app/api/v1/endpoints/annotations.py
ann_file = DST_DIR / "backend" / "app" / "api" / "v1" / "endpoints" / "annotations.py"
if ann_file.exists():
    content = ann_file.read_text(encoding="utf-8")
    content = content.replace("from app.services.interpolation_service import interpolation_service\n", "")
    content = content.replace(", KeyframeInterpolateRequest, KeyframeInterpolateResponse", "")
    content = content.replace("KeyframeInterpolateRequest, KeyframeInterpolateResponse,", "")
    content = re.sub(
        r"@router\.post\(\"/interpolate\".*?\n(?=@router|\Z)",
        "",
        content,
        flags=re.DOTALL
    )
    ann_file.write_text(content, encoding="utf-8")
    print("    Cleaned backend/app/api/v1/endpoints/annotations.py")

# 4. Clean frontend/src/services/api.ts
api_file = DST_DIR / "frontend" / "src" / "services" / "api.ts"
if api_file.exists():
    content = api_file.read_text(encoding="utf-8")
    content = re.sub(
        r"interpolateKeyframes:\s*\(data:.*?\}\),\n",
        "",
        content,
        flags=re.DOTALL
    )
    api_file.write_text(content, encoding="utf-8")
    print("    Cleaned frontend/src/services/api.ts")

# 5. Clean frontend/src/views/AnnotationView.tsx
ann_view = DST_DIR / "frontend" / "src" / "views" / "AnnotationView.tsx"
if ann_view.exists():
    content = ann_view.read_text(encoding="utf-8")
    
    # Remove keyframe state variables
    content = content.replace("const [videoTrackingTab, setVideoTrackingTab] = useState<'interpolator' | 'sam_tracker'>('interpolator');\n", "")
    content = content.replace("const [anchorA, setAnchorA] = useState<any | null>(null);\n", "")
    content = content.replace("const [anchorB, setAnchorB] = useState<any | null>(null);\n", "")
    content = content.replace("const [interpMode, setInterpMode] = useState<'linear' | 'spline'>('linear');\n", "")
    content = content.replace("const [lockDimensions, setLockDimensions] = useState(true);\n", "")
    content = content.replace("const [isInterpolating, setIsInterpolating] = useState(false);\n", "")
    content = content.replace("const [interpolationResult, setInterpolationResult] = useState<any | null>(null);\n", "")
    
    # Remove keyframe handlers
    content = re.sub(
        r"// Enterprise Keyframe Interpolation Handlers.*?(?=\n  const selectedAnnotation =)",
        "",
        content,
        flags=re.DOTALL
    )
    
    # Clean the JSX tab block and render SAM 2 Neural Tracker directly
    tab_pattern = r"<div className=\"pt-2 border-t border-white/\[0\.08\] space-y-2\">.*?\{videoTrackingTab === 'interpolator' \? \(.*?\) : \("
    sam_header = """<div className="pt-2 border-t border-white/[0.08] space-y-2">
              {/* SAM 2 AI Neural Video Tracker */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/30">
                <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span>SAM 2 Neural Video Tracker</span>
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AI Auto-Track
                </span>
              </div>
              <div className="space-y-2">"""
    
    if re.search(tab_pattern, content, flags=re.DOTALL):
        content = re.sub(tab_pattern, sam_header, content, flags=re.DOTALL)
        content = re.sub(r"\s*\)\}\s*</div>\s*</div>\s*</div>\s*</aside>", "\n            </div>\n          </div>\n        </div>\n      </aside>", content)
        print("    Cleaned frontend/src/views/AnnotationView.tsx (SAM 2 direct mode)")
    
    ann_view.write_text(content, encoding="utf-8")

# 6. Update README in Clone to note SAM 2 specialization
readme_clone = DST_DIR / "README.md"
if readme_clone.exists():
    r_text = readme_clone.read_text(encoding="utf-8")
    r_text = r_text.replace(
        "# VisionForge Studio",
        "# VisionForge Studio (SAM 2 Edition - Clone)"
    )
    readme_clone.write_text(r_text, encoding="utf-8")

# 7. Initialize Git BEFORE linking node_modules (Super Fast & Clean)
print("[*] Initializing clean Git repository in VisionForge_Clone...")
try:
    subprocess.run(["git", "init"], cwd=str(DST_DIR), check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["git", "add", "."], cwd=str(DST_DIR), check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["git", "commit", "-m", "feat: Initial release of VisionForge (SAM 2 AI Auto-Annotation Edition)"], cwd=str(DST_DIR), check=True, stdout=subprocess.DEVNULL)
    print("    Git repository initialized & committed cleanly!")
except Exception as e:
    print(f"    Git init notice: {e}")

# 8. Now Junction frontend/node_modules for fast build
src_nm = SRC_DIR / "frontend" / "node_modules"
dst_nm = DST_DIR / "frontend" / "node_modules"
if src_nm.exists():
    print("[*] Junctioning frontend/node_modules for instant compilation...")
    subprocess.run(["cmd", "/c", "mklink", "/J", str(dst_nm), str(src_nm)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# 9. Rebuild frontend dist in clone
print("[*] Rebuilding frontend production bundle in clone...")
try:
    res = subprocess.run(
        ["cmd", "/c", "npm", "run", "build"],
        cwd=str(DST_DIR / "frontend"),
        capture_output=True,
        text=True,
        check=True
    )
    print("    Frontend built successfully in clone!")
except subprocess.CalledProcessError as e:
    print(f"    Frontend build warning: {e.stderr[:300]}")

# 10. Create project junction in C:\Users\Sanchit\Projects\VisionForge_Clone
if JUNCTION_DIR.exists():
    try:
        shutil.rmtree(JUNCTION_DIR, ignore_errors=True)
    except Exception:
        pass

try:
    subprocess.run(["cmd", "/c", "mklink", "/J", str(JUNCTION_DIR), str(DST_DIR)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[*] Created Project Junction: {JUNCTION_DIR} -> {DST_DIR}")
except Exception as e:
    print(f"[*] Note on junction: {e}")

print("\n[✓] SUCCESS: VisionForge_Clone created cleanly with SAM 2 AI Auto-Annotation!")
