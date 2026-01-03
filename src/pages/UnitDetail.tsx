import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { unitService } from '../services/unitService';
import { listingService } from '../services/listingService';
import { tenantService } from '../services/tenantService';
import { supabase } from '../lib/supabase';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { TenantForm } from '../components/TenantForm';
import { Unit, Tenant } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Users, ChevronRight, AlertCircle, Plus,
  DollarSign, Edit2, Wrench, FileText, Calendar,
  CheckCircle, XCircle, Globe, Eye, ExternalLink, Trash2
} from 'lucide-react';
import { SlidePanel } from '../components/SlidePanel';
import { OccupancyStatus } from '../types';

interface UnitStats {
  tenantCount: number;
  currentTenant: any | null;
  monthlyRent: number;
  leaseStatus: string;
  maintenanceRequests: number;
  hasActiveListing: boolean;
  listingViews: number;
}

export function UnitDetail() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const { currentBusiness } = useAuth();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [property, setProperty] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [listing, setListing] = useState<any>(null);
  const [stats, setStats] = useState<UnitStats>({
    tenantCount: 0,
    currentTenant: null,
    monthlyRent: 0,
    leaseStatus: 'vacant',
    maintenanceRequests: 0,
    hasActiveListing: false,
    listingViews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [isSubmittingTenant, setIsSubmittingTenant] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    unit_number: '',
    floor_number: '',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    monthly_rent_cents: '',
    security_deposit_cents: '',
    occupancy_status: 'vacant' as OccupancyStatus,
    notes: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [publicPageEnabled, setPublicPageEnabled] = useState(false);
  const [isSavingPublicSetting, setIsSavingPublicSetting] = useState(false);
  const [businessSlug, setBusinessSlug] = useState<string>('');

  useEffect(() => {
    loadUnitData();
  }, [unitId]);

  // Sync public page setting when unit loads
  useEffect(() => {
    if (unit) {
      setPublicPageEnabled(unit.public_page_enabled || false);
    }
  }, [unit]);

  const loadUnitData = async () => {
    if (!unitId) return;
    setIsLoading(true);
    try {
      // Get unit details
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .select('*, properties(*)')
        .eq('id', unitId)
        .single();

      if (unitError) throw unitError;

      setUnit(unitData);
      setProperty(unitData.properties);

      // Fetch business public_page_slug for public page links
      if (unitData.properties?.business_id) {
        const { data: businessData } = await supabase
          .from('businesses')
          .select('public_page_slug')
          .eq('id', unitData.properties.business_id)
          .single();
        if (businessData?.public_page_slug) {
          setBusinessSlug(businessData.public_page_slug);
        }
      }

      // Get tenants for this unit
      const { data: tenantAccess } = await supabase
        .from('unit_tenant_access')
        .select('*, tenants(*)')
        .eq('unit_id', unitId)
        .eq('is_active', true);

      const tenantsList = tenantAccess?.map(ta => ta.tenants) || [];
      setTenants(tenantsList);

      // Get maintenance requests
      const { count: maintenanceCount } = await supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('unit_id', unitId)
        .not('status', 'in', '(completed,cancelled)');

      // Check for active listing
      const { data: listingData } = await supabase
        .from('listings')
        .select('*')
        .eq('unit_id', unitId)
        .maybeSingle();

      setListing(listingData);
      setStats({
        tenantCount: tenantsList.length,
        currentTenant: tenantsList[0] || null,
        monthlyRent: (unitData.monthly_rent_cents || 0) / 100,
        leaseStatus: unitData.occupancy_status || 'vacant',
        maintenanceRequests: maintenanceCount || 0,
        hasActiveListing: listingData?.status === 'active',
        listingViews: listingData?.view_count || 0,
      });
    } catch (err) {
      console.error('Failed to load unit data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateListing = async () => {
    if (!unitId || !unit) return;
    setIsCreatingListing(true);
    try {
      const newListing = await listingService.createListingFromUnit(unitId, {
        title: `${unit.bedrooms} bed / ${unit.bathrooms} bath in ${property?.name || 'Property'}`,
      });

      // Publish immediately
      const published = await listingService.publishListing(newListing.id);
      setListing(published);
      setStats({ ...stats, hasActiveListing: true, listingViews: 0 });
    } catch (err) {
      console.error('Failed to create listing:', err);
    } finally {
      setIsCreatingListing(false);
    }
  };

  const handleToggleListing = async () => {
    if (!listing) return;
    try {
      const isActive = listing.status === 'active';
      const updated = isActive
        ? await listingService.unpublishListing(listing.id)
        : await listingService.publishListing(listing.id);

      setListing(updated);
      setStats({ ...stats, hasActiveListing: !isActive });
    } catch (err) {
      console.error('Failed to toggle listing:', err);
    }
  };

  const handleAddTenant = async (tenantData: Partial<Tenant>) => {
    if (!unitId || !currentBusiness) return;
    setIsSubmittingTenant(true);
    try {
      // Override unit_id to use current unit
      await tenantService.createTenant(currentBusiness.id, unitId, {
        ...tenantData,
        unit_id: unitId,
      });
      setShowTenantForm(false);
      await loadUnitData(); // Refresh the page data
    } catch (err: any) {
      if (err.message?.includes('LIMIT_REACHED')) {
        alert('You have reached the tenant limit for your current plan. Please upgrade to add more tenants.');
      } else {
        console.error('Failed to add tenant:', err);
        alert('Failed to add tenant. Please try again.');
      }
    } finally {
      setIsSubmittingTenant(false);
    }
  };

  const handleOpenEditForm = () => {
    if (!unit) return;
    setEditFormData({
      unit_number: unit.unit_number || '',
      floor_number: unit.floor_number?.toString() || '',
      bedrooms: unit.bedrooms?.toString() || '',
      bathrooms: unit.bathrooms?.toString() || '',
      square_feet: unit.square_feet?.toString() || '',
      monthly_rent_cents: unit.monthly_rent_cents ? (unit.monthly_rent_cents / 100).toString() : '',
      security_deposit_cents: unit.security_deposit_cents ? (unit.security_deposit_cents / 100).toString() : '',
      occupancy_status: unit.occupancy_status || 'vacant',
      notes: unit.notes || '',
    });
    setShowEditForm(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId) return;
    setIsSubmittingEdit(true);
    try {
      const data = {
        unit_number: editFormData.unit_number,
        floor_number: editFormData.floor_number ? parseInt(editFormData.floor_number) : null,
        bedrooms: editFormData.bedrooms ? parseInt(editFormData.bedrooms) : null,
        bathrooms: editFormData.bathrooms ? parseFloat(editFormData.bathrooms) : null,
        square_feet: editFormData.square_feet ? parseInt(editFormData.square_feet) : null,
        monthly_rent_cents: editFormData.monthly_rent_cents ? Math.round(parseFloat(editFormData.monthly_rent_cents) * 100) : null,
        security_deposit_cents: editFormData.security_deposit_cents ? Math.round(parseFloat(editFormData.security_deposit_cents) * 100) : null,
        occupancy_status: editFormData.occupancy_status,
        notes: editFormData.notes || null,
      };
      await unitService.updateUnit(unitId, data);
      setShowEditForm(false);
      await loadUnitData();
    } catch (err) {
      console.error('Failed to update unit:', err);
      alert('Failed to update unit. Please try again.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!unitId) return;
    setIsDeleting(true);
    try {
      await unitService.deleteUnit(unitId);
      navigate(`/property/${property.id}`);
    } catch (err) {
      console.error('Failed to delete unit:', err);
      alert('Failed to delete unit. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublicVisibility = async (enabled: boolean) => {
    if (!unitId) return;
    setIsSavingPublicSetting(true);
    try {
      await unitService.updateUnit(unitId, { public_page_enabled: enabled });
      setPublicPageEnabled(enabled);
    } catch (err) {
      console.error('Failed to update public visibility:', err);
      alert('Failed to update visibility. Please try again.');
    } finally {
      setIsSavingPublicSetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading unit...</p>
        </div>
      </div>
    );
  }

  if (!unit || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Unit not found</p>
        </div>
      </div>
    );
  }

  // Check if property type is land-based (doesn't need bedroom/bathroom info)
  const isLandProperty = ['land', 'vacant_land'].includes(property.property_type);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(`/property/${property.id}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <Breadcrumbs
                items={[
                  { label: 'Businesses', href: '/businesses' },
                  { label: 'Business', href: `/business/${property.business_id}` },
                  { label: property.name, href: `/property/${property.id}` },
                  { label: `Unit ${unit.unit_number}` }
                ]}
                className="mb-2"
              />
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-2xl sm:text-3xl font-bold text-gray-900">
                  Unit {unit.unit_number}
                </h1>
                {stats.leaseStatus === 'occupied' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    <CheckCircle className="w-4 h-4" />
                    Occupied
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                    <XCircle className="w-4 h-4" />
                    Vacant
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">{property.name}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenEditForm}
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
              <p className="text-xs text-gray-600 mb-1">Monthly Rent</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">${stats.monthlyRent.toLocaleString()}</p>
            </div>
            {isLandProperty ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Property Type</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">Land</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Size</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {unit.bedrooms} bed · {unit.bathrooms} bath
                </p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">{isLandProperty ? 'Lot Size' : 'Square Feet'}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {unit.square_feet ? `${unit.square_feet.toLocaleString()}${isLandProperty ? ' sq ft' : ''}` : '—'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Tenants</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.tenantCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {stats.maintenanceRequests > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">Attention Required</h3>
                <div className="space-y-1 text-sm text-amber-800">
                  <p>{stats.maintenanceRequests} open maintenance request{stats.maintenanceRequests > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Public Page Visibility - Only show when property uses custom display mode */}
        {property?.public_unit_display_mode === 'custom' && (
          <div className={`rounded-xl p-6 border ${
            publicPageEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  publicPageEnabled ? 'bg-green-100' : 'bg-gray-200'
                }`}>
                  <Eye className={`w-6 h-6 ${
                    publicPageEnabled ? 'text-green-600' : 'text-gray-500'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Public Page Visibility</h3>
                  <p className="text-sm text-gray-600">
                    {publicPageEnabled
                      ? 'This unit is visible on the property\'s public page'
                      : 'This unit is hidden from the property\'s public page'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={publicPageEnabled}
                  onChange={(e) => handleTogglePublicVisibility(e.target.checked)}
                  disabled={isSavingPublicSetting}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        )}

        {/* Public Listing Status */}
        {stats.leaseStatus === 'vacant' && (
          <div className={`rounded-xl p-6 border ${
            stats.hasActiveListing
              ? 'bg-blue-50 border-blue-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                stats.hasActiveListing ? 'bg-blue-100' : 'bg-gray-200'
              }`}>
                <Globe className={`w-6 h-6 ${
                  stats.hasActiveListing ? 'text-blue-600' : 'text-gray-500'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {listing ? 'Public Listing' : 'No Public Listing'}
                  </h3>
                  {listing && (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stats.hasActiveListing}
                        onChange={handleToggleListing}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {listing
                    ? stats.hasActiveListing
                      ? `This unit is publicly listed and has ${stats.listingViews} views`
                      : 'Listing is created but not published. Toggle to make it visible to prospects.'
                    : 'Create a public listing to advertise this vacant unit and receive applications.'
                  }
                </p>
                {!listing ? (
                  <button
                    onClick={handleCreateListing}
                    disabled={isCreatingListing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                    {isCreatingListing ? 'Creating...' : 'Create Listing'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {stats.hasActiveListing && listing && businessSlug && property?.public_page_slug && (
                      <a
                        href={`/browse/${businessSlug}/${property.public_page_slug}/${unitId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                      >
                        <ExternalLink size={16} />
                        View Public Page
                      </a>
                    )}
                    <button
                      onClick={() => navigate(`/applications?unitId=${unitId}`)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                    >
                      <Edit2 size={16} />
                      Manage Listing
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current Tenants */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {stats.leaseStatus === 'occupied' ? 'Current Tenants' : 'Tenants'}
            </h2>
            {stats.leaseStatus === 'vacant' && (
              <button
                onClick={() => setShowTenantForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                <Plus size={18} />
                Add Tenant
              </button>
            )}
          </div>

          {tenants.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tenants</h3>
              <p className="text-gray-600 mb-6">This unit is currently vacant</p>
              <button
                onClick={() => setShowTenantForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Plus size={20} />
                Add Tenant
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => navigate(`/tenants?tenantId=${tenant.id}`)}
                  className="group bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 hover:border-blue-200 p-6 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {tenant.first_name} {tenant.last_name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{tenant.email}</p>
                        {tenant.phone && (
                          <p className="text-sm text-gray-600">{tenant.phone}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate(`/payments?unitId=${unitId}`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-green-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Payments</h3>
            <p className="text-sm text-gray-600">Rent & transactions</p>
          </button>

          <button
            onClick={() => navigate(`/maintenance?unitId=${unitId}`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-amber-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
                <Wrench className="w-6 h-6 text-amber-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Maintenance</h3>
            <p className="text-sm text-gray-600">{stats.maintenanceRequests} open requests</p>
          </button>

          <button
            onClick={() => navigate(`/agreements?unitId=${unitId}`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-blue-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Lease</h3>
            <p className="text-sm text-gray-600">Agreement details</p>
          </button>

          <button
            onClick={() => navigate(`/agreements?unitId=${unitId}`)}
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-gray-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Documents</h3>
            <p className="text-sm text-gray-600">Agreements & files</p>
          </button>

          {stats.hasActiveListing && (
            <button
              onClick={() => navigate(`/applications?unitId=${unitId}`)}
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 text-left border border-gray-100 hover:border-purple-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Applications</h3>
              <p className="text-sm text-gray-600">Rental applications</p>
            </button>
          )}
        </div>
      </div>

      {/* Add Tenant Form */}
      {showTenantForm && (
        <TenantForm
          onSubmit={handleAddTenant}
          onCancel={() => setShowTenantForm(false)}
          isSubmitting={isSubmittingTenant}
        />
      )}

      {/* Edit Unit Form */}
      <SlidePanel
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        title={`Edit Unit ${unit?.unit_number || ''}`}
        size="large"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              disabled={isSubmittingEdit}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="unit-edit-form"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              disabled={isSubmittingEdit}
            >
              {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <form id="unit-edit-form" onSubmit={handleSaveEdit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editFormData.unit_number}
                onChange={(e) => setEditFormData({ ...editFormData, unit_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 101, A-12"
                required
              />
            </div>

            {!isLandProperty && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor Number
                </label>
                <input
                  type="number"
                  value={editFormData.floor_number}
                  onChange={(e) => setEditFormData({ ...editFormData, floor_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            )}

            {!isLandProperty && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bedrooms
                </label>
                <input
                  type="number"
                  value={editFormData.bedrooms}
                  onChange={(e) => setEditFormData({ ...editFormData, bedrooms: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            )}

            {!isLandProperty && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bathrooms
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editFormData.bathrooms}
                onChange={(e) => setEditFormData({ ...editFormData, bathrooms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isLandProperty ? 'Lot Size (sq ft)' : 'Square Feet'}
              </label>
              <input
                type="number"
                value={editFormData.square_feet}
                onChange={(e) => setEditFormData({ ...editFormData, square_feet: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Occupancy Status
              </label>
              <select
                value={editFormData.occupancy_status}
                onChange={(e) => setEditFormData({ ...editFormData, occupancy_status: e.target.value as OccupancyStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rent ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={editFormData.monthly_rent_cents}
                onChange={(e) => setEditFormData({ ...editFormData, monthly_rent_cents: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Security Deposit ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={editFormData.security_deposit_cents}
                onChange={(e) => setEditFormData({ ...editFormData, security_deposit_cents: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="0.00"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional information about this unit"
              />
            </div>
          </div>
        </form>
      </SlidePanel>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Unit</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete unit <strong>{unit?.unit_number}</strong>?
              This action cannot be undone and will remove all associated data including tenant assignments and maintenance requests.
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
                onClick={handleDeleteUnit}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Unit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
