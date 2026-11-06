import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse, Response
from app.config import settings

router = APIRouter()

@router.api_route("/raw", methods=["GET", "HEAD"])
def get_raw_file(
    request: Request,
    path: str = Query(..., description="Absolute or relative file path"),
    download: bool = Query(False, description="Whether to trigger file download attachment")
):
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

    content_type = "video/mp4" if resolved.suffix.lower() == ".mp4" else "application/octet-stream"

    if request.method == "HEAD":
        file_size = resolved.stat().st_size
        return Response(
            status_code=200,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Type": content_type,
            },
        )

    if download:
        return FileResponse(
            str(resolved),
            filename=resolved.name,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{resolved.name}"'}
        )

    return FileResponse(
        str(resolved),
        media_type=content_type,
        headers={"Accept-Ranges": "bytes"}
    )
