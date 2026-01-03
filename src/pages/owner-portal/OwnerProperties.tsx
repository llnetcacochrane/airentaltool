import { useState, useEffect } from 'react';
import { propertyOwnerService } from '../../services/propertyOwnerService';
import { supabase } from '../../lib/supabase';
import {
  Building2,
  Home,
  MapPin,
  Users,
  DollarSign,
  Loader2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface Property {
  id: string;
  name: string;
  address_line1: string;
  city: string;
  state: string;
  property_type: string;
  units: Unit[];
}

interface Unit {
  id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  occupancy_status: string;
  tenant_name?: string;
}

export function OwnerProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);

      const ownerBusinesses = await propertyOwnerService.getPropertyOwnerBusinesses();

      if (ownerBusinesses.length > 0) {
        const businessId = (ownerBusinesses[0] as any).id;

        // SECURITY: Validate businessId format to prevent injection
        if (!businessId || typeof businessId !== 'string') {
          console.error('Invalid business ID');
          return;
        }

        const { data, error } = await supabase
          .from('properties')
          .select(`
            id,
            name,
            address,
            city,
            state_province,
            property_type,
            units (
              id,
              unit_number,
              bedrooms,
              bathrooms,
              rent_amount,
              occupancy_status,
              tenants (
                first_name,
                last_name
              )
            )
          `)
          .eq('business_id', businessId)
          .order('name');

        if (error) throw error;

        const mappedProperties = (data || []).map(prop => ({
          ...prop,
          units: (prop.units || []).map((unit: any) => ({
            ...unit,
            tenant_name: unit.tenants?.length > 0
              ? `${unit.tenants[0].first_name} ${unit.tenants[0].last_name}`
              : undefined,
          })),
        }));

        setProperties(mappedProperties);
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (status: string) => {
    switch (status) {
      case 'occupied':
        return 'bg-green-100 text-green-800';
      case 'vacant':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      single_family: 'Single Family',
      multi_family: 'Multi-Family',
      apartment: 'Apartment',
      condo: 'Condo',
      townhouse: 'Townhouse',
      commercial: 'Commercial',
      land: 'Land',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-2xl sm:text-3xl font-bold text-gray-900">Properties</h1>
        <p className="text-gray-600 mt-1">View your property portfolio and unit details</p>
      </div>

      {/* Properties List */}
      {properties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-500">
            Properties assigned to you will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((property) => {
            const isExpanded = expandedProperty === property.id;
            const occupiedCount = property.units.filter(u => u.occupancy_status === 'occupied').length;
            const totalRent = property.units.reduce((sum, u) => sum + (u.rent_amount || 0), 0);

            return (
              <div
                key={property.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Property Header */}
                <button
                  onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{property.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <MapPin size={14} />
                        <span>{property.address_line1}, {property.city}, {property.state}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="font-medium text-gray-900">{getPropertyTypeLabel(property.property_type)}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-gray-500">Units</p>
                      <p className="font-medium text-gray-900">
                        {occupiedCount}/{property.units.length} occupied
                      </p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-gray-500">Monthly Rent</p>
                      <p className="font-medium text-gray-900">${totalRent.toLocaleString()}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Units List */}
                {isExpanded && property.units.length > 0 && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-4">
                      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                        Units ({property.units.length})
                      </h4>
                      <div className="grid gap-3">
                        {property.units.map((unit) => (
                          <div
                            key={unit.id}
                            className="bg-white rounded-lg p-4 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Home className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Unit {unit.unit_number}</p>
                                <p className="text-sm text-gray-500">
                                  {unit.bedrooms} bed, {unit.bathrooms} bath
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 sm:gap-6">
                              {unit.tenant_name && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Users size={14} />
                                  <span>{unit.tenant_name}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                <DollarSign size={14} />
                                <span>${(unit.rent_amount || 0).toLocaleString()}/mo</span>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getOccupancyColor(unit.occupancy_status)}`}>
                                {unit.occupancy_status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OwnerProperties;
