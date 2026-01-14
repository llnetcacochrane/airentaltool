import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onboardingService } from '../services/onboardingService';
import { OnboardingState } from '../types';
import {
  Building2,
  DoorClosed,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  X,
  Loader2,
} from 'lucide-react';
import { PostOnboardingGuide } from './PostOnboardingGuide';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Building2;
  completedIcon: typeof CheckCircle2;
  action: string;
  actionLabel: string;
  completed: boolean;
  stepNumber: number;
}

export function ClientOnboardingChecklist() {
  const navigate = useNavigate();
  const { supabaseUser } = useAuth();
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    loadOnboardingState();
  }, [supabaseUser?.id]);

  const loadOnboardingState = async () => {
    if (!supabaseUser?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // First sync with actual data (in case user added properties/units elsewhere)
      await onboardingService.syncWithActualData();
      const state = await onboardingService.getOnboardingState();
      setOnboardingState(state);
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await onboardingService.dismissOnboarding();
      setOnboardingState(prev => prev ? { ...prev, onboarding_dismissed: true } : null);
    } catch (error) {
      console.error('Failed to dismiss onboarding:', error);
    } finally {
      setIsDismissing(false);
    }
  };

  const handleAction = (action: string) => {
    navigate(action);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="mb-6 animate-pulse">
        <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl p-8 h-48"></div>
      </div>
    );
  }

  // Don't render if no user or state not loaded
  if (!supabaseUser || !onboardingState) {
    return null;
  }

  // If onboarding is dismissed, don't show
  if (onboardingState.onboarding_dismissed) {
    return null;
  }

  // If both steps are complete, show post-onboarding guide
  if (onboardingState.has_added_property && onboardingState.has_added_unit) {
    if (onboardingState.post_onboarding_dismissed) {
      return null;
    }
    return <PostOnboardingGuide onDismiss={() => {
      setOnboardingState(prev => prev ? { ...prev, post_onboarding_dismissed: true } : null);
    }} />;
  }

  const steps: OnboardingStep[] = [
    {
      id: 'add_property',
      title: 'Add a Property',
      description: 'Define your first rental property with address and details',
      icon: Building2,
      completedIcon: CheckCircle2,
      action: '/setup/add-property',
      actionLabel: 'Add Property',
      completed: onboardingState.has_added_property,
      stepNumber: 1,
    },
    {
      id: 'add_unit',
      title: 'Add a Unit',
      description: 'Create your first rental unit with rent and specifications',
      icon: DoorClosed,
      completedIcon: CheckCircle2,
      action: '/setup/add-unit',
      actionLabel: 'Add Unit',
      completed: onboardingState.has_added_unit,
      stepNumber: 2,
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <div className="mb-6 animate-slideInDown">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg overflow-hidden relative">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white opacity-10 rounded-full"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-white opacity-10 rounded-full"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white opacity-5 rounded-full"></div>

        {/* Progress bar */}
        <div className="h-1.5 bg-blue-400/30">
          <div
            className="h-full bg-white transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        <div className="p-6 relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Welcome! Let's Get Started</h2>
                <p className="text-blue-100 text-sm mt-0.5">
                  Complete these steps to set up your rental management
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              disabled={isDismissing}
              className="text-white/70 hover:text-white transition p-1 hover:bg-white/10 rounded-lg"
              aria-label="Dismiss onboarding"
            >
              {isDismissing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-white/80 text-sm font-medium">
              {completedCount} of {steps.length} complete
            </span>
            <div className="flex-1"></div>
            <div className="flex gap-1.5">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    step.completed
                      ? 'bg-green-400 scale-110'
                      : 'bg-white/30'
                  }`}
                ></div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="grid gap-4 md:grid-cols-2">
            {steps.map((step) => {
              const Icon = step.completed ? step.completedIcon : step.icon;
              return (
                <div
                  key={step.id}
                  className={`rounded-xl p-5 transition-all duration-300 ${
                    step.completed
                      ? 'bg-green-500/20 border border-green-400/30'
                      : 'bg-white/10 border border-white/20 hover:bg-white/15'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Step number and icon */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          step.completed
                            ? 'bg-green-400 text-green-900'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="w-7 h-7" />
                        ) : (
                          <div className="relative">
                            <Icon className="w-7 h-7" />
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-400 rounded-full text-xs font-bold flex items-center justify-center text-white">
                              {step.stepNumber}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-semibold text-lg ${
                          step.completed ? 'text-green-100' : 'text-white'
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p
                        className={`text-sm mt-1 ${
                          step.completed ? 'text-green-200/80' : 'text-blue-100'
                        }`}
                      >
                        {step.description}
                      </p>

                      {/* Action button */}
                      <button
                        onClick={() => handleAction(step.action)}
                        disabled={step.completed}
                        className={`mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                          step.completed
                            ? 'bg-green-400/30 text-green-200 cursor-default'
                            : 'bg-white text-blue-600 hover:bg-blue-50 hover:scale-105 active:scale-95 shadow-lg'
                        }`}
                      >
                        {step.completed ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Complete
                          </>
                        ) : (
                          <>
                            {step.actionLabel}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Help text */}
          <p className="text-blue-100/80 text-sm mt-6 text-center">
            Need help?{' '}
            <a href="/help" className="text-white underline hover:no-underline">
              Visit our help center
            </a>{' '}
            or{' '}
            <a href="/quick-start" className="text-white underline hover:no-underline">
              view the quick start guide
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
