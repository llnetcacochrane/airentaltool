import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { unitService } from '../services/unitService';
import { listingService, PREDEFINED_AMENITIES, AMENITY_CATEGORIES, AmenityConfig } from '../services/listingService';
import { tenantService } from '../services/tenantService';
import { applicationTemplateService, ApplicationTemplate } from '../services/applicationTemplateService';
import { supabase } from '../lib/supabase';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { TenantForm } from '../components/TenantForm';
import { Unit, Tenant, AgreementTemplate } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  ArrowLeft, Users, ChevronRight, AlertCircle, Plus,
  DollarSign, Edit2, Wrench, FileText, Calendar,
  CheckCircle, XCircle, Globe, ExternalLink, Trash2, ClipboardList, Eye, RefreshCw
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
  const toast = useToast();
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
  const [businessSlug, setBusinessSlug] = useState<string>('');
  const [agreementTemplates, setAgreementTemplates] = useState<AgreementTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [applicationTemplates, setApplicationTemplates] = useState<ApplicationTemplate[]>([]);
  const [selectedAppTemplateId, setSelectedAppTemplateId] = useState<string>('');
  const [isSavingAppTemplate, setIsSavingAppTemplate] = useState(false);

  // Listing customization state
  const [listingDisplayTitle, setListingDisplayTitle] = useState<string>('');
  const [listingAmenities, setListingAmenities] = useState<AmenityConfig[]>([]);
  const [isSavingListingSettings, setIsSavingListingSettings] = useState(false);
  const [showListingSettings, setShowListingSettings] = useState(false);
  const [isSyncingFromUnit, setIsSyncingFromUnit] = useState(false);

  useEffect(() => {
    loadUnitData();
  }, [unitId]);

  // Sync templates when unit loads
  useEffect(() => {
    if (unit) {
      setSelectedTemplateId(unit.default_agreement_template_id || '');
      setSelectedAppTemplateId(unit.default_application_template_id || '');
    }
  }, [unit]);

  // Load agreement templates
  useEffect(() => {
    async function loadTemplates() {
      try {
        if (!currentBusiness?.id) return;
        const { data, error } = await supabase
          .from('agreement_templates')
          .select('*')
          .eq('business_id', currentBusiness.id)
          .eq('is_active', true)
          .order('template_name');

        if (error) throw error;
        setAgreementTemplates(data || []);
      } catch (err) {
        console.error('Failed to load agreement templates:', err);
      }
    }
    loadTemplates();
  }, [currentBusiness?.id]);

  // Load application templates
  useEffect(() => {
    async function loadAppTemplates() {
      if (!currentBusiness?.id) return;
      try {
        const templates = await applicationTemplateService.getTemplates({
          business_id: currentBusiness.id,
          is_active: true
        });
        setApplicationTemplates(templates);
      } catch (err) {
        console.error('Failed to load application templates:', err);
      }
    }
    loadAppTemplates();
  }, [currentBusiness?.id]);

  // Sync listing settings when listing loads
  useEffect(() => {
    if (listing) {
      setListingDisplayTitle(listing.display_title || '');
      // Always initialize ALL predefined amenities, merging with existing config
      const existingConfig = listing.amenities_config || [];
      const existingAmenities = listing.amenities || [];

      const initialConfig: AmenityConfig[] = PREDEFINED_AMENITIES.map(amenity => {
        // Check if this amenity exists in the saved config
        const savedConfig = existingConfig.find((c: AmenityConfig) => c.id === amenity.id);
        if (savedConfig) {
          return savedConfig;
        }
        // Fall back to checking legacy amenities array
        const isInLegacy = existingAmenities.some((a: string) =>
          a.toLowerCase().includes(amenity.label.toLowerCase()) ||
          amenity.label.toLowerCase().includes(a.toLowerCase())
        );
        return {
          id: amenity.id,
          included: isInLegacy,
          isKeyFeature: false
        };
      });
      setListingAmenities(initialConfig);
    }
  }, [listing]);

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

  const handleSaveListingSettings = async () => {
    if (!listing) return;
    setIsSavingListingSettings(true);
    try {
      // Convert amenities config to simple string array for legacy support
      const selectedAmenities = listingAmenities
        .filter(a => a.included)
        .map(a => {
          const amenity = PREDEFINED_AMENITIES.find(p => p.id === a.id);
          return amenity?.label || a.id;
        });

      const updated = await listingService.updateListing(listing.id, {
        display_title: listingDisplayTitle || null,
        amenities_config: listingAmenities,
        amenities: selectedAmenities, // Keep legacy array in sync
      });
      setListing(updated);
      setShowListingSettings(false);
      toast.success('Listing settings saved', 'Your changes have been saved.');
    } catch (err: any) {
      console.error('Failed to save listing settings:', err);
      toast.error('Failed to save settings', err?.message || 'Please try again.');
    } finally {
      setIsSavingListingSettings(false);
    }
  };

  const handleSyncFromUnit = async () => {
    if (!listing || !unit) return;
    setIsSyncingFromUnit(true);
    try {
      const updated = await listingService.updateListing(listing.id, {
        monthly_rent_cents: unit.monthly_rent_cents || 0,
        bedrooms: unit.bedrooms || 0,
        bathrooms: unit.bathrooms || 0,
        square_feet: unit.square_feet || null,
        deposit_cents: unit.security_deposit_cents || null,
      });
      setListing(updated);
      toast.success('Listing synced', 'Listing data updated from unit.');
    } catch (err: any) {
      console.error('Failed to sync listing:', err);
      toast.error('Failed to sync listing', err?.message || 'Please try again.');
    } finally {
      setIsSyncingFromUnit(false);
    }
  };

  const toggleAmenity = (amenityId: string) => {
    setListingAmenities(prev =>
      prev.map(a =>
        a.id === amenityId ? { ...a, included: !a.included } : a
      )
    );
  };

  const toggleKeyFeature = (amenityId: string) => {
    setListingAmenities(prev =>
      prev.map(a =>
        a.id === amenityId ? { ...a, isKeyFeature: !a.isKeyFeature } : a
      )
    );
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

  const handleSaveAgreementTemplate = async () => {
    if (!unitId) return;
    setIsSavingTemplate(true);
    try {
      await unitService.updateUnit(unitId, {
        default_agreement_template_id: selectedTemplateId || null,
      });
      await loadUnitData();
    } catch (err) {
      console.error('Failed to save agreement template:', err);
      alert('Failed to save template. Please try again.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveApplicationTemplate = async () => {
    if (!unitId) return;
    setIsSavingAppTemplate(true);
    try {
      await unitService.updateUnit(unitId, {
        default_application_template_id: selectedAppTemplateId || null,
      });
      await loadUnitData();
    } catch (err) {
      console.error('Failed to save application template:', err);
      alert('Failed to save template. Please try again.');
    } finally {
      setIsSavingAppTemplate(false);
    }
  };

  const handleVisibilityOverrideChange = async (value: string) => {
    if (!unitId || !unit) return;
    try {
      const newValue = value as 'inherit' | 'always_show' | 'never_show';
      await unitService.updateUnit(unitId, {
        public_page_visibility_override: newValue,
      });
      setUnit({ ...unit, public_page_visibility_override: newValue });
    } catch (err) {
      console.error('Failed to update visibility override:', err);
    }
  };

  const handleOnlineApplicationsChange = async (value: string) => {
    if (!unitId || !unit) return;
    try {
      const newValue = value === 'inherit' ? null : value === 'enabled';
      await unitService.updateUnit(unitId, {
        accept_online_applications: newValue,
      });
      setUnit({ ...unit, accept_online_applications: newValue });
    } catch (err) {
      console.error('Failed to update online applications setting:', err);
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
                  <div className="flex flex-wrap items-center gap-2">
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
                      onClick={() => setShowListingSettings(!showListingSettings)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                    >
                      <Edit2 size={16} />
                      {showListingSettings ? 'Hide Settings' : 'Edit Listing'}
                    </button>
                  </div>
                )}

                {/* Listing Settings Panel */}
                {listing && showListingSettings && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {/* Display Title */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Title
                      </label>
                      <input
                        type="text"
                        value={listingDisplayTitle}
                        onChange={(e) => setListingDisplayTitle(e.target.value)}
                        placeholder={listing.title || 'Auto-generated from unit details'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave blank to use auto-generated title based on bedrooms/bathrooms
                      </p>
                    </div>

                    {/* Amenities & Key Features */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Amenities & Key Features
                        </label>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span>
                            Included
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></span>
                            Key Feature
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Check "Include" to show in amenities. Check "Key" to highlight as a prominent Key Feature with icon.
                      </p>
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {AMENITY_CATEGORIES.map((category) => (
                          <div key={category}>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              {category}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {PREDEFINED_AMENITIES
                                .filter(a => a.category === category)
                                .map((amenity) => {
                                  const config = listingAmenities.find(a => a.id === amenity.id);
                                  const isIncluded = config?.included ?? false;
                                  const isKeyFeature = config?.isKeyFeature ?? false;
                                  return (
                                    <div
                                      key={amenity.id}
                                      className={`flex items-center justify-between p-2 rounded-lg transition text-sm ${
                                        isKeyFeature
                                          ? 'bg-amber-50 border border-amber-200'
                                          : isIncluded
                                          ? 'bg-blue-50 border border-blue-200'
                                          : 'bg-gray-50 border border-gray-200'
                                      }`}
                                    >
                                      <span className={
                                        isKeyFeature ? 'text-amber-700 font-medium' :
                                        isIncluded ? 'text-blue-700' : 'text-gray-600'
                                      }>
                                        {amenity.label}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-1 cursor-pointer" title="Include in listing">
                                          <input
                                            type="checkbox"
                                            checked={isIncluded}
                                            onChange={() => toggleAmenity(amenity.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                          />
                                          <span className="text-xs text-gray-500">Inc</span>
                                        </label>
                                        <label className="flex items-center gap-1 cursor-pointer" title="Show as Key Feature">
                                          <input
                                            type="checkbox"
                                            checked={isKeyFeature}
                                            onChange={() => toggleKeyFeature(amenity.id)}
                                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                                          />
                                          <span className="text-xs text-gray-500">Key</span>
                                        </label>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sync and Save Buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-gray-100">
                      <button
                        onClick={handleSyncFromUnit}
                        disabled={isSyncingFromUnit}
                        className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm font-medium disabled:opacity-50"
                      >
                        <RefreshCw size={16} className={isSyncingFromUnit ? 'animate-spin' : ''} />
                        {isSyncingFromUnit ? 'Syncing...' : 'Sync from Unit'}
                      </button>
                      <button
                        onClick={handleSaveListingSettings}
                        disabled={isSavingListingSettings}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
                      >
                        {isSavingListingSettings ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      "Sync from Unit" updates listing price, bedrooms, bathrooms, and deposit from the unit's current data.
                    </p>
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

        {/* Agreement Template Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Default Agreement Template</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select a default lease agreement template for this unit. This overrides the property's default template.
              </p>
              <div className="space-y-4">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value="">No default template (inherit from property)</option>
                  {agreementTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.template_name} ({template.agreement_type})
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSaveAgreementTemplate}
                    disabled={isSavingTemplate}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium disabled:opacity-50"
                  >
                    {isSavingTemplate ? 'Saving...' : 'Save Template'}
                  </button>
                  <button
                    onClick={() => navigate('/agreements?action=create')}
                    className="px-4 py-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    Create New Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Template Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Default Application Template</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select a default rental application template for this unit. This overrides the property's default template.
              </p>
              <div className="space-y-4">
                <select
                  value={selectedAppTemplateId}
                  onChange={(e) => setSelectedAppTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">No default template (inherit from property)</option>
                  {applicationTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.template_name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSaveApplicationTemplate}
                    disabled={isSavingAppTemplate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
                  >
                    {isSavingAppTemplate ? 'Saving...' : 'Save Template'}
                  </button>
                  <button
                    onClick={() => navigate('/applications?action=create')}
                    className="px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Create New Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Public Page Visibility Override */}
        <div className={`rounded-xl p-6 border ${
          unit?.public_page_visibility_override === 'always_show' ? 'bg-green-50 border-green-200' :
          unit?.public_page_visibility_override === 'never_show' ? 'bg-gray-50 border-gray-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
              unit?.public_page_visibility_override === 'always_show' ? 'bg-green-100' :
              unit?.public_page_visibility_override === 'never_show' ? 'bg-gray-200' :
              'bg-blue-100'
            }`}>
              <Eye className={`w-6 h-6 ${
                unit?.public_page_visibility_override === 'always_show' ? 'text-green-600' :
                unit?.public_page_visibility_override === 'never_show' ? 'text-gray-500' :
                'text-blue-600'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Public Page Visibility</h3>
                <select
                  value={unit?.public_page_visibility_override || 'inherit'}
                  onChange={(e) => handleVisibilityOverrideChange(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="inherit">Inherit from Property</option>
                  <option value="always_show">Always Show</option>
                  <option value="never_show">Never Show</option>
                </select>
              </div>
              <p className="text-sm text-gray-600">
                {unit?.public_page_visibility_override === 'always_show'
                  ? 'This unit will always be shown on the public page, regardless of property settings.'
                  : unit?.public_page_visibility_override === 'never_show'
                  ? 'This unit will never be shown on the public page.'
                  : 'Visibility is determined by property settings (All Units, Vacant Only, or Custom).'}
              </p>
            </div>
          </div>
        </div>

        {/* Online Applications Toggle */}
        <div className={`rounded-xl p-6 border ${
          unit?.accept_online_applications === true ? 'bg-green-50 border-green-200' :
          unit?.accept_online_applications === false ? 'bg-gray-50 border-gray-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
              unit?.accept_online_applications === true ? 'bg-green-100' :
              unit?.accept_online_applications === false ? 'bg-gray-200' :
              'bg-blue-100'
            }`}>
              <ClipboardList className={`w-6 h-6 ${
                unit?.accept_online_applications === true ? 'text-green-600' :
                unit?.accept_online_applications === false ? 'text-gray-500' :
                'text-blue-600'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Accept Online Applications</h3>
                <select
                  value={unit?.accept_online_applications === null ? 'inherit' : (unit?.accept_online_applications ? 'enabled' : 'disabled')}
                  onChange={(e) => handleOnlineApplicationsChange(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="inherit">Inherit from Property</option>
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <p className="text-sm text-gray-600">
                {unit?.accept_online_applications === true
                  ? 'Online applications are enabled for this unit.'
                  : unit?.accept_online_applications === false
                  ? 'Online applications are disabled for this unit.'
                  : 'Inheriting online application setting from property level.'}
              </p>
            </div>
          </div>
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
