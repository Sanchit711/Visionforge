import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse, Response
from app.config import settings

router = APIRouter()

@router.api_route("/raw", methods=["GET", "HEAD"])
def get_raw_file(request: Request, path: str = Query(..., description="Absolute or relative file path")):
    resolved = Path(path).resolve()
    # Security check: ensure path is within allowed directories
    allowed_roots = [
        settings.DATA_DIR.resolve(),
        settings.BASE_DIR.resolve(),
    ]
    if not any(str(resolved).startswith(str(root)) for root in allowed_roots):
        raise HTTPException(status_code=403, detail="Access to specified path is forbidden")

    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    if request.method == "HEAD":
        file_size = resolved.stat().st_size
        content_type = "video/mp4" if resolved.suffix.lower() == ".mp4" else "application/octet-stream"
        return Response(
            status_code=200,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Type": content_type,
            },
        )

    return FileResponse(str(resolved))
