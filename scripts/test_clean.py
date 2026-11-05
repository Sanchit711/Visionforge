import pathlib
import re

src = pathlib.Path(r"C:\Users\Sanchit\Projects\VisionForge\frontend\src\views\AnnotationView.tsx")
text = src.read_text(encoding="utf-8")

# 1. State removal
state_vars = [
    "const [videoTrackingTab, setVideoTrackingTab] = useState<'interpolator' | 'sam_tracker'>('interpolator');\n",
    "const [anchorA, setAnchorA] = useState<any | null>(null);\n",
    "const [anchorB, setAnchorB] = useState<any | null>(null);\n",
    "const [interpMode, setInterpMode] = useState<'linear' | 'spline'>('linear');\n",
    "const [lockDimensions, setLockDimensions] = useState(true);\n",
    "const [isInterpolating, setIsInterpolating] = useState(false);\n",
    "const [interpolationResult, setInterpolationResult] = useState<any | null>(null);\n",
]
for s in state_vars:
    text = text.replace(s, "")

# 2. Handler removal
text = re.sub(
    r"// Enterprise Keyframe Interpolation Handlers.*?(?=\n  const selectedAnnotation =)",
    "",
    text,
    flags=re.DOTALL,
)

# 3. JSX replacement
start_str = '<div className="pt-2 border-t border-white/[0.08] space-y-2">\n              {/* Tab Selector */}'
sam_str = "/* ================= SAM 2 TRACKER PANEL ================= */\n                <div className=\"space-y-2\">"
closing_str = "</div>\n                </div>\n              )}\n            </div>"

idx_start = text.find(start_str)
idx_sam = text.find(sam_str)
idx_close = text.find(closing_str)

print("idx_start:", idx_start)
print("idx_sam:", idx_sam)
print("idx_close:", idx_close)

if idx_start != -1 and idx_sam != -1 and idx_close != -1:
    clean_text = (
        text[:idx_start]
        + '<div className="pt-2 border-t border-white/[0.08] space-y-2">\n              '
        + text[idx_sam:idx_close]
        + "</div>\n                </div>\n            </div>"
        + text[idx_close + len(closing_str) :]
    )
    print("Clean text created successfully! Size:", len(clean_text))


# Test schemas cleaning
schemas_path = pathlib.Path(r"C:\Users\Sanchit\Projects\VisionForge\backend\app\schemas\schemas.py")
s_text = schemas_path.read_text(encoding="utf-8")
s_text = re.sub(r"class KeyframeInterpolateRequest\(BaseModel\):.*?(?=\nclass |\Z)", "", s_text, flags=re.DOTALL)
s_text = re.sub(r"class KeyframeInterpolateResponse\(BaseModel\):.*?(?=\n#|\nclass |\Z)", "", s_text, flags=re.DOTALL)
print("Schemas test cleaned, contains Keyframe:", "Keyframe" in s_text)

# Test annotations endpoint cleaning
ann_path = pathlib.Path(r"C:\Users\Sanchit\Projects\VisionForge\backend\app\api\v1\endpoints\annotations.py")
a_text = ann_path.read_text(encoding="utf-8")
a_text = a_text.replace("from app.services.interpolation_service import interpolation_service\n", "")
a_text = a_text.replace(", KeyframeInterpolateRequest, KeyframeInterpolateResponse", "")
a_text = re.sub(r"@router\.post\(\"/interpolate\".*?\n(?=@router|\Z)", "", a_text, flags=re.DOTALL)
print("Annotations test cleaned, contains Keyframe:", "Keyframe" in a_text)
