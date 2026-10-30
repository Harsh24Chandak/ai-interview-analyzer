import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  FileText,
  Briefcase,
  Mic,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Brain,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();

  const handleInstantDemo = async () => {
    await loginDemo();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-base tracking-tight">AI Interview Analyzer</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">
              Sign In
            </Link>
            <button
              onClick={handleInstantDemo}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 border border-indigo-500/30"
            >
              Instant Demo Login
            </button>
            <Link
              to="/register"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25"
            >
              Start Practicing
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium mb-6">
          <Brain className="w-3.5 h-3.5" />
          Powered by Google Gemini AI & 7-Dimension Technical Rubric Engine
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight mb-6">
          Master Every Technical & Behavioral Interview with{' '}
          <span className="gradient-text">AI Career Intelligence</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
          Upload your PDF/DOCX resume, benchmark your skill gaps against real job descriptions, and practice voice or text mock interviews with granular, explainable AI evaluations.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 shadow-xl shadow-indigo-600/25"
          >
            Start Practicing <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={handleInstantDemo}
            className="px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold border border-slate-700"
          >
            Explore Live Demo Workspace
          </button>
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
        {[
          {
            icon: FileText,
            title: 'Resume Intelligence & ATS Audit',
            desc: 'Parse PDF & DOCX resumes, extract technical/soft skills, identify missing role keywords, and receive quantified XYZ bullet upgrades.',
          },
          {
            icon: Briefcase,
            title: 'Job Compatibility & Skill Gap Radar',
            desc: 'Compare your resume against any target Job Description to calculate an explainable match percentage and a 3-week learning roadmap.',
          },
          {
            icon: Mic,
            title: '6-Mode AI Mock Interview Studio',
            desc: 'Practice Technical, HR, Behavioral, Situational, Resume-Based, and JD-Based interviews with Web Speech voice recognition and dynamic AI follow-ups.',
          },
        ].map((f, i) => (
          <div key={i} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
