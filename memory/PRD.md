# Touchline SupportOps Brain — PRD

## Problem Statement
Build a multi-tenant Support Operations OS for high-volume digital businesses (crypto exchanges, fintechs, SaaS). Positioning: "Your Support Operations, Under Control." Match-day metaphor: agents=players, managers=coaches, ops=analysts, cases=plays, incidents=war-rooms, weekly summaries=match reports.

## Architecture
- Frontend: React 19 + Tailwind + Shadcn + Recharts + Phosphor + Sonner
- Backend: FastAPI + Motor (MongoDB) + Pydantic v2 + PyJWT + bcrypt + emergentintegrations
- AI: Claude Sonnet 4.5 via Emergent Universal LLM key
- Auth: JWT (7-day), bcrypt hashing
- Scheduler: APScheduler installed; manual triggers wired

## User Personas
- Agent (player): works Inbox, uses AI classification + macros + KB, posts replies
- Lead/Manager (coach): queue board, war-room, coaching, QA reviews
- Admin/Ops (analyst): ops dashboard, experiments, match reports, config

## Implemented (Feb 2026)
- Multi-tenant models: Company, Team, User, Customer, Queue, Case, CaseEvent, KnowledgeItem, Macro, QASample, WeeklySummary, Incident, Experiment, CoachingSession
- JWT auth + RBAC (agents restricted to assigned/unassigned in company; leads/admins full)
- SLA engine (compute_sla_due, sla_status: healthy/at_risk/breached with pulsing UI)
- Routing engine (queue matching + workload balancing + AI-priority upgrade)
- AI classification on POST /cases (topic/intent/risk/summary) with keyword fallback
- PII redaction (cards/IBAN/email/wallet/phone) before every LLM call
- Case detail: AI classification block, macro & KB suggestions, event timeline, note composer
- Incident War-Room: declare/mitigate/resolve, timeline logging, AI Match Report on resolve
- QA sampling, Coaching board (themes + follow-ups), Experiments (baseline vs live FRT)
- Ops Dashboard: KPIs, 7-day backlog trend, topic distribution (Recharts)
- Onboarding page: tagline, 4 feature sections, live counters, 3-role Getting Started
- Handoff /handoff page: full SITREP + Executive Summary

## Demo Data
Company: Emergent Exchange FC · 5 users · 3 teams · 6 crypto-preset queues · 8 customers · 18 cases · 6 KB items · 9 macros · 2 incidents (1 mitigating + 1 resolved w/ AI report) · 2 experiments · 2 coaching sessions.
Password for all demo users: Demo1234!

## Backlog
- P0: Case creation composer + customer picker; streaming AI reply drafting; APScheduler cron activation
- P1: Queue/SLA/routing rule admin panel; broadcast human-confirmation modal for high-risk queues
- P2: Embedding-based KB ranking; mobile companion; social login; per-tenant AI settings UI; CSV exports
