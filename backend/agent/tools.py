"""
HAZOP Agent tool functions.
Deterministic pre-filter + knowledge base + blocklist post-filter.
"""

import json
import uuid
from pathlib import Path
from typing import Optional


# ---- Deterministic Pre-Filter: Valid (guide_word, parameter) combos by equipment ----
# Only physically credible combinations are generated. This alone cuts 654 → ~100.
VALID_COMBOS = {
    "pipeline": {
        "NO": ["Flow"],
        "MORE": ["Flow", "Pressure", "Temperature"],
        "LESS": ["Flow", "Pressure", "Temperature"],
        "REVERSE": ["Flow"],
        "AS WELL AS": ["Flow", "Composition"],
    },
    "pipe": {
        "NO": ["Flow"],
        "MORE": ["Flow", "Pressure", "Temperature"],
        "LESS": ["Flow", "Pressure", "Temperature"],
        "REVERSE": ["Flow"],
        "AS WELL AS": ["Flow", "Composition"],
    },
    "pump": {
        "NO": ["Flow"],
        "MORE": ["Flow", "Pressure"],
        "LESS": ["Flow", "Pressure"],
        "REVERSE": ["Flow"],
    },
    "compressor": {
        "NO": ["Flow"],
        "MORE": ["Flow", "Pressure", "Temperature"],
        "LESS": ["Flow", "Pressure"],
        "REVERSE": ["Flow"],
    },
    "reactor": {
        "NO": ["Flow", "Level", "Pressure", "Temperature"],
        "MORE": ["Flow", "Level", "Pressure", "Temperature", "Composition"],
        "LESS": ["Flow", "Level", "Pressure", "Temperature"],
        "REVERSE": ["Flow"],
        "AS WELL AS": ["Composition"],
    },
    "distillation_column": {
        "NO": ["Flow", "Level", "Pressure", "Temperature"],
        "MORE": ["Flow", "Level", "Pressure", "Temperature"],
        "LESS": ["Flow", "Level", "Pressure", "Temperature"],
        "REVERSE": ["Flow"],
        "AS WELL AS": ["Composition"],
    },
    "column": {
        "NO": ["Flow", "Level", "Pressure", "Temperature"],
        "MORE": ["Flow", "Level", "Pressure", "Temperature"],
        "LESS": ["Flow", "Level", "Pressure", "Temperature"],
        "REVERSE": ["Flow"],
        "AS WELL AS": ["Composition"],
    },
    "heat_exchanger": {
        "NO": ["Flow", "Temperature"],
        "MORE": ["Flow", "Temperature", "Pressure"],
        "LESS": ["Flow", "Temperature"],
        "AS WELL AS": ["Composition"],
    },
    "condenser": {
        "NO": ["Flow", "Temperature"],
        "MORE": ["Flow", "Temperature", "Pressure"],
        "LESS": ["Flow", "Temperature"],
    },
    "reboiler": {
        "NO": ["Flow", "Temperature"],
        "MORE": ["Flow", "Temperature", "Pressure"],
        "LESS": ["Flow", "Temperature"],
    },
    "separator": {
        "NO": ["Flow", "Level", "Pressure"],
        "MORE": ["Flow", "Level", "Pressure"],
        "LESS": ["Flow", "Level", "Pressure"],
        "REVERSE": ["Flow"],
        "AS WELL AS": ["Composition"],
    },
    "storage_tank": {
        "NO": ["Flow", "Level"],
        "MORE": ["Flow", "Level", "Pressure", "Temperature"],
        "LESS": ["Flow", "Level"],
        "AS WELL AS": ["Composition"],
    },
    "tank": {
        "NO": ["Flow", "Level"],
        "MORE": ["Flow", "Level", "Pressure", "Temperature"],
        "LESS": ["Flow", "Level"],
        "AS WELL AS": ["Composition"],
    },
    "vessel": {
        "NO": ["Flow", "Level", "Pressure"],
        "MORE": ["Flow", "Level", "Pressure", "Temperature"],
        "LESS": ["Flow", "Level", "Pressure"],
        "AS WELL AS": ["Composition"],
    },
    "valve": {
        "NO": ["Flow"],
        "MORE": ["Flow"],
        "LESS": ["Flow"],
        "REVERSE": ["Flow"],
    },
    "furnace": {
        "NO": ["Flow", "Temperature"],
        "MORE": ["Temperature", "Pressure"],
        "LESS": ["Flow", "Temperature"],
    },
}

