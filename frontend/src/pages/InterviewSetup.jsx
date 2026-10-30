import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Sparkles, Building2, Layers } from 'lucide-react';
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

const COMPANY_STYLES = [
  'High-Growth AI SaaS (Linear / Vercel Style)',
  'FAANG / Big Tech Scale (Google / Meta Style)',
  'FinTech & High-Reliability (Stripe / Razorpay Style)',
  'Enterprise & Product Engineering',
];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [config, setConfig] = useState({
    job_role: 'Full Stack Software Engineer',
    experience_level: 'Entry Level (0-2 Years)',
    interview_type: 'Technical',
    difficulty: 'Medium',
    company_style: COMPANY_STYLES[0],
    question_count: 4,
  });
  const [loading, setLoading] = useState(false);

  const handleStart = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await interviewAPI.startInterview(config);
      showToast('AI Mock Interview Studio initialized!', 'success');
      navigate(`/interview/${res.data.id}`);
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Could not start session.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
          <Mic className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Configure AI Mock Interview Studio</h2>
          <p className="text-base text-slate-400">
            Includes Real-Time STAR Telemetry, Vocal Pacing, and an Integrated Code & Architecture Pad
          </p>
        </div>
      </div>

      <form onSubmit={handleStart} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Target Job Role</label>
          <input
            type="text"
            required
            value={config.job_role}
            onChange={(e) => setConfig({ ...config, job_role: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-base text-white"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Experience Level</label>
            <select
              value={config.experience_level}
              onChange={(e) => setConfig({ ...config, experience_level: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-base text-white"
            >
              <option>Entry Level (0-2 Years)</option>
              <option>Mid Level (2-5 Years)</option>
              <option>Senior Level (5+ Years)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Difficulty Level</label>
            <select
              value={config.difficulty}
              onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-base text-white"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" /> Company Interview DNA / Bar
          </label>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {COMPANY_STYLES.map((style) => (
              <button
                type="button"
                key={style}
                onClick={() => setConfig({ ...config, company_style: style })}
                className={`px-4 py-3 rounded-xl text-sm font-semibold border text-left transition-all cursor-pointer ${
                  config.company_style === style
                    ? 'bg-indigo-600/25 text-indigo-200 border-indigo-500'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Interview Mode (All 6 Supported)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INTERVIEW_TYPES.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setConfig({ ...config, interview_type: t })}
                className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                  config.interview_type === t
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/25'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">
            Number of Questions: <span className="text-indigo-400">{config.question_count}</span>
          </label>
          <input
            type="range"
            min={2}
            max={8}
            value={config.question_count}
            onChange={(e) => setConfig({ ...config, question_count: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        <Button type="submit" isLoading={loading} size="lg" className="w-full">
          <Sparkles className="w-5 h-5" /> Launch AI Interview Studio
        </Button>
      </form>
    </Card>
  );
}
