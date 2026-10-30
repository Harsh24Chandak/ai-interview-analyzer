import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import ScoreRing from '../components/common/ScoreRing';
import InterviewQuestion from '../components/common/InterviewQuestion';
import EvaluationDimension from '../components/common/EvaluationDimension';
import STARIndicator from '../components/common/STARIndicator';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';

const FILLER_REGEX = /\b(um|uh|like|you know|basically|actually|literally|sort of|kind of|i mean)\b/gi;

export default function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  // subView: 'workspace' (Screen 10) or 'evaluation' (Screen 11)
  const [subView, setSubView] = useState('workspace');
  // activeEditorTab: 'written' or 'code'
  const [activeEditorTab, setActiveEditorTab] = useState('written');

  const [answerText, setAnswerText] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [inputModeUsed, setInputModeUsed] = useState('text'); // 'text' or 'voice'
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [generateFollowUp, setGenerateFollowUp] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const recognitionRef = useRef(null);

  const loadSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await interviewAPI.getInterviewDetails(id);
      const sess = res.data;
      setSession(sess);
      const firstQ = sess.questions?.[0];
      if (firstQ?.answer) {
        setAnswerText(firstQ.answer.answer_text || '');
        setCodeSnippet(firstQ.answer.code_snippet || '');
        setInputModeUsed(firstQ.answer.answer_mode || 'text');
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load interview session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
    try {
      const prefs = JSON.parse(localStorage.getItem('interview_prefs') || '{}');
      if (typeof prefs.dynamicProbing === 'boolean') setGenerateFollowUp(prefs.dynamicProbing);
    } catch (e) {}
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [id]);

  useEffect(() => {
    if (paused || loading || !session) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
      setQuestionSeconds((q) => q + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [paused, loading, session]);

  const questions = session?.questions || [];
  const currentQ = questions[currentIdx] || null;

  // Sync editor state when switching questions
  const selectQuestionIndex = (idx) => {
    if (idx < 0 || idx >= questions.length) return;
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
    const targetQ = questions[idx];
    setCurrentIdx(idx);
    setAnswerText(targetQ?.answer?.answer_text || '');
    setCodeSnippet(targetQ?.answer?.code_snippet || '');
    setInputModeUsed(targetQ?.answer?.answer_mode || 'text');
    setQuestionSeconds(targetQ?.answer?.time_taken_seconds || 0);
    setSubView(targetQ?.evaluation ? 'evaluation' : 'workspace');
  };

  // Text-derived heuristic STAR & Communication telemetry
  const liveTelemetry = useMemo(() => {
    const lower = (answerText || '').toLowerCase();
    const words = (answerText || '').trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const fillerMatches = answerText.match(FILLER_REGEX) || [];
    const fillers = fillerMatches.length;
    const minutes = Math.max(0.25, questionSeconds / 60);
    const wpm = wordCount > 0 ? Math.round(wordCount / minutes) : 0;

    const hasS = /in my|during|when i|project|intern|production|context|system|scenario/i.test(lower) || wordCount >= 12;
    const hasT = /needed|goal|challenge|problem|bottleneck|architecture|design|requirement|handle/i.test(lower) || wordCount >= 20;
    const hasA = /implemented|built|designed|optimized|indexed|configured|used|async|query|partition/i.test(lower) || codeSnippet.trim().length > 10;
    const hasR = /\b\d+%|\b\d+x|\b\d+ms|\bp95\b|\bp99\b|reduced|improved|faster|scalable|prevented/i.test(lower);

    const starPct = (hasS ? 25 : 0) + (hasT ? 25 : 0) + (hasA ? 25 : 0) + (hasR ? 25 : 0);
    return {
      wordCount,
      fillers,
      firstFiller: fillerMatches[0] || '',
      wpm,
      hasS,
      hasT,
      hasA,
      hasR,
      starPct,
    };
  }, [answerText, codeSnippet, questionSeconds]);

  const handleSpeakQuestion = () => {
    if (!currentQ) return;
    if (!('speechSynthesis' in window)) {
      showToast('Browser Text-to-Speech is not supported in this browser.', 'error');
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(currentQ.question_text);
    utter.rate = 1.0;
    window.speechSynthesis.speak(utter);
    showToast('Reading prompt aloud via Browser Speech Synthesis', 'info');
  };

  const handleToggleVoiceDictation = () => {
    setSpeechError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError(
        'Browser SpeechRecognition API is not supported in this browser. Please type your response directly in the editor below.'
      );
      showToast('SpeechRecognition unsupported in this browser; please use text input.', 'error');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onresult = (event) => {
        const transcript = Array.from(event.results)
          .slice(event.resultIndex)
          .map((r) => r[0].transcript)
          .join(' ');
        setAnswerText((prev) => (prev ? `${prev.trim()} ${transcript.trim()}` : transcript.trim()));
        setInputModeUsed('voice');
      };
      rec.onerror = (ev) => {
        setIsListening(false);
        setSpeechError(`Microphone/Speech error (${ev.error || 'permission denied'}). You can continue typing your answer.`);
      };
      rec.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
      setInputModeUsed('voice');
      showToast('Voice dictation active — speak clearly into your microphone.', 'info');
    } catch (err) {
      setIsListening(false);
      setSpeechError('Could not initialize microphone dictation. Please type your response.');
    }
  };

  const handleToggleBookmark = async () => {
    if (!currentQ) return;
    try {
      const res = await interviewAPI.toggleBookmark(currentQ.id);
      setSession((prev) => ({
        ...prev,
        questions: prev.questions.map((q) =>
          q.id === currentQ.id ? { ...q, is_bookmarked: res.data.is_bookmarked } : q
        ),
      }));
      showToast(res.data.is_bookmarked ? 'Question saved to Bank!' : 'Removed from Saved Questions.', 'info');
    } catch (err) {
      showToast('Could not update bookmark.', 'error');
    }
  };

  const handleSaveDraftLocal = () => {
    if (!currentQ) return;
    try {
      localStorage.setItem(
        `draft_${session.id}_${currentQ.id}`,
        JSON.stringify({ answerText, codeSnippet, inputModeUsed })
      );
      showToast('Draft saved locally in browser storage.', 'info');
    } catch (e) {}
  };

  const handleSubmitAnswer = async () => {
    if (!currentQ) return;
    if (!answerText.trim()) {
      showToast('Please enter or dictate your answer before submitting for evaluation.', 'error');
      return;
    }
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }

    setSubmitting(true);
    try {
      const res = await interviewAPI.submitAnswer(session.id, {
        question_id: currentQ.id,
        answer_text: answerText.trim(),
        code_snippet: codeSnippet.trim(),
        answer_mode: inputModeUsed,
        time_taken_seconds: Math.max(10, questionSeconds),
        generate_follow_up: generateFollowUp,
      });
      setSession(res.data.session);
      setSubView('evaluation');
      showToast(`Evaluation complete! Score: ${res.data.evaluation.overall_score}/100`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to evaluate answer.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteInterview = async () => {
    setCompleting(true);
    try {
      await interviewAPI.completeInterview(session.id, {
        duration_seconds: Math.max(60, elapsedSeconds),
      });
      showToast('Interview session finalized! Opening Performance Report.', 'success');
      navigate(`/results/${session.id}`);
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to finalize session.', 'error');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <LoadingSkeleton label="Initializing Live AI Interview Workspace..." />;
  if (error || !session) return <ErrorState title="Session Error" message={error || 'Session not found'} onRetry={loadSession} />;

  const evalData = currentQ?.evaluation || null;
  const formatTime = (secs) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  // ==========================================================================
  // SCREEN 11 — INDIVIDUAL ANSWER EVALUATION STATE
  // ==========================================================================
  if (subView === 'evaluation' && evalData) {
    const followUpQ = questions.find((q) => q.parent_question_id === currentQ.id);

    return (
      <div className="space-y-6">
        {/* Top Evaluation Sub-Header */}
        <div className="obsidian-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="emerald">• EVALUATION COMPLETE • Q {String(currentIdx + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}</Badge>
            <span className="font-mono-tabular text-xs text-[var(--text-secondary)]">
              ⏱ {formatTime(currentQ?.answer?.time_taken_seconds || questionSeconds)}
            </span>
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">
              RUBRIC: {session.company_style || 'High-Growth SaaS'} ({session.difficulty})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              materialIcon={currentQ.is_bookmarked ? 'bookmark_added' : 'bookmark_add'}
              onClick={handleToggleBookmark}
            >
              {currentQ.is_bookmarked ? 'Saved' : 'Save Question'}
            </Button>
            <Button
              variant="secondary"
              size="xs"
              materialIcon="replay"
              onClick={() => setSubView('workspace')}
            >
              Retake / Edit Answer
            </Button>
            {currentIdx < questions.length - 1 ? (
              <Button
                variant="primary"
                size="xs"
                materialIcon="arrow_forward"
                onClick={() => selectQuestionIndex(currentIdx + 1)}
              >
                Next: Q{String(currentIdx + 2).padStart(2, '0')} ({questions[currentIdx + 1]?.topic?.slice(0, 18)})
              </Button>
            ) : (
              <Button
                variant="primary"
                size="xs"
                isLoading={completing}
                materialIcon="flag"
                onClick={handleCompleteInterview}
              >
                Finalize & View Full Report →
              </Button>
            )}
          </div>
        </div>

        {/* Score Ring & Examiner Verdict Card */}
        <div className="obsidian-card p-6 grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-3 flex flex-col items-center text-center border-b md:border-b-0 md:border-r border-[var(--border-subtle)] pb-4 md:pb-0 md:pr-4">
            <ScoreRing
              score={evalData.overall_score}
              size={116}
              strokeWidth={8}
              sublabel="/ 100 PTS"
              variant="emerald"
            />
            <Badge variant={evalData.overall_score >= 80 ? 'emerald' : 'cyan'} size="xs" className="mt-3">
              {evalData.overall_score >= 85 ? 'STRONGCALIBRATED SIGNAL' : 'SOLID TECHNICAL RESPONSE'}
            </Badge>
            <span className="text-[11px] text-[var(--text-secondary)] mt-1">
              Input Mode: {(currentQ?.answer?.answer_mode || inputModeUsed).toUpperCase()}
            </span>
          </div>

          <div className="md:col-span-9 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#786BFF]/20 border border-[#786BFF]/40 flex items-center justify-center font-mono-tabular text-xs font-bold text-[#C5C0FF]">
                  AI
                </div>
                <div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    AI Technical Examiner{' '}
                  </span>
                  <Badge variant="cyan" size="xs">{session.company_style || 'CALIBRATED RUBRIC'}</Badge>
                  <span className="text-xs text-[var(--text-secondary)] block">{currentQ.topic}</span>
                </div>
              </div>
              <Badge variant="emerald" size="xs">PROVIDER: {evalData.ai_provider}</Badge>
            </div>

            <blockquote className="p-3.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs sm:text-sm italic text-[var(--text-primary)] leading-relaxed">
              "{evalData.what_went_well?.[0] || 'Structured response addressing core requirements.'}{' '}
              {evalData.what_was_missing?.[0] || ''}"
            </blockquote>

            <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--text-secondary)] font-mono-tabular">
              <span>
                ✓ Response Time: <strong className="text-[var(--text-primary)]">{formatTime(currentQ?.answer?.time_taken_seconds || questionSeconds)}</strong>
              </span>
              <span>
                🎙 Est. Cadence: <strong className="text-[var(--text-primary)]">{liveTelemetry.wpm} WPM</strong>
              </span>
              <span>
                ◎ STAR Heuristic: <strong className="text-[#36C995]">{liveTelemetry.starPct}%</strong>
              </span>
              <span>
                ⌨ Words: <strong className="text-[var(--text-primary)]">{currentQ?.answer?.word_count || liveTelemetry.wordCount}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Seven-Dimension Forensic Competency Profile (Match Screen 11) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="label-caps text-[10px] text-[#42C6D9] block">TELEMETRY MATRIX</span>
              <h2 className="text-lg font-semibold">Seven-Dimension Forensic Competency Profile</h2>
            </div>
            <div className="flex items-center gap-4 label-caps text-[10px] text-[var(--text-secondary)]">
              <span className="text-[#36C995]">● ≥ 85% STRONG</span>
              <span className="text-[#42C6D9]">● 70–84% SOLID</span>
              <span className="text-[#F1B65D]">● &lt; 70% REMEDIATE</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <EvaluationDimension
              indexNumber="01"
              codeLabel="ALIGNMENT"
              title="Relevance"
              score={evalData.relevance_score}
              statusTag={evalData.relevance_score >= 85 ? 'EXACT HIT' : 'ALIGNED'}
              description="Measures how directly the response addresses the core prompt constraints and role context."
              footerNote="Prompt Alignment"
            />
            <EvaluationDimension
              indexNumber="02"
              codeLabel="RIGOR"
              title="Technical Accuracy"
              score={evalData.technical_accuracy_score}
              statusTag={evalData.technical_accuracy_score >= 85 ? 'DEEP MASTERY' : 'VALIDATED'}
              description="Evaluates correctness of architectural mechanisms, data structures, and domain terminology."
              footerNote="Technical Soundness"
            />
            <EvaluationDimension
              indexNumber="03"
              codeLabel="BREADTH"
              title="Completeness"
              score={evalData.completeness_score}
              statusTag={evalData.completeness_score >= 85 ? 'HIGH COVERAGE' : 'PARTIAL'}
              description="Checks coverage across expected rubric key points, edge cases, and failure recovery."
              footerNote={`${(currentQ.expected_key_points || []).length} Rubric Key Points`}
            />
            <EvaluationDimension
              indexNumber="04"
              codeLabel="FRAMEWORK"
              title="Clarity & Structure"
              score={evalData.clarity_score}
              statusTag="COHESIVE"
              description="Assesses logical progression from problem framing to implementation and outcome."
              footerNote="Cognitive Flow"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3.5">
            <EvaluationDimension
              indexNumber="05"
              codeLabel="DELIVERY"
              title="Communication"
              score={evalData.communication_score}
              statusTag={`${liveTelemetry.wpm} WPM`}
              description={`Filler count: ${currentQ?.answer?.filler_word_count ?? liveTelemetry.fillers}. Evaluates conciseness and precision.`}
              footerNote={`Fillers: ${currentQ?.answer?.filler_word_count ?? liveTelemetry.fillers}`}
            />
            <EvaluationDimension
              indexNumber="06"
              codeLabel="JUDGMENT"
              title="Problem-Solving Approach"
              score={evalData.problem_solving_score}
              statusTag="BALANCED"
              description="Evaluates architectural trade-off analysis, bottleneck diagnosis, and pragmatic decision-making."
              footerNote="Trade-off Analysis"
            />
            <EvaluationDimension
              indexNumber="07"
              codeLabel="IN-THE-TRENCHES"
              title="Practical Understanding"
              score={evalData.practical_understanding_score}
              statusTag="PRODUCTION"
              description="Measures real-world implementation awareness, operational metrics, and production observability."
              footerNote="Real-World Context"
            />
          </div>
        </div>

        {/* Two-Column Strengths vs. Vulnerabilities & Missing Concepts */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="obsidian-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#36C995]">● What Went Well (Confirmed Signals)</h3>
              <span className="label-caps text-[10px] text-[#36C995]">
                {(evalData.what_went_well || []).length} OBSERVATIONS
              </span>
            </div>
            <div className="space-y-2.5">
              {(evalData.what_went_well || []).map((item, idx) => (
                <div key={idx} className="obsidian-subpanel p-3.5 text-xs text-[var(--text-primary)] leading-relaxed">
                  ✓ {item}
                </div>
              ))}
            </div>
          </div>

          <div className="obsidian-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F1B65D]">● What Was Missing & Coaching Notes</h3>
              <span className="label-caps text-[10px] text-[#F1B65D]">
                {(evalData.what_was_missing || []).length} IMPROVEMENT AREAS
              </span>
            </div>
            <div className="space-y-2.5">
              {(evalData.what_was_missing || []).map((item, idx) => (
                <div key={idx} className="obsidian-subpanel p-3.5 text-xs text-[var(--text-primary)] leading-relaxed border-[#F1B65D]/30">
                  ⚠ {item}
                </div>
              ))}
              {(evalData.incorrect_statements || []).map((inc, idx) => (
                <div key={idx} className="obsidian-subpanel p-3.5 text-xs text-[#EF7280] leading-relaxed border-[#EF7280]/30">
                  ✕ {inc}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI-Rewritten Exemplar Answer */}
        <div className="obsidian-card p-6 space-y-3 border-[#786BFF]/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#786BFF] text-[18px]">auto_fix_high</span>
                AI-Suggested Improved Answer (Exemplar Target)
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Reference answer incorporating all expected key points and {session.company_style} rubric priorities.
              </p>
            </div>
            <Button
              variant="secondary"
              size="xs"
              materialIcon="content_copy"
              onClick={() => {
                navigator.clipboard?.writeText(evalData.suggested_improved_answer || '');
                showToast('Copied exemplar answer to clipboard!', 'info');
              }}
            >
              Copy Exemplar Text
            </Button>
          </div>
          <div className="obsidian-subpanel p-4 text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-mono-tabular">
            {evalData.suggested_improved_answer}
          </div>
          {evalData.concepts_to_study?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="label-caps text-[10px] text-[var(--text-secondary)]">CONCEPTS TO STUDY:</span>
              {evalData.concepts_to_study.map((c, i) => (
                <Badge key={i} variant="cyan" size="xs">{c}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* AI Follow-Up Challenge Card */}
        {(evalData.follow_up_question || followUpQ) && (
          <div className="obsidian-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-[#42C6D9]/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#42C6D9] text-[18px]">psychology_alt</span>
                <span className="text-sm font-semibold">AI Follow-Up Challenge (Adaptive Probe)</span>
                <Badge variant="cyan" size="xs">COUNTER-PROBE</Badge>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-primary)] italic">
                "{followUpQ?.question_text || evalData.follow_up_question}"
              </p>
            </div>
            {followUpQ && (
              <Button
                variant="secondary"
                size="sm"
                materialIcon="play_circle"
                onClick={() => {
                  const fuIdx = questions.findIndex((q) => q.id === followUpQ.id);
                  if (fuIdx !== -1) selectQuestionIndex(fuIdx);
                }}
              >
                Answer Follow-Up Probe →
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // SCREEN 10 — LIVE AI INTERVIEW WORKSPACE (Main Stage + 380px Right Inspector)
  // ==========================================================================
  return (
    <div className="space-y-5">
      {/* Top Session Control Strip (Match Screen 10) */}
      <div className="obsidian-card p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="cyan">• LIVE SESSION #{String(session.id).padStart(3, '0')}</Badge>
          <span className="label-caps text-xs text-[var(--text-primary)]">
            Q {String(currentIdx + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}
          </span>
          <span className="text-[var(--text-muted)]">•</span>
          <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-xs">
            {currentQ?.topic || session.interview_type}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1 rounded-[4px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] font-mono-tabular text-xs flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#786BFF]">timer</span>
            <span>{formatTime(elapsedSeconds)}</span>
            <span className="text-[var(--text-muted)]">/ {session.question_count * 7}:00</span>
          </div>

          <Badge variant="gray" size="sm">
            Target: {session.company_style || 'High-Growth SaaS'} ({session.difficulty})
          </Badge>

          <Button
            type="button"
            variant="secondary"
            size="xs"
            materialIcon={paused ? 'play_arrow' : 'pause'}
            onClick={() => setPaused(!paused)}
          >
            {paused ? 'Resume' : 'Pause'}
          </Button>

          <Button
            type="button"
            variant="danger"
            size="xs"
            isLoading={completing}
            materialIcon="stop_circle"
            onClick={handleCompleteInterview}
          >
            End & Report
          </Button>
        </div>
      </div>

      {/* Question Navigation Stepper Bar */}
      <div className="flex items-center gap-1.5">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            type="button"
            onClick={() => selectQuestionIndex(idx)}
            className={`h-2 flex-1 rounded-[4px] transition-all cursor-pointer ${
              idx === currentIdx
                ? 'bg-[#786BFF]'
                : q.evaluation
                ? 'bg-[#36C995]'
                : 'bg-[var(--bg-elevated)] hover:bg-[#26344A]'
            }`}
            title={`Question ${idx + 1}: ${q.topic}`}
          />
        ))}
      </div>

      {/* Split Workspace: Central Stage + 380px Right Telemetry Inspector */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* Central Stage */}
        <div className="flex-1 min-w-0 w-full space-y-5">
          <InterviewQuestion
            question={currentQ}
            questionIndex={currentIdx}
            totalQuestions={questions.length}
            onSpeak={handleSpeakQuestion}
            onToggleBookmark={handleToggleBookmark}
          />

          {/* Answer & Technical Scratchpad Card */}
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex p-1 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('written')}
                  className={`px-3 py-1.5 rounded-[4px] text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                    activeEditorTab === 'written'
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] text-[#786BFF]">edit_note</span>
                  Written / Spoken Response
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('code')}
                  className={`px-3 py-1.5 rounded-[4px] text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                    activeEditorTab === 'code'
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] text-[#42C6D9]">code</span>
                  Technical Code / Architecture Scratchpad (Notes Only)
                </button>
              </div>

              <div className="flex items-center gap-2">
                {currentQ?.evaluation && (
                  <Button variant="emerald" size="xs" onClick={() => setSubView('evaluation')}>
                    View Evaluation ({currentQ.evaluation.overall_score}/100)
                  </Button>
                )}
                <span className="label-caps text-[10px] text-[#36C995]">
                  • MODE: {inputModeUsed.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Voice Dictation Bar */}
            <div className="obsidian-subpanel p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant={isListening ? 'danger' : 'cyan'}
                  size="xs"
                  materialIcon={isListening ? 'mic_off' : 'mic'}
                  onClick={handleToggleVoiceDictation}
                >
                  {isListening ? 'Voice Dictation Active (Stop)' : 'Start Browser Voice Dictation'}
                </Button>
                <span className="text-xs text-[var(--text-secondary)]">
                  {isListening
                    ? 'Listening via browser SpeechRecognition API...'
                    : 'Uses browser Web Speech API where supported, with full text fallback.'}
                </span>
              </div>
              <span className="font-mono-tabular text-xs text-[#36C995]">
                {liveTelemetry.wordCount} words transcribed
              </span>
            </div>

            {speechError && (
              <div className="p-2.5 rounded-[6px] border border-[#F1B65D]/40 bg-[#F1B65D]/10 text-xs text-[#F1B65D]">
                {speechError}
              </div>
            )}

            {activeEditorTab === 'written' ? (
              <textarea
                rows={10}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your structured technical or behavioral response here (Situation, Task, Action, and Quantified Result)..."
                className="w-full obsidian-input p-4 text-sm leading-relaxed"
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>
                    Enter pseudocode, SQL queries, API schemas, or architecture notes to be included in AI evaluation (non-executing scratchpad):
                  </span>
                  <span className="label-caps text-[10px] text-[#42C6D9]">SCRATCHPAD NOTES</span>
                </div>
                <textarea
                  rows={10}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="// Write pseudocode, SQL schema, or system architecture notes here...\n// Saved with your answer and included in AI rubric evaluation."
                  className="w-full obsidian-input p-4 text-xs sm:text-sm font-mono-tabular leading-relaxed text-[#42C6D9]"
                />
              </div>
            )}

            {/* Editor Footer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-mono-tabular">
                <span>{liveTelemetry.wordCount} words</span>
                <span>•</span>
                <span>~{Math.max(1, Math.ceil(liveTelemetry.wordCount / 130))} min read</span>
                {codeSnippet.trim() && (
                  <>
                    <span>•</span>
                    <span className="text-[#42C6D9]">{codeSnippet.trim().split('\n').length} code lines attached</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAnswerText('');
                    setCodeSnippet('');
                    setInputModeUsed('text');
                  }}
                >
                  Clear
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={handleSaveDraftLocal}>
                  Save Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={submitting}
                  materialIcon="arrow_forward"
                  onClick={handleSubmitAnswer}
                >
                  Submit Answer for AI Evaluation
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right-Side 380px Telemetry Inspector (Match Screen 10) */}
        <div className="w-full xl:w-[380px] shrink-0 space-y-4">
          {/* Evaluator Persona Card */}
          <div className="obsidian-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[6px] bg-[#786BFF]/20 border border-[#786BFF]/40 flex items-center justify-center font-mono-tabular text-xs font-bold text-[#C5C0FF]">
                  AI
                </div>
                <div>
                  <h3 className="text-sm font-semibold">AI Principal Examiner</h3>
                  <span className="label-caps text-[9px] text-[#42C6D9] block">
                    {session.company_style || 'High-Growth SaaS'} Rubric
                  </span>
                </div>
              </div>
              <Badge variant="gray" size="xs">EVALUATOR</Badge>
            </div>

            <div className="obsidian-subpanel p-3 space-y-1.5">
              <span className="label-caps text-[9px] text-[#42C6D9] flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">psychology</span>
                ACTIVE EXAMINER PROBE
              </span>
              <p className="text-xs italic text-[var(--text-primary)] leading-relaxed">
                "I am evaluating your explanation for concrete mechanism clarity, architectural trade-offs, and quantified impact aligned with {session.company_style || 'our engineering'} standards."
              </p>
            </div>
          </div>

          {/* Heuristic STAR Telemetry Breakdown */}
          <STARIndicator telemetry={liveTelemetry} />

          {/* Text-Derived Communication Signals */}
          <div className="obsidian-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Communication Signals</h3>
              <span className="label-caps text-[9px] text-[var(--text-secondary)]">TEXT-DERIVED TELEMETRY</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="obsidian-subpanel p-3">
                <span className="label-caps text-[9px] text-[var(--text-secondary)] block">ESTIMATED CADENCE</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono-tabular text-xl font-semibold text-[var(--text-primary)]">
                    {liveTelemetry.wpm}
                  </span>
                  <span className="label-caps text-[9px] text-[var(--text-secondary)]">WPM</span>
                </div>
                <span className="label-caps text-[9px] text-[#36C995] block mt-1">
                  {liveTelemetry.wpm >= 90 && liveTelemetry.wpm <= 165 ? 'Optimal Pace' : 'Text-Derived Est.'}
                </span>
              </div>

              <div className="obsidian-subpanel p-3">
                <span className="label-caps text-[9px] text-[var(--text-secondary)] block">FILLER WORDS</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono-tabular text-xl font-semibold text-[#36C995]">
                    {liveTelemetry.fillers}
                  </span>
                  <span className="label-caps text-[9px] text-[var(--text-secondary)]">total</span>
                </div>
                <span className="label-caps text-[9px] text-[var(--text-secondary)] block mt-1 truncate">
                  {liveTelemetry.firstFiller ? `'${liveTelemetry.firstFiller}' detected` : 'Zero fillers detected'}
                </span>
              </div>
            </div>

            <label className="obsidian-subpanel p-3 flex items-center justify-between gap-2 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)] block">Adaptive Follow-Up Probes</span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  Append a follow-up question after evaluation
                </span>
              </div>
              <input
                type="checkbox"
                checked={generateFollowUp}
                onChange={(e) => setGenerateFollowUp(e.target.checked)}
                className="w-4 h-4 accent-[#786BFF]"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
