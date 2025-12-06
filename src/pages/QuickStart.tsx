import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propertyService } from '../services/propertyService';
import { unitService } from '../services/unitService';
import { tenantService } from '../services/tenantService';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  Check,
  Home,
  Users,
  DollarSign,
  Sparkles,
  SkipForward,
  DoorClosed,
} from 'lucide-react';

interface OnboardingProgress {
  hasProperty: boolean;
  hasUnit: boolean;
  hasTenant: boolean;
  propertyCount: number;
  unitCount: number;
  tenantCount: number;
}

export function QuickStart() {
  const navigate = useNavigate();
  const { currentOrganization, userProfile, supabaseUser, createOrganization } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState<OnboardingProgress>({
    hasProperty: false,
    hasUnit: false,
    hasTenant: false,
    propertyCount: 0,
    unitCount: 0,
    tenantCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  // Property form state
  const [propertyData, setPropertyData] = useState({
    name: '',
    address: '',
    city: '',
    state_province: '',
    postal_code: '',
    property_type: 'residential' as const,
    total_units: 1,
  });

  // Unit form state
  const [unitData, setUnitData] = useState({
    unit_number: '1',
    bedrooms: 1,
    bathrooms: 1,
    monthly_rent: '',
  });

  // Tenant form state
  const [tenantData, setTenantData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lease_start_date: '',
    lease_end_date: '',
  });

  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [createdUnitId, setCreatedUnitId] = useState<string | null>(null);

  // Auto-create organization for new users who don't have one
  useEffect(() => {
    const ensureOrganization = async () => {
      if (!supabaseUser || currentOrganization || isCreatingOrg) return;

      // User is logged in but has no organization - create one automatically
      setIsCreatingOrg(true);
      try {
        const firstName = userProfile?.first_name || 'My';
        const tierSlug = userProfile?.selected_tier || 'free';
        const orgName = `${firstName}'s Properties`;
        const orgSlug = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;

        await createOrganization(orgName, orgSlug, undefined, tierSlug);
      } catch (err) {
        console.error('Failed to create organization:', err);
        setError('Failed to set up your account. Please try again.');
      } finally {
        setIsCreatingOrg(false);
      }
    };

    ensureOrganization();
  }, [supabaseUser, currentOrganization, isCreatingOrg, userProfile, createOrganization]);

  useEffect(() => {
    loadProgress();
  }, [currentOrganization?.id]);

  const loadProgress = async () => {
    if (!currentOrganization?.id) {
      // Still waiting for organization to be created
      return;
    }

    try {
      const [propertiesRes, unitsRes, tenantsRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id).eq('is_active', true),
        supabase.from('units').select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id).eq('is_active', true),
        supabase.from('tenants').select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.id).eq('is_active', true),
      ]);

      const propertyCount = propertiesRes.count || 0;
      const unitCount = unitsRes.count || 0;
      const tenantCount = tenantsRes.count || 0;

      setProgress({
        hasProperty: propertyCount > 0,
        hasUnit: unitCount > 0,
        hasTenant: tenantCount > 0,
        propertyCount,
        unitCount,
        tenantCount,
      });

      // Auto-advance to appropriate step
      if (tenantCount > 0) {
        setCurrentStep(4); // Complete
      } else if (unitCount > 0) {
        setCurrentStep(3); // Add tenant
      } else if (propertyCount > 0) {
        setCurrentStep(2); // Add unit
      }
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProperty = async () => {
    if (!propertyData.name.trim()) {
      setError('Property name is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const property = await propertyService.createProperty({
        name: propertyData.name,
        address: propertyData.address,
        city: propertyData.city,
        state_province: propertyData.state_province,
        postal_code: propertyData.postal_code,
        country: 'Canada',
        property_type: propertyData.property_type,
        total_units: propertyData.total_units,
      });

      setCreatedPropertyId(property.id);
      setProgress(prev => ({ ...prev, hasProperty: true, propertyCount: prev.propertyCount + 1 }));
      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUnit = async () => {
    const propertyId = createdPropertyId || await getFirstPropertyId();
    if (!propertyId) {
      setError('Please create a property first');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const unit = await unitService.createUnit(propertyId, {
        unit_number: unitData.unit_number || '1',
        bedrooms: unitData.bedrooms,
        bathrooms: unitData.bathrooms,
        monthly_rent_cents: unitData.monthly_rent ? Math.round(parseFloat(unitData.monthly_rent) * 100) : 0,
      });

      setCreatedUnitId(unit.id);
      setProgress(prev => ({ ...prev, hasUnit: true, unitCount: prev.unitCount + 1 }));
      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create unit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!tenantData.first_name.trim() || !tenantData.last_name.trim()) {
      setError('First and last name are required');
      return;
    }

    const unitId = createdUnitId || await getFirstUnitId();
    if (!unitId) {
      setError('Please create a unit first');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await tenantService.createTenant({
        first_name: tenantData.first_name,
        last_name: tenantData.last_name,
        email: tenantData.email,
        phone: tenantData.phone,
        unit_id: unitId,
        lease_start_date: tenantData.lease_start_date || undefined,
        lease_end_date: tenantData.lease_end_date || undefined,
      });

      setProgress(prev => ({ ...prev, hasTenant: true, tenantCount: prev.tenantCount + 1 }));
      setCurrentStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setIsSaving(false);
    }
  };

  const getFirstPropertyId = async (): Promise<string | null> => {
    if (!currentOrganization?.id) return null;
    const { data } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', currentOrganization.id)
      .eq('is_active', true)
      .limit(1)
      .single();
    return data?.id || null;
  };

  const getFirstUnitId = async (): Promise<string | null> => {
    if (!currentOrganization?.id) return null;
    const { data } = await supabase
      .from('units')
      .select('id')
      .eq('organization_id', currentOrganization.id)
      .eq('is_active', true)
      .limit(1)
      .single();
    return data?.id || null;
  };

  const skipStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  if (isLoading || isCreatingOrg || (!currentOrganization && supabaseUser)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isCreatingOrg ? 'Setting up your account...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: 'Property', icon: Home },
    { number: 2, title: 'Unit', icon: DoorClosed },
    { number: 3, title: 'Tenant', icon: Users },
    { number: 4, title: 'Complete', icon: Check },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Rental Tools</h1>
          </div>
          <p className="text-gray-600">
            Welcome{userProfile?.first_name ? `, ${userProfile.first_name}` : ''}! Let's set up your first rental.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition ${
                      step.number < currentStep
                        ? 'bg-green-500 text-white'
                        : step.number === currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.number < currentStep ? (
                      <Check size={20} />
                    ) : (
                      <step.icon size={20} />
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${
                    step.number === currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-2 rounded ${
                      step.number < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Property */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your First Property</h2>
                <p className="text-gray-600">Enter the basic details about your rental property</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={propertyData.name}
                  onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })}
                  placeholder="e.g., Main Street Apartment"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={propertyData.address}
                  onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })}
                  placeholder="e.g., 123 Main Street"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={propertyData.city}
                    onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })}
                    placeholder="Toronto"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Province</label>
                  <input
                    type="text"
                    value={propertyData.state_province}
                    onChange={(e) => setPropertyData({ ...propertyData, state_province: e.target.value })}
                    placeholder="ON"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Postal Code</label>
                  <input
                    type="text"
                    value={propertyData.postal_code}
                    onChange={(e) => setPropertyData({ ...propertyData, postal_code: e.target.value })}
                    placeholder="M1M 1M1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={skipStep}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  <SkipForward size={18} />
                  Skip for Now
                </button>
                <button
                  onClick={handleCreateProperty}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
                >
                  {isSaving ? 'Creating...' : 'Continue'}
                  {!isSaving && <ArrowRight size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Unit */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DoorClosed className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create a Rental Unit</h2>
                <p className="text-gray-600">Add the details of the unit you'll be renting out</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Unit Number/Name
                  </label>
                  <input
                    type="text"
                    value={unitData.unit_number}
                    onChange={(e) => setUnitData({ ...unitData, unit_number: e.target.value })}
                    placeholder="e.g., 1, 2A, Basement"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Monthly Rent ($)
                  </label>
                  <input
                    type="number"
                    value={unitData.monthly_rent}
                    onChange={(e) => setUnitData({ ...unitData, monthly_rent: e.target.value })}
                    placeholder="e.g., 1500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bedrooms</label>
                  <select
                    value={unitData.bedrooms}
                    onChange={(e) => setUnitData({ ...unitData, bedrooms: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>Studio</option>
                    <option value={1}>1 Bedroom</option>
                    <option value={2}>2 Bedrooms</option>
                    <option value={3}>3 Bedrooms</option>
                    <option value={4}>4+ Bedrooms</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bathrooms</label>
                  <select
                    value={unitData.bathrooms}
                    onChange={(e) => setUnitData({ ...unitData, bathrooms: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 Bathroom</option>
                    <option value={1.5}>1.5 Bathrooms</option>
                    <option value={2}>2 Bathrooms</option>
                    <option value={2.5}>2.5 Bathrooms</option>
                    <option value={3}>3+ Bathrooms</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button
                  onClick={skipStep}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  <SkipForward size={18} />
                  Skip
                </button>
                <button
                  onClick={handleCreateUnit}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
                >
                  {isSaving ? 'Creating...' : 'Continue'}
                  {!isSaving && <ArrowRight size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Tenant */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your First Tenant</h2>
                <p className="text-gray-600">Enter your tenant's contact information</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tenantData.first_name}
                    onChange={(e) => setTenantData({ ...tenantData, first_name: e.target.value })}
                    placeholder="John"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tenantData.last_name}
                    onChange={(e) => setTenantData({ ...tenantData, last_name: e.target.value })}
                    placeholder="Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={tenantData.email}
                    onChange={(e) => setTenantData({ ...tenantData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={tenantData.phone}
                    onChange={(e) => setTenantData({ ...tenantData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lease Start</label>
                  <input
                    type="date"
                    value={tenantData.lease_start_date}
                    onChange={(e) => setTenantData({ ...tenantData, lease_start_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lease End</label>
                  <input
                    type="date"
                    value={tenantData.lease_end_date}
                    onChange={(e) => setTenantData({ ...tenantData, lease_end_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <button
                  onClick={skipStep}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  <SkipForward size={18} />
                  Skip
                </button>
                <button
                  onClick={handleCreateTenant}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
                >
                  {isSaving ? 'Creating...' : 'Complete Setup'}
                  {!isSaving && <Check size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">You're All Set!</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Your rental property management is configured and ready to use. Here's what you can do next:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 rounded-lg p-4 text-left">
                  <DollarSign className="w-8 h-8 text-blue-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Record Payments</h3>
                  <p className="text-sm text-gray-600">Track rent payments and outstanding balances</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-left">
                  <Home className="w-8 h-8 text-green-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Add More Properties</h3>
                  <p className="text-sm text-gray-600">Expand your portfolio with additional rentals</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-left">
                  <Users className="w-8 h-8 text-purple-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Invite Tenants</h3>
                  <p className="text-sm text-gray-600">Give tenants access to their portal</p>
                </div>
              </div>

              <button
                onClick={goToDashboard}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg"
              >
                Go to Dashboard
                <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <button
            onClick={goToDashboard}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Skip setup and go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
