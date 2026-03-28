import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowRight, FileText, Activity } from "lucide-react";
import { Dashboard } from "../components/Dashboard";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { useStudySession } from "../hooks/useStudySession";

export function DashboardPage() {
  const navigate = useNavigate();
  const { studies, nodes, deviations, isLoading } = useStudySession();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your HAZOP studies and risk analysis
          </p>
        </div>
        <Button onClick={() => navigate("/analyze")}>
          <Plus className="mr-2 h-4 w-4" />
          New Study
        </Button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/analyze")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Start New Analysis</p>
              <p className="text-xs text-muted-foreground">Upload a diagram or describe a process</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/worksheet")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-high-50 p-2">
              <FileText className="h-5 w-5 text-high-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">View Worksheets</p>
              <p className="text-xs text-muted-foreground">Review and edit HAZOP findings</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/reports")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-low-50 p-2">
              <Activity className="h-5 w-5 text-low-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Generate Reports</p>
              <p className="text-xs text-muted-foreground">Export Excel or PDF reports</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Dashboard charts and data */}
      <Dashboard studies={studies} nodes={nodes} deviations={deviations} />
    </div>
  );
}

export default DashboardPage;
