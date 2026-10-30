import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { interviewAPI, resumeAPI, jobsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import ProgressBar from '../components/common/ProgressBar';

const COMPANY_ARCHETYPES = [
  {
    id: 'High-Growth SaaS',
    icon: 'bolt',
    title: 'High-Growth SaaS',
    desc: 'High product velocity, pragmatism over bureaucracy, p99 latency under rapid customer expansion.',
    tags: ['P99 LATENCY FOCUS', 'VELOCITY RATIO'],
  },
  {
    id: 'Big Tech / FAANG',
    icon: 'hub',
    title: 'Big Tech / FAANG',
    desc: 'Petabyte scale, high-QPS concurrency, strict algorithmic complexity, and distributed consensus rigor.',
    tags: ['CONSENSUS RIGOR', 'CAP THEOREM'],
  },
  {
    id: 'FinTech / High-Frequency',
    icon: 'account_balance',
    title: 'FinTech / High-Frequency',
    desc: 'Sub-millisecond determinism, ACID guarantees, idempotency keys, zero data loss, and audit trails.',
    tags: ['ACID GUARANTEES', 'IDEMPOTENCY'],
  },
  {
    id: 'Enterprise Core Platform',
    icon: 'domain',
    title: 'Enterprise Core Platform',
    desc: 'Multi-tenant isolation, backward compatibility, zero-downtime schema migrations, and disaster recovery.',
    tags: ['MULTI-TENANCY', 'DISASTER RECOVERY'],
  },
];

const SENIORITY_TIERS = [
  { range: '0 - 2 YRS', title: 'Entry Level', sub: 'L3 / Junior IC', value: 'Entry Level (0-2 Years)' },
  { range: '3 - 5 YRS', title: 'Mid Level', sub: 'L4 / Core Eng', value: 'Mid Level (2-5 Years)' },
  { range: '5 - 8 YRS', title: 'Senior Level', sub: 'L5 / Tech Lead', value: 'Senior Level (5-8 Years)' },
  { range: '8+ YRS EXP', title: 'Staff / Principal', sub: 'L6 / L7 Rubric', value: 'Staff / Principal (8+ Years)' },
];

const SIX_INTERVIEW_MODES = [
  {
    id: 'Technical',
    icon: 'dns',
    title: 'Technical System Design & Code',
    desc: 'Deep exploration of backend architecture, API design, database indexing, concurrency, and failure modes.',
    weight: 'WEIGHT: 40%',
    badge: 'ARCH EVAL',
  },
  {
    id: 'Behavioral',
    icon: 'record_voice_over',
    title: 'Behavioral & STAR Matrix',
    desc: 'Leadership principles, handling ambiguity, high-stakes trade-offs, and cross-team collaboration.',
    weight: 'WEIGHT: 25%',
    badge: 'STAR EVAL',
  },
  {
    id: 'HR',
    icon: 'groups',
    title: 'Hiring Manager & HR Screen',
    desc: 'Role motivation, career trajectory, culture alignment, and communication clarity.',
    weight: 'WEIGHT: 20%',
    badge: 'SCREEN EVAL',
  },
  {
    id: 'Situational',
    icon: 'warning',
    title: 'Situational & Incident Triage',
    desc: 'Production outage response, deadline scoping trade-offs, and stakeholder alignment.',
    weight: 'WEIGHT: 30%',
    badge: 'TRIAGE EVAL',
  },
  {
    id: 'Resume-Based',
    icon: 'find_in_page',
    title: 'Resume Deep-Dive Forensic',
    desc: 'Cross-examines claims, skills, and project architectures directly from your uploaded resume.',
    weight: 'WEIGHT: 35%',
    badge: 'VERIFICATION',
  },
  {
    id: 'Job-Description-Based',
    icon: 'track_changes',
    title: 'JD Target Challenge',
    desc: 'Directly probes required and missing skills extracted from your selected target job description.',
    weight: 'WEIGHT: 45%',
    badge: 'GAP PROBING',
  },
];

export default function InterviewSetup() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [config, setConfig] = useState({
    job_role: searchParams.get('role') || user?.target_role || 'Full Stack Software Engineer',
    experience_level: user?.experience_level || SENIORITY_TIERS[0].value,
    interview_type: searchParams.get('mode') || 'Technical',
    difficulty: 'Medium',
    company_style: COMPANY_ARCHETYPES[0].id,
    question_count: 5,
    resume_id: '',
    job_description_id: searchParams.get('jobId') || '',
  });

  const [resumesList, setResumesList] = useState([]);
  const [jobsList, setJobsList] = useState([]);
  const [dynamicProbing, setDynamicProbing] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      resumeAPI.listResumes().catch(() => ({ data: { resumes: [] } })),
      jobsAPI.listJobs().catch(() => ({ data: { job_descriptions: [] } })),
    ]).then(([rRes, jRes]) => {
      const rList = rRes.data?.resumes || [];
      const jList = jRes.data?.job_descriptions || [];
      setResumesList(rList);
      setJobsList(jList);
      setConfig((prev) => ({
        ...prev,
        resume_id: prev.resume_id || (rList[0]?.id ? String(rList[0].id) : ''),
        job_description_id: prev.job_description_id || (jList[0]?.id ? String(jList[0].id) : ''),
      }));
    });
  }, []);

  const handleLaunch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        job_role: config.job_role.trim(),
        experience_level: config.experience_level,
        interview_type: config.interview_type,
        difficulty: config.difficulty,
        company_style: config.company_style,
        question_count: Number(config.question_count),
      };
      if (config.resume_id) payload.resume_id = Number(config.resume_id);
      if (config.job_description_id) payload.job_description_id = Number(config.job_description_id);

      try {
        localStorage.setItem('interview_prefs', JSON.stringify({ dynamicProbing, ttsEnabled }));
      } catch (err) {}

      const res = await interviewAPI.startInterview(payload);
      showToast(`Launched ${config.interview_type} Studio (${config.company_style} rubric)!`, 'success');
      navigate(`/interview/${res.data.id}`);
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to launch interview studio.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={['WORKSPACE', 'AI MOCK INTERVIEWS', 'CONFIGURATION STUDIO']}
        title="AI Interview Studio Configuration"
        subtitle="Calibrate company archetype, technical depth, interview mode, and question volume for your mock simulation."
        actions={
          <div className="obsidian-subpanel px-3 py-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#42C6D9]" />
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">
              ACTIVE PIPELINE: GEMINI / DETERMINISTIC RUBRIC ENGINE
            </span>
          </div>
        }
      />

      <form onSubmit={handleLaunch} className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): 4 Configuration Sections */}
        <div className="lg:col-span-8 space-y-5">
          {/* 01 Target Role & Sourcing Context */}
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono-tabular text-xs font-bold text-[#42C6D9] flex items-center justify-center">
                  01
                </span>
                <h2 className="text-base font-semibold">Target Role & Sourcing Context</h2>
              </div>
              <span className="label-caps text-[10px] text-[var(--text-secondary)]">TARGET SCHEMA</span>
            </div>

            <div>
              <label className="block label-caps text-[var(--text-secondary)] mb-1.5">TARGET POSITION TITLE</label>
              <input
                type="text"
                required
                value={config.job_role}
                onChange={(e) => setConfig({ ...config, job_role: e.target.value })}
                className="w-full obsidian-input px-3.5 py-2.5 text-sm"
                placeholder="e.g., Staff Infrastructure & Distributed Systems Engineer"
              />
            </div>

            <div>
              <label className="block label-caps text-[var(--text-secondary)] mb-2">
                TARGET EMPLOYER ARCHETYPE & BAR RUBRIC
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                {COMPANY_ARCHETYPES.map((arch) => {
                  const active = config.company_style === arch.id;
                  return (
                    <div
                      key={arch.id}
                      onClick={() => setConfig({ ...config, company_style: arch.id })}
                      className={`p-4 rounded-[6px] border cursor-pointer transition-all ${
                        active
                          ? 'bg-[var(--bg-elevated)] border-[#42C6D9] shadow-[inset_0_0_0_1px_#42C6D9]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#42C6D9]">{arch.icon}</span>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{arch.title}</span>
                        </div>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            active ? 'border-[#42C6D9] bg-[#42C6D9]' : 'border-[var(--border-subtle)]'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">{arch.desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {arch.tags.map((tg) => (
                          <span
                            key={tg}
                            className="px-2 py-0.5 rounded-[4px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] label-caps text-[9px] text-[#42C6D9]"
                          >
                            {tg}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block label-caps text-[var(--text-secondary)] mb-1">GROUND TRUTH RESUME</label>
                <select
                  value={config.resume_id}
                  onChange={(e) => setConfig({ ...config, resume_id: e.target.value })}
                  className="w-full obsidian-input px-3 py-2 text-xs"
                >
                  <option value="">Latest Uploaded Resume (Default)</option>
                  {resumesList.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[#0C1422]">
                      {r.filename}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block label-caps text-[var(--text-secondary)] mb-1">TARGET JOB DESCRIPTION</label>
                <select
                  value={config.job_description_id}
                  onChange={(e) => setConfig({ ...config, job_description_id: e.target.value })}
                  className="w-full obsidian-input px-3 py-2 text-xs"
                >
                  <option value="">Latest Analyzed Job Description (Default)</option>
                  {jobsList.map((j) => (
                    <option key={j.id} value={j.id} className="bg-[#0C1422]">
                      {j.company_name ? `${j.company_name} — ` : ''}{j.job_title} ({j.match_percentage}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 02 Seniority & Rigor Tier */}
          <div className="obsidian-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono-tabular text-xs font-bold text-[#42C6D9] flex items-center justify-center">
                  02
                </span>
                <h2 className="text-base font-semibold">Seniority & Rigor Tier</h2>
              </div>
              <span className="label-caps text-[10px] text-[#36C995]">CALIBRATION ACTIVE</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SENIORITY_TIERS.map((tier) => {
                const active = config.experience_level === tier.value;
                return (
                  <button
                    type="button"
                    key={tier.title}
                    onClick={() => setConfig({ ...config, experience_level: tier.value })}
                    className={`p-3 rounded-[6px] border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-[var(--bg-elevated)] border-[#786BFF] shadow-[inset_0_0_0_1px_#786BFF]'
                        : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    <span className="label-caps text-[9px] text-[var(--text-secondary)] block">{tier.range}</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)] block mt-0.5">{tier.title}</span>
                    <span className="text-[11px] text-[#42C6D9] mt-0.5 block">{tier.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 03 Simulation Mode & Focus Area */}
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono-tabular text-xs font-bold text-[#42C6D9] flex items-center justify-center">
                  03
                </span>
                <h2 className="text-base font-semibold">Simulation Mode & Focus Area</h2>
              </div>
              <span className="text-xs text-[var(--text-secondary)]">Select Primary Simulation Axis</span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SIX_INTERVIEW_MODES.map((m) => {
                const active = config.interview_type === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setConfig({ ...config, interview_type: m.id })}
                    className={`p-4 rounded-[6px] border flex flex-col justify-between cursor-pointer transition-all ${
                      active
                        ? 'bg-[var(--bg-elevated)] border-[#786BFF] shadow-[inset_0_0_0_1px_#786BFF]'
                        : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="material-symbols-outlined text-[18px] text-[#786BFF]">{m.icon}</span>
                        {active && <Badge variant="violet" size="xs">PRIMARY ACTIVE</Badge>}
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{m.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{m.desc}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border-subtle)] label-caps text-[9px]">
                      <span className="text-[var(--text-secondary)]">{m.weight}</span>
                      <span className="text-[#42C6D9]">{m.badge}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 04 Simulation Intensity & Question Calibrations */}
          <div className="obsidian-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono-tabular text-xs font-bold text-[#42C6D9] flex items-center justify-center">
                  04
                </span>
                <h2 className="text-base font-semibold">Simulation Intensity & Question Calibrations</h2>
              </div>
              <span className="text-xs text-[var(--text-secondary)]">Adaptive Dynamic Engine</span>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">DIFFICULTY & INTERROGATION STYLE</span>
                <span className="label-caps text-[10px] text-[#F1B65D]">• SELECTED: {config.difficulty.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 p-1 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                {[
                  { id: 'Easy', label: 'STANDARD (EASY)' },
                  { id: 'Medium', label: 'RIGOROUS (MEDIUM)' },
                  { id: 'Hard', label: 'BAR RAISER (HARD)' },
                ].map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => setConfig({ ...config, difficulty: d.id })}
                    className={`py-2 rounded-[4px] label-caps text-[10px] cursor-pointer transition-colors ${
                      config.difficulty === d.id
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">
                  QUESTION VOLUME: <strong className="text-[#42C6D9]">{config.question_count} Questions</strong> (1–15 Supported)
                </span>
                <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
                  ~{config.question_count * 7} Minutes Session
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={config.question_count}
                onChange={(e) => setConfig({ ...config, question_count: Number(e.target.value) })}
                className="w-full accent-[#786BFF]"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono-tabular mt-1">
                <span>1 Question (Express)</span>
                <span>5 Questions (Standard)</span>
                <span>10 Questions (Deep Dive)</span>
                <span>15 Questions (Full Loop)</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <label className="obsidian-subpanel p-3.5 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] block">Dynamic Multi-Turn Probing</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    AI generates contextual follow-up questions based on your answers
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={dynamicProbing}
                  onChange={(e) => setDynamicProbing(e.target.checked)}
                  className="w-4 h-4 accent-[#786BFF]"
                />
              </label>

              <label className="obsidian-subpanel p-3.5 flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] block">Browser Speech Synthesis (TTS)</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Enable text-to-speech question playback & Web Speech dictation
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={ttsEnabled}
                  onChange={(e) => setTtsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#786BFF]"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Calibration Matrix Summary */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-5">
          <div className="obsidian-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="label-caps text-[10px] text-[#42C6D9] block">CALIBRATION MATRIX</span>
                <h3 className="text-base font-semibold">Simulation Profile Preview</h3>
              </div>
              <Badge variant="emerald" size="xs">• READY</Badge>
            </div>

            <div className="obsidian-subpanel p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-[6px] bg-[#786BFF]/20 border border-[#786BFF]/40 flex items-center justify-center text-[#C5C0FF] font-mono-tabular font-bold">
                AI
              </div>
              <div className="min-w-0">
                <span className="label-caps text-[9px] text-[var(--text-secondary)] block">INTERVIEWER PERSONA</span>
                <span className="text-sm font-semibold text-[var(--text-primary)] block truncate">
                  Principal AI Examiner
                </span>
                <span className="text-[11px] text-[#42C6D9] block truncate">{config.company_style} Bar</span>
              </div>
            </div>

            <div className="space-y-2 text-xs border-y border-[var(--border-subtle)] py-3">
              <div className="flex justify-between">
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">TARGET ROLE</span>
                <span className="font-medium text-[var(--text-primary)] truncate max-w-[180px]">{config.job_role}</span>
              </div>
              <div className="flex justify-between">
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">SIMULATION MODE</span>
                <span className="font-medium text-[#42C6D9]">{config.interview_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">COMPANY STYLE</span>
                <span className="font-medium text-[#36C995]">{config.company_style}</span>
              </div>
              <div className="flex justify-between">
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">DIFFICULTY & VOLUME</span>
                <span className="font-mono-tabular text-[var(--text-primary)]">
                  {config.difficulty} • {config.question_count} Qs
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between label-caps text-[10px] text-[var(--text-secondary)]">
                <span>EVALUATION RUBRIC WEIGHTS</span>
                <span>100% TOTAL</span>
              </div>
              <ProgressBar label="Technical Accuracy & Depth" value={35} variant="cyan" size="xs" />
              <ProgressBar label="Problem Solving & Completeness" value={30} variant="violet" size="xs" />
              <ProgressBar label="STAR Structure & Relevance" value={20} variant="emerald" size="xs" />
              <ProgressBar label="Communication & Clarity" value={15} variant="cyan" size="xs" />
            </div>

            <Button type="submit" isLoading={loading} className="w-full py-3" materialIcon="arrow_forward">
              Launch AI Interview Studio
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
