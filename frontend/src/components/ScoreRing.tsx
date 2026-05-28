import React from 'react';

interface ScoreRingProps {
  score: number; // 0–100
  size?: number;
}

const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 80 }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;

  let band: string;
  let color: string;
  if (score >= 70) {
    band = 'Compliant';
    color = '#22c55e'; // green-500
  } else if (score >= 40) {
    band = 'Review';
    color = '#BA7517'; // finance/amber
  } else {
    band = 'Risk';
    color = '#E24B4A'; // danger
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className="font-mono text-lg font-bold" fill={color} fontSize={size * 0.2}>
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-xs font-medium" style={{ color }}>{band}</span>
    </div>
  );
};

export default ScoreRing;
