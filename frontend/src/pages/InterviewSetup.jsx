import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Sparkles } from 'lucide-react';
import { interviewAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const INTERVIEW_TYPES = [
  'Technical',
  'HR',
  'Behavioral',
  'Situational',
  'Resume-Based',
  'Job-Description-Based',
];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [config, setConfig] = useState({
    job_role: 'Full Stack Software Engineer',
    experience_level: 'Entry Level (0-2 Years)',
    interview_type: 'Technical',
    difficulty: 'Medium',
    question_count: 4,
  });
  const [loading, setLoading] = useState(false);

  const handleStart = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await interviewAPI.startInterview(config);
      showToast('AI Mock Interview initialized!', 'success');
      navigate(`/interview/${res.data.id}`);
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not start session.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
          <Mic className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Configure AI Mock Interview</h2>
          <p className="text-xs text-slate-400">Contextual questions generated from your role, resume, and target JD</p>
        </div>
      </div>

      <form onSubmit={handleStart} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Target Job Role</label>
          <input
            type="text"
            required
            value={config.job_role}
            onChange={(e) => setConfig({ ...config, job_role: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Experience Level</label>
            <select
              value={config.experience_level}
              onChange={(e) => setConfig({ ...config, experience_level: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm"
            >
              <option>Entry Level (0-2 Years)</option>
              <option>Mid Level (2-5 Years)</option>
              <option>Senior Level (5+ Years)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Difficulty</label>
            <select
              value={config.difficulty}
              onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">Interview Mode (All 6 Supported)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INTERVIEW_TYPES.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setConfig({ ...config, interview_type: t })}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  config.interview_type === t
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-300 border-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Number of Questions: {config.question_count}</label>
          <input
            type="range"
            min={2}
            max={8}
            value={config.question_count}
            onChange={(e) => setConfig({ ...config, question_count: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <Button type="submit" isLoading={loading} className="w-full">
          <Sparkles className="w-4 h-4" /> Launch AI Interview Studio
        </Button>
      </form>
    </Card>
  );
}
