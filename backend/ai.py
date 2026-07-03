"""AI helpers for classification, matching, and summaries."""
import os
import json
import re
import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-5-20250929"


# PII patterns — cards, IBANs, emails, phone, long numeric IDs, wallet-like hex
_PII_PATTERNS = [
    (re.compile(r"\b(?:\d[ -]*?){13,19}\b"), "[REDACTED_CARD]"),
    (re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b"), "[REDACTED_IBAN]"),
    (re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b"), "[REDACTED_EMAIL]"),
    (re.compile(r"\b0x[a-fA-F0-9]{20,}\b"), "[REDACTED_WALLET]"),
    (re.compile(r"\+?\d[\d\s().-]{9,}\d"), "[REDACTED_PHONE]"),
]


def redact_pii(text: str) -> str:
    if not text:
        return text
    out = text
    for pat, repl in _PII_PATTERNS:
        out = pat.sub(repl, out)
    return out



def _fallback_classify(subject: str, description: str) -> Dict[str, str]:
    """Simple keyword fallback if AI call fails."""
    text = (subject + " " + description).lower()
    topic = "general"
    intent = "question"
    risk = "low"

    topic_keywords = {
        "withdrawal": ["withdraw", "withdrawal", "cashout"],
        "deposit": ["deposit", "top up", "top-up", "topup"],
        "kyc": ["kyc", "verify", "verification", "identity", "document"],
        "trading": ["trade", "trading", "order", "position", "leverage"],
        "account": ["login", "password", "2fa", "account", "locked"],
        "billing": ["invoice", "billing", "charge", "refund", "payment"],
        "security": ["hack", "phishing", "unauthorized", "compromised", "fraud"],
        "api": ["api", "webhook", "integration", "sdk"],
    }
    for t, kws in topic_keywords.items():
        if any(k in text for k in kws):
            topic = t
            break

    if any(k in text for k in ["cancel", "refund", "close account"]):
        intent = "cancel"
    elif any(k in text for k in ["urgent", "asap", "immediately", "critical"]):
        intent = "escalation"
    elif any(k in text for k in ["complaint", "unhappy", "frustrated", "angry"]):
        intent = "complaint"
    elif any(k in text for k in ["help", "how to", "how do i"]):
        intent = "help"

    if any(k in text for k in ["hack", "unauthorized", "fraud", "stolen", "compromised", "phishing"]):
        risk = "high"
    elif any(k in text for k in ["urgent", "large amount", "vip", "escalate"]):
        risk = "medium"

    return {"topic": topic, "intent": intent, "risk": risk, "summary": subject[:120]}


async def classify_case(subject: str, description: str, customer_context: str = "") -> Dict[str, str]:
    """Returns {topic, intent, risk, summary} using Claude Sonnet 4.5."""
    # PII redaction before sending to LLM (guardrail)
    safe_subject = redact_pii(subject)
    safe_description = redact_pii(description)
    if not EMERGENT_LLM_KEY:
        return _fallback_classify(safe_subject, safe_description)
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"classify-{subject[:20]}",
            system_message=(
                "You are an expert customer support triage AI for high-volume digital businesses "
                "(crypto exchanges, fintechs, SaaS). You classify support cases. "
                "Respond ONLY with a compact JSON object with keys: topic, intent, risk, summary. "
                "topic ∈ {withdrawal, deposit, kyc, trading, account, billing, security, api, general}. "
                "intent ∈ {question, complaint, cancel, escalation, help, feedback, bug_report}. "
                "risk ∈ {low, medium, high}. summary: <=120 chars neutral one-liner."
            ),
        ).with_model(MODEL_PROVIDER, MODEL_NAME)

        user_text = (
            f"CUSTOMER CONTEXT: {customer_context}\n\n"
            f"CASE SUBJECT: {subject}\n\n"
            f"CASE DESCRIPTION: {description}\n\n"
            "Respond with JSON only. No prose."
        )
        result = await chat.send_message(UserMessage(text=user_text))
        text = result if isinstance(result, str) else str(result)
        # Extract JSON
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            parsed = json.loads(text[start:end + 1])
            return {
                "topic": str(parsed.get("topic", "general")).lower(),
                "intent": str(parsed.get("intent", "question")).lower(),
                "risk": str(parsed.get("risk", "low")).lower(),
                "summary": str(parsed.get("summary", subject))[:160],
            }
    except Exception as e:
        logger.warning(f"AI classify failed, using fallback: {e}")
    return _fallback_classify(subject, description)


async def generate_weekly_summary(metrics: Dict[str, Any]) -> str:
    if not EMERGENT_LLM_KEY:
        return (
            f"Weekly Ops Summary\n\n"
            f"- Cases opened: {metrics.get('opened', 0)}\n"
            f"- Cases solved: {metrics.get('solved', 0)}\n"
            f"- SLA breaches: {metrics.get('sla_breaches', 0)}\n"
            f"- Escalations: {metrics.get('escalations', 0)}\n"
            f"Top topics: {', '.join(metrics.get('top_topics', []))}"
        )
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"summary-{metrics.get('period_end', 'week')}",
            system_message=(
                "You are a support ops analyst. Given weekly metrics JSON, produce a concise "
                "leadership summary in Markdown with sections: Highlights, Risk Areas, Recommendations. "
                "Be direct, quantitative, no fluff. 200-300 words."
            ),
        ).with_model(MODEL_PROVIDER, MODEL_NAME)
        text = await chat.send_message(UserMessage(text=json.dumps(metrics, indent=2)))
        return text if isinstance(text, str) else str(text)
    except Exception as e:
        logger.warning(f"AI summary failed: {e}")
        return (
            f"Weekly Ops Summary (fallback)\n\n"
            f"- Cases opened: {metrics.get('opened', 0)}\n"
            f"- Cases solved: {metrics.get('solved', 0)}\n"
            f"- SLA breaches: {metrics.get('sla_breaches', 0)}\n"
            f"- Escalations: {metrics.get('escalations', 0)}\n"
            f"Top topics: {', '.join(metrics.get('top_topics', []))}"
        )

