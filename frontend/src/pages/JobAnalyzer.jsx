import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI, resumeAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import ScoreRing from '../components/common/ScoreRing';
import ProgressBar from '../components/common/ProgressBar';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const JD_PRESETS = [
  {
    label: 'Staff Infrastructure @ Datadog',
    title: 'Staff Infrastructure & Distributed Systems Engineer',
    company: 'Datadog',
    text: `Datadog is seeking a Staff Infrastructure & Distributed Systems Engineer to build high-throughput telemetry stream processors.\n\nREQUIRED SKILLS:\n- Strong proficiency in Go, Python, or Rust and distributed systems architecture\n- Experience with Kafka partitioning,PostgreSQL sharding, Kubernetes, Docker, and AWS multi-region networking\n- Deep understanding of REST APIs, Redis caching, SQL query optimization, and automated testing with Pytest.`,
  },
  {
    label: 'Senior Backend Eng @ Stripe',
    title: 'Senior Backend Platform Engineer',
    company: 'Stripe',
    text: `Stripe is looking for a Senior Backend Platform Engineer to architect resilient payment and ledger services.\n\nREQUIRED SKILLS:\n- Production mastery of Python (FastAPI), TypeScript, SQL, PostgreSQL, and Redis\n- Experience designing idempotent REST APIs, microservices, Docker containers, and CI/CD pipelines with Git and Pytest.`,
  },
  {
    label: 'Full-Stack AI Eng @ LinearScale',
    title: 'Full Stack Software Engineer (AI Platform)',
    company: 'LinearScale Technologies',
    text: `We are seeking a Full Stack Software Engineer to build AI-enabled developer workflows.\n\nREQUIRED SKILLS:\n- Strong command of React, TypeScript, Tailwind CSS, Python, and FastAPI\n- Relational database design (PostgreSQL, SQLite, SQL), Docker, Git, LLM Prompt Engineering, and automated testing.`,
  },
];

