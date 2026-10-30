import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    target_role: user?.target_role || '',
    experience_level: user?.experience_level || '',
    bio: user?.bio || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser(form);
      showToast('Profile saved!', 'success');
    } catch (err) {
      showToast('Could not update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Candidate Profile & Career Preferences</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Full Name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Target Role</label>
          <input
            type="text"
            value={form.target_role}
            onChange={(e) => setForm({ ...form, target_role: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Professional Summary</label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm"
          />
        </div>
        <Button type="submit" isLoading={saving}>Save Profile</Button>
      </form>
    </Card>
  );
}
