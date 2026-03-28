import React, { useMemo } from "react";
import { FileText, BarChart3, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { ReportDownload } from "../components/ReportDownload";
import { Select } from "../components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { useStudySession } from "../hooks/useStudySession";
import { formatRiskScore, getRiskBadgeVariant } from "../lib/utils";

export function ReportsPage() {
  const [searchParams] = useSearchParams();
  const studyFromUrl = searchParams.get("study");

  const {
    studies,
    currentStudy,
    currentStudyId,
    setCurrentStudyId,
    nodes,
    deviations,
  } = useStudySession(studyFromUrl);

  const summary = useMemo(() => {
    if (!deviations.length) return null;

    const riskCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    deviations.forEach((d) => {
      const risk = formatRiskScore(d.severity || 0, d.likelihood || 0);
      if (riskCounts[risk] !== undefined) riskCounts[risk]++;
    });

    const openCount = deviations.filter((d) => (d.status || "open") === "open").length;
    const reviewedCount = deviations.filter((d) => d.status === "reviewed").length;
    const closedCount = deviations.filter((d) => d.status === "closed").length;

    return { riskCounts, openCount, reviewedCount, closedCount };
  }, [deviations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate and download HAZOP study reports
        </p>
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
        </CardContent>
      </Card>

      {currentStudyId && currentStudy ? (
        <>
          {/* Summary preview */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Study</p>
                    <p className="text-sm font-medium">{currentStudy.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Nodes</p>
                    <p className="text-sm font-medium">{nodes.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Deviations</p>
                    <p className="text-sm font-medium">{deviations.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-medium capitalize">
                      {currentStudy.status || "In Progress"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Risk Distribution
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.riskCounts).map(([level, count]) => (
                      <div key={level} className="flex items-center gap-1.5">
                        <Badge variant={getRiskBadgeVariant(level)} className="text-xs">
                          {level}
                        </Badge>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Action Item Status
                  </p>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-high-500" />
                      <span>{summary.openCount} Open</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <span>{summary.reviewedCount} Reviewed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-low-500" />
                      <span>{summary.closedCount} Closed</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Download section */}
          <ReportDownload
            studyId={currentStudyId}
            studyName={currentStudy.name}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FileText className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No Study Selected</p>
          <p className="text-sm mt-1">
            Select a study above to preview and download reports
          </p>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
