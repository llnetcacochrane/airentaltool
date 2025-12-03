import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { getFullVersionString, VERSION } from '../lib/version';

interface FooterProps {
  variant?: 'light' | 'dark';
  minimal?: boolean;
}

export function Footer({ variant = 'light', minimal = true }: FooterProps) {
  const isDark = variant === 'dark';

  const bgClass = isDark ? 'bg-gray-900' : 'bg-white';
  const borderClass = isDark ? '' : 'border-t border-gray-200';
  const textClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const subtleTextClass = isDark ? 'text-gray-500' : 'text-gray-500';
  const badgeBgClass = isDark ? 'bg-gray-800' : 'bg-gray-100';

  return (
    <footer className={`${bgClass} ${borderClass} py-4`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 text-sm">
          <p className={`${textClass} text-center md:text-left`}>
            &copy; {new Date().getFullYear()} AI Rental Tools. All rights reserved.
          </p>
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-xs">
            <span className={`font-mono ${badgeBgClass} px-2 py-1 rounded ${textClass}`}>
              {getFullVersionString()}
            </span>
            <span className={subtleTextClass}>
              Build: {VERSION.buildDate}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
