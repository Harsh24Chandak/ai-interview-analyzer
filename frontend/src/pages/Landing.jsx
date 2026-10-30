import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import ScoreRing from '../components/common/ScoreRing';

const SIX_MODES = [
  {
    code: 'MODE 01',
    icon: 'dns',
    title: 'Technical System Design',
    desc: 'Stress-tests scalability decisions, partitioning schemes, concurrency models, and caching patterns with structured architectural probing.',
    tag: 'ARCHITECTURAL PROBING',
    color: 'text-[#42C6D9]',
  },
  {
    code: 'MODE 02',
    icon: 'psychology',
    title: 'Behavioral STAR Matrix',
    desc: 'Audits narrative structure across Situation, Task, Action, and Result indicators, evaluating ownership and quantifiable outcomes.',
    tag: 'STAR SYNTAX VALIDATION',
    color: 'text-[#36C995]',
  },
  {
    code: 'MODE 03',
    icon: 'groups',
    title: 'Hiring Manager & HR Screen',
    desc: 'Assesses role alignment, career progression clarity, communication composure, and team collaboration during screening loops.',
    tag: 'EXECUTIVE SCREENING',
    color: 'text-[#42C6D9]',
  },
  {
    code: 'MODE 04',
    icon: 'bolt',
    title: 'Situational Leadership',
    desc: 'Simulates production incident triage, engineering prioritization trade-offs, and cross-functional conflict resolution scenarios.',
    tag: 'CONFLICT RESOLUTION',
    color: 'text-[#786BFF]',
  },
  {
    code: 'MODE 05',
    icon: 'find_in_page',
    title: 'Resume Deep-Dive Forensic',
    desc: 'Drills directly into claims, technologies, and projects listed on your uploaded resume to verify practical implementation depth.',
    tag: 'RESUME CROSS-CHECK',
    color: 'text-[#36C995]',
  },
  {
    code: 'MODE 06',
    icon: 'track_changes',
    title: 'JD-Targeted Challenge',
    desc: 'Uses your ingested target job description to tailor questions exclusively around required technical and domain competencies.',
    tag: '1:1 JOB MATCHING',
    color: 'text-[#42C6D9]',
  },
];

const FAQS = [
  {
    q: 'How does the 7-dimension AI evaluation rubric score candidate responses?',
    a: 'Every submitted response is evaluated across seven explicit dimensions: Relevance, Technical Accuracy, Completeness, Clarity, Communication, Problem-Solving Approach, and Practical Understanding. When GEMINI_API_KEY is configured on the backend, evaluations run via Google Gemini with Pydantic schema validation; otherwise, the calibrated deterministic rubric engine executes automatically.',
  },
  {
    q: 'How are uploaded resumes and interview transcripts stored?',
    a: 'All resumes, job descriptions, interview sessions, code snippets, and STAR telemetry records are stored in your local SQLite database scoped strictly to your authenticated user_id via signed HS256 JWT tokens.',
  },
  {
    q: 'Can I practice both technical system design and behavioral interviews?',
    a: 'Yes. The Interview Studio supports six specialized modes—Technical, Behavioral, HR, Situational, Resume-Based, and Job-Description-Based—plus four company calibration styles (High-Growth SaaS, Big Tech / FAANG, FinTech / High-Frequency, and Enterprise Core Platform).',
  },
  {
    q: 'How does voice input work during a live mock interview?',
    a: 'The live workspace integrates the browser Web Speech API (SpeechRecognition for dictation and speechSynthesis for reading prompts aloud). If your browser does not support speech recognition, full text and code scratchpad input remain seamlessly available.',
  },
];

