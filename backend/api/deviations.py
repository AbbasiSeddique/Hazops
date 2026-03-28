"""
Deviations and nodes API endpoints with SSE streaming for analysis.
All data goes through the shared firestore_service.
"""

import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from services.firestore_service import firestore_service

router = APIRouter(prefix="/api", tags=["deviations"])


class DeviationUpdate(BaseModel):
    causes: Optional[list[str]] = None
    consequences: Optional[list[str]] = None
    severity: Optional[int] = None
    likelihood: Optional[str] = None
    risk_score: Optional[str] = None
    safeguards: Optional[list[str]] = None
    recommendations: Optional[list[str]] = None
    notes: Optional[str] = None


class AnalysisRequest(BaseModel):
    diagram_path: Optional[str] = None
    process_description: Optional[str] = None


class NodeResponse(BaseModel):
    node_id: str
    study_id: str
    equipment_type: str = "unknown"
    name: str = ""
    operating_conditions: dict = {}
    inlet_streams: list = []
    outlet_streams: list = []
    control_instruments: list = []
    deviations_count: int = 0


class DeviationResponse(BaseModel):
    deviation_id: str
    node_id: str
    guide_word: str = ""
    parameter: str = ""
    causes: list[str] = []
    consequences: list[str] = []
    severity: int = 0
    likelihood: str = ""
    risk_score: str = ""
    safeguards: list[str] = []
    recommendations: list[str] = []
    notes: str = ""


@router.get("/studies/{study_id}/nodes", response_model=list[NodeResponse])
async def list_nodes(study_id: str) -> list[NodeResponse]:
    nodes = firestore_service.get_nodes_by_study(study_id)
    return [NodeResponse(**_safe_node(n)) for n in nodes]


@router.get("/studies/{study_id}/nodes/{node_id}/deviations", response_model=list[DeviationResponse])
async def list_deviations(study_id: str, node_id: str) -> list[DeviationResponse]:
    deviations = firestore_service.get_deviations_by_node(node_id)
    return [DeviationResponse(**_safe_deviation(d)) for d in deviations]


@router.patch("/deviations/{deviation_id}", response_model=DeviationResponse)
async def update_deviation(deviation_id: str, update: DeviationUpdate) -> DeviationResponse:
    update_dict = update.model_dump(exclude_unset=True)
    result = firestore_service.update_deviation(deviation_id, **update_dict)
    if result is None:
        raise HTTPException(status_code=404, detail="Deviation not found")
    return DeviationResponse(**_safe_deviation(result))


@router.post("/studies/{study_id}/analyze")
async def analyze_study(study_id: str, request: AnalysisRequest = AnalysisRequest()):
    """Trigger a full HAZOP analysis with SSE streaming."""

    async def event_generator():
        try:
            from agent.hazop_agent import HAZOPAgent
            agent = HAZOPAgent()
            print(f"[SSE] Agent created, diagram_path={request.diagram_path}, desc={request.process_description[:50] if request.process_description else None}")
        except Exception as e:
            print(f"[SSE] AGENT IMPORT ERROR: {e}")
            import traceback; traceback.print_exc()
            yield {"event": "error", "data": json.dumps({"type": "error", "message": str(e)})}
            return

        # Ensure study exists
        if firestore_service.get_study(study_id) is None:
            firestore_service.create_study(
                study_id=study_id,
                name=f"Study {study_id[:8]}",
                description=request.process_description,
                diagram_path=request.diagram_path,
            )

        async for update in agent.run_full_analysis(
            study_id=study_id,
            diagram_path=request.diagram_path,
            process_description=request.process_description,
        ):
            yield {
                "event": update.get("type", "progress"),
                "data": json.dumps(update),
            }

        # Mark study as completed
        firestore_service.update_study(study_id, status="completed")

        yield {
            "event": "complete",
            "data": json.dumps({
                "type": "complete",
                "phase": "complete",
                "status": "finished",
                "message": "HAZOP analysis complete",
                "study_id": study_id,
            }),
        }

    async def sse_stream():
        async for event in event_generator():
            event_type = event.get("event", "message")
            data = event.get("data", "{}")
            yield f"event: {event_type}\ndata: {data}\n\n"

    return StreamingResponse(
        sse_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _safe_node(n: dict) -> dict:
    oc = n.get("operating_conditions", {})
    if isinstance(oc, str):
        oc = {"description": oc}
    return {
        "node_id": n.get("node_id", ""),
        "study_id": n.get("study_id", ""),
        "equipment_type": n.get("equipment_type", "unknown"),
        "name": n.get("name", ""),
        "operating_conditions": oc,
        "inlet_streams": n.get("inlet_streams", []),
        "outlet_streams": n.get("outlet_streams", []),
        "control_instruments": n.get("control_instruments", []),
        "deviations_count": n.get("deviations_count", 0),
    }


def _safe_deviation(d: dict) -> dict:
    return {
        "deviation_id": d.get("deviation_id", ""),
        "node_id": d.get("node_id", ""),
        "guide_word": d.get("guide_word", ""),
        "parameter": d.get("parameter", ""),
        "causes": d.get("causes", []) or [],
        "consequences": d.get("consequences", []) or [],
        "severity": d.get("severity", 0) or 0,
        "likelihood": d.get("likelihood", "") or "",
        "risk_score": d.get("risk_score", "") or "",
        "safeguards": d.get("safeguards", []) or [],
        "recommendations": d.get("recommendations", []) or [],
        "notes": d.get("notes", "") or "",
    }
