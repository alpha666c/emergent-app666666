import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import api from "@/lib/api";
import { CaretLeft, Sparkle } from "@phosphor-icons/react";

export default function CaseNew() {
  const nav = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    customer_id: "", subject: "", description: "",
    channel: "email", priority: "medium", tags: "",
  });

  useEffect(() => { api.get("/customers").then(r => { setCustomers(r.data); if (r.data[0]) setForm(f => ({ ...f, customer_id: r.data[0].id })); }); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.description || !form.customer_id) { toast.error("Subject, description and customer are required"); return; }
    setBusy(true);
    try {
      const payload = { ...form, tags: form.tags.split(",").map(s => s.trim()).filter(Boolean) };
      const { data } = await api.post("/cases", payload);
      toast.success("Case created — AI classifier ran");
      nav(`/cases/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create case");
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link to="/inbox" data-testid="back-to-inbox" className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 mb-4">
        <CaretLeft size={12} /> Back to line-up
      </Link>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Create case</p>
      <h1 className="font-display text-3xl font-bold tracking-tight mt-1">New Play</h1>
      <p className="text-sm text-zinc-500 mt-1 flex items-center gap-2">
        <Sparkle size={12} weight="fill" className="text-blue-600" />
        On submit, the AI classifier tags topic/intent/risk and auto-routes to the right queue.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 border border-zinc-200 bg-white p-5" data-testid="case-form">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Customer</label>
          <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}
            data-testid="case-customer" required
            className="mt-1 w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#002FA7]">
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.email} · {c.segment.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Subject</label>
          <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
            data-testid="case-subject-input" required placeholder="Short summary of the issue"
            className="mt-1 w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#002FA7]" />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            data-testid="case-description-input" required rows={5} placeholder="What happened? Include txids, amounts, timestamps if relevant."
            className="mt-1 w-full border border-zinc-300 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#002FA7]" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Channel</label>
            <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}
              data-testid="case-channel"
              className="mt-1 w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#002FA7]">
              {["email", "chat", "phone", "other"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Priority</label>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
              data-testid="case-priority"
              className="mt-1 w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#002FA7]">
              {["low", "medium", "high", "critical"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Tags</label>
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="comma, separated" data-testid="case-tags"
              className="mt-1 w-full border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#002FA7]" />
          </div>
        </div>

        <button type="submit" disabled={busy} data-testid="create-case-submit"
          className="bg-[#002FA7] text-white px-5 py-2.5 text-sm hover:bg-[#00227A] transition-colors disabled:opacity-50">
          {busy ? "Classifying & routing…" : "Create & auto-route"}
        </button>
      </form>
    </div>
  );
}
