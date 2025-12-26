import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, User, Mail, Phone, MapPin, Lock, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';
import { FullPageWizard } from '../components/FullPageWizard';

/**
 * Type 2 Registration: Multi-Property Landlord
 *
 * For users on Professional tiers who manage multiple properties.
 * May have business partners/co-owners.
 */

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

interface OrganizationInfo {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

interface BusinessInfo {
  useSameAsOrg: boolean;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
}

interface Partner {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ownershipPercent: number;
}

export function RegisterType2() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const [orgInfo, setOrgInfo] = useState<OrganizationInfo>({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'Canada',
  });

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    useSameAsOrg: true,
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
  });

  const [hasPartners, setHasPartners] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const addPartner = () => {
    setPartners([...partners, {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      ownershipPercent: 0,
    }]);
  };

  const removePartner = (index: number) => {
    setPartners(partners.filter((_, i) => i !== index));
  };

  const updatePartner = (index: number, field: keyof Partner, value: string | number) => {
    const updated = [...partners];
    updated[index] = { ...updated[index], [field]: value };
    setPartners(updated);
  };

  const validateStep = (step: number): boolean => {
    setError('');

    if (step === 0) {
      if (!personalInfo.firstName.trim() || !personalInfo.lastName.trim()) {
        setError('Name is required');
        return false;
      }
      if (!personalInfo.email.trim()) {
        setError('Email is required');
        return false;
      }
      if (personalInfo.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (personalInfo.password !== personalInfo.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      const phoneDigits = personalInfo.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        setError('Please enter a valid phone number');
        return false;
      }
    }

    if (step === 1) {
      if (!orgInfo.name.trim()) {
        setError('Organization name is required');
        return false;
      }
      if (!orgInfo.addressLine1.trim() || !orgInfo.city.trim() || !orgInfo.stateProvince.trim() || !orgInfo.postalCode.trim()) {
        setError('Complete address is required');
        return false;
      }
    }

    if (step === 2) {
      if (!businessInfo.useSameAsOrg) {
        if (!businessInfo.name.trim()) {
          setError('Business name is required');
          return false;
        }
        if (!businessInfo.addressLine1.trim() || !businessInfo.city.trim() || !businessInfo.stateProvince.trim() || !businessInfo.postalCode.trim()) {
          setError('Complete business address is required');
          return false;
        }
      }
    }

    if (step === 3) {
      if (hasPartners && partners.length > 0) {
        for (const partner of partners) {
          if (!partner.firstName.trim() || !partner.lastName.trim() || !partner.email.trim()) {
            setError('All partner information is required');
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    setError('');

    try {
      // Determine business info to use
      // If "use same as org" is checked, business uses org info
      const finalBusinessInfo = businessInfo.useSameAsOrg
        ? {
            name: orgInfo.name,
            addressLine1: orgInfo.addressLine1,
            addressLine2: orgInfo.addressLine2,
            city: orgInfo.city,
            stateProvince: orgInfo.stateProvince,
            postalCode: orgInfo.postalCode,
          }
        : businessInfo;

      // Organization uses org address info always
      await register(
        personalInfo.email,
        personalInfo.password,
        personalInfo.firstName,
        personalInfo.lastName,
        'professional',
        {
          phone: personalInfo.phone,
          // Organization info (separate from business for multi-property landlords)
          organizationName: orgInfo.name,
          // Business info (may be same as org or different)
          businessName: finalBusinessInfo.name,
          // Use organization address for both org and business when "same as org"
          addressLine1: orgInfo.addressLine1,
          addressLine2: orgInfo.addressLine2 || '',
          city: orgInfo.city,
          stateProvince: orgInfo.stateProvince,
          postalCode: orgInfo.postalCode,
          country: orgInfo.country,
          // Partner information
          hasPartners,
          partners: hasPartners ? partners : [],
        }
      );

      navigate('/onboarding/property');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
    }
  };

  const steps = [
    {
      id: 'personal',
      title: 'Your Information',
      description: 'Create your account',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={personalInfo.firstName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={personalInfo.lastName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({ ...personalInfo, phone: formatPhoneNumber(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={personalInfo.password}
                onChange={(e) => setPersonalInfo({ ...personalInfo, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={personalInfo.confirmPassword}
                onChange={(e) => setPersonalInfo({ ...personalInfo, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>
      ),
      isValid: personalInfo.firstName && personalInfo.email && personalInfo.password.length >= 6,
    },
    {
      id: 'organization',
      title: 'Organization Setup',
      description: 'Set up your organization',
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orgInfo.name}
              onChange={(e) => setOrgInfo({ ...orgInfo, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Acme Property Management"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your organization name for administrative purposes
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orgInfo.addressLine1}
              onChange={(e) => setOrgInfo({ ...orgInfo, addressLine1: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123 Business Street"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              value={orgInfo.addressLine2}
              onChange={(e) => setOrgInfo({ ...orgInfo, addressLine2: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Suite 100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={orgInfo.city}
                onChange={(e) => setOrgInfo({ ...orgInfo, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Toronto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Province <span className="text-red-500">*</span>
              </label>
              <select
                value={orgInfo.stateProvince}
                onChange={(e) => setOrgInfo({ ...orgInfo, stateProvince: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {CANADIAN_PROVINCES.map((prov) => (
                  <option key={prov.code} value={prov.code}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={orgInfo.postalCode}
                onChange={(e) => setOrgInfo({ ...orgInfo, postalCode: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="M1M 1M1"
              />
            </div>
          </div>
        </div>
      ),
      isValid: orgInfo.name && orgInfo.addressLine1 && orgInfo.city && orgInfo.stateProvince && orgInfo.postalCode,
    },
    {
      id: 'business',
      title: 'First Business',
      description: 'Set up your first business',
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={businessInfo.useSameAsOrg}
                onChange={(e) => setBusinessInfo({ ...businessInfo, useSameAsOrg: e.target.checked })}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-blue-900">Use same information as organization</div>
                <div className="text-sm text-blue-700 mt-1">
                  Your first business will use the organization name and address
                </div>
              </div>
            </label>
          </div>

          {!businessInfo.useSameAsOrg && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessInfo.name}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Main Street Properties LLC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessInfo.addressLine1}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, addressLine1: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="456 Property Lane"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessInfo.city}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Province <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={businessInfo.stateProvince}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, stateProvince: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    {CANADIAN_PROVINCES.map((prov) => (
                      <option key={prov.code} value={prov.code}>
                        {prov.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessInfo.postalCode}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, postalCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ),
      isValid: true,
    },
    {
      id: 'partners',
      title: 'Business Partners',
      description: 'Add co-owners (optional)',
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPartners}
                onChange={(e) => setHasPartners(e.target.checked)}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-blue-900">I have business partners or co-owners</div>
                <div className="text-sm text-blue-700 mt-1">
                  Partners will receive their own login credentials and access to business data
                </div>
              </div>
            </label>
          </div>

          {hasPartners && (
            <div className="space-y-4">
              {partners.map((partner, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Partner {index + 1}</h4>
                    <button
                      onClick={() => removePartner(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={partner.firstName}
                        onChange={(e) => updatePartner(index, 'firstName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={partner.lastName}
                        onChange={(e) => updatePartner(index, 'lastName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={partner.email}
                        onChange={(e) => updatePartner(index, 'email', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={partner.phone}
                        onChange={(e) => updatePartner(index, 'phone', formatPhoneNumber(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ownership Percentage (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={partner.ownershipPercent}
                        onChange={(e) => updatePartner(index, 'ownershipPercent', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addPartner}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-600 hover:text-blue-600 font-medium transition"
              >
                + Add Partner
              </button>
            </div>
          )}
        </div>
      ),
      isValid: true,
    },
    {
      id: 'review',
      title: 'Review & Confirm',
      description: 'Review your information',
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>
            <p className="text-gray-700">{personalInfo.firstName} {personalInfo.lastName}</p>
            <p className="text-sm text-gray-600">{personalInfo.email}</p>
            <p className="text-sm text-gray-600">{personalInfo.phone}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Organization</h3>
            <p className="text-gray-700">{orgInfo.name}</p>
            <p className="text-sm text-gray-600">
              {orgInfo.addressLine1}, {orgInfo.city}, {orgInfo.stateProvince} {orgInfo.postalCode}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">First Business</h3>
            <p className="text-gray-700">
              {businessInfo.useSameAsOrg ? orgInfo.name : businessInfo.name}
            </p>
            {businessInfo.useSameAsOrg ? (
              <p className="text-sm text-gray-600">Using organization information</p>
            ) : (
              <p className="text-sm text-gray-600">
                {businessInfo.addressLine1}, {businessInfo.city}, {businessInfo.stateProvince} {businessInfo.postalCode}
              </p>
            )}
          </div>

          {hasPartners && partners.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Partners</h3>
              <ul className="space-y-2">
                {partners.map((partner, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    {partner.firstName} {partner.lastName} ({partner.ownershipPercent}%) - {partner.email}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              After registration, you'll be guided through setting up your first property
            </div>
          </div>
        </div>
      ),
      isValid: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <FullPageWizard
        steps={steps}
        currentStep={currentStep}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onComplete={handleComplete}
        onStepChange={setCurrentStep}
        isLoading={isLoading}
        error={error}
        showProgress={true}
        showStepList={true}
        headerContent={
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
              <p className="text-sm text-gray-600">Multi-Property Landlord Setup</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Cancel
            </button>
          </div>
        }
      />
    </div>
  );
}
