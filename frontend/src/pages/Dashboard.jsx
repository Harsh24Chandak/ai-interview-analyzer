import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { analyticsAPI, authAPI, resumeAPI, jobsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import StatCard from '../components/common/StatCard';
import ScoreRing from '../components/common/ScoreRing';
import ProgressBar from '../components/common/ProgressBar';
import ChartCard from '../components/common/ChartCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [resumeInfo, setResumeInfo] = useState(null);
  const [jobsList, setJobsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, resRes, jobRes] = await Promise.all([
        analyticsAPI.getDashboardStats(),
        resumeAPI.listResumes().catch(() => ({ data: {} })),
        jobsAPI.listJobs().catch(() => ({ data: { job_descriptions: [] } })),
      ]);
      setData(dashRes.data);
      setResumeInfo(resRes.data);
      setJobsList(jobRes.data?.job_descriptions || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load dashboard telemetry from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSeedDemoPortfolio = async () => {
    setSeeding(true);
    try {
      await authAPI.seedSampleData();
      showToast('Loaded sample portfolio data (labeled as Demo/Sample records).', 'success');
      await loadDashboard();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not seed sample data.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleExportAuditLog = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      candidate: user?.full_name,
      target_role: user?.target_role,
      stats: data?.stats,
      recent_sessions: data?.recent_sessions || [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry_audit_${user?.id || 'candidate'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported dashboard telemetry audit log (JSON)', 'info');
  };

  if (loading) return <LoadingSkeleton label="Synchronizing Executive Cockpit telemetry..." />;
  if (error) return <ErrorState title="Dashboard Connection Error" message={error} onRetry={loadDashboard} />;

  const stats = data?.stats || {
    total_interviews_completed: 0,
    average_interview_score: 0,
    average_technical_score: 0,
    average_communication_score: 0,
    resume_analysis_score: 0,
    job_match_score: 0,
    preparation_progress: 0,
    bookmarked_questions_count: 0,
    ai_mode: 'deterministic_fallback_engine',
  };

  const isBaselineProjection = Boolean(data?.is_baseline_projection) || stats.total_interviews_completed === 0;
  const trends = data?.performance_trends || [];
  const recentSessions = data?.recent_sessions || [];
  const skillDeltas = data?.skills_needing_improvement || [];
  const recommendedActions = data?.recommended_actions || [];
  const latestResume = resumeInfo?.latest_resume;
  const latestResumeAnalysis = resumeInfo?.latest_analysis;

  const targetBenchmark = 88;
  const scoreDelta = stats.total_interviews_completed > 0 ? (stats.average_interview_score - targetBenchmark).toFixed(1) : null;

  return (
    <div className="space-y-6">
      {/* Top Hero Welcome Card (Match Screen 04) */}
      <div className="obsidian-card p-6 bg-gradient-to-r from-[#111C2D] via-[#142238] to-[#111C2D] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="emerald">
              • AI Evaluation Engine: {stats.ai_mode === 'gemini_live' ? 'Google Gemini Live' : 'Deterministic Rubric v4.2'}
            </Badge>
            <Badge variant="violet">⚡ High Precision Telemetry</Badge>
          </div>
          <div className="flex flex-wrap items-baseline gap-4">
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-[var(--text-primary)]">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Candidate'}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span className="material-symbols-outlined text-[16px] text-[#42C6D9]">my_location</span>
              <span>
                Targeting: <strong className="text-[var(--text-primary)]">{user?.target_role || 'Full Stack Software Engineer'}</strong>
              </span>
              <span className="text-[var(--text-muted)]">• {user?.experience_level || 'Entry Level'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {stats.total_interviews_completed === 0 && (
            <Button
              variant="emerald"
              size="sm"
              isLoading={seeding}
              materialIcon="dataset"
              onClick={handleSeedDemoPortfolio}
            >
              Load Sample Portfolio (Demo Data)
            </Button>
          )}
          <Link
            to="/job-analyzer"
            className="px-3.5 py-2 rounded-[6px] bg-[var(--bg-elevated)] hover:bg-[#1E2E48] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px] text-[#42C6D9]">document_scanner</span>
            Analyze Job Posting
          </Link>
          <Link
            to="/interview/setup"
            className="btn-primary-violet px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">videocam</span>
            Start New AI Mock Session
          </Link>
        </div>
      </div>

      {/* 4 KPI Stat Cards (Match Screen 04) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="COMPLETED SESSIONS"
          value={stats.total_interviews_completed}
          unit="sessions"
          deltaLabel={stats.total_interviews_completed > 0 ? 'SQLite Verified' : 'No sessions yet'}
          deltaRight={`${stats.bookmarked_questions_count || 0} saved Qs`}
          progressValue={Math.min(100, stats.total_interviews_completed * 25)}
          progressVariant="cyan"
          materialIcon="verified"
          iconColor="text-[#42C6D9]"
        />
        <StatCard
          label="AVG INTERVIEW SCORE"
          value={stats.average_interview_score}
          unit="/ 100"
          deltaLabel={stats.total_interviews_completed > 0 ? `Tech: ${stats.average_technical_score}%` : 'Awaiting 1st mock'}
          deltaRight={`Comm: ${stats.average_communication_score}%`}
          progressValue={stats.average_interview_score}
          progressVariant="violet"
          materialIcon="analytics"
          iconColor="text-[#786BFF]"
        />
        <StatCard
          label="RESUME INTELLIGENCE"
          value={stats.resume_analysis_score}
          unit="/ 100"
          deltaLabel={latestResumeAnalysis ? `ATS: ${latestResumeAnalysis.ats_compatibility_score}%` : 'Upload resume'}
          deltaRight={latestResumeAnalysis ? 'Parsed' : 'Pending'}
          progressValue={stats.resume_analysis_score}
          progressVariant="emerald"
          materialIcon="document_scanner"
          iconColor="text-[#36C995]"
        />
        <StatCard
          label="JOB COMPATIBILITY"
          value={`${stats.job_match_score}%`}
          unit="aligned"
          deltaLabel={`${jobsList.length} Target JD(s)`}
          deltaRight={jobsList[0]?.company_name || 'Run JD matcher'}
          progressValue={stats.job_match_score}
          progressVariant="cyan"
          materialIcon="hub"
          iconColor="text-[#42C6D9]"
        />
      </div>

      {/* Middle Row: Performance Progression Telemetry (8 cols) + Readiness Index (4 cols) */}
      <div className="grid lg:grid-cols-12 gap-5">
        <ChartCard
          className="lg:col-span-8"
          title="Performance Progression Telemetry"
          subtitle={
            isBaselineProjection
              ? 'Sample target readiness curve (Complete a mock interview or load sample data to plot your personal sessions)'
              : `Historical analysis across ${stats.total_interviews_completed} completed mock evaluation(s)`
          }
          materialIcon="ssid_chart"
          rightSlot={
            <div className="flex items-center gap-3 text-xs">
              {isBaselineProjection && <Badge variant="warning" size="xs">BENCHMARK PROJECTION</Badge>}
              <span className="flex items-center gap-1 text-[var(--text-primary)]">
                <span className="w-2.5 h-1 rounded-full bg-[#786BFF]" /> Overall Score
              </span>
              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                <span className="w-2.5 h-1 rounded-full bg-[#42C6D9]" /> Technical Depth
              </span>
              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                <span className="w-2.5 h-1 rounded-full bg-[#36C995]" /> Communication
              </span>
            </div>
          }
          footerSlot={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#42C6D9]">flag</span>
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] block">
                    Target Benchmark Comparison
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Target Hiring Bar: {targetBenchmark}.0 pts
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono-tabular">
                <span>
                  Current: <strong>{stats.average_interview_score}</strong>
                </span>
                <span className={Number(scoreDelta) >= 0 ? 'text-[#36C995]' : 'text-[#42C6D9]'}>
                  {scoreDelta !== null ? `Delta: ${scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts` : 'No sessions yet'}
                </span>
              </div>
            </div>
          }
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26344A" />
                <XAxis dataKey="date" stroke="#9AA9BD" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#9AA9BD" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111C2D',
                    borderColor: '#26344A',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="overall" stroke="#786BFF" strokeWidth={2.5} fill="#786BFF" fillOpacity={0.2} name="Overall Score" />
                <Area type="monotone" dataKey="technical" stroke="#42C6D9" strokeWidth={2} fill="#42C6D9" fillOpacity={0.12} name="Technical Depth" />
                <Area type="monotone" dataKey="communication" stroke="#36C995" strokeWidth={2} fill="#36C995" fillOpacity={0.08} name="Communication" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Readiness Index Card */}
        <div className="lg:col-span-4 obsidian-card p-5 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#42C6D9] text-[20px]">speed</span>
              <h2 className="text-[18px] font-semibold">Readiness Index</h2>
            </div>
            <Badge variant={stats.preparation_progress >= 75 ? 'emerald' : 'cyan'} size="xs">
              {stats.preparation_progress >= 75 ? 'HIGH SIGNAL' : 'IN PROGRESS'}
            </Badge>
          </div>

          <div className="flex items-center justify-center py-2">
            <ScoreRing
              score={stats.preparation_progress}
              size={148}
              strokeWidth={10}
              label="%"
              sublabel="READINESS INDEX"
              variant="emerald"
            />
          </div>

          <div className="space-y-3">
            <ProgressBar
              label="Technical Accuracy"
              value={stats.average_technical_score}
              variant="cyan"
              size="xs"
            />
            <ProgressBar
              label="Communication & Clarity"
              value={stats.average_communication_score}
              variant="violet"
              size="xs"
            />
            <ProgressBar
              label="Resume & JD Alignment"
              value={Math.round((stats.resume_analysis_score + stats.job_match_score) / 2)}
              variant="emerald"
              size="xs"
            />
          </div>
        </div>
      </div>

      {/* Skill Deltas (7 cols) + Recommended Actions (5 cols) */}
      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 obsidian-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#42C6D9] text-[20px]">model_training</span>
              <h2 className="text-[18px] font-semibold">Identified Skill Deltas</h2>
            </div>
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">PRIORITIZED BY JD & RESUME GAPS</span>
          </div>

          <div className="space-y-2.5">
            {skillDeltas.slice(0, 4).map((skill, idx) => (
              <div
                key={idx}
                className="obsidian-subpanel p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-[6px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[#42C6D9] shrink-0">
                    <span className="material-symbols-outlined text-[16px]">
                      {idx === 0 ? 'polyline' : idx === 1 ? 'schema' : 'code'}
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{skill}</span>
                      <Badge variant={idx === 0 ? 'danger' : idx === 1 ? 'cyan' : 'emerald'} size="xs">
                        {idx === 0 ? 'P0 PRIORITY' : idx === 1 ? 'P1 PRIORITY' : 'RECOMMENDED FOCUS'}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Targeted skill gap identified for {user?.target_role || 'your target role'}.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => navigate(`/interview/setup?topic=${encodeURIComponent(skill)}`)}
                >
                  Practice Topic ›
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 obsidian-card p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#786BFF] text-[20px]">checklist</span>
                <h2 className="text-[18px] font-semibold">Recommended Actions</h2>
              </div>
              <Badge variant="violet" size="xs">{recommendedActions.length} STEPS QUEUED</Badge>
            </div>

            <div className="space-y-2.5">
              {recommendedActions.map((act, i) => (
                <Link
                  key={i}
                  to={act.route}
                  className="obsidian-subpanel p-3.5 flex items-start justify-between gap-3 hover:border-[var(--border-hover)] transition-colors block"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono-tabular text-xs font-bold text-[#786BFF] flex items-center justify-center shrink-0">
                      0{i + 1}
                    </span>
                    <div>
                      <span className="text-sm font-semibold text-[var(--text-primary)] block">{act.title}</span>
                      <span className="text-xs text-[var(--text-secondary)] mt-0.5 block">{act.description}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-[var(--text-secondary)]">play_circle</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Saved Questions in Bank: {stats.bookmarked_questions_count || 0}</span>
            <Link to="/bookmarks" className="text-[#42C6D9] hover:underline font-medium">
              Open Drill Bank →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Mock Evaluations Table (Match Screen 04) */}
      <div className="obsidian-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#42C6D9] text-[20px]">history_edu</span>
            <h2 className="text-[18px] font-semibold">Recent Mock Evaluations</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="xs" onClick={handleExportAuditLog}>
              EXPORT AUDIT LOG
            </Button>
            <Link
              to="/history"
              className="px-3 py-1 rounded-[4px] bg-[#786BFF]/20 hover:bg-[#786BFF]/30 text-[#C5C0FF] label-caps text-[10px]"
            >
              VIEW ALL ({stats.total_interviews_completed})
            </Link>
          </div>
        </div>

        {recentSessions.length === 0 ? (
          <div className="obsidian-subpanel p-6 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              No mock interview sessions recorded yet for this account.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button size="sm" onClick={() => navigate('/interview/setup')}>
                Start First Mock Interview
              </Button>
              <Button variant="secondary" size="sm" isLoading={seeding} onClick={handleSeedDemoPortfolio}>
                Load Sample Portfolio Data
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] label-caps text-[10px] text-[var(--text-secondary)]">
                  <th className="py-2.5 pr-4">SESSION ID & TARGET ROLE</th>
                  <th className="py-2.5 px-4">EVALUATION TYPE</th>
                  <th className="py-2.5 px-4">TELEMETRY SCORE</th>
                  <th className="py-2.5 px-4">DURATION</th>
                  <th className="py-2.5 px-4">TIMESTAMP</th>
                  <th className="py-2.5 pl-4 text-right">REPORT ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {recentSessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-[var(--bg-elevated)]/40">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono-tabular text-[var(--text-secondary)]">
                          #{String(sess.id).padStart(3, '0')}
                        </span>
                        <div>
                          <span className="font-medium text-[var(--text-primary)] block">{sess.job_role}</span>
                          {sess.ai_provider === 'seeded_portfolio' || sess.ai_provider === 'seeded_baseline' ? (
                            <span className="label-caps text-[9px] text-[#F1B65D]">DEMO / SAMPLE RECORD</span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="cyan" size="xs">{sess.interview_type}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={sess.overall_score >= 80 ? 'emerald' : 'violet'} size="xs">
                        • {sess.overall_score} / 100
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-[var(--text-secondary)]">
                      {Math.floor((sess.duration_seconds || 0) / 60)}m {(sess.duration_seconds || 0) % 60}s
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {(sess.completed_at || sess.created_at || '').slice(0, 10)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Link
                        to={sess.status === 'completed' ? `/results/${sess.id}` : `/interview/${sess.id}`}
                        className="text-[#42C6D9] hover:underline font-medium inline-flex items-center gap-1"
                      >
                        {sess.status === 'completed' ? 'View Full Telemetry' : 'Resume Session'}
                        <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom 2-Column Row: Master Resume & Target Job Pipeline Alignment */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="obsidian-card p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[6px] bg-[#36C995]/15 border border-[#36C995]/30 flex items-center justify-center text-[#36C995]">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold">
                  {latestResume ? latestResume.filename : 'No Resume Uploaded Yet'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {latestResume
                    ? `Parsed ${(latestResume.created_at || '').slice(0, 10)} • ${latestResume.file_type?.toUpperCase()}`
                    : 'Upload a PDF, DOCX, or TXT resume to unlock skill extraction'}
                </p>
              </div>
            </div>
            <Link to="/resume-analyzer" className="p-1.5 rounded-[4px] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
              <span className="material-symbols-outlined text-[18px]">cached</span>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 obsidian-subpanel p-3 text-center">
            <div>
              <span className="label-caps text-[9px] text-[var(--text-secondary)] block">OVERALL SCORE</span>
              <span className="font-mono-tabular text-sm font-semibold text-[#36C995]">
                {latestResumeAnalysis ? `${latestResumeAnalysis.overall_score}%` : '—'}
              </span>
            </div>
            <div>
              <span className="label-caps text-[9px] text-[var(--text-secondary)] block">ATS COMPLIANCE</span>
              <span className="font-mono-tabular text-sm font-semibold text-[#42C6D9]">
                {latestResumeAnalysis ? `${latestResumeAnalysis.ats_compatibility_score}%` : '—'}
              </span>
            </div>
            <div>
              <span className="label-caps text-[9px] text-[var(--text-secondary)] block">IMPACT SCORE</span>
              <span className="font-mono-tabular text-sm font-semibold text-[#786BFF]">
                {latestResumeAnalysis ? `${latestResumeAnalysis.impact_score}%` : '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#36C995] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">task_alt</span>
              {latestResumeAnalysis ? 'Ready for ATS & XYZ bullet optimization' : 'Ready for upload'}
            </span>
            <Link to="/resume-analyzer" className="text-[#786BFF] hover:underline font-medium">
              {latestResumeAnalysis ? 'Edit Bullet Points' : 'Upload Resume →'}
            </Link>
          </div>
        </div>

        <div className="obsidian-card p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[6px] bg-[#42C6D9]/15 border border-[#42C6D9]/30 flex items-center justify-center text-[#42C6D9]">
                <span className="material-symbols-outlined text-[20px]">work_history</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Target Job Pipeline Alignment</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Synthesized from {jobsList.length} ingested Job Description(s)
                </p>
              </div>
            </div>
            <Link to="/job-analyzer" className="p-1.5 rounded-[4px] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </Link>
          </div>

          <div className="space-y-2">
            {jobsList.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] py-2">
                No job descriptions analyzed yet. Paste a job posting in the Job Compatibility workspace.
              </p>
            ) : (
              jobsList.slice(0, 3).map((j) => (
                <div key={j.id} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-subtle)]/60">
                  <div className="truncate pr-2">
                    <strong className="text-[var(--text-primary)]">{j.company_name || 'Target Org'}</strong>
                    <span className="text-[var(--text-secondary)]"> • {j.job_title}</span>
                  </div>
                  <span className="font-mono-tabular font-semibold text-[#36C995] shrink-0">
                    {j.match_percentage}% Match
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">SKILL GAP MATRIX</span>
            <Link to="/job-analyzer" className="text-[#42C6D9] hover:underline font-medium">
              Inspect Gap Vectors →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
