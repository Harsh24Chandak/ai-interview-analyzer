import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  FileText,
  Briefcase,
  Award,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Zap,
  Target,
  Layers,
  Code2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { analyticsAPI, authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import ProgressBar from '../components/common/ProgressBar';
import Loading from '../components/common/Loading';

const DEFAULT_TREND_PROJECTION = [
  { date: 'Baseline', overall: 62, technical: 60, communication: 65 },
  { date: 'Milestone 1', overall: 74, technical: 75, communication: 72 },
  { date: 'Milestone 2', overall: 82, technical: 80, communication: 85 },
  { date: 'Hiring Bar (90%)', overall: 90, technical: 92, communication: 88 },
];

const DEFAULT_FOCUS_SKILLS = [
  'System Design & Scalability',
  'Redis & Distributed Caching',
  'Automated Testing (Pytest)',
  'STAR Behavioral Storytelling',
  'SQL Query Optimization',
  'Cloud Deployment (Docker/AWS)',
];

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchDashboard = () => {
    setLoading(true);
    analyticsAPI
      .getDashboardStats()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSeedMyAccount = async () => {
    setSeeding(true);
    try {
      await authAPI.seedSampleData();
      showToast('Sample Resume Analysis (88/100), Job Match (84%), and 3 Completed Interviews loaded into your account!', 'success');
      fetchDashboard();
    } catch (err) {
      showToast('Could not seed sample data.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) return <Loading label="Loading personalized career intelligence dashboard..." />;

  const stats = data?.stats || {
    total_interviews_completed: 0,
    average_interview_score: 0,
    resume_analysis_score: 0,
    job_match_score: 0,
    preparation_progress: 0,
    ai_mode: 'deterministic_fallback_engine',
  };

  const rawTrends = data?.performance_trends || [];
  const isProjection = rawTrends.length === 0 || data?.is_baseline_projection;
  const chartData = rawTrends.length > 0 ? rawTrends : DEFAULT_TREND_PROJECTION;

  const skillsList =
    data?.skills_needing_improvement && data.skills_needing_improvement.length > 0
      ? data.skills_needing_improvement
      : DEFAULT_FOCUS_SKILLS;

  const actionsList =
    data?.recommended_actions && data.recommended_actions.length > 0
      ? data.recommended_actions
      : [
          {
            title: 'Upload & Analyze Your Resume',
            description: 'Extract skills, ATS score, and rewrite bullets with our XYZ Impact Optimizer.',
            route: '/resume-analyzer',
          },
          {
            title: 'Run Job Description Compatibility Match',
            description: 'Compare your resume against a target job description and get a 3-week roadmap.',
            route: '/job-analyzer',
          },
          {
            title: 'Start a Targeted AI Mock Interview',
            description: 'Practice with real-time STAR telemetry, live code sandbox, and 7-dimension rubric.',
            route: '/interview/setup',
          },
        ];

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 p-8 rounded-3xl border border-indigo-500/35 bg-gradient-to-r from-indigo-950/80 via-[#0f172a] to-[#0b1120] shadow-2xl shadow-indigo-950/20">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={stats.ai_mode === 'gemini_live' ? 'success' : 'info'} size="md">
              {stats.ai_mode === 'gemini_live' ? 'Google Gemini Live AI' : 'Calibrated Rubric & STAR Engine Active'}
            </Badge>
            <span className="text-sm font-medium text-slate-300">
              Target Role: <strong className="text-white">{user?.target_role || 'Full Stack Software Engineer'}</strong>
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Welcome back, {user?.full_name || 'Candidate'}
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl">
            {stats.total_interviews_completed > 0
              ? `Your overall interview preparation readiness is at ${stats.preparation_progress}% across ${stats.total_interviews_completed} evaluated sessions.`
              : 'Your workspace is ready! Upload a resume, start your first AI mock interview, or click "Load Sample Portfolio" to populate benchmark analytics.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 shrink-0">
          {stats.total_interviews_completed === 0 && (
            <button
              onClick={handleSeedMyAccount}
              disabled={seeding}
              className="px-5 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-sm font-bold border border-emerald-500/40 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {seeding ? 'Loading Portfolio...' : 'Load Sample Portfolio Data'}
            </button>
          )}
          <Link
            to="/resume-analyzer"
            className="px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white text-sm font-bold border border-slate-700 transition-all"
          >
            Analyze Resume
          </Link>
          <Link
            to="/interview/setup"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all"
          >
            <Mic className="w-4 h-4" /> Start Mock Interview
          </Link>
        </div>
      </div>

      {/* 4 Large KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card hover className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Completed Interviews</p>
              <p className="text-4xl sm:text-5xl font-extrabold mt-3 text-white">{stats.total_interviews_completed}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Award className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-medium text-emerald-400 mt-4 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Persisted in SQLite Database
          </p>
        </Card>

        <Card hover className="flex flex-col justify-between">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Average Interview Score</p>
              <p className="text-4xl sm:text-5xl font-extrabold mt-3 text-indigo-400">{stats.average_interview_score}%</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <ProgressBar value={stats.average_interview_score || 12} showPercent={false} />
        </Card>

        <Card hover className="flex flex-col justify-between">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Resume Intelligence Score</p>
              <p className="text-4xl sm:text-5xl font-extrabold mt-3 text-emerald-400">{stats.resume_analysis_score}/100</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <ProgressBar value={stats.resume_analysis_score || 15} variant="success" showPercent={false} />
        </Card>

        <Card hover className="flex flex-col justify-between">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Job Match Compatibility</p>
              <p className="text-4xl sm:text-5xl font-extrabold mt-3 text-sky-400">{stats.job_match_score}%</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
          <ProgressBar value={stats.job_match_score || 15} variant="primary" showPercent={false} />
        </Card>
      </div>

      {/* Main Analytics & Next Actions Row */}
      <div className="grid xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Interview Score Progression</h3>
              <p className="text-sm text-slate-400 mt-0.5">
                {isProjection
                  ? 'Target Readiness Trajectory (Complete an interview or click "Load Sample Portfolio Data" to plot your live scores)'
                  : 'Historical Overall vs. Technical Accuracy performance across completed sessions'}
              </p>
            </div>
            <Badge variant={isProjection ? 'warning' : 'success'} size="sm">
              {isProjection ? 'Target Benchmark Curve' : 'Live Session Telemetry'}
            </Badge>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={13} tickMargin={8} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={13} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '14px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="overall"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="#6366f1"
                  fillOpacity={0.25}
                  name="Overall Score (%)"
                />
                <Area
                  type="monotone"
                  dataKey="technical"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="#10b981"
                  fillOpacity={0.15}
                  name="Technical Depth (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Skills & Topics to Master</h3>
            <p className="text-sm text-slate-400 mb-4">
              High-leverage competencies prioritized for {user?.target_role || 'Full Stack Software Engineer'}:
            </p>
            <div className="flex flex-wrap gap-2">
              {skillsList.map((sk, idx) => (
                <Badge key={idx} variant="warning" size="md">
                  {sk}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Recommended Next Actions
            </h4>
            <div className="space-y-3">
              {actionsList.map((act, i) => (
                <Link
                  key={i}
                  to={act.route}
                  className="block p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/50 bg-slate-950/70 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-indigo-300 group-hover:text-indigo-200">
                      {act.title}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">{act.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Market Differentiator Feature Highlights Bar */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-indigo-500/25">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
              <Target className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Live STAR & Vocal Telemetry</h4>
          </div>
          <p className="text-sm text-slate-400">
            Detects Situation, Task, Action, and Result (Metrics) in real time as you type or speak, alongside WPM pacing and filler-word heatmaps.
          </p>
        </Card>

        <Card className="border-emerald-500/25">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Code2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Integrated Code & Design Pad</h4>
          </div>
          <p className="text-sm text-slate-400">
            Write Python, JavaScript, SQL, or System Design schemas side-by-side during technical mock interviews for unified code + verbal evaluation.
          </p>
        </Card>

        <Card className="border-sky-500/25">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">1-Click XYZ Bullet Optimizer</h4>
          </div>
          <p className="text-sm text-slate-400">
            Automatically rewrites weak resume lines into quantified Google-style XYZ impact statements inside the Resume Analyzer.
          </p>
        </Card>
      </div>
    </div>
  );
}
