import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { packageTierService } from '../services/packageTierService';
import {
  Home, Building2, Users, CheckCircle, ArrowRight, Package,
  Sparkles, TrendingUp, FileText, Zap
} from 'lucide-react';

interface OnboardingStatus {
  has_business: boolean;
  has_property: boolean;
  has_unit: boolean;
  has_tenant: boolean;
  business_count: number;
  property_count: number;
  unit_count: number;
  tenant_count: number;
  is_complete: boolean;
  next_step: string;
}

interface PackageInfo {
  tier_name: string;
  max_units: number;
  max_properties: number;
  features: string[];
}

export function Welcome() {
  const navigate = useNavigate();
  const { supabaseUser } = useAuth();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWelcomeData();
  }, [supabaseUser]);

  const loadWelcomeData = async () => {
    if (!supabaseUser) return;

    try {
      const [statusData, profileData] = await Promise.all([
        supabase.rpc('user_has_completed_onboarding'),
        supabase
          .from('user_profiles')
          .select('first_name, last_name, selected_tier')
          .eq('user_id', supabaseUser.id)
          .single(),
      ]);

      if (statusData.data) {
        setOnboardingStatus(statusData.data as OnboardingStatus);
      }

      if (profileData.data) {
        setUserProfile(profileData.data);
        await loadPackageInfo(profileData.data.selected_tier);
      }
    } catch (error) {
      console.error('Error loading welcome data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPackageInfo = async (tierSlug: string) => {
    try {
      // Fetch package tier from database to get actual limits
      const tier = await packageTierService.getPackageTierBySlug(tierSlug);

      if (tier) {
        // Build dynamic features list based on actual package limits
        const features: string[] = [];

        // Add property limits
        if (tier.max_properties === 999999) {
          features.push('Unlimited Properties');
        } else {
          features.push(`Up to ${tier.max_properties} ${tier.max_properties === 1 ? 'Property' : 'Properties'}`);
        }

        // Add unit limits
        if (tier.max_units === 999999) {
          features.push('Unlimited Units');
        } else {
          features.push(`Up to ${tier.max_units} ${tier.max_units === 1 ? 'Unit' : 'Units'}`);
        }

        // Add tenant limits
        if (tier.max_tenants === 999999) {
          features.push('Unlimited Tenants');
        } else {
          features.push(`Up to ${tier.max_tenants} ${tier.max_tenants === 1 ? 'Tenant' : 'Tenants'}`);
        }

        // Add feature flags from the package
        const tierFeatures = tier.features as Record<string, boolean> || {};
        if (tierFeatures.basic_property_management !== false) features.push('Property Management');
        if (tierFeatures.tenant_management !== false) features.push('Tenant Management');
        if (tierFeatures.rent_tracking !== false) features.push('Rent Tracking');
        if (tierFeatures.maintenance_requests !== false) features.push('Maintenance Requests');
        if (tierFeatures.expense_tracking) features.push('Expense Tracking');
        if (tierFeatures.document_storage) features.push('Document Storage');
        if (tierFeatures.advanced_reporting) features.push('Advanced Reporting');
        if (tierFeatures.property_owner_management) features.push('Property Owner Management');
        if (tierFeatures.ai_recommendations) features.push('AI-Powered Recommendations');
        if (tierFeatures.rent_optimization) features.push('Rent Optimization');
        if (tierFeatures.bulk_operations) features.push('Bulk Operations');
        if (tierFeatures.priority_support) features.push('Priority Support');
        if (tierFeatures.white_label) features.push('White-Label Branding');
        if (tierFeatures.api_access) features.push('API Access');

        setPackageInfo({
          tier_name: tier.display_name,
          max_units: tier.max_units === 999999 ? -1 : tier.max_units,
          max_properties: tier.max_properties === 999999 ? -1 : tier.max_properties,
          features: features,
        });
      } else {
        // Fallback for when tier is not found in database
        setPackageInfo({
          tier_name: 'Free',
          max_units: 1,
          max_properties: 1,
          features: [
            'Up to 1 Property',
            'Up to 1 Unit',
            'Basic Property Management',
            'Tenant Management',
            'Rent Tracking',
          ],
        });
      }
    } catch (error) {
      console.error('Failed to load package info:', error);
      // Fallback on error
      setPackageInfo({
        tier_name: 'Free',
        max_units: 1,
        max_properties: 1,
        features: [
          'Up to 1 Property',
          'Up to 1 Unit',
          'Basic Property Management',
        ],
      });
    }
  };

  const handleNextStep = () => {
    if (!onboardingStatus) return;

    switch (onboardingStatus.next_step) {
      case 'create_business':
        navigate('/quick-start');
        break;
      case 'create_property':
        navigate('/properties?new=true');
        break;
      case 'create_unit':
        navigate('/properties');
        break;
      case 'create_tenant':
        navigate('/tenants?new=true');
        break;
      case 'complete':
        navigate('/dashboard');
        break;
      default:
        navigate('/quick-start');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const firstName = userProfile?.first_name || 'there';
  const isComplete = onboardingStatus?.is_complete;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome{firstName !== 'there' && ', '}{firstName}!
          </h1>
          <p className="text-xl text-gray-600">
            Let's get your rental property management set up
          </p>
        </div>

        {packageInfo && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Package: {packageInfo.tier_name}</h2>
                <p className="text-gray-600">
                  {packageInfo.max_units === -1 ? 'Unlimited' : `Up to ${packageInfo.max_units}`} rental units
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {packageInfo.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 bg-blue-50 rounded-lg p-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {packageInfo.tier_name === 'Free' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-gray-600 text-center">
                  Want more features?{' '}
                  <button
                    onClick={() => navigate('/pricing')}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    View our plans
                  </button>
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Getting Started Checklist</h2>

          <div className="space-y-4">
            <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
              onboardingStatus?.has_business
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                onboardingStatus?.has_business
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {onboardingStatus?.has_business ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Building2 className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Business Profile</h3>
                <p className="text-sm text-gray-600">
                  {onboardingStatus?.has_business
                    ? `Your business profile is set up (${onboardingStatus.business_count} business${onboardingStatus.business_count !== 1 ? 'es' : ''})`
                    : 'Create your business to organize your properties'}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
              onboardingStatus?.has_property
                ? 'bg-green-50 border-green-200'
                : onboardingStatus?.has_business
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                onboardingStatus?.has_property
                  ? 'bg-green-500 text-white'
                  : onboardingStatus?.has_business
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {onboardingStatus?.has_property ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Home className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Add Your First Property</h3>
                <p className="text-sm text-gray-600">
                  {onboardingStatus?.has_property
                    ? `You have ${onboardingStatus.property_count} ${onboardingStatus.property_count === 1 ? 'property' : 'properties'}`
                    : 'Add the address and details of your rental property'}
                </p>
              </div>
              {onboardingStatus?.has_business && !onboardingStatus?.has_property && (
                <button
                  onClick={() => navigate('/properties?new=true')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
                >
                  Add Property
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
              onboardingStatus?.has_unit
                ? 'bg-green-50 border-green-200'
                : onboardingStatus?.has_property
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                onboardingStatus?.has_unit
                  ? 'bg-green-500 text-white'
                  : onboardingStatus?.has_property
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {onboardingStatus?.has_unit ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Building2 className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Create Rental Units</h3>
                <p className="text-sm text-gray-600">
                  {onboardingStatus?.has_unit
                    ? `You have ${onboardingStatus.unit_count} ${onboardingStatus.unit_count === 1 ? 'unit' : 'units'}`
                    : 'Define the apartments, suites, or units you rent out'}
                </p>
              </div>
              {onboardingStatus?.has_property && !onboardingStatus?.has_unit && (
                <button
                  onClick={() => navigate('/properties')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
                >
                  Add Units
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
              onboardingStatus?.has_tenant
                ? 'bg-green-50 border-green-200'
                : onboardingStatus?.has_unit
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                onboardingStatus?.has_tenant
                  ? 'bg-green-500 text-white'
                  : onboardingStatus?.has_unit
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {onboardingStatus?.has_tenant ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Users className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Add Your Tenants</h3>
                <p className="text-sm text-gray-600">
                  {onboardingStatus?.has_tenant
                    ? `You have ${onboardingStatus.tenant_count} ${onboardingStatus.tenant_count === 1 ? 'tenant' : 'tenants'}`
                    : 'Add tenant information and start tracking rent'}
                </p>
              </div>
              {onboardingStatus?.has_unit && !onboardingStatus?.has_tenant && (
                <button
                  onClick={() => navigate('/tenants?new=true')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
                >
                  Add Tenant
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {isComplete ? (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-8 text-white text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-3">You're All Set!</h2>
            <p className="text-green-100 mb-6 text-lg">
              Your rental property management is configured and ready to use
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 bg-white text-green-600 rounded-lg hover:bg-green-50 font-semibold text-lg inline-flex items-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg p-8 text-white text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-3">Ready to Get Started?</h2>
              <p className="text-blue-100 mb-6">
                {onboardingStatus?.next_step === 'create_business' &&
                  "Let's set up your business and start managing your rentals"}
                {onboardingStatus?.next_step === 'create_property' &&
                  "Let's add your first property to begin managing your rentals"}
                {onboardingStatus?.next_step === 'create_unit' &&
                  "Let's create units for your properties"}
              </p>
              <button
                onClick={handleNextStep}
                className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-lg inline-flex items-center gap-2"
              >
                {onboardingStatus?.next_step === 'create_business' && 'Start Property Wizard'}
                {onboardingStatus?.next_step === 'create_property' && 'Add First Property'}
                {onboardingStatus?.next_step === 'create_unit' && 'Create Units'}
                {onboardingStatus?.next_step === 'complete' && 'Go to Dashboard'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Skip and go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
