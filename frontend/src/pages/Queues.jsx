import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";

export default function Queues() {
  const [queues, setQueues] = useState([]);
  useEffect(() => { api.get("/queues").then(r => setQueues(r.data)); }, []);
  return (
    <div className="p-6 lg:p-8">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Coach view</p>
      <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Queue Board</h1>
      <p className="text-sm text-zinc-500 mt-1">Which formations are under pressure?</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0 border border-zinc-200 mt-6" data-testid="queues-grid">
        {queues.map((q, i) => (
          <div key={q.id} className={`p-5 hover:bg-zinc-50 transition-colors ${i % 3 !== 0 ? "md:border-l" : ""} border-zinc-200 ${i >= 3 ? "border-t" : ""}`} data-testid={`queue-card-${q.id}`}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="font-display font-bold text-lg tracking-tight truncate">{q.name}</div>
                <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{q.description}</div>
              </div>
              {q.at_risk_count > 0 && (
                <span className="text-[10px] font-mono bg-red-600 text-white px-1.5 py-0.5">{q.at_risk_count} AT RISK</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-5">
              <div><div className="text-[10px] uppercase tracking-widest text-zinc-500">Open</div><div className="font-mono text-2xl">{q.open_count}</div></div>
              <div><div className="text-[10px] uppercase tracking-widest text-zinc-500">Pending</div><div className="font-mono text-2xl">{q.pending_count}</div></div>
              <div><div className="text-[10px] uppercase tracking-widest text-zinc-500">FR SLA</div><div className="font-mono text-2xl">{q.sla_profile?.first_response_minutes}m</div></div>
            </div>
            <Link to={`/inbox`} state={{ queue_id: q.id }} className="mt-4 inline-block text-xs text-[#002FA7] hover:underline">Work queue →</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
