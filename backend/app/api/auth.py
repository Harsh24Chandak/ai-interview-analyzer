"""Authentication & User Profile API Routes."""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.database.connection import db_session
from app.database.models import format_user_record
from app.schemas.api_schemas import (
    RegisterRequest,
    LoginRequest,
    ProfileUpdateRequest,
    PasswordChangeRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Profile"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(req: RegisterRequest):
    email_clean = req.email.strip().lower()
    if "@" not in email_clean or "." not in email_clean.split("@")[-1]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a valid email address.")

    now = datetime.utcnow().isoformat()
    with db_session() as conn:
        existing = conn.execute("SELECT id FROM users WHERE lower(email) = ?", (email_clean,)).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Please sign in instead.",
            )
        cur = conn.execute(
            """
            INSERT INTO users (
                full_name, email, password_hash, target_role, experience_level,
                years_of_experience, bio, education, experience, skills,
                career_interests, theme_preference, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                req.full_name.strip(),
                email_clean,
                hash_password(req.password),
                req.target_role or "Full Stack Software Engineer",
                req.experience_level or "Entry Level (0-2 Years)",
                1,
                f"Preparing for {req.target_role or 'Software Engineering'} interviews.",
                json.dumps([]),
                json.dumps([]),
                json.dumps(["Python", "JavaScript", "SQL", "Git"]),
                json.dumps([req.target_role or "Software Engineering"]),
                "dark",
                now,
                now,
            ),
        )
        user_id = cur.lastrowid
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        user_dict = format_user_record(row)

    token = create_access_token({"sub": str(user_id), "email": email_clean})
    return {"access_token": token, "token_type": "bearer", "user": user_dict}


@router.post("/login")
def login_user(req: LoginRequest):
    email_clean = req.email.strip().lower()
    with db_session() as conn:
        row = conn.execute("SELECT * FROM users WHERE lower(email) = ?", (email_clean,)).fetchone()
        if not row or not verify_password(req.password, row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )
        user_dict = format_user_record(row)
        user_id = row["id"]

    token = create_access_token({"sub": str(user_id), "email": email_clean})
    return {"access_token": token, "token_type": "bearer", "user": user_dict}


@router.post("/demo")
def demo_login():
    """Instant one-click login into the pre-seeded demonstration account."""
    with db_session() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", ("demo@aiinterview.dev",)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Demo account not initialized.")
        user_dict = format_user_record(row)
        user_id = row["id"]

    token = create_access_token({"sub": str(user_id), "email": "demo@aiinterview.dev"})
    return {"access_token": token, "token_type": "bearer", "user": user_dict}


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


@router.put("/profile")
def update_profile(req: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    now = datetime.utcnow().isoformat()
    user_id = current_user["id"]
    with db_session() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        existing = format_user_record(row)

        full_name = req.full_name.strip() if req.full_name is not None else existing["full_name"]
        target_role = req.target_role if req.target_role is not None else existing["target_role"]
        experience_level = req.experience_level if req.experience_level is not None else existing["experience_level"]
        years_of_experience = req.years_of_experience if req.years_of_experience is not None else existing["years_of_experience"]
        bio = req.bio if req.bio is not None else existing["bio"]
        education = json.dumps(req.education if req.education is not None else existing["education"])
        experience = json.dumps(req.experience if req.experience is not None else existing["experience"])
        skills = json.dumps(req.skills if req.skills is not None else existing["skills"])
        career_interests = json.dumps(req.career_interests if req.career_interests is not None else existing["career_interests"])
        theme_preference = req.theme_preference if req.theme_preference is not None else existing["theme_preference"]
        notification_preferences = json.dumps(
            req.notification_preferences if req.notification_preferences is not None else existing["notification_preferences"]
        )

        conn.execute(
            """
            UPDATE users SET
                full_name = ?, target_role = ?, experience_level = ?, years_of_experience = ?,
                bio = ?, education = ?, experience = ?, skills = ?, career_interests = ?,
                theme_preference = ?, notification_preferences = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                full_name, target_role, experience_level, years_of_experience,
                bio, education, experience, skills, career_interests,
                theme_preference, notification_preferences, now, user_id,
            ),
        )
        updated_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return {"message": "Profile updated successfully.", "user": format_user_record(updated_row)}


@router.post("/change-password")
def change_password(req: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    with db_session() as conn:
        row = conn.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row or not verify_password(req.current_password, row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect.",
            )
        conn.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
            (hash_password(req.new_password), datetime.utcnow().isoformat(), user_id),
        )
    return {"message": "Password updated successfully."}


