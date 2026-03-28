import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatRiskScore(severity, likelihood) {
  // Likelihood can be a letter (A-E) or number
  const likelihoodMap = { A: 5, B: 4, C: 3, D: 2, E: 1 };
  const sev = typeof severity === "number" ? severity : parseInt(severity) || 0;
  const lik =
    typeof likelihood === "string"
      ? likelihoodMap[likelihood.toUpperCase()] || parseInt(likelihood) || 1
      : typeof likelihood === "number"
      ? likelihood
      : 1;
  const score = sev * lik;
  if (score >= 15) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  if (score > 0) return "Low";
  return "Low";
}

export function getRiskColor(riskLevel) {
  const level =
    typeof riskLevel === "string"
      ? riskLevel.toLowerCase()
      : formatRiskScore(riskLevel, 1).toLowerCase();

  switch (level) {
    case "critical":
      return "bg-critical-500 text-white";
    case "high":
      return "bg-high-500 text-white";
    case "medium":
      return "bg-medium-400 text-medium-900";
    case "low":
      return "bg-low-500 text-white";
    default:
      return "bg-slate-200 text-slate-700";
  }
}

export function getRiskBadgeVariant(riskLevel) {
  const level = typeof riskLevel === "string" ? riskLevel.toLowerCase() : "";
  switch (level) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    default:
      return "default";
  }
}

export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str, maxLength = 100) {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}
