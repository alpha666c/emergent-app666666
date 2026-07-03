"""APScheduler-driven weekly QA sampling + summary generation."""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from models import QASample, WeeklySummary, iso_now, utcnow
from ai import generate_weekly_summary
from routing import sla_status

logger = logging.getLogger("supportops.scheduler")

_scheduler: AsyncIOScheduler | None = None


async def _log_run(db, job: str, status: str, detail: str = ""):
    await db.job_runs.insert_one({
        "job": job, "status": status, "detail": detail, "ts": iso_now(),
    })


async def run_weekly_qa_sampling(db):
    """Sample ~1 solved case per agent per company from the last 7 days."""
    try:
        companies = await db.companies.find({}, {"_id": 0}).to_list(500)
        now_ = utcnow()
        week_ago = (now_ - timedelta(days=7)).isoformat()
        created_total = 0
        for co in companies:
            agents = await db.users.find({"company_id": co["id"], "role": "agent"}, {"_id": 0}).to_list(500)
            for a in agents:
                solved = await db.cases.find({
                    "company_id": co["id"], "assigned_user_id": a["id"],
                    "status": {"$in": ["solved", "closed"]}, "closed_at": {"$gte": week_ago},
                }, {"_id": 0}).to_list(50)
                if not solved:
                    continue
                pick = solved[0]
                sample = QASample(case_id=pick["id"], agent_id=a["id"],
                                  company_id=co["id"], period_start=week_ago)
                await db.qa_samples.insert_one(sample.model_dump())
                created_total += 1
        await _log_run(db, "weekly_qa_sampling", "success", f"created={created_total}")
        logger.info(f"Weekly QA sampling: created {created_total} samples")
    except Exception as e:
        logger.exception("Weekly QA sampling failed")
        await _log_run(db, "weekly_qa_sampling", "error", str(e))


async def run_weekly_summary(db):
    """Generate a weekly summary per company using ops metrics."""
    try:
        companies = await db.companies.find({}, {"_id": 0}).to_list(500)
        now_ = utcnow()
        generated = 0
        for co in companies:
            cases = await db.cases.find({"company_id": co["id"]}, {"_id": 0}).to_list(10000)
            open_cases = [c for c in cases if c["status"] in ("open", "pending")]
            breached = sum(1 for c in open_cases if sla_status(c) == "breached")
            topic_counts: Dict[str, int] = {}
            for c in cases:
                t = c.get("ai_topic") or "general"
                topic_counts[t] = topic_counts.get(t, 0) + 1
            top_topics = [k for k, _ in sorted(topic_counts.items(), key=lambda kv: -kv[1])[:5]]
            metrics = {
                "open": len(open_cases), "breached": breached,
                "solved_week": sum(1 for c in cases if c.get("closed_at") and c["closed_at"] >= (now_ - timedelta(days=7)).isoformat()),
                "top_topics": top_topics,
                "period_end": now_.isoformat(),
            }
            body = await generate_weekly_summary(metrics)
            summary = WeeklySummary(
                company_id=co["id"], period_start=(now_ - timedelta(days=7)).isoformat(),
                period_end=now_.isoformat(), body=body, metrics=metrics,
            )
            await db.weekly_summaries.insert_one(summary.model_dump())
            generated += 1
        await _log_run(db, "weekly_summary", "success", f"generated={generated}")
        logger.info(f"Weekly summary: generated {generated}")
    except Exception as e:
        logger.exception("Weekly summary failed")
        await _log_run(db, "weekly_summary", "error", str(e))


def start_scheduler(db):
    """Register crons and start. Idempotent — safe to call once at startup."""
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(run_weekly_qa_sampling, CronTrigger(day_of_week="mon", hour=0, minute=0),
                       args=[db], id="weekly_qa_sampling", replace_existing=True, coalesce=True, max_instances=1)
    _scheduler.add_job(run_weekly_summary, CronTrigger(day_of_week="mon", hour=0, minute=15),
                       args=[db], id="weekly_summary", replace_existing=True, coalesce=True, max_instances=1)
    _scheduler.start()
    logger.info("APScheduler started: weekly_qa_sampling (Mon 00:00 UTC), weekly_summary (Mon 00:15 UTC)")
    return _scheduler


def get_scheduler_status() -> Dict[str, Any]:
    if _scheduler is None:
        return {"running": False, "jobs": []}
    jobs = []
    for j in _scheduler.get_jobs():
        jobs.append({
            "id": j.id,
            "next_run": j.next_run_time.isoformat() if j.next_run_time else None,
            "trigger": str(j.trigger),
        })
    return {"running": _scheduler.running, "jobs": jobs}
