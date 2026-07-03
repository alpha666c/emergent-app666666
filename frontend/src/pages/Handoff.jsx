import { useEffect, useState } from "react";
import { Share, XCircle, Copy, Check } from "@phosphor-icons/react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

const SECTIONS = [
  {
    id: "diff",
    title: "0. Diff vs v3 — UI/UX Upgrade",
    items: [
      [
        "Layout",
        "**Three-panel layout** implemented across all authenticated views: collapsible left sidebar (56px collapsed, 224px expanded, persisted to localStorage) → center list → right detail panel. New shared **TopBar** (h-14, sticky, backdrop-blur) with workspace label breadcrumb, global search, War-Room shortcut, New Case CTA, and user avatar/role indicator.",
      ],
      [
        "Inbox rebuilt",
        "Full three-panel split view (Zendesk/Front-style): left sidebar navigation, center 420-440px case list (with inline KPI strip, filters, search, active-filter pills), right pane renders selected case via CasePanel. Row selection is now instant (no route change) with a left-border accent + subtle blue tint. Auto-selects the first case on load.",
      ],
      [
        "CasePanel extracted",
        "New `components/CasePanel.jsx` — the case detail body factored out and reused by both the Inbox right pane and the `/cases/:id` route. Same functionality, one implementation.",
      ],
      [
        "Composer refined",
        "Compact action bar in the composer header with 'Draft with AI' as the primary icon-button; textarea is edge-to-edge, borderless, monospace; footer button is icon+label ('Post reply' / 'Review & confirm'). High-risk banner stays inline as a subtle amber signal.",
      ],
      [
        "High-risk Dialog polished",
        "Restructured shadcn Dialog: amber warning icon block, tight typography hierarchy, 3-column risk grid, reply preview in a bordered surface, primary/secondary button pairing with PaperPlaneRight icon on Confirm.",
      ],
      [
        "Chip system",
        "New `components/Chip.jsx` with kinds: sla, priority, status, risk, neutral, tag, vip, info, incident + size scale (xs/sm/md). Consistent uppercase mono chips across Inbox rows, CasePanel header, customer profile, war-room, etc.",
      ],
      [
        "Skeleton loading states",
        "New `components/Skeleton.jsx` with `ListSkeleton` and `DetailSkeleton` — replaces bare 'Loading…' text in Inbox list and CasePanel.",
      ],
      [
        "Micro-UX",
        "Row hover with border-l-transparent → border-l-[#002FA7]; selection highlight (bg-blue-50/60 + accent border); sidebar collapse transition (200ms); topbar search bg swap on focus; consistent uppercase [10px] tracking-widest labels; consistent card headers (px-4 py-2 bg-white border-b).",
      ],
      [
        "Responsive",
        "Sidebar collapsible on demand. Case list hides right pane on <md, exposes full-width list; top-bar hides search on <md, hides War-Room label on <lg, hides user name/role on <lg.",
      ],
      [
        "Preservation",
        "**Zero backend changes.** No new API routes, no new entities, no changed payload shapes. All 30+ existing endpoints intact. All existing route names preserved. Only `Inbox.jsx`, `CaseDetail.jsx`, `Sidebar.jsx`, and `App.js` restructured; new files are additive: `TopBar.jsx`, `CasePanel.jsx`, `Chip.jsx`, `Skeleton.jsx`.",
      ],
    ],
  },
  {
    id: "build-status",
    title: "1. Build Status",
    items: [
      [
        "Fully completed",
        "Multi-tenant data model, JWT+RBAC, SLA + routing engines, AI classification, **case composer**, **AI reply drafting**, Case Detail w/ macro/KB suggestions, Incident War-Room + AI Match Report, QA sampling & review, Coaching board, Experiments (baseline vs live FRT), Ops dashboard (Recharts), KB + Macros libraries, Onboarding + Handoff pages.",
      ],
      [
        "Partial",
        "AI reply drafting returns full draft (non-streaming) — Claude Sonnet 4.5 in emergentintegrations doesn't yet expose SSE streaming; drafting shows a 'Drafting…' state. Weekly summary/QA cron: manual endpoints only; APScheduler installed but not activated.",
      ],
      ["Not started", "Social login, mobile companion, per-tenant AI-visibility config UI, queue/SLA admin editor UI."],
      [
        "Shortcuts",
        "Similarity uses token-overlap + condition boosts (no vector DB). AI runs at classification, draft, and match-report time.",
      ],
    ],
  },
  {
    id: "frontend",
    title: "2. Frontend Completed",
    items: [
      [
        "Pages",
        "Login, Onboarding (marketing + guide + live counters), Inbox, Case Detail, Queues, Team Performance, Ops Dashboard, War-Room, Incident Detail, Coaching, QA Reviews, Experiments, Match Reports, Knowledge Base, Macros, Handoff.",
      ],
      [
        "Agent view",
        "Inbox with filters, KPI strip, case detail with AI classification block, macro & KB suggestions, event timeline, note/reply composer that logs first response.",
      ],
      [
        "Manager view",
        "Queue board, team performance table, war-room list + detail + timeline logging, coaching board, QA panel with sampling + scoring.",
      ],
      [
        "Ops/Admin view",
        "Ops dashboard KPIs + Recharts, experiments module, match reports (AI weekly summary).",
      ],
      ["Mocked vs live", "All views hit real endpoints. Recharts fed by live aggregation. No mocked UI states."],
    ],
  },
  {
    id: "backend",
    title: "3. Backend Completed",
    items: [
      [
        "Data model",
        "Company, Team, User, Customer, Queue (SlaProfile), Case, CaseEvent, KnowledgeItem, Macro, QASample, WeeklySummary, Incident, Experiment, CoachingSession.",
      ],
      [
        "Relationships",
        "All docs carry company_id; cases → customer_id, queue_id, assigned_user_id; events → case_id; incidents → linked_case_ids[]; coaching → agent_id + manager_id.",
      ],
      [
        "API routes",
        "/auth/{register,login,me}; /companies/mine; /teams; /users; /customers; /queues; /cases (GET/POST/PATCH), /cases/{id}, /cases/{id}/notes, /cases/bulk-reassign; /knowledge; /macros; /dashboard/{agent,manager,ops}; /incidents (GET/POST/PATCH); /experiments (GET/POST); /qa/sample-now, /qa/samples, /qa/samples/{id}/review; /coaching (GET/POST/close); /summaries (GET/POST).",
      ],
      [
        "Background jobs",
        "Auto-seed on empty DB via FastAPI startup hook. Manual triggers: /qa/sample-now, /summaries/generate. APScheduler installed; cron wiring deferred to next iteration.",
      ],
      ["Auth", "JWT (HS256), 7-day expiry, bcrypt password hashing, Authorization: Bearer header."],
      [
        "RBAC / tenancy",
        "Every query filtered by company_id from JWT. Agents restricted to their assigned or unassigned cases; leads/admins see full company. Write endpoints gate on role (lead/admin) where required.",
      ],
      [
        "Routing engine",
        "match_queue() scores queues by topic/segment/channel/risk match; pick_agent() balances by open workload; priority_from_ai() upgrades on risk or VIP segment.",
      ],
      [
        "SLA engine",
        "compute_sla_due() from SlaProfile; sla_status() returns healthy/at_risk/breached; badges + pulsing UI on breach.",
      ],
      [
        "Incident engine",
        "Declare → mitigate → resolve state machine; timeline append on every status/note update; auto-generate AI Match Report on resolve.",
      ],
      [
        "Experiment/coaching",
        "Experiments compute live FRT vs stored baseline via case tag; Coaching sessions with themes[] and close() action.",
      ],
    ],
  },
  {
    id: "ai",
    title: "4. AI Implementation",
    items: [
      [
        "Live LLM features",
        "Case classification on POST /cases · **Reply drafting on POST /cases/{id}/ai-draft** · Match Report on incident resolve · Weekly summary on /summaries/generate.",
      ],
      [
        "Provider",
        "Claude Sonnet 4.5 (claude-sonnet-4-5-20250929) via Emergent Universal LLM key + emergentintegrations.",
      ],
      [
        "Prompts",
        "Classifier: strict JSON output over enum {topic, intent, risk, summary} — tuned for crypto/fintech topics but generic. Match Report: Markdown post-mortem with Highlights / Risk Areas / Recommendations.",
      ],
      [
        "Real vs placeholder",
        "Real classification with keyword fallback if LLM unavailable. Similarity for macro/KB matching is deterministic (token overlap + condition boosts), not embeddings — real but light.",
      ],
      [
        "Guardrails",
        "PII redaction (cards, IBAN, emails, wallets, phones) before any LLM call. Fallback classifier + fallback reply when LLM fails. Draft prompt forbids inventing account actions/balances/timelines. **High-risk topics (security/withdrawal/kyc) trigger a human-confirmation modal before send.** Every AI event logged as CaseEvent (per-case AI activity log).",
      ],
    ],
  },
  {
    id: "demo",
    title: "5. Demo Data",
    items: [
      ["Company", "Emergent Exchange FC (settings.vertical=crypto_exchange, metaphor=football)."],
      [
        "Users (password: Demo1234!)",
        "admin@touchline.demo (admin, Ava Chen) · lead@touchline.demo (lead, Marcus Reid) · agent@touchline.demo (Priya Nair) · agent2@touchline.demo (Diego Alvarez) · agent3@touchline.demo (Zara Osei).",
      ],
      ["Teams", "Defense (Tier-1), Midfield (Escalations), Strikers (VIP)."],
      [
        "Queues",
        "Funds missing & transfer investigation; Identity & compliance (KYC/EDD); Promotions & rewards; Card & payment issues; General inquiries; Security & Fraud (Incident).",
      ],
      ["Customers", "8 across standard/premium/vip with risk levels + tags (whale, institutional, etc.)."],
      [
        "Cases",
        "18 seeded — mix of open/pending/solved across all queues with realistic descriptions and SLA states (breached, at-risk, healthy).",
      ],
      ["Knowledge", "6 KB items across Funds/Compliance/Payments/Promotions/Security."],
      ["Macros", "9 macros including two INCIDENT BROADCAST templates."],
      ["Incidents", "2 — Sev1 ATO wave (mitigating) + Sev2 TRC20 delay (resolved with AI-authored Match Report)."],
      ["Experiments", "2 — Auto-route TRC20 delays; Empathetic KYC macro (both running with baseline)."],
      ["Coaching", "2 open sessions for agent1/agent2."],
    ],
  },
  {
    id: "arch",
    title: "6. Technical Architecture",
    items: [
      [
        "Frontend",
        "React 19 + React Router 7 + Tailwind + Shadcn primitives + Recharts + Phosphor icons + Sonner toasts. Axios client with JWT interceptor.",
      ],
      [
        "Backend",
        "FastAPI + Motor (async MongoDB) + Pydantic v2 + bcrypt + PyJWT + emergentintegrations.",
      ],
      ["Database", "MongoDB. All records store ISO datetime strings and UUID string ids."],
      ["Scheduler", "APScheduler installed; manual endpoints wired; cron activation deferred."],
      [
        "Third-party",
        "Emergent Universal LLM Key (Anthropic Claude Sonnet 4.5). No external services beyond that in this iteration.",
      ],
    ],
  },
  {
    id: "gaps",
    title: "7. Known Gaps",
    items: [
      [
        "Weak points",
        "No vector search for KB (token overlap only). No streaming AI reply drafting in Case Detail. Scheduler not activated. No human-confirmation gate UI on high-risk broadcasts (backend allows leads/admins today).",
      ],
      [
        "Improve next",
        "1) Streaming reply draft with Claude in Case Detail. 2) Embedding-based KB & macro ranking. 3) Human-in-the-loop broadcast confirmation modal for high-risk queues. 4) Per-tenant AI data-visibility config panel.",
      ],
      ["Performance", "Ops dashboard fetches up to 10k cases; fine for demo but should paginate + aggregate in DB at scale."],
      [
        "Safety/reliability",
        "PII redaction is regex-based; add server-side entity redaction library at scale. AI fallback exists but no retry/backoff.",
      ],
      [
        "UX",
        "No case creation UI (cases seeded); add composer for full loop demo. No queue configuration UI (backend-ready).",
      ],
    ],
  },
  {
    id: "next",
    title: "8. Next Action Plan",
    items: [
      [
        "MUST do next",
        "Case creation composer + customer picker; streaming AI reply draft in Case Detail; queue & SLA config admin panel.",
      ],
      [
        "SHOULD do next",
        "Activate APScheduler weekly summary + weekly QA sample cron; broadcast confirmation modal; per-agent case-view isolation E2E test.",
      ],
      [
        "NICE to have",
        "Embedding-based KB ranking; social login; mobile companion; per-tenant AI settings UI; export-to-CSV in Ops dashboard.",
      ],
    ],
  },
];

