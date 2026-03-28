import React, { useState, useEffect, useCallback } from "react";
import {
  Upload,
  Search,
  AlertTriangle,
  Shield,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UploadComponent } from "../components/Upload";
import { NodeList } from "../components/NodeList";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { cn } from "../lib/utils";
import { startAnalysis, getNodes } from "../lib/api";

const STEPS = [
  { id: "upload", label: "Upload", icon: Upload, description: "Upload diagram or describe process" },
  { id: "nodes", label: "Node ID", icon: Search, description: "Identify process nodes" },
  { id: "deviations", label: "Deviations", icon: AlertTriangle, description: "Analyze deviations" },
  { id: "risk", label: "Risk Assessment", icon: Shield, description: "Assess risks" },
  { id: "complete", label: "Complete", icon: CheckCircle2, description: "Analysis complete" },
];

function StepIndicator({ steps, currentStep }) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isComplete = index < currentIndex;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center min-w-[80px]">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                  isComplete
                    ? "border-low-500 bg-low-500 text-white"
                    : isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 text-center",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 min-w-[20px] mt-[-16px]",
                  index < currentIndex ? "bg-low-500" : "bg-muted-foreground/20"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function AnalyzePage() {
  const navigate = useNavigate();
  const [studyData, setStudyData] = useState(null);
  const [currentStep, setCurrentStep] = useState("upload");
  const [nodes, setNodes] = useState([]);
  const [analysisEvents, setAnalysisEvents] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const handleUploadComplete = useCallback((data) => {
    setStudyData(data);
    setCurrentStep("nodes");
    localStorage.setItem("hazop_current_study", data.study_id);
    handleStartAnalysis(data.study_id, {
      diagram_path: data.file_path || null,
      process_description: data.description || null,
    });
  }, []);

  // Map backend phases to frontend step IDs
  const PHASE_TO_STEP = {
    node_identification: "nodes",
    deviation_generation: "deviations",
    risk_assessment: "risk",
    safeguard_analysis: "risk",
    incident_search: "risk",
  };

  const handleStartAnalysis = useCallback(async (studyId, options = {}) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      await startAnalysis(
        studyId,
        // onMessage
        (data) => {
          // Add identified nodes to list
          if (data.type === "node_identified" || data.type === "node") {
            const node = data.data || data.node || data;
            setNodes((prev) => [...prev, node]);
            setAnalysisEvents((prev) => [...prev, {
              type: "node_identified",
              message: `Identified node: ${node.name || node.node_id}`,
            }]);
          } else if (data.type === "deviations_generated") {
            const d = data.data || data;
            setAnalysisEvents((prev) => [...prev, {
              type: "info",
              message: `${d.node_name || d.node_id}: ${d.deviations_count} deviations generated`,
            }]);
          } else if (data.type === "progress" && data.message) {
            setAnalysisEvents((prev) => [...prev, {
              type: data.status === "completed" ? "complete" : "progress",
              message: data.message,
            }]);
          }
          // Skip noisy per-deviation risk events from display

          // Advance step indicator based on phase
          if (data.phase && PHASE_TO_STEP[data.phase]) {
            setCurrentStep(PHASE_TO_STEP[data.phase]);
          }
        },
        // onError
        (err) => {
          setError(err?.message || "Analysis failed");
          setIsAnalyzing(false);
          fetchNodes(studyId);
        },
        // onComplete
        () => {
          setCurrentStep("complete");
          setIsAnalyzing(false);
          fetchNodes(studyId);
        },
        options
      );

    } catch (err) {
      setError(err.message);
      setIsAnalyzing(false);
      fetchNodes(studyId);
    }
  }, []);

  const fetchNodes = async (studyId) => {
    try {
      const nodeList = await getNodes(studyId);
      setNodes(nodeList);
    } catch {
      // Nodes may not be ready yet
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analyze Process</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a PFD/P&ID diagram or describe your process to start HAZOP analysis
        </p>
      </div>

      {/* Step indicator */}
      {studyData && (
        <Card>
          <CardContent className="py-4">
            <StepIndicator steps={STEPS} currentStep={currentStep} />
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      {!studyData ? (
        <UploadComponent
          onUploadComplete={handleUploadComplete}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Node list */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Process Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <NodeList nodes={nodes} isLoading={isAnalyzing && nodes.length === 0} />
              </CardContent>
            </Card>
          </div>

          {/* Analysis progress */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Analysis Progress</CardTitle>
                  {isAnalyzing && (
                    <Badge variant="default" className="animate-pulse">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Analyzing
                    </Badge>
                  )}
                  {currentStep === "complete" && (
                    <Badge variant="low">Complete</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {analysisEvents.length === 0 && isAnalyzing && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting analysis...
                    </div>
                  )}
                  {analysisEvents.map((event, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 py-2 border-b last:border-0 animate-fade-in text-sm"
                    >
                      <div className="mt-0.5">
                        {event.type === "complete" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : event.type === "error" ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : event.type === "node_identified" ? (
                          <Search className="h-4 w-4 text-blue-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          {event.message || event.description || JSON.stringify(event)}
                        </p>
                        {event.details && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {currentStep === "complete" && (
                  <div className="mt-6 flex gap-3">
                    <Button onClick={() => navigate(`/worksheet?study=${studyData?.study_id}`)} className="flex-1">
                      View Worksheet
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/reports?study=${studyData?.study_id}`)}
                    >
                      Generate Reports
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}

export default AnalyzePage;
