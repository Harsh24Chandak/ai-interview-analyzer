import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';

export default function Results() {
  const { id } = useParams();
  const [session, setSession] = useState(null);

  useEffect(() => {
    interviewAPI.getInterviewDetails(id).then((res) => setSession(res.data)).catch(() => {});
  }, [id]);

  if (!session) return <Loading label="Loading interview evaluation report..." />;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{session.job_role} — Final Report</h2>
            <p className="text-xs text-slate-400">{session.interview_type} • {session.difficulty}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-indigo-400">{session.overall_score}/100</span>
            <p className="text-xs text-slate-400">Overall Score</p>
          </div>
        </div>
        <p className="text-sm text-slate-300">{session.summary_feedback}</p>
      </Card>

      <div className="space-y-4">
        {(session.questions || []).map((q) => (
          <Card key={q.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Q{q.question_number}: {q.question_text}</span>
              {q.evaluation && <Badge variant="success">{q.evaluation.overall_score}/100</Badge>}
            </div>
            {q.answer && (
              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl">
                <strong>Your Answer:</strong> {q.answer.answer_text}
              </p>
            )}
            {q.evaluation && (
              <div className="text-xs text-slate-400 space-y-1">
                <p><strong className="text-emerald-400">What Went Well:</strong> {(q.evaluation.what_went_well || []).join(' ')}</p>
                <p><strong className="text-amber-400">What Was Missing:</strong> {(q.evaluation.what_was_missing || []).join(' ')}</p>
                <p><strong className="text-indigo-300">Suggested Improved Answer:</strong> {q.evaluation.suggested_improved_answer}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
