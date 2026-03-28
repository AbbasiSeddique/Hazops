import React, { useState } from "react";
import {
  Cylinder,
  Flame,
  Gauge,
  Pipette,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Loader2,
  Box,
} from "lucide-react";
import { Card, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { cn } from "../lib/utils";

const EQUIPMENT_ICONS = {
  vessel: Cylinder,
  reactor: Flame,
  pump: Gauge,
  pipe: Pipette,
  tank: Cylinder,
  column: Cylinder,
  exchanger: Box,
  default: Box,
};

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending", bg: "bg-muted" },
  analyzing: { icon: Loader2, color: "text-primary", label: "Analyzing", bg: "bg-primary/10" },
  complete: { icon: CheckCircle2, color: "text-low-600", label: "Complete", bg: "bg-low-50" },
};

function NodeCard({ node, index }) {
  const [expanded, setExpanded] = useState(false);

  const equipmentType = (node.equipment_type || "default").toLowerCase();
  const IconComponent = EQUIPMENT_ICONS[equipmentType] || EQUIPMENT_ICONS.default;
  const status = STATUS_CONFIG[node.status || "pending"];
  const StatusIcon = status.icon;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md animate-fade-in",
        expanded && "ring-1 ring-primary/20"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <IconComponent className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {node.node_id || `N-${index + 1}`}
                </span>
                <Badge variant="outline" className="text-xs">
                  {node.equipment_type || "Equipment"}
                </Badge>
              </div>
              <h4 className="font-medium text-sm">{node.name}</h4>
              {node.operating_conditions && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {typeof node.operating_conditions === "string"
                    ? node.operating_conditions
                    : `${node.operating_conditions.temperature || ""} ${node.operating_conditions.pressure || ""}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", status.bg)}>
              <StatusIcon
                className={cn("h-3 w-3", status.color, node.status === "analyzing" && "animate-spin")}
              />
              <span className={status.color}>{status.label}</span>
            </div>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-3 animate-fade-in">
            {(node.inlet_streams?.length > 0 || node.outlet_streams?.length > 0) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Streams</p>
                <div className="flex flex-wrap gap-1">
                  {[...(node.inlet_streams || [])].map((stream, i) => (
                    <Badge key={`in-${i}`} variant="secondary" className="text-xs">
                      {typeof stream === "string" ? `IN: ${stream}` : stream.name || `Inlet ${i + 1}`}
                    </Badge>
                  ))}
                  {[...(node.outlet_streams || [])].map((stream, i) => (
                    <Badge key={`out-${i}`} variant="secondary" className="text-xs">
                      {typeof stream === "string" ? `OUT: ${stream}` : stream.name || `Outlet ${i + 1}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {node.control_instruments && node.control_instruments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Instruments</p>
                <div className="flex flex-wrap gap-1">
                  {node.control_instruments.map((inst, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {typeof inst === "string" ? inst : inst.tag || `Inst ${i + 1}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {node.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-xs text-foreground">{node.description}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function NodeList({ nodes = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Identifying process nodes...</p>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Box className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No nodes identified yet</p>
        <p className="text-xs mt-1">Upload a diagram or start an analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Process Nodes ({nodes.length})
        </h3>
      </div>
      <div className="space-y-2">
        {nodes.map((node, index) => (
          <NodeCard key={node.node_id || index} node={node} index={index} />
        ))}
      </div>
    </div>
  );
}

export default NodeList;