async def draft_reply(case: Dict[str, Any], customer: Dict[str, Any], kb_snippets: List[Dict[str, Any]]) -> str:
    """Generate an agent reply draft grounded in case + KB. PII-redacted input."""
    safe_desc = redact_pii(case.get("description", ""))
    kb_text = "\n\n".join([f"- {k.get('title')}: {redact_pii(k.get('body',''))[:400]}" for k in kb_snippets[:3]])
    ctx = (
        f"CUSTOMER: {customer.get('name','the customer')} (segment={customer.get('segment')}, risk={customer.get('risk_level')})\n"
        f"CASE SUBJECT: {case.get('subject')}\n"
        f"CHANNEL: {case.get('channel')} | TOPIC: {case.get('ai_topic')} | INTENT: {case.get('ai_intent')} | RISK: {case.get('ai_risk')}\n\n"
        f"CASE DESCRIPTION:\n{safe_desc}\n\n"
        f"RELEVANT KNOWLEDGE:\n{kb_text if kb_text else '(none)'}\n"
    )
    fallback = (
        f"Hi {customer.get('name','there')},\n\nThanks for reaching out about \"{case.get('subject')}\". "
        f"We're reviewing your case and will follow up shortly. "
        f"If you have any additional information that could help us investigate, please share it.\n\nBest regards,\nSupport Team"
    )
    if not EMERGENT_LLM_KEY:
        return fallback
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"draft-{case.get('id','x')[:8]}",
            system_message=(
                "You are an expert customer support agent for a high-volume digital business "
                "(crypto exchanges, fintechs, SaaS). Draft a concise, warm, policy-compliant reply. "
                "Rules: (1) Only reference facts from the provided context or knowledge — NEVER invent account "
                "actions, balances, refunds, or timelines. (2) If context is insufficient, ask ONE clarifying "
                "question. (3) 90-180 words. (4) Do not use marketing language. (5) Sign off as 'Support Team'."
            ),
        ).with_model(MODEL_PROVIDER, MODEL_NAME)
        text = await chat.send_message(UserMessage(text=ctx + "\nWrite the reply now."))
        return text if isinstance(text, str) else str(text)
    except Exception as e:
        logger.warning(f"AI draft failed: {e}")
        return fallback


def score_similarity(text_a: str, text_b: str) -> float:
    if not text_a or not text_b:
        return 0.0
    a = set(text_a.lower().split())
    b = set(text_b.lower().split())
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def rank_matches(case_text: str, items: List[Dict[str, Any]], text_field: str, top_k: int = 3) -> List[Dict[str, Any]]:
    scored = []
    for it in items:
        score = score_similarity(case_text, it.get(text_field, "") + " " + " ".join(it.get("tags", [])))
        scored.append((score, it))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [it for _, it in scored[:top_k]]
