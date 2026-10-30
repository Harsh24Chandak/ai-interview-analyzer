import React, { useEffect, useState } from 'react';
import { Briefcase, CheckCircle2, AlertTriangle } from 'lucide-react';
import { jobsAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import ProgressBar from '../components/common/ProgressBar';

export default function JobAnalyzer() {
  const { showToast } = useToast();
  const [jobTitle, setJobTitle] = useState('Full Stack Software Engineer (AI Platform)');
  const [companyName, setCompanyName] = useState('LinearScale Technologies');
  const [rawText, setRawText] = useState(
    'We are looking for a Full Stack Software Engineer skilled in Python, FastAPI, React, TypeScript, PostgreSQL, SQL, Docker, Redis, AWS, and Pytest.'
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    jobsAPI.listJobs().then((res) => {
      if (res.data.latest_job) setResult(res.data.latest_job);
    }).catch(() => {});
  }, []);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await jobsAPI.analyzeJob({
        job_title: jobTitle,
        company_name: companyName,
        raw_text: rawText,
      });
      setResult(res.data.job_analysis);
      showToast('Job compatibility match calculated!', 'success');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Analysis failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-bold mb-4">Job Description Analyzer & Skill Compatibility Matcher</h2>
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Job Title"
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm"
            />
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name"
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm"
            />
          </div>
          <textarea
            rows={4}
            required
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste the complete job description here..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm"
          />
          <Button type="submit" isLoading={loading}>
            Analyze Job Compatibility
          </Button>
        </form>
      </Card>

      {result && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="space-y-4">
            <p className="text-xs text-slate-400">Resume-to-Job Match Score</p>
            <p className="text-4xl font-extrabold text-indigo-400">{result.match_percentage}%</p>
            <ProgressBar value={result.match_percentage} />
            <p className="text-xs text-slate-300">{result.experience_requirements}</p>
          </Card>
          <Card className="lg:col-span-2 space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase text-emerald-400 mb-2">Matching Skills ({result.matching_skills?.length || 0})</h4>
              <div className="flex flex-wrap gap-1.5">
                {(result.matching_skills || []).map((s, i) => (
                  <Badge key={i} variant="success">{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase text-amber-400 mb-2">Missing Skills to Acquire ({result.missing_skills?.length || 0})</h4>
              <div className="flex flex-wrap gap-1.5">
                {(result.missing_skills || []).map((s, i) => (
                  <Badge key={i} variant="warning">{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase text-indigo-400 mb-2">Personalized 3-Week Preparation Roadmap</h4>
              <div className="grid md:grid-cols-3 gap-3">
                {(result.learning_roadmap || []).map((step, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs font-bold text-indigo-400">{step.week}: {step.focus}</span>
                    <p className="text-xs text-slate-400 mt-1">{step.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
