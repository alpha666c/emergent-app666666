import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Trophy, Warning } from "@phosphor-icons/react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const HIGHLIGHTS = [
  ["AI Case Classifier", "Every case is auto-classified for topic, intent, and risk by Claude Sonnet 4.5."],
  ["Smart Routing & SLA", "Auto-routes to queues by topic/segment/risk and to the least-loaded agent. Live SLA countdowns; at-risk & breached states pulse in the UI."],
  ["Incident War-Room", "Declare → mitigate → resolve. On resolve, an AI Match Report writes itself: what happened, impact, lessons learned."],
  ["QA, Coaching & Experiments", "Weekly QA sampling on cron, coaching board with themes, experiments comparing baseline vs live FRT."],
  ["Safety Guardrails", "PII redaction before every LLM call, per-case AI audit log, and a human-confirmation gate for high-risk replies."],
];

export default function HandoffPublic() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/handoff/public/${token}`)
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.status === 410 ? "This snapshot has expired." : "This snapshot is no longer available."));
  }, [token]);

  if (err) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <Warning size={40} weight="fill" className="text-amber-500 mx-auto" />
        <h1 className="font-display text-2xl font-bold tracking-tight mt-4">Snapshot unavailable</h1>
        <p className="text-sm text-zinc-600 mt-2">{err}</p>
        <p className="text-xs text-zinc-400 mt-3 font-mono">token: {token.slice(0, 12)}…</p>
      </div>
    </div>
  );

  if (!data) return <div className="min-h-screen bg-white p-10 text-sm text-zinc-500">Loading snapshot…</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b-2 border-zinc-200">
        <div className="max-w-4xl mx-auto p-6 lg:p-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#002FA7] text-white flex items-center justify-center font-display font-bold">T</div>
            <span className="font-display font-bold tracking-tight">Touchline</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold border-l border-zinc-200 pl-2 ml-1">SupportOps Brain · Public snapshot</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tighter" data-testid="public-company-name">{data.company.name}</h1>
          <p className="text-sm text-zinc-500 mt-2">Read-only executive review — no login required.</p>
          <div className="flex gap-4 text-[10px] uppercase tracking-widest text-zinc-500 font-mono mt-3">
            <span>Generated {new Date(data.generated_at).toLocaleString()}</span>
            {data.expires_at && <span>· Expires {new Date(data.expires_at).toLocaleString()}</span>}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 lg:p-10">
        {/* Counters */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-0 border border-zinc-200" data-testid="public-counters">
          {[["Cases", data.counts.cases], ["Queues", data.counts.queues], ["Users", data.counts.users], ["Incidents", data.counts.incidents], ["Experiments", data.counts.experiments], ["Coaching", data.counts.coaching]].map(([l, v], i) => (
            <div key={l} className={`p-3 ${i > 0 ? "md:border-l border-zinc-200" : ""}`}>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{l}</div>
              <div className="font-mono text-2xl mt-1">{v}</div>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <div className="mt-10">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">What's inside</p>
          <h2 className="font-display text-3xl font-bold tracking-tighter mt-1">A support operations OS.</h2>
          <div className="mt-6 border border-zinc-200 divide-y divide-zinc-200">
            {HIGHLIGHTS.map(([title, desc], i) => (
              <div key={title} className="p-5 flex gap-4">
                <div className="font-mono text-[10px] text-zinc-400 w-6 shrink-0 mt-1">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <div className="font-display text-lg font-bold tracking-tight">{title}</div>
                  <div className="text-sm text-zinc-600 mt-1 leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t-2 border-zinc-200 pt-5 flex items-center gap-2 text-sm text-zinc-500">
          <Trophy size={16} weight="fill" className="text-amber-500" />
          <span>Built to scale from a hundred cases a day to a hundred thousand — designed for crypto, fintech, and SaaS.</span>
        </div>

        <p className="mt-6 text-[10px] uppercase tracking-widest text-zinc-400 font-mono">This is a read-only public snapshot. Individual cases, customer PII, and configuration data are not exposed.</p>
      </div>
    </div>
  );
}
