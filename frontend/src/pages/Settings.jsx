import React, { useEffect, useState } from 'react';
import { authAPI, analyticsAPI, interviewAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import ProgressBar from '../components/common/ProgressBar';

export default function Settings() {
  const { user, theme, setTheme, updateUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('ai'); // general, ai, audio, integrations, security
  const [health, setHealth] = useState(null);
  const [notifPrefs, setNotifPrefs] = useState({
    email_reports: true,
    practice_reminders: true,
    voice_mode: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Password Change State
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    analyticsAPI
      .getHealth()
      .then((res) => setHealth(res.data))
      .catch(() => {});
    if (user?.notification_preferences && typeof user.notification_preferences === 'object') {
      setNotifPrefs({
        email_reports: Boolean(user.notification_preferences.email_reports ?? true),
        practice_reminders: Boolean(user.notification_preferences.practice_reminders ?? true),
        voice_mode: Boolean(user.notification_preferences.voice_mode ?? true),
      });
    }
  }, [user]);

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await updateUser({
        theme_preference: theme,
        notification_preferences: notifPrefs,
      });
      showToast('Settings and notification preferences saved to SQLite!', 'success');
    } catch (err) {
      showToast('Failed to save settings.', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }
    setChangingPwd(true);
    try {
      await authAPI.changePassword({
        current_password: pwdForm.current_password,
        new_password: pwdForm.new_password,
      });
      setPwdForm({ current_password: '', new_password: '', confirm_password: '' });
      showToast('Password updated successfully!', 'success');
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Password update failed.', 'error');
    } finally {
      setChangingPwd(false);
    }
  };

  const handleExportAllData = async () => {
    try {
      const [histRes, bmRes] = await Promise.all([
        interviewAPI.getInterviewHistory(),
        interviewAPI.listBookmarks(),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        user,
        sessions: histRes.data?.sessions || [],
        bookmarks: bmRes.data?.bookmarks || [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `account_data_export_${user?.id || 'candidate'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exported all user telemetry & transcripts (JSON)', 'info');
    } catch (err) {
      showToast('Export failed.', 'error');
    }
  };

  const isGeminiLive = Boolean(health?.gemini_configured);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={['WORKSPACE', 'SETTINGS', 'SYSTEM CONFIGURATION & INTEGRATIONS']}
        title="Account Settings, AI Engine & Integrations"
        subtitle="Configure theme appearance, verify backend AI provider status, manage browser speech preferences, and update account security."
        actions={
          <>
            <Badge variant="emerald">• BACKEND OPERATIONAL (V4.2)</Badge>
            <Button variant="primary" size="sm" isLoading={savingPrefs} materialIcon="save" onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </>
        }
      />

      {/* Horizontal Settings Section Tabs (Match Screen 17) */}
      <div className="obsidian-card p-1.5 flex flex-wrap items-center gap-1.5">
        {[
          { id: 'ai', label: 'AI Evaluator & Models', badge: 'ACTIVE' },
          { id: 'general', label: 'General & Appearance' },
          { id: 'audio', label: 'Browser Speech & Notifications' },
          { id: 'integrations', label: 'Integrations Status' },
          { id: 'security', label: 'Security & Password' },
        ].map((tb) => (
          <button
            key={tb.id}
            onClick={() => setActiveTab(tb.id)}
            className={`px-3.5 py-2 rounded-[6px] text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === tb.id
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>{tb.label}</span>
            {tb.badge && <Badge variant="violet" size="xs">{tb.badge}</Badge>}
          </button>
        ))}
      </div>

      {/* Main Two-Column Settings Workspace (Match Screen 17) */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. AI Evaluator & Engine Status Card */}
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#786BFF] text-[20px]">psychology</span>
                <div>
                  <h2 className="text-base font-semibold">AI Evaluator & Engine Calibrations</h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Real-time backend AI provider status reported by <code className="text-[#42C6D9]">GET /api/health</code>.
                  </p>
                </div>
              </div>
              <Badge variant="cyan" size="xs">
                PROTOCOL: {isGeminiLive ? 'GEMINI_LIVE' : 'DETERMINISTIC_FALLBACK'}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {/* Supported Engine 1: Google Gemini API */}
              <div
                className={`p-4 rounded-[6px] border ${
                  isGeminiLive
                    ? 'bg-[var(--bg-elevated)] border-[#36C995]'
                    : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isGeminiLive ? 'bg-[#36C995]' : 'bg-[#F1B65D]'}`} />
                    Google Gemini API (gemini-2.5-flash)
                  </span>
                  <Badge variant={isGeminiLive ? 'emerald' : 'warning'} size="xs">
                    {isGeminiLive ? 'CONNECTED & ACTIVE' : 'API KEY NOT SET'}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Server-side LLM integration validated with Pydantic JSON schemas. Configure <code className="text-[var(--text-primary)]">GEMINI_API_KEY</code> in <code className="text-[var(--text-primary)]">backend/.env</code> to enable live Gemini calls.
                </p>
              </div>

              {/* Supported Engine 2: Deterministic Rubric & NLP Fallback Engine */}
              <div
                className={`p-4 rounded-[6px] border ${
                  !isGeminiLive
                    ? 'bg-[var(--bg-elevated)] border-[#786BFF]'
                    : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#36C995]" />
                    Deterministic Rubric & NLP Engine
                  </span>
                  <Badge variant={!isGeminiLive ? 'violet' : 'emerald'} size="xs">
                    {!isGeminiLive ? 'ACTIVE ENGINE' : 'STANDBY FALLBACK'}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Built-in 7-dimension rubric, skill taxonomy matcher, and STAR heuristic analyzer. Guarantees 100% offline reliability when no external API key is provided.
                </p>
              </div>

              {/* Unintegrated External Models — Explicitly marked Not Integrated */}
              <div className="p-4 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 opacity-75">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">Claude / GPT-4o / DeepSeek</span>
                  <Badge variant="gray" size="xs">NOT INTEGRATED</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Third-party Anthropic/OpenAI/DeepSeek endpoints are not connected in this project.
                </p>
              </div>

              <div className="p-4 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 opacity-75">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">Local Ollama Endpoint</span>
                  <Badge variant="gray" size="xs">NOT CONNECTED</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Local weight server is not configured. Using the built-in FastAPI service layer.
                </p>
              </div>
            </div>
          </div>

          {/* 2. General & Theme Appearance + Browser Speech & Notification Preferences */}
          <div className="obsidian-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#42C6D9] text-[20px]">palette</span>
                <div>
                  <h2 className="text-base font-semibold">Theme Appearance, Browser Speech & Notifications</h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Persisted in your user profile via <code className="text-[#42C6D9]">PUT /api/auth/profile</code>.
                  </p>
                </div>
              </div>
              <Badge variant="emerald" size="xs">PERSISTENT</Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-[6px] border text-left cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[var(--bg-elevated)] border-[#786BFF]'
                    : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">Obsidian Telemetry (Dark Mode)</span>
                  {theme === 'dark' && <Badge variant="violet" size="xs">ACTIVE</Badge>}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Default #080D18 deep canvas with #111C2D cards and high-contrast telemetry accents.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-4 rounded-[6px] border text-left cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[var(--bg-elevated)] border-[#786BFF]'
                    : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">Daylight Compliance (Light Mode)</span>
                  {theme === 'light' && <Badge variant="violet" size="xs">ACTIVE</Badge>}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  High-legibility #F4F6FA canvas with #FFFFFF cards and #172033 typography.
                </p>
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-subtle)]">
              <label className="obsidian-subpanel p-3.5 flex items-center justify-between gap-2 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold block">Evaluation Reports</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Session summary notifications</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.email_reports}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, email_reports: e.target.checked })}
                  className="w-4 h-4 accent-[#786BFF]"
                />
              </label>

              <label className="obsidian-subpanel p-3.5 flex items-center justify-between gap-2 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold block">Practice Reminders</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Sprint milestone alerts</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.practice_reminders}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, practice_reminders: e.target.checked })}
                  className="w-4 h-4 accent-[#786BFF]"
                />
              </label>

              <label className="obsidian-subpanel p-3.5 flex items-center justify-between gap-2 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold block">Browser Voice Mode</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Web Speech API dictation & TTS</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.voice_mode}
                  onChange={(e) => setNotifPrefs({ ...notifPrefs, voice_mode: e.target.checked })}
                  className="w-4 h-4 accent-[#786BFF]"
                />
              </label>
            </div>
          </div>

          {/* 3. Connected Integrations & ATS Pipelines (Honest Not Connected / Coming Soon States) */}
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">External Integrations & ATS Pipelines</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  External third-party OAuth and ATS webhooks are not active in this local deployment.
                </p>
              </div>
              <Badge variant="gray" size="xs">ROADMAP / NOT CONNECTED</Badge>
            </div>

            <div className="space-y-2.5">
              {[
                { name: 'GitHub Repository Sync', desc: 'Direct OAuth repository indexing', status: 'NOT CONNECTED' },
                { name: 'LinkedIn Profile Import', desc: 'Automated work history ingestion (Use PDF/DOCX upload instead)', status: 'NOT CONNECTED' },
                { name: 'Google Calendar Interview Radar', desc: 'Calendar invite sync', status: 'COMING SOON' },
                { name: 'Ashby & Greenhouse ATS Gateway', desc: 'Enterprise recruiter webhook sync', status: 'NOT AVAILABLE' },
              ].map((intg) => (
                <div key={intg.name} className="obsidian-subpanel p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium text-[var(--text-primary)] block">{intg.name}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{intg.desc}</span>
                  </div>
                  <Badge variant="gray" size="xs">{intg.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Password Change, API Status, Data Export */}
        <div className="lg:col-span-4 space-y-5">
          {/* Password Change Card */}
          <form onSubmit={handlePasswordChange} className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Security & Password Change</h3>
              <Badge variant="emerald" size="xs">PBKDF2-SHA256</Badge>
            </div>
            <div>
              <label className="block label-caps text-[var(--text-secondary)] mb-1">CURRENT PASSWORD</label>
              <input
                type="password"
                required
                value={pwdForm.current_password}
                onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                className="w-full obsidian-input px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block label-caps text-[var(--text-secondary)] mb-1">NEW PASSWORD (MIN 6 CHARS)</label>
              <input
                type="password"
                required
                minLength={6}
                value={pwdForm.new_password}
                onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                className="w-full obsidian-input px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block label-caps text-[var(--text-secondary)] mb-1">CONFIRM NEW PASSWORD</label>
              <input
                type="password"
                required
                minLength={6}
                value={pwdForm.confirm_password}
                onChange={(e) => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                className="w-full obsidian-input px-3 py-2 text-xs"
              />
            </div>
            <Button type="submit" size="sm" isLoading={changingPwd} className="w-full">
              Update Account Password
            </Button>
          </form>

          {/* Developer API & Webhooks (Honest Status) */}
          <div className="obsidian-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Developer API & Webhooks</h3>
              <Badge variant="gray" size="xs">COMING SOON</Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Personal API tokens and outbound webhook signing secrets are not enabled in this release. Interactive OpenAPI documentation for local development is available at <code className="text-[#42C6D9]">/api/docs</code>.
            </p>
          </div>

          {/* Data Governance & Export */}
          <div className="obsidian-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Data Governance & Export</h3>
              <Badge variant="cyan" size="xs">USER-SCOPED SQLITE</Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Your resumes, job analyses, and interview evaluations are stored in the local SQLite database scoped to your <code className="text-[var(--text-primary)]">user_id</code>.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              materialIcon="download"
              onClick={handleExportAllData}
              className="w-full"
            >
              Export All Telemetry & Transcripts (JSON)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
