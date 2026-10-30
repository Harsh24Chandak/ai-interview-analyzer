"""Resume Upload, Extraction & AI Resume Intelligence API Routes."""
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.deps import get_current_user
from app.database.connection import db_session
from app.database.models import parse_json_fields, row_to_dict
from app.schemas.api_schemas import ResumeAnalyzeRequest, BulletRewriteRequest
from app.services.ai_service import analyze_resume_with_ai, rewrite_resume_bullets_xyz
from app.services.resume_parser import extract_text_from_bytes, extract_structured_resume_metadata

router = APIRouter(prefix="/resumes", tags=["Resume Intelligence"])


def _format_analysis(row) -> Optional[dict]:
    if not row:
        return None
    d = row_to_dict(row)
    return parse_json_fields(
        d,
        [
            "extracted_skills",
            "experience_summary",
            "education_summary",
            "projects_summary",
            "strengths",
            "weaknesses",
            "missing_skills",
            "improvement_recommendations",
        ],
    )


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_and_analyze_resume(
    file: UploadFile = File(...),
    target_role: str = Form("Full Stack Software Engineer"),
    current_user: dict = Depends(get_current_user),
):
    """Upload a PDF, DOCX, or TXT resume, extract text, and run AI Resume Intelligence."""
    content = await file.read()
    safe_filename = (file.filename or "resume.pdf").replace("/", "_").replace("\\", "_")
    file_type, extracted_text = extract_text_from_bytes(safe_filename, content)

    target_role_clean = target_role or current_user.get("target_role") or "Full Stack Software Engineer"
    meta = extract_structured_resume_metadata(extracted_text, target_role_clean)
    ai_result = analyze_resume_with_ai(extracted_text, target_role_clean)

    now = datetime.utcnow().isoformat()
    user_id = current_user["id"]

    parsed_payload = {
        "technical_skills": ai_result.technical_skills or meta["technical_skills"],
        "soft_skills": ai_result.soft_skills or meta["soft_skills"],
        "education": ai_result.education_summary or meta["education"],
        "experience": ai_result.experience_summary or meta["experience"],
        "projects": ai_result.projects_summary or meta["projects"],
    }

    with db_session() as conn:
        cur = conn.execute(
            """
            INSERT INTO resumes (user_id, filename, file_type, file_size, raw_text, parsed_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                safe_filename,
                file_type,
                len(content),
                extracted_text,
                json.dumps(parsed_payload),
                now,
            ),
        )
        resume_id = cur.lastrowid

        cur_an = conn.execute(
            """
            INSERT INTO resume_analyses (
                user_id, resume_id, target_role, overall_score, ats_compatibility_score,
                impact_score, technical_depth_score, extracted_skills, experience_summary,
                education_summary, projects_summary, strengths, weaknesses, missing_skills,
                improvement_recommendations, ai_provider, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                resume_id,
                target_role_clean,
                ai_result.overall_score,
                ai_result.ats_compatibility_score,
                ai_result.impact_score,
                ai_result.technical_depth_score,
                json.dumps(
                    {
                        "technical_skills": parsed_payload["technical_skills"],
                        "soft_skills": parsed_payload["soft_skills"],
                    }
                ),
                json.dumps(parsed_payload["experience"]),
                json.dumps(parsed_payload["education"]),
                json.dumps(parsed_payload["projects"]),
                json.dumps(ai_result.strengths),
                json.dumps(ai_result.weaknesses),
                json.dumps(ai_result.missing_skills),
                json.dumps(ai_result.improvement_recommendations),
                ai_result.ai_provider,
                now,
            ),
        )
        analysis_id = cur_an.lastrowid
        analysis_row = conn.execute("SELECT * FROM resume_analyses WHERE id = ?", (analysis_id,)).fetchone()
        resume_row = conn.execute("SELECT * FROM resumes WHERE id = ?", (resume_id,)).fetchone()

    resume_dict = parse_json_fields(row_to_dict(resume_row), ["parsed_data"])
    return {
        "message": "Resume uploaded, parsed, and analyzed successfully.",
        "resume": resume_dict,
        "analysis": _format_analysis(analysis_row),
    }


