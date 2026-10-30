# AI Interview Analyzer — Complete Full-Stack Career & Interview Intelligence Platform

A production-grade, full-stack AI interview preparation SaaS platform engineered with **React 19 + Vite + Tailwind CSS v4 + Recharts** on the frontend and **Python FastAPI + Pydantic + SQLite/PostgreSQL + Google Gemini AI** on the backend.

---

## 1. Key Capabilities

1. **Landing & Onboarding Experience**:
   - Modern Linear/Vercel-inspired Dark & Light UI system with feature showcase, How It Works architecture flow, sample candidate testimonials, interactive FAQ, and one-click Demo Account login.
2. **Secure Authentication & Session Management**:
   - PBKDF2-HMAC-SHA256 salted password hashing (260,000 iterations), signed HS256 JWT bearer tokens, protected routes, password visibility toggles, and user-level data isolation (`WHERE user_id = ?`).
3. **AI Resume Intelligence (`/resume-analyzer`)**:
   - Upload **PDF (`.pdf`)**, **Word (`.docx`)**, or **Text (`.txt`)** resumes (up to 10 MB) or paste resume text directly.
   - Extracts clean text (`pypdf`, `pdfplumber`, `python-docx`), identifies Technical & Soft Skills, summarizes Education, Experience, and Projects, computes Overall / ATS / Quantified Impact / Technical Depth scores, highlights missing role skills, and exports downloadable analysis reports.
4. **Job Description Analyzer & Compatibility Matcher (`/job-analyzer`)**:
   - Paste any target Job Description with Job Title and Company Name.
   - Extracts required & preferred skills, calculates an explainable Resume-to-Job Match Percentage, lists matching vs. missing skills, and generates a personalized **3-Week Preparation Roadmap**.
5. **6-Mode AI Mock Interview Studio (`/interview/setup` & `/interview/:id`)**:
   - Supports all **6 interview categories**:
     1. **Technical Interviews**
     2. **HR Interviews**
     3. **Behavioral Interviews (STAR Method)**
     4. **Situational Interviews**
     5. **Resume-Based Interviews**
     6. **Job-Description-Based Interviews**
   - Configurable job role, experience level, difficulty (`Easy`, `Medium`, `Hard`), and question count.
   - Includes **Browser Voice Input (Web Speech API `SpeechRecognition`)**, **Text-to-Speech Question Reader (`speechSynthesis`)**, live timer, filler-word detection (`um`, `uh`, `like`, `basically`, `actually`, `you know`), **Question Bookmarking**, and **Dynamic AI Follow-Up Question Generation**.
6. **7-Dimension AI Answer Evaluation & Coaching (`/results/:id`)**:
   - Evaluates every submitted answer across **7 structured rubric dimensions**:
     - *Relevance*, *Technical Accuracy*, *Completeness*, *Clarity*, *Communication*, *Problem-Solving Approach*, and *Practical Understanding*.
   - Provides a score out of 100, *What Was Done Well*, *What Was Missing*, *Potential Misconceptions/Caveats*, *Suggested Improved Answer*, *Relevant Concepts to Study*, and *Actionable Coaching Tips*.
7. **Performance Analytics (`/performance`) & Interview History (`/history`)**:
   - Interactive Recharts visualizations for Interview Score Progression, Category Performance (Technical vs. Behavioral vs. Resume-Based), 7-Dimension Rubric Radar/Bar averages, Topic-wise Mastery, and Filler-Word Communication Metrics.
   - Full session review, downloadable JSON/Markdown reports, question bookmark bank, and session deletion.

---

## 2. Project Architecture

```text
ai-interview-analyzer/
├── README.md
├── start_backend.sh
├── start_frontend.sh
├── sample_data/
│   ├── sample_resume.pdf
│   ├── sample_resume.docx
│   └── sample_job_description.txt
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point, CORS, startup DB init, /api/health
│   │   ├── core/
│   │   │   ├── config.py            # Environment config & Gemini API detection
│   │   │   └── security.py          # PBKDF2-HMAC-SHA256 hashing & HS256 JWT signing
│   │   ├── database/
│   │   │   ├── connection.py        # Relational SQLite schema (8 tables) + Demo account seeding
│   │   │   └── models.py            # SQLAlchemy ORM models + JSON serialization helpers
│   │   ├── schemas/
│   │   │   └── api_schemas.py       # Strict Pydantic request & AI structured output schemas
│   │   ├── services/
│   │   │   ├── resume_parser.py     # PDF/DOCX/TXT validation, extraction & skill parser
│   │   │   └── ai_service.py        # Google Gemini API client + Deterministic Fallback Engine
│   │   └── api/
│   │       ├── deps.py              # JWT authentication & user ownership dependencies
│   │       ├── auth.py              # /api/auth/* (register, login, demo, me, profile, password)
│   │       ├── resume.py            # /api/resumes/* (upload PDF/DOCX, analyze, list)
│   │       ├── jobs.py              # /api/jobs/* (analyze JD, skill match, roadmap)
│   │       ├── interviews.py        # /api/interviews/* (start, answer, follow-up, complete, bookmark)
│   │       └── analytics.py         # /api/analytics/* (dashboard & performance charts)
│   └── tests/
│       └── test_end_to_end.py       # 13-step automated E2E workflow verification suite
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── contexts/
        │   └── AuthContext.jsx
        ├── services/
        │   └── api.js
        ├── data/
        │   └── mockData.js
        ├── components/
        │   ├── common/              # Badge, Button, Card, EmptyState, Loading, Modal, ProgressBar, Toast
        │   └── layout/              # DashboardLayout.jsx
        └── pages/                   # Landing, Login, Register, Dashboard, ResumeAnalyzer, JobAnalyzer,
                                     # InterviewSetup, Interview, Results, Performance, History, Profile, Settings
```

---

## 3. Environment Variables (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
SECRET_KEY=super-secret-jwt-signing-key-change-in-production-2026
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=sqlite:///./ai_interview_analyzer.db
PORT=5000
MAX_UPLOAD_SIZE_MB=10
```

> **Transparent AI Mode**: When `GEMINI_API_KEY` is provided in `backend/.env`, the backend calls Google's Gemini REST API (`gemini-2.5-flash`) with structured JSON output validated by Pydantic (`ai_provider: "gemini_live"`). When `GEMINI_API_KEY` is omitted or unreachable, the backend automatically runs in its **Calibrated Deterministic Rubric & NLP Fallback Mode** (`ai_provider: "deterministic_fallback_engine"`), clearly labeled in the UI and API responses.

---

## 4. Quick Start Instructions

### Step 1 — Start the FastAPI Backend (Port 5000)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Optional: Add your GEMINI_API_KEY inside .env
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```
- Interactive Swagger API Docs: `http://localhost:5000/api/docs`
- Health Check Endpoint: `http://localhost:5000/api/health`

### Step 2 — Start the React + Vite Frontend (Port 5173)

```bash
cd frontend
npm install
npm run dev
```
- Open `http://localhost:5173` in your browser.

### Step 3 — Run the 13-Step Automated End-to-End Test Suite

```bash
python3 backend/tests/test_end_to_end.py
```

---

## 5. Pre-Seeded Demo Account & Live Demonstration Walkthrough

- **Demo Email**: `demo@aiinterview.dev`
- **Demo Password**: `Demo@1234` (or click **"One-Click Demo Account Login"** on the Landing or Login page)
- **Sample Files for Live Upload**:
  - `sample_data/sample_resume.pdf`
  - `sample_data/sample_resume.docx`
  - `sample_data/sample_job_description.txt`
