import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { businessService, BusinessWithStats } from '../services/businessService';
import { supabase } from '../lib/supabase';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Business } from '../types';
import {
  Plus, Building2, ChevronRight, AlertCircle, Zap, Upload,
  Home, Users, Wrench, DollarSign, ArrowLeft, Lock, DoorClosed
} from 'lucide-react';
import { EnhancedImportWizard } from '../components/EnhancedImportWizard';

interface BusinessStats {
  properties: number;
  units: number;
  tenants: number;
  maintenance: number;
}

export function BusinessesList() {
  const [businesses, setBusinesses] = useState<BusinessWithStats[]>([]);
  const [businessStats, setBusinessStats] = useState<Record<string, BusinessStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const { currentBusiness, userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    setIsLoading(true);
    try {
      const data = await businessService.getUserBusinesses();
      setBusinesses(data);

      // Load stats for each business
      const stats: Record<string, BusinessStats> = {};
      for (const business of data) {
        stats[business.id] = await loadBusinessStats(business.id);
      }
      setBusinessStats(stats);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBusinessStats = async (businessId: string): Promise<BusinessStats> => {
    try {
      // Get properties count
      const { count: propertiesCount } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('is_active', true);

      // Get properties to count units
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .eq('business_id', businessId)
        .eq('is_active', true);

      const propertyIds = properties?.map(p => p.id) || [];

      let unitsCount = 0;
      let tenantsCount = 0;
      let maintenanceCount = 0;

      if (propertyIds.length > 0) {
        // Get units count
        const { data: units } = await supabase
          .from('units')
          .select('id')
          .in('property_id', propertyIds)
          .eq('is_active', true);

        unitsCount = units?.length || 0;
        const unitIds = units?.map(u => u.id) || [];

        // Get tenants count via unit_tenant_access
        if (unitIds.length > 0) {
          const { count: tenantCount } = await supabase
            .from('unit_tenant_access')
            .select('tenant_id', { count: 'exact', head: true })
            .in('unit_id', unitIds)
            .eq('is_active', true);

          tenantsCount = tenantCount || 0;
        }

        // Get open maintenance requests
        const { count: maintenanceOpenCount } = await supabase
          .from('maintenance_requests')
          .select('id', { count: 'exact', head: true })
          .in('property_id', propertyIds)
          .not('status', 'in', '(completed,cancelled)');

        maintenanceCount = maintenanceOpenCount || 0;
      }

      return {
        properties: propertiesCount || 0,
        units: unitsCount,
        tenants: tenantsCount,
        maintenance: maintenanceCount,
      };
    } catch (err) {
      console.error('Error loading business stats:', err);
      return { properties: 0, units: 0, tenants: 0, maintenance: 0 };
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

  const packageTier = userProfile?.selected_tier || 'free';
  const isFree = packageTier === 'free';
  const isBasicOrLandlord = packageTier === 'basic' || packageTier === 'landlord';
  const canManageBusinesses = ['basic', 'landlord', 'professional', 'management-company'].includes(packageTier);

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
            <div className="flex-1">
              <Breadcrumbs items={[{ label: 'Businesses' }]} className="mb-2" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isBasicOrLandlord ? 'My Business' : 'My Businesses'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {isFree ? (
                  <span className="flex items-center gap-1">
                    <Lock size={14} />
                    Upgrade to a paid plan to manage business entities
                  </span>
                ) : (
                  <>
                    {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'}
                    {isBasicOrLandlord && ' (Landlord Plan: 1 business entity)'}
                  </>
                )}
              </p>
            </div>
          </div>

          {!isFree && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowImportWizard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              >
                <Upload size={18} />
                Import
              </button>
              {(!isBasicOrLandlord || businesses.length === 0) && (
                <button
                  onClick={() => navigate('/quick-start')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  <Zap size={18} />
                  {businesses.length > 0 ? 'Add Another Business' : 'Property Wizard'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {isFree ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Business Entities Available in Paid Plans</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Upgrade to the Landlord Plan or higher to organize your properties under business entities for better accounting and tax management.
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              View Plans
              <ChevronRight size={18} />
            </button>
          </div>
        ) : businesses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Businesses Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Get started by adding your first business entity. Businesses help organize your properties.
            </p>
            <button
              onClick={() => navigate('/quick-start')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Zap size={20} />
              Start Property Wizard
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
                            <p className="text-sm font-semibold text-gray-900">
                              {businessStats[business.id]?.properties || 0}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <DoorClosed className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Units</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {businessStats[business.id]?.units || 0}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Tenants</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {businessStats[business.id]?.tenants || 0}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <Wrench className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Open Issues</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {businessStats[business.id]?.maintenance || 0}
                            </p>
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

      <EnhancedImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
      />
    </div>
  );
}
