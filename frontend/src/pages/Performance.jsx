import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import ProgressBar from '../components/common/ProgressBar';
import ChartCard from '../components/common/ChartCard';
import EmptyState from '../components/common/EmptyState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';

export default function Performance() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [timeframe, setTimeframe] = useState('ALL'); // 30D, 90D, ALL
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.getPerformanceAnalytics();
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load performance analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const filteredTrends = useMemo(() => {
    const raw = data?.score_trends || [];
    if (timeframe === 'ALL' || raw.length === 0) return raw;
    const days = timeframe === '30D' ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const filtered = raw.filter((item) => (item.date || '') >= cutoff);
    return filtered.length > 0 ? filtered : raw;
  }, [data, timeframe]);

  const summaryMetrics = useMemo(() => {
    const trends = data?.score_trends || [];
    const comm = data?.communication_metrics || {
      total_answers_evaluated: 0,
      average_words_per_answer: 0,
      total_filler_words: 0,
      filler_rate_percentage: 0,
    };
    const count = trends.length;
    const meanScore = count
      ? (trends.reduce((acc, s) => acc + (s.overall_score || 0), 0) / count).toFixed(1)
      : '0.0';
    const firstScore = count ? trends[0].overall_score : 0;
    const latestScore = count ? trends[count - 1].overall_score : 0;
    const delta = count > 1 ? (latestScore - firstScore).toFixed(1) : '0.0';
    return { count, meanScore, firstScore, latestScore, delta, comm };
  }, [data]);

  const handleExportTelemetry = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance_telemetry_${user?.id || 'candidate'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported performance telemetry dataset (JSON)', 'info');
  };

  if (loading) return <LoadingSkeleton label="Loading longitudinal performance telemetry..." />;
  if (error) return <ErrorState title="Analytics Error" message={error} onRetry={loadAnalytics} />;

  const categories = data?.category_performance || [];
  const rubricDims = data?.rubric_dimensions || [];
  const topics = data?.topic_breakdown || [];
  const comm = summaryMetrics.comm;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={['WORKSPACE', 'PERFORMANCE ANALYTICS', 'TELEMETRY RUNTIME']}
        title="Executive Performance Telemetry & Longitudinal Analytics"
        subtitle={`Longitudinal audit across ${summaryMetrics.count} completed mock evaluation(s), 7 competency dimensions, and text-derived communication metrics.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-0.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              {['30D', '90D', 'ALL'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded-[4px] label-caps text-[10px] cursor-pointer ${
                    timeframe === tf ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {tf === 'ALL' ? `ALL-TIME (${summaryMetrics.count})` : tf}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" materialIcon="download" onClick={handleExportTelemetry}>
              Export Telemetry
            </Button>
          </div>
        }
      />

      {/* 4 Top Summary Cards from Real Backend Datasets (Match Screen 13) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="obsidian-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">CUMULATIVE MEAN</span>
            <Badge variant="emerald" size="xs">
              {Number(summaryMetrics.delta) >= 0 ? `+${summaryMetrics.delta} PTS` : `${summaryMetrics.delta} PTS`}
            </Badge>
          </div>
          <div className="my-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[var(--text-primary)]">
              {summaryMetrics.meanScore}
            </span>
            <span className="text-xs text-[var(--text-secondary)] ml-1">/ 100</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">
            Computed from {summaryMetrics.count} completed session(s)
          </span>
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">EVALUATION VOLUME</span>
            <Badge variant="cyan" size="xs">SQLITE RECORDS</Badge>
          </div>
          <div className="my-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[var(--text-primary)]">
              {summaryMetrics.count}
            </span>
            <span className="text-xs text-[var(--text-secondary)] ml-1.5">SESSIONS</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">
            {comm.total_answers_evaluated} total answers evaluated
          </span>
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">AVG ANSWER LENGTH</span>
            <Badge variant="violet" size="xs">TEXT TELEMETRY</Badge>
          </div>
          <div className="my-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[var(--text-primary)]">
              {comm.average_words_per_answer}
            </span>
            <span className="text-xs text-[var(--text-secondary)] ml-1.5">WORDS / ANSWER</span>
          </div>
          <span className="text-xs text-[#36C995]">
            Filler Ratio: {comm.filler_rate_percentage}% ({comm.total_filler_words} total)
          </span>
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">LATEST SESSION SCORE</span>
            <Badge variant="emerald" size="xs">RECENT</Badge>
          </div>
          <div className="my-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[#42C6D9]">
              {summaryMetrics.latestScore}%
            </span>
            <span className="text-xs text-[var(--text-secondary)] ml-1.5">COMPOSITE</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">
            Target Role: {user?.target_role || 'Software Engineer'}
          </span>
        </div>
      </div>

      {summaryMetrics.count === 0 ? (
        <EmptyState
          materialIcon="insights"
          title="No Completed Interview Evaluations Yet"
          description="Complete your first AI mock interview or load the sample portfolio from the Dashboard to populate longitudinal charts, rubric radar, and topic mastery breakdowns."
          actionLabel="Launch AI Mock Interview"
          onAction={() => navigate('/interview/setup')}
          secondaryLabel="Go to Dashboard"
          onSecondary={() => navigate('/dashboard')}
        />
      ) : (
        <>
          {/* Row 2: Score Progression (7 cols) + 7-Dimension Competency Radar (5 cols) */}
          <div className="grid lg:grid-cols-12 gap-5">
            <ChartCard
              className="lg:col-span-7"
              title="Interview Score Progression & Velocity Trend"
              subtitle={`Longitudinal trajectory across ${filteredTrends.length} completed session(s)`}
              materialIcon="trending_up"
              rightSlot={
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-[#786BFF]">● Composite</span>
                  <span className="flex items-center gap-1 text-[#42C6D9]">● Technical</span>
                  <span className="flex items-center gap-1 text-[#36C995]">● Communication</span>
                </div>
              }
              footerSlot={
                <div className="flex flex-wrap items-center justify-between gap-2 label-caps text-[10px] text-[var(--text-secondary)]">
                  <span>INITIAL: {summaryMetrics.firstScore}%</span>
                  <span className="text-[#36C995]">
                    NET DELTA: {Number(summaryMetrics.delta) >= 0 ? `+${summaryMetrics.delta}` : summaryMetrics.delta} PTS
                  </span>
                  <span className="text-[var(--text-primary)]">LATEST: {summaryMetrics.latestScore}%</span>
                </div>
              }
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredTrends}>
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
                    <Area
                      type="monotone"
                      dataKey="overall_score"
                      stroke="#786BFF"
                      strokeWidth={2.5}
                      fill="#786BFF"
                      fillOpacity={0.22}
                      name="Composite Score"
                    />
                    <Area
                      type="monotone"
                      dataKey="technical_score"
                      stroke="#42C6D9"
                      strokeWidth={2}
                      fill="#42C6D9"
                      fillOpacity={0.12}
                      name="Technical Score"
                    />
                    <Area
                      type="monotone"
                      dataKey="communication_score"
                      stroke="#36C995"
                      strokeWidth={2}
                      fill="#36C995"
                      fillOpacity={0.08}
                      name="Communication Score"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              className="lg:col-span-5"
              title="7-Dimension Competency Radar"
              subtitle="Candidate polygon across all evaluated answers"
              materialIcon="radar"
              rightSlot={<Badge variant="cyan" size="xs">CALIBRATED</Badge>}
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={rubricDims}>
                    <PolarGrid stroke="#26344A" />
                    <PolarAngleAxis dataKey="dimension" stroke="#9AA9BD" fontSize={10} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#53637A" fontSize={9} />
                    <Radar
                      name="Candidate Mean"
                      dataKey="score"
                      stroke="#786BFF"
                      fill="#786BFF"
                      fillOpacity={0.35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111C2D',
                        borderColor: '#26344A',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Row 3: Performance by Interview Category (6 cols) + Domain Topic Mastery Matrix (6 cols) */}
          <div className="grid lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 obsidian-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Performance by Interview Category</h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Normalized capability scores across dedicated interview modes
                  </p>
                </div>
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">
                  {summaryMetrics.count} TOTAL SESSIONS
                </span>
              </div>

              <div className="space-y-4 pt-1">
                {categories.map((cat, idx) => (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)]">{cat.category}</span>
                      <span className="font-mono-tabular text-[var(--text-secondary)]">
                        <strong className="text-[#42C6D9]">{cat.average_score}%</strong> ({cat.sessions} session{cat.sessions > 1 ? 's' : ''})
                      </span>
                    </div>
                    <ProgressBar
                      value={cat.average_score}
                      variant={idx % 2 === 0 ? 'cyan' : 'violet'}
                      showPercent={false}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 obsidian-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Domain Topic Mastery Matrix</h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Topic-level verification from evaluated interview questions
                  </p>
                </div>
                <span className="label-caps text-[10px] text-[#36C995]">CONFIDENCE RATED</span>
              </div>

              <div className="space-y-2.5">
                {topics.slice(0, 5).map((tp) => {
                  const status = tp.average_score >= 85 ? 'MASTERED' : tp.average_score >= 70 ? 'PROFICIENT' : 'REMEDIATING';
                  const badgeVar = tp.average_score >= 85 ? 'emerald' : tp.average_score >= 70 ? 'cyan' : 'danger';
                  return (
                    <div key={tp.topic} className="obsidian-subpanel p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-[var(--text-primary)] block truncate">
                          {tp.topic}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          {tp.questions_answered} question(s) evaluated
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono-tabular text-sm font-semibold text-[var(--text-primary)]">
                          {tp.average_score}%
                        </span>
                        <Badge variant={badgeVar} size="xs">{status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 4: Communication & Text Telemetry Breakdown */}
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Communication & Text-Derived Telemetry Breakdown</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Aggregated across {comm.total_answers_evaluated} evaluated interview answer(s)
                </p>
              </div>
              <Badge variant="emerald" size="xs">TEXT & SPEECH TRANSCRIPT ENGINE</Badge>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="obsidian-subpanel p-4">
                <span className="label-caps text-[10px] text-[var(--text-secondary)] block">EVALUATED ANSWERS</span>
                <span className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] block mt-1">
                  {comm.total_answers_evaluated}
                </span>
                <span className="text-[11px] text-[#36C995]">Persisted in SQLite</span>
              </div>
              <div className="obsidian-subpanel p-4">
                <span className="label-caps text-[10px] text-[var(--text-secondary)] block">AVG ANSWER LENGTH</span>
                <span className="font-mono-tabular text-2xl font-semibold text-[#42C6D9] block mt-1">
                  {comm.average_words_per_answer} words
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">Per submitted response</span>
              </div>
              <div className="obsidian-subpanel p-4">
                <span className="label-caps text-[10px] text-[var(--text-secondary)] block">TOTAL FILLER WORDS</span>
                <span className="font-mono-tabular text-2xl font-semibold text-[#36C995] block mt-1">
                  {comm.total_filler_words}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">Detected across transcripts</span>
              </div>
              <div className="obsidian-subpanel p-4">
                <span className="label-caps text-[10px] text-[var(--text-secondary)] block">FILLER WORD RATIO</span>
                <span className="font-mono-tabular text-2xl font-semibold text-[#C5C0FF] block mt-1">
                  {comm.filler_rate_percentage}%
                </span>
                <span className="text-[11px] text-[#36C995]">Target: &lt; 1.5%</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
