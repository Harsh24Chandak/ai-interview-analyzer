import React, { useEffect, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, Sparkles, Copy, Check } from 'lucide-react';
import { resumeAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import ProgressBar from '../components/common/ProgressBar';

export default function ResumeAnalyzer() {
  const { showToast } = useToast();
  const [targetRole, setTargetRole] = useState('Full Stack Software Engineer');
  const [analysis, setAnalysis] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);

  // XYZ Bullet Rewriter State
  const [bulletInput, setBulletInput] = useState(
    'Worked on backend APIs using Python and SQL database queries.\nBuilt frontend dashboard pages in React.\nCreated an AI interview analyzer project using Gemini API.'
  );
  const [rewrites, setRewrites] = useState([]);
  const [rewriting, setRewriting] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(-1);

  useEffect(() => {
    resumeAPI
      .listResumes()
      .then((res) => {
        setResume(res.data.latest_resume);
        setAnalysis(res.data.latest_analysis);
      })
      .catch(() => {});
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_role', targetRole);
    try {
      const res = await resumeAPI.uploadResume(formData);
      setResume(res.data.resume);
      setAnalysis(res.data.analysis);
      showToast('Resume extracted and analyzed!', 'success');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Upload failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await resumeAPI.analyzeResume({
        target_role: targetRole,
        raw_text:
          'HARSH CHANDAK — Full Stack Software Engineer\nEducation: B.Tech in Computer Science & Engineering (8.9 CGPA)\nSkills: Python, FastAPI, React, TypeScript, SQL, PostgreSQL, Docker, Git, REST APIs, Tailwind CSS\nExperience: Full-Stack Intern — Built 14 RESTful APIs in FastAPI with JWT security and reduced SQL P95 latency by 38% (420ms to 260ms).\nProjects: AI Interview Analyzer — Full-stack AI interview preparation SaaS with React, FastAPI, SQLite, and Google Gemini API.',
      });
      setResume(res.data.resume);
      setAnalysis(res.data.analysis);
      showToast('Sample resume analyzed successfully!', 'success');
    } catch (err) {
      showToast('Could not analyze sample resume.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRewriteBullets = async () => {
    setRewriting(true);
    try {
      const lines = bulletInput.split('\n').map((l) => l.trim()).filter(Boolean);
      const res = await resumeAPI.rewriteBullets({ bullets: lines, target_role: targetRole });
      setRewrites(res.data.rewrites || []);
      showToast('Transformed bullets using the XYZ Impact Formula!', 'success');
    } catch (err) {
      showToast('Could not rewrite bullets.', 'error');
    } finally {
      setRewriting(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">AI Resume Intelligence & ATS Audit</h2>
            <p className="text-base text-slate-400 mt-1">
              Upload a PDF, DOCX, or TXT resume to extract skills, audit quantified impact, and rewrite weak bullets.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Target Job Role"
              className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-base text-white min-w-[260px]"
            />
            <button
              onClick={handleSampleAnalyze}
              disabled={loading}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold border border-slate-700 cursor-pointer"
            >
              Try Sample Resume
            </button>
            <label className="cursor-pointer px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30">
              <Upload className="w-4 h-4" />
              {loading ? 'Analyzing...' : 'Upload PDF / DOCX'}
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </Card>

      {analysis && (
        <div className="grid xl:grid-cols-3 gap-6">
          <Card className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-300">Overall Resume Score</span>
              <Badge variant="success" size="lg">{analysis.overall_score}/100</Badge>
            </div>
            <ProgressBar label="ATS Compatibility" value={analysis.ats_compatibility_score} variant="success" />
            <ProgressBar label="Quantified Impact (XYZ)" value={analysis.impact_score} variant="primary" />
            <ProgressBar label="Technical Stack Depth" value={analysis.technical_depth_score} variant="primary" />
            {resume && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-sm font-bold text-slate-200 mb-2">Extracted File: {resume.filename}</p>
                <pre className="text-xs text-slate-300 bg-slate-950 p-4 rounded-xl max-h-60 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed border border-slate-800">
                  {resume.raw_text}
                </pre>
              </div>
            )}
          </Card>

          <Card className="xl:col-span-2 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-3">
                Extracted Technical Skills ({analysis.extracted_skills?.technical_skills?.length || 0})
              </h3>
              <div className="flex flex-wrap gap-2">
                {(analysis.extracted_skills?.technical_skills || []).map((s, i) => (
                  <Badge key={i} variant="primary" size="md">{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-300 mb-3">
                Missing Benchmark Skills for {analysis.target_role}
              </h3>
              <div className="flex flex-wrap gap-2">
                {(analysis.missing_skills || []).map((s, i) => (
                  <Badge key={i} variant="warning" size="md">+ {s}</Badge>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6 pt-2">
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-3">Key Strengths</h4>
                <ul className="space-y-2.5 text-sm text-slate-200">
                  {(analysis.strengths || []).map((st, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-3">Actionable Upgrades</h4>
                <ul className="space-y-2.5 text-sm text-slate-200">
                  {(analysis.improvement_recommendations || []).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* UNIQUE FEATURE: 1-Click AI Resume Bullet XYZ Rewriter */}
      <Card className="border-indigo-500/35">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <Badge variant="primary" size="sm" className="mb-2">Unique Market Feature</Badge>
            <h3 className="text-2xl font-extrabold text-white">
              1-Click AI Resume Bullet XYZ Optimizer ("Before vs. After")
            </h3>
            <p className="text-base text-slate-400">
              Paste weak or generic resume lines below to transform them into metric-driven Google XYZ impact statements: <em>"Accomplished [X] as measured by [Y], by doing [Z]"</em>.
            </p>
          </div>
          <Button onClick={handleRewriteBullets} isLoading={rewriting} icon={Sparkles} size="lg">
            Rewrite Bullets with XYZ Formula
          </Button>
        </div>

        <textarea
          rows={4}
          value={bulletInput}
          onChange={(e) => setBulletInput(e.target.value)}
          className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-base text-slate-100 mb-6"
          placeholder="Paste 1 to 5 resume bullet points (one per line)..."
        />

        {rewrites.length > 0 && (
          <div className="space-y-4">
            {rewrites.map((item, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 grid lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-4">
                  <span className="text-xs font-bold uppercase text-rose-400 block mb-1">Before (Passive / Generic)</span>
                  <p className="text-sm text-slate-400 line-through">{item.original}</p>
                </div>
                <div className="lg:col-span-7">
                  <span className="text-xs font-bold uppercase text-emerald-400 block mb-1">After (XYZ Quantified Impact)</span>
                  <p className="text-base font-semibold text-white">{item.rewritten_xyz}</p>
                  <p className="text-xs text-indigo-300 mt-1">{item.impact_upgrade}</p>
                </div>
                <div className="lg:col-span-1 flex justify-end">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(item.rewritten_xyz);
                      setCopiedIdx(idx);
                      showToast('Copied XYZ bullet to clipboard!', 'info');
                    }}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    title="Copy Rewritten Bullet"
                  >
                    {copiedIdx === idx ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
