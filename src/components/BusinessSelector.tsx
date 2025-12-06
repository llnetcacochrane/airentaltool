import React, { useState } from 'react';
import { Building2, ChevronDown, Plus, Check, Briefcase } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { Business } from '../types';
import { BusinessWithStats } from '../services/businessService';

interface BusinessSelectorProps {
  onAddBusiness?: () => void;
}

export default function BusinessSelector({ onAddBusiness }: BusinessSelectorProps) {
  const { currentBusiness, businesses, setCurrentBusiness, hasMultipleBusinesses } = useBusiness();
  const { isPropertyManager } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show if only one business and not a property manager
  if (!hasMultipleBusinesses && !isPropertyManager) {
    return null;
  }

  const handleSelect = (business: BusinessWithStats) => {
    setCurrentBusiness(business as Business);
    setIsOpen(false);
  };

  const getCurrentDisplayName = () => {
    if (!currentBusiness) return 'Select Business';
    return currentBusiness.business_name;
  };

  // Separate owned businesses from client businesses (for property managers)
  const ownedBusinesses = businesses.filter(b => b.is_owned);
  const clientBusinesses = businesses.filter(b => !b.is_owned);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Briefcase className="w-4 h-4 text-blue-600" />
        <span className="max-w-[200px] truncate">
          {getCurrentDisplayName()}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-[70vh] overflow-y-auto">
            {/* Header */}
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
              {isPropertyManager ? 'Your Businesses' : 'Select Business'}
            </div>

            {/* Owned businesses */}
            {ownedBusinesses.length > 0 && (
              <>
                {ownedBusinesses.map((business) => (
                  <button
                    key={business.id}
                    onClick={() => handleSelect(business)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between ${
                      currentBusiness?.id === business.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        {business.business_name}
                      </div>
                      <div className="text-xs text-gray-400 ml-6">
                        {business.property_count || 0} {(business.property_count || 0) === 1 ? 'property' : 'properties'}
                        {business.city && ` - ${business.city}`}
                      </div>
                    </div>
                    {currentBusiness?.id === business.id && (
                      <Check className="w-4 h-4 text-blue-600 ml-2 flex-shrink-0" />
                    )}
                    {business.is_default && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded flex-shrink-0">
                        Default
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}

            {/* Client businesses (for property managers) */}
            {isPropertyManager && clientBusinesses.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50 border-t border-gray-200">
                  Client Businesses
                </div>
                {clientBusinesses.map((business) => (
                  <button
                    key={business.id}
                    onClick={() => handleSelect(business)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between ${
                      currentBusiness?.id === business.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {business.business_name}
                      </div>
                      <div className="text-xs text-gray-400 ml-6">
                        {business.property_count || 0} {(business.property_count || 0) === 1 ? 'property' : 'properties'}
                        {business.city && ` - ${business.city}`}
                      </div>
                    </div>
                    {currentBusiness?.id === business.id && (
                      <Check className="w-4 h-4 text-blue-600 ml-2 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </>
            )}

            {/* Empty state */}
            {businesses.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No businesses found
              </div>
            )}

            {/* Add business button */}
            {onAddBusiness && (
              <div className="border-t border-gray-200 mt-1 pt-1">
                <button
                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  onClick={() => {
                    setIsOpen(false);
                    onAddBusiness();
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Business
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
