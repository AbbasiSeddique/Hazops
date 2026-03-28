"""
Single authoritative data store for HAZOP studies, nodes, and deviations.
In-memory for development. All API routes and the agent write/read through this service.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional


class FirestoreService:
    def __init__(self) -> None:
        self._studies: dict[str, dict] = {}
        self._nodes: dict[str, dict] = {}
        self._deviations: dict[str, dict] = {}

    # ---- Study operations ----

    def create_study(
        self,
        name: str,
        description: Optional[str] = None,
        process_type: Optional[str] = None,
        diagram_path: Optional[str] = None,
        study_id: Optional[str] = None,
    ) -> dict:
        sid = study_id or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        study = {
            "study_id": sid,
            "name": name,
            "description": description,
            "process_type": process_type,
            "diagram_path": diagram_path,
            "status": "created",
            "created_at": now,
            "updated_at": now,
        }
        self._studies[sid] = study
        return study

    def get_study(self, study_id: str) -> Optional[dict]:
        return self._studies.get(study_id)

    def list_studies(self) -> list[dict]:
        return list(self._studies.values())

    def update_study(self, study_id: str, **kwargs) -> Optional[dict]:
        if study_id not in self._studies:
            return None
        study = self._studies[study_id]
        for key, value in kwargs.items():
            if value is not None:
                study[key] = value
        study["updated_at"] = datetime.now(timezone.utc).isoformat()
        return study

    def delete_study(self, study_id: str) -> bool:
        if study_id not in self._studies:
            return False
        node_ids = [nid for nid, n in self._nodes.items() if n.get("study_id") == study_id]
        for nid in node_ids:
            dev_ids = [did for did, d in self._deviations.items() if d.get("node_id") == nid]
            for did in dev_ids:
                del self._deviations[did]
            del self._nodes[nid]
        del self._studies[study_id]
        return True

    # ---- Node operations ----

    def create_node_from_dict(self, study_id: str, node_dict: dict) -> dict:
        """Create a node from raw agent output. Normalizes field names."""
        node_id = node_dict.get("node_id", str(uuid.uuid4()))
        oc = node_dict.get("operating_conditions", {})
        if isinstance(oc, str):
            oc = {"description": oc}
        node = {
            "node_id": node_id,
            "study_id": study_id,
            "equipment_type": node_dict.get("equipment_type", "unknown"),
            "name": node_dict.get("name", ""),
            "operating_conditions": oc,
            "inlet_streams": node_dict.get("inlet_streams", []),
            "outlet_streams": node_dict.get("outlet_streams", []),
            "control_instruments": node_dict.get("control_instruments", []),
            "deviations_count": 0,
        }
        self._nodes[node_id] = node
        return node

    def get_node(self, node_id: str) -> Optional[dict]:
        return self._nodes.get(node_id)

    def get_nodes_by_study(self, study_id: str) -> list[dict]:
        return [n for n in self._nodes.values() if n.get("study_id") == study_id]

    # ---- Deviation operations ----

    def create_deviation_from_dict(self, node_id: str, study_id: str, dev_dict: dict) -> dict:
        """Create a deviation from raw agent output. Normalizes field names."""
        dev_id = dev_dict.get("deviation_id", str(uuid.uuid4()))
        deviation = {
            "deviation_id": dev_id,
            "node_id": node_id,
            "study_id": study_id,
            "guide_word": dev_dict.get("guide_word", ""),
            "parameter": dev_dict.get("parameter", ""),
            "causes": _ensure_list(dev_dict.get("causes") or dev_dict.get("common_causes")),
            "consequences": _ensure_list(dev_dict.get("consequences") or dev_dict.get("common_consequences")),
            "severity": _safe_int(dev_dict.get("severity", 0)),
            "likelihood": str(dev_dict.get("likelihood", "")) or "",
            "risk_score": str(dev_dict.get("risk_score", "")) or "",
            "safeguards": _ensure_list(
                dev_dict.get("safeguards")
                or dev_dict.get("existing_safeguards")
                or dev_dict.get("standard_safeguards")
            ),
            "recommendations": _ensure_list(dev_dict.get("recommendations")),
            "notes": str(dev_dict.get("notes", "") or ""),
        }
        self._deviations[dev_id] = deviation
        # Update node deviation count
        if node_id in self._nodes:
            self._nodes[node_id]["deviations_count"] = (
                self._nodes[node_id].get("deviations_count", 0) + 1
            )
        return deviation

    def get_deviations_by_node(self, node_id: str) -> list[dict]:
        return [d for d in self._deviations.values() if d.get("node_id") == node_id]

    def get_all_deviations_by_study(self, study_id: str) -> list[dict]:
        return [d for d in self._deviations.values() if d.get("study_id") == study_id]

    def update_deviation(self, deviation_id: str, **kwargs) -> Optional[dict]:
        if deviation_id not in self._deviations:
            return None
        dev = self._deviations[deviation_id]
        for key, value in kwargs.items():
            if value is not None:
                dev[key] = value
        return dev


def _ensure_list(val) -> list:
    if not val:
        return []
    if isinstance(val, str):
        return [val]
    if isinstance(val, list):
        return [str(item) for item in val if item]
    return [str(val)]


def _safe_int(val) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


# Module-level singleton
firestore_service = FirestoreService()
