import React, { useState, useMemo, useCallback } from "react";
import {
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/Table";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { Input } from "./ui/Input";
import { cn, formatRiskScore, getRiskBadgeVariant, truncate } from "../lib/utils";
import { updateDeviation } from "../lib/api";

function EditableCell({ value, onSave, type = "text", className }) {
  const displayValue = Array.isArray(value) ? value.join("\n") : (value || "");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayValue);

  const handleSave = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value || "");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        {type === "number" ? (
          <Input
            type="number"
            min={1}
            max={5}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-7 w-16 text-xs"
            autoFocus
          />
        ) : (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[60px] rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            autoFocus
          />
        )}
        <div className="flex flex-col gap-0.5">
          <button onClick={handleSave} className="text-low-600 hover:text-low-700">
            <Check className="h-3 w-3" />
          </button>
          <button onClick={handleCancel} className="text-destructive hover:text-destructive/80">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer rounded px-1 py-0.5 hover:bg-muted/50 transition-colors min-h-[24px]",
        className
      )}
      title="Click to edit"
    >
      {Array.isArray(value) && value.length > 0 ? (
        <ul className="text-xs list-disc list-inside space-y-0.5">
          {value.slice(0, 3).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
          {value.length > 3 && (
            <li className="text-muted-foreground">+{value.length - 3} more</li>
          )}
        </ul>
      ) : typeof value === "string" && value ? (
        <span className="text-xs">{value}</span>
      ) : typeof value === "number" ? (
        <span className="text-xs">{value}</span>
      ) : (
        <span className="text-muted-foreground/50 italic text-xs">--</span>
      )}
    </div>
  );
}

function ExpandableText({ text, maxLength = 80 }) {
  const [expanded, setExpanded] = useState(false);

  if (!text || text.length <= maxLength) {
    return <span className="text-xs">{text || "--"}</span>;
  }

  return (
    <div>
      <span className="text-xs">{expanded ? text : truncate(text, maxLength)}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="text-xs text-primary ml-1 hover:underline"
      >
        {expanded ? "less" : "more"}
      </button>
    </div>
  );
}

export function WorksheetTable({
  deviations = [],
  nodes = [],
  onDeviationUpdate,
}) {
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterNode, setFilterNode] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedRows, setExpandedRows] = useState(new Set());

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ARRAY_FIELDS = ["causes", "consequences", "safeguards", "recommendations"];

  const handleCellSave = useCallback(
    async (deviationId, field, value) => {
      try {
        // Split string back to array for array fields
        const processedValue =
          ARRAY_FIELDS.includes(field) && typeof value === "string"
            ? value.split("\n").map((s) => s.trim()).filter(Boolean)
            : value;
        await updateDeviation(deviationId, { [field]: processedValue });
        if (onDeviationUpdate) onDeviationUpdate();
      } catch (err) {
        console.error("Failed to update deviation:", err);
      }
    },
    [onDeviationUpdate]
  );

  const filtered = useMemo(() => {
    let result = [...deviations];

    if (filterNode !== "all") {
      result = result.filter((d) => d.node_name === filterNode || d.node_id === filterNode);
    }
    if (filterRisk !== "all") {
      result = result.filter((d) => {
        const risk = formatRiskScore(d.severity || 0, d.likelihood || 0);
        return risk.toLowerCase() === filterRisk;
      });
    }
    if (filterStatus !== "all") {
      result = result.filter((d) => (d.status || "open") === filterStatus);
    }

    if (sortField) {
      result.sort((a, b) => {
        let aVal = a[sortField] || "";
        let bVal = b[sortField] || "";
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }

    return result;
  }, [deviations, filterNode, filterRisk, filterStatus, sortField, sortDirection]);

  const uniqueNodes = useMemo(
    () => [...new Set(deviations.map((d) => d.node_name).filter(Boolean))],
    [deviations]
  );

  const SortHeader = ({ field, children }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>

        <Select
          value={filterNode}
          onChange={(e) => setFilterNode(e.target.value)}
          className="w-40 h-8 text-xs"
        >
          <option value="all">All Nodes</option>
          {uniqueNodes.map((node) => (
            <option key={node} value={node}>
              {node}
            </option>
          ))}
        </Select>

        <Select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
          className="w-32 h-8 text-xs"
        >
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>

        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-32 h-8 text-xs"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="closed">Closed</option>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {deviations.length} deviations
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto max-h-[70vh]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="min-w-[100px]">
                <SortHeader field="node_name">Node</SortHeader>
              </TableHead>
              <TableHead className="min-w-[90px]">
                <SortHeader field="guide_word">Guide Word</SortHeader>
              </TableHead>
              <TableHead className="min-w-[90px]">Parameter</TableHead>
              <TableHead className="min-w-[120px]">Deviation</TableHead>
              <TableHead className="min-w-[150px]">Causes</TableHead>
              <TableHead className="min-w-[150px]">Consequences</TableHead>
              <TableHead className="min-w-[130px]">Safeguards</TableHead>
              <TableHead className="w-16 text-center">
                <SortHeader field="severity">Sev.</SortHeader>
              </TableHead>
              <TableHead className="w-16 text-center">
                <SortHeader field="likelihood">Lik.</SortHeader>
              </TableHead>
              <TableHead className="w-20 text-center">Risk</TableHead>
              <TableHead className="min-w-[150px]">Recommendations</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
                  No deviations found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((dev) => {
                const risk = formatRiskScore(dev.severity || 0, dev.likelihood || 0);
                const isExpanded = expandedRows.has(dev.deviation_id);

                return (
                  <TableRow key={dev.deviation_id} className="align-top">
                    <TableCell className="p-2">
                      <button onClick={() => toggleRow(dev.deviation_id)}>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {dev.node_name || dev.node_id || "--"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {dev.guide_word || "--"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{dev.parameter || "--"}</TableCell>
                    <TableCell>
                      <ExpandableText
                        text={dev.deviation || `${dev.guide_word} ${dev.parameter}`}
                        maxLength={isExpanded ? 999 : 60}
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={dev.causes}
                        onSave={(v) => handleCellSave(dev.deviation_id, "causes", v)}
                        className="text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={dev.consequences}
                        onSave={(v) => handleCellSave(dev.deviation_id, "consequences", v)}
                        className="text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={dev.safeguards}
                        onSave={(v) => handleCellSave(dev.deviation_id, "existing_safeguards", v)}
                        className="text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <EditableCell
                        value={dev.severity}
                        onSave={(v) => handleCellSave(dev.deviation_id, "severity", Number(v))}
                        type="number"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <EditableCell
                        value={dev.likelihood}
                        onSave={(v) => handleCellSave(dev.deviation_id, "likelihood", Number(v))}
                        type="number"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getRiskBadgeVariant(risk)} className="text-xs">
                        {risk}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <EditableCell
                        value={dev.recommendations}
                        onSave={(v) => handleCellSave(dev.deviation_id, "recommendations", v)}
                        className="text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={dev.status || "open"}
                        onChange={(e) => handleCellSave(dev.deviation_id, "status", e.target.value)}
                        className="h-7 text-xs w-24"
                      >
                        <option value="open">Open</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="closed">Closed</option>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default WorksheetTable;