const EXECUTIVE_SUMMARY = [
  "Touchline SupportOps Brain is a multi-tenant Support Operations OS with JWT+RBAC, running on FastAPI + MongoDB + React 19.",
  "Three role-scoped workspaces are live: Agent (Inbox + Case Detail), Manager (Queues, Team, War-Room, Coaching, QA), Ops (Dashboards, Experiments, Match Reports).",
  "AI is real: Claude Sonnet 4.5 classifies every case (topic/intent/risk/summary) and writes incident Match Reports on resolve.",
  "PII redaction runs before every LLM call; every AI event is logged as a CaseEvent per case (audit trail).",
  "SLA engine computes first_response + resolution due times per queue and surfaces breached/at-risk states throughout the UI.",
  "Routing engine auto-assigns to the least-loaded agent using topic/segment/risk-matched queues.",
  "Incident War-Room supports declare → mitigate → resolve, timeline logging, broadcast macros, and AI post-mortems.",
  "QA sampling, Coaching board (with themes + follow-ups), and Experiments with baseline vs live FRT metrics are all functional.",
  "Seeded demo: 'Emergent Exchange FC' with 5 users, 3 teams, 6 queues (crypto preset), 8 customers, 18 cases, 2 incidents, 2 experiments.",
  "Highest-leverage next iterations: streaming AI reply drafting, embedding-based KB ranking, and activating scheduled weekly QA + summary jobs.",
];

