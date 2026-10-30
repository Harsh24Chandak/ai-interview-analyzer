import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Volume2, Bookmark, Send, Sparkles, Code2, Clock, CheckCircle2 } from 'lucide-react';
import { interviewAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';

const FILLER_REGEX = /\b(um|uh|like|you know|basically|actually|literally|sort of|kind of)\b/gi;

export default function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [session, setSession] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodePad, setShowCodePad] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [generateFollowUp, setGenerateFollowUp] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recognitionRef = useRef(null);

  useEffect(() => {
    interviewAPI
      .getInterviewDetails(id)
      .then((res) => setSession(res.data))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [currentIdx]);

  // Live Real-Time STAR & Vocal Telemetry Computation
  const liveTelemetry = useMemo(() => {
    const lower = (answerText || '').toLowerCase();
    const words = (answerText || '').trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const fillers = (answerText.match(FILLER_REGEX) || []).length;
    const wpm = wordCount > 0 ? Math.round(wordCount / Math.max(0.3, elapsed / 60)) : 0;

    const hasS = /in my|during|when i|project|intern|production|context|system/i.test(lower) || wordCount >= 12;
    const hasT = /needed|goal|challenge|problem|bottleneck|architecture|design|requirement/i.test(lower) || wordCount >= 22;
    const hasA = /implemented|built|designed|optimized|indexed|configured|used|async|query/i.test(lower) || codeSnippet.trim().length > 10;
    const hasR = /\b\d+%|\b\d+x|\b\d+ms|\bp95\b|reduced|improved|faster|scalable/i.test(lower);

    const starPct = (hasS ? 25 : 0) + (hasT ? 25 : 0) + (hasA ? 25 : 0) + (hasR ? 25 : 0);
    return { wordCount, fillers, wpm, hasS, hasT, hasA, hasR, starPct };
  }, [answerText, codeSnippet, elapsed]);

  if (!session) return <Loading label="Loading AI Mock Interview Studio..." />;

  const questions = session.questions || [];
  const currentQ = questions[currentIdx];

  const speakQuestion = () => {
    if ('speechSynthesis' in window && currentQ) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(currentQ.question_text);
      window.speechSynthesis.speak(utter);
    }
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAnswerText(currentQ?.sample_answer || '');
      showToast('Populated reference voice transcript (Browser Speech fallback).', 'info');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ');
      setAnswerText((prev) => (prev ? prev + ' ' + transcript : transcript));
    };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) {
      showToast('Please enter an answer or click "Insert Reference Answer" first.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await interviewAPI.submitAnswer(session.id, {
        question_id: currentQ.id,
        answer_text: answerText,
        code_snippet: codeSnippet,
        answer_mode: isListening ? 'voice' : 'text',
        time_taken_seconds: elapsed,
        generate_follow_up: generateFollowUp,
      });
      setSession(res.data.session);
      showToast(`Evaluated! Score: ${res.data.evaluation.overall_score}/100`, 'success');
    } catch (err) {
      showToast('Evaluation error.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishSession = async () => {
    await interviewAPI.completeInterview(session.id, { duration_seconds: elapsed });
    navigate(`/results/${session.id}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="primary" size="md">
              Question {currentIdx + 1} of {questions.length}
            </Badge>
            <Badge variant="info" size="md">{currentQ?.category}</Badge>
            <Badge variant="gray" size="md">{currentQ?.topic}</Badge>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-indigo-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </span>
            <button
              onClick={speakQuestion}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
              title="Read Question Aloud"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                await interviewAPI.toggleBookmark(currentQ.id);
                showToast('Question bookmark toggled!', 'info');
              }}
              className="p-2.5 rounded-xl bg-slate-800 text-amber-400 cursor-pointer"
              title="Bookmark Question"
            >
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug mb-5">
          {currentQ?.question_text}
        </h2>

        {/* UNIQUE FEATURE: Live Real-Time STAR & Vocal Telemetry Bar */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/30 mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 mr-1">
              Live STAR Detector ({liveTelemetry.starPct}%):
            </span>
            {[
              { label: 'S • Situation', ok: liveTelemetry.hasS },
              { label: 'T • Task', ok: liveTelemetry.hasT },
              { label: 'A • Action / Code', ok: liveTelemetry.hasA },
              { label: 'R • Result (Metric)', ok: liveTelemetry.hasR },
            ].map((item, idx) => (
              <span
                key={idx}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  item.ok
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                {item.ok ? '✓ ' : '○ '}
                {item.label}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
            <span>Words: <strong className="text-white">{liveTelemetry.wordCount}</strong></span>
            <span>Pace: <strong className="text-indigo-400">{liveTelemetry.wpm} WPM</strong></span>
            <span>
              Fillers:{' '}
              <strong className={liveTelemetry.fillers > 2 ? 'text-rose-400' : 'text-emerald-400'}>
                {liveTelemetry.fillers}
              </strong>
            </span>
          </div>
        </div>

        {/* Side-by-Side Answer + Live Code / System Design Scratchpad */}
        <div className={`grid gap-4 mb-5 ${showCodePad ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-300">Spoken / Written Explanation</label>
              <button
                type="button"
                onClick={() => setAnswerText(currentQ?.sample_answer || '')}
                className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer"
              >
                + Insert Strong Reference Answer
              </button>
            </div>
            <textarea
              rows={7}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Explain your architectural approach, trade-offs, and concrete metrics (e.g., 'Reduced P95 latency by 38%')..."
              className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-base text-white leading-relaxed"
            />
          </div>

          {showCodePad && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" /> Live Code & System Design Scratchpad
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCodeSnippet(
                      '# FastAPI Async Endpoint + Redis Cache-Aside\n@router.get("/analytics")\nasync def get_metrics(user_id: int):\n    cached = await redis.get(f"metrics:{user_id}")\n    if cached:\n        return json.loads(cached)\n    # Composite Index: (user_id, created_at)\n    return await db.fetch_all(QUERY, user_id)'
                    )
                  }
                  className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                >
                  + Insert Sample Code
                </button>
              </div>
              <textarea
                rows={7}
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="// Optional: Write Python, JS, SQL query, or System Design schema here to be evaluated alongside your answer..."
                className="w-full p-4 rounded-2xl bg-[#050811] border border-emerald-500/30 text-sm font-mono text-emerald-200 leading-relaxed"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant={isListening ? 'danger' : 'secondary'} onClick={toggleVoiceInput}>
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isListening ? 'Stop Recording' : 'Voice Dictation'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCodePad(!showCodePad)}
              icon={Code2}
            >
              {showCodePad ? 'Hide Code Pad' : 'Open Code Pad'}
            </Button>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={generateFollowUp}
                onChange={(e) => setGenerateFollowUp(e.target.checked)}
              />
              Auto-generate AI Follow-Up Question
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSubmitAnswer} isLoading={submitting} size="lg">
              <Send className="w-4 h-4" /> Submit & Evaluate Answer
            </Button>
            {currentIdx < questions.length - 1 ? (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setCurrentIdx(currentIdx + 1);
                  setAnswerText(questions[currentIdx + 1]?.answer?.answer_text || '');
                  setCodeSnippet('');
                  setElapsed(0);
                }}
              >
                Next Question →
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={handleFinishSession}>
                Complete & View Report
              </Button>
            )}
          </div>
        </div>
      </Card>

      {currentQ?.evaluation && (
        <Card className="border-emerald-500/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-emerald-400">
              AI 7-Dimension Evaluation — {currentQ.evaluation.overall_score}/100
            </h3>
            <Badge variant="info">{currentQ.evaluation.ai_provider}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { k: 'Relevance', v: currentQ.evaluation.relevance_score },
              { k: 'Tech Accuracy', v: currentQ.evaluation.technical_accuracy_score },
              { k: 'Completeness', v: currentQ.evaluation.completeness_score },
              { k: 'Clarity', v: currentQ.evaluation.clarity_score },
              { k: 'Communication', v: currentQ.evaluation.communication_score },
              { k: 'Problem Solving', v: currentQ.evaluation.problem_solving_score },
              { k: 'Practical Depth', v: currentQ.evaluation.practical_understanding_score },
            ].map((d, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <p className="text-xs text-slate-400">{d.k}</p>
                <p className="text-lg font-extrabold text-indigo-400 mt-1">{d.v}%</p>
              </div>
            ))}
          </div>
          <p className="text-base text-slate-200 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <strong className="text-indigo-400">Suggested Improved Answer:</strong>{' '}
            {currentQ.evaluation.suggested_improved_answer}
          </p>
        </Card>
      )}
    </div>
  );
}
