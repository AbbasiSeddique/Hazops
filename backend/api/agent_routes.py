"""
Agent interaction API endpoints.
Chat endpoint injects actual study data so the agent answers from YOUR analysis.
"""

import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.firestore_service import firestore_service

router = APIRouter(prefix="/api/agent", tags=["agent"])


class ChatRequest(BaseModel):
    study_id: str
    message: str


class ToolCallInfo(BaseModel):
    tool_name: str
    arguments: dict = {}
    result_summary: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    study_id: str
    tool_calls: list[ToolCallInfo] = []


def _build_study_context(study_id: str) -> str:
    """Build a data context string from actual study data."""
    study = firestore_service.get_study(study_id)
    if not study:
        return "No study data available. Answer general HAZOP questions."

    nodes = firestore_service.get_nodes_by_study(study_id)
    deviations = firestore_service.get_all_deviations_by_study(study_id)

    # Build risk summary
    risk_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    critical_devs = []
    high_devs = []

    likelihood_map = {"A": 5, "B": 4, "C": 3, "D": 2, "E": 1}
    for d in deviations:
        sev = d.get("severity", 0) or 0
        lik = likelihood_map.get(str(d.get("likelihood", "C")).upper(), 3)
        score = sev * lik
        if score >= 15:
            risk_counts["Critical"] += 1
            if len(critical_devs) < 10:
                node = next((n for n in nodes if n.get("node_id") == d.get("node_id")), {})
                critical_devs.append(f"- {node.get('name','?')}: {d.get('guide_word','')} {d.get('parameter','')} (Sev={sev}, Lik={d.get('likelihood','')}) — Causes: {'; '.join(d.get('causes',[])[:2])}")
        elif score >= 10:
            risk_counts["High"] += 1
            if len(high_devs) < 5:
                node = next((n for n in nodes if n.get("node_id") == d.get("node_id")), {})
                high_devs.append(f"- {node.get('name','?')}: {d.get('guide_word','')} {d.get('parameter','')} (Sev={sev})")
        elif score >= 5:
            risk_counts["Medium"] += 1
        else:
            risk_counts["Low"] += 1

    node_summary = "\n".join(
        f"- {n.get('name','')} ({n.get('equipment_type','')}) — {n.get('deviations_count',0)} deviations"
        for n in nodes
    )

    context = f"""## Study: {study.get('name', 'Unknown')}
Description: {study.get('description', 'N/A')}
Status: {study.get('status', 'N/A')}

## Nodes ({len(nodes)}):
{node_summary}

## Risk Summary ({len(deviations)} total deviations):
- Critical: {risk_counts['Critical']}
- High: {risk_counts['High']}
- Medium: {risk_counts['Medium']}
- Low: {risk_counts['Low']}

## Top Critical Deviations:
{chr(10).join(critical_devs) if critical_devs else 'None'}

## High Risk Deviations:
{chr(10).join(high_devs) if high_devs else 'None'}
"""
    return context


@router.post("/chat", response_model=ChatResponse)
async def agent_chat(request: ChatRequest) -> ChatResponse:
    """Chat with the HAZOP agent. Injects actual study data into the prompt."""
    try:
        from agent.hazop_agent import HAZOPAgent

        # If no specific study, use the most recent one
        study_id = request.study_id
        if not study_id or study_id == "general":
            studies = firestore_service.list_studies()
            if studies:
                study_id = studies[-1]["study_id"]

        # Build context from actual study data
        study_context = _build_study_context(study_id)

        # Prepend study data to the user's question
        enriched_message = f"""Here is the actual data from the current HAZOP study. Answer ONLY based on this data — do not give generic textbook answers.

{study_context}

User question: {request.message}

Answer concisely using the actual data above. Reference specific nodes, deviations, and risk scores."""

        agent = HAZOPAgent()
        result = await agent.chat(study_id=request.study_id, message=enriched_message)

        tool_calls = []
        if isinstance(result, dict):
            response_text = result.get("response", str(result))
            for tc in result.get("tool_calls", []):
                tool_calls.append(ToolCallInfo(
                    tool_name=tc.get("tool_name", ""),
                    arguments=tc.get("arguments", {}),
                    result_summary=tc.get("result_summary"),
                ))
        else:
            response_text = str(result)

        return ChatResponse(
            response=response_text,
            study_id=request.study_id,
            tool_calls=tool_calls,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
