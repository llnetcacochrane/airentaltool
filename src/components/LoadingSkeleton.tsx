interface LoadingSkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'table' | 'list';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant = 'rectangular',
  width,
  height,
  count = 1,
  className = '',
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded';
      case 'card':
        return 'rounded-lg';
      case 'table':
        return 'h-12 rounded';
      case 'list':
        return 'h-16 rounded-lg';
      default:
        return 'rounded';
    }
  };

  const getDefaultDimensions = () => {
    if (width || height) {
      return {
        width: width || '100%',
        height: height || (variant === 'text' ? '1rem' : '100px'),
      };
    }

    switch (variant) {
      case 'text':
        return { width: '100%', height: '1rem' };
      case 'circular':
        return { width: '40px', height: '40px' };
      case 'card':
        return { width: '100%', height: '200px' };
      case 'table':
        return { width: '100%', height: '48px' };
      case 'list':
        return { width: '100%', height: '64px' };
      default:
        return { width: '100%', height: '100px' };
    }
  };

  const dimensions = getDefaultDimensions();
  const style = {
    width: typeof dimensions.width === 'number' ? `${dimensions.width}px` : dimensions.width,
    height: typeof dimensions.height === 'number' ? `${dimensions.height}px` : dimensions.height,
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${baseClasses} ${getVariantClasses()} ${className}`}
          style={style}
        />
      ))}
    </>
  );
}

// Specialized skeleton variants for common use cases

export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start gap-4">
            <LoadingSkeleton variant="circular" width={48} height={48} />
            <div className="flex-1 space-y-3">
              <LoadingSkeleton variant="text" width="60%" />
              <LoadingSkeleton variant="text" width="40%" />
              <LoadingSkeleton variant="text" width="80%" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <LoadingSkeleton variant="table" height={20} />
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="p-4">
            <LoadingSkeleton variant="table" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <LoadingSkeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton variant="text" width="70%" />
              <LoadingSkeleton variant="text" width="40%" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <LoadingSkeleton variant="text" width={200} height={32} />
          <LoadingSkeleton variant="text" width={300} height={20} />
        </div>
        <LoadingSkeleton variant="rectangular" width={120} height={40} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <LoadingSkeleton variant="text" width="50%" className="mb-4" />
            <LoadingSkeleton variant="text" width="80%" height={40} />
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <LoadingSkeleton variant="text" width="40%" className="mb-4" height={24} />
          <div className="space-y-3">
            <LoadingSkeleton variant="rectangular" height={200} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <LoadingSkeleton variant="text" width="40%" className="mb-4" height={24} />
          <ListSkeleton items={3} />
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <LoadingSkeleton variant="text" width={120} height={16} />
          <LoadingSkeleton variant="rectangular" height={40} />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <LoadingSkeleton variant="rectangular" width={100} height={40} />
        <LoadingSkeleton variant="rectangular" width={100} height={40} />
      </div>
    </div>
  );
}
