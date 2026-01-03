import { useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Sparkles,
  ArrowUpRight,
  Check,
  X,
  Crown,
  Zap,
  TrendingUp,
  Users,
  Palette,
  BarChart3,
  Shield,
  Headphones,
  Code,
  Settings,
  Building2,
  Calculator
} from 'lucide-react';

// Feature catalog with descriptions, benefits, and tier requirements
export const FEATURE_CATALOG: Record<string, FeatureInfo> = {
  white_label: {
    name: 'White Label Branding',
    description: 'Customize the application with your own logo, colors, and branding to present a professional image to your clients.',
    benefits: [
      'Custom logo and application name',
      'Brand color customization',
      'Remove AI Rental Tools branding',
      'Professional client-facing experience'
    ],
    icon: Palette,
    availableIn: ['professional', 'management_starter', 'management_growth', 'management_professional', 'management_enterprise'],
    minTier: 'Professional',
    upgradeType: 'package',
    demoImage: '/demo/white-label-preview.png'
  },
  multi_user: {
    name: 'Team Members',
    description: 'Invite team members to help manage your properties with role-based access control.',
    benefits: [
      'Add unlimited team members',
      'Role-based permissions',
      'Activity tracking',
      'Collaborative property management'
    ],
    icon: Users,
    availableIn: ['professional', 'management_starter', 'management_growth', 'management_professional', 'management_enterprise'],
    minTier: 'Professional',
    upgradeType: 'package',
    demoImage: '/demo/team-preview.png'
  },
  advanced_reporting: {
    name: 'Advanced Analytics & Reports',
    description: 'Get deep insights into your property portfolio with advanced analytics, financial reports, and performance metrics.',
    benefits: [
      'Financial performance dashboards',
      'Occupancy rate analytics',
      'Cash flow forecasting',
      'ROI calculations',
      'Export to PDF/Excel'
    ],
    icon: BarChart3,
    availableIn: ['professional', 'management_starter', 'management_growth', 'management_professional', 'management_enterprise'],
    minTier: 'Professional',
    upgradeType: 'package',
    demoImage: '/demo/analytics-preview.png'
  },
  api_access: {
    name: 'API Access',
    description: 'Integrate AI Rental Tools with your existing systems using our comprehensive REST API.',
    benefits: [
      'Full REST API access',
      'Webhook notifications',
      'Custom integrations',
      'Automated workflows'
    ],
    icon: Code,
    availableIn: ['management_growth', 'management_professional', 'management_enterprise'],
    minTier: 'Manager Growth',
    upgradeType: 'package',
    demoImage: '/demo/api-preview.png'
  },
  priority_support: {
    name: 'Priority Support',
    description: 'Get faster response times and dedicated support for your property management needs.',
    benefits: [
      '24/7 priority support',
      'Dedicated account manager',
      'Phone support',
      'Faster response times'
    ],
    icon: Headphones,
    availableIn: ['management_growth', 'management_professional', 'management_enterprise'],
    minTier: 'Manager Growth',
    upgradeType: 'package',
    demoImage: null
  },
  rent_optimization: {
    name: 'AI Rent Optimization',
    description: 'Use AI-powered insights to optimize your rental prices based on market data and trends.',
    benefits: [
      'Market rate analysis',
      'Rent price recommendations',
      'Seasonal trend insights',
      'Competitive analysis'
    ],
    icon: TrendingUp,
    availableIn: ['professional', 'management_starter', 'management_growth', 'management_professional', 'management_enterprise'],
    minTier: 'Professional',
    upgradeType: 'package',
    demoImage: '/demo/rent-optimization-preview.png'
  },
  custom_integrations: {
    name: 'Custom Integrations',
    description: 'Connect with third-party services like accounting software, payment processors, and more.',
    benefits: [
      'QuickBooks integration',
      'Payment gateway connections',
      'Calendar sync',
      'Custom webhooks'
    ],
    icon: Settings,
    availableIn: ['management_starter', 'management_growth', 'management_professional', 'management_enterprise'],
    minTier: 'Manager Starter',
    upgradeType: 'package',
    demoImage: null
  },
  bulk_operations: {
    name: 'Bulk Operations',
    description: 'Perform actions on multiple properties, units, or tenants at once.',
    benefits: [
      'Bulk rent adjustments',
      'Mass communication',
      'Batch document generation',
      'Multi-select actions'
    ],
    icon: Zap,
    availableIn: ['professional', 'management_starter', 'management_growth', 'management_professional', 'management_enterprise'],
    minTier: 'Professional',
    upgradeType: 'package',
    demoImage: null
  },
  // Resource-based addons
  extra_property: {
    name: 'Additional Properties',
    description: 'Expand your portfolio by adding more properties to your account.',
    benefits: [
      'Manage more properties',
      'No limit on units per property',
      'Full feature access'
    ],
    icon: Building2,
    availableIn: [],
    minTier: null,
    upgradeType: 'addon',
    addonType: 'property',
    demoImage: null
  },
  extra_unit: {
    name: 'Additional Units',
    description: 'Add more rental units to your existing properties.',
    benefits: [
      'More rental units',
      'Full tenant management',
      'Payment tracking included'
    ],
    icon: Building2,
    availableIn: [],
    minTier: null,
    upgradeType: 'addon',
    addonType: 'unit',
    demoImage: null
  },
  extra_tenant: {
    name: 'Additional Tenants',
    description: 'Track more tenants across your properties.',
    benefits: [
      'More tenant records',
      'Full lease management',
      'Payment history tracking'
    ],
    icon: Users,
    availableIn: [],
    minTier: null,
    upgradeType: 'addon',
    addonType: 'tenant',
    demoImage: null
  }
};

