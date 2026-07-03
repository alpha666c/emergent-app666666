import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Chip, { SLAChip } from "@/components/Chip";
import CasePanel from "@/components/CasePanel";
import { ListSkeleton } from "@/components/Skeleton";
import { fmtRelative } from "@/lib/format";
import { Funnel, X } from "@phosphor-icons/react";

const FILTERS = {
  status: ["", "open", "pending", "solved"],
  priority: ["", "low", "medium", "high", "critical"],
  channel: ["", "chat", "email", "phone", "other"],
};

export default function Inbox() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [f, setF] = useState({
    status: params.get("status") || "open",
    priority: params.get("priority") || "",
    channel: params.get("channel") || "",
    mine_only: user?.role === "agent",
    q: params.get("q") || "",
  });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [f.status, f.priority, f.channel, f.mine_only]);
  useEffect(() => { api.get("/dashboard/agent").then(r => setDash(r.data)); }, []);

  async function load() {
    setLoading(true);
    const p = { limit: 200 };
    if (f.status) p.status = f.status;
    if (f.priority) p.priority = f.priority;
    if (f.channel) p.channel = f.channel;
    if (f.mine_only) p.mine_only = true;
    const { data } = await api.get("/cases", { params: p });
    setCases(data);
    // Auto-select first on load if none selected
    if (!selected && data[0]) setSelected(data[0].id);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!f.q.trim()) return cases;
    const q = f.q.toLowerCase();
    return cases.filter(c =>
      c.subject.toLowerCase().includes(q) ||
      (c.ai_topic || "").toLowerCase().includes(q) ||
      (c.tags || []).join(" ").toLowerCase().includes(q)
    );
  }, [cases, f.q]);

  const activePills = [];
  if (f.status) activePills.push({ k: "status", v: f.status });
  if (f.priority) activePills.push({ k: "priority", v: f.priority });
  if (f.channel) activePills.push({ k: "channel", v: f.channel });
  if (f.mine_only) activePills.push({ k: "mine_only", v: "mine only" });

  const clearFilter = (k) => { setF({ ...f, [k]: k === "mine_only" ? false : "" }); setParams({}); };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* CENTER: Case list */}
      <section className="w-full md:w-[420px] xl:w-[440px] shrink-0 border-r border-zinc-200 flex flex-col bg-white">
        {/* KPI strip */}
        {dash && (
          <div className="grid grid-cols-4 border-b border-zinc-200 text-center">
            {[
              ["Open", dash.my_open, ""],
              ["At risk", dash.my_at_risk, dash.my_at_risk > 0 ? "text-red-600" : ""],
              ["Unassigned", dash.unassigned_available, ""],
              ["Solved 24h", dash.solved_last_24h, "text-green-700"],
            ].map(([l, v, cls], i) => (
              <div key={l} className={`py-2.5 ${i > 0 ? "border-l border-zinc-200" : ""}`} data-testid={`stat-${l.toLowerCase().replace(/\s/g, "-")}`}>
                <div className={`font-mono text-lg font-medium ${cls}`}>{v}</div>
                <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold">{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="border-b border-zinc-200 px-3 py-2 bg-zinc-50">
          <div className="flex items-center gap-2 flex-wrap">
            <Funnel size={12} className="text-zinc-400" />
            {Object.entries(FILTERS).map(([key, opts]) => (
              <select key={key} data-testid={`filter-${key}`} value={f[key]}
                onChange={(e) => setF({ ...f, [key]: e.target.value })}
                className="border border-zinc-200 px-1.5 py-0.5 text-[11px] bg-white hover:border-zinc-400 focus:outline-none focus:border-[#002FA7] transition-colors">
                {opts.map(o => <option key={o} value={o}>{o ? o : `Any ${key}`}</option>)}
              </select>
            ))}
            {user?.role === "agent" && (
              <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                <input type="checkbox" data-testid="filter-mine-only"
                  checked={f.mine_only} onChange={(e) => setF({ ...f, mine_only: e.target.checked })} />
                Mine only
              </label>
            )}
          </div>
          <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })}
            placeholder="Search in list…" data-testid="inline-search"
            className="mt-2 w-full border border-zinc-200 px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#002FA7]" />

          {activePills.length > 0 && (
            <div className="mt-2 flex gap-1 flex-wrap">
              {activePills.map(p => (
                <button key={p.k + p.v} onClick={() => clearFilter(p.k)}
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 bg-white border border-zinc-200 hover:border-zinc-900 transition-colors">
                  {p.v} <X size={9} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto" data-testid="cases-list">
          {loading ? <ListSkeleton rows={10} /> : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-sm">No cases match your filters.</div>
          ) : filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              data-testid={`case-row-${c.id}`}
              className={`w-full text-left border-b border-zinc-100 px-3 py-2.5 transition-colors group ${
                selected === c.id ? "bg-blue-50/60 border-l-2 border-l-[#002FA7] pl-[10px]" : "border-l-2 border-l-transparent hover:bg-zinc-50 pl-[10px]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Chip kind="priority" value={c.priority} size="xs" />
                    {c.tags?.includes("incident") && <Chip kind="incident" size="xs">INC</Chip>}
                    <span className="text-[10px] text-zinc-400 font-mono ml-auto">{fmtRelative(c.created_at)}</span>
                  </div>
                  <div className={`text-sm truncate ${selected === c.id ? "text-zinc-900 font-medium" : "text-zinc-800"}`}>{c.subject}</div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <SLAChip due={c.sla_due_at} status={c.sla_status} size="xs" />
                    {c.ai_topic && <span className="text-[10px] font-mono text-zinc-500 truncate">· {c.ai_topic}</span>}
                    {c.ai_risk && c.ai_risk !== "low" && <Chip kind="risk" value={c.ai_risk} size="xs">{c.ai_risk}</Chip>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* RIGHT: Case detail */}
      <section className="flex-1 min-w-0 hidden md:block bg-zinc-50/40">
        <CasePanel caseId={selected} onUpdate={load} showOpenLink />
      </section>
    </div>
  );
}
