import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function QAReviews() {
  const [samples, setSamples] = useState([]);
  const load = () => api.get("/qa/samples").then(r => setSamples(r.data));
  useEffect(() => { load(); }, []);

  const sample = async () => {
    const { data } = await api.post("/qa/sample-now");
    toast.success(`Sampled ${data.created} cases`);
    load();
  };

  const submit = async (sid, form) => {
    await api.post(`/qa/samples/${sid}/review`, form);
    toast.success("Review saved");
    load();
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Coach view</p>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">QA Reviews</h1>
          <p className="text-sm text-zinc-500 mt-1">Sampled plays for weekly review.</p>
        </div>
        <button onClick={sample} data-testid="sample-now-btn" className="bg-[#002FA7] text-white px-4 py-2 text-sm hover:bg-[#00227A] transition-colors">Sample Now</button>
      </div>

      <div className="mt-8 space-y-4">
        {samples.map(s => <SampleRow key={s.id} s={s} onSubmit={submit} />)}
        {samples.length === 0 && <div className="text-sm text-zinc-500 border border-dashed border-zinc-300 p-8 text-center">No samples yet. Click Sample Now.</div>}
      </div>
    </div>
  );
}

function SampleRow({ s, onSubmit }) {
  const [form, setForm] = useState({ score_accuracy: 4, score_tone: 4, score_policy: 4, comments: "" });
  const reviewed = !!s.reviewed_at;
  return (
    <div className="border border-zinc-200 bg-white p-4">
      <div className="flex justify-between">
        <div>
          <div className="font-medium">{s.case?.subject}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Agent: {s.agent?.name}</div>
        </div>
        {reviewed && <span className="text-[10px] font-mono px-2 py-0.5 bg-green-50 border border-green-200 text-green-700">REVIEWED</span>}
      </div>
      {!reviewed && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {["score_accuracy", "score_tone", "score_policy"].map(k => (
            <label key={k} className="text-xs">
              <div className="uppercase tracking-widest text-zinc-500 mb-1">{k.replace("score_", "")}</div>
              <select value={form[k]} onChange={e => setForm({...form, [k]: parseInt(e.target.value)})} className="w-full border border-zinc-300 px-2 py-1.5 text-sm">
                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
      {!reviewed && (
        <>
          <textarea rows={2} value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} placeholder="Comments…"
            className="mt-3 w-full border border-zinc-300 p-2 text-sm" />
          <button onClick={() => onSubmit(s.id, form)} className="mt-2 bg-[#002FA7] text-white px-4 py-2 text-sm">Submit review</button>
        </>
      )}
      {reviewed && (
        <div className="mt-3 text-xs text-zinc-600 grid grid-cols-3 gap-2 font-mono">
          <div>Accuracy: {s.score_accuracy}/5</div><div>Tone: {s.score_tone}/5</div><div>Policy: {s.score_policy}/5</div>
        </div>
      )}
    </div>
  );
}
