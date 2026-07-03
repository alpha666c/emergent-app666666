import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import api from "@/lib/api";

export default function OpsDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dashboard/ops").then(r => setD(r.data)); }, []);
  if (!d) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  const kpi = [
    ["Open", d.totals.open, ""],
    ["Breached", d.totals.breached, d.totals.breached > 0 ? "text-red-600" : ""],
    ["SLA Adherence", `${d.totals.sla_adherence_pct}%`, d.totals.sla_adherence_pct >= 90 ? "text-green-700" : "text-amber-600"],
    ["Escalations", d.totals.escalations, ""],
    ["Reopens", d.totals.reopens, ""],
    ["VIP Open", d.totals.vip_open, ""],
    ["VIP Breached", d.totals.vip_breached, d.totals.vip_breached > 0 ? "text-red-600" : ""],
  ];

  return (
    <div className="p-6 lg:p-8">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Ops / Leadership</p>
      <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Analyst Booth</h1>
      <p className="text-sm text-zinc-500 mt-1">Season-view of the support operation.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-0 border border-zinc-200 mt-6" data-testid="ops-kpis">
        {kpi.map(([label, val, cls], i) => (
          <div key={label} className={`p-4 ${i > 0 ? "md:border-l border-zinc-200" : ""} ${i >= 4 ? "border-t md:border-t-0 lg:border-t-0" : ""}`}>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{label}</div>
            <div className={`font-mono text-2xl mt-2 font-medium ${cls}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="border border-zinc-200 bg-white p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">Backlog Trend — 7d</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={d.backlog_trend}>
              <CartesianGrid strokeDasharray="1 3" stroke="#e4e4e7" />
              <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid #e4e4e7" }} />
              <Line type="linear" dataKey="opened" stroke="#002FA7" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="linear" dataKey="solved" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 flex gap-4 text-xs text-zinc-600">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-[#002FA7]"/> Opened</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-green-600"/> Solved</span>
          </div>
        </div>

        <div className="border border-zinc-200 bg-white p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">Topics — Distribution</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.topics} layout="vertical">
              <CartesianGrid strokeDasharray="1 3" stroke="#e4e4e7" />
              <XAxis type="number" stroke="#71717a" fontSize={11} />
              <YAxis dataKey="topic" type="category" stroke="#71717a" fontSize={11} width={90} />
              <Tooltip contentStyle={{ borderRadius: 0, border: "1px solid #e4e4e7" }} />
              <Bar dataKey="count" fill="#002FA7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