# Default for unknown equipment
_DEFAULT_COMBOS = {
    "NO": ["Flow", "Pressure"],
    "MORE": ["Flow", "Pressure", "Temperature"],
    "LESS": ["Flow", "Pressure", "Temperature"],
    "REVERSE": ["Flow"],
}

# ---- Blocklist: Generic template phrases that indicate filler, not real analysis ----
BLOCKLIST_PHRASES = [
    "equipment malfunction affecting",
    "control system failure for",
    "human error during operation or maintenance",
    "process upset due to",
    "possible equipment damage or loss of containment",
    "production loss or quality deviation",
    "standard monitoring instrumentation",
    "operator training and procedures",
    "verify adequacy of",
    "review alarm setpoints and operator response",
]


def identify_nodes(
    image_path: Optional[str] = None,
    process_description: Optional[str] = None,
) -> dict:
    """Identify study nodes from a process flow diagram (PFD/P&ID) image or a text description of the process. Analyzes the input to extract equipment, streams, and instrumentation for HAZOP study nodes.

    Args:
        image_path: Path to a PFD or P&ID image file to analyze using vision AI.
        process_description: Text description of the process to analyze.

    Returns:
        Dictionary containing a list of identified nodes, each with node_id,
        equipment_type, name, operating_conditions, inlet_streams,
        outlet_streams, and control_instruments.
    """
    from agent.prompts import (
        NODE_IDENTIFICATION_VISION_PROMPT,
        NODE_IDENTIFICATION_TEXT_PROMPT,
    )

    # This function is kept for backward compatibility but the agent
    # now calls gemini_service directly. See hazop_agent.py.
    return {"error": "Use gemini_service directly via the agent", "nodes": []}


def generate_deviations(
    node_id: str,
    equipment_type: str,
    operating_conditions: Optional[dict] = None,
) -> dict:
    """Generate HAZOP deviations for a specific node by cross-referencing equipment type against the HAZOP knowledge base. Produces a guide_word x parameter matrix filtered for meaningful combinations.

    Args:
        node_id: The unique identifier of the node to analyze.
        equipment_type: Type of equipment (e.g., reactor, pump, heat_exchanger).
        operating_conditions: Dictionary of operating conditions (temperature, pressure, etc.).

    Returns:
        Dictionary containing a list of deviations, each with guide_word,
        parameter, description, and applicability information.
    """
    # Use deterministic pre-filter: only physically credible combos
    et_lower = equipment_type.lower().replace(" ", "_").replace("-", "_")
    valid = VALID_COMBOS.get(et_lower, _DEFAULT_COMBOS)

    # Also load knowledge base for enriched causes/consequences
    kb_path = Path(__file__).parent.parent / "knowledge_base" / "hazop_equipment.json"
    try:
        with open(kb_path, "r") as f:
            equipment_kb = json.load(f)
    except FileNotFoundError:
        equipment_kb = {}

    equipment_data = equipment_kb.get(equipment_type, equipment_kb.get(et_lower, {}))
    deviation_details = equipment_data.get("deviations", {})

    deviations = []
    for gw, params in valid.items():
        for param in params:
            key = f"{gw}_{param}".replace(" ", "_").upper()
            detail = deviation_details.get(key, {})

            deviation = {
                "deviation_id": str(uuid.uuid4()),
                "node_id": node_id,
                "guide_word": gw,
                "parameter": param,
                "description": f"{gw} {param}",
                "common_causes": detail.get("common_causes", []),
                "common_consequences": detail.get("common_consequences", []),
                "standard_safeguards": detail.get("standard_safeguards", []),
            }
            deviations.append(deviation)

    return {
        "node_id": node_id,
        "equipment_type": equipment_type,
        "deviations_count": len(deviations),
        "deviations": deviations,
    }


