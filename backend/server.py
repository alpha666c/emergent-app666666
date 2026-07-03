"""Touchline SupportOps Brain – FastAPI server."""
import os
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from models import (
    Company, Team, User, UserPublic, LoginRequest, RegisterRequest,
    Customer, Queue, Case, CaseCreate, CaseUpdate, CaseEvent, NoteCreate,
    KnowledgeItem, Macro, QASample, QAReviewInput, WeeklySummary,
    Incident, IncidentCreate, IncidentUpdate,
    Experiment, ExperimentCreate, CoachingSession, CoachingCreate,
    iso_now, utcnow, new_id,
)
from auth import hash_password, verify_password, create_token, get_current_user_payload
from ai import classify_case, generate_weekly_summary, rank_matches, score_similarity, draft_reply
from routing import compute_sla_due, sla_status, match_queue, pick_agent, priority_from_ai

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("supportops")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Touchline SupportOps Brain")
api = APIRouter(prefix="/api")


# ---------- Helpers ----------
async def get_user(user_id: str) -> Optional[dict]:
    return await db.users.find_one({"id": user_id}, {"_id": 0})


async def current_user(payload: dict = Depends(get_current_user_payload)) -> dict:
    u = await get_user(payload["user_id"])
    if not u:
        raise HTTPException(401, "User not found")
    return u


def strip_pw(u: dict) -> dict:
    return {k: v for k, v in u.items() if k != "password_hash"}


async def log_event(case_id: str, event_type: str, actor_type: str, actor_id: Optional[str], payload: Dict[str, Any]):
    ev = CaseEvent(case_id=case_id, event_type=event_type, actor_type=actor_type, actor_id=actor_id, payload=payload)
    await db.case_events.insert_one(ev.model_dump())


def to_iso(dt: datetime) -> str:
    return dt.isoformat()


# ---------- Auth ----------
@api.post("/auth/register")
async def register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(400, "Email already registered")
    company = Company(name=req.company_name)
    await db.companies.insert_one(company.model_dump())
    user = User(name=req.name, email=req.email, password_hash=hash_password(req.password),
                role="admin", company_id=company.id)
    await db.users.insert_one(user.model_dump())
    token = create_token(user.id, company.id, user.role)
    return {"token": token, "user": strip_pw(user.model_dump()), "company": company.model_dump()}


@api.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user["id"], user["company_id"], user["role"])
    company = await db.companies.find_one({"id": user["company_id"]}, {"_id": 0})
    return {"token": token, "user": strip_pw(user), "company": company}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    company = await db.companies.find_one({"id": user["company_id"]}, {"_id": 0})
    return {"user": strip_pw(user), "company": company}


# ---------- Companies (settings) ----------
@api.get("/companies/mine")
async def my_company(user: dict = Depends(current_user)):
    return await db.companies.find_one({"id": user["company_id"]}, {"_id": 0})


# ---------- Teams / Users ----------
@api.get("/teams")
async def list_teams(user: dict = Depends(current_user)):
    return await db.teams.find({"company_id": user["company_id"]}, {"_id": 0}).to_list(500)


@api.get("/users")
async def list_users(user: dict = Depends(current_user)):
    docs = await db.users.find({"company_id": user["company_id"]}, {"_id": 0}).to_list(500)
    return [strip_pw(d) for d in docs]


# ---------- Customers ----------
@api.get("/customers")
async def list_customers(user: dict = Depends(current_user)):
    return await db.customers.find({"company_id": user["company_id"]}, {"_id": 0}).sort("name", 1).to_list(2000)


