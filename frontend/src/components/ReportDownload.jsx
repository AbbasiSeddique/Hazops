import React, { useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card";
import { exportExcel, exportPdf } from "../lib/api";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ReportCard({
  title,
  description,
  icon: Icon,
  iconColor,
  onDownload,
  isLoading,
  status,
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className={`rounded-lg p-3 ${iconColor}`}>
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="mt-auto">
        {status === "success" && (
          <div className="flex items-center gap-2 mb-3 text-sm text-low-600">
            <CheckCircle2 className="h-4 w-4" />
            Download complete!
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 mb-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Download failed. Please try again.
          </div>
        )}
        <Button onClick={onDownload} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ReportDownload({ studyId, studyName }) {
  const [excelStatus, setExcelStatus] = useState(null);
  const [pdfStatus, setPdfStatus] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExcelDownload = async () => {
    if (!studyId) return;
    setExcelLoading(true);
    setExcelStatus(null);
    try {
      const blob = await exportExcel(studyId);
      downloadBlob(blob, `${studyName || "hazop"}_worksheet.xlsx`);
      setExcelStatus("success");
    } catch {
      setExcelStatus("error");
    } finally {
      setExcelLoading(false);
    }
  };

  const handlePdfDownload = async () => {
    if (!studyId) return;
    setPdfLoading(true);
    setPdfStatus(null);
    try {
      const blob = await exportPdf(studyId);
      downloadBlob(blob, `${studyName || "hazop"}_report.pdf`);
      setPdfStatus("success");
    } catch {
      setPdfStatus("error");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ReportCard
        title="Excel Worksheet"
        description="Download the complete HAZOP worksheet in Excel format. Includes all nodes, deviations, risk assessments, and recommendations in an editable spreadsheet."
        icon={FileSpreadsheet}
        iconColor="bg-low-50 text-low-600"
        onDownload={handleExcelDownload}
        isLoading={excelLoading}
        status={excelStatus}
      />
      <ReportCard
        title="PDF Compliance Report"
        description="Generate a formatted PDF report suitable for regulatory submissions. Includes executive summary, risk matrix, detailed findings, and action items."
        icon={FileText}
        iconColor="bg-critical-50 text-critical-600"
        onDownload={handlePdfDownload}
        isLoading={pdfLoading}
        status={pdfStatus}
      />
    </div>
  );
}

export default ReportDownload;
