"""Seed demo data for 'Emergent Exchange FC' – Touchline SupportOps Brain."""
import asyncio
import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from models import (
    Company, Team, User, Customer, Queue, Case, CaseEvent,
    KnowledgeItem, Macro, SlaProfile, Incident, Experiment, CoachingSession,
    iso_now, utcnow,
)
from auth import hash_password
from routing import compute_sla_due


DEMO_EMAIL_DOMAIN = "touchline.demo"
DEMO_PASSWORD = "Demo1234!"


async def seed():
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    for coll in ["companies", "teams", "users", "customers", "queues", "cases",
                 "case_events", "knowledge_items", "macros", "qa_samples",
                 "weekly_summaries", "incidents", "experiments", "coaching_sessions"]:
        await db[coll].delete_many({})

    company = Company(
        name="Emergent Exchange FC",
        description="A crypto exchange running the Touchline SupportOps Brain playbook.",
        settings={"vertical": "crypto_exchange", "metaphor": "football"},
    )
    await db.companies.insert_one(company.model_dump())

    # Teams (positions)
    team_defense = Team(name="Defense (Tier-1)", company_id=company.id)
    team_midfield = Team(name="Midfield (Escalations)", company_id=company.id)
    team_striker = Team(name="Strikers (VIP)", company_id=company.id)
    await db.teams.insert_many([t.model_dump() for t in [team_defense, team_midfield, team_striker]])

    # Users
    admin = User(name="Ava Chen", email=f"admin@{DEMO_EMAIL_DOMAIN}",
                 password_hash=hash_password(DEMO_PASSWORD), role="admin",
                 company_id=company.id, team_id=team_midfield.id,
                 avatar_url="https://images.pexels.com/photos/26872232/pexels-photo-26872232.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940")
    lead = User(name="Marcus Reid", email=f"lead@{DEMO_EMAIL_DOMAIN}",
                password_hash=hash_password(DEMO_PASSWORD), role="lead",
                company_id=company.id, team_id=team_midfield.id,
                avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200")
    agent1 = User(name="Priya Nair", email=f"agent@{DEMO_EMAIL_DOMAIN}",
                  password_hash=hash_password(DEMO_PASSWORD), role="agent",
                  company_id=company.id, team_id=team_defense.id,
                  avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200")
    agent2 = User(name="Diego Alvarez", email=f"agent2@{DEMO_EMAIL_DOMAIN}",
                  password_hash=hash_password(DEMO_PASSWORD), role="agent",
                  company_id=company.id, team_id=team_defense.id,
                  avatar_url="https://images.unsplash.com/photo-1699899657680-421c2c2d5064?w=200")
    agent3 = User(name="Zara Osei", email=f"agent3@{DEMO_EMAIL_DOMAIN}",
                  password_hash=hash_password(DEMO_PASSWORD), role="agent",
                  company_id=company.id, team_id=team_striker.id, avatar_url=None)
    users = [admin, lead, agent1, agent2, agent3]
    await db.users.insert_many([u.model_dump() for u in users])

    # Customers
    customer_data = [
        ("Aiko Tanaka", "aiko@example.com", "vip", "high", ["whale", "japan"]),
        ("Bruno Silva", "bruno@example.com", "premium", "medium", ["latam"]),
        ("Cara Meyer", "cara@example.com", "standard", "low", []),
        ("Dmitri Volkov", "dmitri@example.com", "premium", "high", ["institutional"]),
        ("Elena Rossi", "elena@example.com", "standard", "low", []),
        ("Farid Hassan", "farid@example.com", "vip", "medium", ["mena", "whale"]),
        ("Grace Kim", "grace@example.com", "standard", "low", []),
        ("Hiro Sato", "hiro@example.com", "premium", "low", []),
    ]
    customers = [Customer(name=n, email=e, segment=s, risk_level=r, tags=t, company_id=company.id)
                 for n, e, s, r, t in customer_data]
    await db.customers.insert_many([c.model_dump() for c in customers])

    # Queues – Crypto Exchange preset
    q_funds = Queue(name="Funds missing & transfer investigation",
                    description="Missing deposits, stuck withdrawals, chain investigations",
                    company_id=company.id, filter_rules={"topic": "withdrawal"},
                    sla_profile=SlaProfile(first_response_minutes=30, resolution_minutes=480))
    q_kyc = Queue(name="Identity & compliance (KYC/EDD)",
                  description="KYC uploads, enhanced due diligence, sanctions",
                  company_id=company.id, filter_rules={"topic": "kyc"},
                  sla_profile=SlaProfile(first_response_minutes=120, resolution_minutes=2880))
    q_promo = Queue(name="Promotions & rewards",
                    description="Referrals, bonuses, campaigns, points",
                    company_id=company.id, filter_rules={"topic": "billing"},
                    sla_profile=SlaProfile(first_response_minutes=180, resolution_minutes=1440))
    q_card = Queue(name="Card & payment issues",
                   description="Card declines, 3DS failures, fiat rails",
                   company_id=company.id, filter_rules={"topic": "deposit"},
                   sla_profile=SlaProfile(first_response_minutes=45, resolution_minutes=720))
    q_general = Queue(name="General inquiries",
                      description="Product questions, catch-all",
                      company_id=company.id, filter_rules={},
                      sla_profile=SlaProfile(first_response_minutes=60, resolution_minutes=1440))
    q_security = Queue(name="Security & Fraud (Incident)",
                       description="Account takeovers, phishing, coordinated fraud",
                       company_id=company.id, filter_rules={"topic": "security", "risk": "high"},
                       sla_profile=SlaProfile(first_response_minutes=15, resolution_minutes=240))
    queues = [q_funds, q_kyc, q_promo, q_card, q_general, q_security]
    await db.queues.insert_many([q.model_dump() for q in queues])

    # Knowledge
    kb_items = [
        KnowledgeItem(title="Missing Deposit Playbook", body="1) Confirm txid & network match. 2) Verify confirmations. 3) Check whitelisted address. 4) Escalate to Chain Ops after 2h.",
                      category="Funds", tags=["deposit", "delay", "missing"], company_id=company.id, owner_user_id=lead.id, last_reviewed_at=iso_now()),
        KnowledgeItem(title="Withdrawal Delay Response", body="Typical processing 15-60 min. If pending >2h verify address whitelist. Escalate to Compliance if flagged.",
                      category="Funds", tags=["withdrawal", "delay"], company_id=company.id, owner_user_id=lead.id, last_reviewed_at=iso_now()),
        KnowledgeItem(title="KYC Level 2 Requirements", body="Level 2 requires: government ID, proof of address (<3 mo), selfie. Complete in 24h.",
                      category="Compliance", tags=["kyc", "verification"], company_id=company.id, owner_user_id=admin.id, last_reviewed_at=iso_now()),
        KnowledgeItem(title="Card Decline Codes", body="Common: DO_NOT_HONOR (bank), 3DS_FAILED (re-auth), INSUFFICIENT_FUNDS. Escalate rail-side issues to Payments.",
                      category="Payments", tags=["card", "payment", "decline"], company_id=company.id, owner_user_id=admin.id, last_reviewed_at=iso_now()),
        KnowledgeItem(title="Promo Reward Not Credited", body="Verify eligibility window & KYC completion. Rewards batch nightly at 00:00 UTC.",
                      category="Promotions", tags=["promo", "rewards"], company_id=company.id, owner_user_id=lead.id, last_reviewed_at=iso_now()),
        KnowledgeItem(title="Account Takeover Playbook", body="1) Freeze account. 2) Force logout. 3) Reset 2FA. 4) Review 30d txns. 5) Notify Security.",
                      category="Security", tags=["security", "fraud", "incident"], company_id=company.id, owner_user_id=admin.id, last_reviewed_at=iso_now()),
    ]
    await db.knowledge_items.insert_many([k.model_dump() for k in kb_items])

    # Macros
    macros = [
        Macro(name="Missing Deposit — Awaiting Confirmations", body="Hi {customer_name}, your deposit is on-chain and awaiting network confirmations. It will credit automatically once complete (typical 15-45 min).",
              conditions={"topic": "deposit"}, company_id=company.id, owner_user_id=lead.id),
        Macro(name="Withdrawal Delay — Standard", body="Hi {customer_name}, we're reviewing your withdrawal. Network confirmations may take 15-60 min. We'll escalate to compliance if flagged.",
              conditions={"topic": "withdrawal"}, company_id=company.id, owner_user_id=lead.id),
        Macro(name="KYC Additional Docs Required", body="Hi {customer_name}, we need a clearer government ID and a recent proof of address (<3 months). Upload via the Verification tab.",
              conditions={"topic": "kyc"}, company_id=company.id, owner_user_id=admin.id),
        Macro(name="Card Declined — Retry Guidance", body="Hi {customer_name}, your card was declined by the issuing bank. Please retry after contacting your bank or use an alternative rail.",
              conditions={"topic": "billing"}, company_id=company.id, owner_user_id=lead.id),
        Macro(name="Promo Credit Investigation", body="Hi {customer_name}, we're reviewing eligibility for the promotional credit. Rewards batch nightly; expect confirmation within 24h.",
              conditions={"topic": "billing"}, company_id=company.id, owner_user_id=lead.id),
        Macro(name="INCIDENT BROADCAST — Withdrawal Delays", body="We're experiencing elevated withdrawal delays on select networks. Our engineering team is actively mitigating. Estimated resolution within 2 hours. Follow status.emergentfc.com for updates.",
              conditions={"tag": "incident_broadcast"}, company_id=company.id, owner_user_id=admin.id),
        Macro(name="INCIDENT BROADCAST — Login Issues", body="Some users are experiencing login failures. We're investigating and mitigating. No action needed on your end. Updates every 15 min on status page.",
              conditions={"tag": "incident_broadcast"}, company_id=company.id, owner_user_id=admin.id),
        Macro(name="VIP Concierge Acknowledgment", body="Hi {customer_name}, thank you for being a valued VIP. A concierge specialist will contact you within 15 minutes.",
              conditions={"segment": "vip"}, company_id=company.id, owner_user_id=lead.id),
        Macro(name="Security Freeze Notice", body="Hi {customer_name}, we've placed a precautionary freeze on your account while investigating suspicious activity. Please respond with a copy of your ID.",
              conditions={"topic": "security", "risk": "high"}, company_id=company.id, owner_user_id=admin.id),
    ]
    await db.macros.insert_many([m.model_dump() for m in macros])

    # Cases – realistic mix across queues, with SLA statuses
    now = utcnow()
    # Format: (subject, description, channel, priority, customer_idx, topic, intent, risk, queue, minutes_ago, status)
    sample = [
        ("BTC withdrawal stuck 4h", "TXID not showing anywhere. Need urgent help.", "email", "high", 0, "withdrawal", "escalation", "medium", q_funds, 240, "open"),
        ("USDT deposit missing (TRC20)", "Sent 3h ago, on-chain confirmed. Not credited.", "email", "high", 2, "deposit", "help", "medium", q_funds, 180, "open"),
        ("Wrong network — sent ETH to BSC", "Can this be recovered?", "email", "medium", 6, "withdrawal", "help", "low", q_funds, 45, "open"),
        ("KYC Level 2 rejected", "Uploaded ID twice; selfie keeps rejecting.", "chat", "medium", 1, "kyc", "help", "low", q_kyc, 90, "open"),
        ("EDD documents requested", "You asked for source of funds. Where do I upload?", "email", "medium", 3, "kyc", "help", "medium", q_kyc, 300, "pending"),
        ("Referral reward missing", "My friend signed up, but no reward credited after 48h.", "chat", "low", 4, "billing", "complaint", "low", q_promo, 720, "open"),
        ("Bonus expired without notice", "The bonus disappeared before I could use it. Compensation?", "email", "low", 7, "billing", "complaint", "low", q_promo, 1200, "pending"),
        ("Card declined 3DS", "Visa charge 3DS failing repeatedly.", "chat", "high", 1, "billing", "help", "medium", q_card, 60, "open"),
        ("SEPA transfer never arrived", "Bank confirms sent 2 days ago. No trace.", "email", "high", 4, "deposit", "escalation", "medium", q_card, 2600, "open"),
        ("How do I enable 2FA?", "Newbie question.", "chat", "low", 4, "account", "question", "low", q_general, 15, "open"),
        ("Trading fees seem wrong", "Charged 0.2% instead of my usual 0.1%.", "email", "low", 1, "trading", "complaint", "low", q_general, 300, "solved"),
        ("Suspicious login from unknown IP", "Alert about login from Russia but I'm in Portugal. Hacked?", "email", "critical", 3, "security", "escalation", "high", q_security, 30, "open"),
        ("Fraudulent withdrawal!", "0.5 BTC I did NOT authorize. FREEZE ACCOUNT NOW.", "email", "critical", 3, "security", "escalation", "high", q_security, 20, "open"),
        ("Phishing email received", "Got an email pretending to be Emergent FC. Reporting.", "email", "medium", 5, "security", "feedback", "medium", q_security, 480, "solved"),
        ("VIP: need withdrawal limit raise", "Requesting $2M temporary limit.", "phone", "high", 0, "account", "help", "low", q_general, 25, "open"),
        ("Account locked after login attempts", "New device locked me out. Urgent.", "phone", "high", 7, "account", "escalation", "medium", q_general, 100, "open"),
        ("Password reset broken", "Reset link says expired immediately.", "chat", "medium", 4, "account", "bug_report", "low", q_general, 200, "solved"),
        ("API 429 errors", "Trading bot rate-limited on auth tier.", "email", "high", 5, "api", "help", "medium", q_general, 40, "open"),
    ]

    cases_to_insert = []
    events_to_insert = []
    for i, (subj, desc, ch, prio, ci, topic, intent, risk, queue, mago, status) in enumerate(sample):
        created = (now - timedelta(minutes=mago)).isoformat()
        cust = customers[ci]
        if cust.segment == "vip":
            queue = q_general  # VIPs override via priority not queue in this demo, keep queue readable
        sla = compute_sla_due(created, queue.sla_profile.model_dump())
        assigned = None
        if i % 4 != 0:
            assigned = [agent1, agent2, agent3][i % 3].id
        tags = [topic]
        if topic == "security" and risk == "high":
            tags.append("incident")
        case = Case(
            subject=subj, description=desc, channel=ch, priority=prio, status=status,
            company_id=company.id, customer_id=cust.id, assigned_user_id=assigned,
            queue_id=queue.id, ai_topic=topic, ai_intent=intent, ai_risk=risk,
            ai_summary=subj[:120], tags=tags, created_at=created, **sla,
        )
        if status in ("solved", "closed"):
            case.closed_at = (now - timedelta(minutes=random.randint(0, 60))).isoformat()
        cases_to_insert.append(case.model_dump())
        events_to_insert.append(CaseEvent(
            case_id=case.id, actor_type="system", event_type="created",
            payload={"channel": ch}, created_at=created,
        ).model_dump())
        events_to_insert.append(CaseEvent(
            case_id=case.id, actor_type="system", event_type="ai_classification",
            payload={"topic": topic, "intent": intent, "risk": risk}, created_at=created,
        ).model_dump())

    await db.cases.insert_many(cases_to_insert)
    await db.case_events.insert_many(events_to_insert)

    # Incidents (War-Room)
    incident_cases = [c for c in cases_to_insert if "incident" in c.get("tags", [])]
    incident = Incident(
        title="Coordinated ATO attempts targeting VIP accounts",
        description="Multiple accounts showing login attempts from unusual geographies. Suspected credential stuffing wave.",
        status="mitigating",
        severity="sev1",
        company_id=company.id,
        commander_user_id=admin.id,
        linked_case_ids=[c["id"] for c in incident_cases],
        timeline=[
            {"ts": (now - timedelta(minutes=45)).isoformat(), "actor": admin.name, "note": "Incident declared. Sev1. Freezing suspicious accounts."},
            {"ts": (now - timedelta(minutes=30)).isoformat(), "actor": admin.name, "note": "Enabled captcha on login endpoint."},
            {"ts": (now - timedelta(minutes=15)).isoformat(), "actor": lead.name, "note": "Broadcast macro sent to affected users."},
            {"ts": (now - timedelta(minutes=5)).isoformat(), "actor": admin.name, "note": "Login attempts dropped 90%. Moving to mitigation."},
        ],
    )
    incident2 = Incident(
        title="Withdrawal batch delay on TRC20",
        description="TRC20 withdrawals experiencing 2x normal processing time.",
        status="resolved",
        severity="sev2",
        company_id=company.id,
        commander_user_id=lead.id,
        linked_case_ids=[cases_to_insert[0]["id"], cases_to_insert[1]["id"]],
        timeline=[
            {"ts": (now - timedelta(hours=3)).isoformat(), "actor": lead.name, "note": "Delay detected. Investigating TRON network congestion."},
            {"ts": (now - timedelta(hours=2)).isoformat(), "actor": lead.name, "note": "Signing service throughput increased."},
            {"ts": (now - timedelta(hours=1)).isoformat(), "actor": lead.name, "note": "Backlog cleared. Resolved."},
        ],
        resolved_at=(now - timedelta(hours=1)).isoformat(),
        match_report="**Match Report**\n\n**What happened:** Elevated TRC20 network fees + our signer throughput cap produced a 2x processing delay affecting ~180 withdrawals.\n\n**Impact:** 12 support cases, no fund loss. Avg delay 42 min.\n\n**Lessons learned:** 1) Add auto-scaling for signer under high-fee conditions. 2) Preemptive customer comms via banner when TRC gas > 90th percentile. 3) Coach agents on 'network congestion' macro use.",
    )
    await db.incidents.insert_many([incident.model_dump(), incident2.model_dump()])

    # Experiments
    experiments = [
        Experiment(name="Auto-route TRC20 delays to Chain Ops", hypothesis="Direct routing cuts first response by 30%.",
                   tag="exp_trc_route", company_id=company.id, owner_user_id=admin.id, status="running",
                   baseline={"avg_first_response_min": 42, "count": 60}),
        Experiment(name="Empathetic KYC macro", hypothesis="New macro tone lifts CSAT on KYC cases by 8pts.",
                   tag="exp_kyc_tone", company_id=company.id, owner_user_id=lead.id, status="running",
                   baseline={"csat": 72, "count": 88}),
    ]
    await db.experiments.insert_many([e.model_dump() for e in experiments])

    # Coaching sessions
    coaching = [
        CoachingSession(company_id=company.id, agent_id=agent1.id, manager_id=lead.id,
                        themes=["tone", "policy"], notes="Great empathy on withdrawal cases; tighten adherence to compliance script on KYC.",
                        follow_up_at=(now + timedelta(days=7)).isoformat(), status="open"),
        CoachingSession(company_id=company.id, agent_id=agent2.id, manager_id=lead.id,
                        themes=["accuracy"], notes="Two macro mis-applications last week — pair review recommended.",
                        follow_up_at=(now + timedelta(days=3)).isoformat(), status="open"),
    ]
    await db.coaching_sessions.insert_many([c.model_dump() for c in coaching])

    print(f"Seeded '{company.name}' (Touchline SupportOps Brain)")
    print(f"  Users: {len(users)}, Queues: {len(queues)}, Cases: {len(sample)}")
    print(f"  Incidents: 2, Experiments: {len(experiments)}, Coaching: {len(coaching)}")
    print(f"\nDemo credentials (password: {DEMO_PASSWORD}):")
    for u in users:
        print(f"  {u.role:6} - {u.email}")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
