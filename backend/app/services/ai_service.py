"""Dedicated Google Gemini AI Service Layer with Pydantic Validation and Transparent Fallback Engine."""
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.core.config import settings
from app.schemas.api_schemas import (
    AIResumeAnalysisOutput,
    AIJobMatchOutput,
    AIQuestionItem,
    AIAnswerEvaluationOutput,
)
from app.services.resume_parser import (
    extract_structured_resume_metadata,
    KNOWN_TECH_SKILLS,
)

logger = logging.getLogger("ai_interview_analyzer.ai_service")

FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "actually", "literally", "sort of", "kind of", "i mean"]


def count_filler_words(text: str) -> Dict[str, Any]:
    """Count filler words in a candidate's response."""
    text_lower = text.lower()
    breakdown = {}
    total = 0
    for fw in FILLER_WORDS:
        matches = len(re.findall(r"\b" + re.escape(fw) + r"\b", text_lower))
        if matches > 0:
            breakdown[fw] = matches
            total += matches
    return {"total": total, "breakdown": breakdown}


def _call_gemini_json(system_instruction: str, user_prompt: str, timeout: float = 20.0) -> Optional[Any]:
    """Call Google Gemini REST API using server-side GEMINI_API_KEY and return parsed JSON."""
    if not settings.is_live_ai_configured:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json",
        },
    }
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(url, json=payload)
            if resp.status_code != 200:
                logger.warning("Gemini API returned status %s: %s", resp.status_code, resp.text[:250])
                return None
            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None
            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if not text:
                return None
            cleaned = text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?", "", cleaned).rstrip("`").strip()
            return json.loads(cleaned)
    except Exception as exc:
        logger.warning("Gemini API call failed or timed out (%s). Falling back to deterministic engine.", str(exc))
        return None


def analyze_resume_with_ai(raw_text: str, target_role: str = "Full Stack Software Engineer") -> AIResumeAnalysisOutput:
    """Analyze resume text using Gemini AI if configured, validated with Pydantic, or transparent fallback engine."""
    meta = extract_structured_resume_metadata(raw_text, target_role)

    sys_prompt = (
        "You are a Principal Technical Recruiter and Senior Engineering Hiring Manager. "
        "Analyze the candidate resume against the target role and return a JSON object strictly matching the requested schema."
    )
    user_prompt = f"""Target Role: {target_role}
Resume Text:
{raw_text[:6000]}

Return JSON with exact keys:
{{
  "overall_score": <int 0-100>,
  "ats_compatibility_score": <int 0-100>,
  "impact_score": <int 0-100>,
  "technical_depth_score": <int 0-100>,
  "technical_skills": ["..."],
  "soft_skills": ["..."],
  "experience_summary": [{{"role": "...", "company": "...", "duration": "..."}}],
  "education_summary": [{{"degree": "...", "institution": "...", "year": "..."}}],
  "projects_summary": [{{"name": "...", "summary": "..."}}],
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missing_skills": ["..."],
  "improvement_recommendations": ["..."]
}}"""

    live_json = _call_gemini_json(sys_prompt, user_prompt)
    if isinstance(live_json, dict):
        try:
            live_json["ai_provider"] = "gemini_live"
            return AIResumeAnalysisOutput(**live_json)
        except Exception as exc:
            logger.warning("Gemini resume output failed Pydantic validation: %s", exc)

    # Deterministic, intelligent analysis based on extracted resume metadata
    tech_count = len(meta["technical_skills"])
    missing = meta["missing_benchmark_skills"]
    has_metrics = meta["has_quantified_metrics"]

    tech_score = min(96, max(58, 55 + tech_count * 4))
    impact_score = min(94, 84 if has_metrics else 68)
    ats_score = min(95, 80 + (8 if len(meta["education"]) > 0 else 0) + (6 if len(meta["experience"]) > 0 else 0))
    overall = int(round((tech_score * 0.4) + (impact_score * 0.3) + (ats_score * 0.3)))

    strengths = [
        f"Verified {tech_count} relevant technical skills aligned with {target_role} ({', '.join(meta['technical_skills'][:6])}).",
    ]
    if has_metrics:
        strengths.append("Includes quantified engineering impact metrics (percentages/latency/scale) in experience bullets.")
    else:
        strengths.append("Clear structural hierarchy across education, technical skills, and hands-on engineering projects.")
    if meta["projects"]:
        strengths.append(f"Demonstrates practical system building across {len(meta['projects'])} highlighted project(s).")

    weaknesses = []
    if not has_metrics:
        weaknesses.append("Experience and project bullets lack quantified metrics (e.g., latency reduction %, throughput, or test coverage).")
    if missing:
        weaknesses.append(f"Missing explicit mention of high-demand {target_role} skills: {', '.join(missing[:4])}.")
    if meta["word_count"] < 120:
        weaknesses.append("Resume content is relatively brief; expand architectural details and production responsibilities.")
    if not weaknesses:
        weaknesses.append("Could further strengthen senior-level readiness by highlighting system design trade-offs and CI/CD test automation.")

    recommendations = [
        f"Incorporate {', '.join(missing[:3])} into a hands-on project or technical skills section if you have practical familiarity." if missing else "Highlight cloud deployment and observability metrics in your top project.",
        "Structure every experience and project bullet using the XYZ formula: 'Accomplished [X] as measured by [Y], by doing [Z]'.",
        f"Tailor your summary header specifically toward '{target_role}' with your strongest 4 core stack keywords.",
    ]

    return AIResumeAnalysisOutput(
        overall_score=overall,
        ats_compatibility_score=ats_score,
        impact_score=impact_score,
        technical_depth_score=tech_score,
        technical_skills=meta["technical_skills"],
        soft_skills=meta["soft_skills"],
        experience_summary=meta["experience"],
        education_summary=meta["education"],
        projects_summary=meta["projects"],
        strengths=strengths,
        weaknesses=weaknesses,
        missing_skills=missing,
        improvement_recommendations=recommendations,
        ai_provider="deterministic_fallback_engine",
    )


def analyze_job_match_with_ai(
    job_title: str,
    company_name: str,
    jd_text: str,
    resume_text: str = "",
) -> AIJobMatchOutput:
    """Analyze a job description and compare against the user's resume."""
    sys_prompt = (
        "You are an AI Career Strategist and Technical Hiring Architect. "
        "Extract required skills from the job description, compare them with the candidate's resume, "
        "calculate an explainable match percentage, and build a 3-week learning roadmap."
    )
    user_prompt = f"""Job Title: {job_title}
Company: {company_name}
Job Description:
{jd_text[:4000]}

Candidate Resume:
{resume_text[:4000] if resume_text else 'No resume provided yet; evaluate baseline requirements.'}

Return JSON with exact keys:
{{
  "required_skills": ["..."],
  "preferred_skills": ["..."],
  "experience_requirements": "...",
  "role_expectations": ["..."],
  "match_percentage": <int 0-100>,
  "matching_skills": ["..."],
  "missing_skills": ["..."],
  "learning_roadmap": [{{"week": "Week 1", "focus": "...", "action": "..."}}],
  "readiness_recommendations": ["..."]
}}"""

    live_json = _call_gemini_json(sys_prompt, user_prompt)
    if isinstance(live_json, dict):
        try:
            live_json["ai_provider"] = "gemini_live"
            return AIJobMatchOutput(**live_json)
        except Exception as exc:
            logger.warning("Gemini job match output failed Pydantic validation: %s", exc)

    # Deterministic extraction from JD text and comparison against resume_text
    jd_lower = jd_text.lower()
    req_skills = []
    for sk in KNOWN_TECH_SKILLS:
        if sk.lower() in jd_lower:
            req_skills.append(sk)
    if not req_skills:
        req_skills = ["Python", "React", "TypeScript", "SQL", "REST APIs", "Docker", "Git"]

    resume_meta = extract_structured_resume_metadata(resume_text, job_title) if resume_text else {"technical_skills": ["Python", "JavaScript", "React", "SQL", "Git"]}
    resume_skill_set = {s.lower() for s in resume_meta["technical_skills"]}

    matching = [s for s in req_skills if s.lower() in resume_skill_set]
    missing = [s for s in req_skills if s.lower() not in resume_skill_set]

    match_pct = int(round((len(matching) / max(1, len(req_skills))) * 100))
    match_pct = max(35, min(96, match_pct))

    exp_match = re.search(r"(\d+\+?\s*(?:-\s*\d+\s*)?years?)", jd_lower)
    exp_req = f"Requires {exp_match.group(1)} of relevant experience for {job_title}." if exp_match else f"Entry to Mid-level proficiency expected for {job_title}."

    expectations = [
        f"Design, build, and maintain production services and features for {job_title}.",
        f"Demonstrate strong command of core stack technologies: {', '.join(req_skills[:5])}.",
        "Collaborate across code reviews, automated testing, and architectural design discussions.",
    ]

    roadmap = [
        {
            "week": "Week 1",
            "focus": f"Close Core Skill Gaps ({', '.join(missing[:2]) if missing else 'Advanced Architecture'})",
            "action": f"Build a focused microservice or feature module using {', '.join(missing[:2]) if missing else 'your core stack'} and document trade-offs."
        },
        {
            "week": "Week 2",
            "focus": "System Design & Edge-Case Mastery",
            "action": f"Practice API design, database indexing, and failure recovery scenarios tailored to {company_name or job_title}."
        },
        {
            "week": "Week 3",
            "focus": "Mock Interviews & STAR Behavioral Alignment",
            "action": "Complete 3 timed AI mock interviews (Technical, Resume-Based, and Behavioral) scoring above 85%."
        }
    ]

    recommendations = [
        f"Highlight your hands-on experience with {', '.join(matching[:4])} in the top third of your resume." if matching else "Align your technical skills section with the exact keywords from the job description.",
        f"Prepare concrete answers addressing {', '.join(missing[:3])}—even if learning, explain how adjacent tools you know map to them." if missing else "Prepare deep-dive architectural trade-off stories for your primary projects.",
        f"Run a Job-Description-Based AI Mock Interview specifically targeting {job_title} at {company_name or 'your target company'}.",
    ]

    return AIJobMatchOutput(
        required_skills=req_skills,
        preferred_skills=missing[:3] if len(missing) > 3 else ["System Design", "CI/CD", "Cloud Architecture"],
        experience_requirements=exp_req,
        role_expectations=expectations,
        match_percentage=match_pct,
        matching_skills=matching,
        missing_skills=missing,
        learning_roadmap=roadmap,
        readiness_recommendations=recommendations,
        ai_provider="deterministic_fallback_engine",
    )


def generate_interview_questions_with_ai(
    job_role: str,
    experience_level: str,
    interview_type: str,
    difficulty: str,
    question_count: int,
    resume_text: str = "",
    jd_text: str = "",
) -> Tuple[List[AIQuestionItem], str]:
    """Generate contextual, non-repetitive interview questions based on role, category, difficulty, resume, and JD."""
    sys_prompt = (
        "You are a Staff Engineering Interviewer. Generate realistic, non-repetitive interview questions "
        "tailored to the candidate's target role, experience level, interview category, difficulty, resume, and job description."
    )
    user_prompt = f"""Job Role: {job_role}
Experience Level: {experience_level}
Interview Category: {interview_type}
Difficulty: {difficulty}
Number of Questions: {question_count}
Resume Excerpt: {resume_text[:2000] if resume_text else 'N/A'}
Job Description Excerpt: {jd_text[:2000] if jd_text else 'N/A'}

Return a JSON array of exactly {question_count} objects with keys:
[
  {{
    "question_text": "...",
    "category": "{interview_type}",
    "difficulty": "{difficulty}",
    "topic": "...",
    "expected_key_points": ["...", "...", "..."],
    "sample_answer": "..."
  }}
]"""

    live_json = _call_gemini_json(sys_prompt, user_prompt)
    if isinstance(live_json, list) and len(live_json) > 0:
        try:
            validated = [AIQuestionItem(**item) for item in live_json[:question_count]]
            return validated, "gemini_live"
        except Exception as exc:
            logger.warning("Gemini question list failed Pydantic validation: %s", exc)

    # Contextual Fallback Question Generator across all 6 required interview categories
    resume_meta = extract_structured_resume_metadata(resume_text, job_role) if resume_text else {"technical_skills": ["Python", "React", "FastAPI", "SQL", "Docker"]}
    top_skills = resume_meta["technical_skills"][:4] or ["Python", "React", "SQL", "APIs"]
    primary_skill = top_skills[0]
    secondary_skill = top_skills[1] if len(top_skills) > 1 else "REST APIs"

    bank_by_type: Dict[str, List[Dict[str, Any]]] = {
        "Technical": [
            {
                "question_text": f"As a {job_role} ({experience_level}), how do you design and optimize high-throughput backend endpoints using {primary_skill}, and how do you diagnose latency spikes in production?",
                "topic": f"{primary_skill} Performance & Architecture",
                "expected_key_points": ["Non-blocking I/O and concurrency model", "Database indexing and N+1 query prevention", "Observability metrics (P95/P99 latency) and caching"],
                "sample_answer": f"To optimize {primary_skill} services for a {job_role} workload, I start by profiling request traces to separate compute bottlenecks from database I/O. I ensure async I/O is used for network calls, add composite indexes on high-cardinality filter columns, and introduce a cache-aside layer (such as Redis) for read-heavy endpoints while monitoring P95/P99 latency."
            },
            {
                "question_text": f"Walk me through how you manage state, authentication tokens, and error boundaries in a modern frontend/full-stack application working with {secondary_skill}.",
                "topic": f"{secondary_skill} & Secure State Management",
                "expected_key_points": ["JWT lifecycle and 401 interceptor handling", "Separation of server cache vs UI state", "Graceful degradation and user-facing error boundaries"],
                "sample_answer": "I separate server state from local UI state, attach short-lived JWT access tokens via request interceptors, and handle 401 expirations cleanly without losing user form context. I also wrap route trees in error boundaries and provide deterministic fallback states when upstream APIs are slow."
            },
            {
                "question_text": "Explain the trade-offs between relational databases (like PostgreSQL/SQLite) and NoSQL stores when designing a multi-tenant SaaS application.",
                "topic": "Database Architecture & ACID Guarantees",
                "expected_key_points": ["ACID transactions and referential integrity", "Schema evolution vs horizontal write scaling", "Tenant isolation strategies (`user_id` scoping vs schema separation)"],
                "sample_answer": "Relational databases like PostgreSQL provide strict ACID transactions, foreign-key integrity, and rich analytical joins—ideal for user accounts, evaluations, and financial or session records. NoSQL stores excel at unstructured documents or massive write partitioning, but require application-side consistency management."
            },
            {
                "question_text": "How do you prevent common web security vulnerabilities (SQL Injection, XSS, CSRF, and insecure file uploads) in a production full-stack platform?",
                "topic": "Application Security & OWASP Top 10",
                "expected_key_points": ["Parameterized queries / ORM binding", "Input validation with Pydantic and strict MIME/size checks on file uploads", "CORS policies, password hashing (PBKDF2/bcrypt), and JWT verification"],
                "sample_answer": "First, I never concatenate raw SQL strings—every query uses parameterized placeholders or ORM bindings. Second, all incoming payloads are validated with Pydantic schemas, and uploaded files are checked for extension, byte size limits, and sanitized filenames. Finally, passwords are hashed with salted PBKDF2/bcrypt and endpoints enforce user-level ownership checks."
            },
            {
                "question_text": "If an external third-party API (such as an LLM provider or payment gateway) experiences intermittent timeouts or 429 rate limits, how do you architect your backend to stay resilient?",
                "topic": "Fault Tolerance & Resilient Systems",
                "expected_key_points": ["Timeouts, exponential backoff, and jitter", "Circuit breaker pattern and graceful fallback mode", "Structured schema validation and clear telemetry"],
                "sample_answer": "I wrap external API calls in a dedicated service layer with strict client timeouts (e.g., 15-20s), retry with exponential backoff on transient 5xx/429 errors, and implement a circuit breaker that degrades gracefully to a transparent fallback engine so the user journey never crashes."
            },
        ],
        "Behavioral": [
            {
                "question_text": "Tell me about a challenging engineering problem you faced where the requirements changed or the deadline was extremely tight. How did you deliver?",
                "topic": "Execution Under Pressure (STAR Method)",
                "expected_key_points": ["Clear Situation & Task framing", "Concrete technical prioritization actions", "Quantifiable result and retrospective learning"],
                "sample_answer": "During our capstone launch, we had 24 hours to integrate live AI evaluations with a persistent database. I decomposed the work into core API milestones, built a validated Pydantic schema contract first so frontend and backend could integrate without blockers, and shipped the end-to-end tested platform ahead of the deadline."
            },
            {
                "question_text": "Describe a time when you received critical feedback on your code or architecture during a review. How did you respond?",
                "topic": "Growth Mindset & Code Quality",
                "expected_key_points": ["Objective reception of feedback", "Collaborative investigation and refactoring", "Process improvement to prevent recurrence"],
                "sample_answer": "In my internship, a senior engineer pointed out that my initial analytics endpoint executed N+1 queries inside a loop. I thanked them, benchmarked the query plan using EXPLAIN, refactored the endpoint into a single aggregated SQL join, and added query-count assertions to our test suite."
            },
            {
                "question_text": "Share an example of when you had to learn an unfamiliar technology or framework rapidly to unblock a project.",
                "topic": "Rapid Technical Learning",
                "expected_key_points": ["Structured learning approach via official docs & prototypes", "Application to the real project bottleneck", "Measurable outcome"],
                "sample_answer": "When building our full-stack analyzer, I needed to extract clean text from complex multi-page PDF and DOCX files reliably. I prototyped a parser combining pypdf, pdfplumber, and python-docx in an isolated test script, verified edge cases like tables and empty streams, and integrated it with 100% test pass rate."
            }
        ],
        "HR": [
            {
                "question_text": f"Why are you excited about pursuing a {job_role} position at this stage of your career, and what differentiates your engineering approach?",
                "topic": "Career Motivation & Value Alignment",
                "expected_key_points": ["Genuine passion for building user-facing & scalable systems", "Evidence of end-to-end ownership", "Alignment with continuous learning and team impact"],
                "sample_answer": f"I love owning features from database schema design all the way to polished UI interactions. My combination of hands-on experience in {', '.join(top_skills[:3])} and my focus on measurable performance and reliability allows me to contribute immediately as a {job_role}."
            },
            {
                "question_text": "Where do you see your technical skills and leadership responsibilities evolving over the next 2 to 3 years?",
                "topic": "Career Trajectory & Ownership",
                "expected_key_points": ["Deepening mastery in core architecture", "Mentoring peers and owning production reliability", "Delivering measurable product outcomes"],
                "sample_answer": "In the first year, my goal is to become a go-to contributor on our core services and ship high-reliability features. Over 2 to 3 years, I aim to lead architectural design for major product initiatives, mentor incoming junior engineers, and drive engineering quality standards."
            },
            {
                "question_text": "What kind of engineering culture and feedback environment helps you perform at your best?",
                "topic": "Team Culture & Communication",
                "expected_key_points": ["High ownership and transparent communication", "Constructive code reviews and metric-driven decisions", "Psychological safety and customer focus"],
                "sample_answer": "I thrive in teams that value pragmatic execution, thorough code reviews, and clear product metrics—where engineers are empowered to own problems end-to-end and iterate quickly based on real user feedback."
            }
        ],
        "Situational": [
            {
                "question_text": "Imagine you deploy a new release on Friday afternoon and error rates on the authentication endpoint spike from 0.1% to 8%. Walk me through your exact first 15 minutes.",
                "topic": "Incident Response & Production Triage",
                "expected_key_points": ["Immediate mitigation / rollback first", "Log & metric correlation (status codes, recent commit diff)", "Stakeholder communication and blameless post-mortem"],
                "sample_answer": "First, I immediately stop the bleeding by rolling back the deployment or toggling off the feature flag within the first 3 minutes. Second, I verify that error rates return to baseline. Third, I inspect structured logs and stack traces in staging to reproduce the root cause, write a regression test, and document a blameless post-mortem."
            },
            {
                "question_text": "Suppose a product manager asks for a complex AI feature to be shipped in 48 hours, but the external AI API has unstable latency. How do you scope and deliver it safely?",
                "topic": "Pragmatic Scoping & Engineering Trade-offs",
                "expected_key_points": ["Transparent trade-off alignment with PM", "Strict timeouts + deterministic fallback architecture", "Phased rollout with clear UI status indicators"],
                "sample_answer": "I would align with the PM on a resilient MVP: we ship the live AI integration behind a 15-second timeout with Pydantic output validation, paired with a deterministic fallback engine and a clear badge in the UI. That guarantees 100% uptime for the launch while we optimize async queueing next."
            }
        ],
        "Resume-Based": [
            {
                "question_text": f"Looking at your resume, you worked extensively with {', '.join(top_skills[:3])}. Which project pushed your architectural understanding the furthest, and what would you redesign today?",
                "topic": "Deep-Dive Resume Project Architecture",
                "expected_key_points": ["End-to-end architecture explanation", "Specific technical bottleneck overcome", "Thoughtful retrospective improvement"],
                "sample_answer": f"Building the AI Interview Analyzer pushed my architecture skills the furthest because it required coordinating PDF/DOCX parsing, structured LLM evaluation, relational persistence, and real-time analytics using {', '.join(top_skills[:3])}. If scaling to 100k concurrent users today, I would decouple AI evaluation into an async background worker queue with Redis."
            },
            {
                "question_text": f"On your resume, how did you validate correctness, security, and edge cases across your {primary_skill} and {secondary_skill} implementation?",
                "topic": "Testing, Validation & Production Readiness",
                "expected_key_points": ["Input & schema validation", "Automated integration tests across critical user journeys", "Security controls (auth, ownership, upload validation)"],
                "sample_answer": f"I enforced strict request and response schemas, wrote end-to-end integration tests covering registration, file upload, and interview evaluation, and verified that every database query enforces user-level ownership isolation."
            }
        ],
        "Job-Description-Based": [
            {
                "question_text": f"This {job_role} role requires strong proficiency in {', '.join(top_skills[:3])} and building scalable customer-facing workflows. How does your prior work directly map to these day-one expectations?",
                "topic": "Role Readiness & Direct Skill Transfer",
                "expected_key_points": ["Direct mapping of core technical stack", "Concrete example of shipping production-quality features", "Plan for ramping up on domain-specific tooling"],
                "sample_answer": f"My hands-on experience building full-stack applications with {', '.join(top_skills[:3])} maps directly to your stack. I have already implemented JWT auth, relational data modeling, and responsive analytics dashboards, allowing me to contribute to production features from week one."
            },
            {
                "question_text": f"Based on the requirements for {job_role}, how would you design a modular service that processes user uploads, runs AI analysis, and stores historical metrics without blocking the UI?",
                "topic": "End-to-End System Design for Target Role",
                "expected_key_points": ["Clean API contract and file validation", "Modular service layer with schema validation", "Indexed relational storage and responsive frontend state"],
                "sample_answer": "I would design a FastAPI endpoint that validates the file stream (<10MB, PDF/DOCX), extracts text via a parser service, invokes the AI service with structured JSON output validation, persists results in indexed relational tables, and returns normalized JSON to update the React dashboard."
            }
        ],
    }

    # Combine primary category bank with supplementary questions so we can satisfy up to 15 questions without repetition
    selected_pool = list(bank_by_type.get(interview_type, bank_by_type["Technical"]))
    for cat_name, cat_questions in bank_by_type.items():
        if cat_name != interview_type:
            selected_pool.extend(cat_questions)

    out_questions: List[AIQuestionItem] = []
    for i in range(question_count):
        template = selected_pool[i % len(selected_pool)]
        out_questions.append(
            AIQuestionItem(
                question_text=template["question_text"],
                category=interview_type,
                difficulty=difficulty,
                topic=template["topic"],
                expected_key_points=template["expected_key_points"],
                sample_answer=template["sample_answer"],
            )
        )
    return out_questions, "deterministic_fallback_engine"


def evaluate_answer_with_ai(
    question_text: str,
    question_category: str,
    question_topic: str,
    expected_key_points: List[str],
    sample_answer: str,
    candidate_answer: str,
    job_role: str = "Full Stack Software Engineer",
) -> AIAnswerEvaluationOutput:
    """Evaluate a candidate's interview answer across 7 rubric dimensions and generate a contextual follow-up question."""
    sys_prompt = (
        "You are a calibrated, constructive Staff Technical Interviewer. Evaluate the candidate's answer "
        "against the question and expected key points. Frame feedback constructively as AI coaching observations, "
        "never presenting subjective judgments as absolute facts."
    )
    user_prompt = f"""Job Role: {job_role}
Question ({question_category} - {question_topic}): {question_text}
Expected Key Points: {json.dumps(expected_key_points)}
Reference Sample Answer: {sample_answer}

Candidate's Submitted Answer:
{candidate_answer}

Return JSON with exact keys:
{{
  "overall_score": <int 0-100>,
  "relevance_score": <int 0-100>,
  "technical_accuracy_score": <int 0-100>,
  "completeness_score": <int 0-100>,
  "clarity_score": <int 0-100>,
  "communication_score": <int 0-100>,
  "problem_solving_score": <int 0-100>,
  "practical_understanding_score": <int 0-100>,
  "what_went_well": ["..."],
  "what_was_missing": ["..."],
  "incorrect_statements": ["..."],
  "suggested_improved_answer": "...",
  "concepts_to_study": ["..."],
  "actionable_tips": ["..."],
  "follow_up_question": "..."
}}"""

    live_json = _call_gemini_json(sys_prompt, user_prompt)
    if isinstance(live_json, dict):
        try:
            live_json["ai_provider"] = "gemini_live"
            return AIAnswerEvaluationOutput(**live_json)
        except Exception as exc:
            logger.warning("Gemini answer evaluation failed Pydantic validation: %s", exc)

    # Calibrated Rubric Evaluation Engine based on actual candidate answer content
    words = candidate_answer.strip().split()
    word_count = len(words)
    ans_lower = candidate_answer.lower()
    filler_info = count_filler_words(candidate_answer)
    filler_count = filler_info["total"]

    # Check overlap with question & expected key points keywords
    q_tokens = {
        w.strip(".,?():;\"'").lower()
        for w in (question_text + " " + " ".join(expected_key_points) + " " + sample_answer).split()
        if len(w.strip(".,?():;\"'")) > 3
    }
    stop_words = {"what", "when", "where", "which", "would", "could", "should", "their", "there", "about", "through", "between", "explain", "describe", "walk"}
    domain_tokens = q_tokens - stop_words
    matched_tokens = [t for t in domain_tokens if t in ans_lower]
    keyword_ratio = len(matched_tokens) / max(1, min(12, len(domain_tokens)))

    # Check structural markers (examples, metrics, trade-offs)
    has_example = any(k in ans_lower for k in ["for example", "instance", "in my project", "during my", "implemented", "built", "production", "we used"])
    has_metric = bool(re.search(r"\b\d+%|\b\d+x|\b\d+ms|\bp95\b|\bp99\b", ans_lower))
    has_tradeoff = any(k in ans_lower for k in ["trade-off", "tradeoff", "whereas", "compared to", "on the other hand", "because", "latency", "scalability", "security"])

    # Compute 7 rubric dimensions honestly based on answer quality
    if word_count < 8:
        relevance = 35
        tech_acc = 32
        completeness = 25
        clarity = 45
        comm = 42
        prob_solv = 30
        practical = 28
    else:
        length_factor = min(1.0, word_count / 45.0)
        relevance = int(min(96, max(45, 52 + keyword_ratio * 38 + (6 if has_example else 0))))
        tech_acc = int(min(96, max(42, 50 + keyword_ratio * 36 + (8 if has_tradeoff else 0))))
        completeness = int(min(95, max(38, 42 + length_factor * 38 + (10 if has_example else 0) + (6 if has_metric else 0))))
        filler_penalty = min(18, filler_count * 3)
        clarity = int(min(96, max(45, 78 + (10 if word_count >= 25 else -12) - filler_penalty)))
        comm = int(min(96, max(48, 76 + (10 if has_example else 0) + (6 if has_metric else 0) - filler_penalty)))
        prob_solv = int(min(95, max(42, 50 + keyword_ratio * 30 + (12 if has_tradeoff else 0))))
        practical = int(min(96, max(40, 48 + keyword_ratio * 28 + (14 if has_example else 0) + (6 if has_metric else 0))))

    overall = int(round(
        relevance * 0.15 +
        tech_acc * 0.20 +
        completeness * 0.15 +
        clarity * 0.12 +
        comm * 0.13 +
        prob_solv * 0.13 +
        practical * 0.12
    ))

    what_went_well = []
    what_was_missing = []
    incorrect_statements = []

    if matched_tokens:
        what_went_well.append(f"Addressed relevant domain concepts ({', '.join(sorted(matched_tokens)[:5])}) directly tied to {question_topic}.")
    if has_example:
        what_went_well.append("Grounded the explanation with practical implementation context rather than purely abstract definitions.")
    if has_tradeoff:
        what_went_well.append("Demonstrated engineering judgment by discussing architectural cause-and-effect or trade-offs.")
    if filler_count == 0 and word_count >= 20:
        what_went_well.append("Delivered a concise, well-paced response with zero detected filler words.")
    if not what_went_well:
        what_went_well.append("Attempted a direct response to the prompt; expanding depth and structure will significantly raise your score.")

    for kp in expected_key_points:
        kp_words = [w.lower() for w in kp.split() if len(w) > 4]
        if not any(w in ans_lower for w in kp_words):
            what_was_missing.append(f"Consider explicitly covering: {kp}.")
    if word_count < 25:
        what_was_missing.append("Response was brief (<25 words); aim for 50–100 words covering mechanism, concrete example, and production trade-offs.")
    if not has_metric:
        what_was_missing.append("Adding a concrete metric (e.g., latency impact, query reduction %, or scale boundary) would strengthen credibility.")
    if not what_was_missing:
        what_was_missing.append("Could briefly address failure modes or multi-region scaling considerations for staff-level depth.")

    if "always" in ans_lower and "never" in ans_lower:
        incorrect_statements.append("Note: Avoid absolute claims ('always'/'never') in architectural answers; frame choices around workload trade-offs.")

    tips = [
        "Structure technical answers in 3 parts: (1) Direct mechanism, (2) Concrete project example, and (3) Trade-offs / edge cases.",
        f"Review key terminology around {question_topic} and practice a 60-second spoken summary.",
    ]
    if filler_count > 2:
        tips.append(f"Notice: {filler_count} filler words detected ({', '.join(filler_info['breakdown'].keys())}). Pause silently for 1 second instead of using vocal fillers.")

    follow_up = (
        f"Building on your answer about {question_topic}: what specific failure mode or bottleneck would break your approach first if load increased 10x, and how would you mitigate it?"
    )

    return AIAnswerEvaluationOutput(
        overall_score=overall,
        relevance_score=relevance,
        technical_accuracy_score=tech_acc,
        completeness_score=completeness,
        clarity_score=clarity,
        communication_score=comm,
        problem_solving_score=prob_solv,
        practical_understanding_score=practical,
        what_went_well=what_went_well,
        what_was_missing=what_was_missing[:4],
        incorrect_statements=incorrect_statements,
        suggested_improved_answer=sample_answer,
        concepts_to_study=[question_topic] + expected_key_points[:2],
        actionable_tips=tips,
        follow_up_question=follow_up,
        ai_provider="deterministic_fallback_engine",
    )