export interface FeatureInfo {
  name: string;
  description: string;
  benefits: string[];
  icon: React.ElementType;
  availableIn: string[];
  minTier: string | null;
  upgradeType: 'package' | 'addon';
  addonType?: string;
  demoImage: string | null;
}

export type FeatureStatus = 'active' | 'upgrade_required' | 'addon_available';

interface FeatureGateProps {
  featureKey: string;
  children: ReactNode;
  // Optional: Show preview when locked (default: true)
  showPreview?: boolean;
  // Optional: Custom locked content
  lockedContent?: ReactNode;
  // Optional: Blur the content when locked
  blurWhenLocked?: boolean;
  // Optional: Show inline badge
  showBadge?: boolean;
  // Optional: Allow click-through to preview
  allowPreviewClick?: boolean;
  // Optional: Compact mode for smaller spaces
  compact?: boolean;
}

interface FeatureStatusBadgeProps {
  status: FeatureStatus;
  featureKey?: string;
  compact?: boolean;
  onClick?: () => void;
}

// Status badge component
export function FeatureStatusBadge({ status, featureKey, compact = false, onClick }: FeatureStatusBadgeProps) {
  const baseClasses = compact
    ? 'text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1'
    : 'text-sm px-3 py-1 rounded-full font-medium inline-flex items-center gap-1.5';

  if (status === 'active') {
    return (
      <span className={`${baseClasses} bg-green-100 text-green-700`}>
        <Check size={compact ? 12 : 14} />
        Active
      </span>
    );
  }

  if (status === 'addon_available') {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} bg-purple-100 text-purple-700 hover:bg-purple-200 transition cursor-pointer`}
      >
        <Zap size={compact ? 12 : 14} />
        {compact ? 'Add-on' : 'Available as Add-on'}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} bg-amber-100 text-amber-700 hover:bg-amber-200 transition cursor-pointer`}
    >
      <Crown size={compact ? 12 : 14} />
      {compact ? 'Upgrade' : 'Upgrade to Unlock'}
    </button>
  );
}

