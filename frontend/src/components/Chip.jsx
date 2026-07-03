import { slaBadgeClass, priorityClass, statusClass } from "@/lib/format";
import { fmtRelative } from "@/lib/format";

const SIZE = {
  xs: "text-[9px] px-1 py-0",
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
};

const KIND = {
  sla: (v) => slaBadgeClass(v),
  priority: (v) => priorityClass(v),
  status: (v) => statusClass(v),
  risk: (v) => ({
    high: "bg-red-50 border border-red-200 text-red-700",
    medium: "bg-amber-50 border border-amber-200 text-amber-800",
    low: "bg-zinc-50 border border-zinc-200 text-zinc-600",
  }[v] || "bg-zinc-50 border border-zinc-200 text-zinc-600"),
  neutral: () => "bg-zinc-100 border border-zinc-200 text-zinc-700",
  tag: () => "bg-zinc-50 border border-zinc-200 text-zinc-500",
  vip: () => "bg-[#002FA7] text-white border border-[#002FA7]",
  info: () => "bg-blue-50 border border-blue-200 text-blue-700",
  incident: () => "bg-red-600 text-white",
};

export default function Chip({ kind = "neutral", value, size = "sm", children, className = "", testId }) {
  const cls = (KIND[kind] || KIND.neutral)(value);
  return (
    <span data-testid={testId} className={`inline-flex items-center gap-1 font-mono uppercase tracking-wide ${SIZE[size]} ${cls} ${className}`}>
      {children ?? String(value ?? "").toUpperCase()}
    </span>
  );
}

export function SLAChip({ due, status, size = "sm" }) {
  const rel = fmtRelative(due);
  const label = status === "breached" ? `BREACHED ${rel}` : status === "at_risk" ? `AT-RISK ${rel}` : rel;
  return (
    <span data-testid="sla-chip" className={`inline-flex items-center gap-1 font-mono uppercase tracking-wide ${SIZE[size]} ${slaBadgeClass(status)}`}>
      {label}
    </span>
  );
}
