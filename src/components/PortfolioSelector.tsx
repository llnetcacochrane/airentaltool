import React, { useState, useEffect } from 'react';
import { Building2, ChevronDown, Plus, UserCheck, FolderOpen } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { useAuth } from '../context/AuthContext';
import { Portfolio, Client, portfolioService } from '../services/portfolioService';

interface PortfolioWithClient extends Portfolio {
  client?: Client;
}

export default function PortfolioSelector() {
  const { currentPortfolio, portfolios, setCurrentPortfolio, needsOrganization } = usePortfolio();
  const { isPropertyManager, currentOrganization } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Load clients for Property Managers
  useEffect(() => {
    if (isPropertyManager && currentOrganization) {
      loadClients();
    }
  }, [isPropertyManager, currentOrganization?.id]);

  const loadClients = async () => {
    if (!currentOrganization) return;
    setLoadingClients(true);
    try {
      const data = await portfolioService.getClients(currentOrganization.id);
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  // For Property Managers, always show the selector even with just 1 portfolio
  const shouldShow = isPropertyManager || (needsOrganization && portfolios.length > 1);

  if (!shouldShow) {
    return null;
  }

  const handleSelect = (portfolio: Portfolio) => {
    setCurrentPortfolio(portfolio);
    setIsOpen(false);
  };

  // Get client name for a portfolio
  const getClientForPortfolio = (portfolio: Portfolio): Client | undefined => {
    if (!portfolio.client_id) return undefined;
    return clients.find(c => c.id === portfolio.client_id);
  };

  // Get display name for current selection
  const getCurrentDisplayName = () => {
    if (!currentPortfolio) return 'Select Portfolio';

    if (isPropertyManager && currentPortfolio.client_id) {
      const client = getClientForPortfolio(currentPortfolio);
      if (client) {
        return `${client.first_name} ${client.last_name} - ${currentPortfolio.name}`;
      }
    }

    return currentPortfolio.name;
  };

  // Group portfolios by client for Property Managers
  const getGroupedPortfolios = () => {
    if (!isPropertyManager) {
      return { ungrouped: portfolios };
    }

    const grouped: { [clientId: string]: { client: Client; portfolios: Portfolio[] } } = {};
    const ungrouped: Portfolio[] = [];

    portfolios.forEach(portfolio => {
      if (portfolio.client_id) {
        const client = clients.find(c => c.id === portfolio.client_id);
        if (client) {
          if (!grouped[client.id]) {
            grouped[client.id] = { client, portfolios: [] };
          }
          grouped[client.id].portfolios.push(portfolio);
        } else {
          ungrouped.push(portfolio);
        }
      } else {
        ungrouped.push(portfolio);
      }
    });

    return { grouped, ungrouped };
  };

  const { grouped, ungrouped } = getGroupedPortfolios();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {isPropertyManager && currentPortfolio?.client_id ? (
          <UserCheck className="w-4 h-4 text-blue-600" />
        ) : (
          <Building2 className="w-4 h-4" />
        )}
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
              {isPropertyManager ? 'Client Portfolios' : 'Your Portfolios'}
            </div>

            {/* Property Manager: Group by client */}
            {isPropertyManager && grouped && Object.keys(grouped).length > 0 && (
              <>
                {Object.values(grouped).map(({ client, portfolios: clientPortfolios }) => (
                  <div key={client.id} className="border-b border-gray-100 last:border-b-0">
                    {/* Client header */}
                    <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {client.first_name} {client.last_name}
                      </span>
                      {client.company_name && (
                        <span className="text-xs text-gray-500">({client.company_name})</span>
                      )}
                    </div>
                    {/* Client's portfolios */}
                    {clientPortfolios.map((portfolio) => (
                      <button
                        key={portfolio.id}
                        onClick={() => handleSelect(portfolio)}
                        className={`w-full text-left px-4 py-2 pl-10 text-sm hover:bg-gray-50 flex items-center justify-between ${
                          currentPortfolio?.id === portfolio.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-gray-400" />
                            {portfolio.name}
                          </div>
                          {portfolio.property_count !== undefined && (
                            <div className="text-xs text-gray-400 ml-6">
                              {portfolio.property_count} {portfolio.property_count === 1 ? 'property' : 'properties'}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </>
            )}

            {/* Ungrouped portfolios (own portfolios or non-client ones) */}
            {ungrouped.length > 0 && (
              <>
                {isPropertyManager && grouped && Object.keys(grouped).length > 0 && (
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50 border-t border-gray-200">
                    Your Portfolios
                  </div>
                )}
                {ungrouped.map((portfolio) => (
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
              </>
            )}

            {/* Empty state */}
            {portfolios.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No portfolios found
              </div>
            )}

            {/* Add portfolio button */}
            <div className="border-t border-gray-200 mt-1 pt-1">
              <button
                className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                <Plus className="w-4 h-4" />
                {isPropertyManager ? 'Add Client Portfolio' : 'Add Portfolio'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
