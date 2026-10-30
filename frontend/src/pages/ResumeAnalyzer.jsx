import React, { useEffect, useState } from 'react';
import { resumeAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import ScoreRing from '../components/common/ScoreRing';
import ProgressBar from '../components/common/ProgressBar';
import FileUpload from '../components/common/FileUpload';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

export default function ResumeAnalyzer() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Mode: 'upload' (Screen 05) or 'results' (Screen 06)
  const [viewMode, setViewMode] = useState('upload');
  const [inputTab, setInputTab] = useState('file'); // 'file' or 'paste'
  const [targetRole, setTargetRole] = useState(user?.target_role || 'Full Stack Software Engineer');
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [pipelineStage, setPipelineStage] = useState(0); // 0 idle, 1..4 active

  const [resumesHistory, setResumesHistory] = useState([]);
  const [analysesHistory, setAnalysesHistory] = useState([]);
  const [activeResume, setActiveResume] = useState(null);
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // XYZ Bullet Optimizer State
  const [bulletInput, setBulletInput] = useState(
    'Managed AWS backend services for reliability and cut cloud bills with the infrastructure team.\nWorked on Python REST APIs and SQL database queries.\nBuilt React frontend pages for the telemetry dashboard.'
  );
  const [rewrites, setRewrites] = useState([]);
  const [rewriting, setRewriting] = useState(false);
  const [selectedRewriteIdx, setSelectedRewriteIdx] = useState(0);

  const loadResumes = async () => {
    setLoading(true);
    try {
      const res = await resumeAPI.listResumes();
      const rList = res.data?.resumes || [];
      const aList = res.data?.analyses || [];
      setResumesHistory(rList);
      setAnalysesHistory(aList);
      if (res.data?.latest_resume && res.data?.latest_analysis) {
        setActiveResume(res.data.latest_resume);
        setActiveAnalysis(res.data.latest_analysis);
        setViewMode('results');
      }
    } catch (err) {
      // Keep upload view if none
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleRunAnalysis = async () => {
    setProcessing(true);
    setPipelineStage(1);
    const stageTimer = setInterval(() => {
      setPipelineStage((prev) => (prev < 4 ? prev + 1 : prev));
    }, 300);

    try {
      let res;
      if (inputTab === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('target_role', targetRole);
        res = await resumeAPI.uploadResume(formData);
      } else if (inputTab === 'paste' && pastedText.trim().length >= 20) {
        res = await resumeAPI.analyzeResume({
          raw_text: pastedText.trim(),
          target_role: targetRole,
        });
      } else if (activeResume?.id) {
        res = await resumeAPI.analyzeResume({
          resume_id: activeResume.id,
          target_role: targetRole,
        });
      } else {
        showToast('Please select a PDF/DOCX/TXT file (up to 10MB) or paste at least 20 characters of resume text.', 'error');
        clearInterval(stageTimer);
        setPipelineStage(0);
        setProcessing(false);
        return;
      }

      setActiveResume(res.data.resume);
      setActiveAnalysis(res.data.analysis);
      showToast('Resume parsed and analyzed successfully!', 'success');
      await loadResumes();
      setViewMode('results');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Resume analysis failed.', 'error');
    } finally {
      clearInterval(stageTimer);
      setPipelineStage(0);
      setProcessing(false);
    }
  };

  const handleRewriteBullets = async () => {
    const lines = bulletInput.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      showToast('Enter at least one resume bullet to optimize.', 'error');
      return;
    }
    setRewriting(true);
    try {
      const res = await resumeAPI.rewriteBullets({
        bullets: lines,
        target_role: activeAnalysis?.target_role || targetRole,
      });
      setRewrites(res.data.rewrites || []);
      setSelectedRewriteIdx(0);
      showToast('Generated Google XYZ impact bullet optimizations!', 'success');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Bullet optimization failed.', 'error');
    } finally {
      setRewriting(false);
    }
  };

  const handleExportReport = () => {
    if (!activeAnalysis) return;
    const payload = {
      resume: activeResume,
      analysis: activeAnalysis,
      xyz_rewrites: rewrites,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume_audit_${activeResume?.filename || 'report'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Resume Analysis Report (JSON)', 'info');
  };

  if (loading) return <LoadingSkeleton label="Loading Resume Intelligence workspace..." />;

  const currentRewrite = rewrites[selectedRewriteIdx] || null;

  // ==========================================================================
  // SCREEN 05 — RESUME ANALYZER UPLOAD & INGESTION VIEW
  // ==========================================================================
  if (viewMode === 'upload' || !activeAnalysis) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={['WORKSPACE', 'RESUME INTELLIGENCE', 'DOCUMENT INGESTION']}
          title="Resume Intelligence & ATS Analyzer"
          subtitle="Upload and deconstruct candidate CVs against ATS parsing rules, skill extraction taxonomies, and quantified impact checks."
          actions={
            <>
              {activeAnalysis && (
                <Button variant="secondary" size="sm" materialIcon="history" onClick={() => setViewMode('results')}>
                  View Recent Analysis ({activeResume?.filename?.slice(0, 18) || 'Latest'})
                </Button>
              )}
              <Badge variant="emerald">• PARSER READY</Badge>
            </>
          }
        />

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Target Role + File Upload / Paste + Execution Pipeline */}
          <div className="lg:col-span-7 space-y-5">
            <div className="obsidian-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#786BFF] text-[18px]">track_changes</span>
                  <h2 className="text-sm font-semibold">Target Job Role Alignment</h2>
                </div>
                <span className="label-caps text-[10px] text-[#42C6D9]">ACTIVE BENCHMARK MODEL</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Select or enter your target role to calibrate skill extraction and missing keyword detection.
              </p>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full obsidian-input px-3.5 py-2.5 text-sm"
                placeholder="e.g., Senior Full-Stack Engineer"
              />
            </div>

            <div className="obsidian-card p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="inline-flex p-1 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setInputTab('file')}
                    className={`px-3 py-1.5 rounded-[4px] label-caps text-[10px] flex items-center gap-1.5 cursor-pointer ${
                      inputTab === 'file' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">upload_file</span>
                    DOCUMENT UPLOAD
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputTab('paste')}
                    className={`px-3 py-1.5 rounded-[4px] label-caps text-[10px] flex items-center gap-1.5 cursor-pointer ${
                      inputTab === 'paste' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">notes</span>
                    PASTE PLAIN TEXT RESUME
                  </button>
                </div>
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">MAX: 10 MB</span>
              </div>

              {inputTab === 'file' ? (
                <FileUpload
                  selectedFilename={selectedFile?.name || ''}
                  isLoading={processing}
                  onFileSelect={(file) => {
                    setSelectedFile(file);
                    showToast(`Selected ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
                  }}
                />
              ) : (
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your complete resume text here (Education, Technical Skills, Experience, Projects)..."
                  className="w-full obsidian-input p-4 text-xs font-mono-tabular leading-relaxed"
                />
              )}

              {/* Automated Execution Pipeline Stage Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="label-caps text-[10px] text-[var(--text-secondary)]">AUTOMATED EXECUTION PIPELINE</span>
                  <span className="label-caps text-[10px] text-[#42C6D9]">
                    {processing ? `EXECUTING STAGE 0${pipelineStage}...` : 'READY TO EXECUTE'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { idx: 1, label: 'Ingestion' },
                    { idx: 2, label: 'Skill Extraction' },
                    { idx: 3, label: 'ATS Compliance' },
                    { idx: 4, label: 'Impact Scoring' },
                  ].map((st) => (
                    <div
                      key={st.idx}
                      className={`obsidian-subpanel p-2.5 ${
                        pipelineStage >= st.idx ? 'border-[#42C6D9] bg-[#42C6D9]/10' : ''
                      }`}
                    >
                      <span className="label-caps text-[9px] text-[var(--text-secondary)] block">STAGE 0{st.idx}</span>
                      <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#42C6D9]" />
                        {st.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                isLoading={processing}
                materialIcon="psychology"
                onClick={handleRunAnalysis}
                className="w-full py-3"
              >
                Analyze Resume with ATS & Skill Engine
              </Button>
            </div>
          </div>

          {/* Right Column (5 cols): Previously Analyzed Versions & Formatting Guidelines */}
          <div className="lg:col-span-5 space-y-5">
            <div className="obsidian-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#42C6D9] text-[18px]">history</span>
                  <h3 className="text-sm font-semibold">Previously Analyzed Versions</h3>
                </div>
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">
                  {resumesHistory.length} Snapshot(s)
                </span>
              </div>

              {resumesHistory.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] py-4">
                  No resumes uploaded yet. Upload a PDF, DOCX, or TXT file on the left to create your first snapshot.
                </p>
              ) : (
                <div className="space-y-3">
                  {resumesHistory.slice(0, 4).map((r, idx) => {
                    const matchingAn = analysesHistory.find((a) => a.resume_id === r.id) || analysesHistory[idx];
                    return (
                      <div key={r.id} className="obsidian-subpanel p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="material-symbols-outlined text-[#EF7280] text-[16px]">description</span>
                            <span className="text-xs font-semibold truncate">{r.filename}</span>
                          </div>
                          <Badge variant={idx === 0 ? 'emerald' : 'gray'} size="xs">
                            {idx === 0 ? 'ACTIVE PROFILE' : 'ARCHIVED'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[var(--text-secondary)]">
                          <span>Parsed {(r.created_at || '').slice(0, 10)}</span>
                          {matchingAn && (
                            <span>
                              SCORE: <strong className="text-[#42C6D9]">{matchingAn.overall_score}/100</strong> • ATS:{' '}
                              <strong className="text-[#36C995]">{matchingAn.ats_compatibility_score}%</strong>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => {
                              setActiveResume(r);
                              if (matchingAn) setActiveAnalysis(matchingAn);
                              setViewMode('results');
                            }}
                          >
                            INSPECT
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={async () => {
                              setProcessing(true);
                              try {
                                const resp = await resumeAPI.analyzeResume({ resume_id: r.id, target_role: targetRole });
                                setActiveResume(resp.data.resume);
                                setActiveAnalysis(resp.data.analysis);
                                setViewMode('results');
                                showToast('Re-analyzed resume snapshot!', 'success');
                              } finally {
                                setProcessing(false);
                              }
                            }}
                          >
                            RE-ANALYZE
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="obsidian-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="label-caps text-[10px] text-[var(--text-secondary)]">HIGH-PASS FORMATTING GUIDELINES</span>
                <Badge variant="emerald" size="xs">ATS CHECKLIST</Badge>
              </div>
              <ul className="space-y-2.5 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#36C995] text-[16px] shrink-0 mt-0.5">check_circle</span>
                  <span>
                    <strong className="text-[var(--text-primary)]">Standard Single-Column Hierarchy:</strong> Clear section headers (Education, Technical Skills, Experience, Projects) improve text extraction reliability.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#36C995] text-[16px] shrink-0 mt-0.5">check_circle</span>
                  <span>
                    <strong className="text-[var(--text-primary)]">Google XYZ Bullet Formula:</strong> "Accomplished [X] as measured by [Y], by doing [Z]" strengthens quantified impact scoring.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[#36C995] text-[16px] shrink-0 mt-0.5">check_circle</span>
                  <span>
                    <strong className="text-[var(--text-primary)]">Selectable UTF-8 Text:</strong> Ensure uploaded PDFs or DOCX files contain selectable text rather than scanned images.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // SCREEN 06 — RESUME ANALYSIS RESULTS VIEW
  // ==========================================================================
  const techSkills = activeAnalysis.extracted_skills?.technical_skills || [];
  const softSkills = activeAnalysis.extracted_skills?.soft_skills || [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={['WORKSPACE', 'RESUME INTELLIGENCE', `#RA-${activeAnalysis.id || 'LIVE'}`]}
        title={`Resume Analysis: ${activeResume?.filename || 'Uploaded_Resume.pdf'}`}
        subtitle={`Deep skill extraction and quantified impact telemetry for Target Role: ${activeAnalysis.target_role}`}
        actions={
          <>
            <Button variant="secondary" size="sm" materialIcon="upload_file" onClick={() => setViewMode('upload')}>
              Upload New
            </Button>
            <Button variant="secondary" size="sm" materialIcon="download" onClick={handleExportReport}>
              Export Audit
            </Button>
            <Button variant="primary" size="sm" isLoading={processing} materialIcon="refresh" onClick={handleRunAnalysis}>
              Re-run Parser
            </Button>
          </>
        }
      />

      {/* 4 Top Score Cards (Match Screen 06) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="obsidian-card p-4 flex items-center justify-between gap-3">
          <div>
            <span className="label-caps text-[10px] text-[var(--text-secondary)] block">OVERALL CALIBRATION</span>
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-2">
              {activeAnalysis.overall_score >= 85 ? 'Strong Readiness' : 'Solid Foundation'}
            </p>
            <span className="text-[11px] text-[var(--text-secondary)]">
              Provider: {activeAnalysis.ai_provider}
            </span>
          </div>
          <ScoreRing score={activeAnalysis.overall_score} size={74} strokeWidth={6} variant="cyan" />
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">ATS STRUCTURE</span>
            <Badge variant="emerald" size="xs">PARSED</Badge>
          </div>
          <div className="my-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[#42C6D9]">
              {activeAnalysis.ats_compatibility_score}%
            </span>
            <span className="text-xs text-[var(--text-secondary)] ml-2">Section hierarchy</span>
          </div>
          <ProgressBar value={activeAnalysis.ats_compatibility_score} variant="cyan" showPercent={false} size="xs" />
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">QUANTIFIED IMPACT</span>
            <Badge variant="emerald" size="xs">XYZ Model</Badge>
          </div>
          <div className="my-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[#36C995]">
              {activeAnalysis.impact_score}%
            </span>
            <span className="text-xs text-[var(--text-secondary)] ml-2">Measurable proof</span>
          </div>
          <ProgressBar value={activeAnalysis.impact_score} variant="emerald" showPercent={false} size="xs" />
        </div>

        <div className="obsidian-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps text-[10px] text-[var(--text-secondary)]">TECHNICAL SIGNAL</span>
            <Badge variant="violet" size="xs">Role Stack</Badge>
          </div>
          <div className="my-2">
            <span className="font-mono-tabular text-3xl font-semibold text-[var(--text-primary)]">
              {activeAnalysis.technical_depth_score}%
            </span>
            <span className="text-xs text-[var(--text-secondary)] ml-2">{techSkills.length} skills extracted</span>
          </div>
          <ProgressBar value={activeAnalysis.technical_depth_score} variant="violet" showPercent={false} size="xs" />
        </div>
      </div>

      {/* Main Two-Column Results Layout (Match Screen 06) */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Extracted Skills, Credential Audit, Signal Audit Matrix */}
        <div className="lg:col-span-5 space-y-5">
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#42C6D9] text-[18px]">hub</span>
                <h3 className="text-sm font-semibold">Extracted Skills Taxonomy</h3>
              </div>
              <span className="label-caps text-[10px] text-[var(--text-secondary)]">
                {techSkills.length + softSkills.length} KEYWORDS IDENTIFIED
              </span>
            </div>

            <div>
              <div className="flex justify-between label-caps text-[10px] text-[var(--text-secondary)] mb-2">
                <span>TECHNICAL & ENGINEERING STACK</span>
                <span className="text-[#42C6D9]">Extracted</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {techSkills.map((sk, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-mono-tabular text-[var(--text-primary)]"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between label-caps text-[10px] text-[var(--text-secondary)] mb-2">
                <span>PROFESSIONAL & LEADERSHIP COMPETENCIES</span>
                <span className="text-[#36C995]">Verified</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {softSkills.map((sk, idx) => (
                  <Badge key={idx} variant="emerald" size="sm">✓ {sk}</Badge>
                ))}
              </div>
            </div>

            {activeAnalysis.missing_skills?.length > 0 && (
              <div>
                <div className="flex justify-between label-caps text-[10px] text-[#F1B65D] mb-2">
                  <span>MISSING BENCHMARK SKILLS FOR {activeAnalysis.target_role}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeAnalysis.missing_skills.map((sk, idx) => (
                    <Badge key={idx} variant="warning" size="sm">+ {sk}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="obsidian-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Structure & Credential Audit</h3>
              <Badge variant="gray" size="xs">PARSED SECTIONS</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="obsidian-subpanel p-3">
                <span className="label-caps text-[9px] text-[var(--text-secondary)] block">EXPERIENCE ENTRIES</span>
                <span className="font-mono-tabular text-base font-semibold text-[var(--text-primary)]">
                  {activeAnalysis.experience_summary?.length || 1} Role(s)
                </span>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 truncate">
                  {activeAnalysis.experience_summary?.[0]?.role || 'Extracted from resume'}
                </p>
              </div>
              <div className="obsidian-subpanel p-3">
                <span className="label-caps text-[9px] text-[var(--text-secondary)] block">EDUCATION & PROJECTS</span>
                <span className="font-mono-tabular text-base font-semibold text-[#42C6D9]">
                  {activeAnalysis.education_summary?.[0]?.degree?.slice(0, 22) || 'Verified Degree'}
                </span>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  {activeAnalysis.projects_summary?.length || 1} Project(s) indexed
                </p>
              </div>
            </div>
          </div>

          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Signal Audit Matrix</h3>
              <span className="label-caps text-[10px] text-[var(--text-secondary)]">DIAGNOSTIC REPORT</span>
            </div>

            <div className="space-y-2">
              <span className="label-caps text-[10px] text-[#36C995] block">✓ HIGH-CONVICTION STRENGTHS</span>
              {(activeAnalysis.strengths || []).map((st, i) => (
                <div key={i} className="obsidian-subpanel p-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                  {st}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <span className="label-caps text-[10px] text-[#F1B65D] block">⚠ IDENTIFIED GAPS & FRICTION</span>
              {(activeAnalysis.weaknesses || []).map((wk, i) => (
                <div key={i} className="obsidian-subpanel p-3 text-xs text-[var(--text-secondary)] leading-relaxed border-[#F1B65D]/30">
                  {wk}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): AI Resume Bullet Optimizer + Next Actions Checklist */}
        <div className="lg:col-span-7 space-y-5">
          <div className="obsidian-card p-6 space-y-5 border-[#786BFF]/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#786BFF] text-[20px]">auto_fix_high</span>
                <div>
                  <h3 className="text-base font-semibold">AI Resume Bullet Optimizer</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Transform generic task descriptions into Google XYZ impact statements.
                  </p>
                </div>
              </div>
              <Badge variant="cyan" size="xs">FRAMEWORK: [ACCOMPLISHED X, MEASURED BY Y, BY DOING Z]</Badge>
            </div>

            <div className="space-y-2">
              <label className="label-caps text-[10px] text-[var(--text-secondary)] block">
                ENTER 1–5 DRAFT RESUME BULLETS TO OPTIMIZE (ONE PER LINE)
              </label>
              <textarea
                rows={3}
                value={bulletInput}
                onChange={(e) => setBulletInput(e.target.value)}
                className="w-full obsidian-input p-3 text-xs font-mono-tabular"
              />
              <div className="flex justify-end">
                <Button size="sm" isLoading={rewriting} materialIcon="auto_fix_high" onClick={handleRewriteBullets}>
                  Optimize Bullets with XYZ Engine
                </Button>
              </div>
            </div>

            {rewrites.length > 0 && currentRewrite && (
              <div className="space-y-4 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex flex-wrap gap-2">
                  {rewrites.map((rw, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedRewriteIdx(idx)}
                      className={`px-3 py-1 rounded-[4px] label-caps text-[10px] border cursor-pointer ${
                        selectedRewriteIdx === idx
                          ? 'bg-[#786BFF]/20 border-[#786BFF] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      • Bullet #{idx + 1}
                    </button>
                  ))}
                </div>

                <div className="obsidian-subpanel p-4 space-y-2 border-[#EF7280]/30">
                  <div className="flex items-center justify-between">
                    <span className="label-caps text-[10px] text-[#EF7280]">✕ ORIGINAL BULLET (DRAFT)</span>
                    <span className="label-caps text-[10px] text-[var(--text-secondary)]">PASSIVE / VAGUE METRICS</span>
                  </div>
                  <p className="text-xs italic text-[var(--text-secondary)]">"{currentRewrite.original}"</p>
                  <p className="text-[11px] text-[#F1B65D]">{currentRewrite.impact_upgrade}</p>
                </div>

                <div className="obsidian-subpanel p-4 space-y-3 border-[#36C995]/40">
                  <div className="flex items-center justify-between">
                    <span className="label-caps text-[10px] text-[#36C995]">✓ OPTIMIZED XYZ STANDARD</span>
                    <Badge variant="emerald" size="xs">QUANTIFIED IMPACT</Badge>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                    {currentRewrite.rewritten_xyz}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="xs"
                      materialIcon="content_copy"
                      onClick={() => {
                        navigator.clipboard?.writeText(currentRewrite.rewritten_xyz);
                        showToast('Copied optimized XYZ bullet to clipboard!', 'info');
                      }}
                    >
                      Copy Optimized Bullet
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="obsidian-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">High-Impact Next Actions Checklist</h3>
              <span className="label-caps text-[10px] text-[var(--text-secondary)]">
                {(activeAnalysis.improvement_recommendations || []).length} ITEMS
              </span>
            </div>
            <div className="space-y-2.5">
              {(activeAnalysis.improvement_recommendations || []).map((rec, idx) => (
                <div key={idx} className="obsidian-subpanel p-3.5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-[4px] bg-[#786BFF]/15 border border-[#786BFF]/30 font-mono-tabular text-[11px] font-bold text-[#C5C0FF] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed">{rec}</p>
                  </div>
                  <Badge variant="cyan" size="xs">RECOMMENDED</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
