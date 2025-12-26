import { useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { getAnimationDuration } from '../utils/animations';

interface PageTransitionProps {
  children: ReactNode;
  type?: 'fade' | 'slideUp' | 'slideRight' | 'scale';
}

/**
 * PageTransition component provides smooth page transitions
 * Respects prefers-reduced-motion for accessibility
 */
export function PageTransition({ children, type = 'fade' }: PageTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'entering' | 'entered' | 'exiting'>('entered');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('exiting');
    }
  }, [location, displayLocation]);

  useEffect(() => {
    if (transitionStage === 'exiting') {
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('entering');
      }, getAnimationDuration(300));
      return () => clearTimeout(timer);
    } else if (transitionStage === 'entering') {
      const timer = setTimeout(() => {
        setTransitionStage('entered');
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [transitionStage, location]);

  const getTransitionClass = () => {
    const baseClasses = 'transition-all duration-300 ease-in-out';

    if (transitionStage === 'exiting') {
      return `${baseClasses} opacity-0`;
    }

    if (transitionStage === 'entering') {
      switch (type) {
        case 'slideUp':
          return `${baseClasses} opacity-0 translate-y-4`;
        case 'slideRight':
          return `${baseClasses} opacity-0 -translate-x-4`;
        case 'scale':
          return `${baseClasses} opacity-0 scale-95`;
        default: // fade
          return `${baseClasses} opacity-0`;
      }
    }

    // entered
    return `${baseClasses} opacity-100 translate-y-0 translate-x-0 scale-100`;
  };

  return (
    <div className={getTransitionClass()}>
      {children}
    </div>
  );
}

/**
 * FadeIn component for simple fade-in animations
 */
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, duration = 300, className = '' }: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, getAnimationDuration(delay));
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transition-opacity ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDuration: `${getAnimationDuration(duration)}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * SlideIn component for slide animations
 */
interface SlideInProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  className?: string;
}

export function SlideIn({
  children,
  direction = 'up',
  delay = 0,
  duration = 300,
  className = ''
}: SlideInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, getAnimationDuration(delay));
    return () => clearTimeout(timer);
  }, [delay]);

  const getTransform = () => {
    if (isVisible) return 'translate(0, 0)';

    switch (direction) {
      case 'up': return 'translate(0, 20px)';
      case 'down': return 'translate(0, -20px)';
      case 'left': return 'translate(20px, 0)';
      case 'right': return 'translate(-20px, 0)';
      default: return 'translate(0, 20px)';
    }
  };

  return (
    <div
      className={`transition-all ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transitionDuration: `${getAnimationDuration(duration)}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * StaggeredList component for staggered animations
 */
interface StaggeredListProps {
  children: ReactNode[];
  staggerDelay?: number;
  className?: string;
}

export function StaggeredList({ children, staggerDelay = 50, className = '' }: StaggeredListProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <FadeIn key={index} delay={index * staggerDelay}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}
