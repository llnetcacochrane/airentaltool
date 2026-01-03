import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  Home, ChevronRight, Building2, DoorClosed, Users,
  Wrench, ArrowLeft, MapPin, AlertCircle
} from 'lucide-react';

interface PropertyWithBusiness {
  id: string;
  property_name: string;
  address_line1?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  property_type?: string;
  is_active: boolean;
  business_id: string;
  business_name: string;
  public_page_slug?: string;
}

interface PropertyStats {
  units: number;
  tenants: number;
  maintenance: number;
  vacant: number;
}

export function PropertiesList() {
  const [properties, setProperties] = useState<PropertyWithBusiness[]>([]);
  const [propertyStats, setPropertyStats] = useState<Record<string, PropertyStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    setIsLoading(true);
    try {
      // Get all properties with their business info
      const { data, error: queryError } = await supabase
        .from('properties')
        .select(`
          id,
          property_name,
          address_line1,
          city,
          state,
          zip_code,
          property_type,
          is_active,
          business_id,
          public_page_slug,
          businesses!inner (
            business_name
          )
        `)
        .eq('is_active', true)
        .order('property_name');

      if (queryError) throw queryError;

      const propertiesWithBusiness: PropertyWithBusiness[] = (data || []).map((p: any) => ({
        id: p.id,
        property_name: p.property_name,
        address_line1: p.address_line1,
        city: p.city,
        state: p.state,
        zip_code: p.zip_code,
        property_type: p.property_type,
        is_active: p.is_active,
        business_id: p.business_id,
        business_name: p.businesses?.business_name || 'Unknown Business',
        public_page_slug: p.public_page_slug,
      }));

      setProperties(propertiesWithBusiness);

      // Load stats for each property in parallel
      const statsEntries = await Promise.all(
        propertiesWithBusiness.map(async (property) => [
          property.id,
          await loadPropertyStats(property.id)
        ] as [string, PropertyStats])
      );
      setPropertyStats(Object.fromEntries(statsEntries));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPropertyStats = async (propertyId: string): Promise<PropertyStats> => {
    try {
      // Get units
      const { data: units } = await supabase
        .from('units')
        .select('id, occupancy_status')
        .eq('property_id', propertyId)
        .eq('is_active', true);

      const unitIds = units?.map(u => u.id) || [];
      const vacantCount = units?.filter(u => u.occupancy_status === 'vacant').length || 0;

      let tenantsCount = 0;
      if (unitIds.length > 0) {
        const { count: tenantCount } = await supabase
          .from('unit_tenant_access')
          .select('tenant_id', { count: 'exact', head: true })
          .in('unit_id', unitIds)
          .eq('is_active', true);

        tenantsCount = tenantCount || 0;
      }

      // Get open maintenance requests
      const { count: maintenanceCount } = await supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .not('status', 'in', '(completed,cancelled)');

      return {
        units: units?.length || 0,
        tenants: tenantsCount,
        maintenance: maintenanceCount || 0,
        vacant: vacantCount,
      };
    } catch (err) {
      console.error('Error loading property stats:', err);
      return { units: 0, tenants: 0, maintenance: 0, vacant: 0 };
    }
  };

  const formatAddress = (property: PropertyWithBusiness) => {
    const parts = [property.address_line1, property.city, property.state, property.zip_code].filter(Boolean);
    return parts.join(', ') || 'No address';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading properties...</p>
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
              onClick={() => navigate('/businesses')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <Breadcrumbs
                items={[
                  { label: 'Businesses', href: '/businesses' },
                  { label: 'All Properties' },
                ]}
                className="mb-2"
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                All Properties
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {properties.length} {properties.length === 1 ? 'property' : 'properties'} across all businesses
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {properties.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Home className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Properties Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Properties are created within a business. Go to your business to add a property.
            </p>
            <button
              onClick={() => navigate('/businesses')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Building2 size={20} />
              Go to Businesses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {properties.map((property) => (
              <button
                key={property.id}
                onClick={() => navigate(`/property/${property.id}`)}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200 p-6 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition">
                      <Home className="w-6 h-6 text-emerald-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Business name prominently displayed */}
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/business/${property.business_id}`);
                          }}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {property.business_name}
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                          {property.property_name}
                        </h3>
                        {property.is_active ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{formatAddress(property)}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <DoorClosed className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Units</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {propertyStats[property.id]?.units || 0}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center">
                            <DoorClosed className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Vacant</p>
                            <p className="text-sm font-semibold text-green-600">
                              {propertyStats[property.id]?.vacant || 0}
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
                              {propertyStats[property.id]?.tenants || 0}
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
                              {propertyStats[property.id]?.maintenance || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition flex-shrink-0" />
                </div>

                {propertyStats[property.id]?.maintenance > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-900 font-medium">
                        {propertyStats[property.id]?.maintenance} maintenance {propertyStats[property.id]?.maintenance === 1 ? 'request' : 'requests'} pending
                      </span>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
