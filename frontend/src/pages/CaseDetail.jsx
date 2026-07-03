import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import SLABadge from "@/components/SLABadge";
import { fmtRelative, fmtDateTime, priorityClass, statusClass } from "@/lib/format";
import { CaretLeft, Sparkle, BookOpenText, ChatCircle, ClockClockwise, User } from "@phosphor-icons/react";

export default function CaseDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [note, setNote] = useState("");

  useEffect(() => { load(); api.get("/users").then(r => setUsers(r.data)); /* eslint-disable-next-line */ }, [id]);

  async function load() {
    const { data } = await api.get(`/cases/${id}`);
    setData(data);
  }

  const update = async (payload) => {
    await api.patch(`/cases/${id}`, payload);
    await load();
    toast.success("Case updated");
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await api.post(`/cases/${id}/notes`, { body: note });
    setNote("");
    await load();
    toast.success("Note added");
  };

  const applyMacro = (m) => { setNote((n) => (n ? n + "\n\n" : "") + m.body); toast.info(`Macro "${m.name}" inserted`); };

  if (!data) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;
  const { case: c, customer, past_cases, events, macro_suggestions, knowledge_suggestions } = data;

  return (
    <div className="p-6 lg:p-8">
      <Link to="/inbox" className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 mb-4" data-testid="back-to-inbox">
        <CaretLeft size={12} /> Back to line-up
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Center + left */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-zinc-200 p-5 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight" data-testid="case-subject">{c.subject}</h1>
                <div className="flex gap-2 mt-3 flex-wrap items-center">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 ${priorityClass(c.priority)}`}>{c.priority.toUpperCase()}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 ${statusClass(c.status)}`}>{c.status}</span>
                  <SLABadge due={c.sla_due_at} status={c.sla_status} />
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200">{c.channel}</span>
                  {c.tags?.map(t => <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-50 text-zinc-500 border border-zinc-200">#{t}</span>)}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <select
                  data-testid="case-status-select"
                  value={c.status} onChange={(e) => update({ status: e.target.value })}
                  className="border border-zinc-300 px-2 py-1.5 text-xs bg-white"
                >
                  {["open", "pending", "solved", "closed"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  data-testid="case-assignee-select"
                  value={c.assigned_user_id || ""} onChange={(e) => update({ assigned_user_id: e.target.value || null })}
                  className="border border-zinc-300 px-2 py-1.5 text-xs bg-white"
                >
                  <option value="">Unassigned</option>
                  {users.filter(u => u.role === "agent" || u.role === "lead").map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* AI classification */}
            {(c.ai_topic || c.ai_intent) && (
              <div className="mt-4 p-3 border border-blue-200 bg-blue-50/50 text-xs">
                <div className="flex items-center gap-2 text-blue-800 font-semibold uppercase tracking-widest text-[10px] mb-2">
                  <Sparkle size={12} weight="fill" /> AI Read of the Play
                </div>
                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div><div className="text-blue-800/60">Topic</div><div className="text-blue-900 font-medium">{c.ai_topic || "—"}</div></div>
                  <div><div className="text-blue-800/60">Intent</div><div className="text-blue-900 font-medium">{c.ai_intent || "—"}</div></div>
                  <div><div className="text-blue-800/60">Risk</div><div className="text-blue-900 font-medium">{c.ai_risk || "—"}</div></div>
                </div>
                {c.ai_summary && <div className="mt-2 text-blue-900 leading-relaxed">{c.ai_summary}</div>}
              </div>
            )}

            <div className="mt-5 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap" data-testid="case-description">{c.description}</div>
          </div>

          {/* Macro suggestions */}
          <div className="border border-zinc-200 bg-white">
            <div className="px-4 py-3 border-b border-zinc-200 flex items-center gap-2">
              <ChatCircle size={16} />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Suggested Macros (Set Pieces)</span>
            </div>
            <div className="divide-y divide-zinc-100">
              {macro_suggestions.map(m => (
                <div key={m.id} className="p-4 hover:bg-zinc-50 transition-colors">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{m.name}</div>
                      <div className="text-xs text-zinc-600 mt-1 line-clamp-2">{m.body}</div>
                    </div>
                    <button
                      data-testid={`use-macro-${m.id}`}
                      onClick={() => applyMacro(m)}
                      className="bg-white border border-zinc-300 px-3 py-1.5 text-xs hover:border-zinc-900 transition-colors"
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reply / note */}
          <div className="border border-zinc-200 bg-white p-4">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-2">Reply / Internal Note</div>
            <textarea
              data-testid="note-textarea"
              value={note} onChange={(e) => setNote(e.target.value)} rows={5}
              placeholder="Type a reply, or use a macro suggestion…"
              className="w-full border border-zinc-300 p-2.5 text-sm font-mono focus:outline-none focus:border-[#002FA7]"
            />
            <div className="flex justify-end mt-3">
              <button data-testid="add-note-btn" onClick={addNote} className="bg-[#002FA7] text-white px-4 py-2 text-sm hover:bg-[#00227A] transition-colors">
                Post & log first response
              </button>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          {/* Customer */}
          {customer && (
            <div className="border border-zinc-200 bg-white p-4">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-3 flex items-center gap-1"><User size={12} /> Customer</div>
              <div className="font-medium">{customer.name}</div>
              <div className="text-xs text-zinc-500 font-mono">{customer.email}</div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${customer.segment === "vip" ? "bg-[#002FA7] text-white border-[#002FA7]" : "bg-zinc-50 text-zinc-700 border-zinc-200"}`}>
                  {customer.segment.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-50 border border-zinc-200 text-zinc-700">RISK: {customer.risk_level}</span>
                {customer.tags?.map(t => <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-50 border border-zinc-200 text-zinc-500">#{t}</span>)}
              </div>
              {past_cases?.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Past plays ({past_cases.length})</div>
                  <ul className="space-y-1.5">
                    {past_cases.slice(0, 4).map(p => (
                      <li key={p.id}>
                        <Link to={`/cases/${p.id}`} className="text-xs text-zinc-700 hover:text-[#002FA7] block truncate">
                          <span className="font-mono text-zinc-400 mr-1">{fmtRelative(p.created_at)}</span>
                          {p.subject}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Knowledge */}
          <div className="border border-zinc-200 bg-white">
            <div className="px-4 py-3 border-b border-zinc-200 flex items-center gap-2">
              <BookOpenText size={14} />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Playbook (Knowledge)</span>
            </div>
            <div className="divide-y divide-zinc-100">
              {knowledge_suggestions.map(k => (
                <div key={k.id} className="p-3 hover:bg-zinc-50 transition-colors">
                  <div className="text-sm font-medium">{k.title}</div>
                  <div className="text-xs text-zinc-600 mt-1 line-clamp-2">{k.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Event timeline */}
          <div className="border border-zinc-200 bg-white">
            <div className="px-4 py-3 border-b border-zinc-200 flex items-center gap-2">
              <ClockClockwise size={14} />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Match Timeline</span>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {events.map(ev => (
                <div key={ev.id} className="text-xs border-l-2 border-zinc-200 pl-3">
                  <div className="font-mono text-zinc-400">{fmtDateTime(ev.created_at)}</div>
                  <div className="font-medium text-zinc-900 uppercase tracking-widest text-[10px] mt-0.5">{ev.event_type.replace(/_/g, " ")}</div>
                  {ev.payload?.body && <div className="mt-1 text-zinc-700 whitespace-pre-wrap">{ev.payload.body}</div>}
                  {ev.event_type === "ai_classification" && (
                    <div className="mt-1 text-zinc-600 font-mono">topic={ev.payload.topic} · intent={ev.payload.intent} · risk={ev.payload.risk}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
