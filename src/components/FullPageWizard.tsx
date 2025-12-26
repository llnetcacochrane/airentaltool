import { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WizardStep {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  isValid?: boolean;
}

interface FullPageWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
  onStepChange?: (step: number) => void;
  isLoading?: boolean;
  error?: string;
  completionPath?: string;
  showProgress?: boolean;
  showStepList?: boolean;
  headerContent?: ReactNode;
  allowSkip?: boolean;
}

export function FullPageWizard({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onComplete,
  onStepChange,
  isLoading = false,
  error,
  completionPath,
  showProgress = true,
  showStepList = true,
  headerContent,
  allowSkip = false,
}: FullPageWizardProps) {
  const navigate = useNavigate();
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      if (onComplete) {
        onComplete();
      } else if (completionPath) {
        navigate(completionPath);
      }
    } else if (onNext) {
      onNext();
    } else if (onStepChange) {
      onStepChange(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else if (onStepChange) {
      onStepChange(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep && onStepChange) {
      onStepChange(stepIndex);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {headerContent}

          {showProgress && (
            <div className="mt-4">
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>

              {/* Step counter */}
              <div className="mt-2 text-sm text-gray-600 text-center">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Step list sidebar - hidden on mobile */}
        {showStepList && (
          <div className="hidden lg:block w-64 bg-white border-r border-gray-200 p-6">
            <nav className="space-y-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(index)}
                  disabled={index > currentStep}
                  className={`
                    w-full text-left px-4 py-3 rounded-lg transition flex items-start gap-3
                    ${index === currentStep
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : index < currentStep
                      ? 'text-gray-700 hover:bg-gray-50'
                      : 'text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {index < currentStep ? (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    ) : (
                      <div className={`
                        w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold
                        ${index === currentStep
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                        }
                      `}>
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{step.title}</div>
                    {step.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {step.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            {/* Current step title */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {currentStepData.title}
              </h1>
              {currentStepData.description && (
                <p className="mt-2 text-gray-600">{currentStepData.description}</p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Step content */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              {currentStepData.content}
            </div>
          </div>

          {/* Footer navigation */}
          <div className="bg-white border-t border-gray-200 sticky bottom-0">
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={handlePrevious}
                  disabled={isFirstStep || isLoading}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition
                    ${isFirstStep || isLoading
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-3">
                  {allowSkip && !isLastStep && (
                    <button
                      onClick={handleNext}
                      disabled={isLoading}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition"
                    >
                      Skip
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    disabled={isLoading || (currentStepData.isValid === false)}
                    className={`
                      flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition
                      ${isLoading || currentStepData.isValid === false
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : isLastStep
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }
                    `}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        <span>Processing...</span>
                      </>
                    ) : isLastStep ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Complete</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
