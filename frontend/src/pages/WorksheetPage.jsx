import React, { useState, useEffect } from "react";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { WorksheetTable } from "../components/WorksheetTable";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { useStudySession } from "../hooks/useStudySession";
import { exportExcel } from "../lib/api";

export function WorksheetPage() {
  const [searchParams] = useSearchParams();
  const studyFromUrl = searchParams.get("study");

  const {
    studies,
    currentStudy,
    currentStudyId,
    setCurrentStudyId,
    nodes,
    deviations,
    isLoading,
    refreshDeviations,
  } = useStudySession(studyFromUrl);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!currentStudyId) return;
    setIsExporting(true);
    try {
      const blob = await exportExcel(currentStudyId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentStudy?.name || "hazop"}_worksheet.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HAZOP Worksheet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and edit deviations, risk assessments, and recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDeviations}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!currentStudyId || isExporting}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export Excel"}
          </Button>
        </div>
      </div>

      {/* Study selector */}
      <Card>
        <CardContent className="py-3 flex items-center gap-4">
          <label className="text-sm font-medium whitespace-nowrap">
            Select Study:
          </label>
          <Select
            value={currentStudyId || ""}
            onChange={(e) => setCurrentStudyId(e.target.value || null)}
            className="max-w-xs"
          >
            <option value="">-- Select a study --</option>
            {studies.map((study) => (
              <option key={study.study_id} value={study.study_id}>
                {study.name}
              </option>
            ))}
          </Select>
          {currentStudy && (
            <span className="text-xs text-muted-foreground">
              {nodes.length} nodes, {deviations.length} deviations
            </span>
          )}
        </CardContent>
      </Card>

      {/* Worksheet */}
      {currentStudyId ? (
        isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mr-3" />
            Loading worksheet data...
          </div>
        ) : (
          <WorksheetTable
            deviations={deviations}
            nodes={nodes}
            onDeviationUpdate={refreshDeviations}
          />
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FileSpreadsheet className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No Study Selected</p>
          <p className="text-sm mt-1">
            Select a study above to view its HAZOP worksheet
          </p>
        </div>
      )}
    </div>
  );
}

export default WorksheetPage;
