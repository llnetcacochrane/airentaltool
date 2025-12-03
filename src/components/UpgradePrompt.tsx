import { useState } from 'react';
import { X, TrendingUp, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  resourceType: 'business' | 'property' | 'unit' | 'tenant' | 'user';
  currentCount: number;
  maxAllowed: number;
  onClose: () => void;
}

export function UpgradePrompt({ resourceType, currentCount, maxAllowed, onClose }: UpgradePromptProps) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Limit Reached</h2>
              <p className="text-gray-600 text-sm">
                {currentCount} / {maxAllowed} {label.plural}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            You've reached your plan limit for {label.plural}. To add more, you have two options:
          </p>

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

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
