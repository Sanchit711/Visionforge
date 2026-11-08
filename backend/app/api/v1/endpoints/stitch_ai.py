from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from app.services.gemini_service import gemini_service

router = APIRouter()

class GenerateUIRequest(BaseModel):
    prompt: str = Field(..., description="Description of the UI component to generate or refactor")

class VisionDetectRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded frame")
    prompt: Optional[str] = "Detect conveyor objects and bounding coordinates"

@router.get("/status")
def get_ai_status():
    """
    Returns the status of the Google Gemini & Stitch API configuration.
    """
    return gemini_service.get_status()

@router.post("/test-connection")
def test_ai_connection():
    """
    Performs a live ping test to the Google Gemini API using the configured key.
    """
    return gemini_service.test_connection()

@router.post("/generate-ui")
def generate_stitch_ui(req: GenerateUIRequest):
    """
    Generates Apple/Cupertino-grade React Tailwind components adhering to DESIGN.md.
    """
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    return gemini_service.generate_stitch_ui(req.prompt.strip())
