import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtRelative } from "@/lib/format";

export default function KnowledgeBase() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => { api.get("/knowledge").then(r => setItems(r.data)); }, []);
  const filtered = items.filter(i => (i.title + " " + i.body + " " + (i.tags || []).join(" ")).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="p-6 lg:p-8">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Library</p>
      <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Knowledge Base</h1>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="mt-4 border border-zinc-300 px-3 py-2 text-sm w-full max-w-md" data-testid="kb-search"/>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(k => (
          <div key={k.id} className="border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="font-medium">{k.title}</div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-100 text-zinc-600">{k.category}</span>
            </div>
            <div className="text-sm text-zinc-600 mt-2 whitespace-pre-wrap">{k.body}</div>
            <div className="mt-3 flex gap-1.5 flex-wrap">
              {k.tags?.map(t => <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-50 border border-zinc-200 text-zinc-500">#{t}</span>)}
            </div>
            <div className="mt-2 text-[10px] text-zinc-400 font-mono">Reviewed {fmtRelative(k.last_reviewed_at)} ago</div>
          </div>
        ))}
      </div>
    </div>
  );
}