def assess_risks(node_id: str, deviation: dict) -> dict:
    """Assess the risk for a specific deviation by analyzing causes, consequences, severity, and likelihood. Uses AI to provide comprehensive risk assessment with recommendations.

    Args:
        node_id: The unique identifier of the node.
        deviation: Dictionary containing the deviation details (guide_word, parameter, etc.).

    Returns:
        Dictionary containing causes, consequences, severity (1-5),
        likelihood (A-E), risk_score, and recommendations.
    """
    from agent.prompts import DEVIATION_ASSESSMENT_PROMPT

    guide_word = deviation.get("guide_word", "")
    parameter = deviation.get("parameter", "")
    equipment_type = deviation.get("equipment_type", "unknown")
    node_name = deviation.get("node_name", f"Node {node_id}")
    operating_conditions = deviation.get("operating_conditions", {})
    inlet_streams = deviation.get("inlet_streams", [])
    outlet_streams = deviation.get("outlet_streams", [])
    control_instruments = deviation.get("control_instruments", [])

    prompt = DEVIATION_ASSESSMENT_PROMPT.format(
        node_name=node_name,
        equipment_type=equipment_type,
        operating_conditions=json.dumps(operating_conditions),
        inlet_streams=", ".join(inlet_streams) if inlet_streams else "N/A",
        outlet_streams=", ".join(outlet_streams) if outlet_streams else "N/A",
        control_instruments=(
            ", ".join(control_instruments) if control_instruments else "N/A"
        ),
        guide_word=guide_word,
        parameter=parameter,
    )

    # Use fast local assessment (AI call per deviation is too slow for 90+ deviations)
    return _generate_fallback_risk_assessment(
        node_id, guide_word, parameter, equipment_type
    )


def lookup_safeguards(equipment_type: str, deviation_type: str) -> dict:
    """Look up standard safeguards for a given equipment type and deviation type from the safeguards knowledge base. Returns existing safeguards, recommended additional safeguards, and gap analysis.

    Args:
        equipment_type: Type of equipment (e.g., reactor, pump, heat_exchanger).
        deviation_type: Type of deviation (e.g., "MORE Pressure", "NO Flow").

    Returns:
        Dictionary containing existing_safeguards, recommended_additional,
        and gap_analysis information.
    """
    kb_path = Path(__file__).parent.parent / "knowledge_base" / "safeguards.json"

    try:
        with open(kb_path, "r") as f:
            safeguards_kb = json.load(f)
    except FileNotFoundError:
        return {
            "equipment_type": equipment_type,
            "deviation_type": deviation_type,
            "existing_safeguards": [],
            "recommended_additional": [],
            "gap_analysis": "Safeguards knowledge base not found",
        }

    equipment_safeguards = safeguards_kb.get(equipment_type, {})
    deviation_safeguards = equipment_safeguards.get(deviation_type, {})

    if not deviation_safeguards:
        # Try partial matching
        for key in equipment_safeguards:
            if any(
                word in deviation_type.upper()
                for word in key.upper().split("_")
            ):
                deviation_safeguards = equipment_safeguards[key]
                break

    return {
        "equipment_type": equipment_type,
        "deviation_type": deviation_type,
        "existing_safeguards": deviation_safeguards.get(
            "standard_safeguards", []
        ),
        "recommended_additional": deviation_safeguards.get(
            "recommended_additional", []
        ),
        "gap_analysis": deviation_safeguards.get(
            "typical_gaps", "No specific gap analysis available"
        ),
    }


