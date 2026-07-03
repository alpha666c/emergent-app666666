"""Case routing and SLA logic."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional


def parse_iso(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None


def compute_sla_due(created_at: str, sla_profile: Dict[str, Any]) -> Dict[str, str]:
    """Given a queue's SLA profile, compute first_response_due and resolution_due."""
    dt = parse_iso(created_at) or datetime.now(timezone.utc)
    fr = dt + timedelta(minutes=int(sla_profile.get("first_response_minutes", 60)))
    res = dt + timedelta(minutes=int(sla_profile.get("resolution_minutes", 1440)))
    return {"first_response_due_at": fr.isoformat(), "sla_due_at": res.isoformat()}


def sla_status(case: Dict[str, Any]) -> str:
    """Returns 'breached', 'at_risk', or 'healthy'."""
    if case.get("status") in ("solved", "closed"):
        return "healthy"
    due = parse_iso(case.get("sla_due_at"))
    if not due:
        return "healthy"
    now = datetime.now(timezone.utc)
    if now >= due:
        return "breached"
    # at_risk: within 25% of remaining window
    created = parse_iso(case.get("created_at")) or now
    total = (due - created).total_seconds()
    remaining = (due - now).total_seconds()
    if total > 0 and remaining / total <= 0.25:
        return "at_risk"
    return "healthy"


def sla_seconds_remaining(case: Dict[str, Any]) -> int:
    due = parse_iso(case.get("sla_due_at"))
    if not due:
        return 0
    return int((due - datetime.now(timezone.utc)).total_seconds())


def match_queue(case: Dict[str, Any], queues: List[Dict[str, Any]], customer: Dict[str, Any]) -> Optional[str]:
    """Pick the best queue by matching filter_rules against case+customer."""
    best_score = -1
    best_id = None
    for q in queues:
        rules = q.get("filter_rules") or {}
        score = 0
        if not rules:
            score = 0  # catch-all baseline
        else:
            if rules.get("channel") and rules["channel"] == case.get("channel"):
                score += 2
            if rules.get("topic") and rules["topic"] == case.get("ai_topic"):
                score += 3
            if rules.get("segment") and rules["segment"] == customer.get("segment"):
                score += 2
            if rules.get("risk") and rules["risk"] == case.get("ai_risk"):
                score += 2
        if score > best_score:
            best_score = score
            best_id = q["id"]
    return best_id


def pick_agent(agents: List[Dict[str, Any]], workload: Dict[str, int]) -> Optional[str]:
    """Assign to the agent with the lowest current open-case workload."""
    if not agents:
        return None
    return min(agents, key=lambda a: workload.get(a["id"], 0))["id"]


def priority_from_ai(ai_risk: Optional[str], segment: Optional[str]) -> str:
    if ai_risk == "high" or segment == "vip":
        return "critical"
    if ai_risk == "medium" or segment == "premium":
        return "high"
    return "medium"
