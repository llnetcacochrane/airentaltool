import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Home, X, Sparkles } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Building2;
  action: string;
  actionLabel: string;
  completed: boolean;
}

export function DashboardOnboarding() {
  const navigate = useNavigate();
  const { supabaseUser, businesses, packageType, isPropertyManager } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  useEffect(() => {
    // Check if user has dismissed onboarding
    const dismissedOnboarding = localStorage.getItem(`onboarding_dismissed_${supabaseUser?.id}`);
    if (dismissedOnboarding) {
      setDismissed(true);
      return;
    }

    // Determine what steps the user needs
    const hasBusinesses = businesses && businesses.length > 0;

    const onboardingSteps: OnboardingStep[] = [];

    // Step 1: Create first business/property (for all user types)
    if (!hasBusinesses) {
      if (isPropertyManager) {
        onboardingSteps.push({
          id: 'setup_business',
          title: 'Set up your first client',
          description: 'Add your first property management client to get started',
          icon: Building2,
          action: '/onboarding/business',
          actionLabel: 'Add Client',
          completed: false,
        });
      } else {
        // Landlord (single or multi-property)
        onboardingSteps.push({
          id: 'setup_property',
          title: 'Add your rental property',
          description: 'Get started by adding your rental property details',
          icon: Home,
          action: '/onboarding/property',
          actionLabel: 'Add Property',
          completed: false,
        });
      }
    }

    // Only show if there are incomplete steps
    if (onboardingSteps.length > 0 && onboardingSteps.some(step => !step.completed)) {
      setSteps(onboardingSteps);
    } else {
      setDismissed(true);
    }
  }, [supabaseUser, businesses, isPropertyManager]);

  const handleDismiss = () => {
    if (supabaseUser?.id) {
      localStorage.setItem(`onboarding_dismissed_${supabaseUser.id}`, 'true');
    }
    setDismissed(true);
  };

  const handleAction = (action: string) => {
    navigate(action);
  };

  if (dismissed || steps.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 animate-slideInDown">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-white opacity-10 rounded-full"></div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-white hover:text-gray-200 transition"
          aria-label="Dismiss onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Welcome to AI Rental Tools!</h2>
          </div>

          <p className="text-blue-50 mb-6">
            Let's get you set up. Complete these quick steps to start managing your properties.
          </p>

          <div className="space-y-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 flex items-center gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-white bg-opacity-30 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="text-blue-50 text-sm">{step.description}</p>
                  </div>

                  <button
                    onClick={() => handleAction(step.action)}
                    className="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 whitespace-nowrap"
                  >
                    {step.actionLabel}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-sm text-blue-100">
            <p>Need help? Check out our <a href="/help" className="underline hover:text-white">help center</a> or <a href="/quick-start" className="underline hover:text-white">quick start guide</a>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
