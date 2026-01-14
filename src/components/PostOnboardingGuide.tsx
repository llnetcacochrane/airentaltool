import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingService } from '../services/onboardingService';
import {
  Users,
  Globe,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  CheckCircle2,
  UserPlus,
  Settings,
  FileText,
} from 'lucide-react';

interface PostOnboardingGuideProps {
  onDismiss: () => void;
}

interface GuideCard {
  id: string;
  title: string;
  description: string;
  icon: typeof Users;
  color: 'emerald' | 'purple';
  expandedContent: {
    heading: string;
    benefits: string[];
    primaryAction: {
      label: string;
      href: string;
    };
    secondaryAction?: {
      label: string;
      href: string;
    };
  };
}

export function PostOnboardingGuide({ onDismiss }: PostOnboardingGuideProps) {
  const navigate = useNavigate();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await onboardingService.dismissPostOnboarding();
      onDismiss();
    } catch (error) {
      console.error('Failed to dismiss post-onboarding:', error);
    } finally {
      setIsDismissing(false);
    }
  };

  const toggleExpand = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const handleAction = (href: string) => {
    navigate(href);
  };

  const cards: GuideCard[] = [
    {
      id: 'add_tenant',
      title: 'Add an Existing Tenant',
      description: 'Already have tenants? Add them to track leases and payments',
      icon: Users,
      color: 'emerald',
      expandedContent: {
        heading: 'Get your tenants set up quickly',
        benefits: [
          'Track lease agreements and terms',
          'Record and manage rent payments',
          'Send automated payment reminders',
          'Manage maintenance requests',
        ],
        primaryAction: {
          label: 'Add Your First Tenant',
          href: '/tenants?action=add',
        },
        secondaryAction: {
          label: 'Import Multiple Tenants',
          href: '/tenants?action=import',
        },
      },
    },
    {
      id: 'enable_website',
      title: 'Enable Your Public Website',
      description: 'Allow prospective tenants to browse and apply online',
      icon: Globe,
      color: 'purple',
      expandedContent: {
        heading: 'Start accepting online applications',
        benefits: [
          'Publish your available units online',
          'Accept rental applications 24/7',
          'Screen applicants efficiently',
          'Fill vacancies faster',
        ],
        primaryAction: {
          label: 'Enable Public Website',
          href: '/settings?tab=public-page',
        },
        secondaryAction: {
          label: 'Customize Application Form',
          href: '/application-templates',
        },
      },
    },
  ];

  const getColorClasses = (color: 'emerald' | 'purple', type: 'bg' | 'border' | 'text' | 'hover') => {
    const colors = {
      emerald: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-600',
        hover: 'hover:bg-emerald-100',
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-600',
        hover: 'hover:bg-purple-100',
      },
    };
    return colors[color][type];
  };

  return (
    <div className="mb-6 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Great job! Your setup is complete
                </h2>
                <p className="text-green-100 text-sm">
                  What would you like to do next?
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              disabled={isDismissing}
              className="text-white/70 hover:text-white transition p-1 hover:bg-white/10 rounded-lg"
              aria-label="Dismiss guide"
            >
              {isDismissing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => {
              const Icon = card.icon;
              const isExpanded = expandedCard === card.id;

              return (
                <div
                  key={card.id}
                  className={`rounded-xl border-2 transition-all duration-300 ${
                    getColorClasses(card.color, 'border')
                  } ${isExpanded ? getColorClasses(card.color, 'bg') : 'bg-white'}`}
                >
                  {/* Card Header */}
                  <button
                    onClick={() => toggleExpand(card.id)}
                    className={`w-full p-5 text-left transition-all duration-200 ${
                      getColorClasses(card.color, 'hover')
                    } rounded-xl`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          getColorClasses(card.color, 'bg')
                        } ${getColorClasses(card.color, 'text')}`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {card.title}
                        </h3>
                        <p className="text-gray-600 text-sm mt-1">
                          {card.description}
                        </p>
                      </div>
                      <div
                        className={`p-2 rounded-lg ${getColorClasses(card.color, 'bg')} ${
                          getColorClasses(card.color, 'text')
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 animate-fadeIn">
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-3">
                          {card.expandedContent.heading}
                        </h4>
                        <ul className="space-y-2 mb-5">
                          {card.expandedContent.benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle2
                                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                  getColorClasses(card.color, 'text')
                                }`}
                              />
                              {benefit}
                            </li>
                          ))}
                        </ul>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => handleAction(card.expandedContent.primaryAction.href)}
                            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-white transition-all duration-300 hover:scale-105 active:scale-95 ${
                              card.color === 'emerald'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-purple-600 hover:bg-purple-700'
                            }`}
                          >
                            {card.id === 'add_tenant' ? (
                              <UserPlus className="w-4 h-4" />
                            ) : (
                              <Settings className="w-4 h-4" />
                            )}
                            {card.expandedContent.primaryAction.label}
                          </button>
                          {card.expandedContent.secondaryAction && (
                            <button
                              onClick={() =>
                                handleAction(card.expandedContent.secondaryAction!.href)
                              }
                              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 border-2 ${
                                getColorClasses(card.color, 'border')
                              } ${getColorClasses(card.color, 'text')} ${
                                getColorClasses(card.color, 'hover')
                              }`}
                            >
                              {card.id === 'add_tenant' ? (
                                <FileText className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                              {card.expandedContent.secondaryAction.label}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dismiss link */}
          <p className="text-center text-gray-500 text-sm mt-6">
            <button
              onClick={handleDismiss}
              disabled={isDismissing}
              className="hover:text-gray-700 underline"
            >
              I'll explore on my own
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
