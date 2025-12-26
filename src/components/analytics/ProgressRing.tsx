import { useEffect, useState } from 'react';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  showValue?: boolean;
  animated?: boolean;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  label,
  showValue = true,
  animated = true
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    if (animated) {
      let currentValue = 0;
      const increment = value / 50; // 50 steps
      const interval = setInterval(() => {
        currentValue += increment;
        if (currentValue >= value) {
          setAnimatedValue(value);
          clearInterval(interval);
        } else {
          setAnimatedValue(currentValue);
        }
      }, 20);
      return () => clearInterval(interval);
    } else {
      setAnimatedValue(value);
    }
  }, [value, animated]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span className="text-2xl font-bold text-gray-900">
            {Math.round(animatedValue)}
            <span className="text-lg text-gray-600">%</span>
          </span>
        )}
        {label && (
          <span className="text-xs text-gray-600 mt-1">{label}</span>
        )}
      </div>
    </div>
  );
}

// Health score variant with color coding
export function HealthScoreRing({ score }: { score: number }) {
  const getColor = (score: number): string => {
    if (score >= 80) return '#10B981'; // green
    if (score >= 60) return '#3B82F6'; // blue
    if (score >= 40) return '#F59E0B'; // amber
    if (score >= 20) return '#F97316'; // orange
    return '#EF4444'; // red
  };

  const getLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Critical';
  };

  return (
    <div className="flex flex-col items-center">
      <ProgressRing
        value={score}
        size={140}
        strokeWidth={10}
        color={getColor(score)}
        showValue={true}
      />
      <div className="mt-4 text-center">
        <div className="text-sm font-semibold text-gray-700">Portfolio Health</div>
        <div className="text-xs text-gray-500 mt-1" style={{ color: getColor(score) }}>
          {getLabel(score)}
        </div>
      </div>
    </div>
  );
}
