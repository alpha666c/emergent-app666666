import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmtRelative } from "@/lib/format";
import { Broadcast, Plus } from "@phosphor-icons/react";

const SEV_STYLE = { sev1: "bg-red-600 text-white", sev2: "bg-amber-500 text-white", sev3: "bg-zinc-200 text-zinc-800" };
const STATUS_STYLE = {
  investigating: "bg-red-50 text-red-700 border border-red-200",
  mitigating: "bg-amber-50 text-amber-800 border border-amber-200",
  resolved: "bg-green-50 text-green-700 border border-green-200",
};

export default function WarRoom() {
  const [incidents, setIncidents] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "sev2" });

  const load = () => api.get("/incidents").then(r => setIncidents(r.data));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title) return;
    await api.post("/incidents", { ...form, linked_case_ids: [] });
    toast.success("Incident declared. War-room open.");
    setShowNew(false); setForm({ title: "", description: "", severity: "sev2" });
    load();
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Coach / Analyst</p>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1 flex items-center gap-3">
            <Broadcast size={28} weight="fill" className="text-red-600" /> Incident War-Room
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Active plays that could change the game.</p>
        </div>
        <button
          data-testid="declare-incident-btn"
          onClick={() => setShowNew(!showNew)}
          className="bg-[#002FA7] text-white px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#00227A] transition-colors"
        >
          <Plus size={14} weight="bold" /> Declare Incident
        </button>
      </div>

      {showNew && (
        <div className="mt-6 border border-zinc-200 bg-white p-4 space-y-3">
          <input placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            className="w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#002FA7]" data-testid="incident-title" />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            rows={3} className="w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#002FA7]" data-testid="incident-description" />
          <div className="flex gap-2 items-center">
            <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}
              className="border border-zinc-300 px-2 py-2 text-sm" data-testid="incident-severity">
              <option value="sev1">Sev1 – Critical</option>
              <option value="sev2">Sev2 – Major</option>
              <option value="sev3">Sev3 – Minor</option>
            </select>
            <button onClick={create} data-testid="create-incident-btn" className="bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700 transition-colors">Declare</button>
          </div>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {incidents.map(inc => (
          <Link
            key={inc.id}
            to={`/incidents/${inc.id}`}
            data-testid={`incident-card-${inc.id}`}
            className="block border border-zinc-200 bg-white p-5 hover:border-zinc-400 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 ${SEV_STYLE[inc.severity]}`}>{inc.severity.toUpperCase()}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 ${STATUS_STYLE[inc.status]}`}>{inc.status.toUpperCase()}</span>
                  <span className="text-xs text-zinc-500 font-mono">{fmtRelative(inc.created_at)} old</span>
                </div>
                <div className="font-display font-bold text-xl tracking-tight mt-2">{inc.title}</div>
                <div className="text-sm text-zinc-600 mt-1 line-clamp-2">{inc.description}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Linked</div>
                <div className="font-mono text-2xl">{inc.linked_case_ids?.length || 0}</div>
              </div>
            </div>
          </Link>
        ))}
        {incidents.length === 0 && <div className="text-sm text-zinc-500 border border-dashed border-zinc-300 p-8 text-center">No active incidents. The pitch is calm.</div>}
      </div>
    </div>
  );
}
