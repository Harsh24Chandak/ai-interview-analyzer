import React, { useEffect, useState } from 'react';
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
    <div className="space-y-8">
      <Card>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          Job Description Analyzer & Skill Gap Matrix
        </h2>
        <p className="text-base text-slate-400 mb-6">
          Compare your resume skills against any target Job Description to generate an explainable compatibility score and 3-week learning roadmap.
        </p>
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Job Title"
              className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-base text-white"
            />
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name"
              className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-base text-white"
            />
          </div>
          <textarea
            rows={4}
            required
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste the complete job description here..."
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-base text-white"
          />
          <Button type="submit" isLoading={loading} size="lg">
            Analyze Job Compatibility
          </Button>
        </form>
      </Card>

      {result && (
        <div className="grid xl:grid-cols-3 gap-6">
          <Card className="space-y-5">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">Resume-to-Job Match Score</p>
            <p className="text-5xl font-extrabold text-indigo-400">{result.match_percentage}%</p>
            <ProgressBar value={result.match_percentage} />
            <p className="text-base text-slate-300 leading-relaxed">{result.experience_requirements}</p>
          </Card>

          <Card className="xl:col-span-2 space-y-6">
            <div>
              <h4 className="text-base font-bold text-emerald-400 mb-2.5">
                Matching Skills ({result.matching_skills?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {(result.matching_skills || []).map((s, i) => (
                  <Badge key={i} variant="success" size="md">✓ {s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-base font-bold text-amber-400 mb-2.5">
                Missing Skills to Acquire ({result.missing_skills?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {(result.missing_skills || []).map((s, i) => (
                  <Badge key={i} variant="warning" size="md">! {s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-base font-bold text-indigo-300 mb-3">
                Personalized 3-Week Preparation Roadmap
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                {(result.learning_roadmap || []).map((step, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-sm font-extrabold text-indigo-400 block mb-1">
                      {step.week}: {step.focus}
                    </span>
                    <p className="text-sm text-slate-300 leading-relaxed">{step.action}</p>
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
