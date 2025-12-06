import { ReactNode, useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';

interface TooltipProps {
  content: string | ReactNode;
  children?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  icon?: 'help' | 'info' | 'custom';
  customIcon?: ReactNode;
  maxWidth?: string;
  delay?: number;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  icon = 'help',
  customIcon,
  maxWidth = 'w-64',
  delay = 200
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => setShow(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setShow(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 rotate-180',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1 rotate-90',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1 -rotate-90'
  };

  const defaultIcon = icon === 'help' ? (
    <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition" />
  ) : (
    <Info className="w-4 h-4 text-blue-400 hover:text-blue-600 cursor-help transition" />
  );

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger */}
      {children || customIcon || defaultIcon}

      {/* Tooltip */}
      {show && (
        <div
          className={`absolute ${positionClasses[position]} ${maxWidth} z-50 animate-fadeIn`}
          role="tooltip"
        >
          <div className="bg-gray-900 text-white text-sm p-3 rounded-lg shadow-xl">
            {content}
            {/* Arrow */}
            <div className={`absolute ${arrowClasses[position]} w-2 h-2 bg-gray-900 transform rotate-45`}></div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline help text with icon
export function HelpText({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-blue-900">{children}</div>
    </div>
  );
}

// Feature hint - for onboarding new users
export function FeatureHint({
  title,
  description,
  onDismiss
}: {
  title: string;
  description: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="relative bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 shadow-sm">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition"
        >
          ×
        </button>
      )}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 pr-6">
          <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
          <p className="text-sm text-gray-700">{description}</p>
        </div>
      </div>
    </div>
  );
}
