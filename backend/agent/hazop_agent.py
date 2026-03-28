"""
Core HAZOP Agent using direct Gemini API calls.
No ADK dependency — uses google-genai SDK directly.
"""

from typing import AsyncGenerator, Optional

from google import genai
from google.genai import types

from agent.prompts import AGENT_SYSTEM_PROMPT
from agent.tools import (
    generate_deviations,
    lookup_safeguards,
    search_incidents,
    _generate_fallback_risk_assessment,
    is_generic_row,
)
from config import settings
from services.firestore_service import firestore_service
from services.gemini_vision import gemini_service


class HAZOPAgent:
    """HAZOP Assistant Agent powered by direct Gemini API calls."""

    def __init__(self) -> None:
        self._client = genai.Client(api_key=settings.GOOGLE_API_KEY)

    async def chat(self, study_id: str, message: str) -> dict:
        """Send a message to the HAZOP agent and get a response."""
        try:
            response = await self._client.aio.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=[
                    types.Content(parts=[types.Part(text=AGENT_SYSTEM_PROMPT)], role="user"),
                    types.Content(parts=[types.Part(text="Understood. I am ready to assist with HAZOP analysis.")], role="model"),
                    types.Content(parts=[types.Part(text=message)], role="user"),
                ],
                config=types.GenerateContentConfig(temperature=0.3, max_output_tokens=4096),
            )
            return {"response": response.text, "tool_calls": []}
        except Exception as e:
            return {"response": f"Error: {str(e)}", "tool_calls": []}

    async def run_full_analysis(
        self,
        study_id: str,
        diagram_path: Optional[str] = None,
        process_description: Optional[str] = None,
    ) -> AsyncGenerator[dict, None]:
        """Run complete HAZOP analysis pipeline with streaming progress."""

        from agent.prompts import (
            NODE_IDENTIFICATION_VISION_PROMPT,
            NODE_IDENTIFICATION_TEXT_PROMPT,
        )

        # Phase 1: Node Identification
        yield {"type": "progress", "phase": "node_identification", "status": "started", "message": "Identifying process nodes..."}

        nodes_result = {}
        try:
            if diagram_path:
                print(f"[AGENT] Analyzing diagram: {diagram_path}")
                nodes_result = await gemini_service.analyze_diagram(
                    image_path=diagram_path,
                    prompt=NODE_IDENTIFICATION_VISION_PROMPT,
                )
                print(f"[AGENT] Diagram result: {len(nodes_result.get('nodes', []))} nodes, error={nodes_result.get('error', 'none')}")
            elif process_description:
                print(f"[AGENT] Analyzing text: {process_description[:60]}...")
                prompt = NODE_IDENTIFICATION_TEXT_PROMPT.format(process_description=process_description)
                nodes_result = await gemini_service.analyze_text(text=process_description, prompt=prompt)
                print(f"[AGENT] Text result: {len(nodes_result.get('nodes', []))} nodes, error={nodes_result.get('error', 'none')}")
            else:
                nodes_result = {"error": "No diagram or description provided", "nodes": []}
        except Exception as e:
            print(f"[AGENT] EXCEPTION: {e}")
            nodes_result = {"error": str(e), "nodes": []}

        nodes = nodes_result.get("nodes", [])
        if nodes_result.get("error"):
            yield {"type": "progress", "phase": "node_identification", "status": "error", "message": f"Gemini error: {nodes_result['error'][:200]}"}

        for node_data in nodes:
            stored_node = firestore_service.create_node_from_dict(study_id, node_data)
            yield {"type": "node_identified", "phase": "node_identification", "data": stored_node}

        yield {"type": "progress", "phase": "node_identification", "status": "completed", "message": f"Identified {len(nodes)} nodes"}

        # Phase 2: Deviation Generation
        yield {"type": "progress", "phase": "deviation_generation", "status": "started", "message": "Generating deviations for each node..."}

        all_deviations = []
        stored_nodes = firestore_service.get_nodes_by_study(study_id)

        for node in stored_nodes:
            node_id = node["node_id"]
            equipment_type = node.get("equipment_type", "unknown")
            operating_conditions = node.get("operating_conditions", {})

            dev_result = generate_deviations(
                node_id=node_id,
                equipment_type=equipment_type,
                operating_conditions=operating_conditions,
            )
            deviations = dev_result.get("deviations", [])
            all_deviations.extend(deviations)

            yield {
                "type": "deviations_generated", "phase": "deviation_generation",
                "data": {"node_id": node_id, "node_name": node.get("name", ""), "deviations_count": len(deviations)},
            }

        yield {"type": "progress", "phase": "deviation_generation", "status": "completed", "message": f"Generated {len(all_deviations)} deviations"}

        # Phase 3: Risk Assessment (fast local assessment)
        yield {"type": "progress", "phase": "risk_assessment", "status": "started", "message": "Assessing risks for each deviation..."}

        for deviation in all_deviations:
            node_id = deviation.get("node_id", "unknown")
            parent_node = next((n for n in stored_nodes if n.get("node_id") == node_id), {})
            equipment_type = parent_node.get("equipment_type", "unknown")

            risk_result = _generate_fallback_risk_assessment(
                node_id=node_id,
                guide_word=deviation.get("guide_word", ""),
                parameter=deviation.get("parameter", ""),
                equipment_type=equipment_type,
            )

            # Merge knowledge base data with risk assessment
            merged = {**deviation, **risk_result}
            merged["causes"] = deviation.get("common_causes") or risk_result.get("causes", [])
            merged["consequences"] = deviation.get("common_consequences") or risk_result.get("consequences", [])
            merged["safeguards"] = deviation.get("standard_safeguards") or risk_result.get("existing_safeguards", [])

            # Post-filter: skip rows that are all generic filler
            if is_generic_row(merged):
                continue

            stored_dev = firestore_service.create_deviation_from_dict(node_id, study_id, merged)

            yield {"type": "deviation_generated", "phase": "risk_assessment", "data": stored_dev}

        yield {"type": "progress", "phase": "risk_assessment", "status": "completed", "message": "Risk assessment complete"}

        # Phase 4: Safeguard Analysis
        yield {"type": "progress", "phase": "safeguard_analysis", "status": "started", "message": "Analyzing safeguards..."}

        for deviation in firestore_service.get_all_deviations_by_study(study_id):
            parent_node = next((n for n in stored_nodes if n.get("node_id") == deviation.get("node_id")), {})
            equipment_type = parent_node.get("equipment_type", "unknown")
            deviation_type = f"{deviation.get('guide_word', '')} {deviation.get('parameter', '')}"
            safeguard_result = lookup_safeguards(equipment_type=equipment_type, deviation_type=deviation_type)
            yield {"type": "safeguards_analyzed", "phase": "safeguard_analysis", "data": {"deviation_id": deviation.get("deviation_id", ""), "safeguards": safeguard_result}}

        yield {"type": "progress", "phase": "safeguard_analysis", "status": "completed", "message": "Safeguard analysis complete"}

        # Phase 5: Incident Cross-Reference
        yield {"type": "progress", "phase": "incident_search", "status": "started", "message": "Cross-referencing with historical incidents..."}

        checked_equipment = set()
        for node in stored_nodes:
            equipment_type = node.get("equipment_type", "unknown")
            if equipment_type not in checked_equipment:
                checked_equipment.add(equipment_type)
                incident_result = search_incidents(
                    equipment_type=equipment_type,
                    hazard_description=f"Process safety incident involving {equipment_type}",
                )
                if incident_result.get("incidents"):
                    yield {"type": "incidents_found", "phase": "incident_search", "data": {"equipment_type": equipment_type, "incidents": incident_result["incidents"][:3]}}

        yield {"type": "progress", "phase": "incident_search", "status": "completed", "message": "Incident cross-reference complete"}
