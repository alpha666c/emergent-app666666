import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { fmtRelative, fmtDateTime } from "@/lib/format";
import Chip, { SLAChip } from "@/components/Chip";
import { DetailSkeleton } from "@/components/Skeleton";
import {
  Sparkle, BookOpenText, ChatCircle, ClockClockwise, User as UserIcon, Warning,
  ArrowSquareOut, Paperclip, Lightning, PaperPlaneRight,
} from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

/**
 * CasePanel — the case-detail body. Used both by the /cases/:id route
 * and by the Inbox split view. Preserves all existing API interactions.
 */
export default function CasePanel({ caseId, onUpdate, showOpenLink = false, compact = false }) {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [note, setNote] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setData(null); setNote(""); setConfirmSend(false);
    if (!caseId) return;
    load();
    api.get("/users").then(r => setUsers(r.data));
    // eslint-disable-next-line
  }, [caseId]);

  async function load() {
    const { data } = await api.get(`/cases/${caseId}`);
    setData(data);
  }

  const update = async (payload) => {
    await api.patch(`/cases/${caseId}`, payload);
    await load();
    onUpdate?.();
    toast.success("Case updated");
  };

  const addNote = async () => {
    if (!note.trim()) return;
    if (confirmSend) { setConfirmOpen(true); return; }
    await doPost();
  };

  const doPost = async () => {
    setPosting(true);
    try {
      await api.post(`/cases/${caseId}/notes`, { body: note });
      setNote(""); setConfirmSend(false); setConfirmOpen(false);
      await load();
      onUpdate?.();
      toast.success("Note posted");
    } finally { setPosting(false); }
  };

  const generateDraft = async () => {
    setDrafting(true);
    try {
      const { data } = await api.post(`/cases/${caseId}/ai-draft`);
      setNote(data.draft);
      setConfirmSend(!!data.requires_confirmation);
      toast.success(data.requires_confirmation ? "AI draft ready — confirmation required" : "AI draft ready");
    } catch { toast.error("Draft failed"); }
    finally { setDrafting(false); }
  };

  const applyMacro = (m) => {
    setNote((n) => (n ? n + "\n\n" : "") + m.body);
    toast.info(`Macro "${m.name}" inserted`);
  };

  if (!caseId) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center text-zinc-400">
        <div>
          <div className="w-12 h-12 border border-zinc-200 flex items-center justify-center mx-auto mb-3">
            <ChatCircle size={20} className="text-zinc-300" />
          </div>
          <div className="text-sm">Select a case to see the play.</div>
        </div>
      </div>
    );
  }
  if (!data) return <DetailSkeleton />;

  const { case: c, customer, past_cases, events, macro_suggestions, knowledge_suggestions } = data;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white sticky top-0 z-10 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
              <span>Case</span><span className="text-zinc-300">·</span>
              <span className="truncate">{c.id.slice(0, 8)}</span><span className="text-zinc-300">·</span>
              <span>{fmtRelative(c.created_at)} old</span>
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight mt-1 truncate" data-testid="case-subject" title={c.subject}>{c.subject}</h2>
            <div className="flex gap-1.5 mt-2 flex-wrap items-center">
              <Chip kind="priority" value={c.priority} />
              <Chip kind="status" value={c.status} />
              <SLAChip due={c.sla_due_at} status={c.sla_status} />
              <Chip kind="neutral" value={c.channel}>{c.channel}</Chip>
              {c.ai_risk && <Chip kind="risk" value={c.ai_risk}>RISK · {c.ai_risk}</Chip>}
              {c.tags?.includes("incident") && <Chip kind="incident">INCIDENT</Chip>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showOpenLink && (
              <Link to={`/cases/${c.id}`} data-testid="open-full-case" title="Open full page"
                className="border border-zinc-200 p-1.5 hover:border-zinc-900 transition-colors">
                <ArrowSquareOut size={14} />
              </Link>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mt-3">
          <select
            data-testid="case-status-select"
            value={c.status} onChange={(e) => update({ status: e.target.value })}
            className="border border-zinc-200 px-2 py-1 text-xs bg-white hover:border-zinc-400 transition-colors focus:outline-none focus:border-[#002FA7]"
          >
            {["open", "pending", "solved", "closed"].map(s => <option key={s} value={s}>Status: {s}</option>)}
          </select>
          <select
            data-testid="case-assignee-select"
            value={c.assigned_user_id || ""} onChange={(e) => update({ assigned_user_id: e.target.value || null })}
            className="border border-zinc-200 px-2 py-1 text-xs bg-white hover:border-zinc-400 transition-colors focus:outline-none focus:border-[#002FA7]"
          >
            <option value="">Unassigned</option>
            {users.filter(u => u.role === "agent" || u.role === "lead").map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Body */}
      <div className={`grid ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-3"} gap-4 p-5`}>
        <div className={`${compact ? "" : "xl:col-span-2"} space-y-4`}>
          {(c.ai_topic || c.ai_intent) && (
            <div className="border border-blue-200 bg-blue-50/40 p-3">
              <div className="flex items-center gap-2 text-blue-800 font-semibold uppercase tracking-widest text-[10px] mb-2">
                <Sparkle size={12} weight="fill" /> AI Read of the Play
              </div>
              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                <div><div className="text-blue-800/60 uppercase text-[9px] tracking-widest">Topic</div><div className="text-blue-900 font-medium">{c.ai_topic || "—"}</div></div>
                <div><div className="text-blue-800/60 uppercase text-[9px] tracking-widest">Intent</div><div className="text-blue-900 font-medium">{c.ai_intent || "—"}</div></div>
                <div><div className="text-blue-800/60 uppercase text-[9px] tracking-widest">Risk</div><div className="text-blue-900 font-medium">{c.ai_risk || "—"}</div></div>
              </div>
              {c.ai_summary && <div className="mt-2 text-xs text-blue-900 leading-relaxed">{c.ai_summary}</div>}
            </div>
          )}

          <div className="border border-zinc-200 bg-white">
            <div className="px-4 py-2 border-b border-zinc-100 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Conversation</div>
            <div className="p-4">
              <div className="bg-zinc-50 border border-zinc-100 p-3 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap" data-testid="case-description">{c.description}</div>
            </div>
          </div>

          <div className="border border-zinc-200 bg-white">
            <div className="px-4 py-2 border-b border-zinc-100 flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
              <ChatCircle size={12} /> Suggested Macros
            </div>
            <div className="divide-y divide-zinc-100">
              {macro_suggestions.map(m => (
                <div key={m.id} className="p-3 hover:bg-zinc-50 transition-colors">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{m.name}</div>
                      <div className="text-xs text-zinc-600 mt-1 line-clamp-2">{m.body}</div>
                    </div>
                    <button
                      data-testid={`use-macro-${m.id}`}
                      onClick={() => applyMacro(m)}
                      className="bg-white border border-zinc-200 px-3 py-1 text-xs hover:border-zinc-900 transition-colors shrink-0"
                    >Insert</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Composer */}
          <div className="border border-zinc-200 bg-white">
            <div className="px-4 py-2 border-b border-zinc-100 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500">Reply / Internal Note</div>
              <div className="flex items-center gap-1">
                <button
                  data-testid="ai-draft-btn"
                  onClick={generateDraft}
                  disabled={drafting}
                  title="Draft with AI"
                  className="text-xs border border-[#002FA7] text-[#002FA7] px-2.5 py-1 hover:bg-[#002FA7] hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkle size={12} weight="fill" />
                  {drafting ? "Drafting…" : "Draft with AI"}
                </button>
                <button title="Attachments (soon)" disabled className="text-zinc-400 p-1"><Paperclip size={14} /></button>
                <button title="Macros — see suggestions above" disabled className="text-zinc-400 p-1"><Lightning size={14} /></button>
              </div>
            </div>
            <textarea
              data-testid="note-textarea"
              value={note} onChange={(e) => setNote(e.target.value)} rows={5}
              placeholder="Type a reply, click 'Draft with AI', or insert a macro…"
              className="w-full border-0 p-3 text-sm font-mono focus:outline-none resize-y"
            />
            {confirmSend && (
              <div className="mx-3 mb-2 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2" data-testid="confirmation-required">
                <Warning size={14} weight="fill" className="text-amber-600" />
                <span>High-risk topic — confirmation required before send.</span>
              </div>
            )}
            <div className="flex justify-end p-3 border-t border-zinc-100 bg-zinc-50">
              <button
                data-testid="add-note-btn"
                onClick={addNote}
                disabled={!note.trim() || posting}
                className="bg-[#002FA7] text-white px-4 py-2 text-sm hover:bg-[#00227A] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <PaperPlaneRight size={12} weight="fill" />
                {confirmSend ? "Review & confirm" : "Post reply"}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          {customer && (
            <div className="border border-zinc-200 bg-white p-4">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 mb-3 flex items-center gap-1">
                <UserIcon size={12} /> Customer
              </div>
              <div className="font-medium">{customer.name}</div>
              <div className="text-xs text-zinc-500 font-mono">{customer.email}</div>
              <div className="mt-3 flex gap-1.5 flex-wrap">
                <Chip kind={customer.segment === "vip" ? "vip" : "neutral"} value={customer.segment}>{customer.segment.toUpperCase()}</Chip>
                <Chip kind="risk" value={customer.risk_level}>RISK · {customer.risk_level}</Chip>
                {customer.tags?.map(t => <Chip key={t} kind="tag">#{t}</Chip>)}
              </div>
              {past_cases?.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 font-semibold">Past plays ({past_cases.length})</div>
                  <ul className="space-y-1">
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

          <div className="border border-zinc-200 bg-white">
            <div className="px-4 py-2 border-b border-zinc-100 flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
              <BookOpenText size={12} /> Playbook
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

          <div className="border border-zinc-200 bg-white">
            <div className="px-4 py-2 border-b border-zinc-100 flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
              <ClockClockwise size={12} /> Match Timeline
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {events.slice().reverse().map(ev => (
                <div key={ev.id} className="text-xs border-l-2 border-zinc-200 pl-3">
                  <div className="font-mono text-[10px] text-zinc-400">{fmtDateTime(ev.created_at)}</div>
                  <div className="font-medium text-zinc-900 uppercase tracking-widest text-[10px] mt-0.5">{ev.event_type.replace(/_/g, " ")}</div>
                  {ev.payload?.body && <div className="mt-1 text-zinc-700 whitespace-pre-wrap">{ev.payload.body}</div>}
                  {ev.event_type === "ai_classification" && (
                    <div className="mt-1 text-zinc-600 font-mono">
                      {ev.payload?.action === "draft_generated"
                        ? `draft grounded on ${ev.payload?.grounded_kb?.length || 0} KB items`
                        : `topic=${ev.payload.topic} · intent=${ev.payload.intent} · risk=${ev.payload.risk}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* High-risk Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent data-testid="high-risk-confirm-modal" className="max-w-lg rounded-none border border-zinc-200 p-0 gap-0">
          <DialogHeader className="p-5 pb-3 border-b border-zinc-100">
            <div className="w-10 h-10 bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
              <Warning size={20} weight="fill" className="text-amber-600" />
            </div>
            <DialogTitle className="font-display text-xl font-bold tracking-tight">High-Risk Case Confirmation</DialogTitle>
            <DialogDescription className="text-sm text-zinc-600 mt-1.5 leading-relaxed">
              This reply is for a high-risk case (security · funds · KYC). Please review carefully before sending — messages from this queue can move customer money or unlock accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 border-b border-zinc-100">
            <div className="p-3 border-r border-zinc-100">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Topic</div>
              <div className="font-mono text-sm mt-1">{c.ai_topic || "—"}</div>
            </div>
            <div className="p-3 border-r border-zinc-100">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">AI Risk</div>
              <div className={`font-mono text-sm mt-1 ${c.ai_risk === "high" ? "text-red-600 font-medium" : ""}`}>{c.ai_risk || "—"}</div>
            </div>
            <div className="p-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Queue</div>
              <div className="font-mono text-sm mt-1 truncate" title={c.queue_id}>{c.queue_id ? c.queue_id.slice(0, 8) + "…" : "—"}</div>
            </div>
          </div>

          <div className="p-5">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Reply preview</div>
            <div className="border border-zinc-200 bg-zinc-50 p-3 max-h-56 overflow-y-auto text-xs font-mono whitespace-pre-wrap text-zinc-800">{note}</div>
          </div>

          <DialogFooter className="p-4 border-t border-zinc-100 bg-zinc-50 gap-2 sm:justify-end">
            <button data-testid="confirm-cancel" onClick={() => setConfirmOpen(false)}
              className="border border-zinc-300 px-4 py-2 text-sm hover:border-zinc-900 transition-colors">Cancel</button>
            <button data-testid="confirm-send" onClick={doPost} disabled={posting}
              className="bg-[#002FA7] text-white px-4 py-2 text-sm hover:bg-[#00227A] transition-colors disabled:opacity-50 flex items-center gap-2">
              <PaperPlaneRight size={12} weight="fill" />
              {posting ? "Sending…" : "Confirm & Send"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
