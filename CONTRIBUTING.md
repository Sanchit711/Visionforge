# Contributing to VisionForge Studio

Thank you for your interest in contributing to **VisionForge Studio**! VisionForge is a computer vision platform built for automated video ingestion, AI-assisted annotation (Florence-2 / SAM 2), cloud GPU training, in-motion temporal video validation, and edge deployment.

---

## 📜 Source-Available License & Commercial Policy

VisionForge is released under the **VisionForge Community Source-Available & Non-Commercial Research License (v1.0)**:
- **Free for Research & Development**: Academic researchers, university students, computer vision engineers, and open-source hobbyists are free to use, modify, and build upon VisionForge for non-commercial research.
- **No Unauthorized Commercial Use**: Direct commercial deployment, commercial SaaS hosting, closed-source white-labeling, or selling clones of VisionForge is strictly prohibited without a written commercial license from the author.
- **Commercial Licensing Inquiries**: For industrial deployment, OEM licensing, or enterprise customization, please contact the maintainer through the repository contact channel.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Python**: $\ge 3.10$ (Python 3.11 recommended)
- **Node.js**: $\ge 18.0.0$ (`npm` or `yarn`)
- **FFmpeg**: Required for cross-browser H.264 video transcoding
- **GPU (Optional)**: CUDA $\ge 11.8$ / 12.x for local inference; CPU inference is accelerated via OpenVINO / ONNX

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/your-username/VisionForge.git
cd VisionForge

# Create and activate a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Run backend development server
python backend/run_backend.py
```
Backend will start at: `http://localhost:8000`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend development server will start at: `http://localhost:5173`

---

## 🧪 Testing & Quality Standards

Before submitting a Pull Request, ensure that all automated tests pass:

```bash
# Run backend pytest suite
pytest backend/tests/test_visionforge.py -v

# Run frontend type-check & production build
cd frontend
npm run build
```

---

## 📝 Submitting a Pull Request (PR)

1. **Fork the Repository** and create a feature branch (`git checkout -b feature/my-enhancement`).
2. **Commit your changes** with a clear, conventional commit message (`feat: add Norfair tracker support`).
3. **Ensure Documentation is updated**: If adding an endpoint, update the corresponding API docs.
4. **Push to your fork** and submit a PR to the `main` branch.
