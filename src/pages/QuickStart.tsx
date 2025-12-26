import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { propertyService } from '../services/propertyService';
import { unitService } from '../services/unitService';
import { tenantService } from '../services/tenantService';
import { businessService } from '../services/businessService';
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
  const { currentBusiness, userProfile, supabaseUser, refreshBusinesses } = useAuth();
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
  const [userBusinessId, setUserBusinessId] = useState<string | null>(null);
  const [needsBusinessCreation, setNeedsBusinessCreation] = useState(false);
  const [businessData, setBusinessData] = useState({
    business_name: '',
    phone: '',
    email: '',
  });

  // Wait for business to load from AuthContext
  useEffect(() => {
    if (currentBusiness) {
      setUserBusinessId(currentBusiness.id);
      setNeedsBusinessCreation(false);
      setIsLoading(false);
    } else if (supabaseUser) {
      // Give AuthContext time to load the business
      const timeout = setTimeout(async () => {
        if (!currentBusiness) {
          // Check if user has any businesses
          const businesses = await businessService.getUserBusinesses();
          if (businesses.length === 0) {
            // No business exists - user needs to create one
            setNeedsBusinessCreation(true);
            setCurrentStep(0); // Step 0 = create business
            setIsLoading(false);
          } else {
            setError('No business found. Please contact support or try refreshing the page.');
            setIsLoading(false);
          }
        }
      }, 3000); // Wait 3 seconds for business to load

      return () => clearTimeout(timeout);
    }
  }, [currentBusiness, supabaseUser]);

  // Load progress when we have a business
  useEffect(() => {
    if (currentBusiness?.id) {
      setUserBusinessId(currentBusiness.id);
      loadProgress();
    }
  }, [currentBusiness?.id]);

  const loadProgress = async () => {
    if (!currentBusiness?.id) return;

    try {
      const [propertiesRes, unitsRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true })
          .eq('business_id', currentBusiness.id).eq('is_active', true),
        supabase.from('units').select('id', { count: 'exact', head: true })
          .eq('is_active', true),
      ]);

      const propertyCount = propertiesRes.count || 0;
      const unitCount = unitsRes.count || 0;

      setProgress({
        hasProperty: propertyCount > 0,
        hasUnit: unitCount > 0,
        hasTenant: false,
        propertyCount,
        unitCount,
        tenantCount: 0,
      });

      // Auto-advance to appropriate step
      if (unitCount > 0) {
        setCurrentStep(3); // Complete
      } else if (propertyCount > 0) {
        setCurrentStep(2); // Add unit
      }
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFirstPropertyId = async () => {
    if (!currentBusiness?.id) return null;
    const { data } = await supabase
      .from('properties')
      .select('id')
      .eq('business_id', currentBusiness.id)
      .eq('is_active', true)
      .limit(1)
      .single();
    return data?.id || null;
  };

  const getFirstUnitId = async () => {
    const propertyId = createdPropertyId || await getFirstPropertyId();
    if (!propertyId) return null;
    const { data } = await supabase
      .from('units')
      .select('id')
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .limit(1)
      .single();
    return data?.id || null;
  };

  const handleCreateBusiness = async () => {
    if (!businessData.business_name.trim()) {
      setError('Business name is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const business = await businessService.createDefaultBusiness(
        businessData.business_name,
        {
          email: businessData.email || supabaseUser?.email,
          phone: businessData.phone,
        }
      );

      setUserBusinessId(business.id);
      setNeedsBusinessCreation(false);

      // Refresh businesses in AuthContext
      await refreshBusinesses();

      // Move to step 1 (create property)
      setCurrentStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProperty = async () => {
    if (!propertyData.name.trim()) {
      setError('Property name is required');
      return;
    }

    if (!userBusinessId) {
      setError('Unable to find your business. Please refresh the page.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const property = await propertyService.createProperty(userBusinessId, {
        name: propertyData.name,
        address_line1: propertyData.address,
        city: propertyData.city,
        state: propertyData.state_province,
        postal_code: propertyData.postal_code,
        country: 'CA',
        property_type: propertyData.property_type,
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

    if (!userBusinessId) {
      setError('Unable to find your business. Please refresh the page.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const unit = await unitService.createUnit(userBusinessId, propertyId, {
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

    if (!currentBusiness?.id) {
      setError('Unable to find your business. Please try again.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await tenantService.createTenant(currentBusiness.id, unitId, {
        first_name: tenantData.first_name,
        last_name: tenantData.last_name,
        email: tenantData.email,
        phone: tenantData.phone,
        lease_start_date: tenantData.lease_start_date || undefined,
        lease_end_date: tenantData.lease_end_date || undefined,
      });

      setProgress(prev => ({ ...prev, hasTenant: true, tenantCount: prev.tenantCount + 1 }));
      setCurrentStep(4);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create tenant';
      if (errorMsg.includes('LIMIT_REACHED')) {
        setError('You have reached the tenant limit for your package. Please upgrade to add more tenants.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipToNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkipOnboarding = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your business...</p>
        </div>
      </div>
    );
  }

  const steps = needsBusinessCreation ? [
    { id: 0, name: 'Business', icon: Building2 },
    { id: 1, name: 'Property', icon: Home },
    { id: 2, name: 'Unit', icon: DoorClosed },
    { id: 3, name: 'Complete', icon: Check },
  ] : [
    { id: 1, name: 'Property', icon: Home },
    { id: 2, name: 'Unit', icon: DoorClosed },
    { id: 3, name: 'Complete', icon: Check },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="w-10 h-10 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Property Wizard</h1>
          </div>
          <p className="text-gray-600">Welcome! Let's set up your first property.</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex flex-col items-center ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep >= step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="text-xs mt-1 font-medium">{step.name}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Step 0: Business (only if needed) */}
          {currentStep === 0 && needsBusinessCreation && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Business</h2>
                <p className="text-gray-600">First, let's set up your business information</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessData.business_name}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, business_name: e.target.value }))}
                    placeholder="e.g., ABC Property Management"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                  <input
                    type="email"
                    value={businessData.email}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={supabaseUser?.email || 'business@example.com'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone</label>
                  <input
                    type="tel"
                    value={businessData.phone}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(123) 456-7890"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleCreateBusiness}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Creating...' : 'Create Business'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Property */}
          {currentStep === 1 && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your First Property</h2>
                <p className="text-gray-600">Enter the basic details about your rental property</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={propertyData.name}
                    onChange={(e) => setPropertyData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Main Street Apartment"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={propertyData.address}
                    onChange={(e) => setPropertyData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g., 123 Main Street"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={propertyData.city}
                      onChange={(e) => setPropertyData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Toronto"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                    <input
                      type="text"
                      value={propertyData.state_province}
                      onChange={(e) => setPropertyData(prev => ({ ...prev, state_province: e.target.value }))}
                      placeholder="ON"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={propertyData.postal_code}
                      onChange={(e) => setPropertyData(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="M5V 1A1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleSkipOnboarding}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <SkipForward size={18} />
                  Skip to Dashboard
                </button>
                <button
                  onClick={handleCreateProperty}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
                >
                  {isSaving ? 'Creating...' : 'Create Property'}
                  {!isSaving && <ArrowRight size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Unit */}
          {currentStep === 2 && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DoorClosed className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add a Unit</h2>
                <p className="text-gray-600">Set up your first rental unit</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number/Name</label>
                  <input
                    type="text"
                    value={unitData.unit_number}
                    onChange={(e) => setUnitData(prev => ({ ...prev, unit_number: e.target.value }))}
                    placeholder="e.g., Unit 1, Apt A, Suite 101"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                    <select
                      value={unitData.bedrooms}
                      onChange={(e) => setUnitData(prev => ({ ...prev, bedrooms: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      {[0, 1, 2, 3, 4, 5].map(num => (
                        <option key={num} value={num}>{num === 0 ? 'Studio' : num}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                    <select
                      value={unitData.bathrooms}
                      onChange={(e) => setUnitData(prev => ({ ...prev, bathrooms: parseFloat(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      {[1, 1.5, 2, 2.5, 3, 3.5, 4].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent ($)</label>
                  <input
                    type="number"
                    value={unitData.monthly_rent}
                    onChange={(e) => setUnitData(prev => ({ ...prev, monthly_rent: e.target.value }))}
                    placeholder="e.g., 1500"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleGoBack}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleSkipToNext}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleCreateUnit}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
                  >
                    {isSaving ? 'Creating...' : 'Create Unit'}
                    {!isSaving && <ArrowRight size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {currentStep === 3 && (
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
                  <h3 className="font-semibold text-gray-900 mb-1">Manage Tenants</h3>
                  <p className="text-sm text-gray-600">View and manage all your tenants in one place</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
