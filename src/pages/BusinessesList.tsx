import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { businessService } from '../services/businessService';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Business } from '../types';
import {
  Plus, Building2, ChevronRight, AlertCircle, Zap, Upload,
  Home, Users, Wrench, DollarSign, ArrowLeft
} from 'lucide-react';
import { BusinessSetupWizard } from '../components/BusinessSetupWizard';
import { EnhancedImportWizard } from '../components/EnhancedImportWizard';

export function BusinessesList() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBusinessWizard, setShowBusinessWizard] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadBusinesses();
  }, [currentOrganization?.id]);

  const loadBusinesses = async () => {
    if (!currentOrganization) return;
    setIsLoading(true);
    try {
      const data = await businessService.getAllBusinesses(currentOrganization.id);
      setBusinesses(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading businesses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <Breadcrumbs items={[{ label: 'Businesses' }]} className="mb-2" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Businesses</h1>
              <p className="text-sm text-gray-600 mt-1">
                {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowImportWizard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
            >
              <Upload size={18} />
              Import
            </button>
            <button
              onClick={() => setShowBusinessWizard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
            >
              <Zap size={18} />
              Setup Wizard
            </button>
            <button
              onClick={() => navigate('/businesses/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus size={18} />
              New Business
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {businesses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Businesses Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Get started by adding your first business entity. Businesses help organize your properties.
            </p>
            <button
              onClick={() => setShowBusinessWizard(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Zap size={20} />
              Start Setup Wizard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {businesses.map((business) => (
              <button
                key={business.id}
                onClick={() => navigate(`/business/${business.id}`)}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200 p-6 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900 truncate">
                          {business.business_name}
                        </h3>
                        {business.is_active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>

                      {business.business_type && (
                        <p className="text-sm text-gray-600 mb-3">{business.business_type}</p>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <Home className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Properties</p>
                            <p className="text-sm font-semibold text-gray-900">0</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Tenants</p>
                            <p className="text-sm font-semibold text-gray-900">0</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <Wrench className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Open Issues</p>
                            <p className="text-sm font-semibold text-gray-900">0</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Monthly Rev</p>
                            <p className="text-sm font-semibold text-gray-900">$0</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition flex-shrink-0" />
                </div>

                {false && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-900 font-medium">2 items need attention</span>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {showBusinessWizard && (
        <BusinessSetupWizard
          onClose={() => setShowBusinessWizard(false)}
          onComplete={() => {
            setShowBusinessWizard(false);
            loadBusinesses();
          }}
        />
      )}

      {showImportWizard && (
        <EnhancedImportWizard onClose={() => setShowImportWizard(false)} />
      )}
    </div>
  );
}
