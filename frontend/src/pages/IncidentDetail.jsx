import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import SLABadge from "@/components/SLABadge";
import { CaretLeft, Trophy } from "@phosphor-icons/react";

const STATUSES = [["investigating", "Investigating"], ["mitigating", "Mitigating"], ["resolved", "Resolved"]];

export default function IncidentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [note, setNote] = useState("");

  const load = () => api.get(`/incidents/${id}`).then(r => setData(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const update = async (payload) => {
    await api.patch(`/incidents/${id}`, payload);
    setNote("");
    await load();
    toast.success("Incident updated");
  };

  if (!data) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;
  const { incident, cases } = data;

  return (
    <div className="p-6 lg:p-8">
      <Link to="/war-room" className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 mb-4" data-testid="back-to-war-room">
        <CaretLeft size={12} /> Back to war-room
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 ${incident.severity === "sev1" ? "bg-red-600 text-white" : incident.severity === "sev2" ? "bg-amber-500 text-white" : "bg-zinc-200 text-zinc-800"}`}>{incident.severity.toUpperCase()}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${incident.status === "resolved" ? "border-green-200 bg-green-50 text-green-700" : incident.status === "mitigating" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`}>{incident.status.toUpperCase()}</span>
              <span className="text-xs text-zinc-500 font-mono">Declared {fmtRelative(incident.created_at)} ago</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight" data-testid="incident-title">{incident.title}</h1>
            <p className="text-sm text-zinc-700 mt-3 leading-relaxed">{incident.description}</p>

            <div className="mt-5 flex gap-2 flex-wrap">
              {STATUSES.map(([s, l]) => (
                <button
                  key={s}
                  data-testid={`set-status-${s}`}
                  onClick={() => update({ status: s })}
                  disabled={incident.status === s}
                  className="text-xs border border-zinc-300 px-3 py-1.5 hover:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-400 transition-colors"
                >
                  → {l}
                </button>
              ))}
            </div>

            {incident.match_report && (
              <div className="mt-6 border-t-2 border-zinc-200 pt-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">
                  <Trophy size={14} weight="fill" className="text-amber-500" /> Match Report (AI post-mortem)
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed font-mono bg-zinc-50 border border-zinc-200 p-4">{incident.match_report}</div>
              </div>
            )}
          </div>

          {/* Broadcast + Note */}
          <div className="border border-zinc-200 bg-white p-4">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-2">Timeline note / broadcast</div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Add a decision, mitigation step, or comms broadcast log…"
              data-testid="incident-note" className="w-full border border-zinc-300 p-2.5 text-sm focus:outline-none focus:border-[#002FA7]"/>
            <div className="flex justify-end mt-3">
              <button disabled={!note.trim()} onClick={() => update({ note })} data-testid="add-timeline-note"
                className="bg-[#002FA7] text-white px-4 py-2 text-sm hover:bg-[#00227A] transition-colors disabled:opacity-50">Log entry</button>
            </div>
          </div>

          {/* Linked cases */}
          <div className="border border-zinc-200 bg-white">
            <div className="px-4 py-3 border-b border-zinc-200 text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Linked Plays ({cases.length})</div>
            <table className="w-full text-sm">
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-2.5"><Link to={`/cases/${c.id}`} className="text-zinc-900 hover:text-[#002FA7]">{c.subject}</Link></td>
                    <td className="px-4 py-2.5"><SLABadge due={c.sla_due_at} status={c.sla_status} size="sm" /></td>
                    <td className="px-4 py-2.5 text-xs font-mono text-zinc-500 text-right">{fmtRelative(c.created_at)}</td>
                  </tr>
                ))}
                {cases.length === 0 && <tr><td className="p-4 text-center text-zinc-400 text-sm">No cases linked yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Timeline */}
        <aside>
          <div className="border border-zinc-200 bg-white">
            <div className="px-4 py-3 border-b border-zinc-200 text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Match Timeline</div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {incident.timeline?.slice().reverse().map((t, i) => (
                <div key={i} className="border-l-2 border-zinc-200 pl-3 text-xs" data-testid={`timeline-entry-${i}`}>
                  <div className="font-mono text-zinc-400">{fmtDateTime(t.ts)}</div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-900 font-semibold mt-0.5">{t.actor}</div>
                  <div className="text-zinc-700 mt-1 whitespace-pre-wrap">{t.note}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
