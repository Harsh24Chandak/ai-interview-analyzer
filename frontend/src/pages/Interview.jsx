import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Volume2, Bookmark, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { interviewAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';

export default function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [session, setSession] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [generateFollowUp, setGenerateFollowUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recognitionRef = useRef(null);

  useEffect(() => {
    interviewAPI.getInterviewDetails(id).then((res) => setSession(res.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [currentIdx]);

  if (!session) return <Loading label="Loading interview studio..." />;

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
      showToast('Browser speech recognition unavailable; using text mode.', 'info');
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
    if (!answerText.trim()) return;
    setSubmitting(true);
    try {
      const res = await interviewAPI.submitAnswer(session.id, {
        question_id: currentQ.id,
        answer_text: answerText,
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="primary">Question {currentIdx + 1} of {questions.length}</Badge>
            <Badge variant="info">{currentQ?.category}</Badge>
            <Badge variant="gray">{currentQ?.topic}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={speakQuestion} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white" title="Read Question Aloud">
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                await interviewAPI.toggleBookmark(currentQ.id);
                showToast('Question bookmark toggled!', 'info');
              }}
              className="p-2 rounded-lg bg-slate-800 text-amber-400"
              title="Bookmark Question"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-100 mb-4">{currentQ?.question_text}</h2>

        <textarea
          rows={5}
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="Type your detailed technical or STAR behavioral answer here, or click Voice Dictation..."
          className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm mb-4"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button type="button" variant={isListening ? 'danger' : 'secondary'} onClick={toggleVoiceInput}>
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isListening ? 'Stop Recording' : 'Voice Input'}
            </Button>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={generateFollowUp}
                onChange={(e) => setGenerateFollowUp(e.target.checked)}
              />
              Generate AI Follow-Up Question
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSubmitAnswer} isLoading={submitting}>
              <Send className="w-4 h-4" /> Submit & Evaluate Answer
            </Button>
            {currentIdx < questions.length - 1 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentIdx(currentIdx + 1);
                  setAnswerText(questions[currentIdx + 1]?.answer?.answer_text || '');
                  setElapsed(0);
                }}
              >
                Next Question
              </Button>
            ) : (
              <Button variant="primary" onClick={handleFinishSession}>
                Complete & View Report
              </Button>
            )}
          </div>
        </div>
      </Card>

      {currentQ?.evaluation && (
        <Card className="border-emerald-500/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-emerald-400">
              AI 7-Dimension Evaluation — {currentQ.evaluation.overall_score}/100
            </h3>
            <Badge variant="info">{currentQ.evaluation.ai_provider}</Badge>
          </div>
          <p className="text-xs text-slate-300 mb-3">
            <strong>Suggested Improved Answer:</strong> {currentQ.evaluation.suggested_improved_answer}
          </p>
        </Card>
      )}
    </div>
  );
}
