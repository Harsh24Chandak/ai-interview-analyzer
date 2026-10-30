"""Job Description Analysis & Resume-to-Job Compatibility Matching API Routes."""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.database.connection import db_session
from app.database.models import parse_json_fields, row_to_dict
from app.schemas.api_schemas import JobAnalyzeRequest
from app.services.ai_service import analyze_job_match_with_ai

router = APIRouter(prefix="/jobs", tags=["Job Description & Skill Matching"])


def _format_jd(row) -> dict:
    d = row_to_dict(row)
    return parse_json_fields(
        d,
        [
            "required_skills",
            "preferred_skills",
            "role_expectations",
            "matching_skills",
            "missing_skills",
            "learning_roadmap",
            "readiness_recommendations",
        ],
    )


@router.post("/analyze", status_code=status.HTTP_201_CREATED)
def analyze_job_description(
    req: JobAnalyzeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Analyze a job description and compare it with the user's uploaded resume."""
    user_id = current_user["id"]
    now = datetime.utcnow().isoformat()

    with db_session() as conn:
        if req.resume_id:
            res_row = conn.execute(
                "SELECT * FROM resumes WHERE id = ? AND user_id = ?",
                (req.resume_id, user_id),
            ).fetchone()
        else:
            res_row = conn.execute(
                "SELECT * FROM resumes WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                (user_id,),
            ).fetchone()

        resume_text = res_row["raw_text"] if res_row else ""
        resume_id = res_row["id"] if res_row else None

        ai_match = analyze_job_match_with_ai(
            job_title=req.job_title.strip(),
            company_name=(req.company_name or "").strip(),
            jd_text=req.raw_text.strip(),
            resume_text=resume_text,
        )

        cur = conn.execute(
            """
            INSERT INTO job_descriptions (
                user_id, job_title, company_name, raw_text, required_skills, preferred_skills,
                experience_requirements, role_expectations, match_percentage, matching_skills,
                missing_skills, learning_roadmap, readiness_recommendations, resume_id, ai_provider, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                req.job_title.strip(),
                (req.company_name or "").strip(),
                req.raw_text.strip(),
                json.dumps(ai_match.required_skills),
                json.dumps(ai_match.preferred_skills),
                ai_match.experience_requirements,
                json.dumps(ai_match.role_expectations),
                ai_match.match_percentage,
                json.dumps(ai_match.matching_skills),
                json.dumps(ai_match.missing_skills),
                json.dumps(ai_match.learning_roadmap),
                json.dumps(ai_match.readiness_recommendations),
                resume_id,
                ai_match.ai_provider,
                now,
            ),
        )
        jd_row = conn.execute("SELECT * FROM job_descriptions WHERE id = ?", (cur.lastrowid,)).fetchone()

    return {
        "message": "Job description analyzed and matched against resume.",
        "job_analysis": _format_jd(jd_row),
    }


@router.get("")
def list_job_analyses(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    with db_session() as conn:
        rows = conn.execute(
            "SELECT * FROM job_descriptions WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
    items = [_format_jd(r) for r in rows]
    return {"job_descriptions": items, "latest_job": items[0] if items else None}
