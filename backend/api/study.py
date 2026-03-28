"""
Study management API endpoints.
Uses the shared firestore_service for data storage.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.firestore_service import firestore_service

router = APIRouter(prefix="/api", tags=["studies"])


class StudyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    process_type: Optional[str] = None
    diagram_path: Optional[str] = None


class StudyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    process_type: Optional[str] = None
    status: Optional[str] = None


class StudyResponse(BaseModel):
    study_id: str
    name: str
    description: Optional[str] = None
    process_type: Optional[str] = None
    diagram_path: Optional[str] = None
    status: str = "created"
    created_at: str = ""
    updated_at: str = ""
    nodes: list[dict] = Field(default_factory=list)
    deviations_count: int = 0


@router.post("/studies", response_model=StudyResponse, status_code=201)
async def create_study(study: StudyCreate) -> StudyResponse:
    study_data = firestore_service.create_study(
        name=study.name,
        description=study.description,
        process_type=study.process_type,
        diagram_path=study.diagram_path,
    )
    study_data.setdefault("nodes", [])
    study_data.setdefault("deviations_count", 0)
    return StudyResponse(**study_data)


@router.get("/studies", response_model=list[StudyResponse])
async def list_studies() -> list[StudyResponse]:
    studies = firestore_service.list_studies()
    result = []
    for s in studies:
        s.setdefault("nodes", [])
        s.setdefault("deviations_count", 0)
        result.append(StudyResponse(**s))
    return result


@router.get("/studies/{study_id}", response_model=StudyResponse)
async def get_study(study_id: str) -> StudyResponse:
    study_data = firestore_service.get_study(study_id)
    if study_data is None:
        raise HTTPException(status_code=404, detail="Study not found")
    study_data.setdefault("nodes", [])
    study_data.setdefault("deviations_count", 0)
    return StudyResponse(**study_data)


@router.put("/studies/{study_id}", response_model=StudyResponse)
async def update_study(study_id: str, update: StudyUpdate) -> StudyResponse:
    update_dict = update.model_dump(exclude_unset=True)
    study_data = firestore_service.update_study(study_id, **update_dict)
    if study_data is None:
        raise HTTPException(status_code=404, detail="Study not found")
    study_data.setdefault("nodes", [])
    study_data.setdefault("deviations_count", 0)
    return StudyResponse(**study_data)


@router.delete("/studies/{study_id}", status_code=204)
async def delete_study(study_id: str) -> None:
    if not firestore_service.delete_study(study_id):
        raise HTTPException(status_code=404, detail="Study not found")
