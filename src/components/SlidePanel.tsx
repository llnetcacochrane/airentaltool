import { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large' | 'full';
  footer?: ReactNode;
  showCloseButton?: boolean;
}

export function SlidePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'medium',
  footer,
  showCloseButton = true,
}: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchEndY - touchStartY.current;
    const deltaX = touchEndX - touchStartX.current;

    if (window.innerWidth < 768 && deltaY > 100 && Math.abs(deltaX) < 50) {
      onClose();
    }

    if (window.innerWidth >= 768 && deltaX > 100 && Math.abs(deltaY) < 50) {
      onClose();
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'md:max-w-md';
      case 'medium':
        return 'md:max-w-2xl';
      case 'large':
        return 'md:max-w-4xl';
      case 'full':
        return 'md:max-w-full';
      default:
        return 'md:max-w-2xl';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Enhanced backdrop with smooth fade */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 flex items-end md:items-stretch md:justify-end">
          <div
            ref={panelRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`
              relative w-full ${getSizeClasses()}
              h-[90vh] md:h-full
              bg-white
              shadow-xl
              transform transition-all duration-300 ease-out
              flex flex-col
              ${isOpen
                ? 'translate-y-0 md:translate-x-0 opacity-100'
                : 'translate-y-full md:translate-y-0 md:translate-x-full opacity-0'
              }
            `}
          >
            <div className="md:hidden flex justify-center py-2 bg-gray-50 rounded-t-2xl">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {(title || showCloseButton) && (
              <div className="flex items-start justify-between px-4 md:px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="ml-4 text-gray-400 hover:text-gray-600 transition flex-shrink-0 p-2 -mr-2"
                    aria-label="Close panel"
                  >
                    <X className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
              {children}
            </div>

            {footer && (
              <div className="border-t border-gray-200 px-4 md:px-6 py-4 bg-gray-50 sticky bottom-0">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
