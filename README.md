# AI Interview Analyzer — Obsidian Telemetry Career Intelligence Platform (v4.2)

A full-stack AI interview preparation and career intelligence web application built with **React 19 + Vite + Tailwind CSS 4 + React Router 7 + Recharts** on the frontend and **Python + FastAPI + Pydantic + SQLite (`sqlite3`) + Google Gemini API** on the backend.

---

## 1. Implemented Features (All 17 Stitch Screens)

1. **Public Landing Page (`/`)**:
   - Overview of the Obsidian Telemetry interface, simulated product preview (explicitly labeled as a preview), 4-pillar infrastructure showcase, 6 interview modes, 3-step execution pipeline, and interactive FAQ.
2. **Authentication & Onboarding (`/login`, `/register`)**:
   - Salted `PBKDF2-HMAC-SHA256` password hashing (260,000 iterations) and signed `HS256` JWT bearer tokens.
   - Workstation persistence toggle (`localStorage` vs `sessionStorage`) and 1-Click Demo Account login (`POST /api/auth/demo`) backed strictly by real server authentication.
3. **Executive Cockpit Dashboard (`/dashboard`)**:
   - Displays real candidate statistics (`GET /api/analytics/dashboard`): completed sessions, average interview score, resume intelligence score, job compatibility score, readiness index radial gauge, score progression chart, prioritized skill deltas, recommended actions, recent mock evaluations table, and resume/job pipeline summaries.
   - Includes a 1-click **Load Sample Portfolio (Demo Data)** action (`POST /api/auth/seed-sample-data`) for new accounts, clearly tagging seeded records as demo/sample data.
4. **Resume Intelligence — Upload & Results (`/resume-analyzer`)**:
   - Drag-and-drop or file browser upload for `.pdf`, `.docx`, and `.txt` resumes (up to 10 MB) or plain-text paste.
   - Extracts text via `pypdf`, `pdfplumber`, and `python-docx`, identifies technical and soft skills, summarizes experience/education/projects, computes Overall, ATS Structure, Quantified Impact, and Technical Depth scores, and includes the **AI Resume Bullet XYZ Optimizer** (`POST /api/resumes/rewrite-bullets`).
5. **Job Description Compatibility — Input & Results (`/job-analyzer`)**:
   - Analyzes target job descriptions against uploaded resumes (`POST /api/jobs/analyze`), computing an explainable match percentage, required/preferred/matching/missing skill matrices, role expectations, and a 3-week preparation roadmap with a direct **Launch Tailored AI Mock** action.
6. **AI Interview Configuration Studio (`/interview/setup`)**:
   - Supports all **6 specialized interview modes**: `Technical`, `Behavioral`, `HR`, `Situational`, `Resume-Based`, and `Job-Description-Based`.
   - Supports **4 company interview styles**: `High-Growth SaaS`, `Big Tech / FAANG`, `FinTech / High-Frequency`, and `Enterprise Core Platform`—passed into question generation and persisted with the session.
   - Configurable experience tier, difficulty (`Easy`, `Medium`, `Hard`), and question count (`1–15`).
7. **Live AI Interview Workspace & Individual Answer Evaluation (`/interview/:id`)**:
   - Split workspace with central question/editor stage and a 380px right-side telemetry inspector.
   - Supports browser speech dictation (`SpeechRecognition` / `webkitSpeechRecognition`) and prompt audio playback (`speechSynthesis`) with an honest fallback to typing where unsupported.
   - Includes a non-executing **Technical Code / Architecture Scratchpad** (persisted with each answer and included in AI evaluation) and text-derived heuristic **STAR Indicators** (`Situation`, `Task`, `Action`, `Result`) plus word count, estimated WPM, and filler-word count.
   - Displays the **Seven-Dimension Competency Evaluation** (`Relevance`, `Technical Accuracy`, `Completeness`, `Clarity`, `Communication`, `Problem Solving`, `Practical Understanding`), strengths, missing points, exemplar improved answer, and dynamic follow-up question.
8. **Final Interview Report (`/results/:id`)**:
   - Complete session audit displaying company style, 7-dimension radar and progress bars, verbal/filler metrics, strengths, growth vectors, expandable question-by-question transcripts with persisted `code_snippet` and `star_telemetry`, print view, and JSON export.
9. **Performance Analytics (`/performance`)**:
   - Visualizes all 5 backend analytics datasets (`score_trends`, `category_performance`, `rubric_dimensions`, `topic_breakdown`, `communication_metrics`) with timeframe filtering (`30D`, `90D`, `ALL-TIME`).
