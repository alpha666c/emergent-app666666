import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import SLABadge from "@/components/SLABadge";
import { fmtRelative, priorityClass, statusClass } from "@/lib/format";
import { Funnel } from "@phosphor-icons/react";

const FILTERS = {
  status: ["", "open", "pending", "solved"],
  priority: ["", "low", "medium", "high", "critical"],
  channel: ["", "chat", "email", "phone", "other"],
};

export default function Inbox() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [dash, setDash] = useState(null);
  const [f, setF] = useState({ status: "open", priority: "", channel: "", mine_only: user?.role === "agent" });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [f]);
  useEffect(() => { api.get("/dashboard/agent").then(r => setDash(r.data)); }, []);

  async function load() {
    setLoading(true);
    const params = { limit: 200 };
    if (f.status) params.status = f.status;
    if (f.priority) params.priority = f.priority;
    if (f.channel) params.channel = f.channel;
    if (f.mine_only) params.mine_only = true;
    const { data } = await api.get("/cases", { params });
    setCases(data);
    setLoading(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Agent Workspace</p>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">The Line-up</h1>
          <p className="text-sm text-zinc-500 mt-1">Your plays for today. Work the SLA, work the case.</p>
        </div>
      </div>

      {dash && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-zinc-200 mb-6">
          {[
            ["My open", dash.my_open, "text-zinc-900"],
            ["At risk", dash.my_at_risk, dash.my_at_risk > 0 ? "text-red-600" : "text-zinc-900"],
            ["Unassigned in queue", dash.unassigned_available, "text-zinc-900"],
            ["Solved (24h)", dash.solved_last_24h, "text-green-700"],
          ].map(([label, val, cls], i) => (
            <div key={label} className={`p-4 ${i > 0 ? "border-l border-zinc-200" : ""}`} data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{label}</div>
              <div className={`font-mono text-3xl mt-2 font-medium ${cls}`}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Funnel size={14} className="text-zinc-400" />
        {Object.entries(FILTERS).map(([key, opts]) => (
          <select
            key={key}
            data-testid={`filter-${key}`}
            value={f[key]}
            onChange={(e) => setF({ ...f, [key]: e.target.value })}
            className="border border-zinc-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-[#002FA7]"
          >
            {opts.map(o => <option key={o} value={o}>{o ? o : `Any ${key}`}</option>)}
          </select>
        ))}
        {user?.role === "agent" && (
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              data-testid="filter-mine-only"
              checked={f.mine_only}
              onChange={(e) => setF({ ...f, mine_only: e.target.checked })}
            />
            Assigned to me only
          </label>
        )}
      </div>

      {/* Table */}
      <div className="border border-zinc-200 bg-white overflow-hidden" data-testid="cases-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-200 text-[10px] uppercase tracking-[0.1em] text-zinc-500">
              <th className="text-left px-3 py-2.5 font-semibold">Subject</th>
              <th className="text-left px-3 py-2.5 font-semibold hidden md:table-cell">Customer</th>
              <th className="text-left px-3 py-2.5 font-semibold">Priority</th>
              <th className="text-left px-3 py-2.5 font-semibold hidden md:table-cell">Status</th>
              <th className="text-left px-3 py-2.5 font-semibold">SLA</th>
              <th className="text-left px-3 py-2.5 font-semibold hidden lg:table-cell">Topic</th>
              <th className="text-right px-3 py-2.5 font-semibold hidden md:table-cell">Age</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-zinc-400 text-sm">Loading…</td></tr>
            ) : cases.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-zinc-400 text-sm">No cases match your filters.</td></tr>
            ) : cases.map(c => (
              <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                <td className="px-3 py-2.5">
                  <Link to={`/cases/${c.id}`} className="text-zinc-900 hover:text-[#002FA7] font-medium" data-testid={`case-link-${c.id}`}>
                    {c.subject}
                  </Link>
                  {c.tags?.includes("incident") && (
                    <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 bg-red-600 text-white">INCIDENT</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-zinc-600 hidden md:table-cell">{c.customer_id?.slice(0, 6)}…</td>
                <td className="px-3 py-2.5"><span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 ${priorityClass(c.priority)}`}>{c.priority.toUpperCase()}</span></td>
                <td className="px-3 py-2.5 hidden md:table-cell"><span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 ${statusClass(c.status)}`}>{c.status}</span></td>
                <td className="px-3 py-2.5"><SLABadge due={c.sla_due_at} status={c.sla_status} size="sm" /></td>
                <td className="px-3 py-2.5 text-zinc-600 hidden lg:table-cell">{c.ai_topic || "—"}</td>
                <td className="px-3 py-2.5 text-right text-zinc-500 font-mono text-xs hidden md:table-cell">{fmtRelative(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