export default function Handoff() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [share, setShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    Promise.all([
      api.get("/cases", { params: { limit: 1000 } }).then((r) => r.data.length),
      api.get("/incidents").then((r) => r.data.length),
      api.get("/experiments").then((r) => r.data.length),
      api.get("/queues").then((r) => r.data.length),
      api.get("/users").then((r) => r.data.length),
      api.get("/coaching").then((r) => r.data.length).catch(() => 0),
    ])
      .then(([cases, incidents, experiments, queues, users, coaching]) =>
        setStats({ cases, incidents, experiments, queues, users, coaching })
      )
      .catch(() => {});
    if (user?.role === "admin") {
      api
        .get("/handoff/share/status")
        .then((r) => setShare(r.data))
        .catch(() => {});
    }
  }, [user]);

  const enableShare = async () => {
    const { data } = await api.post("/handoff/share");
    setShare({ active: true, snapshot: data });
    toast.success("Public snapshot enabled");
  };

  const disableShare = async () => {
    await api.delete("/handoff/share");
    setShare({ active: false, snapshot: null });
    toast.success("Public snapshot revoked");
  };

  const publicUrl = share?.snapshot?.token
    ? `${window.location.origin}/handoff/public/${share.snapshot.token}`
    : null;

  const copyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl bg-background">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Engineering handoff · v4
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tighter mt-1 text-foreground">
            SITREP
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            Live snapshot of the Touchline SupportOps Brain build for review + next-iteration planning.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            data-testid="print-handoff"
            className="border border-border px-3 py-2 text-xs bg-card hover:bg-secondary hover:border-foreground transition-colors"
          >
            Print / PDF
          </button>
          <a
            href="#executive-summary"
            className="bg-primary text-primary-foreground px-3 py-2 text-xs hover:bg-primary/90"
          >
            Jump to summary ↓
          </a>
        </div>
      </div>

      {stats && (
        <div
          className="grid grid-cols-3 md:grid-cols-6 gap-0 border border-border mt-6 bg-card"
          data-testid="handoff-live-stats"
        >
          {[
            ["Cases", stats.cases],
            ["Queues", stats.queues],
            ["Users", stats.users],
            ["Incidents", stats.incidents],
            ["Experiments", stats.experiments],
            ["Coaching", stats.coaching],
          ].map(([l, v], i) => (
            <div key={l} className={`p-3 ${i > 0 ? "md:border-l border-border" : ""}`}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {l}
              </div>
              <div className="font-mono text-2xl mt-1 text-foreground">{v}</div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div
          className="mt-6 border-2 border-primary/20 bg-primary/5 p-5"
          data-testid="share-panel"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <Share size={22} weight="fill" className="text-primary mt-0.5" />
              <div>
                <div className="font-display text-lg font-bold tracking-tight text-foreground">
                  Share read-only snapshot
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Generate a signed public URL for judges &amp; leadership. Read-only — no login required.
                  One active token per company.
                </div>
              </div>
            </div>
            {share?.active ? (
              <button
                onClick={disableShare}
                data-testid="disable-share-btn"
                className="border border-red-600 text-red-600 px-3 py-2 text-xs hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <XCircle size={14} /> Revoke
              </button>
            ) : (
              <button
                onClick={enableShare}
                data-testid="enable-share-btn"
                className="bg-primary text-primary-foreground px-3 py-2 text-xs hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                <Share size={14} /> Enable public link
              </button>
            )}
          </div>
          {share?.active && publicUrl && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <input
                readOnly
                value={publicUrl}
                data-testid="public-url"
                className="flex-1 min-w-0 border border-input bg-card px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={copyUrl}
                data-testid="copy-url-btn"
                className="border border-border px-3 py-2 text-xs bg-card hover:bg-secondary hover:border-foreground transition-colors flex items-center gap-1.5"
              >
                {copied ? (
                  <Check size={14} weight="bold" className="text-green-600" />
                ) : (
                  <Copy size={14} />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
              <span className="text-[10px] text-muted-foreground font-mono">
                expires {new Date(share.snapshot.expires_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 space-y-8">
        {SECTIONS.map((sec) => (
          <section key={sec.id} data-testid={`sitrep-${sec.id}`}>
            <h2 className="font-display text-2xl font-bold tracking-tight border-b-2 border-border pb-2 text-foreground">
              {sec.title}
            </h2>
            <dl className="mt-4 space-y-3">
              {sec.items.map(([k, v], i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <dt className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold pt-1">
                    {k}
                  </dt>
                  <dd className="md:col-span-3 text-sm text-foreground leading-relaxed">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <section id="executive-summary" data-testid="executive-summary">
          <h2 className="font-display text-2xl font-bold tracking-tight border-b-2 border-primary pb-2 text-primary">
            Executive Summary
          </h2>
          <ol className="mt-4 space-y-2 list-decimal list-inside text-sm text-foreground leading-relaxed">
            {EXECUTIVE_SUMMARY.map((b, i) => (
              <li key={i} className="pl-1">
                {b}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
