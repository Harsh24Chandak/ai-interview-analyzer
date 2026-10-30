import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading({ label = 'Loading intelligence data...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      <p className="text-sm text-slate-400 font-medium">{label}</p>
    </div>
  );
}
