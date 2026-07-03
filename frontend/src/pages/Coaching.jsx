import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmtDateTime, fmtRelative } from "@/lib/format";

const THEMES = ["tone", "accuracy", "policy", "empathy", "efficiency"];

export default function Coaching() {
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ agent_id: "", themes: [], notes: "" });
  const [showForm, setShowForm] = useState(false);

  const load = () => api.get("/coaching").then(r => setSessions(r.data));
  useEffect(() => { load(); api.get("/users").then(r => setUsers(r.data.filter(u => u.role === "agent"))); }, []);

  const create = async () => {
    if (!form.agent_id || !form.notes) { toast.error("Agent + notes required"); return; }
    await api.post("/coaching", form);
    setForm({ agent_id: "", themes: [], notes: "" });
    setShowForm(false);
    load();
    toast.success("Coaching session created");
  };

  const close = async (id) => { await api.patch(`/coaching/${id}/close`); load(); };

  const toggleTheme = (t) => setForm(f => ({ ...f, themes: f.themes.includes(t) ? f.themes.filter(x => x !== t) : [...f.themes, t] }));

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Coach view</p>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Coaching Board</h1>
          <p className="text-sm text-zinc-500 mt-1">1:1 sessions, themes, and follow-ups.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} data-testid="new-coaching-btn" className="bg-[#002FA7] text-white px-4 py-2 text-sm hover:bg-[#00227A] transition-colors">New session</button>
      </div>

      {showForm && (
        <div className="mt-6 border border-zinc-200 bg-white p-4 space-y-3">
          <select value={form.agent_id} onChange={e => setForm({...form, agent_id: e.target.value})} className="w-full border border-zinc-300 px-3 py-2 text-sm" data-testid="coaching-agent">
            <option value="">Select agent…</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <div className="flex gap-2 flex-wrap">
            {THEMES.map(t => (
              <button key={t} onClick={() => toggleTheme(t)} className={`text-xs px-3 py-1 border ${form.themes.includes(t) ? "bg-[#002FA7] text-white border-[#002FA7]" : "border-zinc-300 hover:border-zinc-900"} transition-colors`}>
                {t}
              </button>
            ))}
          </div>
          <textarea rows={4} placeholder="Notes and action items…" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
            className="w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#002FA7]" data-testid="coaching-notes" />
          <button onClick={create} data-testid="save-coaching" className="bg-[#002FA7] text-white px-4 py-2 text-sm">Save session</button>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {sessions.map(s => (
          <div key={s.id} className="border border-zinc-200 bg-white p-4" data-testid={`coaching-${s.id}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{s.agent?.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">Created {fmtRelative(s.created_at)} · Follow-up {s.follow_up_at ? fmtDateTime(s.follow_up_at) : "—"}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 ${s.status === "open" ? "bg-blue-50 border border-blue-200 text-blue-700" : "bg-zinc-100 text-zinc-600"}`}>{s.status}</span>
                {s.status === "open" && <button onClick={() => close(s.id)} className="text-xs border border-zinc-300 px-2 py-1 hover:border-zinc-900">Close</button>}
              </div>
            </div>
            <div className="mt-2 flex gap-1.5 flex-wrap">{s.themes?.map(t => <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-100 border border-zinc-200">{t}</span>)}</div>
            <div className="text-sm text-zinc-700 mt-2 whitespace-pre-wrap">{s.notes}</div>
          </div>
        ))}
        {sessions.length === 0 && <div className="text-sm text-zinc-500 border border-dashed border-zinc-300 p-8 text-center">No coaching sessions yet.</div>}
      </div>
    </div>
  );
}
