"""AI Mock Interview, Answer Evaluation, Follow-up Generation, Bookmarks & History API Routes."""
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.database.connection import db_session
from app.database.models import parse_json_fields, row_to_dict
from app.schemas.api_schemas import (
    StartInterviewRequest,
    SubmitAnswerRequest,
    CompleteInterviewRequest,
)
from app.services.ai_service import (
    generate_interview_questions_with_ai,
    evaluate_answer_with_ai,
    count_filler_words,
    analyze_star_and_telemetry,
)

router = APIRouter(prefix="/interviews", tags=["AI Mock Interviews & Evaluation"])


def _assemble_session_detail(conn, session_id: int, user_id: int) -> Dict[str, Any]:
    s_row = conn.execute(
        "SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id),
    ).fetchone()
    if not s_row:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    session_dict = parse_json_fields(
        row_to_dict(s_row),
        ["strengths", "weaknesses", "recommended_topics"],
    )
    if not session_dict.get("company_style"):
        session_dict["company_style"] = "High-Growth SaaS"

    q_rows = conn.execute(
        "SELECT * FROM interview_questions WHERE session_id = ? ORDER BY question_number ASC, id ASC",
        (session_id,),
    ).fetchall()

    a_rows = conn.execute(
        "SELECT * FROM interview_answers WHERE session_id = ?",
        (session_id,),
    ).fetchall()
    answers_by_q = {}
    for r in a_rows:
        ad = parse_json_fields(row_to_dict(r), ["star_telemetry"])
        if not isinstance(ad.get("star_telemetry"), dict):
            ad["star_telemetry"] = {}
        if ad.get("code_snippet") is None:
            ad["code_snippet"] = ""
        answers_by_q[r["question_id"]] = ad

    e_rows = conn.execute(
        "SELECT * FROM interview_evaluations WHERE session_id = ?",
        (session_id,),
    ).fetchall()
    evals_by_q = {}
    for er in e_rows:
        evals_by_q[er["question_id"]] = parse_json_fields(
            row_to_dict(er),
            [
                "what_went_well",
                "what_was_missing",
                "incorrect_statements",
                "concepts_to_study",
                "actionable_tips",
            ],
        )

    questions_out = []
    for qr in q_rows:
        qd = parse_json_fields(row_to_dict(qr), ["expected_key_points"])
        qd["is_follow_up"] = bool(qd.get("is_follow_up"))
        qd["is_bookmarked"] = bool(qd.get("is_bookmarked"))
        qd["answer"] = answers_by_q.get(qd["id"])
        qd["evaluation"] = evals_by_q.get(qd["id"])
        questions_out.append(qd)

    session_dict["questions"] = questions_out
    session_dict["answered_count"] = len(answers_by_q)
    return session_dict


