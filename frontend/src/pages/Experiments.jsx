import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function Experiments() {
  const [exps, setExps] = useState([]);
  const [form, setForm] = useState({ name: "", hypothesis: "", tag: "" });
  const [showForm, setShowForm] = useState(false);
  const load = () => api.get("/experiments").then(r => setExps(r.data));
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!form.name || !form.tag) return;
    await api.post("/experiments", form);
    setForm({ name: "", hypothesis: "", tag: "" });
    setShowForm(false); load();
    toast.success("Experiment started");
  };
  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Ops / Analyst</p>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Playbooks & Experiments</h1>
          <p className="text-sm text-zinc-500 mt-1">Test new routing rules and macros. Measure what moves the needle.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} data-testid="new-experiment-btn" className="bg-[#002FA7] text-white px-4 py-2 text-sm">New experiment</button>
      </div>
      {showForm && (
        <div className="mt-6 border border-zinc-200 bg-white p-4 space-y-3">
          <input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-zinc-300 px-3 py-2 text-sm" />
          <input placeholder="Hypothesis" value={form.hypothesis} onChange={e => setForm({...form, hypothesis: e.target.value})} className="w-full border border-zinc-300 px-3 py-2 text-sm" />
          <input placeholder="Case tag (e.g. exp_new_kyc_flow)" value={form.tag} onChange={e => setForm({...form, tag: e.target.value})} className="w-full border border-zinc-300 px-3 py-2 text-sm font-mono" />
          <button onClick={create} className="bg-[#002FA7] text-white px-4 py-2 text-sm">Start</button>
        </div>
      )}
      <div className="mt-8 space-y-4">
        {exps.map(e => (
          <div key={e.id} className="border border-zinc-200 bg-white p-5" data-testid={`experiment-${e.id}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="font-display font-bold text-lg tracking-tight">{e.name}</div>
                <div className="text-sm text-zinc-600 mt-1">{e.hypothesis}</div>
                <div className="mt-2 text-xs font-mono text-zinc-500">tag: {e.tag}</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700">{e.status.toUpperCase()}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
              <div className="border border-zinc-200 p-3">
                <div className="uppercase tracking-widest text-zinc-500">Baseline FRT</div>
                <div className="font-mono text-2xl mt-1">{e.baseline?.avg_first_response_min || "—"}<span className="text-xs text-zinc-400 ml-1">min</span></div>
              </div>
              <div className="border border-zinc-200 p-3">
                <div className="uppercase tracking-widest text-zinc-500">Current FRT</div>
                <div className="font-mono text-2xl mt-1">{e.current_avg_first_response_min}<span className="text-xs text-zinc-400 ml-1">min</span></div>
              </div>
              <div className="border border-zinc-200 p-3">
                <div className="uppercase tracking-widest text-zinc-500">Cases tagged</div>
                <div className="font-mono text-2xl mt-1">{e.case_count}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
