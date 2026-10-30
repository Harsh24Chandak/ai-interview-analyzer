import React, { useEffect, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
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

  useEffect(() => {
    resumeAPI.listResumes().then((res) => {
      setResume(res.data.latest_resume);
      setAnalysis(res.data.latest_analysis);
    }).catch(() => {});
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

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">AI Resume Intelligence & ATS Analyzer</h2>
            <p className="text-sm text-slate-400">Upload a PDF, DOCX, or TXT resume to extract skills, audit impact, and identify gaps.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Target Job Role"
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm"
            />
            <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {loading ? 'Analyzing...' : 'Upload PDF / DOCX'}
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </Card>

      {analysis && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Overall Resume Score</span>
              <Badge variant="success">{analysis.overall_score}/100</Badge>
            </div>
            <ProgressBar label="ATS Compatibility" value={analysis.ats_compatibility_score} variant="success" />
            <ProgressBar label="Quantified Impact" value={analysis.impact_score} variant="primary" />
            <ProgressBar label="Technical Depth" value={analysis.technical_depth_score} variant="primary" />
            {resume && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs font-semibold text-slate-300 mb-1">File: {resume.filename}</p>
                <pre className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {resume.raw_text}
                </pre>
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-2">Extracted Technical Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {(analysis.extracted_skills?.technical_skills || []).map((s, i) => (
                  <Badge key={i} variant="primary">{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-300 mb-2">Missing Benchmark Skills for {analysis.target_role}</h3>
              <div className="flex flex-wrap gap-1.5">
                {(analysis.missing_skills || []).map((s, i) => (
                  <Badge key={i} variant="warning">{s}</Badge>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold uppercase text-emerald-400 mb-2">Key Strengths</h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {(analysis.strengths || []).map((st, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase text-indigo-400 mb-2">Actionable Recommendations</h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {(analysis.improvement_recommendations || []).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
