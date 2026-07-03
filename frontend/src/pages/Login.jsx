import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const DEMO_ACCOUNTS = [
  { label: "Agent (Priya Nair)", email: "agent@touchline.demo" },
  { label: "Lead (Marcus Reid)", email: "lead@touchline.demo" },
  { label: "Admin/Ops (Ava Chen)", email: "admin@touchline.demo" },
];

export default function Login() {
  const [email, setEmail] = useState("agent@touchline.demo");
  const [password, setPassword] = useState("Demo1234!");
  const [busy, setBusy] = useState(false);
  const { login, user } = useAuth();
  const nav = useNavigate();

  if (user) { nav("/inbox"); return null; }

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome to the pitch");
      nav("/inbox");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left */}
      <div className="hidden md:flex flex-col justify-between p-10 bg-[#002FA7] text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white text-[#002FA7] flex items-center justify-center font-display font-black text-xl">T</div>
            <div className="font-display font-bold text-xl">Touchline</div>
          </div>
          <div className="mt-16">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/70 mb-4">SupportOps Brain</p>
            <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tighter">
              Run support<br/>like a match-day.
            </h1>
            <p className="text-white/70 mt-6 max-w-md leading-relaxed text-sm">
              Agents are your players. Managers are the coaches. Ops keeps the analytics.
              Every case is a play. Every incident, a war-room. Every week, a match report.
            </p>
          </div>
        </div>
        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-4 text-white/70 text-xs">
            <div><div className="font-mono text-2xl text-white">18</div><div className="mt-1 uppercase tracking-widest">Live plays</div></div>
            <div><div className="font-mono text-2xl text-white">92%</div><div className="mt-1 uppercase tracking-widest">SLA hit rate</div></div>
            <div><div className="font-mono text-2xl text-white">2</div><div className="mt-1 uppercase tracking-widest">War-rooms</div></div>
          </div>
        </div>
        <div aria-hidden className="absolute -bottom-40 -right-40 w-[600px] h-[600px] border-[24px] border-white/5 rounded-full"/>
        <div aria-hidden className="absolute top-1/4 right-10 w-40 h-40 border border-white/10"/>
      </div>

      {/* Right */}
      <div className="flex items-center justify-center p-8 bg-white">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="login-form">
          <h2 className="font-display text-3xl font-bold tracking-tight">Sign in</h2>
          <p className="text-zinc-500 text-sm mt-1">Take the field.</p>

          <label className="block mt-8 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Email</label>
          <input
            data-testid="login-email"
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#002FA7] focus:border-[#002FA7]"
          />
          <label className="block mt-4 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Password</label>
          <input
            data-testid="login-password"
            type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#002FA7] focus:border-[#002FA7]"
          />
          <button
            data-testid="login-submit"
            type="submit" disabled={busy}
            className="mt-6 w-full bg-[#002FA7] text-white py-2.5 text-sm font-medium hover:bg-[#00227A] transition-colors disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Enter the war-room"}
          </button>

          <div className="mt-8 pt-6 border-t border-zinc-200">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-3">Judge-friendly demo</p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  data-testid={`demo-login-${a.email.split("@")[0]}`}
                  onClick={() => { setEmail(a.email); setPassword("Demo1234!"); }}
                  className="w-full text-left text-xs border border-zinc-200 px-3 py-2 hover:border-zinc-400 hover:bg-zinc-50 transition-colors flex items-center justify-between"
                >
                  <span>{a.label}</span>
                  <span className="font-mono text-zinc-500">{a.email}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-zinc-400 font-mono">Password for all: Demo1234!</p>
          </div>
        </form>
      </div>
    </div>
  );
}