@router.post("/seed-sample-data")
def seed_sample_data_for_current_user(current_user: dict = Depends(get_current_user)):
    """Populate realistic sample resume analysis, JD match, and 3 completed interview sessions for the currently logged-in user."""
    user_id = current_user["id"]
    now = datetime.utcnow().isoformat()
    target_role = current_user.get("target_role") or "Full Stack Software Engineer"

    with db_session() as conn:
        # Check if user already has completed interviews
        existing_cnt = conn.execute(
            "SELECT COUNT(*) AS c FROM interview_sessions WHERE user_id = ? AND status = 'completed'",
            (user_id,),
        ).fetchone()["c"]

        # Copy sample resume, analysis, JD, and sessions from demo template
        sample_resume_text = (
            f"{current_user['full_name'].upper()}\n"
            f"{target_role} | {current_user['email']}\n\n"
            "EDUCATION\nB.Tech in Computer Science & Engineering — 8.9 CGPA (2022-2026)\n\n"
            "TECHNICAL SKILLS\nPython, JavaScript, TypeScript, React, FastAPI, Node.js, SQL, PostgreSQL, Docker, Git, REST APIs, Tailwind CSS\n\n"
            "EXPERIENCE\nFull-Stack Developer Intern | NexaCloud Systems (2025)\n"
            "- Engineered 14 RESTful microservices using Python and FastAPI with JWT authentication.\n"
            "- Optimized SQL composite indexing to cut P95 query latency by 38% (from 420ms to 260ms).\n\n"
            "PROJECTS\nAI Interview Analyzer: Full-stack AI career readiness platform with React, FastAPI, SQLite, and Google Gemini API."
        )
        parsed_resume = {
            "technical_skills": ["Python", "JavaScript", "TypeScript", "React", "FastAPI", "Node.js", "SQL", "PostgreSQL", "Docker", "Git", "REST APIs", "Tailwind CSS"],
            "soft_skills": ["Problem Solving", "Technical Communication", "Agile Delivery", "System Ownership"],
        }
        cur_res = conn.execute(
            "INSERT INTO resumes (user_id, filename, file_type, file_size, raw_text, parsed_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, f"{current_user['full_name'].replace(' ', '_')}_Resume_2026.pdf", "pdf", 145600, sample_resume_text, json.dumps(parsed_resume), now),
        )
        resume_id = cur_res.lastrowid

        conn.execute(
            """
            INSERT INTO resume_analyses (
                user_id, resume_id, target_role, overall_score, ats_compatibility_score,
                impact_score, technical_depth_score, extracted_skills, experience_summary,
                education_summary, projects_summary, strengths, weaknesses, missing_skills,
                improvement_recommendations, ai_provider, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id, resume_id, target_role, 88, 92, 85, 89,
                json.dumps(parsed_resume),
                json.dumps([{"role": "Full-Stack Developer Intern", "company": "NexaCloud Systems", "duration": "2025"}]),
                json.dumps([{"degree": "B.Tech in Computer Science & Engineering", "institution": "Engineering Institute", "year": "2022 - 2026"}]),
                json.dumps([{"name": "AI Interview Analyzer", "summary": "Full-stack AI interview preparation and rubric evaluation SaaS."}]),
                json.dumps(["Quantified 38% latency reduction in internship experience", "Strong full-stack alignment across React, FastAPI, Python, and SQL"]),
                json.dumps(["Expand distributed caching (Redis) and cloud deployment metrics"]),
                json.dumps(["Redis", "Kubernetes", "AWS", "System Design", "Pytest"]),
                json.dumps(["Add automated test coverage metrics to project bullets", "Highlight Redis caching & system design trade-offs"]),
                "seeded_portfolio", now,
            ),
        )

        cur_jd = conn.execute(
            """
            INSERT INTO job_descriptions (
                user_id, job_title, company_name, raw_text, required_skills, preferred_skills,
                experience_requirements, role_expectations, match_percentage, matching_skills,
                missing_skills, learning_roadmap, readiness_recommendations, resume_id, ai_provider, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id, f"{target_role} (AI Platform)", "LinearScale Technologies",
                "Seeking a Full Stack Software Engineer skilled in Python, FastAPI, React, TypeScript, PostgreSQL, Docker, Redis, AWS, and Pytest.",
                json.dumps(["Python", "FastAPI", "React", "TypeScript", "PostgreSQL", "SQL", "REST APIs", "Docker", "Redis", "AWS", "Pytest"]),
                json.dumps(["Kubernetes", "System Design", "LLM Prompt Engineering"]),
                "0-2 years of full-stack software engineering experience.",
                json.dumps(["Build responsive React dashboards", "Architect low-latency FastAPI services", "Integrate validated AI workflows"]),
                84,
                json.dumps(["Python", "FastAPI", "React", "TypeScript", "PostgreSQL", "SQL", "REST APIs", "Docker"]),
                json.dumps(["Redis", "AWS", "Pytest"]),
                json.dumps([
                    {"week": "Week 1", "focus": "Redis & Caching", "action": "Add cache-aside caching for analytics endpoints."},
                    {"week": "Week 2", "focus": "Pytest Automation", "action": "Build 13-step E2E integration tests."},
                    {"week": "Week 3", "focus": "System Design & Cloud", "action": "Practice horizontal scaling & circuit-breaker design."}
                ]),
                json.dumps(["Highlight your 38% SQL latency optimization", "Review Redis cache eviction policies"]),
                resume_id, "seeded_portfolio", now,
            ),
        )
        jd_id = cur_jd.lastrowid

        if existing_cnt == 0:
            samples = [
                ("Full Stack Software Engineer", "Technical", "Medium", 78, 80, 76, 79, 75, "2026-10-24T14:30:00",
                 "Solid understanding of FastAPI async concurrency and React reconciliation. Expand on Redis cache invalidation."),
                ("Backend Software Engineer", "Behavioral", "Medium", 85, 82, 89, 84, 86, "2026-10-27T16:15:00",
                 "Clear STAR behavioral structure with quantified 38% latency reduction metrics."),
                (f"{target_role} (AI Platform)", "Resume-Based", "Hard", 91, 93, 88, 91, 90, "2026-10-29T18:45:00",
                 "Strong mastery of full-stack architecture, Pydantic validation, JWT security, and fault-tolerant AI design."),
            ]
            for role_s, type_s, diff_s, ov, te, co, pr, cf, dt, summ in samples:
                cur_s = conn.execute(
                    """
                    INSERT INTO interview_sessions (
                        user_id, job_role, experience_level, interview_type, difficulty,
                        question_count, resume_id, job_description_id, status, overall_score,
                        technical_score, communication_score, problem_solving_score, confidence_score,
                        summary_feedback, strengths, weaknesses, recommended_topics,
                        duration_seconds, ai_provider, created_at, completed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id, role_s, "Entry Level (0-2 Years)", type_s, diff_s,
                        2, resume_id, jd_id, "completed", ov, te, co, pr, cf, summ,
                        json.dumps(["Clear architectural reasoning", "Quantified engineering impact"]),
                        json.dumps(["Discuss multi-region scaling trade-offs"]),
                        json.dumps(["Redis Caching", "Database Indexing", "Circuit Breakers"]),
                        1200, "seeded_portfolio", dt, dt,
                    ),
                )
                s_id = cur_s.lastrowid
                cur_q = conn.execute(
                    """
                    INSERT INTO interview_questions (
                        session_id, user_id, question_number, question_text, category,
                        difficulty, topic, expected_key_points, sample_answer,
                        is_follow_up, is_bookmarked, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        s_id, user_id, 1,
                        f"How did you architect and optimize your {role_s} services for low latency and high reliability?",
                        type_s, diff_s, "System Architecture & Performance",
                        json.dumps(["Async I/O & concurrency", "Composite SQL indexing", "Graceful fallback resilience"]),
                        "We used FastAPI async endpoints, added composite B-tree indexes reducing P95 latency by 38% (420ms to 260ms), and validated LLM outputs with Pydantic.",
                        0, 1, dt,
                    ),
                )
                q_id = cur_q.lastrowid
                cur_a = conn.execute(
                    """
                    INSERT INTO interview_answers (
                        session_id, question_id, user_id, answer_text, answer_mode,
                        time_taken_seconds, filler_word_count, word_count, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        s_id, q_id, user_id,
                        "We engineered FastAPI endpoints with async I/O, added composite SQL indexes that reduced P95 latency by 38% from 420ms to 260ms, and enforced Pydantic validation with circuit-breaker fallbacks.",
                        "text", 95, 0, 31, dt,
                    ),
                )
                a_id = cur_a.lastrowid
                conn.execute(
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
                        a_id, q_id, s_id, user_id, ov,
                        min(100, ov + 3), te, max(75, ov - 2), co, co, pr, te,
                        json.dumps(["Quantified latency improvement (38%)", "Strong architectural clarity"]),
                        json.dumps(["Mention cache invalidation strategy under write bursts"]),
                        json.dumps([]),
                        "We combined FastAPI async I/O, composite SQL indexing (38% latency reduction), Redis cache-aside, and Pydantic schema validation.",
                        json.dumps(["Redis Cache-Aside", "Composite Indexing"]),
                        json.dumps(["Close with a 1-sentence observability metric"]),
                        "How would this architecture handle a 10x sudden spike in concurrent writes?",
                        "seeded_portfolio", dt,
                    ),
                )

    return {"message": "Sample portfolio, resume analysis, job match, and interview sessions loaded into your account!"}