// Feature preview modal
export function FeaturePreviewModal({
  isOpen,
  onClose,
  featureKey
}: {
  isOpen: boolean;
  onClose: () => void;
  featureKey: string;
}) {
  const navigate = useNavigate();
  const feature = FEATURE_CATALOG[featureKey];

  if (!isOpen || !feature) return null;

  const Icon = feature.icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{feature.name}</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {feature.upgradeType === 'addon'
                    ? 'Available as Add-on'
                    : `Available in ${feature.minTier}+`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">{feature.description}</p>

          {/* Benefits */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">What you'll get:</h3>
            <ul className="space-y-2">
              {feature.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Demo preview image */}
          {feature.demoImage && (
            <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <div className="p-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                </div>
                <span className="text-xs text-gray-500">Preview</span>
              </div>
              <div className="p-4 flex items-center justify-center min-h-[200px]">
                <div className="text-center text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 text-blue-400" />
                  <p className="text-sm">Feature Preview</p>
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            {feature.upgradeType === 'addon' ? (
              <button
                onClick={() => {
                  onClose();
                  navigate('/addons');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition shadow-lg"
              >
                <Zap className="w-5 h-5" />
                Purchase Add-on
                <ArrowUpRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  navigate('/pricing');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
              >
                <Crown className="w-5 h-5" />
                View Upgrade Options
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Locked feature overlay
function LockedFeatureOverlay({
  featureKey,
  onClick,
  blurred = false
}: {
  featureKey: string;
  onClick: () => void;
  blurred?: boolean;
}) {
  const feature = FEATURE_CATALOG[featureKey];
  if (!feature) return null;

  const Icon = feature.icon;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm cursor-pointer z-10 transition hover:bg-white/70 ${blurred ? 'backdrop-blur-md' : ''}`}
      onClick={onClick}
    >
      <div className="text-center p-6 max-w-sm">
        <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl w-fit mx-auto mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="font-bold text-gray-900 mb-2">{feature.name}</h3>
        <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium text-sm">
          {feature.upgradeType === 'addon' ? (
            <>
              <Zap className="w-4 h-4" />
              Get Add-on
            </>
          ) : (
            <>
              <Crown className="w-4 h-4" />
              Upgrade to Unlock
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Main FeatureGate component
export function FeatureGate({
  featureKey,
  children,
  showPreview = true,
  lockedContent,
  blurWhenLocked = false,
  showBadge = false,
  allowPreviewClick = true,
  compact = false
}: FeatureGateProps) {
  const { hasFeature, packageTier } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const feature = FEATURE_CATALOG[featureKey];
  const isActive = hasFeature(featureKey);

  // Determine status
  const getStatus = (): FeatureStatus => {
    if (isActive) return 'active';
    if (feature?.upgradeType === 'addon') return 'addon_available';
    return 'upgrade_required';
  };

  const status = getStatus();

  // If active, just render children with optional badge
  if (isActive) {
    if (showBadge) {
      return (
        <div className="relative">
          <div className="absolute -top-2 -right-2 z-10">
            <FeatureStatusBadge status="active" compact={compact} />
          </div>
          {children}
        </div>
      );
    }
    return <>{children}</>;
  }

  // If locked and we have custom locked content
  if (lockedContent && !showPreview) {
    return <>{lockedContent}</>;
  }

  // Show locked preview with overlay
  if (showPreview && allowPreviewClick) {
    return (
      <>
        <div className="relative">
          {showBadge && (
            <div className="absolute -top-2 -right-2 z-20">
              <FeatureStatusBadge
                status={status}
                compact={compact}
                onClick={() => setShowModal(true)}
              />
            </div>
          )}
          <div className={blurWhenLocked ? 'blur-sm pointer-events-none' : 'opacity-50 pointer-events-none'}>
            {children}
          </div>
          <LockedFeatureOverlay
            featureKey={featureKey}
            onClick={() => setShowModal(true)}
            blurred={blurWhenLocked}
          />
        </div>
        <FeaturePreviewModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          featureKey={featureKey}
        />
      </>
    );
  }

  // Simple locked state without preview
  return (
    <>
      <div
        className="relative cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        {showBadge && (
          <div className="absolute -top-2 -right-2 z-10">
            <FeatureStatusBadge status={status} compact={compact} />
          </div>
        )}
        <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-blue-50/50 transition">
          {feature && (
            <>
              <feature.icon className="w-10 h-10 text-gray-400 mb-3" />
              <h3 className="font-semibold text-gray-700 mb-1">{feature.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{feature.description}</p>
            </>
          )}
          <FeatureStatusBadge
            status={status}
            onClick={() => setShowModal(true)}
          />
        </div>
      </div>
      <FeaturePreviewModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        featureKey={featureKey}
      />
    </>
  );
}

// Utility hook for checking feature access with status
export function useFeatureStatus(featureKey: string): {
  isActive: boolean;
  status: FeatureStatus;
  feature: FeatureInfo | undefined;
} {
  const { hasFeature } = useAuth();
  const feature = FEATURE_CATALOG[featureKey];
  const isActive = hasFeature(featureKey);

  const status: FeatureStatus = isActive
    ? 'active'
    : feature?.upgradeType === 'addon'
      ? 'addon_available'
      : 'upgrade_required';

  return { isActive, status, feature };
}

export default FeatureGate;