@router.post("/start", status_code=status.HTTP_201_CREATED)
def start_interview_session(
    req: StartInterviewRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new AI mock interview session and generate contextual questions calibrated to company_style."""
    user_id = current_user["id"]
    now = datetime.utcnow().isoformat()
    company_style = (getattr(req, "company_style", None) or "High-Growth SaaS").strip()

    with db_session() as conn:
        if req.resume_id:
            res_row = conn.execute(
                "SELECT id, raw_text FROM resumes WHERE id = ? AND user_id = ?",
                (req.resume_id, user_id),
            ).fetchone()
        else:
            res_row = conn.execute(
                "SELECT id, raw_text FROM resumes WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                (user_id,),
            ).fetchone()

        if req.job_description_id:
            jd_row = conn.execute(
                "SELECT id, raw_text FROM job_descriptions WHERE id = ? AND user_id = ?",
                (req.job_description_id, user_id),
            ).fetchone()
        else:
            jd_row = conn.execute(
                "SELECT id, raw_text FROM job_descriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1",
                (user_id,),
            ).fetchone()

        resume_text = res_row["raw_text"] if res_row else ""
        resume_id = res_row["id"] if res_row else None
        jd_text = jd_row["raw_text"] if jd_row else ""
        jd_id = jd_row["id"] if jd_row else None

        questions, ai_provider = generate_interview_questions_with_ai(
            job_role=req.job_role.strip(),
            experience_level=req.experience_level.strip(),
            interview_type=req.interview_type.strip(),
            difficulty=req.difficulty.strip(),
            question_count=req.question_count,
            resume_text=resume_text,
            jd_text=jd_text,
            company_style=company_style,
        )

        cur_s = conn.execute(
            """
            INSERT INTO interview_sessions (
                user_id, job_role, experience_level, interview_type, difficulty,
                company_style, question_count, resume_id, job_description_id, status, ai_provider, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                req.job_role.strip(),
                req.experience_level.strip(),
                req.interview_type.strip(),
                req.difficulty.strip(),
                company_style,
                len(questions),
                resume_id,
                jd_id,
                "in_progress",
                ai_provider,
                now,
            ),
        )
        session_id = cur_s.lastrowid

        for idx, q in enumerate(questions, start=1):
            conn.execute(
                """
                INSERT INTO interview_questions (
                    session_id, user_id, question_number, question_text, category,
                    difficulty, topic, expected_key_points, sample_answer,
                    is_follow_up, is_bookmarked, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    user_id,
                    idx,
                    q.question_text,
                    q.category,
                    q.difficulty,
                    q.topic,
                    json.dumps(q.expected_key_points),
                    q.sample_answer,
                    0,
                    0,
                    now,
                ),
            )

        return _assemble_session_detail(conn, session_id, user_id)


@router.post("/{session_id}/answer")
def submit_and_evaluate_answer(
    session_id: int,
    req: SubmitAnswerRequest,
    current_user: dict = Depends(get_current_user),
):
    """Submit a text or voice transcript answer (with optional code_snippet), persist STAR telemetry, and evaluate."""
    user_id = current_user["id"]
    now = datetime.utcnow().isoformat()
    code_clean = (getattr(req, "code_snippet", None) or "").strip()

    with db_session() as conn:
        s_row = conn.execute(
            "SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?",
            (session_id, user_id),
        ).fetchone()
        if not s_row:
            raise HTTPException(status_code=404, detail="Interview session not found.")

        q_row = conn.execute(
            "SELECT * FROM interview_questions WHERE id = ? AND session_id = ? AND user_id = ?",
            (req.question_id, session_id, user_id),
        ).fetchone()
        if not q_row:
            raise HTTPException(status_code=404, detail="Question not found in this interview session.")

        q_dict = parse_json_fields(row_to_dict(q_row), ["expected_key_points"])
        combined_ans = req.answer_text.strip() + (
            f"\n\n[Submitted Code / Architecture]:\n{code_clean}" if code_clean else ""
        )
        filler_info = count_filler_words(req.answer_text)
        star_telemetry = analyze_star_and_telemetry(req.answer_text, req.time_taken_seconds, code_clean)
        word_count = len(req.answer_text.strip().split())

        existing_ans = conn.execute(
            "SELECT id FROM interview_answers WHERE question_id = ?",
            (req.question_id,),
        ).fetchone()
        if existing_ans:
            conn.execute("DELETE FROM interview_evaluations WHERE question_id = ?", (req.question_id,))
            conn.execute("DELETE FROM interview_answers WHERE question_id = ?", (req.question_id,))

        cur_a = conn.execute(
            """
            INSERT INTO interview_answers (
                session_id, question_id, user_id, answer_text, answer_mode,
                time_taken_seconds, filler_word_count, word_count,
                code_snippet, star_telemetry, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                req.question_id,
                user_id,
                req.answer_text.strip(),
                req.answer_mode,
                req.time_taken_seconds,
                filler_info["total"],
                word_count,
                code_clean,
                json.dumps(star_telemetry),
                now,
            ),
        )
        answer_id = cur_a.lastrowid

        eval_result = evaluate_answer_with_ai(
            question_text=q_dict["question_text"],
            question_category=q_dict["category"],
            question_topic=q_dict["topic"],
            expected_key_points=q_dict["expected_key_points"],
            sample_answer=q_dict["sample_answer"],
            candidate_answer=combined_ans,
            job_role=s_row["job_role"],
        )

        cur_e = conn.execute(
            """
            INSERT INTO interview_evaluations (
                answer_id, question_id, session_id, user_id, overall_score,
                relevance_score, technical_accuracy_score, completeness_score,
                clarity_score, communication_score, problem_solving_score,
                practical_understanding_score, what_went_well, what_was_missing,
                incorrect_statements, suggested_improved_answer, concepts_to_study,
                actionable_tips, follow_up_question, ai_provider, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                answer_id,
                req.question_id,
                session_id,
                user_id,
                eval_result.overall_score,
                eval_result.relevance_score,
                eval_result.technical_accuracy_score,
                eval_result.completeness_score,
                eval_result.clarity_score,
                eval_result.communication_score,
                eval_result.problem_solving_score,
                eval_result.practical_understanding_score,
                json.dumps(eval_result.what_went_well),
                json.dumps(eval_result.what_was_missing),
                json.dumps(eval_result.incorrect_statements),
                eval_result.suggested_improved_answer,
                json.dumps(eval_result.concepts_to_study),
                json.dumps(eval_result.actionable_tips),
                eval_result.follow_up_question,
                eval_result.ai_provider,
                now,
            ),
        )

        created_follow_up = None
        if req.generate_follow_up and eval_result.follow_up_question:
            max_q = conn.execute(
                "SELECT COALESCE(MAX(question_number), 0) AS max_num FROM interview_questions WHERE session_id = ?",
                (session_id,),
            ).fetchone()["max_num"]
            cur_fu = conn.execute(
                """
                INSERT INTO interview_questions (
                    session_id, user_id, question_number, question_text, category,
                    difficulty, topic, expected_key_points, sample_answer,
                    is_follow_up, parent_question_id, is_bookmarked, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    user_id,
                    max_q + 1,
                    eval_result.follow_up_question,
                    q_dict["category"],
                    q_dict["difficulty"],
                    f"Follow-up: {q_dict['topic']}",
                    json.dumps(["Scale & bottleneck mitigation", "Failure recovery & observability"]),
                    "To handle a 10x traffic spike on this component, I would introduce horizontal stateless autoscaling, read replicas or Redis caching for hot keys, and circuit breakers with rate limiting to prevent cascading failures.",
                    1,
                    req.question_id,
                    0,
                    now,
                ),
            )
            conn.execute(
                "UPDATE interview_sessions SET question_count = question_count + 1 WHERE id = ?",
                (session_id,),
            )
            fu_row = conn.execute("SELECT * FROM interview_questions WHERE id = ?", (cur_fu.lastrowid,)).fetchone()
            created_follow_up = parse_json_fields(row_to_dict(fu_row), ["expected_key_points"])

        session_detail = _assemble_session_detail(conn, session_id, user_id)
        eval_row = conn.execute("SELECT * FROM interview_evaluations WHERE id = ?", (cur_e.lastrowid,)).fetchone()
        eval_formatted = parse_json_fields(
            row_to_dict(eval_row),
            ["what_went_well", "what_was_missing", "incorrect_statements", "concepts_to_study", "actionable_tips"],
        )

    return {
        "message": "Answer evaluated successfully.",
        "evaluation": eval_formatted,
        "filler_word_analysis": filler_info,
        "star_telemetry": star_telemetry,
        "follow_up_question": created_follow_up,
        "session": session_detail,
    }


