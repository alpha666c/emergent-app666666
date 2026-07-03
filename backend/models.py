"""Pydantic models for SupportOps Brain."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Literal
import uuid
from pydantic import BaseModel, Field, ConfigDict, EmailStr


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utcnow().isoformat()


class BaseDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    created_at: str = Field(default_factory=iso_now)


# ---------- Company ----------
class Company(BaseDoc):
    name: str
    description: str = ""
    settings: Dict[str, Any] = Field(default_factory=dict)


# ---------- Team ----------
class Team(BaseDoc):
    name: str
    company_id: str


# ---------- User ----------
Role = Literal["agent", "lead", "admin"]


class User(BaseDoc):
    name: str
    email: str
    password_hash: str
    role: Role = "agent"
    company_id: str
    team_id: Optional[str] = None
    avatar_url: Optional[str] = None


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: Role
    company_id: str
    team_id: Optional[str] = None
    avatar_url: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    company_name: str


# ---------- Customer ----------
class Customer(BaseDoc):
    name: str
    email: str
    phone: Optional[str] = None
    segment: Literal["standard", "premium", "vip"] = "standard"
    risk_level: Literal["low", "medium", "high"] = "low"
    tags: List[str] = Field(default_factory=list)
    company_id: str


# ---------- SLA + Queue ----------
class SlaProfile(BaseModel):
    first_response_minutes: int = 60
    resolution_minutes: int = 1440  # 24h
    warn_at_pct: float = 0.75


class Queue(BaseDoc):
    name: str
    description: str = ""
    company_id: str
    filter_rules: Dict[str, Any] = Field(default_factory=dict)  # {channel, topic, segment}
    sla_profile: SlaProfile = Field(default_factory=SlaProfile)


# ---------- Case ----------
Priority = Literal["low", "medium", "high", "critical"]
Status = Literal["open", "pending", "solved", "closed"]
Channel = Literal["chat", "email", "phone", "other"]


class Case(BaseDoc):
    subject: str
    description: str
    channel: Channel = "email"
    status: Status = "open"
    priority: Priority = "medium"
    sla_due_at: Optional[str] = None
    first_response_due_at: Optional[str] = None
    first_response_at: Optional[str] = None
    closed_at: Optional[str] = None
    company_id: str
    customer_id: str
    assigned_user_id: Optional[str] = None
    queue_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    ai_topic: Optional[str] = None
    ai_intent: Optional[str] = None
    ai_risk: Optional[str] = None
    ai_summary: Optional[str] = None
    reopened_count: int = 0


class CaseCreate(BaseModel):
    subject: str
    description: str
    channel: Channel = "email"
    priority: Priority = "medium"
    customer_id: str
    tags: List[str] = Field(default_factory=list)


class CaseUpdate(BaseModel):
    status: Optional[Status] = None
    priority: Optional[Priority] = None
    assigned_user_id: Optional[str] = None
    queue_id: Optional[str] = None
    tags: Optional[List[str]] = None
    subject: Optional[str] = None


# ---------- Case Event ----------
EventType = Literal[
    "created",
    "status_change",
    "note",
    "escalation",
    "reassignment",
    "tag_update",
    "ai_classification",
    "sla_breach",
]


class CaseEvent(BaseDoc):
    case_id: str
    actor_type: Literal["user", "system"] = "user"
    actor_id: Optional[str] = None
    event_type: EventType
    payload: Dict[str, Any] = Field(default_factory=dict)


class NoteCreate(BaseModel):
    body: str


# ---------- Knowledge & Macro ----------
class KnowledgeItem(BaseDoc):
    title: str
    body: str
    category: str = "general"
    tags: List[str] = Field(default_factory=list)
    company_id: str
    owner_user_id: Optional[str] = None
    last_reviewed_at: Optional[str] = None


class Macro(BaseDoc):
    name: str
    body: str
    conditions: Dict[str, Any] = Field(default_factory=dict)  # tags, topic, channel
    company_id: str
    owner_user_id: Optional[str] = None


# ---------- QA & Weekly Summary ----------
class QASample(BaseDoc):
    case_id: str
    agent_id: str
    company_id: str
    period_start: str
    score_accuracy: Optional[int] = None
    score_tone: Optional[int] = None
    score_policy: Optional[int] = None
    comments: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None


class QAReviewInput(BaseModel):
    score_accuracy: int
    score_tone: int
    score_policy: int
    comments: Optional[str] = ""


class WeeklySummary(BaseDoc):
    company_id: str
    period_start: str
    period_end: str
    body: str
    metrics: Dict[str, Any] = Field(default_factory=dict)


# ---------- Incident (War-Room) ----------
IncidentStatus = Literal["investigating", "mitigating", "resolved"]


class Incident(BaseDoc):
    title: str
    description: str
    status: IncidentStatus = "investigating"
    severity: Literal["sev1", "sev2", "sev3"] = "sev2"
    company_id: str
    commander_user_id: Optional[str] = None
    linked_case_ids: List[str] = Field(default_factory=list)
    timeline: List[Dict[str, Any]] = Field(default_factory=list)  # {ts, actor, note}
    resolved_at: Optional[str] = None
    match_report: Optional[str] = None  # AI generated post-mortem


class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: Literal["sev1", "sev2", "sev3"] = "sev2"
    linked_case_ids: List[str] = Field(default_factory=list)


class IncidentUpdate(BaseModel):
    status: Optional[IncidentStatus] = None
    severity: Optional[Literal["sev1", "sev2", "sev3"]] = None
    note: Optional[str] = None
    linked_case_ids: Optional[List[str]] = None


# ---------- Experiments (Playbooks) ----------
class Experiment(BaseDoc):
    name: str
    hypothesis: str
    tag: str  # tag applied to cases in experiment
    company_id: str
    owner_user_id: Optional[str] = None
    status: Literal["draft", "running", "completed"] = "running"
    started_at: str = Field(default_factory=iso_now)
    ended_at: Optional[str] = None
    baseline: Dict[str, Any] = Field(default_factory=dict)


class ExperimentCreate(BaseModel):
    name: str
    hypothesis: str
    tag: str


# ---------- Coaching ----------
class CoachingSession(BaseDoc):
    company_id: str
    agent_id: str
    manager_id: str
    themes: List[str] = Field(default_factory=list)  # tone, accuracy, policy
    notes: str
    linked_qa_id: Optional[str] = None
    follow_up_at: Optional[str] = None
    status: Literal["open", "closed"] = "open"


class CoachingCreate(BaseModel):
    agent_id: str
    themes: List[str]
    notes: str
    linked_qa_id: Optional[str] = None
    follow_up_at: Optional[str] = None
