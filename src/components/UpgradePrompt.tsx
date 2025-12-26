import { TrendingUp, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SlidePanel } from './SlidePanel';

interface UpgradePromptProps {
  isOpen: boolean;
  resourceType: 'business' | 'property' | 'unit' | 'tenant' | 'user';
  currentCount: number;
  maxAllowed: number;
  onClose: () => void;
}

export function UpgradePrompt({ isOpen, resourceType, currentCount, maxAllowed, onClose }: UpgradePromptProps) {
  const navigate = useNavigate();

  const resourceLabels: Record<string, { singular: string; plural: string; addon: string }> = {
    business: { singular: 'business', plural: 'businesses', addon: 'Extra Business' },
    property: { singular: 'property', plural: 'properties', addon: 'Extra Property' },
    unit: { singular: 'unit', plural: 'units', addon: 'Extra Unit' },
    tenant: { singular: 'tenant', plural: 'tenants', addon: 'Extra Tenant' },
    user: { singular: 'team member', plural: 'team members', addon: 'Extra Team Member' },
  };

  const label = resourceLabels[resourceType];

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Limit Reached"
      subtitle={`${currentCount} / ${maxAllowed} ${label.plural}`}
      size="medium"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <div className="p-3 bg-blue-100 rounded-lg">
            <TrendingUp className="text-blue-600" size={24} />
          </div>
          <p className="text-gray-700">
            You've reached your plan limit for {label.plural}. To add more, you have two options:
          </p>
        </div>

        <div className="space-y-3">
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-start gap-3">
              <Package className="text-blue-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Purchase an Add-On</h3>
                <p className="text-sm text-gray-700 mb-3">
                  Add individual {label.plural} to your account as needed. Quick and flexible.
                </p>
                <button
                  onClick={() => {
                    navigate('/addons');
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
                >
                  View Add-Ons
                </button>
              </div>
            </div>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="text-gray-600 flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Upgrade Your Plan</h3>
                <p className="text-sm text-gray-700 mb-3">
                  Get more of everything with a higher-tier plan. Better value for growing portfolios.
                </p>
                <button
                  onClick={() => {
                    navigate('/settings');
                    onClose();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition text-sm"
                >
                  View Plans
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}