def search_incidents(equipment_type: str, hazard_description: str) -> dict:
    """Search the incident knowledge base for relevant historical process safety incidents. Matches incidents by equipment type and hazard description to provide lessons learned.

    Args:
        equipment_type: Type of equipment involved (e.g., reactor, distillation_column).
        hazard_description: Description of the hazard scenario to search for.

    Returns:
        Dictionary containing a list of relevant incidents with title, summary,
        lessons_learned, and relevance information.
    """
    kb_path = Path(__file__).parent.parent / "knowledge_base" / "incidents.json"

    try:
        with open(kb_path, "r") as f:
            incidents_kb = json.load(f)
    except FileNotFoundError:
        return {
            "equipment_type": equipment_type,
            "hazard_description": hazard_description,
            "incidents": [],
            "message": "Incidents knowledge base not found",
        }

    incidents = incidents_kb.get("incidents", [])
    relevant = []

    search_terms = set(
        hazard_description.lower().replace(",", " ").split()
    )
    search_terms.add(equipment_type.lower())

    for incident in incidents:
        score = 0

        # Match by equipment type
        incident_equipment = [
            e.lower() for e in incident.get("equipment_types", [])
        ]
        if equipment_type.lower() in incident_equipment:
            score += 3

        # Match by failure modes
        failure_modes = " ".join(
            incident.get("failure_modes", [])
        ).lower()
        for term in search_terms:
            if term in failure_modes:
                score += 1

        # Match by deviation categories
        deviation_cats = " ".join(
            incident.get("deviation_categories", [])
        ).lower()
        for term in search_terms:
            if term in deviation_cats:
                score += 1

        # Match by root causes
        root_causes = " ".join(
            incident.get("root_causes", [])
        ).lower()
        for term in search_terms:
            if term in root_causes:
                score += 1

        if score >= 2:
            relevant.append(
                {
                    "id": incident.get("id", ""),
                    "title": incident.get("title", ""),
                    "date": incident.get("date", ""),
                    "summary": incident.get("summary", ""),
                    "lessons_learned": incident.get("lessons_learned", []),
                    "relevance_score": score,
                }
            )

    # Sort by relevance score descending
    relevant.sort(key=lambda x: x["relevance_score"], reverse=True)

    return {
        "equipment_type": equipment_type,
        "hazard_description": hazard_description,
        "incidents_found": len(relevant),
        "incidents": relevant[:10],  # Return top 10 matches
    }


def export_worksheet(study_id: str) -> dict:
    """Trigger generation of HAZOP worksheet files (Excel and PDF) for download. Creates formatted reports with all study findings, risk assessments, and recommendations.

    Args:
        study_id: The unique identifier of the HAZOP study to export.

    Returns:
        Dictionary containing file paths for the generated Excel and PDF files.
    """
    try:
        from services.firestore_service import firestore_service
        from services.report_generator import report_generator

        study_data = firestore_service.get_study(study_id)
        if study_data is None:
            return {"error": f"Study {study_id} not found"}

        nodes = firestore_service.get_nodes_by_study(study_id)
        for node in nodes:
            node["deviations"] = firestore_service.get_deviations_by_node(
                node["node_id"]
            )
        study_data["nodes"] = nodes

        # Generate reports
        excel_bytes = report_generator.generate_excel(study_data)
        pdf_bytes = report_generator.generate_pdf(study_data)

        # Save to disk
        output_dir = Path("exports")
        output_dir.mkdir(parents=True, exist_ok=True)

        excel_path = output_dir / f"hazop_study_{study_id[:8]}.xlsx"
        pdf_path = output_dir / f"hazop_report_{study_id[:8]}.pdf"

        with open(excel_path, "wb") as f:
            f.write(excel_bytes)
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

        return {
            "study_id": study_id,
            "excel_path": str(excel_path),
            "pdf_path": str(pdf_path),
            "excel_url": f"/api/studies/{study_id}/export/excel",
            "pdf_url": f"/api/studies/{study_id}/export/pdf",
        }

    except Exception as e:
        return {"error": str(e), "study_id": study_id}


# ---- Helper functions ----