@api.get("/customers/{cid}")
async def get_customer(cid: str, user: dict = Depends(current_user)):
    c = await db.customers.find_one({"id": cid, "company_id": user["company_id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Customer not found")
    past = await db.cases.find({"customer_id": cid, "company_id": user["company_id"]}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return {"customer": c, "past_cases": past}


# ---------- Queues ----------
@api.get("/queues")
async def list_queues(user: dict = Depends(current_user)):
    queues = await db.queues.find({"company_id": user["company_id"]}, {"_id": 0}).to_list(200)
    # Enrich with counts
    for q in queues:
        q["open_count"] = await db.cases.count_documents({"queue_id": q["id"], "status": "open"})
        q["pending_count"] = await db.cases.count_documents({"queue_id": q["id"], "status": "pending"})
        # at_risk approximate: fetch and evaluate
        cases = await db.cases.find({"queue_id": q["id"], "status": {"$in": ["open", "pending"]}}, {"_id": 0}).to_list(1000)
        q["at_risk_count"] = sum(1 for c in cases if sla_status(c) in ("breached", "at_risk"))
    return queues


# ---------- Cases ----------
def _authorize_case_visibility(case: dict, user: dict) -> bool:
    if case["company_id"] != user["company_id"]:
        return False
    if user["role"] in ("lead", "admin"):
        return True
    # agent: assigned or unassigned in company
    return case.get("assigned_user_id") in (user["id"], None)


@api.get("/cases")
async def list_cases(
    user: dict = Depends(current_user),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    queue_id: Optional[str] = None,
    channel: Optional[str] = None,
    tag: Optional[str] = None,
    assignee: Optional[str] = None,
    mine_only: bool = False,
    limit: int = 200,
):
    q: Dict[str, Any] = {"company_id": user["company_id"]}
    if status:
        q["status"] = status
    if priority:
        q["priority"] = priority
    if queue_id:
        q["queue_id"] = queue_id
    if channel:
        q["channel"] = channel
    if tag:
        q["tags"] = tag
    if assignee:
        q["assigned_user_id"] = assignee
    if user["role"] == "agent" and mine_only:
        q["assigned_user_id"] = user["id"]

    docs = await db.cases.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for d in docs:
        d["sla_status"] = sla_status(d)
    return docs


@api.get("/cases/{case_id}")
async def get_case(case_id: str, user: dict = Depends(current_user)):
    c = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not c or not _authorize_case_visibility(c, user):
        raise HTTPException(404, "Case not found")
    c["sla_status"] = sla_status(c)
    customer = await db.customers.find_one({"id": c["customer_id"]}, {"_id": 0})
    past = await db.cases.find({"customer_id": c["customer_id"], "id": {"$ne": case_id}}, {"_id": 0}).sort("created_at", -1).to_list(10)
    events = await db.case_events.find({"case_id": case_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    # Suggestions
    macros = await db.macros.find({"company_id": user["company_id"]}, {"_id": 0}).to_list(500)
    kb = await db.knowledge_items.find({"company_id": user["company_id"]}, {"_id": 0}).to_list(500)
    case_text = f"{c['subject']} {c['description']} {' '.join(c.get('tags', []))} {c.get('ai_topic','')}"

    # Score macros with condition match bonus
    def macro_score(m):
        base = score_similarity(case_text, m.get("name", "") + " " + m.get("body", ""))
        cond = m.get("conditions", {}) or {}
        bonus = 0
        if cond.get("topic") and cond["topic"] == c.get("ai_topic"):
            bonus += 0.5
        if cond.get("channel") and cond["channel"] == c.get("channel"):
            bonus += 0.2
        if cond.get("segment") and customer and cond["segment"] == customer.get("segment"):
            bonus += 0.4
        if cond.get("risk") and cond["risk"] == c.get("ai_risk"):
            bonus += 0.3
        if cond.get("tag") and cond["tag"] in c.get("tags", []):
            bonus += 0.4
        return base + bonus

    ranked_macros = sorted(macros, key=macro_score, reverse=True)[:3]
    ranked_kb = rank_matches(case_text, kb, "body", top_k=3)

    return {
        "case": c,
        "customer": customer,
        "past_cases": past,
        "events": events,
        "macro_suggestions": ranked_macros,
        "knowledge_suggestions": ranked_kb,
    }


@api.post("/cases")
async def create_case(payload: CaseCreate, user: dict = Depends(current_user)):
    customer = await db.customers.find_one({"id": payload.customer_id, "company_id": user["company_id"]}, {"_id": 0})
    if not customer:
        raise HTTPException(404, "Customer not found")

    # AI classification
    ai_result = await classify_case(payload.subject, payload.description,
                                    customer_context=f"segment={customer['segment']}, risk={customer['risk_level']}, tags={customer.get('tags', [])}")

    case = Case(
        subject=payload.subject, description=payload.description, channel=payload.channel,
        priority=payload.priority, company_id=user["company_id"],
        customer_id=payload.customer_id, tags=payload.tags + [ai_result["topic"]],
        ai_topic=ai_result["topic"], ai_intent=ai_result["intent"],
        ai_risk=ai_result["risk"], ai_summary=ai_result["summary"],
    )
    # override priority if AI says high risk
    if not payload.priority or payload.priority == "medium":
        case.priority = priority_from_ai(case.ai_risk, customer.get("segment"))

    # Route to queue
    queues = await db.queues.find({"company_id": user["company_id"]}, {"_id": 0}).to_list(200)
    case.queue_id = match_queue(case.model_dump(), queues, customer)

    # SLA
    queue = next((q for q in queues if q["id"] == case.queue_id), None)
    if queue:
        sla = compute_sla_due(case.created_at, queue["sla_profile"])
        case.sla_due_at = sla["sla_due_at"]
        case.first_response_due_at = sla["first_response_due_at"]

    # Assign to lowest-load agent in company
    agents = await db.users.find({"company_id": user["company_id"], "role": "agent"}, {"_id": 0}).to_list(200)
    if agents:
        # workload
        workload = {}
        for a in agents:
            workload[a["id"]] = await db.cases.count_documents({"assigned_user_id": a["id"], "status": {"$in": ["open", "pending"]}})
        case.assigned_user_id = pick_agent(agents, workload)

    await db.cases.insert_one(case.model_dump())
    await log_event(case.id, "created", "user", user["id"], {"channel": case.channel})
    await log_event(case.id, "ai_classification", "system", None, {"topic": case.ai_topic, "intent": case.ai_intent, "risk": case.ai_risk})
    return case.model_dump()


@api.patch("/cases/{case_id}")
async def update_case(case_id: str, payload: CaseUpdate, user: dict = Depends(current_user)):
    c = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not c or not _authorize_case_visibility(c, user):
        raise HTTPException(404, "Case not found")
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    events = []
    if "status" in updates and updates["status"] != c.get("status"):
        events.append(("status_change", {"from": c.get("status"), "to": updates["status"]}))
        if updates["status"] in ("solved", "closed") and not c.get("closed_at"):
            updates["closed_at"] = iso_now()
            if not c.get("first_response_at"):
                updates["first_response_at"] = iso_now()
        if updates["status"] == "open" and c.get("status") in ("solved", "closed"):
            updates["reopened_count"] = int(c.get("reopened_count", 0)) + 1
    if "assigned_user_id" in updates and updates["assigned_user_id"] != c.get("assigned_user_id"):
        events.append(("reassignment", {"from": c.get("assigned_user_id"), "to": updates["assigned_user_id"]}))
    if "tags" in updates:
        events.append(("tag_update", {"tags": updates["tags"]}))
    await db.cases.update_one({"id": case_id}, {"$set": updates})
    for etype, payload_e in events:
        await log_event(case_id, etype, "user", user["id"], payload_e)
    updated = await db.cases.find_one({"id": case_id}, {"_id": 0})
    updated["sla_status"] = sla_status(updated)
    return updated


@api.post("/cases/{case_id}/notes")
async def add_note(case_id: str, body: NoteCreate, user: dict = Depends(current_user)):
    c = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not c or not _authorize_case_visibility(c, user):
        raise HTTPException(404, "Case not found")
    # First response timing
    updates = {}
    if not c.get("first_response_at"):
        updates["first_response_at"] = iso_now()
        await db.cases.update_one({"id": case_id}, {"$set": updates})
    await log_event(case_id, "note", "user", user["id"], {"body": body.body, "author": user["name"]})
    return {"ok": True}


@api.post("/cases/{case_id}/ai-draft")
async def ai_draft(case_id: str, user: dict = Depends(current_user)):
    c = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not c or not _authorize_case_visibility(c, user):
        raise HTTPException(404, "Case not found")
    customer = await db.customers.find_one({"id": c["customer_id"]}, {"_id": 0}) or {}
    kb = await db.knowledge_items.find({"company_id": user["company_id"]}, {"_id": 0}).to_list(200)
    case_text = f"{c['subject']} {c['description']} {c.get('ai_topic','')}"
    ranked_kb = rank_matches(case_text, kb, "body", top_k=3)
    draft = await draft_reply(c, customer, ranked_kb)
    # High-risk queues: require human confirmation before send (frontend gate)
    requires_confirmation = c.get("ai_risk") == "high" or c.get("ai_topic") in ("security", "withdrawal", "kyc")
    await log_event(case_id, "ai_classification", "system", None,
                    {"action": "draft_generated", "grounded_kb": [k["id"] for k in ranked_kb], "requires_confirmation": requires_confirmation})
    return {"draft": draft, "requires_confirmation": requires_confirmation, "grounded_kb": ranked_kb}


@api.post("/cases/bulk-reassign")
async def bulk_reassign(case_ids: List[str], assigned_user_id: str, user: dict = Depends(current_user)):
    if user["role"] not in ("lead", "admin"):
        raise HTTPException(403, "Only leads/admins")
    await db.cases.update_many(
        {"id": {"$in": case_ids}, "company_id": user["company_id"]},
        {"$set": {"assigned_user_id": assigned_user_id}},
    )
    for cid in case_ids:
        await log_event(cid, "reassignment", "user", user["id"], {"to": assigned_user_id, "bulk": True})
    return {"updated": len(case_ids)}


# ---------- Knowledge & Macros ----------
@api.get("/knowledge")
async def list_kb(user: dict = Depends(current_user)):
    return await db.knowledge_items.find({"company_id": user["company_id"]}, {"_id": 0}).sort("title", 1).to_list(500)


@api.post("/knowledge")
async def create_kb(item: KnowledgeItem, user: dict = Depends(current_user)):
    if user["role"] not in ("lead", "admin"):
        raise HTTPException(403, "Only leads/admins")
    item.company_id = user["company_id"]
    item.owner_user_id = user["id"]
    item.last_reviewed_at = iso_now()
    await db.knowledge_items.insert_one(item.model_dump())
    return item.model_dump()


@api.get("/macros")
async def list_macros(user: dict = Depends(current_user)):
    return await db.macros.find({"company_id": user["company_id"]}, {"_id": 0}).sort("name", 1).to_list(500)


@api.post("/macros")
async def create_macro(m: Macro, user: dict = Depends(current_user)):
    if user["role"] not in ("lead", "admin"):
        raise HTTPException(403, "Only leads/admins")
    m.company_id = user["company_id"]
    m.owner_user_id = user["id"]
    await db.macros.insert_one(m.model_dump())
    return m.model_dump()


# ---------- Dashboards ----------
@api.get("/dashboard/agent")
async def agent_dashboard(user: dict = Depends(current_user)):
    my_cases = await db.cases.find({"assigned_user_id": user["id"], "status": {"$in": ["open", "pending"]}}, {"_id": 0}).to_list(500)
    unassigned = await db.cases.find({"company_id": user["company_id"], "assigned_user_id": None, "status": "open"}, {"_id": 0}).to_list(200)
    for c in my_cases + unassigned:
        c["sla_status"] = sla_status(c)
    my_solved_today = await db.cases.count_documents({
        "assigned_user_id": user["id"], "status": "solved",
        "closed_at": {"$gte": (utcnow() - timedelta(hours=24)).isoformat()},
    })
    return {
        "my_open": len(my_cases),
        "my_at_risk": sum(1 for c in my_cases if c["sla_status"] in ("at_risk", "breached")),
        "unassigned_available": len(unassigned),
        "solved_last_24h": my_solved_today,
    }


@api.get("/dashboard/manager")
async def manager_dashboard(user: dict = Depends(current_user)):
    if user["role"] not in ("lead", "admin"):
        raise HTTPException(403, "Insufficient")
    cases = await db.cases.find({"company_id": user["company_id"]}, {"_id": 0}).to_list(5000)
    open_cases = [c for c in cases if c["status"] in ("open", "pending")]
    breached = sum(1 for c in open_cases if sla_status(c) == "breached")
    at_risk = sum(1 for c in open_cases if sla_status(c) == "at_risk")
    # Agent perf
    users = await db.users.find({"company_id": user["company_id"], "role": "agent"}, {"_id": 0}).to_list(200)
    agent_perf = []
    now_ = utcnow()
    week_ago = now_ - timedelta(days=7)
    for u in users:
        u_cases = [c for c in cases if c.get("assigned_user_id") == u["id"]]
        solved = [c for c in u_cases if c.get("status") in ("solved", "closed")]
        reopened = sum(1 for c in u_cases if int(c.get("reopened_count", 0)) > 0)
        # avg first response minutes
        frs = []
        ress = []
        for c in u_cases:
            if c.get("first_response_at"):
                try:
                    a = datetime.fromisoformat(c["created_at"])
                    b = datetime.fromisoformat(c["first_response_at"])
                    frs.append((b - a).total_seconds() / 60)
                except Exception:
                    pass
            if c.get("closed_at"):
                try:
                    a = datetime.fromisoformat(c["created_at"])
                    b = datetime.fromisoformat(c["closed_at"])
                    ress.append((b - a).total_seconds() / 60)
                except Exception:
                    pass
        agent_perf.append({
            "user_id": u["id"], "name": u["name"], "avatar_url": u.get("avatar_url"),
            "open": sum(1 for c in u_cases if c["status"] in ("open", "pending")),
            "handled": len(u_cases),
            "solved": len(solved),
            "avg_first_response_min": round(sum(frs) / len(frs), 1) if frs else 0,
            "avg_resolution_min": round(sum(ress) / len(ress), 1) if ress else 0,
            "reopen_rate": round(reopened / max(len(u_cases), 1) * 100, 1),
        })
    return {
        "totals": {
            "open": len(open_cases),
            "breached": breached,
            "at_risk": at_risk,
            "solved_week": sum(1 for c in cases if c.get("closed_at") and c["closed_at"] >= week_ago.isoformat()),
        },
        "agents": agent_perf,
    }


@api.get("/dashboard/ops")
async def ops_dashboard(user: dict = Depends(current_user)):
    if user["role"] not in ("admin", "lead"):
        raise HTTPException(403, "Insufficient")
    cases = await db.cases.find({"company_id": user["company_id"]}, {"_id": 0}).to_list(10000)
    now_ = utcnow()
    # Backlog trend last 7 days
    trend = []
    for i in range(6, -1, -1):
        day_end = now_ - timedelta(days=i)
        day_start = day_end - timedelta(days=1)
        opened = sum(1 for c in cases if day_start.isoformat() <= c["created_at"] < day_end.isoformat())
        solved = sum(1 for c in cases if c.get("closed_at") and day_start.isoformat() <= c["closed_at"] < day_end.isoformat())
        trend.append({"day": day_end.strftime("%a"), "opened": opened, "solved": solved})

    # SLA adherence
    open_cases = [c for c in cases if c["status"] in ("open", "pending")]
    total_open = max(len(open_cases), 1)
    breached = sum(1 for c in open_cases if sla_status(c) == "breached")
    adherence = round((1 - breached / total_open) * 100, 1)

    # Topic distribution
    topic_counts: Dict[str, int] = {}
    for c in cases:
        t = c.get("ai_topic") or "general"
        topic_counts[t] = topic_counts.get(t, 0) + 1
    topics = [{"topic": k, "count": v} for k, v in sorted(topic_counts.items(), key=lambda kv: -kv[1])]

    # Escalation / reopen trends (weekly totals)
    escalations = await db.case_events.count_documents({"event_type": "escalation"})
    reopens = sum(int(c.get("reopened_count", 0)) for c in cases)

    # VIP impact
    vip_customer_ids = [c["id"] for c in await db.customers.find({"company_id": user["company_id"], "segment": "vip"}, {"_id": 0}).to_list(1000)]
    vip_open = sum(1 for c in open_cases if c.get("customer_id") in vip_customer_ids)
    vip_breached = sum(1 for c in open_cases if c.get("customer_id") in vip_customer_ids and sla_status(c) == "breached")

    return {
        "totals": {
            "open": len(open_cases),
            "breached": breached,
            "sla_adherence_pct": adherence,
            "escalations": escalations,
            "reopens": reopens,
            "vip_open": vip_open,
            "vip_breached": vip_breached,
        },
        "backlog_trend": trend,
        "topics": topics,
    }


# ---------- Incidents (War-Room) ----------
@api.get("/incidents")
async def list_incidents(user: dict = Depends(current_user)):
    docs = await db.incidents.find({"company_id": user["company_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api.get("/incidents/{iid}")
async def get_incident(iid: str, user: dict = Depends(current_user)):
    inc = await db.incidents.find_one({"id": iid, "company_id": user["company_id"]}, {"_id": 0})
    if not inc:
        raise HTTPException(404, "Incident not found")
    linked = await db.cases.find({"id": {"$in": inc.get("linked_case_ids", [])}}, {"_id": 0}).to_list(200)
    for c in linked:
        c["sla_status"] = sla_status(c)
    return {"incident": inc, "cases": linked}


@api.post("/incidents")
async def create_incident(payload: IncidentCreate, user: dict = Depends(current_user)):
    if user["role"] not in ("lead", "admin"):
        raise HTTPException(403, "Only leads/admins")
    inc = Incident(
        title=payload.title, description=payload.description, severity=payload.severity,
        company_id=user["company_id"], commander_user_id=user["id"],
        linked_case_ids=payload.linked_case_ids,
        timeline=[{"ts": iso_now(), "actor": user["name"], "note": f"Incident declared ({payload.severity})."}],
    )
    await db.incidents.insert_one(inc.model_dump())
    return inc.model_dump()


@api.patch("/incidents/{iid}")
async def update_incident(iid: str, payload: IncidentUpdate, user: dict = Depends(current_user)):
    if user["role"] not in ("lead", "admin"):
        raise HTTPException(403, "Only leads/admins")
    inc = await db.incidents.find_one({"id": iid, "company_id": user["company_id"]}, {"_id": 0})
    if not inc:
        raise HTTPException(404, "Not found")
    updates: Dict[str, Any] = {}
    if payload.status:
        updates["status"] = payload.status
        if payload.status == "resolved" and not inc.get("resolved_at"):
            updates["resolved_at"] = iso_now()
            # Generate match report
            metrics = {
                "linked_cases": len(inc.get("linked_case_ids", [])),
                "severity": inc.get("severity"),
                "title": inc.get("title"),
                "description": inc.get("description"),
                "timeline_events": len(inc.get("timeline", [])),
            }
            updates["match_report"] = await generate_weekly_summary(metrics)
    if payload.severity:
        updates["severity"] = payload.severity
    if payload.linked_case_ids is not None:
        updates["linked_case_ids"] = payload.linked_case_ids

    timeline = list(inc.get("timeline", []))
    if payload.note:
        timeline.append({"ts": iso_now(), "actor": user["name"], "note": payload.note})
    if payload.status:
        timeline.append({"ts": iso_now(), "actor": user["name"], "note": f"Status → {payload.status}"})
    updates["timeline"] = timeline

    await db.incidents.update_one({"id": iid}, {"$set": updates})
    return await db.incidents.find_one({"id": iid}, {"_id": 0})


# ---------- Experiments ----------
@api.get("/experiments")
async def list_experiments(user: dict = Depends(current_user)):
    exps = await db.experiments.find({"company_id": user["company_id"]}, {"_id": 0}).to_list(200)
    # Compute simple performance for each
    for e in exps:
        tagged = await db.cases.find({"company_id": user["company_id"], "tags": e["tag"]}, {"_id": 0}).to_list(2000)
        e["case_count"] = len(tagged)
        frs = []
        for c in tagged:
            if c.get("first_response_at"):
                try:
                    a = datetime.fromisoformat(c["created_at"])
                    b = datetime.fromisoformat(c["first_response_at"])
                    frs.append((b - a).total_seconds() / 60)
                except Exception:
                    pass
        e["current_avg_first_response_min"] = round(sum(frs) / len(frs), 1) if frs else 0
    return exps


@api.post("/experiments")
async def create_experiment(payload: ExperimentCreate, user: dict = Depends(current_user)):
    if user["role"] not in ("admin", "lead"):
        raise HTTPException(403, "Only admins/leads")
    exp = Experiment(name=payload.name, hypothesis=payload.hypothesis, tag=payload.tag,
                     company_id=user["company_id"], owner_user_id=user["id"])
    await db.experiments.insert_one(exp.model_dump())
    return exp.model_dump()


# ---------- QA ----------
@api.post("/qa/sample-now")
async def sample_now(user: dict = Depends(current_user)):
    """Trigger a QA sample cycle: pick ~1 solved case per agent from last 7d."""
    if user["role"] not in ("admin", "lead"):
        raise HTTPException(403, "Only admins/leads")
    agents = await db.users.find({"company_id": user["company_id"], "role": "agent"}, {"_id": 0}).to_list(200)
    now_ = utcnow()
    week_ago = (now_ - timedelta(days=7)).isoformat()
    created = 0
    for a in agents:
        solved = await db.cases.find({
            "company_id": user["company_id"], "assigned_user_id": a["id"],
            "status": {"$in": ["solved", "closed"]}, "closed_at": {"$gte": week_ago},
        }, {"_id": 0}).to_list(50)
        if not solved:
            continue
        pick = solved[0]
        sample = QASample(case_id=pick["id"], agent_id=a["id"], company_id=user["company_id"],
                          period_start=week_ago)
        await db.qa_samples.insert_one(sample.model_dump())
        created += 1
    return {"created": created}


@api.get("/qa/samples")
async def list_qa(user: dict = Depends(current_user)):
    if user["role"] not in ("admin", "lead"):
        raise HTTPException(403, "Only admins/leads")
    samples = await db.qa_samples.find({"company_id": user["company_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Enrich
    for s in samples:
        s["case"] = await db.cases.find_one({"id": s["case_id"]}, {"_id": 0})
        s["agent"] = await db.users.find_one({"id": s["agent_id"]}, {"_id": 0, "password_hash": 0})
    return samples


@api.post("/qa/samples/{sid}/review")
async def qa_review(sid: str, payload: QAReviewInput, user: dict = Depends(current_user)):
    if user["role"] not in ("admin", "lead"):
        raise HTTPException(403, "Only admins/leads")
    updates = payload.model_dump()
    updates["reviewed_by"] = user["id"]
    updates["reviewed_at"] = iso_now()
    await db.qa_samples.update_one({"id": sid}, {"$set": updates})
    return await db.qa_samples.find_one({"id": sid}, {"_id": 0})


# ---------- Coaching ----------
@api.get("/coaching")
async def list_coaching(user: dict = Depends(current_user)):
    if user["role"] not in ("admin", "lead"):
        raise HTTPException(403, "Only admins/leads")
    docs = await db.coaching_sessions.find({"company_id": user["company_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for d in docs:
        d["agent"] = await db.users.find_one({"id": d["agent_id"]}, {"_id": 0, "password_hash": 0})
    return docs


@api.post("/coaching")
async def create_coaching(payload: CoachingCreate, user: dict = Depends(current_user)):
    if user["role"] not in ("admin", "lead"):
        raise HTTPException(403, "Only admins/leads")
    session = CoachingSession(
        company_id=user["company_id"], agent_id=payload.agent_id, manager_id=user["id"],
        themes=payload.themes, notes=payload.notes, linked_qa_id=payload.linked_qa_id,
        follow_up_at=payload.follow_up_at,
    )
    await db.coaching_sessions.insert_one(session.model_dump())
    return session.model_dump()


@api.patch("/coaching/{sid}/close")
async def close_coaching(sid: str, user: dict = Depends(current_user)):
    if user["role"] not in ("admin", "lead"):
        raise HTTPException(403, "Only admins/leads")
    await db.coaching_sessions.update_one({"id": sid}, {"$set": {"status": "closed"}})
    return {"ok": True}


# ---------- Weekly Summary ----------
@api.post("/summaries/generate")
async def gen_summary(user: dict = Depends(current_user)):
    if user["role"] not in ("admin", "lead"):
        raise HTTPException(403, "Only admins/leads")
    ops = await ops_dashboard(user)
    metrics = {**ops["totals"], "top_topics": [t["topic"] for t in ops["topics"][:5]], "backlog_trend": ops["backlog_trend"]}
    body = await generate_weekly_summary(metrics)
    now_ = utcnow()
    summary = WeeklySummary(
        company_id=user["company_id"], period_start=(now_ - timedelta(days=7)).isoformat(),
        period_end=now_.isoformat(), body=body, metrics=metrics,
    )
    await db.weekly_summaries.insert_one(summary.model_dump())
    return summary.model_dump()


@api.get("/summaries")
async def list_summaries(user: dict = Depends(current_user)):
    return await db.weekly_summaries.find({"company_id": user["company_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


# ---------- Health ----------
@api.get("/")
async def root():
    return {"service": "Touchline SupportOps Brain", "status": "ok"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def _shutdown():
    client.close()


@app.on_event("startup")
async def _startup():
    # Auto-seed if empty
    if await db.companies.count_documents({}) == 0:
        logger.info("Empty DB — running seed…")
        try:
            import seed as _seed
            await _seed.seed()
        except Exception as e:
            logger.error(f"Seed failed: {e}")
