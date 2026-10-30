import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

export default function Settings() {
  const { theme, toggleTheme } = useAuth();
  return (
    <Card className="max-w-2xl space-y-4">
      <h2 className="text-xl font-bold">Application Settings</h2>
      <div className="flex items-center justify-between py-3 border-b border-slate-800">
        <div>
          <p className="text-sm font-semibold">Appearance Theme</p>
          <p className="text-xs text-slate-400">Current mode: {theme.toUpperCase()}</p>
        </div>
        <Button variant="secondary" onClick={toggleTheme}>
          Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </Button>
      </div>
    </Card>
  );
}
