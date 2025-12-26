import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface InlineExpanderProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  icon?: ReactNode;
  actions?: ReactNode;
  variant?: 'default' | 'card' | 'minimal';
}

export function InlineExpander({
  title,
  children,
  defaultExpanded = false,
  icon,
  actions,
  variant = 'default',
}: InlineExpanderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getVariantClasses = () => {
    switch (variant) {
      case 'card':
        return 'bg-white border border-gray-200 rounded-lg shadow-sm';
      case 'minimal':
        return 'border-b border-gray-200';
      default:
        return 'bg-gray-50 border border-gray-200 rounded-lg';
    }
  };

  return (
    <div className={getVariantClasses()}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <h3 className="font-semibold text-gray-900 text-left truncate">{title}</h3>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {actions && (
            <div onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
