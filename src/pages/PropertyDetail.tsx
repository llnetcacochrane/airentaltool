import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyService } from '../services/propertyService';
import { unitService } from '../services/unitService';
import { supabase } from '../lib/supabase';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { PropertyForm } from '../components/PropertyForm';
import { Property, Unit } from '../types';
import {
  ArrowLeft, DoorClosed, ChevronRight, AlertCircle, Plus,
  Users, Calendar, DollarSign, Edit2, Wrench, FileText,
  TrendingUp, CheckCircle, XCircle, Trash2
} from 'lucide-react';

interface PropertyStats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalTenants: number;
  monthlyRevenue: number;
  openMaintenance: number;
  expiringLeases: number;
}

export function PropertyDetail() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [stats, setStats] = useState<PropertyStats>({
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
    openMaintenance: 0,
    expiringLeases: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadPropertyData();
  }, [propertyId]);

  const loadPropertyData = async () => {
    if (!propertyId) return;
    setIsLoading(true);
    try {
      const propertyData = await propertyService.getProperty(propertyId);
      setProperty(propertyData);

      if (propertyData) {
        const unitsData = await propertyService.getPropertyUnits(propertyId);
        setUnits(unitsData);

        // Calculate stats
        const occupied = unitsData.filter(u => u.occupancy_status === 'occupied').length;
        const totalRevenue = unitsData
          .filter(u => u.occupancy_status === 'occupied')
          .reduce((sum, u) => sum + (u.monthly_rent_cents || 0), 0) / 100;

        // Get tenant count
        const { count: tenantCount } = await supabase
          .from('unit_tenant_access')
          .select('tenant_id', { count: 'exact', head: true })
          .in('unit_id', unitsData.map(u => u.id))
          .eq('is_active', true);

        // Get maintenance count
        const { count: maintenanceCount } = await supabase
          .from('maintenance_requests')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', propertyId)
          .not('status', 'in', '(completed,cancelled)');

        setStats({
          totalUnits: unitsData.length,
          occupiedUnits: occupied,
          vacantUnits: unitsData.length - occupied,
          totalTenants: tenantCount || 0,
          monthlyRevenue: totalRevenue,
          openMaintenance: maintenanceCount || 0,
          expiringLeases: 0,
        });
      }
    } catch (err) {
      console.error('Failed to load property data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProperty = async (data: Partial<Property>) => {
    if (!propertyId) return;
    setIsSubmitting(true);
    try {
      await propertyService.updateProperty(propertyId, data);
      setShowEditForm(false);
      await loadPropertyData();
    } catch (err) {
      console.error('Failed to update property:', err);
      alert('Failed to update property. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!propertyId || !property) return;
    setIsDeleting(true);
    try {
      await propertyService.deleteProperty(propertyId);
      navigate('/properties');
    } catch (err) {
      console.error('Failed to delete property:', err);
      alert('Failed to delete property. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Property not found</p>
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
              onClick={() => navigate(`/business/${property.business_id}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <Breadcrumbs
                items={[
                  { label: 'Businesses', href: '/businesses' },
                  { label: 'Business', href: `/business/${property.business_id}` },
                  { label: property.name }
                ]}
                className="mb-2"
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{property.name}</h1>
              <p className="text-gray-600 mt-1">
                {property.address}, {property.city}, {property.state_province}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              >
                <Edit2 size={18} />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Total Units</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUnits}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Occupied</p>
              <p className="text-2xl font-bold text-green-600">{stats.occupiedUnits}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Vacant</p>
              <p className="text-2xl font-bold text-amber-600">{stats.vacantUnits}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Monthly Revenue</p>
              <p className="text-2xl font-bold text-blue-600">${stats.monthlyRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {stats.openMaintenance > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">Attention Required</h3>
                <div className="space-y-1 text-sm text-amber-800">
                  <p>{stats.openMaintenance} open maintenance request{stats.openMaintenance > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Units</h2>
            <button
              onClick={() => navigate(`/property/${propertyId}/units/new`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus size={18} />
              Add Unit
            </button>
          </div>

          {units.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <DoorClosed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Units Yet</h3>
              <p className="text-gray-600 mb-6">Add your first unit to this property</p>
              <button
                onClick={() => navigate(`/property/${propertyId}/units/new`)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Plus size={20} />
                Add Unit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {units.map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => navigate(`/unit/${unit.id}`)}
                  className="group bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200 p-6 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition ${
                        unit.occupancy_status === 'occupied'
                          ? 'bg-green-100 group-hover:bg-green-200'
                          : 'bg-amber-100 group-hover:bg-amber-200'
                      }`}>
                        <DoorClosed className={`w-6 h-6 ${
                          unit.occupancy_status === 'occupied' ? 'text-green-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">Unit {unit.unit_number}</h3>
                          {unit.occupancy_status === 'occupied' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                              <CheckCircle className="w-3 h-3" />
                              Occupied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                              <XCircle className="w-3 h-3" />
                              Vacant
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {unit.bedrooms} bed · {unit.bathrooms} bath
                          {unit.square_feet && ` · ${unit.square_feet} sq ft`}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-semibold text-gray-900">
                            ${((unit.monthly_rent_cents || 0) / 100).toLocaleString()}/mo
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate(`/property/${propertyId}/tenants`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-purple-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Tenants</h3>
            <p className="text-sm text-gray-600">{stats.totalTenants} active tenants</p>
          </button>

          <button
            onClick={() => navigate(`/property/${propertyId}/maintenance`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-amber-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                <Wrench className="w-6 h-6 text-amber-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Maintenance</h3>
            <p className="text-sm text-gray-600">{stats.openMaintenance} open requests</p>
          </button>

          <button
            onClick={() => navigate(`/property/${propertyId}/financials`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-green-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Financials</h3>
            <p className="text-sm text-gray-600">Payments & expenses</p>
          </button>

          <button
            onClick={() => navigate(`/property/${propertyId}/leases`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-blue-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Leases</h3>
            <p className="text-sm text-gray-600">Active agreements</p>
          </button>

          <button
            onClick={() => navigate(`/property/${propertyId}/documents`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Documents</h3>
            <p className="text-sm text-gray-600">Contracts & files</p>
          </button>

          <button
            onClick={() => navigate(`/property/${propertyId}/reports`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-blue-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Reports</h3>
            <p className="text-sm text-gray-600">Analytics & insights</p>
          </button>
        </div>
      </div>

      {showEditForm && (
        <PropertyForm
          property={property}
          onSubmit={handleUpdateProperty}
          onCancel={() => setShowEditForm(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Property</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <strong>{property?.name}</strong>?
              This action cannot be undone and will remove all associated units, tenant assignments, and maintenance requests.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProperty}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
