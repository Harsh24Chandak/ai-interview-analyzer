import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

export default function Bookmarks() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [expandedAnswerId, setExpandedAnswerId] = useState(null);
  const [flashcardIdx, setFlashcardIdx] = useState(0);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const res = await interviewAPI.listBookmarks();
      setBookmarks(res.data?.bookmarks || []);
    } catch (err) {
      showToast('Failed to load saved questions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const categoriesCount = useMemo(() => {
    const map = { ALL: bookmarks.length };
    bookmarks.forEach((b) => {
      const cat = b.category || 'Technical';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      if (categoryFilter !== 'ALL' && b.category !== categoryFilter) return false;
      if (difficultyFilter !== 'ALL' && b.difficulty !== difficultyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText =
          (b.question_text || '').toLowerCase().includes(q) ||
          (b.topic || '').toLowerCase().includes(q) ||
          (b.job_role || '').toLowerCase().includes(q);
        if (!matchText) return false;
      }
      return true;
    });
  }, [bookmarks, categoryFilter, difficultyFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = bookmarks.length;
    const evaluated = bookmarks.filter((b) => typeof b.latest_score === 'number');
    const cleared = evaluated.filter((b) => b.latest_score >= 85).length;
    const flagged = evaluated.filter((b) => b.latest_score < 80).length;
    const avgScore = evaluated.length
      ? (evaluated.reduce((acc, b) => acc + b.latest_score, 0) / evaluated.length).toFixed(1)
      : '—';
    return { total, cleared, flagged, avgScore };
  }, [bookmarks]);

  const handleRemoveBookmark = async (qId) => {
    try {
      await interviewAPI.toggleBookmark(qId);
      showToast('Removed question from Saved Questions Bank.', 'info');
      await loadBookmarks();
    } catch (err) {
      showToast('Failed to remove bookmark.', 'error');
    }
  };

  const handleExportBank = () => {
    const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saved_questions_bank.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Saved Questions Bank (JSON)', 'info');
  };

  if (loading) return <LoadingSkeleton label="Loading Saved Questions & Drill Bank..." />;

  const activeFlashcard = bookmarks[flashcardIdx % Math.max(1, bookmarks.length)] || null;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={['WORKSPACE', 'REPOSITORY', 'SAVED QUESTIONS & DRILL BANK']}
        title="Saved Technical Questions & Adaptive Practice Drills"
        subtitle="Review bookmarked questions from your interview sessions, inspect exemplar reference answers, and launch targeted practice drills."
        actions={
          <>
            <span
              className="px-3 py-1.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] inline-flex items-center gap-1.5 cursor-not-allowed"
              title="Custom drill authoring is not enabled in this release"
            >
              <span className="material-symbols-outlined text-[15px]">add_box</span>
              Custom Drill (Coming Soon)
            </span>
            <Button variant="secondary" size="sm" materialIcon="ios_share" onClick={handleExportBank}>
              Export Bank (JSON)
            </Button>
            <Button
              variant="primary"
              size="sm"
              materialIcon="play_circle"
              onClick={() => navigate('/interview/setup')}
            >
              Start Practice Session ({bookmarks.length} Saved)
            </Button>
          </>
        }
      />

      {/* 4 Summary Cards Calculated from Actual Backend Bookmarks (Match Screen 15) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="obsidian-card p-4">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">TOTAL BOOKMARKED</span>
            <span className="material-symbols-outlined text-[#42C6D9] text-[18px]">collections_bookmark</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[var(--text-primary)]">{stats.total}</span>
            <span className="text-xs text-[var(--text-secondary)]">questions</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] block mt-1">
            Across {Object.keys(categoriesCount).length - 1} category type(s)
          </span>
        </div>

        <div className="obsidian-card p-4">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[#EF7280]">NEEDS REVIEW (&lt;80%)</span>
            <span className="material-symbols-outlined text-[#EF7280] text-[18px]">priority_high</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[var(--text-primary)]">{stats.flagged}</span>
            <span className="text-xs text-[#EF7280]">flagged</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] block mt-1">Remediation recommended</span>
        </div>

        <div className="obsidian-card p-4">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[#36C995]">CLEARED (≥85%)</span>
            <span className="material-symbols-outlined text-[#36C995] text-[18px]">verified</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[var(--text-primary)]">{stats.cleared}</span>
            <span className="text-xs text-[#36C995]">cleared</span>
          </div>
          <span className="text-xs text-[var(--text-secondary)] block mt-1">High telemetry score achieved</span>
        </div>

        <div className="obsidian-card p-4">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[#C5C0FF]">MEAN EVALUATED SCORE</span>
            <span className="material-symbols-outlined text-[#786BFF] text-[18px]">psychology</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[var(--text-primary)]">{stats.avgScore}</span>
            {stats.avgScore !== '—' && <span className="text-xs text-[var(--text-secondary)]">/ 100</span>}
          </div>
          <span className="text-xs text-[var(--text-secondary)] block mt-1">Actual saved question evaluations</span>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="obsidian-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined text-[16px] text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved questions by topic, prompt text, or target role..."
              className="w-full obsidian-input pl-9 pr-3.5 py-2 text-xs"
            />
          </div>
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps text-[10px] text-[var(--text-secondary)] mr-1">CATEGORIES:</span>
          {['ALL', 'Technical', 'Behavioral', 'HR', 'Situational', 'Resume-Based', 'Job-Description-Based'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-[4px] label-caps text-[10px] cursor-pointer transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#786BFF] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat} ({categoriesCount[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {filteredBookmarks.length === 0 ? (
        <EmptyState
          materialIcon="bookmark_border"
          title="No Saved Questions Found"
          description="Bookmark any question during a Live AI Mock Interview or from an Evaluation screen to build your personal study bank."
          actionLabel="Start AI Mock Interview"
          onAction={() => navigate('/interview/setup')}
        />
      ) : (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Saved Question Cards */}
          <div className="lg:col-span-8 space-y-4">
            {filteredBookmarks.map((bm) => {
              const showExemplar = expandedAnswerId === bm.id;
              return (
                <div key={bm.id} className="obsidian-card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="cyan" size="xs">{bm.category}</Badge>
                      <Badge variant="violet" size="xs">{bm.difficulty}</Badge>
                      <Badge variant="gray" size="xs">{bm.company_style || 'High-Growth SaaS'}</Badge>
                      <span className="text-xs text-[var(--text-secondary)]">
                        Role: <strong className="text-[var(--text-primary)]">{bm.job_role}</strong> (Session #{bm.session_id})
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveBookmark(bm.id)}
                      className="p-1.5 rounded-[4px] text-[#786BFF] hover:text-[#EF7280] hover:bg-[var(--bg-elevated)] cursor-pointer"
                      title="Remove Bookmark"
                    >
                      <span className="material-symbols-outlined text-[18px]">bookmark_remove</span>
                    </button>
                  </div>

                  <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-snug">
                    {bm.question_text}
                  </h2>

                  <div className="grid grid-cols-3 gap-3 obsidian-subpanel p-3 text-xs">
                    <div>
                      <span className="label-caps text-[9px] text-[var(--text-secondary)] block">HISTORICAL SCORE</span>
                      <span className="font-mono-tabular text-sm font-semibold text-[#36C995]">
                        {typeof bm.latest_score === 'number' ? `${bm.latest_score} / 100` : 'Not Evaluated Yet'}
                      </span>
                    </div>
                    <div>
                      <span className="label-caps text-[9px] text-[var(--text-secondary)] block">TOPIC DOMAIN</span>
                      <span className="font-medium text-[var(--text-primary)] truncate block">{bm.topic}</span>
                    </div>
                    <div>
                      <span className="label-caps text-[9px] text-[var(--text-secondary)] block">ORIGIN SESSION</span>
                      <Link to={`/results/${bm.session_id}`} className="text-[#42C6D9] hover:underline font-mono-tabular">
                        Session #{bm.session_id} ↗
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="label-caps text-[9px] text-[var(--text-secondary)]">FOCUS:</span>
                      {(bm.expected_key_points || []).map((kp, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-[4px] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-secondary)]"
                        >
                          {kp}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setExpandedAnswerId(showExemplar ? null : bm.id)}
                      >
                        {showExemplar ? 'Hide Exemplar Answer' : 'View Exemplar Answer'}
                      </Button>
                      <Button
                        variant="primary"
                        size="xs"
                        materialIcon="videocam"
                        onClick={() =>
                          navigate(
                            `/interview/setup?role=${encodeURIComponent(bm.job_role || '')}&mode=${encodeURIComponent(bm.category || 'Technical')}`
                          )
                        }
                      >
                        Practice Role Drill
                      </Button>
                    </div>
                  </div>

                  {showExemplar && (
                    <div className="p-4 rounded-[6px] bg-[#786BFF]/10 border border-[#786BFF]/30 text-xs text-[var(--text-primary)] leading-relaxed font-mono-tabular">
                      <strong className="label-caps text-[10px] text-[#C5C0FF] block mb-1">
                        EXEMPLAR REFERENCE ANSWER:
                      </strong>
                      {bm.sample_answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column (4 cols): Study Queue & Key Points Flashcard */}
          <div className="lg:col-span-4 space-y-5">
            <div className="obsidian-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Active Drill Queue</h2>
                <Badge variant="cyan" size="xs">{bookmarks.length} SAVED</Badge>
              </div>
              <div className="space-y-2.5">
                {bookmarks.slice(0, 3).map((q, idx) => (
                  <div key={q.id} className="obsidian-subpanel p-3 space-y-1">
                    <span className="label-caps text-[9px] text-[#786BFF] block">
                      QUEUED #{idx + 1} • {q.category}
                    </span>
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{q.topic}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">{q.question_text}</p>
                  </div>
                ))}
              </div>
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                materialIcon="arrow_forward"
                onClick={() => navigate('/interview/setup')}
              >
                Launch Next Practice Session
              </Button>
            </div>

            {activeFlashcard && (
              <div className="obsidian-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#42C6D9] text-[18px]">bolt</span>
                    <h2 className="text-sm font-semibold">Saved Question Flashcard</h2>
                  </div>
                  <span className="label-caps text-[10px] text-[var(--text-secondary)]">
                    CARD {(flashcardIdx % bookmarks.length) + 1} OF {bookmarks.length}
                  </span>
                </div>

                <div className="obsidian-subpanel p-4 space-y-2">
                  <span className="label-caps text-[10px] text-[#42C6D9] block">{activeFlashcard.topic}</span>
                  <p className="text-xs font-medium text-[var(--text-primary)] leading-relaxed">
                    {activeFlashcard.question_text}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
                    <strong className="text-[#36C995]">Key Takeaway:</strong> {activeFlashcard.sample_answer}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => setFlashcardIdx((i) => (i - 1 + bookmarks.length) % bookmarks.length)}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => setFlashcardIdx((i) => (i + 1) % bookmarks.length)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