export default function Landing() {
  const { isAuthenticated, loginDemo, theme, toggleTheme } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleExploreDemo = async () => {
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }
    setDemoLoading(true);
    try {
      await loginDemo();
      showToast('Signed into Demo Workspace', 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message || 'Demo login unavailable. Please sign in or start backend.', 'error');
      navigate('/login');
    } finally {
      setDemoLoading(false);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Top Primary Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[6px] bg-[#786BFF]/20 border border-[#786BFF]/40 flex items-center justify-center text-[#786BFF]">
                <span className="material-symbols-outlined text-[18px]">radar</span>
              </div>
              <span className="font-semibold text-sm tracking-tight">Interview Analyzer</span>
            </Link>
            <nav className="hidden md:flex items-center gap-5 text-xs text-[var(--text-secondary)]">
              <button onClick={() => scrollToSection('overview')} className="hover:text-[var(--text-primary)] cursor-pointer">
                Overview
              </button>
              <button onClick={() => scrollToSection('infrastructure')} className="hover:text-[var(--text-primary)] cursor-pointer">
                Core Infrastructure
              </button>
              <button onClick={() => scrollToSection('modes')} className="hover:text-[var(--text-primary)] cursor-pointer">
                6 Modes
              </button>
              <button onClick={() => scrollToSection('pipeline')} className="hover:text-[var(--text-primary)] cursor-pointer">
                How It Works
              </button>
              <button onClick={() => scrollToSection('faq')} className="hover:text-[var(--text-primary)] cursor-pointer">
                FAQ
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-[6px] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Toggle Theme"
            >
              <span className="material-symbols-outlined text-[16px]">
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>
            <Link to={isAuthenticated ? '/dashboard' : '/login'} className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1">
              {isAuthenticated ? 'Open Workspace' : 'Sign In'}
            </Link>
            <Link
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="btn-primary-violet px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5"
            >
              Start Preparing Free
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Sub-navigation bar matching Stitch Screen 01 */}
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <div className="flex items-center gap-5 overflow-x-auto">
              <button onClick={() => scrollToSection('infrastructure')} className="hover:text-[var(--text-primary)] whitespace-nowrap cursor-pointer">
                Resume Intelligence
              </button>
              <button onClick={() => scrollToSection('infrastructure')} className="hover:text-[var(--text-primary)] whitespace-nowrap cursor-pointer">
                Job Compatibility
              </button>
              <button onClick={() => scrollToSection('infrastructure')} className="hover:text-[var(--text-primary)] whitespace-nowrap cursor-pointer">
                Interview Studio
              </button>
              <button onClick={() => scrollToSection('infrastructure')} className="hover:text-[var(--text-primary)] whitespace-nowrap cursor-pointer">
                Evaluation Rubric
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 label-caps text-[10px] text-[#36C995]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#36C995]" />
              OBSIDIAN TELEMETRY V4.2
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="overview" className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] label-caps text-[10px] text-[var(--text-secondary)] mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#42C6D9]" />
          CAREER INTELLIGENCE V4.2 • STRUCTURED 7-DIMENSION EVALUATION ENGINE
        </div>

        <h1 className="text-[32px] sm:text-[44px] font-semibold tracking-tight leading-[1.12] max-w-3xl mx-auto mb-4">
          Your AI-powered path to{' '}
          <span className="bg-gradient-to-r from-[#42C6D9] to-[#36C995] bg-clip-text text-transparent">
            interview readiness.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl mx-auto mb-7 leading-relaxed">
          Analyze resumes against ATS standards, benchmark your skills against real job descriptions, simulate technical and behavioral interviews, and receive 7-dimension rubric feedback.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <Link
            to={isAuthenticated ? '/dashboard' : '/register'}
            className="btn-primary-violet px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
          >
            Start Preparing Free
            <span className="material-symbols-outlined text-[16px]">bolt</span>
          </Link>
          <Button
            variant="secondary"
            size="md"
            isLoading={demoLoading}
            materialIcon="play_circle"
            onClick={handleExploreDemo}
          >
            Explore Live Demo
          </Button>
        </div>

        {/* Simulated Product Preview Window (Explicitly Labeled) */}
        <div className="obsidian-card p-4 sm:p-6 text-left max-w-4xl mx-auto shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF7280]/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F1B65D]/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#36C995]/70" />
              <span className="label-caps text-[10px] text-[var(--text-secondary)] ml-2">
                PRODUCT PREVIEW: LIVE INTERVIEW TELEMETRY WORKSPACE
              </span>
            </div>
            <Badge variant="emerald" size="xs">SAMPLE UI PREVIEW</Badge>
          </div>

          <div className="grid md:grid-cols-12 gap-4">
            <div className="md:col-span-7 obsidian-subpanel p-4 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="gray" size="xs">VOICE & TEXT DICTATION</Badge>
                <Badge variant="cyan" size="xs">STAR MODE: RESULT</Badge>
              </div>
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-[8px] bg-[#786BFF]/15 border border-[#786BFF]/30 flex items-center justify-center mx-auto mb-2 text-[#786BFF]">
                  <span className="material-symbols-outlined text-[24px]">graphic_eq</span>
                </div>
                <p className="label-caps text-[10px] text-[var(--text-secondary)]">
                  AI INTERVIEWER EVALUATING REAL-TIME STRUCTURE & CODE
                </p>
              </div>
              <div className="p-3 rounded-[6px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-mono-tabular">
                <span className="text-[#42C6D9] font-semibold">[ACTION]</span> "...Migrated write-path to a partitioned commit log and added composite SQL indexes,{' '}
                <span className="text-[#36C995] font-semibold">[RESULT]</span> cutting p95 query latency by 38% from 420ms to 260ms."
              </div>
            </div>

            <div className="md:col-span-5 obsidian-subpanel p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="label-caps text-[10px] text-[var(--text-secondary)] block">SAMPLE RUBRIC SCORE</span>
                  <span className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)]">91 / 100</span>
                </div>
                <ScoreRing score={91} size={64} strokeWidth={5} label="%" />
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Technical Accuracy', val: 93, c: 'bg-[#786BFF]' },
                  { label: 'STAR Completeness', val: 90, c: 'bg-[#42C6D9]' },
                  { label: 'Communication Clarity', val: 88, c: 'bg-[#36C995]' },
                  { label: 'Problem Solving & Trade-offs', val: 91, c: 'bg-[#786BFF]' },
                ].map((bar, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[var(--text-secondary)]">{bar.label}</span>
                      <span className="font-mono-tabular">{bar.val}%</span>
                    </div>
                    <div className="h-1.5 rounded-[4px] bg-[var(--bg-elevated)] overflow-hidden">
                      <div className={`h-full ${bar.c}`} style={{ width: `${bar.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Capabilities Bar */}
      <section className="border-y border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="label-caps text-[10px] text-[#42C6D9] block mb-1">SYSTEM CAPABILITIES</span>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Designed for candidates targeting High-Growth SaaS, Big Tech, FinTech & Enterprise Engineering roles.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-8">
            <div>
              <span className="font-mono-tabular text-xl font-semibold text-[#42C6D9] block">6 MODES</span>
              <span className="text-[11px] text-[var(--text-secondary)]">Specialized Interview Types</span>
            </div>
            <div>
              <span className="font-mono-tabular text-xl font-semibold text-[#786BFF] block">7-DIM</span>
              <span className="text-[11px] text-[var(--text-secondary)]">Structured Rubric Matrix</span>
            </div>
            <div>
              <span className="font-mono-tabular text-xl font-semibold text-[#36C995] block">PDF / DOCX</span>
              <span className="text-[11px] text-[var(--text-secondary)]">Resume & JD Gap Parsing</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Infrastructure 2x2 Showcase */}
      <section id="infrastructure" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-10">
          <span className="label-caps text-[10px] text-[#42C6D9] block mb-1.5">CORE INFRASTRUCTURE</span>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            High-bandwidth career intelligence. Built for forensic precision.
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Every module converts unstructured resumes, job descriptions, and interview responses into actionable feedback.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="obsidian-card p-6 space-y-4">
            <div className="w-9 h-9 rounded-[6px] bg-[#786BFF]/15 border border-[#786BFF]/30 flex items-center justify-center text-[#786BFF]">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
            <h3 className="text-lg font-semibold">Resume Intelligence & Impact Rewriter</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Upload PDF, DOCX, or TXT resumes to extract technical and soft skills, evaluate ATS structure, and transform passive bullets into Google XYZ impact statements.
            </p>
            <div className="obsidian-subpanel p-3 space-y-2 text-xs font-mono-tabular">
              <div className="text-[#EF7280] line-through">BEFORE: Worked on backend APIs using Python and SQL.</div>
              <div className="text-[#36C995]">
                OPTIMIZED: Engineered 12+ RESTful microservices in FastAPI with composite SQL indexing, cutting p95 latency by 38%.
              </div>
            </div>
          </div>

          <div className="obsidian-card p-6 space-y-4">
            <div className="w-9 h-9 rounded-[6px] bg-[#42C6D9]/15 border border-[#42C6D9]/30 flex items-center justify-center text-[#42C6D9]">
              <span className="material-symbols-outlined text-[20px]">rule_folder</span>
            </div>
            <h3 className="text-lg font-semibold">Job Compatibility & Gap Detection</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Compare your ingested resume against target job descriptions to identify matching skills, missing requirements, and a 3-week preparation roadmap.
            </p>
            <div className="obsidian-subpanel p-3 flex flex-wrap gap-2">
              <Badge variant="emerald">✓ Python / FastAPI (Matched)</Badge>
              <Badge variant="emerald">✓ React / TypeScript (Matched)</Badge>
              <Badge variant="danger">✕ Redis Caching (Gap)</Badge>
              <Badge variant="cyan">✓ PostgreSQL (Matched)</Badge>
            </div>
          </div>

          <div className="obsidian-card p-6 space-y-4">
            <div className="w-9 h-9 rounded-[6px] bg-[#36C995]/15 border border-[#36C995]/30 flex items-center justify-center text-[#36C995]">
              <span className="material-symbols-outlined text-[20px]">mic</span>
            </div>
            <h3 className="text-lg font-semibold">AI Mock Interview Studio</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Practice one question at a time with browser voice dictation, text-to-speech prompt reading, a technical code/architecture scratchpad, and dynamic follow-up probes.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)] obsidian-subpanel p-3">
              <span>• Company Style Calibration</span>
              <span>• Technical Code Scratchpad</span>
              <span>• Browser Speech Dictation</span>
              <span>• Dynamic Follow-Up Probes</span>
            </div>
          </div>

          <div className="obsidian-card p-6 space-y-4">
            <div className="w-9 h-9 rounded-[6px] bg-[#786BFF]/15 border border-[#786BFF]/30 flex items-center justify-center text-[#786BFF]">
              <span className="material-symbols-outlined text-[20px]">insights</span>
            </div>
            <h3 className="text-lg font-semibold">7-Dimension Evaluation Rubric</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Receive granular scoring across Relevance, Technical Accuracy, Completeness, Clarity, Communication, Problem Solving, and Practical Understanding.
            </p>
            <div className="obsidian-subpanel p-3 flex items-center justify-between text-xs font-mono-tabular">
              <span className="text-[var(--text-secondary)]">RUBRIC DIMENSIONS</span>
              <span className="text-[#C5C0FF]">7 SCORED AXES + EXEMPLAR REWRITE</span>
            </div>
          </div>
        </div>
      </section>

      {/* Six Specialized Interview Modes */}
      <section id="modes" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <span className="label-caps text-[10px] text-[#42C6D9] block mb-1.5">ADAPTIVE SIMULATION ENGINE</span>
          <h2 className="text-2xl sm:text-3xl font-semibold">Six Specialized Interview Modes</h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Calibrate the interviewer focus and company bar to mirror your target engineering loop.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SIX_MODES.map((m) => (
            <div key={m.code} className="obsidian-card-interactive p-5 flex flex-col justify-between space-y-4" onClick={() => navigate('/interview/setup')}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`material-symbols-outlined text-[20px] ${m.color}`}>{m.icon}</span>
                  <span className="label-caps text-[10px] text-[var(--text-muted)]">{m.code}</span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">{m.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{m.desc}</p>
              </div>
              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <span className={`label-caps text-[10px] ${m.color}`}>• {m.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="pipeline" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <span className="label-caps text-[10px] text-[#42C6D9] block mb-1">EXECUTION PROTOCOL</span>
          <h2 className="text-2xl font-semibold">How Career Intelligence Operates</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              step: '01',
              icon: 'upload_file',
              title: 'Ingest Resume & Job Spec',
              desc: 'Upload your PDF/DOCX resume and paste your target job description to extract baseline skills and identify missing requirements.',
              foot: 'SKILL & GAP EXTRACTION',
            },
            {
              step: '02',
              icon: 'record_voice_over',
              title: 'Conduct Realistic AI Simulation',
              desc: 'Answer tailored questions via text or voice dictation, sketch technical architectures in the scratchpad, and tackle follow-up probes.',
              foot: 'LIVE TELEMETRY & SCRATCHPAD',
            },
            {
              step: '03',
              icon: 'fact_check',
              title: 'Actionable Remediation',
              desc: 'Review 7-dimension scores, STAR completeness indicators, suggested improved answers, and longitudinal analytics.',
              foot: '7-DIMENSION POST-MORTEM',
            },
          ].map((st) => (
            <div key={st.step} className="obsidian-card p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono-tabular text-lg font-semibold text-[#42C6D9]">{st.step}</span>
                  <span className="material-symbols-outlined text-[18px] text-[var(--text-secondary)]">{st.icon}</span>
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{st.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{st.desc}</p>
              </div>
              <span className="label-caps text-[10px] text-[#36C995]">{st.foot}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <span className="label-caps text-[10px] text-[var(--text-secondary)] block mb-1">FREQUENTLY INQUIRED</span>
          <h2 className="text-2xl font-semibold">Architecture & Evaluation Inquiries</h2>
        </div>
        <div className="space-y-2.5">
          {FAQS.map((item, idx) => (
            <div key={idx} className="obsidian-card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                className="w-full px-5 py-4 text-left text-xs sm:text-sm font-medium flex items-center justify-between cursor-pointer"
              >
                <span>{item.q}</span>
                <span className="material-symbols-outlined text-[18px] text-[var(--text-secondary)]">
                  {openFaq === idx ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-4 pt-1 text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)] leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="obsidian-card p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#111C2D] via-[#17243A] to-[#111C2D]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#786BFF] text-[18px]">radar</span>
              <span className="label-caps text-[11px] text-[var(--text-secondary)]">AI Interview Analyzer</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold">Enter your next interview with calculated certainty.</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Upload your resume, benchmark against a target role, and start a full mock simulation now.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/register" className="btn-primary-violet px-5 py-2.5 text-xs font-semibold">
              Start Preparing Free →
            </Link>
            <Link
              to="/login"
              className="px-4 py-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs font-medium hover:bg-[var(--bg-elevated)]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border-subtle)] py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
          <span>AI Interview Analyzer • Obsidian Telemetry Career Intelligence</span>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-[var(--text-primary)]">Sign In</Link>
            <Link to="/register" className="hover:text-[var(--text-primary)]">Register</Link>
            <button onClick={handleExploreDemo} className="hover:text-[var(--text-primary)] cursor-pointer">
              Demo Workspace
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
