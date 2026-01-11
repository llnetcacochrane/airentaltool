import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  DoorClosed, ChevronRight, Home, Building2, Users,
  Wrench, ArrowLeft, AlertCircle, DollarSign
} from 'lucide-react';

interface UnitWithProperty {
  id: string;
  unit_number: string;
  unit_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  rent_amount_cents?: number;
  occupancy_status: string;
  is_active: boolean;
  property_id: string;
  property_name: string;
  business_id: string;
  business_name: string;
}

interface UnitStats {
  tenants: number;
  maintenance: number;
}

export function UnitsList() {
  const [units, setUnits] = useState<UnitWithProperty[]>([]);
  const [unitStats, setUnitStats] = useState<Record<string, UnitStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    setIsLoading(true);
    try {
      // Get all units with their property and business info
      const { data, error: queryError } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          unit_type,
          bedrooms,
          bathrooms,
          square_feet,
          rent_amount_cents,
          occupancy_status,
          is_active,
          property_id,
          property:properties (
            name,
            business_id,
            business:businesses (
              business_name
            )
          )
        `)
        .eq('is_active', true)
        .order('unit_number');

      if (queryError) throw queryError;

      const unitsWithProperty: UnitWithProperty[] = (data || []).map((u: any) => ({
        id: u.id,
        unit_number: u.unit_number,
        unit_type: u.unit_type,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        square_feet: u.square_feet,
        rent_amount_cents: u.rent_amount_cents,
        occupancy_status: u.occupancy_status,
        is_active: u.is_active,
        property_id: u.property_id,
        property_name: u.property?.name || 'Unknown Property',
        business_id: u.property?.business_id || '',
        business_name: u.property?.business?.business_name || 'Unknown Business',
      }));

      setUnits(unitsWithProperty);

      // Load stats for each unit in parallel
      const statsEntries = await Promise.all(
        unitsWithProperty.map(async (unit) => [
          unit.id,
          await loadUnitStats(unit.id)
        ] as [string, UnitStats])
      );
      setUnitStats(Object.fromEntries(statsEntries));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load units');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnitStats = async (unitId: string): Promise<UnitStats> => {
    try {
      // Get tenants count
      const { count: tenantCount } = await supabase
        .from('unit_tenant_access')
        .select('tenant_id', { count: 'exact', head: true })
        .eq('unit_id', unitId)
        .eq('is_active', true);

      // Get open maintenance requests
      const { count: maintenanceCount } = await supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('unit_id', unitId)
        .not('status', 'in', '(completed,cancelled)');

      return {
        tenants: tenantCount || 0,
        maintenance: maintenanceCount || 0,
      };
    } catch (err) {
      console.error('Error loading unit stats:', err);
      return { tenants: 0, maintenance: 0 };
    }
  };

  const formatRent = (cents?: number) => {
    if (!cents) return 'N/A';
    return `$${(cents / 100).toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'bg-green-100 text-green-700';
      case 'occupied':
        return 'bg-blue-100 text-blue-700';
      case 'reserved':
        return 'bg-amber-100 text-amber-700';
      case 'maintenance':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredUnits = units.filter(unit => {
    if (filterStatus === 'all') return true;
    return unit.occupancy_status === filterStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading units...</p>
        </div>
      </div>
    );
  }

  const statusCounts = {
    all: units.length,
    vacant: units.filter(u => u.occupancy_status === 'vacant').length,
    occupied: units.filter(u => u.occupancy_status === 'occupied').length,
    reserved: units.filter(u => u.occupancy_status === 'reserved').length,
    maintenance: units.filter(u => u.occupancy_status === 'maintenance').length,
  };

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
                  { label: 'All Units' },
                ]}
                className="mb-2"
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                All Units
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {units.length} {units.length === 1 ? 'unit' : 'units'} across all properties
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[
              { key: 'all', label: 'All' },
              { key: 'vacant', label: 'Vacant' },
              { key: 'occupied', label: 'Occupied' },
              { key: 'reserved', label: 'Reserved' },
              { key: 'maintenance', label: 'Maintenance' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterStatus === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label} ({statusCounts[key as keyof typeof statusCounts]})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {units.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <DoorClosed className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Units Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Units are created within a property. Go to your properties to add a unit.
            </p>
            <button
              onClick={() => navigate('/properties')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Home size={20} />
              Go to Properties
            </button>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <DoorClosed className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No {filterStatus} units</h3>
            <p className="text-gray-600">
              Try selecting a different filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredUnits.map((unit) => (
              <button
                key={unit.id}
                onClick={() => navigate(`/unit/${unit.id}`)}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200 p-6 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition">
                      <DoorClosed className="w-6 h-6 text-purple-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Property and Business prominently displayed */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/business/${unit.business_id}`);
                          }}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {unit.business_name}
                        </button>
                        <span className="text-gray-400">/</span>
                        <Home className="w-4 h-4 text-emerald-500" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/property/${unit.property_id}`);
                          }}
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-800 hover:underline"
                        >
                          {unit.property_name}
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                          Unit {unit.unit_number}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(unit.occupancy_status)}`}>
                          {unit.occupancy_status}
                        </span>
                      </div>

                      {unit.unit_type && (
                        <p className="text-sm text-gray-600 mb-3">{unit.unit_type}</p>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        {unit.bedrooms !== undefined && (
                          <div>
                            <p className="text-xs text-gray-500">Beds</p>
                            <p className="text-sm font-semibold text-gray-900">{unit.bedrooms}</p>
                          </div>
                        )}

                        {unit.bathrooms !== undefined && (
                          <div>
                            <p className="text-xs text-gray-500">Baths</p>
                            <p className="text-sm font-semibold text-gray-900">{unit.bathrooms}</p>
                          </div>
                        )}

                        {unit.square_feet && (
                          <div>
                            <p className="text-xs text-gray-500">Sq Ft</p>
                            <p className="text-sm font-semibold text-gray-900">{unit.square_feet.toLocaleString()}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Rent</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatRent(unit.rent_amount_cents)}
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
                              {unitStats[unit.id]?.tenants || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition flex-shrink-0" />
                </div>

                {unitStats[unit.id]?.maintenance > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-900 font-medium">
                        {unitStats[unit.id]?.maintenance} maintenance {unitStats[unit.id]?.maintenance === 1 ? 'request' : 'requests'} pending
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
