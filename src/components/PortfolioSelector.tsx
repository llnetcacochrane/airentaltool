import React, { useState } from 'react';
import { Building2, ChevronDown, Plus } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { Portfolio } from '../services/portfolioService';

export default function PortfolioSelector() {
  const { currentPortfolio, portfolios, setCurrentPortfolio, needsOrganization } = usePortfolio();
  const [isOpen, setIsOpen] = useState(false);

  if (!needsOrganization || portfolios.length <= 1) {
    return null;
  }

  const handleSelect = (portfolio: Portfolio) => {
    setCurrentPortfolio(portfolio);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Building2 className="w-4 h-4" />
        <span className="max-w-[200px] truncate">
          {currentPortfolio?.name || 'Select Portfolio'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
              Your Portfolios
            </div>
            {portfolios.map((portfolio) => (
              <button
                key={portfolio.id}
                onClick={() => handleSelect(portfolio)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  currentPortfolio?.id === portfolio.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{portfolio.name}</div>
                  {portfolio.description && (
                    <div className="text-xs text-gray-500 truncate">{portfolio.description}</div>
                  )}
                  {portfolio.property_count !== undefined && (
                    <div className="text-xs text-gray-400">
                      {portfolio.property_count} {portfolio.property_count === 1 ? 'property' : 'properties'}
                    </div>
                  )}
                </div>
                {portfolio.is_default && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                    Default
                  </span>
                )}
              </button>
            ))}
            <div className="border-t border-gray-200 mt-1 pt-1">
              <button
                className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                <Plus className="w-4 h-4" />
                Add Portfolio
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
