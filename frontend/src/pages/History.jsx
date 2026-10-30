import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import ScoreRing from '../components/common/ScoreRing';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

export default function History() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('RECENT'); // RECENT, HIGH_SCORE, LOW_SCORE

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await interviewAPI.getInterviewHistory();
      setSessions(res.data?.sessions || []);
    } catch (err) {
      showToast('Failed to load interview history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredSessions = useMemo(() => {
    let list = [...sessions];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          (s.job_role || '').toLowerCase().includes(q) ||
          (s.summary_feedback || '').toLowerCase().includes(q) ||
          (s.company_style || '').toLowerCase().includes(q) ||
          String(s.id).includes(q)
      );
    }
    if (categoryFilter !== 'ALL') {
      list = list.filter((s) => s.interview_type === categoryFilter);
    }
    if (difficultyFilter !== 'ALL') {
      list = list.filter((s) => s.difficulty === difficultyFilter);
    }
    if (dateFilter !== 'ALL') {
      const days = dateFilter === '7D' ? 7 : 30;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      list = list.filter((s) => (s.created_at || '').slice(0, 10) >= cutoff);
    }
    if (sortBy === 'HIGH_SCORE') {
      list.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
    } else if (sortBy === 'LOW_SCORE') {
      list.sort((a, b) => (a.overall_score || 0) - (b.overall_score || 0));
    } else {
      list.sort((a, b) => b.id - a.id);
    }
    return list;
  }, [sessions, searchQuery, categoryFilter, difficultyFilter, dateFilter, sortBy]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter((s) => s.status === 'completed');
    const mean = completed.length
      ? (completed.reduce((acc, s) => acc + (s.overall_score || 0), 0) / completed.length).toFixed(1)
      : '0.0';
    const highPass = completed.filter((s) => (s.overall_score || 0) >= 80).length;
    const totalMins = Math.round(sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / 60);
    return { total, completedCount: completed.length, mean, highPass, totalMins };
  }, [sessions]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await interviewAPI.deleteInterview(deleteTarget.id);
      showToast(`Deleted Session #${deleteTarget.id}`, 'info');
      setDeleteTarget(null);
      await loadHistory();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportArchive = () => {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interview_evaluation_archive.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported historical archive (JSON)', 'info');
  };

  if (loading) return <LoadingSkeleton label="Loading Interview Evaluation Archive..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={['WORKSPACE', 'INTERVIEW HISTORY', 'ARCHIVED EVALUATIONS']}
        title="Interview Evaluation Archive & Historical Audits"
        subtitle={`Audit, search, and review all ${stats.total} historical AI mock interview session(s) with stored transcripts, STAR telemetry, and rubric reports.`}
        actions={
          <>
            <Button variant="secondary" size="sm" materialIcon="download" onClick={handleExportArchive}>
              Export Historical Archive (JSON)
            </Button>
            <Button variant="primary" size="sm" materialIcon="add_circle" onClick={() => navigate('/interview/setup')}>
              New Mock Session
            </Button>
          </>
        }
      />

      {/* 4 Summary Cards (Match Screen 14) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="obsidian-card p-4">
          <span className="label-caps text-[10px] text-[var(--text-secondary)] block">TOTAL SESSIONS</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[var(--text-primary)]">{stats.total}</span>
            <span className="label-caps text-[10px] text-[#36C995]">{stats.completedCount} COMPLETED</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] block mt-1">{stats.totalMins} mins cumulative simulation</span>
        </div>

        <div className="obsidian-card p-4">
          <span className="label-caps text-[10px] text-[var(--text-secondary)] block">MEAN COMPOSITE</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[#42C6D9]">{stats.mean}</span>
            <span className="text-xs text-[var(--text-secondary)]">/ 100</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] block mt-1">Across completed sessions</span>
        </div>

        <div className="obsidian-card p-4">
          <span className="label-caps text-[10px] text-[var(--text-secondary)] block">STRONG PASS (≥80%)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[#36C995]">{stats.highPass}</span>
            <span className="text-xs text-[var(--text-secondary)]">/ {stats.completedCount} Sessions</span>
          </div>
          <span className="text-xs text-[#36C995] block mt-1">Calibrated rubric threshold</span>
        </div>

        <div className="obsidian-card p-4">
          <span className="label-caps text-[10px] text-[var(--text-secondary)] block">DATA ISOLATION</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)]">User-Scoped</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] block mt-1">Private SQLite ownership</span>
        </div>
      </div>

      {/* Filter & Search Bar (Match Screen 14) */}
      <div className="obsidian-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <span className="material-symbols-outlined text-[16px] text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by session ID, role title, company style..."
              className="w-full obsidian-input pl-9 pr-3 py-2 text-xs"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="obsidian-input px-3 py-2 text-xs"
          >
            <option value="ALL">All Categories ({sessions.length})</option>
            <option value="Technical">Technical</option>
            <option value="Behavioral">Behavioral</option>
            <option value="HR">HR</option>
            <option value="Situational">Situational</option>
            <option value="Resume-Based">Resume-Based</option>
            <option value="Job-Description-Based">Job-Description-Based</option>
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="obsidian-input px-3 py-2 text-xs"
          >
            <option value="ALL">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <div className="flex gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="obsidian-input px-2.5 py-2 text-xs flex-1"
            >
              <option value="ALL">All Dates</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="obsidian-input px-2.5 py-2 text-xs flex-1"
            >
              <option value="RECENT">Most Recent</option>
              <option value="HIGH_SCORE">Highest Score</option>
              <option value="LOW_SCORE">Lowest Score</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1">
          <span>• Showing {filteredSessions.length} archived evaluation session(s)</span>
          {(searchQuery || categoryFilter !== 'ALL' || difficultyFilter !== 'ALL' || dateFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('ALL');
                setDifficultyFilter('ALL');
                setDateFilter('ALL');
              }}
              className="text-[#42C6D9] hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Session Archive Cards */}
      {filteredSessions.length === 0 ? (
        <EmptyState
          materialIcon="history"
          title="No Matching Interview Sessions"
          description="No interview sessions matched your current filter criteria, or you have not completed a mock interview yet."
          actionLabel="Start New Mock Session"
          onAction={() => navigate('/interview/setup')}
        />
      ) : (
        <div className="space-y-3.5">
          {filteredSessions.map((sess) => {
            const mins = Math.floor((sess.duration_seconds || 0) / 60);
            const secs = (sess.duration_seconds || 0) % 60;
            const isSample = sess.ai_provider === 'seeded_portfolio' || sess.ai_provider === 'seeded_baseline';
            return (
              <div key={sess.id} className="obsidian-card p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular text-xs font-semibold text-[#42C6D9]">
                        #SESSION-{String(sess.id).padStart(3, '0')}-AUDIT
                      </span>
                      <Badge variant={sess.overall_score >= 80 ? 'emerald' : 'violet'} size="xs">
                        {sess.status === 'completed'
                          ? sess.overall_score >= 85
                            ? 'STRONG CALIBRATION'
                            : 'COMPLETED'
                          : 'IN PROGRESS'}
                      </Badge>
                      <Badge variant="gray" size="xs">{sess.interview_type}</Badge>
                      <Badge variant="cyan" size="xs">{sess.difficulty}</Badge>
                      {isSample && <Badge variant="warning" size="xs">DEMO / SAMPLE RECORD</Badge>}
                      <span className="text-xs text-[var(--text-secondary)] font-mono-tabular">
                        ⏱ {(sess.completed_at || sess.created_at || '').slice(0, 10)} • Duration: {mins}m {secs}s
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {sess.job_role}{' '}
                      <span className="text-sm font-normal text-[var(--text-secondary)]">
                        • Rubric: {sess.company_style || 'High-Growth SaaS'} ({sess.experience_level})
                      </span>
                    </h3>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {sess.summary_feedback || 'Session in progress — resume to submit and evaluate answers.'} •{' '}
                      <strong className="text-[var(--text-primary)]">
                        {sess.answered_count || 0} of {sess.question_count} Questions Answered
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <ScoreRing score={sess.overall_score || 0} size={58} strokeWidth={5} label="%" />
                      <div>
                        <span className="label-caps text-[9px] text-[var(--text-secondary)] block">COMPOSITE SCORE</span>
                        <span className="font-mono-tabular text-lg font-semibold text-[var(--text-primary)]">
                          {sess.overall_score || 0} / 100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="label-caps text-[9px] text-[var(--text-secondary)] mr-1">CORE FOCUS:</span>
                    {(sess.recommended_topics && sess.recommended_topics.length > 0
                      ? sess.recommended_topics
                      : [sess.interview_type, sess.job_role]
                    ).map((tp, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-[4px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]"
                      >
                        {tp}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={sess.status === 'completed' ? `/results/${sess.id}` : `/interview/${sess.id}`}
                      className="btn-primary-violet px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1"
                    >
                      {sess.status === 'completed' ? 'View Full Report →' : 'Continue Interview →'}
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(sess)}
                      className="p-1.5 rounded-[6px] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[#EF7280] hover:border-[#EF7280]/40 cursor-pointer"
                      title="Delete Session"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleting}
        title={`Delete Session #${deleteTarget?.id || ''}?`}
        description={`Are you sure you want to permanently delete the "${deleteTarget?.job_role || ''}" interview session and its evaluations from your history?`}
      />
    </div>
  );
}
