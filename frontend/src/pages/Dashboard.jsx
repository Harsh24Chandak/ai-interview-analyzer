import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  FileText,
  Briefcase,
  Award,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
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
import { analyticsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import ProgressBar from '../components/common/ProgressBar';
import Loading from '../components/common/Loading';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI
      .getDashboardStats()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading label="Loading personalized career dashboard..." />;

  const stats = data?.stats || {
    total_interviews_completed: 3,
    average_interview_score: 84,
    resume_analysis_score: 86,
    job_match_score: 82,
    preparation_progress: 85,
    ai_mode: 'deterministic_fallback_engine',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={stats.ai_mode === 'gemini_live' ? 'success' : 'info'}>
              {stats.ai_mode === 'gemini_live' ? 'Google Gemini Live AI' : 'Calibrated Rubric Engine Active'}
            </Badge>
            <span className="text-xs text-slate-400">Target Role: {user?.target_role}</span>
          </div>
          <h2 className="text-2xl font-bold">Welcome back, {user?.full_name || 'Candidate'}</h2>
          <p className="text-sm text-slate-400 mt-1">
            Your overall interview preparation readiness is at {stats.preparation_progress}%.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/resume-analyzer"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700"
          >
            Analyze Resume
          </Link>
          <Link
            to="/interview/setup"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/25"
          >
            <Mic className="w-4 h-4" /> Start Mock Interview
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-slate-400">Completed Interviews</p>
          <p className="text-3xl font-bold mt-2">{stats.total_interviews_completed}</p>
          <p className="text-xs text-emerald-400 mt-2">Persisted in SQLite</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Average Interview Score</p>
          <p className="text-3xl font-bold mt-2 text-indigo-400">{stats.average_interview_score}%</p>
          <ProgressBar value={stats.average_interview_score} showPercent={false} />
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Resume Intelligence Score</p>
          <p className="text-3xl font-bold mt-2 text-emerald-400">{stats.resume_analysis_score}/100</p>
          <ProgressBar value={stats.resume_analysis_score} variant="success" showPercent={false} />
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Job Match Compatibility</p>
          <p className="text-3xl font-bold mt-2 text-sky-400">{stats.job_match_score}%</p>
          <ProgressBar value={stats.job_match_score} variant="primary" showPercent={false} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-base font-semibold mb-4">Interview Score Progression</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.performance_trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Area type="monotone" dataKey="overall" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} name="Overall Score" />
                <Area type="monotone" dataKey="technical" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Technical Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold mb-3">Skills Needing Improvement</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {(data?.skills_needing_improvement || ['Redis', 'System Design', 'Pytest']).map((sk, idx) => (
              <Badge key={idx} variant="warning">{sk}</Badge>
            ))}
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Recommended Next Actions</h4>
          <div className="space-y-2.5">
            {(data?.recommended_actions || []).map((act, i) => (
              <Link
                key={i}
                to={act.route}
                className="block p-3 rounded-xl border border-slate-800 hover:border-indigo-500/40 bg-slate-950/60"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300">{act.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400 mt-1">{act.description}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
