import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Brain, Broadcast, GraduationCap, PottedPlant, Trophy,
  Users, ChartLine, Sparkle, Ticket, ArrowRight,
} from "@phosphor-icons/react";

const FEATURES = [
  {
    icon: Brain,
    title: "AI Case Classifier",
    kicker: "Read every play instantly",
    body: "The moment a case lands, Claude-powered classification pins the topic (withdrawal, KYC, security…), the customer intent (question, complaint, escalation) and a risk level. Agents open every case with the read already done.",
    bullets: [
      "9 topics tuned for high-volume digital businesses",
      "Intent + risk shape auto-priority and routing",
      "Fallback keyword engine keeps you live even without a key",
    ],
  },
  {
    icon: PottedPlant,
    title: "Smart Routing & SLA Tracking",
    kicker: "Never lose the clock",
    body: "Cases self-route to the right queue by topic, risk, segment and channel — then land on the least-loaded agent. Every case carries a live SLA countdown, promoted to at-risk and breached states that pulse red when time runs out.",
    bullets: [
      "Per-queue SLA profiles (first response + resolution)",
      "Workload-balanced auto-assignment",
      "At-risk / breached badges visible everywhere",
    ],
  },
  {
    icon: Broadcast,
    title: "Incident War-Room & Match Reports",
    kicker: "Coordinate when it matters most",
    body: "Declare a Sev1 in one click. Link cases, log timeline decisions, broadcast macros to affected customers. When you resolve, an AI Match Report writes itself: what happened, impact, lessons learned.",
    bullets: [
      "Live incident status (Investigating → Mitigating → Resolved)",
      "Broadcast macros pre-wired for outages",
      "AI post-mortem the moment you hit resolved",
    ],
  },
  {
    icon: GraduationCap,
    title: "QA, Coaching & Experiments",
    kicker: "Improve the team every week",
    body: "Sample resolved cases, score accuracy/tone/policy, and roll findings straight into Coaching sessions with themes and follow-ups. Ship routing or macro experiments and watch before/after metrics in real time.",
    bullets: [
      "One-click weekly sampling per agent",
      "Coaching board with themes & follow-ups",
      "Experiments compare baseline vs current FRT",
    ],
  },
];

const STEPS = [
  {
    role: "Agent — The Player",
    icon: Users, accent: "text-blue-700", tint: "border-blue-200 bg-blue-50/40",
    email: "agent@touchline.demo",
    steps: [
      "Sign in as agent@touchline.demo",
      "Open the Inbox and pick a high-priority case",
      "Read the AI classification, insert a macro, reply",
      "Move status to Solved once the SLA is safe",
    ],
    cta: { to: "/inbox", label: "Open Inbox" },
  },
  {
    role: "Manager — The Coach",
    icon: Broadcast, accent: "text-amber-700", tint: "border-amber-200 bg-amber-50/40",
    email: "lead@touchline.demo",
    steps: [
      "Sign in as lead@touchline.demo",
      "Scan queues for AT-RISK badges",
      "Enter the War-Room, drive the active Sev1",
      "Open Coaching Board and create a session",
    ],
    cta: { to: "/war-room", label: "Enter War-Room" },
  },
  {
    role: "Ops — The Analyst",
    icon: ChartLine, accent: "text-green-700", tint: "border-green-200 bg-green-50/40",
    email: "admin@touchline.demo",
    steps: [
      "Sign in as admin@touchline.demo",
      "Check SLA adherence in the Analyst Booth",
      "Review experiments and topic distribution",
      "Generate a Match Report for leadership",
    ],
    cta: { to: "/dashboard", label: "Open Analyst Booth" },
  },
];

