import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, ArrowRight, Check, Upload, Zap, FileText, Download, Home, Users } from 'lucide-react';
import { propertyService } from '../services/propertyService';
import { tenantService } from '../services/tenantService';

type SetupMethod = 'quick' | 'import' | 'skip';

export function Onboarding() {
  const [searchParams] = useSearchParams();
  const tierSlug = searchParams.get('tier') || 'basic';
  const [step, setStep] = useState(1);
  const [organizationName, setOrganizationName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [setupMethod, setSetupMethod] = useState<SetupMethod>('quick');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { createOrganization, currentOrganization } = useAuth();

  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyProvince, setPropertyProvince] = useState('');
  const [propertyPostal, setPropertyPostal] = useState('');
  const [numberOfUnits, setNumberOfUnits] = useState(1);

  const [tenantFirstName, setTenantFirstName] = useState('');
  const [tenantLastName, setTenantLastName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');

  const handleCreateOrganization = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!organizationName.trim()) {
      setError('Organization name is required');
      return;
    }

    setIsLoading(true);

    try {
      const baseSlug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const slug = `${baseSlug}-${uniqueSuffix}`;

      await createOrganization(organizationName, slug, companyName, tierSlug);
      setStep(2);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create organization';

      if (errorMessage.includes('duplicate key') || errorMessage.includes('organizations_slug_key')) {
        setError('An organization with this name already exists. Please try a different name.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPropertySetup = async () => {
    if (!propertyName.trim()) {
      setError('Property name is required');
      return;
    }

    setIsLoading(true);
    try {
      const property = await propertyService.createProperty({
        name: propertyName,
        address: propertyAddress,
        city: propertyCity,
        state_province: propertyProvince,
        postal_code: propertyPostal,
        country: 'Canada',
        property_type: 'residential',
        total_units: numberOfUnits,
      });

      for (let i = 1; i <= numberOfUnits; i++) {
        await propertyService.createUnit(property.id, {
          unit_number: i.toString(),
          bedrooms: 1,
          bathrooms: 1,
          square_feet: 800,
          monthly_rent: 0,
        });
      }

      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create property');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTenantSetup = async () => {
    setIsLoading(true);
    try {
      if (tenantFirstName.trim() && tenantLastName.trim()) {
        await tenantService.createTenant({
          first_name: tenantFirstName,
          last_name: tenantLastName,
          email: tenantEmail,
          phone: tenantPhone,
        });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant');
      setIsLoading(false);
    }
  };

  const skipToComplete = () => {
    navigate('/dashboard');
  };

  const downloadCSVTemplate = (type: 'properties' | 'tenants') => {
    if (type === 'properties') {
      const template = 'Name,Address,City,Province,Postal Code,Property Type,Total Units\nMy Property,123 Main St,Toronto,ON,M1M 1M1,residential,4\n';
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'properties_template.csv';
      a.click();
    } else {
      const template = 'First Name,Last Name,Email,Phone\nJohn,Doe,john@example.com,(555) 123-4567\n';
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tenants_template.csv';
      a.click();
    }
  };

  const nextStep = () => {
    setError('');
    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const totalSteps = setupMethod === 'quick' ? 4 : setupMethod === 'import' ? 3 : 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Building2 className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">AI Rental Tools</h1>
          </div>

          {tierSlug && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm text-center">
                Setting up your <span className="font-semibold capitalize">{tierSlug}</span> plan
              </p>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              {Array.from({ length: totalSteps }).map((_, idx) => {
                const s = idx + 1;
                return (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        s === step
                          ? 'bg-blue-600 text-white'
                          : s < step
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {s < step ? <Check size={20} /> : s}
                    </div>
                    {s < totalSteps && (
                      <div
                        className={`w-12 h-1 ${
                          s < step ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome! Let's set up your account
                </h2>
                <p className="text-gray-600">Tell us about your organization</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="My Rental Properties"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be used to identify your account
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="My Real Estate Company"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Displayed on documents and agreements
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateOrganization}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {isLoading ? 'Creating...' : 'Continue'}
                {!isLoading && <ArrowRight size={20} />}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  How would you like to get started?
                </h2>
                <p className="text-gray-600">Choose the setup method that works best for you</p>
              </div>

              <div className="space-y-4">
                <label
                  className={`block p-6 border-2 rounded-xl cursor-pointer transition ${
                    setupMethod === 'quick'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="setup"
                    value="quick"
                    checked={setupMethod === 'quick'}
                    onChange={(e) => setSetupMethod(e.target.value as SetupMethod)}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-4">
                    <Zap className="w-8 h-8 text-blue-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Quick Start Wizard
                      </h3>
                      <p className="text-sm text-gray-600">
                        Add your first property and tenant through a simple guided wizard
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`block p-6 border-2 rounded-xl cursor-pointer transition ${
                    setupMethod === 'import'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="setup"
                    value="import"
                    checked={setupMethod === 'import'}
                    onChange={(e) => setSetupMethod(e.target.value as SetupMethod)}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-4">
                    <Upload className="w-8 h-8 text-blue-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Import from CSV
                      </h3>
                      <p className="text-sm text-gray-600">
                        Bulk import properties and tenants from spreadsheet files
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`block p-6 border-2 rounded-xl cursor-pointer transition ${
                    setupMethod === 'skip'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="setup"
                    value="skip"
                    checked={setupMethod === 'skip'}
                    onChange={(e) => setSetupMethod(e.target.value as SetupMethod)}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-4">
                    <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Start from Scratch
                      </h3>
                      <p className="text-sm text-gray-600">
                        Skip setup and add your data manually in the dashboard
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (setupMethod === 'skip') {
                      skipToComplete();
                    } else {
                      nextStep();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Continue
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && setupMethod === 'import' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Import Your Data
                </h2>
                <p className="text-gray-600">Download templates and upload your CSV files</p>
              </div>

              <div className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <div className="text-center">
                    <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Properties & Units
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Import all your properties and their units in one go
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        type="button"
                        onClick={() => downloadCSVTemplate('properties')}
                        className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        <Download size={16} />
                        Download Template
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        <Upload size={16} />
                        Upload CSV
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Tenants
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Import your tenant contact information
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        type="button"
                        onClick={() => downloadCSVTemplate('tenants')}
                        className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        <Download size={16} />
                        Download Template
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        <Upload size={16} />
                        Upload CSV
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> CSV import will be processed in the background. You can continue to the dashboard and check the status in Settings.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={skipToComplete}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Continue to Dashboard
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && setupMethod === 'quick' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Add Your First Property
                </h2>
                <p className="text-gray-600">Start by adding a property and its units</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="Main Street Apartments"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={propertyCity}
                    onChange={(e) => setPropertyCity(e.target.value)}
                    placeholder="Toronto"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Province
                  </label>
                  <input
                    type="text"
                    value={propertyProvince}
                    onChange={(e) => setPropertyProvince(e.target.value)}
                    placeholder="ON"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Postal
                  </label>
                  <input
                    type="text"
                    value={propertyPostal}
                    onChange={(e) => setPropertyPostal(e.target.value)}
                    placeholder="M1M 1M1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Units
                </label>
                <input
                  type="number"
                  min="1"
                  value={numberOfUnits}
                  onChange={(e) => setNumberOfUnits(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll create placeholder units that you can customize later
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleQuickPropertySetup}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {isLoading ? 'Creating...' : 'Continue'}
                  {!isLoading && <ArrowRight size={20} />}
                </button>
              </div>
            </div>
          )}

          {step === 4 && setupMethod === 'quick' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Add Your First Tenant (Optional)
                </h2>
                <p className="text-gray-600">You can skip this and add tenants later</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={tenantFirstName}
                    onChange={(e) => setTenantFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={tenantLastName}
                    onChange={(e) => setTenantLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={skipToComplete}
                  className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleQuickTenantSetup}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {isLoading ? 'Creating...' : 'Complete Setup'}
                  {!isLoading && <Check size={20} />}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          You can always add or import more data later from your dashboard
        </p>
      </div>
    </div>
  );
}
