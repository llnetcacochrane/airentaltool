import { ReactNode } from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ModernLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
    variant?: 'primary' | 'secondary';
  };
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  backButton?: boolean;
}

export function ModernLayout({
  children,
  title,
  subtitle,
  action,
  breadcrumbs,
  backButton = false,
}: ModernLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-2 mb-4 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight size={14} className="text-gray-400" />}
                  {crumb.href ? (
                    <button
                      onClick={() => navigate(crumb.href!)}
                      className="text-gray-600 hover:text-gray-900 transition"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-gray-900 font-medium">{crumb.label}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {backButton && (
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <ArrowLeft size={20} className="text-gray-600" />
                </button>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
                {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
              </div>
            </div>

            {action && (
              <button
                onClick={action.onClick}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium ${
                  action.variant === 'secondary'
                    ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</div>
    </div>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({ children, className = '', padding = 'md', hover = false }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 ${
        hover ? 'hover:shadow-md transition' : ''
      } ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  onClick?: () => void;
  subtitle?: string;
}

export function StatsCard({ title, value, icon, color, onClick, subtitle }: StatsCardProps) {
  const colors = {
    blue: {
      bg: 'bg-blue-100',
      hoverBg: 'group-hover:bg-blue-200',
      text: 'text-blue-600',
      border: 'border-blue-200',
    },
    green: {
      bg: 'bg-green-100',
      hoverBg: 'group-hover:bg-green-200',
      text: 'text-green-600',
      border: 'border-green-200',
    },
    amber: {
      bg: 'bg-amber-100',
      hoverBg: 'group-hover:bg-amber-200',
      text: 'text-amber-600',
      border: 'border-amber-200',
    },
    red: {
      bg: 'bg-red-100',
      hoverBg: 'group-hover:bg-red-200',
      text: 'text-red-600',
      border: 'border-red-200',
    },
    purple: {
      bg: 'bg-purple-100',
      hoverBg: 'group-hover:bg-purple-200',
      text: 'text-purple-600',
      border: 'border-purple-200',
    },
  };

  const colorClasses = colors[color];
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`group bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-left ${
        onClick ? `hover:shadow-md hover:border-${color}-200 transition cursor-pointer` : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-lg ${colorClasses.bg} ${
            onClick ? colorClasses.hoverBg : ''
          } flex items-center justify-center transition`}
        >
          <div className={colorClasses.text}>{icon}</div>
        </div>
        {onClick && <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />}
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </Component>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 sm:py-16">
      <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