@router.post("/analyze")
def analyze_resume_text_or_id(
    req: ResumeAnalyzeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Run or re-run AI Resume Intelligence on an existing uploaded resume or raw resume text."""
    user_id = current_user["id"]
    now = datetime.utcnow().isoformat()
    target_role = req.target_role or current_user.get("target_role") or "Full Stack Software Engineer"

    with db_session() as conn:
        if req.resume_id:
            res_row = conn.execute(
                "SELECT * FROM resumes WHERE id = ? AND user_id = ?",
                (req.resume_id, user_id),
            ).fetchone()
            if not res_row:
                raise HTTPException(status_code=404, detail="Resume not found.")
            raw_text = res_row["raw_text"]
            resume_id = res_row["id"]
        elif req.raw_text and len(req.raw_text.strip()) >= 20:
            raw_text = req.raw_text.strip()
            meta = extract_structured_resume_metadata(raw_text, target_role)
            cur = conn.execute(
                """
                INSERT INTO resumes (user_id, filename, file_type, file_size, raw_text, parsed_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    "Pasted_Resume.txt",
                    "txt",
                    len(raw_text.encode("utf-8")),
                    raw_text,
                    json.dumps(meta),
                    now,
                ),
            )
            resume_id = cur.lastrowid
            res_row = conn.execute("SELECT * FROM resumes WHERE id = ?", (resume_id,)).fetchone()
        else:
            # Default to latest resume of user
            res_row = conn.execute(
                "SELECT * FROM resumes WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                (user_id,),
            ).fetchone()
            if not res_row:
                raise HTTPException(status_code=400, detail="Please upload a resume or provide resume text first.")
            raw_text = res_row["raw_text"]
            resume_id = res_row["id"]

        ai_result = analyze_resume_with_ai(raw_text, target_role)
        cur_an = conn.execute(
            """
            INSERT INTO resume_analyses (
                user_id, resume_id, target_role, overall_score, ats_compatibility_score,
                impact_score, technical_depth_score, extracted_skills, experience_summary,
                education_summary, projects_summary, strengths, weaknesses, missing_skills,
                improvement_recommendations, ai_provider, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                resume_id,
                target_role,
                ai_result.overall_score,
                ai_result.ats_compatibility_score,
                ai_result.impact_score,
                ai_result.technical_depth_score,
                json.dumps(
                    {
                        "technical_skills": ai_result.technical_skills,
                        "soft_skills": ai_result.soft_skills,
                    }
                ),
                json.dumps(ai_result.experience_summary),
                json.dumps(ai_result.education_summary),
                json.dumps(ai_result.projects_summary),
                json.dumps(ai_result.strengths),
                json.dumps(ai_result.weaknesses),
                json.dumps(ai_result.missing_skills),
                json.dumps(ai_result.improvement_recommendations),
                ai_result.ai_provider,
                now,
            ),
        )
        analysis_row = conn.execute("SELECT * FROM resume_analyses WHERE id = ?", (cur_an.lastrowid,)).fetchone()
        resume_dict = parse_json_fields(row_to_dict(res_row), ["parsed_data"])

    return {
        "resume": resume_dict,
        "analysis": _format_analysis(analysis_row),
    }


@router.get("")
def list_user_resumes(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    with db_session() as conn:
        res_rows = conn.execute(
            "SELECT * FROM resumes WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
        an_rows = conn.execute(
            "SELECT * FROM resume_analyses WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()

    resumes = [parse_json_fields(row_to_dict(r), ["parsed_data"]) for r in res_rows]
    analyses = [_format_analysis(a) for a in an_rows]
    return {
        "resumes": resumes,
        "analyses": analyses,
        "latest_resume": resumes[0] if resumes else None,
        "latest_analysis": analyses[0] if analyses else None,
    }


@router.post("/rewrite-bullets")
def rewrite_bullets_endpoint(
    req: BulletRewriteRequest,
    current_user: dict = Depends(get_current_user),
):
    """Rewrite weak resume bullets into quantified XYZ-formula impact statements."""
    target_role = req.target_role or current_user.get("target_role") or "Full Stack Software Engineer"
    rewrites = rewrite_resume_bullets_xyz(req.bullets, target_role)
    return {"target_role": target_role, "rewrites": rewrites}
