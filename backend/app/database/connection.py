"""Relational Database Connection Manager (SQLite with PostgreSQL/SQLAlchemy compatibility)."""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.security import hash_password

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    target_role TEXT DEFAULT 'Full Stack Software Engineer',
    experience_level TEXT DEFAULT 'Entry Level (0-2 Years)',
    years_of_experience INTEGER DEFAULT 1,
    bio TEXT DEFAULT '',
    education TEXT DEFAULT '[]',
    experience TEXT DEFAULT '[]',
    skills TEXT DEFAULT '[]',
    career_interests TEXT DEFAULT '[]',
    theme_preference TEXT DEFAULT 'dark',
    notification_preferences TEXT DEFAULT '{"email_reports": true, "practice_reminders": true, "voice_mode": true}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    raw_text TEXT NOT NULL,
    parsed_data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resume_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    resume_id INTEGER NOT NULL,
    target_role TEXT NOT NULL,
    overall_score INTEGER NOT NULL,
    ats_compatibility_score INTEGER NOT NULL,
    impact_score INTEGER NOT NULL,
    technical_depth_score INTEGER NOT NULL,
    extracted_skills TEXT NOT NULL DEFAULT '{}',
    experience_summary TEXT NOT NULL DEFAULT '[]',
    education_summary TEXT NOT NULL DEFAULT '[]',
    projects_summary TEXT NOT NULL DEFAULT '[]',
    strengths TEXT NOT NULL DEFAULT '[]',
    weaknesses TEXT NOT NULL DEFAULT '[]',
    missing_skills TEXT NOT NULL DEFAULT '[]',
    improvement_recommendations TEXT NOT NULL DEFAULT '[]',
    ai_provider TEXT NOT NULL DEFAULT 'fallback',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_descriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    job_title TEXT NOT NULL,
    company_name TEXT NOT NULL DEFAULT '',
    raw_text TEXT NOT NULL,
    required_skills TEXT NOT NULL DEFAULT '[]',
    preferred_skills TEXT NOT NULL DEFAULT '[]',
    experience_requirements TEXT NOT NULL DEFAULT '',
    role_expectations TEXT NOT NULL DEFAULT '[]',
    match_percentage INTEGER DEFAULT 0,
    matching_skills TEXT NOT NULL DEFAULT '[]',
    missing_skills TEXT NOT NULL DEFAULT '[]',
    learning_roadmap TEXT NOT NULL DEFAULT '[]',
    readiness_recommendations TEXT NOT NULL DEFAULT '[]',
    resume_id INTEGER,
    ai_provider TEXT NOT NULL DEFAULT 'fallback',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS interview_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    job_role TEXT NOT NULL,
    experience_level TEXT NOT NULL,
    interview_type TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    question_count INTEGER NOT NULL,
    resume_id INTEGER,
    job_description_id INTEGER,
    status TEXT NOT NULL DEFAULT 'in_progress',
    overall_score INTEGER DEFAULT 0,
    technical_score INTEGER DEFAULT 0,
    communication_score INTEGER DEFAULT 0,
    problem_solving_score INTEGER DEFAULT 0,
    confidence_score INTEGER DEFAULT 0,
    summary_feedback TEXT DEFAULT '',
    strengths TEXT DEFAULT '[]',
    weaknesses TEXT DEFAULT '[]',
    recommended_topics TEXT DEFAULT '[]',
    duration_seconds INTEGER DEFAULT 0,
    ai_provider TEXT NOT NULL DEFAULT 'fallback',
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
    FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS interview_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT 'General',
    expected_key_points TEXT NOT NULL DEFAULT '[]',
    sample_answer TEXT NOT NULL DEFAULT '',
    is_follow_up INTEGER NOT NULL DEFAULT 0,
    parent_question_id INTEGER,
    is_bookmarked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interview_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    answer_text TEXT NOT NULL,
    answer_mode TEXT NOT NULL DEFAULT 'text',
    time_taken_seconds INTEGER NOT NULL DEFAULT 0,
    filler_word_count INTEGER NOT NULL DEFAULT 0,
    word_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interview_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    answer_id INTEGER NOT NULL UNIQUE,
    question_id INTEGER NOT NULL UNIQUE,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    overall_score INTEGER NOT NULL,
    relevance_score INTEGER NOT NULL,
    technical_accuracy_score INTEGER NOT NULL,
    completeness_score INTEGER NOT NULL,
    clarity_score INTEGER NOT NULL,
    communication_score INTEGER NOT NULL,
    problem_solving_score INTEGER NOT NULL,
    practical_understanding_score INTEGER NOT NULL,
    what_went_well TEXT NOT NULL DEFAULT '[]',
    what_was_missing TEXT NOT NULL DEFAULT '[]',
    incorrect_statements TEXT NOT NULL DEFAULT '[]',
    suggested_improved_answer TEXT NOT NULL DEFAULT '',
    concepts_to_study TEXT NOT NULL DEFAULT '[]',
    actionable_tips TEXT NOT NULL DEFAULT '[]',
    follow_up_question TEXT NOT NULL DEFAULT '',
    ai_provider TEXT NOT NULL DEFAULT 'fallback',
    created_at TEXT NOT NULL,
    FOREIGN KEY (answer_id) REFERENCES interview_answers(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.SQLITE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


@contextmanager
def db_session():
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Initialize all relational tables and seed the demo account if not present."""
    with db_session() as conn:
        conn.executescript(SCHEMA_SQL)
        cur = conn.execute("SELECT id FROM users WHERE email = ?", ("demo@aiinterview.dev",))
        existing = cur.fetchone()
        if not existing:
            _seed_demo_account(conn)


def _seed_demo_account(conn: sqlite3.Connection) -> None:
    """Create a realistic demo student/engineer account with pre-populated resume, job match, and completed interviews."""
    now = datetime.utcnow().isoformat()
    education = [
        {
            "degree": "B.Tech in Computer Science & Engineering",
            "institution": "DKTE Society's Textile & Engineering Institute",
            "year": "2022 - 2026",
            "grade": "8.9 CGPA"
        }
    ]
    experience = [
        {
            "role": "Full-Stack Developer Intern",
            "company": "NexaCloud Systems",
            "duration": "May 2025 - Aug 2025",
            "highlights": "Built REST APIs in FastAPI, reduced query latency by 38%, and implemented React telemetry dashboards."
        }
    ]
    skills = [
        "Python", "FastAPI", "React", "TypeScript", "SQL", "PostgreSQL",
        "Docker", "Git", "REST APIs", "Tailwind CSS", "Data Structures"
    ]
    interests = ["Full-Stack Engineering", "AI/ML Systems", "Backend Architecture", "Cloud Native"]

    cur = conn.execute(
        """
        INSERT INTO users (
            full_name, email, password_hash, target_role, experience_level,
            years_of_experience, bio, education, experience, skills,
            career_interests, theme_preference, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "Madhura Patil",
            "demo@aiinterview.dev",
            hash_password("Demo@1234"),
            "Full Stack Software Engineer",
            "Entry Level (0-2 Years)",
            1,
            "Final-year Computer Science student building full-stack AI applications with React, FastAPI, and cloud-native architectures.",
            json.dumps(education),
            json.dumps(experience),
            json.dumps(skills),
            json.dumps(interests),
            "dark",
            now,
            now,
        ),
    )
    user_id = cur.lastrowid

    # Seed a realistic resume
    sample_resume_text = (
        "MADHURA PATIL\n"
        "Full Stack Software Engineer | demo@aiinterview.dev | GitHub: Madhurapatil234\n\n"
        "EDUCATION\n"
        "B.Tech in Computer Science & Engineering — 8.9 CGPA (2022-2026)\n\n"
        "TECHNICAL SKILLS\n"
        "Languages: Python, JavaScript, TypeScript, SQL, C++\n"
        "Frameworks: React, FastAPI, Node.js, Tailwind CSS\n"
        "Databases & DevOps: PostgreSQL, SQLite, Docker, Git, GitHub Actions\n\n"
        "EXPERIENCE\n"
        "Full-Stack Developer Intern | NexaCloud Systems (May 2025 - Aug 2025)\n"
        "- Engineered 14 RESTful microservices using Python and FastAPI with JWT authentication.\n"
        "- Optimized SQL indexing to reduce dashboard API P95 response time from 420ms to 260ms.\n\n"
        "PROJECTS\n"
        "1. AI Interview Analyzer: Full-stack interview preparation SaaS using React, FastAPI, SQLite, and Google Gemini API.\n"
        "2. Real-Time Collaborative Code Editor: WebSockets-based pair programming platform."
    )
    parsed_resume = {
        "technical_skills": ["Python", "JavaScript", "TypeScript", "SQL", "React", "FastAPI", "Node.js", "Tailwind CSS", "PostgreSQL", "Docker", "Git"],
        "soft_skills": ["Problem Solving", "Collaborative Engineering", "Technical Communication", "Agile Delivery"],
        "education": education,
        "experience": experience,
        "projects": [
            {"name": "AI Interview Analyzer", "tech": ["React", "FastAPI", "Gemini API", "SQLite"], "summary": "Full-stack AI interview preparation and analytics platform."},
            {"name": "Collaborative Code Editor", "tech": ["React", "WebSockets", "Node.js"], "summary": "Real-time code synchronization and execution workspace."}
        ]
    }
    cur_res = conn.execute(
        """
        INSERT INTO resumes (user_id, filename, file_type, file_size, raw_text, parsed_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, "Madhura_Patil_Resume_2026.pdf", "pdf", 148200, sample_resume_text, json.dumps(parsed_resume), now),
    )
    resume_id = cur_res.lastrowid

    # Seed Resume Analysis
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
            user_id,
            resume_id,
            "Full Stack Software Engineer",
            86,
            90,
            82,
            87,
            json.dumps(parsed_resume),
            json.dumps(experience),
            json.dumps(education),
            json.dumps(parsed_resume["projects"]),
            json.dumps([
                "Quantified latency improvements (420ms to 260ms) in internship bullet points",
                "Strong modern full-stack alignment with React, TypeScript, Python, and FastAPI",
                "Production-grade capstone project demonstrating end-to-end AI integration"
            ]),
            json.dumps([
                "Cloud deployment metrics (AWS/GCP, CI/CD test coverage percentages) can be expanded",
                "System design and caching layer experience (Redis/message queues) not explicitly listed"
            ]),
            json.dumps(["Redis", "Kubernetes", "AWS/GCP", "System Design", "Automated Testing (Pytest/Playwright)"]),
            json.dumps([
                "Add unit and integration test coverage metrics to the AI Interview Analyzer project description",
                "Include experience with caching (Redis) and container orchestration or cloud deployment (AWS/Render)",
                "Highlight leadership or hackathon achievements in a dedicated Achievements section"
            ]),
            "seeded_baseline",
            now,
        ),
    )

    # Seed Job Description Analysis
    jd_text = (
        "We are seeking a Full Stack Software Engineer to build scalable AI-enabled web applications. "
        "Requirements: Strong proficiency in Python (FastAPI/Django), React, TypeScript, relational databases (PostgreSQL/SQL), "
        "RESTful API design, Docker, Redis caching, AWS deployment, and automated testing with Pytest."
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
            user_id,
            "Full Stack Software Engineer (AI Platform)",
            "Stripe / Linear Tier SaaS",
            jd_text,
            json.dumps(["Python", "FastAPI", "React", "TypeScript", "PostgreSQL", "SQL", "REST APIs", "Docker", "Redis", "AWS", "Pytest"]),
            json.dumps(["Kubernetes", "GraphQL", "CI/CD Pipelines", "LLM Prompt Engineering"]),
            "0-2 years of full-stack software engineering experience with modern web frameworks.",
            json.dumps([
                "Architect and ship responsive React + TypeScript interfaces",
                "Design low-latency FastAPI backend services and relational schemas",
                "Integrate LLM workflows with structured validation and fallback guarantees"
            ]),
            82,
            json.dumps(["Python", "FastAPI", "React", "TypeScript", "PostgreSQL", "SQL", "REST APIs", "Docker"]),
            json.dumps(["Redis", "AWS", "Pytest", "Kubernetes"]),
            json.dumps([
                {"week": "Week 1", "focus": "Caching & Performance", "action": "Implement Redis caching for session & analytics endpoints and benchmark hit rates."},
                {"week": "Week 2", "focus": "Automated Testing", "action": "Write Pytest integration suites covering auth, file uploads, and AI evaluation schemas."},
                {"week": "Week 3", "focus": "Cloud Architecture", "action": "Deploy containerized FastAPI + React stack on AWS ECS or Render with CI/CD."}
            ]),
            json.dumps([
                "Prepare STAR stories around your NexaCloud latency optimization (38% improvement)",
                "Review Redis caching patterns (write-through vs cache-aside) before your technical round",
                "Practice explaining JWT signing, CORS security, and Pydantic validation in interviews"
            ]),
            resume_id,
            "seeded_baseline",
            now,
        ),
    )
    jd_id = cur_jd.lastrowid

    # Seed 3 completed historical interview sessions for rich analytics trends
    sessions_seed = [
        {
            "job_role": "Full Stack Software Engineer",
            "experience_level": "Entry Level (0-2 Years)",
            "interview_type": "Technical",
            "difficulty": "Medium",
            "overall_score": 78,
            "technical_score": 80,
            "communication_score": 76,
            "problem_solving_score": 79,
            "confidence_score": 75,
            "created_at": "2026-10-24T14:30:00",
            "completed_at": "2026-10-24T14:52:00",
            "duration": 1320,
            "summary": "Solid understanding of RESTful API design and React state hooks. Could go deeper into database indexing internals and transaction isolation levels.",
            "questions": [
                (
                    "How does FastAPI handle asynchronous request execution compared to synchronous endpoints, and when should you use `async def` vs `def`?",
                    "Technical",
                    "Medium",
                    "FastAPI & Async Concurrency",
                    "FastAPI runs `async def` endpoints directly on the main asyncio event loop, ideal for non-blocking I/O like httpx calls. Standard `def` endpoints are executed in an external threadpool via AnyIO so blocking I/O (like standard synchronous SQLite or CPU work) does not block the event loop.",
                    82
                ),
                (
                    "Explain how React reconciles the Virtual DOM and how `useMemo` or `useCallback` prevents unnecessary re-renders.",
                    "Technical",
                    "Medium",
                    "React Rendering & Optimization",
                    "React compares fiber trees during reconciliation using O(n) heuristics based on element types and stable keys. `useMemo` memoizes computed values and `useCallback` stabilizes function references across renders, which is helpful when passing callbacks to `React.memo` child components.",
                    74
                )
            ]
        },
        {
            "job_role": "Backend Software Engineer",
            "experience_level": "Entry Level (0-2 Years)",
            "interview_type": "Behavioral",
            "difficulty": "Medium",
            "overall_score": 84,
            "technical_score": 81,
            "communication_score": 88,
            "problem_solving_score": 83,
            "confidence_score": 85,
            "created_at": "2026-10-27T17:10:00",
            "completed_at": "2026-10-27T17:30:00",
            "duration": 1200,
            "summary": "Clear, structured STAR responses with measurable outcomes. Strong ownership mindset and collaborative communication.",
            "questions": [
                (
                    "Tell me about a time when you diagnosed a critical performance bottleneck under a tight deadline. How did you prioritize and measure the fix?",
                    "Behavioral",
                    "Medium",
                    "Ownership & Performance Debugging",
                    "During my internship at NexaCloud, our analytics endpoint P95 latency spiked to 420ms before a client demo. I profiled the SQL queries with EXPLAIN ANALYZE, identified a missing composite index on (user_id, created_at), and deployed the migration with zero downtime, cutting latency by 38% to 260ms.",
                    86
                ),
                (
                    "Describe a situation where you disagreed with a teammate on an architectural decision. How did you resolve it?",
                    "Behavioral",
                    "Medium",
                    "Team Collaboration",
                    "My teammate favored polling for live status updates while I proposed WebSockets. Instead of debating abstractly, I built a 30-minute benchmark comparing payload overhead and server CPU for our expected concurrency, and we agreed on Server-Sent Events (SSE) as a clean middle ground.",
                    82
                )
            ]
        },
        {
            "job_role": "Full Stack Software Engineer (AI Platform)",
            "experience_level": "Entry Level (0-2 Years)",
            "interview_type": "Resume-Based",
            "difficulty": "Hard",
            "overall_score": 89,
            "technical_score": 91,
            "communication_score": 87,
            "problem_solving_score": 90,
            "confidence_score": 88,
            "created_at": "2026-10-29T19:00:00",
            "completed_at": "2026-10-29T19:25:00",
            "duration": 1500,
            "summary": "Impressive mastery of full-stack architecture, LLM structured output validation with Pydantic, and security practices (PBKDF2 hashing, JWT verification, and fallback resilience).",
            "questions": [
                (
                    "On your resume, you built AI Interview Analyzer with Google Gemini and FastAPI. How do you guarantee reliable structured JSON output and handle LLM rate limits or timeouts in production?",
                    "Resume-Based",
                    "Hard",
                    "AI Engineering & Resilience",
                    "We enforce strict JSON schema prompts and validate every Gemini response through Pydantic models before persisting to SQLite/PostgreSQL. If the API returns malformed JSON, hits a 429 rate limit, or times out, our service layer catches the exception, logs telemetry, and falls back to a deterministic rule-and-rubric engine clearly labeled with its provider status.",
                    91
                ),
                (
                    "How did you design user-level data isolation and file upload security for PDF and DOCX resumes?",
                    "Resume-Based",
                    "Hard",
                    "Application Security",
                    "Every protected endpoint extracts the authenticated user_id from the signed HS256 JWT token and scopes all SQL queries with `WHERE user_id = ?`. For uploads, we enforce a strict 10MB size ceiling, verify file extensions and MIME headers (.pdf, .docx), sanitize filenames with UUIDs, and parse text in memory without executing untrusted macros.",
                    87
                )
            ]
        }
    ]

    for s in sessions_seed:
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
                user_id,
                s["job_role"],
                s["experience_level"],
                s["interview_type"],
                s["difficulty"],
                len(s["questions"]),
                resume_id,
                jd_id,
                "completed",
                s["overall_score"],
                s["technical_score"],
                s["communication_score"],
                s["problem_solving_score"],
                s["confidence_score"],
                s["summary"],
                json.dumps(["Structured technical reasoning", "Concrete metrics and architectural clarity", "Low filler word ratio"]),
                json.dumps(["Expand on distributed systems edge cases", "Discuss trade-offs in multi-region scaling"]),
                json.dumps(["Database Indexing & Query Plans", "Redis Caching Strategies", "System Design Trade-offs"]),
                s["duration"],
                "seeded_baseline",
                s["created_at"],
                s["completed_at"],
            ),
        )
        sess_id = cur_s.lastrowid
        for idx, (q_text, q_cat, q_diff, q_topic, ans_text, q_score) in enumerate(s["questions"], start=1):
            cur_q = conn.execute(
                """
                INSERT INTO interview_questions (
                    session_id, user_id, question_number, question_text, category,
                    difficulty, topic, expected_key_points, sample_answer,
                    is_follow_up, is_bookmarked, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    sess_id,
                    user_id,
                    idx,
                    q_text,
                    q_cat,
                    q_diff,
                    q_topic,
                    json.dumps(["Core architectural principle", "Concrete real-world example", "Performance & security trade-offs"]),
                    ans_text,
                    0,
                    1 if idx == 1 else 0,
                    s["created_at"],
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
                    sess_id,
                    q_id,
                    user_id,
                    ans_text,
                    "text",
                    145,
                    1,
                    len(ans_text.split()),
                    s["completed_at"],
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
                    a_id,
                    q_id,
                    sess_id,
                    user_id,
                    q_score,
                    min(100, q_score + 4),
                    q_score,
                    max(65, q_score - 2),
                    min(100, q_score + 3),
                    min(100, q_score + 2),
                    q_score,
                    min(100, q_score + 1),
                    json.dumps(["Directly addressed the core mechanism", "Used specific production metrics and examples"]),
                    json.dumps(["Could briefly mention edge-case failure recovery under peak load"]),
                    json.dumps([]),
                    ans_text + " Additionally, in production we monitor P99 latency and configure circuit breakers to degrade gracefully.",
                    json.dumps([q_topic, "Production Observability & Circuit Breakers"]),
                    json.dumps(["Quantify trade-offs early in your answer", "Close with a 1-sentence production takeaway"]),
                    f"How would your approach to {q_topic} change if traffic scaled 100x overnight?",
                    "seeded_baseline",
                    s["completed_at"],
                ),
            )
