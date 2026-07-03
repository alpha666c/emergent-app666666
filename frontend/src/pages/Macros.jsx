import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function Macros() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/macros").then(r => setItems(r.data)); }, []);
  return (
    <div className="p-6 lg:p-8">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Library</p>
      <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Macros — Set Pieces</h1>
      <p className="text-sm text-zinc-500 mt-1">Pre-approved responses with conditions.</p>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map(m => (
          <div key={m.id} className="border border-zinc-200 bg-white p-4" data-testid={`macro-${m.id}`}>
            <div className="font-medium">{m.name}</div>
            <div className="text-sm text-zinc-700 mt-2 whitespace-pre-wrap">{m.body}</div>
            <div className="mt-3 flex gap-1.5 flex-wrap">
              {Object.entries(m.conditions || {}).map(([k, v]) => (
                <span key={k} className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700">{k}={v}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