export default function Onboarding() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/cases", { params: { limit: 1000 } }).then(r => r.data.length).catch(() => 0),
      api.get("/incidents").then(r => r.data.length).catch(() => 0),
      api.get("/experiments").then(r => r.data.length).catch(() => 0),
      api.get("/queues").then(r => r.data.length).catch(() => 0),
    ]).then(([cases, incidents, experiments, queues]) => setStats({ cases, incidents, experiments, queues }));
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-6xl">
      {/* Hero */}
      <div className="border-b-2 border-zinc-200 pb-10 mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-[#002FA7] text-white flex items-center justify-center font-display font-bold">T</div>
          <span className="font-display font-bold tracking-tight">Touchline</span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold border-l border-zinc-200 pl-2 ml-1">SupportOps Brain</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[0.95]">
          Your Support Operations,<br/>
          <span className="text-[#002FA7]">Under Control.</span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-600 mt-5 max-w-3xl leading-relaxed">
          Centralize cases, route with AI, protect SLAs, and keep customers safe.
        </p>
        <div className="mt-8 flex gap-3 flex-wrap">
          <Link to="/inbox" data-testid="hero-cta-inbox" className="bg-[#002FA7] text-white px-5 py-3 text-sm font-medium hover:bg-[#00227A] transition-colors flex items-center gap-2">
            Take the field <ArrowRight size={14} weight="bold" />
          </Link>
          <Link to="/dashboard" className="border border-zinc-300 px-5 py-3 text-sm font-medium hover:border-zinc-900 transition-colors">
            Open Analyst Booth
          </Link>
        </div>
      </div>

      {/* Live counters */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-zinc-200 mb-16" data-testid="live-counters">
          {[
            ["Demo cases in play", stats.cases, Ticket],
            ["Active queues", stats.queues, PottedPlant],
            ["Incidents tracked", stats.incidents, Broadcast],
            ["Experiments running", stats.experiments, Sparkle],
          ].map(([label, val, Icon], i) => (
            <div key={label} className={`p-5 ${i > 0 ? "md:border-l border-zinc-200" : ""} ${i >= 2 ? "border-t md:border-t-0" : ""}`} data-testid={`counter-${label.toLowerCase().split(" ").join("-")}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{label}</span>
                <Icon size={14} className="text-zinc-400" />
              </div>
              <div className="font-mono text-4xl mt-3 font-medium text-zinc-900">{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Features */}
      <div className="mb-16">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">What's inside</p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tighter">Four modules. One brain.</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 mt-8 border border-zinc-200">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`p-6 md:p-8 ${i % 2 === 1 ? "md:border-l" : ""} ${i >= 2 ? "md:border-t" : ""} border-zinc-200 hover:bg-zinc-50 transition-colors`}
              data-testid={`feature-${i + 1}`}
            >
              <div className="w-11 h-11 bg-[#002FA7] text-white flex items-center justify-center mb-5">
                <f.icon size={22} weight="fill" />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{f.kicker}</p>
              <h3 className="font-display text-2xl font-bold tracking-tight mt-1">{f.title}</h3>
              <p className="text-sm text-zinc-600 mt-3 leading-relaxed">{f.body}</p>
              <ul className="mt-4 space-y-1.5">
                {f.bullets.map((b) => (
                  <li key={b} className="text-sm text-zinc-700 flex items-start gap-2">
                    <span className="font-mono text-[#002FA7] mt-0.5">›</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Getting Started steps */}
      <div className="mb-16">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Getting started</p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tighter">Try each role in 90 seconds.</h2>
        <p className="text-sm text-zinc-500 mt-2 max-w-2xl">Password for every demo account: <span className="font-mono text-zinc-900">Demo1234!</span></p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {STEPS.map((s, i) => (
            <div key={s.role} className={`border p-6 ${s.tint}`} data-testid={`onboarding-step-${i + 1}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-zinc-200 flex items-center justify-center">
                  <s.icon size={20} weight="fill" className={s.accent} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Step {i + 1}</div>
                  <div className="font-display text-lg font-bold tracking-tight">{s.role}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-zinc-500 font-mono">{s.email}</div>
              <ol className="mt-4 space-y-1.5 text-sm">
                {s.steps.map((step, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="font-mono text-[10px] text-zinc-400 mt-1 shrink-0">{String(j + 1).padStart(2, "0")}</span>
                    <span className="text-zinc-800">{step}</span>
                  </li>
                ))}
              </ol>
              <Link to={s.cta.to} className="mt-5 inline-flex items-center gap-1 text-xs text-[#002FA7] font-medium hover:underline">
                {s.cta.label} <ArrowRight size={12} weight="bold" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t-2 border-zinc-200 pt-6 flex items-center gap-2 text-sm text-zinc-500">
        <Trophy size={16} weight="fill" className="text-amber-500" />
        <span>Built to scale from a hundred cases a day to a hundred thousand — designed for crypto, fintech, and SaaS.</span>
      </div>
    </div>
  );
}
