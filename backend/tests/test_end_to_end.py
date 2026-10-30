"""Comprehensive V4 Automated Quality & Security Test Suite (Workflows A, B, C, and D)."""
import os
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

# Configure isolated test SQLite database BEFORE importing app so existing candidate DB is untouched
_tmp_db_dir = tempfile.mkdtemp(prefix="ai_interview_v4_test_")
os.environ["TEST_SQLITE_PATH"] = os.path.join(_tmp_db_dir, "test_v4_isolated.db")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import init_db, run_safe_migrations

client = TestClient(app)
SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample_data"


def test_workflow_d_migration_on_existing_db_copy():
    """Workflow D (Migration): Test safe idempotent migration on an existing v3 DB copy."""
    legacy_db_path = os.path.join(_tmp_db_dir, "legacy_v3_copy.db")
    conn = sqlite3.connect(legacy_db_path)
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT, email TEXT UNIQUE, password_hash TEXT, created_at TEXT, updated_at TEXT);
        CREATE TABLE interview_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            job_role TEXT NOT NULL,
            experience_level TEXT NOT NULL,
            interview_type TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            question_count INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'completed',
            created_at TEXT NOT NULL
        );
        CREATE TABLE interview_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL UNIQUE,
            user_id INTEGER NOT NULL,
            answer_text TEXT NOT NULL,
            answer_mode TEXT NOT NULL DEFAULT 'text',
            time_taken_seconds INTEGER NOT NULL DEFAULT 0,
            filler_word_count INTEGER NOT NULL DEFAULT 0,
            word_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );
        INSERT INTO users (id, full_name, email, password_hash, created_at, updated_at)
        VALUES (1, 'Legacy Candidate', 'legacy@test.dev', 'pbkdf2_sha256$260000$salt$hash', '2026-10-01', '2026-10-01');
        INSERT INTO interview_sessions (id, user_id, job_role, experience_level, interview_type, difficulty, question_count, status, created_at)
        VALUES (10, 1, 'Backend Engineer', 'Senior', 'Technical', 'Hard', 3, 'completed', '2026-10-01');
        INSERT INTO interview_answers (id, session_id, question_id, user_id, answer_text, answer_mode, time_taken_seconds, filler_word_count, word_count, created_at)
        VALUES (20, 10, 100, 1, 'Existing preserved answer text.', 'voice', 85, 0, 4, '2026-10-01');
        """
    )
    run_safe_migrations(conn)
    run_safe_migrations(conn)  # Verify idempotency

    s_row = conn.execute("SELECT * FROM interview_sessions WHERE id = 10").fetchone()
    a_row = conn.execute("SELECT * FROM interview_answers WHERE id = 20").fetchone()
    u_row = conn.execute("SELECT * FROM users WHERE id = 1").fetchone()
    assert u_row["password_hash"] == "pbkdf2_sha256$260000$salt$hash"
    assert s_row["company_style"] == "High-Growth SaaS"
    assert a_row["answer_text"] == "Existing preserved answer text."
    assert a_row["code_snippet"] == ""
    assert a_row["star_telemetry"] == "{}"
    conn.close()
    print("[PASS] Workflow D.1: Safe Idempotent SQLite Migration on Existing DB Copy Verified")


def run_all_v4_workflows():
    print("=" * 78)
    print("RUNNING V4 FULL-STACK QUALITY CHECKS (WORKFLOWS A, B, C & D)")
    print("=" * 78)

    init_db()
    test_workflow_d_migration_on_existing_db_copy()

    # -------------------------------------------------------------------------
    # WORKFLOW A: New Candidate Onboarding, Profile, Resume & Job Analysis
    # -------------------------------------------------------------------------
    r_health = client.get("/api/health")
    assert r_health.status_code == 200
    print(f"[PASS] Workflow A.1: Health Check -> {r_health.json()['status']} ({r_health.json()['ai_provider_mode']})")

    r_reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Alex Rivera",
            "email": "alex.rivera@datacore.io",
            "password": "StrongPassword#2026",
            "target_role": "Staff Infrastructure & Distributed Systems Engineer",
            "experience_level": "Staff / Principal (8+ Years)",
        },
    )
    assert r_reg.status_code == 201, r_reg.text
    token = r_reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Workflow A.2: Candidate Registration & JWT Authentication")

    r_dash_initial = client.get("/api/analytics/dashboard", headers=headers)
    assert r_dash_initial.status_code == 200
    assert r_dash_initial.json()["is_baseline_projection"] is True
    print("[PASS] Workflow A.3: Initial Dashboard Empty/Projection State Verified")

    # Complete profile with education, experience, skills, and theme
    r_prof = client.put(
        "/api/auth/profile",
        headers=headers,
        json={
            "bio": "Distributed systems engineer specializing in high-throughput telemetry and consensus.",
            "years_of_experience": 8,
            "skills": ["Go", "Python", "FastAPI", "React", "PostgreSQL", "Docker", "Kubernetes"],
            "career_interests": ["Distributed Systems", "Cloud Infrastructure"],
            "education": [{"degree": "B.S. Computer Science", "institution": "Tech University", "year": "2018"}],
            "experience": [{"role": "Staff Engineer", "company": "DataCore", "duration": "2022-2026"}],
            "theme_preference": "light",
        },
    )
    assert r_prof.status_code == 200
    assert r_prof.json()["user"]["theme_preference"] == "light"
    print("[PASS] Workflow A.4: Candidate Profile & Theme Persistence Verified")

    # Upload PDF & DOCX Resumes
    pdf_path = SAMPLE_DIR / "sample_resume.pdf"
    with open(pdf_path, "rb") as f:
        r_up_pdf = client.post(
            "/api/resumes/upload",
            headers=headers,
            files={"file": ("sample_resume.pdf", f, "application/pdf")},
            data={"target_role": "Staff Infrastructure & Distributed Systems Engineer"},
        )
    assert r_up_pdf.status_code == 201, r_up_pdf.text
    resume_id = r_up_pdf.json()["resume"]["id"]
    print(f"[PASS] Workflow A.5: PDF Resume Upload & Analysis -> score={r_up_pdf.json()['analysis']['overall_score']}/100")

    # Run XYZ Bullet Rewriter
    r_xyz = client.post(
        "/api/resumes/rewrite-bullets",
        headers=headers,
        json={
            "bullets": ["Managed AWS backend services for reliability."],
            "target_role": "Staff Infrastructure Engineer",
        },
    )
    assert r_xyz.status_code == 200 and len(r_xyz.json()["rewrites"]) == 1
    print("[PASS] Workflow A.6: XYZ Bullet Optimizer Verified")

    # Analyze Job Description
    jd_text = (SAMPLE_DIR / "sample_job_description.txt").read_text()
    r_jd = client.post(
        "/api/jobs/analyze",
        headers=headers,
        json={
            "job_title": "Staff Distributed Systems Engineer",
            "company_name": "Datadog",
            "raw_text": jd_text,
            "resume_id": resume_id,
        },
    )
    assert r_jd.status_code == 201, r_jd.text
    jd_id = r_jd.json()["job_analysis"]["id"]
    print(f"[PASS] Workflow A.7: Job Description Compatibility Analysis -> match={r_jd.json()['job_analysis']['match_percentage']}%")

    # -------------------------------------------------------------------------
    # WORKFLOW B: Interview Setup, Company Style, Live Submission, Code & STAR
    # -------------------------------------------------------------------------
    r_start = client.post(
        "/api/interviews/start",
        headers=headers,
        json={
            "job_role": "Staff Distributed Systems Engineer",
            "experience_level": "Staff / Principal (8+ Years)",
            "interview_type": "Technical",
            "difficulty": "Hard",
            "company_style": "Big Tech / FAANG",
            "question_count": 3,
            "resume_id": resume_id,
            "job_description_id": jd_id,
        },
    )
    assert r_start.status_code == 201, r_start.text
    session_data = r_start.json()
    session_id = session_data["id"]
    questions = session_data["questions"]
    assert session_data["company_style"] == "Big Tech / FAANG"
    assert "FAANG" in questions[0]["question_text"] or "FAANG" in questions[0]["topic"]
    print(f"[PASS] Workflow B.1: Interview Created with Company Style ('{session_data['company_style']}')")

    q1_id = questions[0]["id"]
    code_note = "SELECT user_id, created_at FROM interview_sessions WHERE user_id = $1 ORDER BY id DESC;"
    r_ans = client.post(
        f"/api/interviews/{session_id}/answer",
        headers=headers,
        json={
            "question_id": q1_id,
            "answer_text": (
                "In our production distributed telemetry system, we faced a critical p99 latency bottleneck under high write load. "
                "I designed a partitioned write-ahead commit log and added composite PostgreSQL indexes, reducing p95 latency by 38% from 420ms to 260ms."
            ),
            "code_snippet": code_note,
            "answer_mode": "voice",
            "time_taken_seconds": 105,
            "generate_follow_up": True,
        },
    )
    assert r_ans.status_code == 200, r_ans.text
    ans_payload = r_ans.json()
    assert ans_payload["evaluation"]["overall_score"] >= 75
    assert ans_payload["star_telemetry"]["star_completeness_score"] == 100
    assert ans_payload["follow_up_question"] is not None
    print(f"[PASS] Workflow B.2: 7-Dimension Evaluation ({ans_payload['evaluation']['overall_score']}/100), STAR (100%), Code & Follow-Up Verified")

    # Bookmark Question 1
    r_bm = client.post(f"/api/interviews/questions/{q1_id}/bookmark", headers=headers)
    assert r_bm.status_code == 200 and r_bm.json()["is_bookmarked"] is True
    print("[PASS] Workflow B.3: Question Bookmarked")

    # Complete Interview & Verify Final Report Persistence
    r_comp = client.post(
        f"/api/interviews/{session_id}/complete",
        headers=headers,
        json={"duration_seconds": 480},
    )
    assert r_comp.status_code == 200
    final_rep = r_comp.json()
    assert final_rep["status"] == "completed"
    assert final_rep["company_style"] == "Big Tech / FAANG"
    assert final_rep["questions"][0]["answer"]["code_snippet"] == code_note
    assert final_rep["questions"][0]["answer"]["answer_mode"] == "voice"
    assert final_rep["questions"][0]["answer"]["star_telemetry"]["star_completeness_score"] == 100
    print("[PASS] Workflow B.4: Final Report Stored Records (company_style, code_snippet, star_telemetry, voice mode) Verified")

    # -------------------------------------------------------------------------
    # WORKFLOW C: Historical Information, Saved Questions & Analytics Updates
    # -------------------------------------------------------------------------
    r_hist = client.get("/api/interviews", headers=headers)
    assert r_hist.status_code == 200 and len(r_hist.json()["sessions"]) == 1

    r_saved = client.get("/api/interviews/bookmarks/list", headers=headers)
    assert r_saved.status_code == 200 and len(r_saved.json()["bookmarks"]) == 1

    # Remove bookmark
    r_unbm = client.post(f"/api/interviews/questions/{q1_id}/bookmark", headers=headers)
    assert r_unbm.status_code == 200 and r_unbm.json()["is_bookmarked"] is False
    r_saved_after = client.get("/api/interviews/bookmarks/list", headers=headers)
    assert len(r_saved_after.json()["bookmarks"]) == 0
    print("[PASS] Workflow C.1: Saved Questions Listing & Bookmark Removal Verified")

    # Verify Analytics updated from actual records
    r_perf = client.get("/api/analytics/performance", headers=headers)
    assert r_perf.status_code == 200
    perf_json = r_perf.json()
    assert len(perf_json["score_trends"]) == 1
    assert len(perf_json["category_performance"]) == 1
    assert len(perf_json["rubric_dimensions"]) == 7
    assert perf_json["communication_metrics"]["total_answers_evaluated"] == 1
    print("[PASS] Workflow C.2: Performance Analytics Updated from Actual Records")

    # Create a second session and delete it to test History deletion
    r_s2 = client.post(
        "/api/interviews/start",
        headers=headers,
        json={"job_role": "Backend Engineer", "interview_type": "HR", "difficulty": "Easy", "question_count": 2},
    )
    s2_id = r_s2.json()["id"]
    r_del = client.delete(f"/api/interviews/{s2_id}", headers=headers)
    assert r_del.status_code == 200
    print("[PASS] Workflow C.3: Session Deletion Verified")

    # -------------------------------------------------------------------------
    # WORKFLOW D: Security & Validation Checks
    # -------------------------------------------------------------------------
    # Invalid login
    r_bad_login = client.post("/api/auth/login", json={"email": "alex.rivera@datacore.io", "password": "WrongPassword"})
    assert r_bad_login.status_code == 401

    # Malformed / Expired Token
    r_bad_tok = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.signature"})
    assert r_bad_tok.status_code == 401

    # Unauthorized request (missing token)
    r_no_tok = client.get("/api/analytics/dashboard")
    assert r_no_tok.status_code == 401

    # Missing required input (422 Unprocessable Entity)
    r_missing = client.post("/api/jobs/analyze", headers=headers, json={"job_title": "X"})
    assert r_missing.status_code == 422

    # Unsupported file type (.exe)
    r_bad_ext = client.post(
        "/api/resumes/upload",
        headers=headers,
        files={"file": ("malware.exe", b"MZ_fake_binary_content", "application/octet-stream")},
    )
    assert r_bad_ext.status_code == 400

    # Oversized resume (>10 MB)
    oversized_bytes = b"A" * (10 * 1024 * 1024 + 1024)
    r_huge = client.post(
        "/api/resumes/upload",
        headers=headers,
        files={"file": ("huge_resume.txt", oversized_bytes, "text/plain")},
    )
    assert r_huge.status_code == 413

    # Cross-user data access isolation
    r_user2 = client.post(
        "/api/auth/register",
        json={"full_name": "Other User", "email": "other@domain.com", "password": "Password#123"},
    )
    headers2 = {"Authorization": f"Bearer {r_user2.json()['access_token']}"}
    r_cross_get = client.get(f"/api/interviews/{session_id}", headers=headers2)
    assert r_cross_get.status_code == 404
    r_cross_del = client.delete(f"/api/interviews/{session_id}", headers=headers2)
    assert r_cross_del.status_code == 404
    print("[PASS] Workflow D.2: Security Checks (Invalid Login, Bad Token, 413 Oversized File, 400 File Type, 404 Cross-User Isolation) Verified")

    shutil.rmtree(_tmp_db_dir, ignore_errors=True)
    print("=" * 78)
    print("ALL V4 WORKFLOWS (A, B, C, D) PASSED WITH ZERO ERRORS!")
    print("=" * 78)


if __name__ == "__main__":
    run_all_v4_workflows()
