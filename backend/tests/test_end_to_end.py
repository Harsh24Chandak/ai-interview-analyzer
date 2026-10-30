"""Automated End-to-End Integration Test Suite for AI Interview Analyzer Backend."""
import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app

client = TestClient(app)
SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample_data"


def run_complete_e2e_verification():
    print("=" * 72)
    print("RUNNING 13-STEP END-TO-END WORKFLOW VERIFICATION")
    print("=" * 72)

    # Step 1: Health check
    r_health = client.get("/api/health")
    assert r_health.status_code == 200, r_health.text
    health_data = r_health.json()
    print(f"[PASS] Step 1: Server Health Check -> status={health_data['status']}, ai_mode={health_data['ai_provider_mode']}")

    # Step 2: Register a new user AND test Demo login
    unique_email = "evaluator_test@university.edu"
    # Clean up if exists from prior run
    from app.database.connection import db_session
    with db_session() as conn:
        conn.execute("DELETE FROM users WHERE email = ?", (unique_email,))

    r_reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Prof. Academic Evaluator",
            "email": unique_email,
            "password": "SecurePassword#2026",
            "target_role": "Full Stack Software Engineer",
            "experience_level": "Entry Level (0-2 Years)",
        },
    )
    assert r_reg.status_code == 201, r_reg.text
    token = r_reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[PASS] Step 2a: User Registration -> user_id={r_reg.json()['user']['id']}, JWT issued")

    r_login = client.post(
        "/api/auth/login",
        json={"email": unique_email, "password": "SecurePassword#2026"},
    )
    assert r_login.status_code == 200, r_login.text
    print("[PASS] Step 2b: User Login & PBKDF2-SHA256 Password Verification")

    # Step 3: Upload PDF Resume & Verify Extraction + AI Analysis
    pdf_path = SAMPLE_DIR / "sample_resume.pdf"
    with open(pdf_path, "rb") as f:
        r_up_pdf = client.post(
            "/api/resumes/upload",
            headers=headers,
            files={"file": ("sample_resume.pdf", f, "application/pdf")},
            data={"target_role": "Full Stack Software Engineer"},
        )
    assert r_up_pdf.status_code == 201, r_up_pdf.text
    pdf_res_data = r_up_pdf.json()
    resume_id = pdf_res_data["resume"]["id"]
    overall_resume_score = pdf_res_data["analysis"]["overall_score"]
    extracted_tech_skills = pdf_res_data["analysis"]["extracted_skills"]["technical_skills"]
    print(f"[PASS] Step 3a: PDF Resume Upload & AI Analysis -> resume_id={resume_id}, score={overall_resume_score}/100, skills={len(extracted_tech_skills)}")

    # Also test DOCX upload
    docx_path = SAMPLE_DIR / "sample_resume.docx"
    with open(docx_path, "rb") as f:
        r_up_docx = client.post(
            "/api/resumes/upload",
            headers=headers,
            files={"file": ("sample_resume.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"target_role": "Full Stack Software Engineer"},
        )
    assert r_up_docx.status_code == 201, r_up_docx.text
    print(f"[PASS] Step 3b: DOCX Resume Upload & Extraction -> resume_id={r_up_docx.json()['resume']['id']}")

    # Step 4 & 5 & 6: Enter Job Description & Review Resume-to-Job Skill Match
    jd_text = (SAMPLE_DIR / "sample_job_description.txt").read_text()
    r_jd = client.post(
        "/api/jobs/analyze",
        headers=headers,
        json={
            "job_title": "Full Stack Software Engineer (AI Platform)",
            "company_name": "LinearScale Technologies",
            "raw_text": jd_text,
            "resume_id": resume_id,
        },
    )
    assert r_jd.status_code == 201, r_jd.text
    jd_analysis = r_jd.json()["job_analysis"]
    jd_id = jd_analysis["id"]
    print(
        f"[PASS] Step 4-6: Job Description Analysis & Skill Match -> match={jd_analysis['match_percentage']}%, "
        f"matching={len(jd_analysis['matching_skills'])}, missing={len(jd_analysis['missing_skills'])}"
    )

    # Step 7: Start an AI Mock Interview
    r_start = client.post(
        "/api/interviews/start",
        headers=headers,
        json={
            "job_role": "Full Stack Software Engineer",
            "experience_level": "Entry Level (0-2 Years)",
            "interview_type": "Technical",
            "difficulty": "Medium",
            "question_count": 3,
            "resume_id": resume_id,
            "job_description_id": jd_id,
        },
    )
    assert r_start.status_code == 201, r_start.text
    session_data = r_start.json()
    session_id = session_data["id"]
    questions = session_data["questions"]
    assert len(questions) == 3
    print(f"[PASS] Step 7: AI Mock Interview Created -> session_id={session_id}, questions_generated={len(questions)}")

    # Step 8 & 9: Submit Answers, Receive 7-Dimension AI Feedback, and Generate Follow-up Question
    q1_id = questions[0]["id"]
    r_ans1 = client.post(
        f"/api/interviews/{session_id}/answer",
        headers=headers,
        json={
            "question_id": q1_id,
            "answer_text": (
                "In our production FastAPI and React system, I optimize throughput by using async I/O for external network calls, "
                "adding composite PostgreSQL indexes on user_id and created_at which reduced P95 latency by 38% from 420ms to 260ms, "
                "and caching frequent read payloads in Redis while monitoring latency trade-offs."
            ),
            "answer_mode": "text",
            "time_taken_seconds": 95,
            "generate_follow_up": True,
        },
    )
    assert r_ans1.status_code == 200, r_ans1.text
    ans1_payload = r_ans1.json()
    eval1 = ans1_payload["evaluation"]
    fu_q = ans1_payload["follow_up_question"]
    assert eval1["overall_score"] >= 70
    assert fu_q is not None
    print(
        f"[PASS] Step 8-9: Answer Evaluation & Dynamic Follow-Up -> score={eval1['overall_score']}/100, "
        f"follow_up_id={fu_q['id']}"
    )

    # Bookmark Question 1
    r_bm = client.post(f"/api/interviews/questions/{q1_id}/bookmark", headers=headers)
    assert r_bm.status_code == 200 and r_bm.json()["is_bookmarked"] is True
    print("[PASS] Step 9b: Question Bookmarking Verified")

    # Submit answer for Question 2
    q2_id = questions[1]["id"]
    r_ans2 = client.post(
        f"/api/interviews/{session_id}/answer",
        headers=headers,
        json={
            "question_id": q2_id,
            "answer_text": (
                "For frontend and API state management, I attach JWT tokens via Axios request interceptors, handle 401 unauthorized "
                "responses cleanly, and separate server cache from local UI state with error boundaries."
            ),
            "answer_mode": "voice",
            "time_taken_seconds": 80,
            "generate_follow_up": False,
        },
    )
    assert r_ans2.status_code == 200, r_ans2.text

    # Step 10 & 11: Complete the Interview & View Final Performance Report
    r_comp = client.post(
        f"/api/interviews/{session_id}/complete",
        headers=headers,
        json={"duration_seconds": 420},
    )
    assert r_comp.status_code == 200, r_comp.text
    completed_session = r_comp.json()
    assert completed_session["status"] == "completed"
    assert completed_session["overall_score"] > 0
    print(
        f"[PASS] Step 10-11: Interview Completed & Final Report Generated -> "
        f"overall={completed_session['overall_score']}/100, technical={completed_session['technical_score']}%"
    )

    # Step 12 & 13: Verify Interview History, Dashboard, Analytics & Persistence
    r_hist = client.get("/api/interviews", headers=headers)
    assert r_hist.status_code == 200
    assert len(r_hist.json()["sessions"]) >= 1
    print(f"[PASS] Step 12: Interview History Retrieved -> total_sessions={len(r_hist.json()['sessions'])}")

    r_dash = client.get("/api/analytics/dashboard", headers=headers)
    assert r_dash.status_code == 200
    dash_stats = r_dash.json()["stats"]
    assert dash_stats["total_interviews_completed"] >= 1
    assert dash_stats["resume_analysis_score"] == r_up_docx.json()["analysis"]["overall_score"]

    r_perf = client.get("/api/analytics/performance", headers=headers)
    assert r_perf.status_code == 200
    perf_data = r_perf.json()
    assert len(perf_data["rubric_dimensions"]) == 7
    print(
        f"[PASS] Step 13: Dashboard & Performance Analytics Persistence Verified -> "
        f"prep_progress={dash_stats['preparation_progress']}%, rubric_dims={len(perf_data['rubric_dimensions'])}"
    )

    print("=" * 72)
    print("ALL 13 END-TO-END WORKFLOW TESTS PASSED SUCCESSFULLY!")
    print("=" * 72)


if __name__ == "__main__":
    run_complete_e2e_verification()
