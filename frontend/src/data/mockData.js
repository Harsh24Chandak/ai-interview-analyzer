export const INITIAL_DEMO_USER = {
  id: 1,
  full_name: "Madhura Patil",
  email: "demo@aiinterview.dev",
  target_role: "Full Stack Software Engineer",
  experience_level: "Entry Level (0-2 Years)",
  years_of_experience: 1,
  bio: "Final-year Computer Science student building full-stack AI applications with React, FastAPI, and cloud-native architectures.",
  education: [
    {
      degree: "B.Tech in Computer Science & Engineering",
      institution: "DKTE Society's Textile & Engineering Institute",
      year: "2022 - 2026",
      grade: "8.9 CGPA"
    }
  ],
  experience: [
    {
      role: "Full-Stack Developer Intern",
      company: "NexaCloud Systems",
      duration: "May 2025 - Aug 2025",
      highlights: "Built REST APIs in FastAPI, reduced query latency by 38%, and implemented React telemetry dashboards."
    }
  ],
  skills: ["Python", "FastAPI", "React", "TypeScript", "SQL", "PostgreSQL", "Docker", "Git", "REST APIs", "Tailwind CSS"],
  career_interests: ["Full-Stack Engineering", "AI/ML Systems", "Backend Architecture", "Cloud Native"],
  theme_preference: "dark"
};

export const INITIAL_RESUME_ANALYSIS = {
  id: 1,
  target_role: "Full Stack Software Engineer",
  overall_score: 86,
  ats_compatibility_score: 90,
  impact_score: 82,
  technical_depth_score: 87,
  extracted_skills: {
    technical_skills: ["Python", "JavaScript", "TypeScript", "SQL", "React", "FastAPI", "Node.js", "Tailwind CSS", "PostgreSQL", "Docker", "Git"],
    soft_skills: ["Problem Solving", "Collaborative Engineering", "Technical Communication", "Agile Delivery"]
  },
  experience_summary: INITIAL_DEMO_USER.experience,
  education_summary: INITIAL_DEMO_USER.education,
  projects_summary: [
    { name: "AI Interview Analyzer", summary: "Full-stack AI interview preparation and analytics platform using React, FastAPI, SQLite, and Google Gemini API." },
    { name: "Collaborative Code Editor", summary: "Real-time code synchronization and execution workspace using WebSockets." }
  ],
  strengths: [
    "Quantified latency improvements (420ms to 260ms, 38% reduction) in internship experience bullets",
    "Strong modern full-stack alignment with React, TypeScript, Python, and FastAPI",
    "Production-grade capstone project demonstrating end-to-end AI integration"
  ],
  weaknesses: [
    "Cloud deployment metrics (AWS/GCP, CI/CD test coverage percentages) can be expanded",
    "Caching layer experience (Redis/message queues) not explicitly listed"
  ],
  missing_skills: ["Redis", "Kubernetes", "AWS/GCP", "System Design", "Automated Testing (Pytest/Playwright)"],
  improvement_recommendations: [
    "Add unit and integration test coverage metrics to the AI Interview Analyzer project description",
    "Include experience with caching (Redis) and container orchestration or cloud deployment",
    "Structure every bullet with the XYZ impact formula"
  ],
  ai_provider: "seeded_baseline"
};

export const INITIAL_JOB_ANALYSIS = {
  id: 1,
  job_title: "Full Stack Software Engineer (AI Platform)",
  company_name: "LinearScale Technologies",
  match_percentage: 82,
  required_skills: ["Python", "FastAPI", "React", "TypeScript", "PostgreSQL", "SQL", "REST APIs", "Docker", "Redis", "AWS", "Pytest"],
  preferred_skills: ["Kubernetes", "GraphQL", "CI/CD Pipelines", "LLM Prompt Engineering"],
  matching_skills: ["Python", "FastAPI", "React", "TypeScript", "PostgreSQL", "SQL", "REST APIs", "Docker"],
  missing_skills: ["Redis", "AWS", "Pytest", "Kubernetes"],
  experience_requirements: "0-2 years of full-stack software engineering experience with modern web frameworks.",
  role_expectations: [
    "Architect and ship responsive React + TypeScript interfaces",
    "Design low-latency FastAPI backend services and relational schemas",
    "Integrate LLM workflows with structured validation and fallback guarantees"
  ],
  learning_roadmap: [
    { week: "Week 1", focus: "Caching & Performance", action: "Implement Redis caching for session & analytics endpoints and benchmark hit rates." },
    { week: "Week 2", focus: "Automated Testing", action: "Write Pytest integration suites covering auth, file uploads, and AI evaluation schemas." },
    { week: "Week 3", focus: "Cloud Architecture", action: "Deploy containerized FastAPI + React stack on AWS ECS or Render with CI/CD." }
  ],
  readiness_recommendations: [
    "Prepare STAR stories around your NexaCloud latency optimization (38% improvement)",
    "Review Redis caching patterns (write-through vs cache-aside) before your technical round",
    "Practice explaining JWT signing, CORS security, and Pydantic validation in interviews"
  ],
  ai_provider: "seeded_baseline"
};
