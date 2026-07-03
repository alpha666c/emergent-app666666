import { fmtRelative } from "@/lib/format";
import { slaBadgeClass } from "@/lib/format";

export default function SLABadge({ due, status, size = "md" }) {
  const rel = fmtRelative(due);
  const label = status === "breached" ? `BREACHED ${rel}` : status === "at_risk" ? `AT RISK ${rel}` : rel;
  const sz = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  return (
    <span
      data-testid="sla-badge"
      className={`inline-block font-mono ${sz} ${slaBadgeClass(status)}`}
    >
      {label}
    </span>
  );
}
