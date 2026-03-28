import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  FileText,
  Layers,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { RiskMatrix } from "./RiskMatrix";
import { formatRiskScore, formatDate, getRiskBadgeVariant } from "../lib/utils";

const RISK_COLORS = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};

function StatCard({ title, value, description, icon: Icon, trend }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3 text-xs text-low-600">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard({ studies = [], nodes = [], deviations = [] }) {
  const stats = useMemo(() => {
    const riskCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    deviations.forEach((d) => {
      const risk = formatRiskScore(d.severity || 0, d.likelihood || 0);
      if (riskCounts[risk] !== undefined) riskCounts[risk]++;
    });
    return {
      totalStudies: studies.length,
      totalNodes: nodes.length,
      totalDeviations: deviations.length,
      criticalRisks: riskCounts.Critical,
      riskCounts,
    };
  }, [studies, nodes, deviations]);

  const riskDistribution = useMemo(
    () =>
      Object.entries(stats.riskCounts).map(([name, value]) => ({
        name,
        value,
        color: RISK_COLORS[name],
      })),
    [stats.riskCounts]
  );

  const deviationsPerNode = useMemo(() => {
    const counts = {};
    deviations.forEach((d) => {
      const name = d.node_name || d.node_id || "Unknown";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [deviations]);

  const recentStudies = useMemo(
    () =>
      [...studies]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0) - new Date(a.created_at || 0)
        )
        .slice(0, 5),
    [studies]
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Studies"
          value={stats.totalStudies}
          icon={FileText}
          description="HAZOP studies"
        />
        <StatCard
          title="Process Nodes"
          value={stats.totalNodes}
          icon={Layers}
          description="Identified nodes"
        />
        <StatCard
          title="Deviations"
          value={stats.totalDeviations}
          icon={Activity}
          description="Total findings"
        />
        <StatCard
          title="Critical Risks"
          value={stats.criticalRisks}
          icon={AlertTriangle}
          description="Require immediate action"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk distribution chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {deviations.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={riskDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {riskDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No deviation data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskMatrix deviations={deviations} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deviations per node */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deviations per Node</CardTitle>
          </CardHeader>
          <CardContent>
            {deviationsPerNode.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deviationsPerNode} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(217.2, 91.2%, 59.8%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No node data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent studies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Studies</CardTitle>
          </CardHeader>
          <CardContent>
            {recentStudies.length > 0 ? (
              <div className="space-y-3">
                {recentStudies.map((study) => (
                  <div
                    key={study.study_id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{study.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(study.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant={study.status === "complete" ? "low" : "secondary"}
                    >
                      {study.status || "In Progress"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                No studies yet. Create your first HAZOP study!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
