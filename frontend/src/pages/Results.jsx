import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { interviewAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import ScoreRing from '../components/common/ScoreRing';
import ProgressBar from '../components/common/ProgressBar';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQ, setExpandedQ] = useState(0);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await interviewAPI.getInterviewDetails(id);
      setSession(res.data);
      if (res.data?.questions?.[0]?.id) {
        setExpandedQ(res.data.questions[0].id);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not load final interview report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  const rubricAverages = useMemo(() => {
    const qs = (session?.questions || []).filter((q) => q.evaluation);
    if (qs.length === 0) {
      return [
        { label: 'Relevance', score: 0 },
        { label: 'Technical Accuracy', score: 0 },
        { label: 'Completeness', score: 0 },
        { label: 'Clarity & Structure', score: 0 },
        { label: 'Communication', score: 0 },
        { label: 'Problem Solving & Trade-offs', score: 0 },
        { label: 'Practical Understanding', score: 0 },
      ];
    }
    const avg = (k) => Math.round(qs.reduce((acc, q) => acc + (q.evaluation[k] || 0), 0) / qs.length);
    return [
      { label: 'Relevance', score: avg('relevance_score') },
      { label: 'Technical Accuracy', score: avg('technical_accuracy_score') },
      { label: 'Completeness', score: avg('completeness_score') },
      { label: 'Clarity & Structure', score: avg('clarity_score') },
      { label: 'Communication', score: avg('communication_score') },
      { label: 'Problem Solving & Trade-offs', score: avg('problem_solving_score') },
      { label: 'Practical Understanding', score: avg('practical_understanding_score') },
    ];
  }, [session]);

  const verbalStats = useMemo(() => {
    const qs = (session?.questions || []).filter((q) => q.answer);
    const totalWords = qs.reduce((acc, q) => acc + (q.answer.word_count || 0), 0);
    const totalFillers = qs.reduce((acc, q) => acc + (q.answer.filler_word_count || 0), 0);
    const fillerRatio = totalWords > 0 ? ((totalFillers / totalWords) * 100).toFixed(2) : '0.00';
    const codeSubmissions = qs.filter((q) => q.answer.code_snippet && q.answer.code_snippet.trim()).length;
    return { totalWords, totalFillers, fillerRatio, codeSubmissions };
  }, [session]);

  const handleDownloadReport = () => {
    if (!session) return;
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview_audit_session_${session.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded session audit report (JSON)', 'info');
  };

  if (loading) return <LoadingSkeleton label="Compiling Final Interview Performance Audit..." />;
  if (error || !session) return <ErrorState title="Report Error" message={error || 'Report not found'} onRetry={loadReport} />;

  const durMins = Math.floor((session.duration_seconds || 0) / 60);
  const durSecs = (session.duration_seconds || 0) % 60;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={['WORKSPACE', 'AI MOCK INTERVIEWS', `SESSION #${String(session.id).padStart(3, '0')} AUDIT REPORT`]}
        title={`Interview Performance Audit: Session #${String(session.id).padStart(3, '0')} — ${session.job_role}`}
        subtitle={`Company Rubric: ${session.company_style || 'High-Growth SaaS'} • Mode: ${session.interview_type} • Difficulty: ${session.difficulty} • Completed: ${(session.completed_at || session.created_at || '').slice(0, 16).replace('T', ' ')}`}
        actions={
          <>
            <Button variant="secondary" size="sm" materialIcon="print" onClick={() => window.print()}>
              Print Report
            </Button>
            <Button variant="secondary" size="sm" materialIcon="download" onClick={handleDownloadReport}>
              Download Audit (JSON)
            </Button>
            <Link
              to="/history"
              className="px-3 py-1.5 rounded-[6px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)]"
            >
              Interview History
            </Link>
            <Button
              variant="primary"
              size="sm"
              materialIcon="play_arrow"
              onClick={() => navigate('/interview/setup')}
            >
              Launch Next Mock
            </Button>
          </>
        }
      />

      {/* 5 Top Summary Cards (Match Screen 12) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 obsidian-card p-5 flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="label-caps text-[10px] text-[var(--text-secondary)] block">OVERALL COMPOSITE TELEMETRY</span>
            <Badge variant={session.overall_score >= 80 ? 'emerald' : 'cyan'} size="xs">
              {session.overall_score >= 85 ? '✓ STRONG CALIBRATION' : session.overall_score >= 70 ? '✓ SOLID PASS' : 'NEEDS REMEDIATION'}
            </Badge>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed pt-1">
              {session.summary_feedback}
            </p>
          </div>
          <ScoreRing score={session.overall_score} size={96} strokeWidth={7} sublabel="/ 100 PTS" variant="emerald" />
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <span className="label-caps text-[10px] text-[var(--text-secondary)]">DURATION</span>
          <div className="my-2">
            <span className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)]">
              {durMins}m {durSecs}s
            </span>
            <span className="text-xs text-[var(--text-secondary)] block mt-0.5">Recorded session time</span>
          </div>
          <span className="label-caps text-[10px] text-[#36C995]">TIMED SIMULATION</span>
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <span className="label-caps text-[10px] text-[var(--text-secondary)]">COMPLETION</span>
          <div className="my-2">
            <span className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)]">
              {session.answered_count || 0} of {session.questions?.length || session.question_count}
            </span>
            <span className="text-xs text-[var(--text-secondary)] block mt-0.5">Questions evaluated</span>
          </div>
          <span className="label-caps text-[10px] text-[#42C6D9]">
            {session.company_style || 'High-Growth SaaS'}
          </span>
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <span className="label-caps text-[10px] text-[var(--text-secondary)]">ENGINE PROTOCOL</span>
          <div className="my-2">
            <span className="font-mono-tabular text-sm font-semibold text-[#C5C0FF] block truncate">
              {session.ai_provider}
            </span>
            <span className="text-xs text-[var(--text-secondary)] block mt-1">{session.experience_level}</span>
          </div>
          <span className="label-caps text-[10px] text-[var(--text-secondary)]">PERSISTED IN SQLITE</span>
        </div>
      </div>

      {/* Seven-Dimension Performance Rubric (Radar + 7 Progress Bars) */}
      <div className="obsidian-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="label-caps text-[10px] text-[#42C6D9] block">FORENSIC EVALUATION MATRIX</span>
            <h2 className="text-lg font-semibold">Seven-Dimension Performance Rubric</h2>
          </div>
          <Badge variant="violet" size="xs">7-AXIS AVERAGES</Badge>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 h-72 obsidian-subpanel p-3">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={rubricAverages}>
                <PolarGrid stroke="#26344A" />
                <PolarAngleAxis dataKey="label" stroke="#9AA9BD" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#53637A" fontSize={9} />
                <Radar
                  name="Session Score"
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

          <div className="lg:col-span-7 space-y-3.5">
            {rubricAverages.map((dim, idx) => (
              <div key={dim.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[var(--text-primary)]">
                    {idx + 1}. {dim.label}
                  </span>
                  <span className="font-mono-tabular font-semibold text-[#36C995]">{dim.score}%</span>
                </div>
                <ProgressBar
                  value={dim.score}
                  variant={idx % 2 === 0 ? 'violet' : 'cyan'}
                  showPercent={false}
                  size="xs"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Verbal & Submission Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="obsidian-card p-4">
          <span className="label-caps text-[10px] text-[var(--text-secondary)] block">VERBAL OUTPUT</span>
          <span className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] block mt-1">
            {verbalStats.totalWords} words
          </span>
          <span className="text-[11px] text-[#36C995]">Submitted across session</span>
        </div>
        <div className="obsidian-card p-4">
          <span className="label-caps text-[10px] text-[var(--text-secondary)] block">FILLER WORD DENSITY</span>
          <span className="font-mono-tabular text-2xl font-semibold text-[#36C995] block mt-1">
            {verbalStats.fillerRatio}%
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">{verbalStats.totalFillers} filler word(s)</span>
        </div>
        <div className="obsidian-card p-4">
          <span className="label-caps text-[10px] text-[var(--text-secondary)] block">TECHNICAL SCORE</span>
          <span className="font-mono-tabular text-2xl font-semibold text-[#42C6D9] block mt-1">
            {session.technical_score}%
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">Domain & Practical Depth</span>
        </div>
        <div className="obsidian-card p-4">
          <span className="label-caps text-[10px] text-[var(--text-secondary)] block">CODE / ARCH SUBMISSIONS</span>
          <span className="font-mono-tabular text-2xl font-semibold text-[#C5C0FF] block mt-1">
            {verbalStats.codeSubmissions} snippet(s)
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">Persisted in SQLite</span>
        </div>
      </div>

      {/* Strengths & Critical Growth Vectors */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="obsidian-card p-5 space-y-3 border-l-2 border-l-[#36C995]">
          <h3 className="text-base font-semibold text-[#36C995] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Executive Strengths (Confirmed Signals)
          </h3>
          <div className="space-y-2.5">
            {(session.strengths || []).map((st, i) => (
              <div key={i} className="obsidian-subpanel p-3.5 text-xs text-[var(--text-primary)] leading-relaxed">
                ✓ {st}
              </div>
            ))}
          </div>
        </div>

        <div className="obsidian-card p-5 space-y-3 border-l-2 border-l-[#F1B65D]">
          <h3 className="text-base font-semibold text-[#F1B65D] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            Critical Growth Vectors (Targeted Remediation)
          </h3>
          <div className="space-y-2.5">
            {(session.weaknesses || []).map((wk, i) => (
              <div key={i} className="obsidian-subpanel p-3.5 text-xs text-[var(--text-primary)] leading-relaxed">
                ! {wk}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question-by-Question Transcript, Persisted STAR Telemetry & Code Snippets */}
      <div className="obsidian-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="label-caps text-[10px] text-[#42C6D9] block">GRANULAR FORENSIC BREAKDOWN</span>
            <h2 className="text-lg font-semibold">Question-by-Question Transcript & Evaluation</h2>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">
            {(session.questions || []).length} question(s) • Click any row to expand full transcript, STAR telemetry & code
          </span>
        </div>

        <div className="space-y-3">
          {(session.questions || []).map((q, idx) => {
            const isOpen = expandedQ === q.id;
            const ev = q.evaluation;
            const ans = q.answer;
            const star = ans?.star_telemetry || {};

            return (
              <div key={q.id} className="obsidian-subpanel overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedQ(isOpen ? -1 : q.id)}
                  className="w-full p-4 text-left flex flex-wrap items-center justify-between gap-3 hover:bg-[var(--bg-elevated)]/60 cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono-tabular text-xs font-bold text-[#42C6D9] flex items-center justify-center shrink-0">
                      0{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{q.topic}</span>
                        <Badge variant="cyan" size="xs">{q.category}</Badge>
                        {ans?.answer_mode && (
                          <Badge variant="gray" size="xs">MODE: {ans.answer_mode.toUpperCase()}</Badge>
                        )}
                        {q.is_follow_up && <Badge variant="violet" size="xs">FOLLOW-UP</Badge>}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{q.question_text}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {ev ? (
                      <span className="font-mono-tabular text-sm font-semibold text-[#36C995]">
                        {ev.overall_score} / 100
                      </span>
                    ) : (
                      <Badge variant="warning" size="xs">UNANSWERED</Badge>
                    )}
                    <span className="material-symbols-outlined text-[18px] text-[var(--text-secondary)]">
                      {isOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="p-4 pt-2 border-t border-[var(--border-subtle)] space-y-4 text-xs">
                    <div className="p-3 rounded-[6px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                      <span className="label-caps text-[10px] text-[#42C6D9] block mb-1">PROMPT</span>
                      <p className="text-sm text-[var(--text-primary)]">{q.question_text}</p>
                    </div>

                    {ans ? (
                      <>
                        <div className="p-3 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="label-caps text-[10px] text-[var(--text-secondary)]">
                              SUBMITTED CANDIDATE RESPONSE ({ans.answer_mode.toUpperCase()} • {ans.word_count} WORDS • {ans.time_taken_seconds}S)
                            </span>
                            {typeof star.star_completeness_score === 'number' && (
                              <div className="flex items-center gap-1.5">
                                <Badge variant={star.situation_detected ? 'emerald' : 'gray'} size="xs">S</Badge>
                                <Badge variant={star.task_detected ? 'emerald' : 'gray'} size="xs">T</Badge>
                                <Badge variant={star.action_detected ? 'emerald' : 'gray'} size="xs">A</Badge>
                                <Badge variant={star.result_metric_detected ? 'emerald' : 'gray'} size="xs">R</Badge>
                                <span className="font-mono-tabular text-[11px] text-[#36C995]">
                                  STAR: {star.star_completeness_score}%
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                            {ans.answer_text}
                          </p>
                        </div>

                        {ans.code_snippet && ans.code_snippet.trim() && (
                          <div className="p-3 rounded-[6px] bg-[#060A12] border border-[#42C6D9]/30 space-y-1.5">
                            <span className="label-caps text-[10px] text-[#42C6D9] block">
                              PERSISTED CODE / ARCHITECTURE SCRATCHPAD SUBMISSION
                            </span>
                            <pre className="text-xs font-mono-tabular text-[#42C6D9] overflow-x-auto whitespace-pre-wrap">
                              {ans.code_snippet}
                            </pre>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-[var(--text-secondary)] italic">No answer was submitted for this question.</p>
                    )}

                    {ev && (
                      <div className="space-y-3">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="p-3 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                            <span className="label-caps text-[10px] text-[#36C995] block mb-1">WHAT WENT WELL</span>
                            <ul className="space-y-1 text-[var(--text-secondary)]">
                              {(ev.what_went_well || []).map((w, i) => (
                                <li key={i}>• {w}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-3 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                            <span className="label-caps text-[10px] text-[#F1B65D] block mb-1">WHAT WAS MISSING</span>
                            <ul className="space-y-1 text-[var(--text-secondary)]">
                              {(ev.what_was_missing || []).map((m, i) => (
                                <li key={i}>• {m}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="p-3 rounded-[6px] bg-[#786BFF]/10 border border-[#786BFF]/30">
                          <span className="label-caps text-[10px] text-[#C5C0FF] block mb-1">
                            SUGGESTED IMPROVED ANSWER
                          </span>
                          <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                            {ev.suggested_improved_answer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Remediation Topics */}
      {(session.recommended_topics || []).length > 0 && (
        <div className="obsidian-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="label-caps text-[10px] text-[#42C6D9] block">TAILORED PREPARATION TRAJECTORY</span>
              <h2 className="text-lg font-semibold">Recommended Remediation Topics</h2>
            </div>
            <Badge variant="emerald" size="xs">NEXT DRILLS</Badge>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {(session.recommended_topics || []).slice(0, 3).map((topic, idx) => (
              <div key={idx} className="obsidian-subpanel p-4 flex flex-col justify-between space-y-3">
                <div>
                  <Badge variant="cyan" size="xs">DRILL 0{idx + 1}</Badge>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-2">{topic}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Targeted practice session focused on {topic} under {session.company_style || 'High-Growth SaaS'} expectations.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="xs"
                  materialIcon="play_circle"
                  onClick={() => navigate(`/interview/setup?role=${encodeURIComponent(session.job_role)}&topic=${encodeURIComponent(topic)}`)}
                >
                  Start Practice Drill
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