export default function JobAnalyzer() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Mode: 'input' (Screen 07) or 'results' (Screen 08)
  const [viewMode, setViewMode] = useState('input');
  const [jobTitle, setJobTitle] = useState(JD_PRESETS[0].title);
  const [companyName, setCompanyName] = useState(JD_PRESETS[0].company);
  const [rawText, setRawText] = useState(JD_PRESETS[0].text);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [skillFilter, setSkillFilter] = useState('ALL'); // ALL, MATCHED, GAPS

  const [resumesList, setResumesList] = useState([]);
  const [jobsHistory, setJobsHistory] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jRes, rRes] = await Promise.all([
        jobsAPI.listJobs(),
        resumeAPI.listResumes().catch(() => ({ data: { resumes: [] } })),
      ]);
      const jList = jRes.data?.job_descriptions || [];
      const rList = rRes.data?.resumes || [];
      setJobsHistory(jList);
      setResumesList(rList);
      if (rList[0]?.id) setSelectedResumeId(String(rList[0].id));
      if (jRes.data?.latest_job) {
        setActiveJob(jRes.data.latest_job);
      }
    } catch (err) {
      // Keep input view
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!jobTitle.trim() || rawText.trim().length < 20) {
      showToast('Please provide a job title and at least 20 characters of job description text.', 'error');
      return;
    }
    setAnalyzing(true);
    try {
      const payload = {
        job_title: jobTitle.trim(),
        company_name: companyName.trim(),
        raw_text: rawText.trim(),
      };
      if (selectedResumeId) payload.resume_id = Number(selectedResumeId);
      const res = await jobsAPI.analyzeJob(payload);
      setActiveJob(res.data.job_analysis);
      showToast('Compatibility analysis and 3-week sprint roadmap generated!', 'success');
      await loadData();
      setViewMode('results');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Job analysis failed.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLaunchTailoredMock = (jobObj) => {
    const target = jobObj || activeJob;
    if (!target) return;
    navigate(
      `/interview/setup?jobId=${target.id}&role=${encodeURIComponent(target.job_title)}&company=${encodeURIComponent(target.company_name || '')}&mode=Job-Description-Based`
    );
  };

  if (loading) return <LoadingSkeleton label="Loading Job Compatibility workspace..." />;

  const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;

  // ==========================================================================
  // SCREEN 07 — JOB ANALYZER INPUT VIEW
  // ==========================================================================
  if (viewMode === 'input' || !activeJob) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={['WORKSPACE', 'JOB COMPATIBILITY', 'GAP DISCOVERY ENGINE']}
          title="Job Description Analyzer & Gap Discovery"
          subtitle="Deconstruct target job requisitions into required skills, preferred qualifications, and role expectations. Compare against your ingested resume."
          actions={
            activeJob && (
              <Button variant="secondary" size="sm" materialIcon="analytics" onClick={() => setViewMode('results')}>
                View Latest Match ({activeJob.match_percentage}%)
              </Button>
            )
          }
        />

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column (8 cols): Requisition Metadata & Editor */}
          <form onSubmit={handleAnalyze} className="lg:col-span-8 space-y-5">
            <div className="obsidian-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#42C6D9] text-[18px]">tune</span>
                  <h2 className="text-sm font-semibold">Target Requisition Metadata</h2>
                </div>
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">STEP 01 / CONTEXT MATRIX</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)]">Quick Select:</span>
                {JD_PRESETS.map((preset, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => {
                      setJobTitle(preset.title);
                      setCompanyName(preset.company);
                      setRawText(preset.text);
                    }}
                    className="px-2.5 py-1 rounded-[4px] bg-[var(--bg-elevated)] hover:border-[#42C6D9] border border-[var(--border-subtle)] text-xs text-[#42C6D9] cursor-pointer"
                  >
                    ⚡ {preset.label}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block label-caps text-[var(--text-secondary)] mb-1.5">TARGET REQUISITION TITLE</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full obsidian-input px-3.5 py-2.5 text-sm"
                    placeholder="e.g., Staff Infrastructure Engineer"
                  />
                </div>
                <div>
                  <label className="block label-caps text-[var(--text-secondary)] mb-1.5">COMPANY & DIVISION</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full obsidian-input px-3.5 py-2.5 text-sm"
                    placeholder="e.g., Datadog, Stripe, Linear"
                  />
                </div>
              </div>

              <div>
                <label className="block label-caps text-[var(--text-secondary)] mb-1.5">
                  CANDIDATE RESUME UNDER TEST
                </label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full obsidian-input px-3.5 py-2.5 text-sm"
                >
                  {resumesList.length === 0 ? (
                    <option value="">Using Profile Baseline Skills (Upload a Resume in Resume Analyzer for full text match)</option>
                  ) : (
                    resumesList.map((r) => (
                      <option key={r.id} value={r.id} className="bg-[#0C1422] text-[#F4F7FC]">
                        {r.filename} (Uploaded {(r.created_at || '').slice(0, 10)})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="obsidian-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF7280]/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F1B65D]/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#36C995]/60" />
                  <span className="label-caps text-[10px] text-[var(--text-secondary)] ml-2">
                    RAW_JOB_SPECIFICATION.TXT
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
                    {rawText.length} chars • {wordCount} words
                  </span>
                  <Badge variant="emerald" size="xs">TOKENIZER READY</Badge>
                </div>
              </div>

              <textarea
                rows={11}
                required
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the complete job description requirements, tech stack, and responsibilities..."
                className="w-full obsidian-input p-4 text-xs sm:text-sm font-mono-tabular leading-relaxed"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="xs" onClick={() => setRawText('')}>
                    Clear Spec
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => {
                      setJobTitle(JD_PRESETS[0].title);
                      setCompanyName(JD_PRESETS[0].company);
                      setRawText(JD_PRESETS[0].text);
                    }}
                  >
                    Reset Default JD
                  </Button>
                </div>
                <Button type="submit" isLoading={analyzing} materialIcon="radar">
                  Run Compatibility Audit & Gap Extraction →
                </Button>
              </div>
            </div>
          </form>

          {/* Right Column (4 cols): Evaluation Framework & Recent Requisition Audits */}
          <div className="lg:col-span-4 space-y-5">
            <div className="obsidian-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#786BFF] text-[18px]">fact_check</span>
                <h3 className="text-sm font-semibold">Evaluation Framework</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Job postings are analyzed across four structured dimensions:
              </p>
              <div className="space-y-2.5">
                {[
                  {
                    title: 'Required vs. Preferred Skill Extraction',
                    desc: 'Identifies core technical stack requirements and secondary bonus skills.',
                  },
                  {
                    title: 'Resume-to-Job Intersection',
                    desc: 'Cross-references extracted resume skills against required JD tokens to compute match percentage.',
                  },
                  {
                    title: 'Role & Experience Expectations',
                    desc: 'Extracts seniority requirements and core engineering deliverables.',
                  },
                  {
                    title: 'Targeted 3-Week Sprint Roadmap',
                    desc: 'Builds a week-by-week preparation plan to close missing skill gaps before your interview.',
                  },
                ].map((f, i) => (
                  <div key={i} className="obsidian-subpanel p-3">
                    <span className="text-xs font-semibold text-[var(--text-primary)] block">{f.title}</span>
                    <span className="text-[11px] text-[var(--text-secondary)] mt-0.5 block">{f.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="obsidian-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Recent Requisition Audits</h3>
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">{jobsHistory.length} Saved</span>
              </div>
              {jobsHistory.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)]">No job descriptions analyzed yet.</p>
              ) : (
                <div className="space-y-2">
                  {jobsHistory.slice(0, 4).map((jb) => (
                    <div
                      key={jb.id}
                      onClick={() => {
                        setActiveJob(jb);
                        setViewMode('results');
                      }}
                      className="obsidian-subpanel p-3 flex items-center justify-between gap-2 cursor-pointer hover:border-[var(--border-hover)]"
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {jb.company_name || 'Target Role'} — {jb.job_title}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          {(jb.created_at || '').slice(0, 10)} • {jb.matching_skills?.length || 0} matched skills
                        </span>
                      </div>
                      <Badge variant="emerald" size="xs">{jb.match_percentage}%</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // SCREEN 08 — JOB ANALYZER COMPATIBILITY RESULTS VIEW
  // ==========================================================================
  const matchedSkills = activeJob.matching_skills || [];
  const missingSkills = activeJob.missing_skills || [];
  const requiredSkills = activeJob.required_skills || [];
  const preferredSkills = activeJob.preferred_skills || [];
  const roadmap = activeJob.learning_roadmap || [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={['AUDIT #' + (activeJob.id || 'JD'), 'ROLE COMPATIBILITY CALIBRATION']}
        title={`Compatibility Analysis: ${activeJob.job_title} ${activeJob.company_name ? `@ ${activeJob.company_name}` : ''}`}
        subtitle={activeJob.experience_requirements || 'Benchmarked against your uploaded resume and skill taxonomy.'}
        actions={
          <>
            <Button variant="secondary" size="sm" materialIcon="edit_document" onClick={() => setViewMode('input')}>
              Analyze Another JD
            </Button>
            <Button
              variant="primary"
              size="sm"
              materialIcon="bolt"
              onClick={() => handleLaunchTailoredMock(activeJob)}
            >
              Launch Tailored AI Mock
            </Button>
          </>
        }
      />

      {/* 4 Top Metric Cards (Match Screen 08) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="obsidian-card p-4 flex items-center justify-between">
          <div>
            <span className="label-caps text-[10px] text-[var(--text-secondary)] block">OVERALL MATCH</span>
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-2">
              {activeJob.match_percentage >= 75 ? 'High Candidate Match' : 'Moderate Alignment'}
            </p>
            <span className="text-[11px] text-[#36C995]">Explainable Skill Overlap</span>
          </div>
          <ScoreRing score={activeJob.match_percentage} size={74} strokeWidth={6} label="%" variant="emerald" />
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">REQUIRED SKILLS</span>
            <Badge variant={missingSkills.length > 0 ? 'danger' : 'emerald'} size="xs">
              {missingSkills.length} Gap(s)
            </Badge>
          </div>
          <div className="my-2">
            <span className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)]">
              {matchedSkills.length} / {Math.max(matchedSkills.length, requiredSkills.length)}
            </span>
            <span className="text-xs text-[var(--text-secondary)] ml-2">Core Req Matched</span>
          </div>
          <ProgressBar value={activeJob.match_percentage} variant="cyan" showPercent={false} size="xs" />
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">PREFERRED STACK</span>
            <Badge variant="cyan" size="xs">Bonus Signal</Badge>
          </div>
          <div className="my-2">
            <span className="font-mono-tabular text-2xl font-semibold text-[#42C6D9]">
              {preferredSkills.length}
            </span>
            <span className="text-xs text-[var(--text-secondary)] ml-2">Preferred areas</span>
          </div>
          <ProgressBar value={75} variant="violet" showPercent={false} size="xs" />
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">SPRINT READINESS</span>
            <Badge variant="emerald" size="xs">3-Week Plan</Badge>
          </div>
          <div className="my-2">
            <span className="font-mono-tabular text-2xl font-semibold text-[#36C995]">
              {roadmap.length || 3} Weeks
            </span>
            <span className="text-xs text-[var(--text-secondary)] ml-2">Structured Roadmap</span>
          </div>
          <ProgressBar value={85} variant="emerald" showPercent={false} size="xs" />
        </div>
      </div>

      {/* Two-Column Matrix & 3-Week Sprint Roadmap (Match Screen 08) */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5">
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#42C6D9] text-[18px]">hub</span>
                <h3 className="text-base font-semibold">Skill Taxonomy & Signal Matrix</h3>
              </div>
              <div className="inline-flex p-0.5 rounded-[4px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                {[
                  { id: 'ALL', label: `ALL (${matchedSkills.length + missingSkills.length})` },
                  { id: 'MATCHED', label: `MATCHED (${matchedSkills.length})` },
                  { id: 'GAPS', label: `GAPS (${missingSkills.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSkillFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-[3px] label-caps text-[10px] cursor-pointer ${
                      skillFilter === tab.id ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {skillFilter !== 'MATCHED' && missingSkills.length > 0 && (
              <div className="space-y-2.5">
                <span className="label-caps text-[10px] text-[#EF7280] block">
                  • MISSING SKILLS & GAPS ({missingSkills.length} IDENTIFIED IN JD)
                </span>
                {missingSkills.map((gap, idx) => (
                  <div key={idx} className="obsidian-subpanel p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="danger" size="xs">GAP</Badge>
                      <div>
                        <span className="text-sm font-semibold text-[var(--text-primary)] block">{gap}</span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          Required in {activeJob.job_title} job specification; not detected in current resume.
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => navigate(`/interview/setup?role=${encodeURIComponent(activeJob.job_title)}&topic=${encodeURIComponent(gap)}`)}
                    >
                      Practice Mock
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {skillFilter !== 'GAPS' && (
              <div className="space-y-2.5">
                <span className="label-caps text-[10px] text-[#36C995] block">
                  • VERIFIED HIGH-SIGNAL MATCHES ({matchedSkills.length} SKILLS VERIFIED)
                </span>
                <div className="flex flex-wrap gap-2">
                  {matchedSkills.map((sk, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-[4px] bg-[#36C995]/10 border border-[#36C995]/30 text-xs font-mono-tabular text-[#36C995]"
                    >
                      • {sk} ✓
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Role Expectations & Readiness Recommendations</h3>
              <Badge variant="cyan" size="xs">{activeJob.company_name || 'TARGET ROLE'}</Badge>
            </div>
            <div className="space-y-2.5">
              {(activeJob.role_expectations || []).map((exp, i) => (
                <div key={i} className="obsidian-subpanel p-3 text-xs text-[var(--text-primary)]">
                  • {exp}
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <span className="label-caps text-[10px] text-[#42C6D9] block">ACTIONABLE READINESS RECOMMENDATIONS</span>
              {(activeJob.readiness_recommendations || []).map((rec, i) => (
                <p key={i} className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {i + 1}. {rec}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): 3-Week Tailored Sprint */}
        <div className="lg:col-span-5 space-y-5">
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#786BFF] text-[18px]">calendar_month</span>
                <h3 className="text-base font-semibold">3-Week Tailored Sprint</h3>
              </div>
              <Badge variant="violet" size="xs">ADAPTIVE PLAN</Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Structured preparation roadmap generated from your {activeJob.job_title} skill gap analysis.
            </p>

            <div className="space-y-3">
              {roadmap.map((wk, idx) => (
                <div key={idx} className="obsidian-subpanel p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {wk.week}: {wk.focus}
                    </span>
                    <Badge variant={idx === 0 ? 'violet' : 'gray'} size="xs">
                      PHASE 0{idx + 1}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{wk.action}</p>
                  {idx === 0 && (
                    <div className="pt-1 flex justify-end">
                      <Button size="xs" onClick={() => handleLaunchTailoredMock(activeJob)}>
                        Start {wk.week} Studio →
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tailored Mock Banner */}
      <div className="obsidian-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-[#111C2D] via-[#17243A] to-[#111C2D]">
        <div>
          <h3 className="text-base font-semibold">
            Ready to test your readiness for this exact {activeJob.company_name || ''} {activeJob.job_title} role?
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Launch a Job-Description-Based AI Mock Interview calibrated to probe your matching and missing skills.
          </p>
        </div>
        <Button onClick={() => handleLaunchTailoredMock(activeJob)} materialIcon="play_arrow">
          Start Tailored Mock Now →
        </Button>
      </div>
    </div>
  );
}
