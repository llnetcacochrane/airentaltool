import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  CreditCard,
  Wrench,
  FileText,
  Plus,
  ArrowRight,
  Play,
  BookOpen,
  Lightbulb,
  Sparkles,
} from 'lucide-react';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
  icon?: React.ReactNode;
}

interface EmptyStateTip {
  title: string;
  description: string;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  tips?: EmptyStateTip[];
  videoUrl?: string;
  docsUrl?: string;
  variant?: 'default' | 'minimal' | 'card';
}

const defaultIcons: Record<string, React.ReactNode> = {
  properties: <Building2 className="w-12 h-12 text-gray-300" />,
  tenants: <Users className="w-12 h-12 text-gray-300" />,
  payments: <CreditCard className="w-12 h-12 text-gray-300" />,
  maintenance: <Wrench className="w-12 h-12 text-gray-300" />,
  documents: <FileText className="w-12 h-12 text-gray-300" />,
};

export function EmptyState({
  icon,
  title,
  description,
  actions = [],
  tips = [],
  videoUrl,
  docsUrl,
  variant = 'default',
}: EmptyStateProps) {
  const renderActions = () => (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      {actions.map((action, index) => {
        const baseClasses = `inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition`;
        const primaryClasses = `bg-blue-600 text-white hover:bg-blue-700`;
        const secondaryClasses = `bg-white text-gray-700 border border-gray-300 hover:bg-gray-50`;

        if (action.href) {
          return (
            <Link
              key={index}
              to={action.href}
              className={`${baseClasses} ${action.primary ? primaryClasses : secondaryClasses}`}
            >
              {action.icon || (action.primary && <Plus className="w-5 h-5" />)}
              {action.label}
            </Link>
          );
        }

        return (
          <button
            key={index}
            onClick={action.onClick}
            className={`${baseClasses} ${action.primary ? primaryClasses : secondaryClasses}`}
          >
            {action.icon || (action.primary && <Plus className="w-5 h-5" />)}
            {action.label}
          </button>
        );
      })}
    </div>
  );

  if (variant === 'minimal') {
    return (
      <div className="text-center py-8">
        {icon && <div className="mx-auto mb-4">{icon}</div>}
        <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        {actions.length > 0 && renderActions()}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        {icon && <div className="mx-auto mb-4">{icon}</div>}
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
        {actions.length > 0 && renderActions()}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Main Content */}
      <div className="px-6 py-12 sm:px-12 sm:py-16 text-center">
        {icon && <div className="mx-auto mb-6">{icon}</div>}
        <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
        <p className="text-gray-600 mb-8 max-w-lg mx-auto">{description}</p>

        {actions.length > 0 && <div className="mb-8">{renderActions()}</div>}

        {/* Quick Start Resources */}
        {(videoUrl || docsUrl) && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 pt-8 border-t border-gray-100">
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Play className="w-4 h-4" />
                Watch Tutorial
              </a>
            )}
            {docsUrl && (
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <BookOpen className="w-4 h-4" />
                Read Documentation
              </a>
            )}
          </div>
        )}
      </div>

      {/* Tips Section */}
      {tips.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-8 sm:px-12">
          <div className="flex items-center gap-2 text-blue-700 mb-4">
            <Lightbulb className="w-5 h-5" />
            <h3 className="font-semibold">Quick Tips</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tips.map((tip, index) => (
              <div key={index} className="bg-white bg-opacity-60 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 text-sm mb-1">{tip.title}</h4>
                <p className="text-gray-600 text-xs">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export const EmptyStatePresets = {
  Properties: (onAdd?: () => void) => (
    <EmptyState
      icon={<Building2 className="w-16 h-16 text-blue-200" />}
      title="No Properties Yet"
      description="Start by adding your first rental property. You can add single-family homes, multi-unit buildings, or any other property type."
      actions={[
        {
          label: 'Add Your First Property',
          onClick: onAdd,
          primary: true,
        },
        {
          label: 'Import Properties',
          href: '/properties?import=true',
          icon: <ArrowRight className="w-4 h-4" />,
        },
      ]}
      tips={[
        {
          title: 'Start Simple',
          description: 'Add one property first to learn the system, then add more.',
        },
        {
          title: 'Include Units',
          description: 'For multi-unit buildings, add units after creating the property.',
        },
        {
          title: 'Upload Photos',
          description: 'Property photos help with listings and tenant communication.',
        },
      ]}
      docsUrl="/getting-started"
    />
  ),

  Tenants: (onAdd?: () => void) => (
    <EmptyState
      icon={<Users className="w-16 h-16 text-green-200" />}
      title="No Tenants Yet"
      description="Add tenants to your properties to start tracking leases, collecting rent, and managing your rentals effectively."
      actions={[
        {
          label: 'Add Tenant',
          onClick: onAdd,
          primary: true,
        },
        {
          label: 'Send Rental Application',
          href: '/applications',
          icon: <FileText className="w-4 h-4" />,
        },
      ]}
      tips={[
        {
          title: 'Invite to Portal',
          description: 'Send tenants an invitation to access their self-service portal.',
        },
        {
          title: 'Set Up Auto-Reminders',
          description: 'Configure automatic rent reminders to reduce late payments.',
        },
        {
          title: 'Track Lease Dates',
          description: 'Add lease start and end dates to get expiration alerts.',
        },
      ]}
    />
  ),

  Payments: () => (
    <EmptyState
      icon={<CreditCard className="w-16 h-16 text-purple-200" />}
      title="No Payment Records"
      description="Payment records will appear here as you track rent payments from your tenants. You can also manually record cash or check payments."
      actions={[
        {
          label: 'Record a Payment',
          href: '/payments?action=add',
          primary: true,
        },
      ]}
      tips={[
        {
          title: 'Track All Payments',
          description: 'Record cash, checks, and digital payments for complete records.',
        },
        {
          title: 'Auto-Generate Receipts',
          description: 'Automatically send payment confirmations to tenants.',
        },
        {
          title: 'View Reports',
          description: 'Access payment history and financial reports anytime.',
        },
      ]}
    />
  ),

  Maintenance: (onAdd?: () => void) => (
    <EmptyState
      icon={<Wrench className="w-16 h-16 text-amber-200" />}
      title="No Maintenance Requests"
      description="Maintenance requests from tenants will appear here. You can also create work orders for preventive maintenance or property improvements."
      actions={[
        {
          label: 'Create Work Order',
          onClick: onAdd,
          primary: true,
        },
      ]}
      tips={[
        {
          title: 'Tenant Portal',
          description: 'Tenants can submit requests directly through their portal.',
        },
        {
          title: 'Track Progress',
          description: 'Update status and keep tenants informed automatically.',
        },
        {
          title: 'Vendor Management',
          description: 'Save contractor info for quick assignment.',
        },
      ]}
    />
  ),

  Applications: () => (
    <EmptyState
      icon={<FileText className="w-16 h-16 text-indigo-200" />}
      title="No Applications Yet"
      description="Create a listing for your vacant units to start receiving rental applications online. You can customize your application form and screen applicants."
      actions={[
        {
          label: 'Create Listing',
          href: '/applications?action=create-listing',
          primary: true,
        },
      ]}
      tips={[
        {
          title: 'Customize Forms',
          description: 'Add custom questions to your application form.',
        },
        {
          title: 'Screen Applicants',
          description: 'Use AI-powered scoring to evaluate applications.',
        },
        {
          title: 'Convert to Tenant',
          description: 'Easily convert approved applicants to tenants.',
        },
      ]}
    />
  ),

  Agreements: () => (
    <EmptyState
      icon={<FileText className="w-16 h-16 text-teal-200" />}
      title="No Agreements Yet"
      description="Create lease agreements and other documents for your tenants to sign electronically. Signed documents are stored securely."
      actions={[
        {
          label: 'Create Agreement',
          href: '/agreements?action=create',
          primary: true,
        },
      ]}
      tips={[
        {
          title: 'Templates',
          description: 'Use pre-built templates or create your own.',
        },
        {
          title: 'E-Signatures',
          description: 'Tenants can sign documents from any device.',
        },
        {
          title: 'Automatic Storage',
          description: 'Signed documents are saved to the tenant record.',
        },
      ]}
    />
  ),

  Expenses: () => (
    <EmptyState
      icon={<CreditCard className="w-16 h-16 text-red-200" />}
      title="No Expenses Recorded"
      description="Track property expenses for tax reporting and financial analysis. Record repairs, utilities, insurance, and other costs."
      actions={[
        {
          label: 'Add Expense',
          href: '/expenses?action=add',
          primary: true,
        },
      ]}
      tips={[
        {
          title: 'Categorize Expenses',
          description: 'Use categories for easier tax preparation.',
        },
        {
          title: 'Attach Receipts',
          description: 'Upload receipt photos for documentation.',
        },
        {
          title: 'Link to Properties',
          description: 'Assign expenses to specific properties or units.',
        },
      ]}
    />
  ),

  Reports: () => (
    <EmptyState
      icon={<Sparkles className="w-16 h-16 text-yellow-200" />}
      title="Ready to Generate Reports"
      description="Once you have properties and transactions, you'll be able to generate income statements, expense reports, and portfolio analytics."
      actions={[
        {
          label: 'Add Your First Property',
          href: '/properties',
          primary: true,
        },
      ]}
      tips={[
        {
          title: 'Income Statements',
          description: 'View rent collection and vacancy reports.',
        },
        {
          title: 'Expense Tracking',
          description: 'Analyze expenses by category and property.',
        },
        {
          title: 'Portfolio Health',
          description: 'Monitor occupancy rates and payment trends.',
        },
      ]}
    />
  ),
};
