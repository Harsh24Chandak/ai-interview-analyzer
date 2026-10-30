"""Dashboard & Performance Analytics API Routes."""
from typing import Any, Dict, List
from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.config import settings
from app.database.connection import db_session
from app.database.models import parse_json_fields, row_to_dict

router = APIRouter(prefix="/analytics", tags=["Performance Analytics & Dashboard"])


@router.get("/dashboard")
def get_dashboard_overview(current_user: dict = Depends(get_current_user)):
    """Return personalized dashboard metrics, recent interviews, resume score, job match score, and next actions."""
    user_id = current_user["id"]
    with db_session() as conn:
        completed_rows = conn.execute(
            "SELECT * FROM interview_sessions WHERE user_id = ? AND status = 'completed' ORDER BY id DESC",
            (user_id,),
        ).fetchall()
        all_sessions = conn.execute(
            "SELECT * FROM interview_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 6",
            (user_id,),
        ).fetchall()
        latest_resume_an = conn.execute(
            "SELECT * FROM resume_analyses WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (user_id,),
        ).fetchone()
        latest_job = conn.execute(
            "SELECT * FROM job_descriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (user_id,),
        ).fetchone()
        bookmarks_cnt = conn.execute(
            "SELECT COUNT(*) AS cnt FROM interview_questions WHERE user_id = ? AND is_bookmarked = 1",
            (user_id,),
        ).fetchone()["cnt"]

    total_completed = len(completed_rows)
    avg_interview_score = (
        int(round(sum(r["overall_score"] for r in completed_rows) / total_completed))
        if total_completed > 0
        else 0
    )
    avg_comm_score = (
        int(round(sum(r["communication_score"] for r in completed_rows) / total_completed))
        if total_completed > 0
        else 0
    )
    avg_tech_score = (
        int(round(sum(r["technical_score"] for r in completed_rows) / total_completed))
        if total_completed > 0
        else 0
    )

    resume_score = latest_resume_an["overall_score"] if latest_resume_an else 0
    job_match_score = latest_job["match_percentage"] if latest_job else 0

    # Calculate preparation readiness index (weighted across resume, job match, and completed interviews)
    prep_progress = min(
        100,
        int(
            round(
                (min(3, total_completed) / 3.0) * 40
                + (resume_score / 100.0) * 30
                + (job_match_score / 100.0) * 30
            )
        ),
    )

    skills_to_improve = []
    if latest_resume_an:
        an_dict = parse_json_fields(row_to_dict(latest_resume_an), ["missing_skills"])
        skills_to_improve.extend(an_dict.get("missing_skills", []))
    if latest_job:
        jd_dict = parse_json_fields(row_to_dict(latest_job), ["missing_skills"])
        skills_to_improve.extend(jd_dict.get("missing_skills", []))
    for r in completed_rows[:3]:
        sd = parse_json_fields(row_to_dict(r), ["recommended_topics"])
        skills_to_improve.extend(sd.get("recommended_topics", []))
    skills_to_improve = list(dict.fromkeys(skills_to_improve))[:6]
    if not skills_to_improve:
        skills_to_improve = ["System Design & Scalability", "Redis & Distributed Caching", "Automated Testing (Pytest)", "STAR Behavioral Storytelling", "SQL Query Optimization", "Cloud Deployment (AWS/Docker)"]

    recommended_actions = []
    if not latest_resume_an:
        recommended_actions.append(
            {"title": "Upload & Analyze Your Resume", "description": "Extract skills, ATS score, and improvement tips.", "route": "/resume-analyzer", "priority": "High"}
        )
    if not latest_job:
        recommended_actions.append(
            {"title": "Run Job Description Compatibility Match", "description": "Compare your resume against a target job description.", "route": "/job-analyzer", "priority": "High"}
        )
    recommended_actions.append(
        {"title": "Start a Targeted AI Mock Interview", "description": f"Practice {current_user.get('target_role', 'Full Stack')} questions with live rubric feedback.", "route": "/interview/setup", "priority": "Primary"}
    )

    recent_sessions = [
        parse_json_fields(row_to_dict(s), ["strengths", "weaknesses", "recommended_topics"])
        for s in all_sessions
    ]
    trend_series = [
        {
            "session": f"#{r['id']}",
            "date": (r["completed_at"] or r["created_at"])[:10],
            "role": r["job_role"],
            "type": r["interview_type"],
            "overall": r["overall_score"],
            "technical": r["technical_score"],
            "communication": r["communication_score"],
        }
        for r in reversed(completed_rows[:8])
    ]

    is_baseline_projection = False
    if not trend_series:
        is_baseline_projection = True
        trend_series = [
            {"session": "Baseline", "date": "Target Start", "role": current_user.get("target_role", "Full Stack"), "type": "Benchmark", "overall": 62, "technical": 60, "communication": 65},
            {"session": "Milestone 1", "date": "Session 1 Goal", "role": current_user.get("target_role", "Full Stack"), "type": "Technical", "overall": 74, "technical": 75, "communication": 72},
            {"session": "Milestone 2", "date": "Session 2 Goal", "role": current_user.get("target_role", "Full Stack"), "type": "Behavioral", "overall": 82, "technical": 80, "communication": 85},
            {"session": "Hiring Bar", "date": "Target Ready", "role": current_user.get("target_role", "Full Stack"), "type": "Resume-Based", "overall": 90, "technical": 92, "communication": 88},
        ]

    return {
        "is_baseline_projection": is_baseline_projection,
        "stats": {
            "total_interviews_completed": total_completed,
            "average_interview_score": avg_interview_score,
            "average_technical_score": avg_tech_score,
            "average_communication_score": avg_comm_score,
            "resume_analysis_score": resume_score,
            "job_match_score": job_match_score,
            "preparation_progress": prep_progress,
            "bookmarked_questions_count": bookmarks_cnt,
            "ai_mode": "gemini_live" if settings.is_live_ai_configured else "deterministic_fallback_engine",
        },
        "recent_sessions": recent_sessions,
        "performance_trends": trend_series,
        "skills_needing_improvement": skills_to_improve,
        "recommended_actions": recommended_actions,
    }


