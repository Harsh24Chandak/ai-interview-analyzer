import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

export default function Login() {
  const { login, loginDemo } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('demo@aiinterview.dev');
  const [password, setPassword] = useState('Demo@1234');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await login({ email, password }, rememberMe);
      showToast('Authenticated into Workspace', 'success');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMsg('');
    setDemoLoading(true);
    try {
      await loginDemo();
      showToast('Loaded pre-seeded Demo Account', 'success');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message);
      showToast(err.message, 'error');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] grid lg:grid-cols-12">
      {/* Left Column: Authentication Form */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 border-r border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-[#786BFF]/20 border border-[#786BFF]/40 flex items-center justify-center text-[#786BFF]">
              <span className="material-symbols-outlined text-[18px]">radar</span>
            </div>
            <div>
              <span className="font-semibold text-sm block leading-none">Interview Analyzer</span>
              <span className="label-caps text-[9px] text-[#42C6D9]">OBSIDIAN TELEMETRY CORE</span>
            </div>
          </Link>
          <Badge variant="emerald" size="xs">v4.2</Badge>
        </div>

        <div className="my-auto py-8 max-w-md w-full mx-auto space-y-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              Access your calibrated interview simulations, resume gap analyses, and 7-dimension rubric evaluations.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-[6px] border border-[#EF7280]/40 bg-[#EF7280]/10 text-xs text-[#EF7280] flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block label-caps text-[var(--text-secondary)] mb-1.5">
                WORK OR PERSONAL EMAIL
              </label>
              <div className="relative">
                <span className="material-symbols-outlined text-[16px] text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2">
                  alternate_email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full obsidian-input pl-9 pr-3.5 py-2.5 text-sm"
                  placeholder="candidate@domain.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label-caps text-[var(--text-secondary)]">PASSWORD</label>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(true)}
                  className="text-xs text-[#786BFF] hover:underline cursor-pointer"
                >
                  Password help?
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined text-[16px] text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2">
                  key
                </span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full obsidian-input pl-9 pr-10 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[#786BFF]"
                />
                Remember this workstation
              </label>
              <span className="label-caps text-[9px] text-[var(--text-muted)] px-2 py-0.5 rounded-[4px] border border-[var(--border-subtle)]">
                {rememberMe ? 'PERSISTENT TOKEN' : 'SESSION TAB ONLY'}
              </span>
            </div>

            <Button type="submit" isLoading={loading} className="w-full py-2.5">
              Sign In to Workspace
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Button>
          </form>

          {/* Instant Reviewer Demo Account Box */}
          <div className="obsidian-card p-4 space-y-3 border-[#786BFF]/30">
            <div className="flex items-center justify-between">
              <span className="label-caps text-[10px] text-[#36C995] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                INSTANT REVIEWER SANDBOX
              </span>
              <span className="label-caps text-[9px] text-[var(--text-muted)]">DEMO ACCOUNT</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Sign in to the pre-seeded demonstration account (<code className="text-[var(--text-primary)]">demo@aiinterview.dev</code>) with sample resume analysis, JD match, and historical sessions.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isLoading={demoLoading}
              materialIcon="bolt"
              onClick={handleDemoLogin}
              className="w-full text-[#42C6D9]"
            >
              1-Click Load: Demo Candidate Account
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-4 border-t border-[var(--border-subtle)]">
          <span>PBKDF2-SHA256 + JWT Auth</span>
          <div>
            New candidate?{' '}
            <Link to="/register" className="text-[#786BFF] font-medium hover:underline">
              Create an account →
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column: Product Telemetry Preview (Explicitly labeled as Preview) */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-10 bg-[var(--bg-canvas)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1 rounded-[4px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <span className="w-2 h-2 rounded-full bg-[#36C995]" />
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">
              PRODUCT PREVIEW • SAMPLE SIMULATION TELEMETRY
            </span>
          </div>
          <Badge variant="cyan" size="xs">7-DIMENSIONAL RUBRIC ENGINE</Badge>
        </div>

        <div className="my-auto max-w-2xl mx-auto w-full space-y-5">
          <div className="obsidian-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="violet">SAMPLE PROMPT PREVIEW</Badge>
                <span className="text-xs text-[var(--text-secondary)]">System Design & Resilience</span>
              </div>
              <Badge variant="emerald">SAMPLE SCORE: 91 / 100</Badge>
            </div>

            <h2 className="text-xl font-semibold leading-snug">
              "Design a fault-tolerant telemetry ingestion pipeline and explain how you prevent cascading buffer overflow."
            </h2>

            <div className="grid grid-cols-4 gap-3">
              {[
                { tag: '[S] Situation', pct: 94, desc: 'Context & scale defined', c: 'bg-[#42C6D9]' },
                { tag: '[T] Task', pct: 91, desc: 'Clear ownership scope', c: 'bg-[#786BFF]' },
                { tag: '[A] Action', pct: 88, desc: 'Partitioning & indexing', c: 'bg-[#36C995]' },
                { tag: '[R] Result', pct: 84, desc: 'p95 latency quantified', c: 'bg-[#F1B65D]' },
              ].map((st, idx) => (
                <div key={idx} className="obsidian-subpanel p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono-tabular">
                    <span className="text-[var(--text-primary)]">{st.tag}</span>
                    <span>{st.pct}%</span>
                  </div>
                  <div className="h-1 rounded-[4px] bg-[var(--bg-elevated)] overflow-hidden">
                    <div className={`h-full ${st.c}`} style={{ width: `${st.pct}%` }} />
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">{st.desc}</p>
                </div>
              ))}
            </div>

            <div className="obsidian-subpanel p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="label-caps text-[10px] text-[#42C6D9]">TEXT & SPEECH CADENCE PREVIEW</span>
                <span className="font-mono-tabular text-xs text-[#36C995]">142 WPM • 1 Filler Word</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-mono-tabular">
                Candidate excerpt: "We isolated consumer group rebalancing by introducing partitioned commit logs and composite indexes, cutting disk spillover by 38%..."
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs text-[var(--text-secondary)] flex items-center justify-between">
          <span>All preview cards above illustrate sample telemetry output.</span>
          <Link to="/" className="text-[#42C6D9] hover:underline">← Back to Overview</Link>
        </div>
      </div>

      <Modal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} title="Password Management Information" size="sm">
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
          This deployment uses a self-contained SQLite database without an external transactional email server. To test the platform immediately, click <strong>1-Click Load: Demo Candidate Account</strong> (`demo@aiinterview.dev` / `Demo@1234`), or create a new account. Authenticated users can update their password at any time under <strong>Settings → Security</strong>.
        </p>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setResetModalOpen(false)}>Understood</Button>
        </div>
      </Modal>
    </div>
  );
}
