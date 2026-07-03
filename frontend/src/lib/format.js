export function fmtRelative(iso) {
  if (!iso) return "—";
  const now = new Date();
  const then = new Date(iso);
  const diff = (then.getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  const sign = diff < 0 ? "-" : "";
  if (abs < 60) return `${sign}${Math.round(abs)}s`;
  if (abs < 3600) return `${sign}${Math.round(abs / 60)}m`;
  if (abs < 86400) return `${sign}${Math.round(abs / 3600)}h`;
  return `${sign}${Math.round(abs / 86400)}d`;
}

export function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function slaBadgeClass(status) {
  if (status === "breached") return "bg-red-600 text-white sla-breached";
  if (status === "at_risk") return "bg-amber-500 text-white";
  return "bg-zinc-100 text-zinc-700 border border-zinc-200";
}

export function priorityClass(p) {
  return {
    critical: "bg-red-600 text-white",
    high: "bg-amber-500 text-white",
    medium: "bg-zinc-200 text-zinc-800",
    low: "bg-zinc-100 text-zinc-600",
  }[p] || "bg-zinc-100";
}

export function statusClass(s) {
  return {
    open: "bg-blue-50 text-blue-700 border border-blue-200",
    pending: "bg-amber-50 text-amber-800 border border-amber-200",
    solved: "bg-green-50 text-green-700 border border-green-200",
    closed: "bg-zinc-100 text-zinc-700 border border-zinc-200",
  }[s] || "bg-zinc-100";
}
