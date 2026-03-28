"""
Report generation and export API endpoints.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io

router = APIRouter(prefix="/api", tags=["reports"])


@router.post("/studies/{study_id}/export/excel")
async def export_excel(study_id: str):
    """
    Generate and return a HAZOP study worksheet as an Excel file.

    The Excel file includes:
    - Cover sheet with study metadata
    - Node-by-node worksheets with all HAZOP columns
    - Summary sheet with risk distribution
    - Color-coded risk levels
    """
    try:
        from services.firestore_service import firestore_service
        from services.report_generator import report_generator

        study_data = firestore_service.get_study(study_id)
        if study_data is None:
            raise HTTPException(status_code=404, detail="Study not found")

        # Get nodes and deviations for the study
        nodes = firestore_service.get_nodes_by_study(study_id)
        for node in nodes:
            node["deviations"] = firestore_service.get_deviations_by_node(
                node["node_id"]
            )

        study_data["nodes"] = nodes
        excel_bytes = report_generator.generate_excel(study_data)

        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="hazop_study_{study_id[:8]}.xlsx"'
                )
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate Excel report: {str(e)}",
        )


@router.post("/studies/{study_id}/export/pdf")
async def export_pdf(study_id: str):
    """
    Generate and return a HAZOP study report as a PDF file.

    The PDF includes:
    - Executive summary
    - Methodology description
    - Findings ranked by risk
    - Risk matrix visualization
    - Action items
    """
    try:
        from services.firestore_service import firestore_service
        from services.report_generator import report_generator

        study_data = firestore_service.get_study(study_id)
        if study_data is None:
            raise HTTPException(status_code=404, detail="Study not found")

        # Get nodes and deviations for the study
        nodes = firestore_service.get_nodes_by_study(study_id)
        for node in nodes:
            node["deviations"] = firestore_service.get_deviations_by_node(
                node["node_id"]
            )

        study_data["nodes"] = nodes
        pdf_bytes = report_generator.generate_pdf(study_data)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="hazop_report_{study_id[:8]}.pdf"'
                )
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF report: {str(e)}",
        )