10. **Interview History (`/history`) & Saved Questions (`/bookmarks`)**:
    - Searchable, filterable, and sortable session archive with confirmation modal deletion (`DELETE /api/interviews/{id}`).
    - Dedicated Saved Questions & Drill Bank workspace (`GET /api/interviews/bookmarks/list`) with category/difficulty filters, exemplar answer toggle, and flashcard review.
11. **Candidate Profile (`/profile`) & Settings (`/settings`)**:
    - Full CRUD for candidate profile fields (`full_name`, `target_role`, `experience_level`, `years_of_experience`, `bio`, `skills`, `career_interests`, `education`, `experience`).
    - Theme switcher (`Dark` Obsidian Telemetry `#080D18` vs. `Light` Daylight `#F4F6FA`), notification toggles, password change (`POST /api/auth/change-password`), real AI engine status (`GET /api/health`), and transparent `Not Connected / Coming Soon` indicators for unintegrated external services.

---

## 2. Technology Stack & Architecture

- **Frontend (`frontend/`)**: React 19, Vite 6, JavaScript (JSX), Tailwind CSS 4, React Router 7, Axios, Recharts, Lucide React, and Google Fonts (`Geist`, `JetBrains Mono`, `Material Symbols Outlined`).
- **Backend (`backend/`)**: Python 3.11+, FastAPI, Uvicorn, Pydantic, raw `sqlite3` connection manager with safe `PRAGMA table_info` schema migrations, `pypdf` + `pdfplumber` + `python-docx` for resume parsing, and `httpx` for server-side Google Gemini API calls.
- **Database (`SQLite`)**: Relational tables (`users`, `resumes`, `resume_analyses`, `job_descriptions`, `interview_sessions`, `interview_questions`, `interview_answers`, `interview_evaluations`) with foreign-key cascades and strict `WHERE user_id = ?` ownership isolation.

---

## 3. Environment Setup & Gemini Configuration

Create `backend/.env` from `backend/.env.example`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
SECRET_KEY=replace-with-a-secure-random-jwt-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=sqlite:///./ai_interview_analyzer.db
PORT=5000
MAX_UPLOAD_SIZE_MB=10
```

- **Live Google Gemini Mode**: When a valid `GEMINI_API_KEY` is provided in `backend/.env`, the backend calls Google Gemini (`gemini-2.5-flash`) with `responseMimeType: "application/json"` and validates responses through Pydantic schemas (`ai_provider: "gemini_live"`).
- **Deterministic Fallback Mode**: When `GEMINI_API_KEY` is omitted, empty, or unreachable, the backend automatically executes its built-in **Deterministic Rubric & NLP Engine** (`ai_provider: "deterministic_fallback_engine"`), clearly labeled in API responses and UI badges.

---

## 4. Running the Application

### Backend Setup (Port 5000)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```
- OpenAPI / Swagger UI: `http://localhost:5000/api/docs`
- Health Check: `http://localhost:5000/api/health`

### Frontend Setup (Port 5173)

```bash
cd frontend
npm install
npm run dev
```
- Application URL: `http://localhost:5173`
- Pre-seeded Demo Account: `demo@aiinterview.dev` / `Demo@1234` (or click **1-Click Load: Demo Candidate Account** on `/login`).

---

## 5. Automated Testing

Run the backend compilation and end-to-end test suite (uses an isolated temporary SQLite database so your main database is never modified):

```bash
python -m compileall backend/app backend/tests
PYTHONPATH=backend python backend/tests/test_end_to_end.py
```

Build and lint the frontend:

```bash
cd frontend
npm install
npm run build
npm run lint
```

---

## 6. Known Limitations & Supported Browser Functionality

- **Browser Speech APIs**: Voice dictation (`SpeechRecognition` / `webkitSpeechRecognition`) and question audio playback (`speechSynthesis`) rely on browser support (best in Chrome/Edge). Where unsupported or when microphone permission is denied, the live interview workspace displays a clear notice and falls back to text input. No WebRTC audio/video recording or acoustic waveform analysis is performed.
- **Technical Code Scratchpad**: The code/architecture tab in the live interview workspace is a technical notes scratchpad included in AI text evaluation; it is not a sandboxed code compiler or execution runtime.
- **STAR & Communication Telemetry**: STAR indicators (`Situation`, `Task`, `Action`, `Result`), word count, estimated WPM, and filler-word counts are heuristic metrics derived from submitted answer text and elapsed question time.
- **External Integrations**: Third-party SSO (Google/GitHub), external LLMs (Claude/GPT-4o/DeepSeek), and external ATS webhooks are not integrated and are explicitly marked as *Not Connected / Coming Soon* in Settings.
