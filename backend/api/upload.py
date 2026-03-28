"""
Upload API endpoints for process flow diagrams and P&IDs.
"""

import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

from services.firestore_service import firestore_service

router = APIRouter(prefix="/api", tags=["upload"])

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"


class UploadResponse(BaseModel):
    study_id: str
    file_path: str
    filename: str
    content_type: str
    description: Optional[str] = None


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
) -> UploadResponse:
    """Upload a PFD/P&ID diagram and create a study."""
    allowed_types = {
        "image/png", "image/jpeg", "image/jpg", "image/tiff",
        "image/bmp", "image/webp", "application/pdf",
    }
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    study_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix if file.filename else ".png"
    saved_filename = f"{study_id}{file_extension}"
    file_path = UPLOAD_DIR / saved_filename

    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Create study record with the known ID
    firestore_service.create_study(
        study_id=study_id,
        name=file.filename or "Uploaded Diagram",
        description=description,
        diagram_path=str(file_path),
    )

    return UploadResponse(
        study_id=study_id,
        file_path=str(file_path),
        filename=file.filename or saved_filename,
        content_type=file.content_type or "application/octet-stream",
        description=description,
    )
