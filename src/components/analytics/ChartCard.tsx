import { ReactNode } from 'react';
import { HelpCircle, Download, MoreVertical } from 'lucide-react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  subtitle?: string;
  tooltip?: string;
  actions?: Array<{
    label: string;
    icon?: React.ElementType;
    onClick: () => void;
  }>;
  loading?: boolean;
  error?: string;
  className?: string;
}

export function ChartCard({
  title,
  children,
  subtitle,
  tooltip,
  actions,
  loading,
  error,
  className = ''
}: ChartCardProps) {
  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-red-600">
          <div className="text-center">
            <p className="font-medium">Error loading chart</p>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {tooltip && (
              <div className="group relative">
                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-10">
                  {tooltip}
                  <div className="absolute top-full left-4 -mt-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((action, idx) => {
              const Icon = action.icon || MoreVertical;
              return (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  title={action.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}
