import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Eye } from 'lucide-react';
import { interviewAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';

export default function History() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState([]);

  const loadHistory = () => {
    interviewAPI.getInterviewHistory().then((res) => setSessions(res.data.sessions || [])).catch(() => {});
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id) => {
    await interviewAPI.deleteInterview(id);
    showToast('Session deleted.', 'info');
    loadHistory();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Interview Session History</h2>
      {sessions.map((s) => (
        <Card key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-base">{s.job_role}</span>
              <Badge variant="primary">{s.interview_type}</Badge>
              <Badge variant="success">{s.overall_score}/100</Badge>
            </div>
            <p className="text-xs text-slate-400">{s.summary_feedback}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/results/${s.id}`}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> Review
            </Link>
            <button
              onClick={() => handleDelete(s.id)}
              className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
