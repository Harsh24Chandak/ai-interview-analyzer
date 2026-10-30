import React from 'react';

export default function ScoreRing({
  score = 0,
  size = 96,
  strokeWidth = 7,
  label = '',
  sublabel = '',
  variant = 'violet',
}) {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  const strokeColors = {
    violet: '#786BFF',
    cyan: '#42C6D9',
    emerald: '#36C995',
    amber: '#F1B65D',
    rose: '#EF7280',
  };
  const activeColor =
    normalized >= 85
      ? '#36C995'
      : normalized >= 70
      ? strokeColors[variant] || '#786BFF'
      : normalized >= 50
      ? '#F1B65D'
      : '#EF7280';

  return (
    <div className="inline-flex flex-col items-center justify-center relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#17243A"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono-tabular font-semibold text-[var(--text-primary)] leading-none" style={{ fontSize: size >= 110 ? '26px' : size >= 80 ? '20px' : '14px' }}>
          {normalized}{label === '%' ? '%' : ''}
        </span>
        {sublabel && (
          <span className="label-caps text-[9px] text-[var(--text-secondary)] mt-1">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
