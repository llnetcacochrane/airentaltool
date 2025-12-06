import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'indigo';
  size?: 'sm' | 'md' | 'lg';
  action?: {
    label: string;
    onClick: () => void;
  };
  badge?: string;
  loading?: boolean;
}

const colorClasses = {
  blue: {
    bg: 'from-blue-50 to-sky-50',
    border: 'border-blue-200',
    icon: 'bg-blue-100 text-blue-600',
    text: 'text-blue-600',
    trend: 'text-blue-700'
  },
  green: {
    bg: 'from-green-50 to-emerald-50',
    border: 'border-green-200',
    icon: 'bg-green-100 text-green-600',
    text: 'text-green-600',
    trend: 'text-green-700'
  },
  purple: {
    bg: 'from-purple-50 to-pink-50',
    border: 'border-purple-200',
    icon: 'bg-purple-100 text-purple-600',
    text: 'text-purple-600',
    trend: 'text-purple-700'
  },
  amber: {
    bg: 'from-amber-50 to-yellow-50',
    border: 'border-amber-200',
    icon: 'bg-amber-100 text-amber-600',
    text: 'text-amber-600',
    trend: 'text-amber-700'
  },
  red: {
    bg: 'from-red-50 to-rose-50',
    border: 'border-red-200',
    icon: 'bg-red-100 text-red-600',
    text: 'text-red-600',
    trend: 'text-red-700'
  },
  indigo: {
    bg: 'from-indigo-50 to-blue-50',
    border: 'border-indigo-200',
    icon: 'bg-indigo-100 text-indigo-600',
    text: 'text-indigo-600',
    trend: 'text-indigo-700'
  }
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  color = 'blue',
  size = 'md',
  action,
  badge,
  loading = false
}: MetricCardProps) {
  const colors = colorClasses[color];

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const valueSizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl'
  };

  const iconSizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconIconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  if (loading) {
    return (
      <div className={`relative bg-gradient-to-br ${colors.bg} rounded-xl border ${colors.border} ${sizeClasses[size]} animate-pulse`}>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gradient-to-br ${colors.bg} rounded-xl border ${colors.border} ${sizeClasses[size]} hover:shadow-lg transition-all duration-300 group overflow-hidden`}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-30 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>

      {/* Badge */}
      {badge && (
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${colors.text} bg-white bg-opacity-80`}>
            {badge}
          </span>
        </div>
      )}

      <div className="relative">
        {/* Icon and Title */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className={`${iconSizeClasses[size]} rounded-lg ${colors.icon} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={iconIconSizeClasses[size]} />
          </div>
        </div>

        {/* Value */}
        <div className={`${valueSizeClasses[size]} font-bold text-gray-900 mb-2`}>
          {value}
        </div>

        {/* Trend */}
        {trend && (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
            {trend.label && (
              <span className="text-xs text-gray-600">{trend.label}</span>
            )}
          </div>
        )}

        {/* Action button */}
        {action && (
          <button
            onClick={action.onClick}
            className={`mt-4 text-sm font-semibold ${colors.text} hover:underline flex items-center gap-1`}
          >
            {action.label} →
          </button>
        )}
      </div>
    </div>
  );
}

// Skeleton loader for metric cards
export function MetricCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      ))}
    </>
  );
}
