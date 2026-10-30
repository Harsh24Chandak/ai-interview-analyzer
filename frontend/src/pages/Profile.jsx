import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, resumeAPI, jobsAPI, analyticsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    target_role: '',
    experience_level: 'Entry Level (0-2 Years)',
    years_of_experience: 1,
    bio: '',
    skills: [],
    career_interests: [],
    education: [],
    experience: [],
  });

  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', year: '', grade: '' });
  const [newExp, setNewExp] = useState({ role: '', company: '', duration: '', highlights: '' });

  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfileWorkspace = async () => {
    setLoading(true);
    try {
      const [meRes, rRes, jRes, dRes] = await Promise.all([
        authAPI.getCurrentUser(),
        resumeAPI.listResumes().catch(() => ({ data: { resumes: [] } })),
        jobsAPI.listJobs().catch(() => ({ data: { job_descriptions: [] } })),
        analyticsAPI.getDashboardStats().catch(() => ({ data: { stats: {} } })),
      ]);
      const u = meRes.data?.user || user || {};
      setForm({
        full_name: u.full_name || '',
        target_role: u.target_role || 'Full Stack Software Engineer',
        experience_level: u.experience_level || 'Entry Level (0-2 Years)',
        years_of_experience: Number(u.years_of_experience ?? 1),
        bio: u.bio || '',
        skills: Array.isArray(u.skills) ? u.skills : [],
        career_interests: Array.isArray(u.career_interests) ? u.career_interests : [],
        education: Array.isArray(u.education) ? u.education : [],
        experience: Array.isArray(u.experience) ? u.experience : [],
      });
      setResumes(rRes.data?.resumes || []);
      setJobs(jRes.data?.job_descriptions || []);
      setDashStats(dRes.data?.stats || {});
    } catch (err) {
      showToast('Could not refresh profile data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileWorkspace();
  }, []);

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await updateUser({
        full_name: form.full_name.trim(),
        target_role: form.target_role.trim(),
        experience_level: form.experience_level,
        years_of_experience: Number(form.years_of_experience),
        bio: form.bio,
        skills: form.skills,
        career_interests: form.career_interests,
        education: form.education,
        experience: form.experience,
      });
      showToast('Candidate profile saved to SQLite database!', 'success');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportDossier = () => {
    const payload = {
      profile: { ...form, email: user?.email },
      resumes,
      target_job_descriptions: jobs,
      telemetry_summary: dashStats,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidate_dossier_${(form.full_name || 'candidate').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Candidate Dossier (JSON)', 'info');
  };

  if (loading) return <LoadingSkeleton label="Loading Candidate Profile & Career Workspace..." />;

  const initials = (form.full_name || 'AR')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={['WORKSPACE', 'CANDIDATE IDENTITY', 'PROFILE & CAREER INTELLIGENCE']}
        title="Candidate Profile, Target Career Vectors & Ground Truth"
        subtitle="Manage your personal profile, education, work experience, verified skills, and uploaded resumes."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              materialIcon="upload_file"
              onClick={() => navigate('/resume-analyzer')}
            >
              Upload New Resume Version
            </Button>
            <Button variant="secondary" size="sm" materialIcon="download" onClick={handleExportDossier}>
              Export Candidate Dossier (JSON)
            </Button>
            <Button variant="primary" size="sm" isLoading={saving} materialIcon="save" onClick={handleSaveProfile}>
              Save Profile Changes
            </Button>
          </>
        }
      />

      {/* Top Candidate Identity Header Card (Match Screen 16) */}
      <div className="obsidian-card p-6 grid lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#17243A] border-2 border-[#786BFF] flex items-center justify-center font-mono-tabular text-xl font-bold text-[#C5C0FF] shrink-0">
            {initials}
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{form.full_name || 'Candidate'}</h2>
              <Badge variant="cyan" size="xs">{form.target_role || 'Software Engineer'}</Badge>
              <Badge variant="emerald" size="xs">AUTHENTICATED</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span>{user?.email}</span>
              <span>•</span>
              <span>{form.years_of_experience} Year(s) Experience</span>
              <span>•</span>
              <span className="text-[#C5C0FF]">{form.experience_level}</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              {form.bio || 'Add a professional summary below to personalize your interview coaching context.'}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="obsidian-subpanel p-3 text-center">
            <span className="label-caps text-[9px] text-[var(--text-secondary)] block">READINESS</span>
            <span className="font-mono-tabular text-lg font-semibold text-[#36C995] block mt-1">
              {dashStats?.preparation_progress || 0}%
            </span>
          </div>
          <div className="obsidian-subpanel p-3 text-center">
            <span className="label-caps text-[9px] text-[var(--text-secondary)] block">RESUME SCORE</span>
            <span className="font-mono-tabular text-lg font-semibold text-[#786BFF] block mt-1">
              {dashStats?.resume_analysis_score || 0}%
            </span>
          </div>
          <div className="obsidian-subpanel p-3 text-center">
            <span className="label-caps text-[9px] text-[var(--text-secondary)] block">TECH MEAN</span>
            <span className="font-mono-tabular text-lg font-semibold text-[#42C6D9] block mt-1">
              {dashStats?.average_technical_score || 0}%
            </span>
          </div>
          <div className="obsidian-subpanel p-3 text-center">
            <span className="label-caps text-[9px] text-[var(--text-secondary)] block">SESSIONS</span>
            <span className="font-mono-tabular text-lg font-semibold text-[var(--text-primary)] block mt-1">
              {dashStats?.total_interviews_completed || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Profile Workspace */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Personal Details, Skills, Education, and Experience Editors */}
        <div className="lg:col-span-7 space-y-5">
          {/* Core Identity Form */}
          <form onSubmit={handleSaveProfile} className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#786BFF] text-[18px]">badge</span>
                <h3 className="text-base font-semibold">Core Candidate Identity</h3>
              </div>
              <Badge variant="gray" size="xs">SQLITE RECORD</Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block label-caps text-[var(--text-secondary)] mb-1">FULL NAME</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full obsidian-input px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block label-caps text-[var(--text-secondary)] mb-1">EMAIL ADDRESS (READ-ONLY)</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full obsidian-input px-3.5 py-2 text-sm opacity-60 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block label-caps text-[var(--text-secondary)] mb-1">TARGET JOB ROLE</label>
                <input
                  type="text"
                  value={form.target_role}
                  onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                  className="w-full obsidian-input px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block label-caps text-[var(--text-secondary)] mb-1">EXPERIENCE LEVEL</label>
                <select
                  value={form.experience_level}
                  onChange={(e) => setForm({ ...form, experience_level: e.target.value })}
                  className="w-full obsidian-input px-3 py-2 text-sm"
                >
                  <option value="Entry Level (0-2 Years)">Entry Level (0-2 Years)</option>
                  <option value="Mid Level (2-5 Years)">Mid Level (2-5 Years)</option>
                  <option value="Senior Level (5-8 Years)">Senior Level (5-8 Years)</option>
                  <option value="Staff / Principal (8+ Years)">Staff / Principal (8+ Years)</option>
                </select>
              </div>
              <div>
                <label className="block label-caps text-[var(--text-secondary)] mb-1">YEARS OF EXPERIENCE</label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={form.years_of_experience}
                  onChange={(e) => setForm({ ...form, years_of_experience: Number(e.target.value) })}
                  className="w-full obsidian-input px-3.5 py-2 text-sm font-mono-tabular"
                />
              </div>
            </div>

            <div>
              <label className="block label-caps text-[var(--text-secondary)] mb-1">PROFESSIONAL SUMMARY / BIO</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full obsidian-input p-3 text-xs sm:text-sm leading-relaxed"
                placeholder="Summarize your technical focus, architectural strengths, and career goals..."
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" isLoading={saving} materialIcon="save">
                Save Core Identity
              </Button>
            </div>
          </form>

          {/* Skills & Career Interests */}
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Verified Skills & Career Interests</h3>
              <span className="label-caps text-[10px] text-[#42C6D9]">{form.skills.length} SKILLS</span>
            </div>

            <div>
              <label className="block label-caps text-[var(--text-secondary)] mb-2">TECHNICAL SKILLS</label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {form.skills.map((sk, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-[4px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-mono-tabular text-[#42C6D9] inline-flex items-center gap-1.5"
                  >
                    {sk}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, skills: form.skills.filter((_, i) => i !== idx) })}
                      className="text-[var(--text-secondary)] hover:text-[#EF7280] cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a technical skill (e.g., Kubernetes, Redis, Go)..."
                  className="flex-1 obsidian-input px-3 py-1.5 text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    if (newSkill.trim()) {
                      setForm({ ...form, skills: [...form.skills, newSkill.trim()] });
                      setNewSkill('');
                    }
                  }}
                >
                  + Add Skill
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <label className="block label-caps text-[var(--text-secondary)] mb-2">CAREER INTERESTS</label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {form.career_interests.map((ci, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-[4px] bg-[#786BFF]/15 border border-[#786BFF]/30 text-xs text-[#C5C0FF] inline-flex items-center gap-1.5"
                  >
                    {ci}
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, career_interests: form.career_interests.filter((_, i) => i !== idx) })
                      }
                      className="text-[var(--text-secondary)] hover:text-[#EF7280] cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add a career interest (e.g., Distributed Systems, AI Infrastructure)..."
                  className="flex-1 obsidian-input px-3 py-1.5 text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    if (newInterest.trim()) {
                      setForm({ ...form, career_interests: [...form.career_interests, newInterest.trim()] });
                      setNewInterest('');
                    }
                  }}
                >
                  + Add Interest
                </Button>
              </div>
            </div>
          </div>

          {/* Education & Work Experience Manager */}
          <div className="obsidian-card p-5 space-y-5">
            <h3 className="text-base font-semibold">Education & Work Experience</h3>

            {/* Education List */}
            <div className="space-y-2.5">
              <span className="label-caps text-[10px] text-[#42C6D9] block">EDUCATION RECORDS</span>
              {form.education.map((ed, idx) => (
                <div key={idx} className="obsidian-subpanel p-3 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <strong className="text-[var(--text-primary)]">{ed.degree}</strong> — {ed.institution}
                    <span className="text-[var(--text-secondary)] block mt-0.5">
                      {ed.year} {ed.grade ? `• ${ed.grade}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, education: form.education.filter((_, i) => i !== idx) })}
                    className="text-[#EF7280] hover:underline text-xs cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="grid sm:grid-cols-4 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Degree (e.g. B.Tech CSE)"
                  value={newEdu.degree}
                  onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                  className="obsidian-input px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  placeholder="Institution"
                  value={newEdu.institution}
                  onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                  className="obsidian-input px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  placeholder="Year (e.g. 2022-2026)"
                  value={newEdu.year}
                  onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value })}
                  className="obsidian-input px-2.5 py-1.5 text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    if (newEdu.degree.trim()) {
                      setForm({ ...form, education: [...form.education, newEdu] });
                      setNewEdu({ degree: '', institution: '', year: '', grade: '' });
                    }
                  }}
                >
                  + Add Education
                </Button>
              </div>
            </div>

            {/* Work Experience List */}
            <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]">
              <span className="label-caps text-[10px] text-[#36C995] block">WORK EXPERIENCE RECORDS</span>
              {form.experience.map((ex, idx) => (
                <div key={idx} className="obsidian-subpanel p-3 flex items-start justify-between gap-2 text-xs">
                  <div>
                    <strong className="text-[var(--text-primary)]">{ex.role}</strong> @ {ex.company}{' '}
                    <span className="text-[var(--text-secondary)]">({ex.duration})</span>
                    {ex.highlights && <p className="text-[var(--text-secondary)] mt-1">{ex.highlights}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, experience: form.experience.filter((_, i) => i !== idx) })}
                    className="text-[#EF7280] hover:underline text-xs cursor-pointer shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="grid sm:grid-cols-3 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Role Title"
                  value={newExp.role}
                  onChange={(e) => setNewExp({ ...newExp, role: e.target.value })}
                  className="obsidian-input px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={newExp.company}
                  onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                  className="obsidian-input px-2.5 py-1.5 text-xs"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. Summer 2025)"
                  value={newExp.duration}
                  onChange={(e) => setNewExp({ ...newExp, duration: e.target.value })}
                  className="obsidian-input px-2.5 py-1.5 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Key impact highlight (optional)..."
                  value={newExp.highlights}
                  onChange={(e) => setNewExp({ ...newExp, highlights: e.target.value })}
                  className="flex-1 obsidian-input px-2.5 py-1.5 text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    if (newExp.role.trim()) {
                      setForm({ ...form, experience: [...form.experience, newExp] });
                      setNewExp({ role: '', company: '', duration: '', highlights: '' });
                    }
                  }}
                >
                  + Add Experience
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Ground Truth Resume Repository & Target Job Requisitions */}
        <div className="lg:col-span-5 space-y-5">
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#42C6D9] text-[18px]">folder_special</span>
                <h3 className="text-base font-semibold">Ground Truth Resume Repository</h3>
              </div>
              <Badge variant="gray" size="xs">SYSTEM OF RECORD</Badge>
            </div>

            {resumes.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">
                No resumes uploaded yet. Visit the Resume Analyzer to ingest a PDF, DOCX, or TXT file.
              </p>
            ) : (
              <div className="space-y-2.5">
                {resumes.slice(0, 3).map((r, i) => (
                  <div key={r.id} className="obsidian-subpanel p-3.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{r.filename}</span>
                        {i === 0 && <Badge variant="emerald" size="xs">PRIMARY ACTIVE</Badge>}
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)] block mt-0.5">
                        Uploaded {(r.created_at || '').slice(0, 10)} • {(r.file_size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <Link to="/resume-analyzer" className="text-xs text-[#42C6D9] hover:underline shrink-0">
                      Inspect →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#786BFF] text-[18px]">track_changes</span>
                <h3 className="text-base font-semibold">Target Role & Company Corridors</h3>
              </div>
              <Link to="/job-analyzer" className="text-xs text-[#42C6D9] hover:underline">
                + Add Requisition
              </Link>
            </div>

            {jobs.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">
                No job descriptions analyzed yet. Paste a target job description in the Job Compatibility workspace.
              </p>
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 3).map((jb) => (
                  <div key={jb.id} className="obsidian-subpanel p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {jb.company_name || 'Target Org'} • {jb.job_title}
                      </span>
                      <Badge variant="emerald" size="xs">{jb.match_percentage}% Match</Badge>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {jb.missing_skills?.length || 0} missing skill gap(s) • {jb.matching_skills?.length || 0} matched skills
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
