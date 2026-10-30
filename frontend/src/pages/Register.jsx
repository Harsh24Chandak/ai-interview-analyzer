import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import ScoreRing from '../components/common/ScoreRing';

const SENIORITY_TIERS = [
  { code: 'Entry L3', years: '0-2 yrs', value: 'Entry Level (0-2 Years)' },
  { code: 'Mid L4', years: '3-5 yrs', value: 'Mid Level (2-5 Years)' },
  { code: 'Senior L5', years: '5-8 yrs', value: 'Senior Level (5-8 Years)' },
  { code: 'Staff L6+', years: '8+ yrs', value: 'Staff / Principal (8+ Years)' },
];

const TARGET_ROLES = [
  'Full Stack Software Engineer',
  'Staff Infrastructure & Distributed Systems Engineer',
  'Senior Backend Platform Engineer',
  'Frontend Systems Architect',
  'AI / Machine Learning Engineer',
  'Data & Analytics Engineer',
];

export default function Register() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    target_role: TARGET_ROLES[0],
    experience_level: SENIORITY_TIERS[0].value,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pwdChecks = useMemo(() => {
    const p = form.password || '';
    return {
      length: p.length >= 6,
      mixed: /[a-z]/.test(p) && /[A-Z]/.test(p),
      numeral: /\d/.test(p),
      symbol: /[^A-Za-z0-9]/.test(p),
    };
  }, [form.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!agreed) {
      setErrorMsg('Please confirm the local data handling notice to continue.');
      return;
    }
    setLoading(true);
    try {
      await register(form, true);
      showToast('Account created! Welcome to your career intelligence workspace.', 'success');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col justify-between">
      {/* Top Bar */}
      <header className="h-14 px-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[6px] bg-[#786BFF]/20 border border-[#786BFF]/40 flex items-center justify-center text-[#786BFF]">
            <span className="material-symbols-outlined text-[18px]">radar</span>
          </div>
          <div>
            <span className="font-semibold text-sm block leading-none">Interview Analyzer</span>
            <span className="label-caps text-[9px] text-[var(--text-secondary)]">OBSIDIAN TELEMETRY V4.2</span>
          </div>
        </Link>
        <div className="text-xs text-[var(--text-secondary)]">
          Already registered?{' '}
          <Link to="/login" className="text-[#786BFF] font-medium hover:underline">
            Sign In →
          </Link>
        </div>
      </header>

      {/* Main Two-Column Content */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-12 gap-8 items-start my-auto">
        {/* Left Column: Registration Card */}
        <div className="lg:col-span-6 obsidian-card p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <Badge variant="violet">CANDIDATE ONBOARDING V4.2</Badge>
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">STEP 1 OF 2</span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Create your career intelligence account
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              Calibrate your target role, experience tier, and evaluation rubric across technical and behavioral interviews.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-[6px] border border-[#EF7280]/40 bg-[#EF7280]/10 text-xs text-[#EF7280]">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="label-caps text-[var(--text-secondary)]">FULL NAME</label>
                  <span className="label-caps text-[9px] text-[#36C995]">REQUIRED</span>
                </div>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Alex Rivera"
                  className="w-full obsidian-input px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="label-caps text-[var(--text-secondary)]">WORK / PERSONAL EMAIL</label>
                  <span className="label-caps text-[9px] text-[#36C995]">REQUIRED</span>
                </div>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="alex.rivera@domain.com"
                  className="w-full obsidian-input px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="label-caps text-[var(--text-secondary)]">TARGET JOB SPECIFICATION</label>
                <span className="label-caps text-[9px] text-[#42C6D9]">• AI BENCHMARK MATCHER</span>
              </div>
              <select
                value={form.target_role}
                onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                className="w-full obsidian-input px-3.5 py-2.5 text-sm"
              >
                {TARGET_ROLES.map((r) => (
                  <option key={r} value={r} className="bg-[#0C1422] text-[#F4F7FC]">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="label-caps text-[var(--text-secondary)]">SENIORITY & RIGOR CALIBRATION</label>
                <span className="text-xs text-[#786BFF] font-medium">{form.experience_level}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SENIORITY_TIERS.map((t) => {
                  const active = form.experience_level === t.value;
                  return (
                    <button
                      type="button"
                      key={t.code}
                      onClick={() => setForm({ ...form, experience_level: t.value })}
                      className={`p-2.5 rounded-[6px] border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#786BFF]/20 border-[#786BFF] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <span className="text-xs font-semibold block">{t.code}</span>
                      <span className="font-mono-tabular text-[10px] text-[var(--text-secondary)]">{t.years}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="label-caps text-[var(--text-secondary)]">ACCOUNT PASSWORD (MIN 6 CHARS)</label>
                <Badge variant={pwdChecks.length ? 'emerald' : 'warning'} size="xs">
                  {pwdChecks.length ? 'READY' : 'MIN 6 CHARS'}
                </Badge>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full obsidian-input px-3.5 py-2.5 text-sm pr-10"
                  placeholder="Enter a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2 text-[10px] font-mono-tabular">
                <span className={pwdChecks.length ? 'text-[#36C995]' : 'text-[var(--text-muted)]'}>✓ 6+ chars</span>
                <span className={pwdChecks.mixed ? 'text-[#36C995]' : 'text-[var(--text-muted)]'}>✓ Mixed case</span>
                <span className={pwdChecks.numeral ? 'text-[#36C995]' : 'text-[var(--text-muted)]'}>✓ Numeral</span>
                <span className={pwdChecks.symbol ? 'text-[#36C995]' : 'text-[var(--text-muted)]'}>✓ Symbol</span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-[var(--border-subtle)]"
              />
              <span>
                I understand that my profile, uploaded resumes, and interview transcripts are stored in the application's user-scoped SQLite database with PBKDF2-SHA256 password hashing. You can add education, work history, and skills in your Profile after registration.
              </span>
            </label>

            <Button type="submit" isLoading={loading} className="w-full py-3">
              Create Account & Begin Career Assessment
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Button>
          </form>
        </div>

        {/* Right Column: Readiness Pipeline & Sample Target Preview */}
        <div className="lg:col-span-6 space-y-5">
          <div className="obsidian-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="label-caps text-xs text-[var(--text-primary)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#36C995]" />
                CANDIDATE READINESS PIPELINE
              </span>
              <Badge variant="gray" size="xs">4 MODULES</Badge>
            </div>

            <div className="space-y-3">
              {[
                {
                  num: '01',
                  title: 'Ingest Resume & Skill Signal',
                  desc: 'Parse PDF, DOCX, or TXT resumes to extract technical skills, soft skills, experience, and ATS structure.',
                  tag: 'PARSER',
                },
                {
                  num: '02',
                  title: 'Match Target JD Criteria',
                  desc: 'Cross-reference job description requirements against your extracted resume skills and build a 3-week learning roadmap.',
                  tag: 'MATCHER',
                },
                {
                  num: '03',
                  title: 'Run AI Mock Simulation',
                  desc: 'Practice across 6 interview modes and 4 company styles with text/voice input and a code scratchpad.',
                  tag: 'STUDIO',
                },
                {
                  num: '04',
                  title: 'Measure 7-Dimension Score',
                  desc: 'Review Relevance, Technical Accuracy, Completeness, Clarity, Communication, Problem Solving, and Practical Depth.',
                  tag: 'ANALYTICS',
                },
              ].map((st) => (
                <div key={st.num} className="obsidian-subpanel p-3.5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-[4px] bg-[#786BFF]/15 border border-[#786BFF]/30 font-mono-tabular text-xs font-bold text-[#C5C0FF] flex items-center justify-center shrink-0">
                      {st.num}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{st.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{st.desc}</p>
                    </div>
                  </div>
                  <Badge variant="emerald" size="xs">{st.tag}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="obsidian-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="label-caps text-[10px] text-[var(--text-secondary)] block">
                  SAMPLE TARGET BENCHMARK PREVIEW
                </span>
                <h3 className="text-base font-semibold">Target Readiness Goals</h3>
              </div>
              <Badge variant="cyan" size="xs">BENCHMARK EXAMPLE</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 py-2 text-center">
              <div className="flex flex-col items-center">
                <ScoreRing score={88} size={72} strokeWidth={6} label="%" variant="emerald" />
                <span className="label-caps text-[10px] text-[var(--text-secondary)] mt-2">TARGET SCORE</span>
              </div>
              <div className="flex flex-col items-center">
                <ScoreRing score={85} size={72} strokeWidth={6} label="%" variant="cyan" />
                <span className="label-caps text-[10px] text-[var(--text-secondary)] mt-2">STAR COVERAGE</span>
              </div>
              <div className="flex flex-col items-center">
                <ScoreRing score={90} size={72} strokeWidth={6} label="%" variant="violet" />
                <span className="label-caps text-[10px] text-[var(--text-secondary)] mt-2">ATS ALIGNMENT</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="h-12 px-6 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>© 2026 AI Interview Analyzer</span>
        <span>Local SQLite Persistence • FastAPI + React 19</span>
      </footer>
    </div>
  );
}
