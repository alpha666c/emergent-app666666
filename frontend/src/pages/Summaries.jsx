import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { Trophy } from "@phosphor-icons/react";

export default function Summaries() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const load = () => api.get("/summaries").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);
  const gen = async () => {
    setBusy(true);
    try {
      await api.post("/summaries/generate");
      toast.success("Match report generated");
      load();
    } finally { setBusy(false); }
  };
  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Ops</p>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
            <Trophy size={24} weight="fill" className="text-amber-500" /> Match Reports
          </h1>
          <p className="text-sm text-zinc-500 mt-1">AI-generated weekly summaries and post-game analysis.</p>
        </div>
        <button onClick={gen} disabled={busy} data-testid="gen-summary-btn" className="bg-[#002FA7] text-white px-4 py-2 text-sm disabled:opacity-50">{busy ? "Generating…" : "Generate now"}</button>
      </div>
      <div className="mt-8 space-y-4">
        {items.map(s => (
          <div key={s.id} className="border border-zinc-200 bg-white p-5" data-testid={`summary-${s.id}`}>
            <div className="text-xs text-zinc-500 font-mono">{fmtDateTime(s.period_start)} — {fmtDateTime(s.period_end)}</div>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{s.body}</div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-zinc-500 border border-dashed border-zinc-300 p-8 text-center">No reports yet. Click Generate now.</div>}
      </div>
    </div>
  );
}
