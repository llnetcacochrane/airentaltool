import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  /** Size variant: 'sm', 'md', 'lg', 'xl' */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show as full page overlay */
  fullPage?: boolean;
  /** Whether to show inline */
  inline?: boolean;
  /** Custom loading message */
  message?: string;
  /** Whether to show the message */
  showMessage?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export function LoadingSpinner({
  size = 'lg',
  fullPage = false,
  inline = false,
  message = 'Loading...',
  showMessage = true,
}: LoadingSpinnerProps) {
  const spinner = (
    <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
  );

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2">
        {spinner}
        {showMessage && <span className="text-gray-600">{message}</span>}
      </span>
    );
  }

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          {spinner}
          {showMessage && <p className="text-gray-600 font-medium">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[200px] bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        {spinner}
        {showMessage && <p className="text-gray-600 font-medium">{message}</p>}
      </div>
    </div>
  );
}

// Skeleton loading components for different content types
interface SkeletonProps {
  className?: string;
}

export function SkeletonText({ className = '' }: SkeletonProps) {
  return (
    <div className={`h-4 bg-gray-200 rounded animate-pulse ${className}`} />
  );
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 animate-pulse ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
      </div>
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ items = 6, columns = 3 }: { items?: number; columns?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Button loading state helper
interface LoadingButtonProps {
  loading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

export function LoadingButton({
  loading,
  loadingText = 'Loading...',
  children,
  className = '',
  disabled,
  type = 'button',
  onClick,
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      onClick={onClick}
      className={`relative ${className} ${loading ? 'cursor-wait' : ''}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