@router.post("/{session_id}/complete")
def complete_interview_session(
    session_id: int,
    req: CompleteInterviewRequest,
    current_user: dict = Depends(get_current_user),
):
    """Finalize an interview session and calculate aggregate performance scores and summary feedback."""
    user_id = current_user["id"]
    now = datetime.utcnow().isoformat()

    with db_session() as conn:
        s_row = conn.execute(
            "SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?",
            (session_id, user_id),
        ).fetchone()
        if not s_row:
            raise HTTPException(status_code=404, detail="Interview session not found.")

        evals = conn.execute(
            "SELECT * FROM interview_evaluations WHERE session_id = ? AND user_id = ?",
            (session_id, user_id),
        ).fetchall()

        if not evals:
            overall = 0
            tech = 0
            comm = 0
            prob = 0
            conf = 0
            strengths = ["Completed interview setup"]
            weaknesses = ["No answers were submitted during the session"]
            topics = [s_row["job_role"]]
            summary = "Session was completed without submitted answers. Start a new session and submit answers for full AI rubric evaluation."
        else:
            n = len(evals)
            overall = int(round(sum(e["overall_score"] for e in evals) / n))
            tech = int(round(sum((e["technical_accuracy_score"] + e["practical_understanding_score"]) / 2 for e in evals) / n))
            comm = int(round(sum((e["communication_score"] + e["clarity_score"]) / 2 for e in evals) / n))
            prob = int(round(sum(e["problem_solving_score"] for e in evals) / n))
            conf = int(round(sum((e["completeness_score"] + e["relevance_score"]) / 2 for e in evals) / n))

            strengths_acc = []
            weaknesses_acc = []
            topics_acc = []
            for e in evals:
                ed = parse_json_fields(row_to_dict(e), ["what_went_well", "what_was_missing", "concepts_to_study"])
                strengths_acc.extend(ed["what_went_well"][:1])
                weaknesses_acc.extend(ed["what_was_missing"][:1])
                topics_acc.extend(ed["concepts_to_study"][:2])

            strengths = list(dict.fromkeys(strengths_acc))[:4]
            weaknesses = list(dict.fromkeys(weaknesses_acc))[:4]
            topics = list(dict.fromkeys(topics_acc))[:5]
            company_style = s_row["company_style"] if "company_style" in s_row.keys() and s_row["company_style"] else "High-Growth SaaS"
            summary = (
                f"Completed {n} evaluated question(s) for {s_row['job_role']} ({s_row['interview_type']} • {s_row['difficulty']} • {company_style}) "
                f"with an overall score of {overall}/100 (Technical: {tech}%, Communication: {comm}%, Problem Solving: {prob}%)."
            )

        conn.execute(
            """
            UPDATE interview_sessions SET
                status = 'completed',
                overall_score = ?,
                technical_score = ?,
                communication_score = ?,
                problem_solving_score = ?,
                confidence_score = ?,
                summary_feedback = ?,
                strengths = ?,
                weaknesses = ?,
                recommended_topics = ?,
                duration_seconds = ?,
                completed_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                overall,
                tech,
                comm,
                prob,
                conf,
                summary,
                json.dumps(strengths),
                json.dumps(weaknesses),
                json.dumps(topics),
                req.duration_seconds,
                now,
                session_id,
                user_id,
            ),
        )
        return _assemble_session_detail(conn, session_id, user_id)


@router.post("/questions/{question_id}/bookmark")
def toggle_question_bookmark(
    question_id: int,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    with db_session() as conn:
        q_row = conn.execute(
            "SELECT id, is_bookmarked FROM interview_questions WHERE id = ? AND user_id = ?",
            (question_id, user_id),
        ).fetchone()
        if not q_row:
            raise HTTPException(status_code=404, detail="Question not found.")
        new_val = 0 if q_row["is_bookmarked"] else 1
        conn.execute(
            "UPDATE interview_questions SET is_bookmarked = ? WHERE id = ? AND user_id = ?",
            (new_val, question_id, user_id),
        )
    return {"question_id": question_id, "is_bookmarked": bool(new_val)}


@router.get("/bookmarks/list")
def list_bookmarked_questions(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    with db_session() as conn:
        rows = conn.execute(
            """
            SELECT q.*, s.job_role, s.interview_type, s.company_style,
                   e.overall_score AS latest_score, a.created_at AS answered_at
            FROM interview_questions q
            JOIN interview_sessions s ON s.id = q.session_id
            LEFT JOIN interview_evaluations e ON e.question_id = q.id
            LEFT JOIN interview_answers a ON a.question_id = q.id
            WHERE q.user_id = ? AND q.is_bookmarked = 1
            ORDER BY q.id DESC
            """,
            (user_id,),
        ).fetchall()
    bookmarks = [parse_json_fields(row_to_dict(r), ["expected_key_points"]) for r in rows]
    return {"bookmarks": bookmarks}


@router.get("")
def list_interview_history(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    with db_session() as conn:
        rows = conn.execute(
            "SELECT * FROM interview_sessions WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
        sessions = []
        for r in rows:
            sd = parse_json_fields(row_to_dict(r), ["strengths", "weaknesses", "recommended_topics"])
            if not sd.get("company_style"):
                sd["company_style"] = "High-Growth SaaS"
            ans_cnt = conn.execute(
                "SELECT COUNT(*) AS cnt FROM interview_answers WHERE session_id = ?",
                (sd["id"],),
            ).fetchone()["cnt"]
            sd["answered_count"] = ans_cnt
            sessions.append(sd)
    return {"sessions": sessions}


@router.get("/{session_id}")
def get_interview_session(
    session_id: int,
    current_user: dict = Depends(get_current_user),
):
    with db_session() as conn:
        return _assemble_session_detail(conn, session_id, current_user["id"])


@router.delete("/{session_id}")
def delete_interview_session(
    session_id: int,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    with db_session() as conn:
        existing = conn.execute(
            "SELECT id FROM interview_sessions WHERE id = ? AND user_id = ?",
            (session_id, user_id),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Interview session not found.")
        conn.execute("DELETE FROM interview_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
    return {"message": "Interview session deleted successfully.", "deleted_id": session_id}
