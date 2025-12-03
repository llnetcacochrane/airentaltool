import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Building2, Users, Briefcase } from 'lucide-react';
import { packageTierService, PackageTier } from '../services/packageTierService';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';

export function Pricing() {
  const [singleCompanyPackages, setSingleCompanyPackages] = useState<PackageTier[]>([]);
  const [managementPackages, setManagementPackages] = useState<PackageTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'single' | 'management'>('single');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await packageTierService.getAllPackageTiers();
      const single = data.filter(pkg => pkg.package_type === 'single_company');
      const management = data.filter(pkg => pkg.package_type === 'management_company');
      setSingleCompanyPackages(single);
      setManagementPackages(management);
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Contact Us';
    return `$${(cents / 100).toFixed(0)}`;
  };

  const getKeyFeatures = (pkg: PackageTier): string[] => {
    const features: string[] = [];

    if (pkg.package_type === 'single_company') {
      if (pkg.max_properties === 999999) {
        features.push('Unlimited Properties');
      } else {
        features.push(`Up to ${pkg.max_properties} ${pkg.max_properties === 1 ? 'Property' : 'Properties'}`);
      }

      if (pkg.max_units === 999999) {
        features.push('Unlimited Units');
      } else {
        features.push(`Up to ${pkg.max_units} Unit${pkg.max_units > 1 ? 's' : ''}`);
      }

      if (pkg.max_tenants === 999999) {
        features.push('Unlimited Tenants');
      } else {
        features.push(`Up to ${pkg.max_tenants} Tenant${pkg.max_tenants > 1 ? 's' : ''}`);
      }
    } else {
      if (pkg.max_businesses === 999999) {
        features.push('Unlimited Client Businesses');
      } else {
        features.push(`Up to ${pkg.max_businesses} Client Business${pkg.max_businesses > 1 ? 'es' : ''}`);
      }

      if (pkg.max_units === 999999) {
        features.push('Unlimited Total Units');
      } else {
        features.push(`Up to ${pkg.max_units} Total Units`);
      }

      if (pkg.max_users === 999999) {
        features.push('Unlimited Staff Users');
      } else {
        features.push(`Up to ${pkg.max_users} Staff User${pkg.max_users > 1 ? 's' : ''}`);
      }
    }

    const featuresObj = pkg.features as Record<string, boolean> || {};
    if (featuresObj.advanced_reporting) features.push('Advanced Reporting');
    if (featuresObj.white_label) features.push('White Label Branding');
    if (featuresObj.api_access) features.push('API Access');
    if (featuresObj.priority_support) features.push('Priority Support');

    return features;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <PublicHeader />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Whether you're managing your own properties or running a property management company, we have the perfect plan for you.
            </p>

            <div className="inline-flex items-center gap-3 p-1 bg-gray-100 rounded-lg mb-12">
              <button
                onClick={() => setActiveCategory('single')}
                className={`px-6 py-3 rounded-md font-medium transition flex items-center gap-2 ${
                  activeCategory === 'single'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Building2 size={20} />
                Direct Landlords
              </button>
              <button
                onClick={() => setActiveCategory('management')}
                className={`px-6 py-3 rounded-md font-medium transition flex items-center gap-2 ${
                  activeCategory === 'management'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Briefcase size={20} />
                Property Management Companies
              </button>
            </div>

            {activeCategory === 'single' && (
              <div className="inline-flex items-center gap-3 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-md font-medium transition ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-6 py-2 rounded-md font-medium transition ${
                    billingCycle === 'annual'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Annual
                  <span className="ml-2 text-xs text-green-600 font-semibold">Save 17%</span>
                </button>
              </div>
            )}
          </div>

          {activeCategory === 'single' ? (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  For Direct Landlords
                </h2>
                <p className="text-gray-600">
                  Manage your own rental properties with ease. Perfect for individual landlords of all sizes.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {singleCompanyPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`bg-white rounded-2xl shadow-lg p-8 transition hover:shadow-xl ${
                      pkg.is_featured ? 'ring-2 ring-blue-600 relative' : ''
                    }`}
                  >
                    {pkg.is_featured && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.display_name}</h3>
                      <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-gray-900">
                          {billingCycle === 'monthly'
                            ? formatPrice(pkg.monthly_price_cents)
                            : formatPrice(pkg.annual_price_cents / 12)
                          }
                        </span>
                        {pkg.monthly_price_cents > 0 && (
                          <span className="text-gray-600">/month</span>
                        )}
                      </div>
                      {billingCycle === 'annual' && pkg.monthly_price_cents > 0 && (
                        <p className="text-sm text-green-600 font-medium">
                          Billed ${(pkg.annual_price_cents / 100).toFixed(0)} annually
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {getKeyFeatures(pkg).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={`/register?tier=${pkg.tier_slug}`}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                        pkg.is_featured
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      Get Started
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  For Property Management Companies
                </h2>
                <p className="text-gray-600">
                  Manage multiple client businesses and their properties from one powerful platform.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {managementPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`bg-white rounded-2xl shadow-lg p-6 transition hover:shadow-xl ${
                      pkg.is_featured ? 'ring-2 ring-blue-600 relative' : ''
                    }`}
                  >
                    {pkg.is_featured && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.display_name}</h3>
                      <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
                      <div className="mb-2">
                        <span className="text-3xl font-bold text-gray-900">
                          {formatPrice(pkg.monthly_price_cents)}
                        </span>
                        {pkg.monthly_price_cents > 0 && (
                          <span className="text-gray-600">/month</span>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {getKeyFeatures(pkg).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={pkg.monthly_price_cents === 0 ? '/contact' : `/register?tier=${pkg.tier_slug}`}
                      className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition text-sm ${
                        pkg.is_featured
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {pkg.monthly_price_cents === 0 ? 'Contact Sales' : 'Get Started'}
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-20 text-center">
            <p className="text-gray-600 mb-4">
              All plans include a 14-day free trial. No credit card required.
            </p>
            <p className="text-sm text-gray-500">
              Need help choosing? <Link to="/contact" className="text-blue-600 hover:underline">Contact our sales team</Link>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
