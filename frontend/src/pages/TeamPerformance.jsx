import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function TeamPerformance() {
  const [dash, setDash] = useState(null);
  useEffect(() => { api.get("/dashboard/manager").then(r => setDash(r.data)); }, []);
  if (!dash) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;

  return (
    <div className="p-6 lg:p-8">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Coach view</p>
      <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Team Performance</h1>
      <p className="text-sm text-zinc-500 mt-1">Player stats. Who's on form? Who needs a sub?</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-zinc-200 mt-6">
        {[["Open", dash.totals.open], ["Breached", dash.totals.breached], ["At Risk", dash.totals.at_risk], ["Solved (7d)", dash.totals.solved_week]].map(([l, v], i) => (
          <div key={l} className={`p-4 ${i > 0 ? "border-l border-zinc-200" : ""}`}>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{l}</div>
            <div className="font-mono text-3xl mt-2">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-200 text-[10px] uppercase tracking-widest text-zinc-500">
              <th className="text-left px-4 py-3 font-semibold">Player</th>
              <th className="text-right px-4 py-3 font-semibold">Open</th>
              <th className="text-right px-4 py-3 font-semibold">Handled</th>
              <th className="text-right px-4 py-3 font-semibold">Solved</th>
              <th className="text-right px-4 py-3 font-semibold">Avg FRT (min)</th>
              <th className="text-right px-4 py-3 font-semibold">Avg Res (min)</th>
              <th className="text-right px-4 py-3 font-semibold">Reopen %</th>
            </tr>
          </thead>
          <tbody>
            {dash.agents.map(a => (
              <tr key={a.user_id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {a.avatar_url ? <img src={a.avatar_url} className="w-6 h-6 object-cover" alt="" /> : <div className="w-6 h-6 bg-zinc-900 text-white text-[10px] flex items-center justify-center">{a.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>}
                    <span className="font-medium">{a.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">{a.open}</td>
                <td className="px-4 py-3 text-right font-mono">{a.handled}</td>
                <td className="px-4 py-3 text-right font-mono">{a.solved}</td>
                <td className="px-4 py-3 text-right font-mono">{a.avg_first_response_min}</td>
                <td className="px-4 py-3 text-right font-mono">{a.avg_resolution_min}</td>
                <td className={`px-4 py-3 text-right font-mono ${a.reopen_rate > 10 ? "text-red-600" : ""}`}>{a.reopen_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
