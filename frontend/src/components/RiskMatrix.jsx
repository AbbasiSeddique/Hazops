import React, { useMemo } from "react";
import { cn } from "../lib/utils";

const SEVERITY_LABELS = [
  "Catastrophic",
  "Major",
  "Moderate",
  "Minor",
  "Negligible",
];

const LIKELIHOOD_LABELS = ["A - Frequent", "B - Probable", "C - Occasional", "D - Remote", "E - Improbable"];

// Risk matrix colors: [severity][likelihood] (both 1-indexed internally)
// severity 5 = top row, likelihood A = left column
function getRiskLevel(severity, likelihood) {
  const score = severity * likelihood;
  if (score >= 20) return "critical";
  if (score >= 12) return "high";
  if (score >= 6) return "medium";
  return "low";
}

const CELL_COLORS = {
  critical: "bg-critical-500 hover:bg-critical-600 text-white",
  high: "bg-high-400 hover:bg-high-500 text-white",
  medium: "bg-medium-300 hover:bg-medium-400 text-medium-900",
  low: "bg-low-400 hover:bg-low-500 text-white",
};

export function RiskMatrix({ deviations = [], onCellClick }) {
  // Build count matrix
  const matrix = useMemo(() => {
    const counts = {};
    for (let s = 1; s <= 5; s++) {
      for (let l = 1; l <= 5; l++) {
        counts[`${s}-${l}`] = 0;
      }
    }
    deviations.forEach((d) => {
      const s = d.severity || 0;
      const l = d.likelihood || 0;
      if (s >= 1 && s <= 5 && l >= 1 && l <= 5) {
        counts[`${s}-${l}`] += 1;
      }
    });
    return counts;
  }, [deviations]);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Risk Matrix (Severity vs Likelihood)
      </h3>
      <div className="overflow-auto">
        <div className="inline-block">
          {/* Header row - likelihood labels */}
          <div className="flex">
            <div className="w-24 shrink-0" />
            {LIKELIHOOD_LABELS.map((label, i) => (
              <div
                key={i}
                className="w-20 shrink-0 text-center text-[10px] font-medium text-muted-foreground px-1 pb-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Matrix rows (severity 5 at top) */}
          {[5, 4, 3, 2, 1].map((severity) => (
            <div key={severity} className="flex">
              {/* Severity label */}
              <div className="w-24 shrink-0 flex items-center pr-2">
                <span className="text-[10px] font-medium text-muted-foreground text-right w-full">
                  {severity} - {SEVERITY_LABELS[5 - severity]}
                </span>
              </div>
              {/* Cells */}
              {[5, 4, 3, 2, 1].map((likelihood) => {
                const level = getRiskLevel(severity, likelihood);
                const count = matrix[`${severity}-${likelihood}`];

                return (
                  <div
                    key={likelihood}
                    onClick={() =>
                      onCellClick && onCellClick(severity, likelihood)
                    }
                    className={cn(
                      "w-20 h-14 shrink-0 flex flex-col items-center justify-center border border-white/30 cursor-pointer transition-all m-0.5 rounded",
                      CELL_COLORS[level]
                    )}
                  >
                    {count > 0 && (
                      <>
                        <span className="text-lg font-bold">{count}</span>
                        <span className="text-[9px] opacity-80">
                          deviation{count !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Axis labels */}
          <div className="flex mt-2">
            <div className="w-24 shrink-0 text-right pr-2">
              <span className="text-[10px] text-muted-foreground font-medium">
                SEVERITY
              </span>
            </div>
            <div className="flex-1 text-center">
              <span className="text-[10px] text-muted-foreground font-medium">
                LIKELIHOOD
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskMatrix;