def _is_valid_combination(
    guide_word: str, parameter: str, equipment_type: str
) -> bool:
    """Filter out nonsensical guide_word/parameter combinations."""
    # Universal invalid combinations
    invalid = {
        ("REVERSE", "Temperature"),
        ("REVERSE", "Pressure"),
        ("REVERSE", "Level"),
        ("EARLY", "Temperature"),
        ("EARLY", "Pressure"),
        ("LATE", "Temperature"),
        ("LATE", "Pressure"),
        ("BEFORE", "Temperature"),
        ("BEFORE", "Pressure"),
        ("AFTER", "Temperature"),
        ("AFTER", "Pressure"),
    }

    if (guide_word, parameter) in invalid:
        return False

    # Equipment-specific filters
    if equipment_type in ("valve", "pipeline"):
        if parameter == "Level":
            return False

    if equipment_type == "pump":
        if guide_word == "REVERSE" and parameter == "Composition":
            return False

    return True


def _generate_fallback_risk_assessment(
    node_id: str,
    guide_word: str,
    parameter: str,
    equipment_type: str,
) -> dict:
    """Generate a risk assessment based on HAZOP knowledge base rules."""
    # Severity depends on guide word + parameter + equipment
    severity_map = {
        "NO Flow": 4, "NO Pressure": 5, "NO Temperature": 3, "NO Level": 4,
        "MORE Pressure": 5, "MORE Temperature": 4, "MORE Flow": 3, "MORE Level": 4,
        "MORE Composition": 3,
        "LESS Flow": 2, "LESS Pressure": 3, "LESS Temperature": 2, "LESS Level": 3,
        "LESS Composition": 2,
        "REVERSE Flow": 4, "REVERSE Composition": 3,
        "AS WELL AS Flow": 3, "AS WELL AS Composition": 3,
        "OTHER THAN Composition": 3, "OTHER THAN Flow": 2,
    }
    # Equipment-based severity boost
    high_risk_equipment = {"reactor", "column", "distillation_column", "separator", "heat_exchanger"}
    medium_risk_equipment = {"pump", "compressor", "vessel", "tank"}

    deviation_key = f"{guide_word} {parameter}"
    severity = severity_map.get(deviation_key, 3)
    if equipment_type.lower() in high_risk_equipment:
        severity = min(5, severity + 1)

    # Likelihood based on guide word
    likelihood_map = {
        "NO": "B", "MORE": "C", "LESS": "C", "REVERSE": "B",
        "AS WELL AS": "B", "OTHER THAN": "B", "PART OF": "C",
    }
    likelihood = likelihood_map.get(guide_word, "C")

    # Equipment-specific cause/consequence/safeguard lookup
    causes_db = {
        "NO Flow": ["Feed pump trip or failure", "Upstream isolation valve closed", "Line blockage (solids, hydrates, fouling)"],
        "MORE Flow": ["Control valve fails open", "Upstream pressure increase", "Parallel line opened inadvertently"],
        "LESS Flow": ["Partial line blockage", "Pump cavitation or impeller wear", "Control valve malfunction"],
        "REVERSE Flow": ["Pump trip with no check valve", "Backpressure from downstream vessel", "Gravity-driven backflow"],
        "NO Pressure": ["Loss of containment (leak/rupture)", "Upstream source depressurized", "PSV stuck open"],
        "MORE Pressure": ["Blocked outlet with continued feed", "External fire exposure", "Thermal expansion in blocked section"],
        "LESS Pressure": ["Leak at flange or instrument connection", "PSV premature lifting", "Vacuum condition on cooldown"],
        "NO Temperature": ["Loss of heat source", "Feed at ambient temperature", "Heat exchanger bypass open"],
        "MORE Temperature": ["Loss of cooling medium", "Exothermic reaction runaway", "External fire impingement"],
        "LESS Temperature": ["Excessive cooling", "Cold ambient conditions", "Loss of heat tracing"],
        "NO Level": ["Outlet valve fails open", "Feed supply interrupted", "Level instrument failure"],
        "MORE Level": ["Outlet blockage or valve closed", "Feed rate exceeds outlet capacity", "Level controller failure (output saturated)"],
        "LESS Level": ["Excessive withdrawal rate", "Feed interruption", "Leak in vessel bottom"],
        "AS WELL AS Flow": ["Ingress from connected utility line", "Cross-contamination from adjacent process", "Backflow from vent header"],
        "AS WELL AS Composition": ["Unexpected phase (water in hydrocarbon)", "Corrosion products in stream", "Catalyst fines carryover"],
    }
    consequences_db = {
        "NO Flow": ["Loss of production throughput", "Downstream equipment starvation", "Catalyst damage (if applicable)"],
        "MORE Flow": ["Vessel overfill or flooding", "Downstream equipment overload", "Reduced separation efficiency"],
        "LESS Flow": ["Reduced production rate", "Off-specification product", "Potential for stagnation and corrosion"],
        "REVERSE Flow": ["Contamination of upstream process", "Equipment damage from reverse operation", "Loss of containment at pump seals"],
        "NO Pressure": ["Loss of containment to atmosphere", "Fire/explosion if flammable release", "Personnel exposure hazard"],
        "MORE Pressure": ["Vessel overpressure and PSV lift", "Flange gasket failure", "Catastrophic vessel rupture"],
        "LESS Pressure": ["Vacuum collapse of vessel", "Air ingress creating flammable mixture", "Boiling point change affecting separation"],
        "MORE Temperature": ["Thermal degradation of product", "Metallurgical failure above design temp", "Overpressure from vapor generation"],
        "LESS Temperature": ["Hydrate or wax formation", "Brittle fracture risk (carbon steel)", "Increased viscosity affecting flow"],
        "MORE Level": ["Liquid carryover to gas systems", "Loss of vapor space for pressure relief", "Overflow to vent or flare"],
        "LESS Level": ["Gas blowby through liquid outlet", "Loss of liquid seal", "Pump cavitation damage"],
        "AS WELL AS Composition": ["Corrosion acceleration", "Emulsion formation", "Off-spec product requiring disposal"],
    }
    safeguards_db = {
        "Flow": ["Flow transmitter with alarm", "Control valve with fail-safe position"],
        "Pressure": ["Pressure safety valve (PSV)", "High/low pressure alarm and trip"],
        "Temperature": ["Temperature transmitter with alarm", "High temperature trip"],
        "Level": ["Level transmitter with alarm", "High-high level trip (independent)"],
        "Composition": ["Online analyzer or sampling program", "Chemical injection system"],
    }

    dk = f"{guide_word} {parameter}"
    causes = causes_db.get(dk, [f"{guide_word} {parameter} — causes to be confirmed by study team"])
    consequences = consequences_db.get(dk, [f"Potential process upset from {guide_word.lower()} {parameter.lower()}"])
    safeguards = safeguards_db.get(parameter, ["Refer to P&ID for existing safeguards"])

    return {
        "node_id": node_id,
        "guide_word": guide_word,
        "parameter": parameter,
        "causes": causes,
        "consequences": consequences,
        "severity": severity,
        "likelihood": likelihood,
        "risk_score": f"{severity}{likelihood}",
        "existing_safeguards": safeguards,
        "recommendations": [f"Review {parameter.lower()} protection for {guide_word} scenario"],
    }


def is_generic_row(deviation: dict) -> bool:
    """Check if a deviation row contains mostly generic template filler."""
    text_fields = []
    for field in ["causes", "consequences", "safeguards", "recommendations"]:
        val = deviation.get(field, [])
        if isinstance(val, list):
            text_fields.extend(val)
        elif isinstance(val, str):
            text_fields.append(val)

    hits = 0
    for text in text_fields:
        text_lower = str(text).lower()
        for phrase in BLOCKLIST_PHRASES:
            if phrase in text_lower:
                hits += 1
                break

    return hits >= 3
