import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Rocket, Building2, Home, Users, CheckCircle2, ArrowRight,
  Sparkles, FileText, Zap, TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WelcomeWizardProps {
  onClose: () => void;
}

export function WelcomeWizard({ onClose }: WelcomeWizardProps) {
  const { currentBusiness, userProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const packageTier = userProfile?.selected_tier || 'free';

  const getStepsForPackage = () => {
    switch (packageTier) {
      case 'free':
        return [
          {
            icon: Home,
            title: 'Add Your First Property',
            description: 'Start by adding a property to manage',
            action: 'Add Property',
            path: '/properties',
            color: 'blue'
          },
          {
            icon: Users,
            title: 'Add Tenants',
            description: 'Keep track of your tenants and their leases',
            action: 'Add Tenant',
            path: '/tenants',
            color: 'green'
          },
          {
            icon: CheckCircle2,
            title: 'You\'re All Set!',
            description: 'Start managing your rental properties',
            action: 'Go to Dashboard',
            path: '/dashboard',
            color: 'emerald'
          }
        ];

      case 'basic':
      case 'landlord':
        return [
          {
            icon: Building2,
            title: 'Set Up Your Organization',
            description: 'Configure your business details and settings',
            action: 'Organization Settings',
            path: '/settings',
            color: 'blue'
          },
          {
            icon: Home,
            title: 'Add Properties',
            description: 'Add your properties and units in bulk or one by one',
            action: 'Manage Properties',
            path: '/properties',
            color: 'green'
          },
          {
            icon: Users,
            title: 'Manage Tenants',
            description: 'Import or add tenant information and leases',
            action: 'View Tenants',
            path: '/tenants',
            color: 'amber'
          },
          {
            icon: TrendingUp,
            title: 'Track Finances',
            description: 'Set up payment tracking and financial reports',
            action: 'View Payments',
            path: '/payments',
            color: 'purple'
          }
        ];

      case 'professional':
      case 'management-company':
        return [
          {
            icon: Building2,
            title: 'Create Business Entities',
            description: 'Set up multiple businesses for your portfolio',
            action: 'Manage Businesses',
            path: '/businesses',
            color: 'blue'
          },
          {
            icon: Home,
            title: 'Import Properties',
            description: 'Bulk import properties, units, and owners',
            action: 'Import Data',
            path: '/properties',
            color: 'green'
          },
          {
            icon: Users,
            title: 'Tenant Portal Setup',
            description: 'Enable tenant applications and self-service portal',
            action: 'Configure Portal',
            path: '/settings',
            color: 'amber'
          },
          {
            icon: Sparkles,
            title: 'AI Features',
            description: 'Configure AI-powered rent optimization and maintenance',
            action: 'Setup AI Tools',
            path: '/rent-optimization',
            color: 'purple'
          },
          {
            icon: FileText,
            title: 'Reports & Analytics',
            description: 'Set up financial reporting and dashboards',
            action: 'View Reports',
            path: '/reports',
            color: 'indigo'
          }
        ];

      default:
        return [];
    }
  };

  const steps = getStepsForPackage();
  const currentStepData = steps[currentStep];

  const getPackageTitle = () => {
    switch (packageTier) {
      case 'free': return 'Free Tier';
      case 'basic': return 'Basic Plan';
      case 'landlord': return 'Landlord Plan';
      case 'professional': return 'Professional Plan';
      case 'management-company': return 'Management Company Plan';
      default: return 'Getting Started';
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string, text: string, ring: string, hover: string }> = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-600', ring: 'ring-blue-100', hover: 'hover:bg-blue-600' },
      green: { bg: 'bg-green-500', text: 'text-green-600', ring: 'ring-green-100', hover: 'hover:bg-green-600' },
      amber: { bg: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-100', hover: 'hover:bg-amber-600' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-600', ring: 'ring-purple-100', hover: 'hover:bg-purple-600' },
      indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', ring: 'ring-indigo-100', hover: 'hover:bg-indigo-600' },
      emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-100', hover: 'hover:bg-emerald-600' }
    };
    return colors[color] || colors.blue;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = () => {
    if (currentStepData.path === '/dashboard') {
      onClose();
    } else {
      navigate(currentStepData.path);
      onClose();
    }
  };

  const colors = getColorClasses(currentStepData?.color || 'blue');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <div className={`${colors.bg} p-8 rounded-t-2xl`}>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Welcome to AI Rental Tools!</h2>
                <p className="text-white opacity-90 text-sm">{getPackageTitle()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full flex-1 transition-all ${
                    idx <= currentStep ? 'bg-white' : 'bg-white bg-opacity-30'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-8">
            {currentStepData && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 ${colors.bg} bg-opacity-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <currentStepData.icon className={`w-8 h-8 ${colors.text}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {currentStepData.title}
                    </h3>
                    <p className="text-gray-600 text-lg">
                      {currentStepData.description}
                    </p>
                  </div>
                </div>

                {currentStep === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Quick Tip</h4>
                        <p className="text-sm text-blue-800">
                          You can complete these steps in any order. This wizard is here to guide you through the key features available in your plan.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {packageTier !== 'free' && currentStep === 0 && (
                  <div className="border-t border-gray-200 pt-6">
                    <button
                      onClick={() => {
                        navigate('/getting-started');
                        onClose();
                      }}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition"
                    >
                      <FileText size={18} />
                      View complete setup guide for your plan
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrevious}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                    >
                      Previous
                    </button>
                  )}

                  <button
                    onClick={handleAction}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 ${colors.bg} text-white rounded-lg font-semibold ${colors.hover} transition`}
                  >
                    {currentStepData.action}
                    <ArrowRight size={18} />
                  </button>

                  {currentStep < steps.length - 1 && (
                    <button
                      onClick={handleNext}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
                    >
                      Skip
                    </button>
                  )}
                </div>

                <div className="text-center pt-4 border-t border-gray-200">
                  <button
                    onClick={onClose}
                    className="text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    I'll set this up later
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