@router.get("/performance")
def get_performance_analytics(current_user: dict = Depends(get_current_user)):
    """Return comprehensive performance charts: score trends, Technical vs HR breakdown, 7-dimension rubric radar, and topic strengths."""
    user_id = current_user["id"]
    with db_session() as conn:
        completed_rows = conn.execute(
            "SELECT * FROM interview_sessions WHERE user_id = ? AND status = 'completed' ORDER BY id ASC",
            (user_id,),
        ).fetchall()
        eval_rows = conn.execute(
            """
            SELECT e.*, q.topic, q.category
            FROM interview_evaluations e
            JOIN interview_questions q ON q.id = e.question_id
            WHERE e.user_id = ?
            ORDER BY e.id ASC
            """,
            (user_id,),
        ).fetchall()
        ans_rows = conn.execute(
            "SELECT * FROM interview_answers WHERE user_id = ? ORDER BY id ASC",
            (user_id,),
        ).fetchall()

    score_trends = [
        {
            "id": r["id"],
            "label": f"Session #{r['id']} ({r['interview_type']})",
            "date": (r["completed_at"] or r["created_at"])[:10],
            "overall_score": r["overall_score"],
            "technical_score": r["technical_score"],
            "communication_score": r["communication_score"],
            "problem_solving_score": r["problem_solving_score"],
            "confidence_score": r["confidence_score"],
        }
        for r in completed_rows
    ]

    # Category comparison (Technical vs HR vs Behavioral vs Situational vs Resume-Based vs Job-Description-Based)
    by_cat: Dict[str, List[int]] = {}
    for r in completed_rows:
        cat = r["interview_type"]
        by_cat.setdefault(cat, []).append(r["overall_score"])
    category_performance = [
        {"category": cat, "average_score": int(round(sum(scores) / len(scores))), "sessions": len(scores)}
        for cat, scores in by_cat.items()
    ]

    # 7-Dimension Rubric Averages
    if eval_rows:
        n = len(eval_rows)
        rubric_dimensions = [
            {"dimension": "Relevance", "score": int(round(sum(e["relevance_score"] for e in eval_rows) / n))},
            {"dimension": "Technical Accuracy", "score": int(round(sum(e["technical_accuracy_score"] for e in eval_rows) / n))},
            {"dimension": "Completeness", "score": int(round(sum(e["completeness_score"] for e in eval_rows) / n))},
            {"dimension": "Clarity", "score": int(round(sum(e["clarity_score"] for e in eval_rows) / n))},
            {"dimension": "Communication", "score": int(round(sum(e["communication_score"] for e in eval_rows) / n))},
            {"dimension": "Problem Solving", "score": int(round(sum(e["problem_solving_score"] for e in eval_rows) / n))},
            {"dimension": "Practical Depth", "score": int(round(sum(e["practical_understanding_score"] for e in eval_rows) / n))},
        ]
    else:
        rubric_dimensions = [
            {"dimension": d, "score": 0}
            for d in ["Relevance", "Technical Accuracy", "Completeness", "Clarity", "Communication", "Problem Solving", "Practical Depth"]
        ]

    # Topic-wise breakdown
    by_topic: Dict[str, List[int]] = {}
    for e in eval_rows:
        t = e["topic"] or "General"
        by_topic.setdefault(t, []).append(e["overall_score"])
    topic_breakdown = sorted(
        [
            {"topic": t, "average_score": int(round(sum(vals) / len(vals))), "questions_answered": len(vals)}
            for t, vals in by_topic.items()
        ],
        key=lambda x: x["average_score"],
        reverse=True,
    )

    total_words = sum(a["word_count"] for a in ans_rows)
    total_fillers = sum(a["filler_word_count"] for a in ans_rows)

    return {
        "score_trends": score_trends,
        "category_performance": category_performance,
        "rubric_dimensions": rubric_dimensions,
        "topic_breakdown": topic_breakdown,
        "communication_metrics": {
            "total_answers_evaluated": len(ans_rows),
            "average_words_per_answer": int(round(total_words / len(ans_rows))) if ans_rows else 0,
            "total_filler_words": total_fillers,
            "filler_rate_percentage": round((total_fillers / max(1, total_words)) * 100, 2),
        },
    }
