import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, User, Mail, Phone, MapPin, Lock, Users, CheckCircle, Briefcase } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';
import { FullPageWizard } from '../components/FullPageWizard';

/**
 * Type 3 Registration: Property Management Company
 *
 * For users on Management tiers who manage properties for multiple clients.
 * Each client business has its own owners with separate access.
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

interface ManagementCompanyInfo {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

interface ClientBusinessInfo {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
}

interface BusinessOwner {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ownershipPercent: number;
  grantFullAccess: boolean;
}

export function RegisterType3() {
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

  const [companyInfo, setCompanyInfo] = useState<ManagementCompanyInfo>({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'Canada',
  });

  const [clientBusinessInfo, setClientBusinessInfo] = useState<ClientBusinessInfo>({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
  });

  const [setupFirstClient, setSetupFirstClient] = useState(false);
  const [businessOwners, setBusinessOwners] = useState<BusinessOwner[]>([]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const addBusinessOwner = () => {
    setBusinessOwners([...businessOwners, {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      ownershipPercent: 0,
      grantFullAccess: true,
    }]);
  };

  const removeBusinessOwner = (index: number) => {
    setBusinessOwners(businessOwners.filter((_, i) => i !== index));
  };

  const updateBusinessOwner = (index: number, field: keyof BusinessOwner, value: string | number | boolean) => {
    const updated = [...businessOwners];
    updated[index] = { ...updated[index], [field]: value };
    setBusinessOwners(updated);
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
      if (!companyInfo.name.trim()) {
        setError('Management company name is required');
        return false;
      }
      if (!companyInfo.addressLine1.trim() || !companyInfo.city.trim() || !companyInfo.stateProvince.trim() || !companyInfo.postalCode.trim()) {
        setError('Complete address is required');
        return false;
      }
    }

    if (step === 2) {
      if (setupFirstClient) {
        if (!clientBusinessInfo.name.trim()) {
          setError('Client business name is required');
          return false;
        }
        if (!clientBusinessInfo.addressLine1.trim() || !clientBusinessInfo.city.trim() || !clientBusinessInfo.stateProvince.trim() || !clientBusinessInfo.postalCode.trim()) {
          setError('Complete business address is required');
          return false;
        }
      }
    }

    if (step === 3) {
      if (setupFirstClient && businessOwners.length > 0) {
        for (const owner of businessOwners) {
          if (!owner.firstName.trim() || !owner.lastName.trim() || !owner.email.trim()) {
            setError('All business owner information is required');
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
      await register(
        personalInfo.email,
        personalInfo.password,
        personalInfo.firstName,
        personalInfo.lastName,
        'management_starter',
        {
          phone: personalInfo.phone,
          organizationName: companyInfo.name,
          managementCompany: true,
          addressLine1: companyInfo.addressLine1,
          addressLine2: companyInfo.addressLine2,
          city: companyInfo.city,
          stateProvince: companyInfo.stateProvince,
          postalCode: companyInfo.postalCode,
          country: companyInfo.country,
          setupFirstClient,
          clientBusiness: setupFirstClient ? clientBusinessInfo : undefined,
          businessOwners: setupFirstClient ? businessOwners : [],
        }
      );

      navigate('/onboarding/business');
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
      id: 'company',
      title: 'Management Company',
      description: 'Set up your property management company',
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Briefcase className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                This is your property management company information, which is separate from the client businesses you'll manage.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyInfo.name}
              onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Premier Property Management Inc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyInfo.addressLine1}
              onChange={(e) => setCompanyInfo({ ...companyInfo, addressLine1: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123 Management Boulevard"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              value={companyInfo.addressLine2}
              onChange={(e) => setCompanyInfo({ ...companyInfo, addressLine2: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Suite 200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyInfo.city}
                onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Toronto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Province <span className="text-red-500">*</span>
              </label>
              <select
                value={companyInfo.stateProvince}
                onChange={(e) => setCompanyInfo({ ...companyInfo, stateProvince: e.target.value })}
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
                value={companyInfo.postalCode}
                onChange={(e) => setCompanyInfo({ ...companyInfo, postalCode: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="M1M 1M1"
              />
            </div>
          </div>
        </div>
      ),
      isValid: companyInfo.name && companyInfo.addressLine1 && companyInfo.city && companyInfo.stateProvince && companyInfo.postalCode,
    },
    {
      id: 'client',
      title: 'First Client (Optional)',
      description: 'Add your first client business',
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={setupFirstClient}
                onChange={(e) => setSetupFirstClient(e.target.checked)}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-blue-900">Set up my first client business now</div>
                <div className="text-sm text-blue-700 mt-1">
                  You can also add clients later from your dashboard
                </div>
              </div>
            </label>
          </div>

          {setupFirstClient && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientBusinessInfo.name}
                  onChange={(e) => setClientBusinessInfo({ ...clientBusinessInfo, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Smith Family Properties LLC"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is the client's business entity that you'll be managing
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientBusinessInfo.addressLine1}
                  onChange={(e) => setClientBusinessInfo({ ...clientBusinessInfo, addressLine1: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="456 Client Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={clientBusinessInfo.addressLine2}
                  onChange={(e) => setClientBusinessInfo({ ...clientBusinessInfo, addressLine2: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientBusinessInfo.city}
                    onChange={(e) => setClientBusinessInfo({ ...clientBusinessInfo, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Province <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={clientBusinessInfo.stateProvince}
                    onChange={(e) => setClientBusinessInfo({ ...clientBusinessInfo, stateProvince: e.target.value })}
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
                    value={clientBusinessInfo.postalCode}
                    onChange={(e) => setClientBusinessInfo({ ...clientBusinessInfo, postalCode: e.target.value.toUpperCase() })}
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
      id: 'owners',
      title: 'Business Owners',
      description: 'Add client business owners',
      content: (
        <div className="space-y-6">
          {!setupFirstClient ? (
            <div className="text-center py-12 text-gray-600">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p>You can add business owners after setting up your first client</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    Business owners will receive their own login credentials to view their business data. They won't have access to your management company or other clients.
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {businessOwners.map((owner, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Business Owner {index + 1}</h4>
                      <button
                        onClick={() => removeBusinessOwner(index)}
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
                          value={owner.firstName}
                          onChange={(e) => updateBusinessOwner(index, 'firstName', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={owner.lastName}
                          onChange={(e) => updateBusinessOwner(index, 'lastName', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={owner.email}
                          onChange={(e) => updateBusinessOwner(index, 'email', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={owner.phone}
                          onChange={(e) => updateBusinessOwner(index, 'phone', formatPhoneNumber(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ownership (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={owner.ownershipPercent}
                          onChange={(e) => updateBusinessOwner(index, 'ownershipPercent', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={owner.grantFullAccess}
                            onChange={(e) => updateBusinessOwner(index, 'grantFullAccess', e.target.checked)}
                          />
                          <span className="text-sm text-gray-700">Grant full access</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addBusinessOwner}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-600 hover:text-blue-600 font-medium transition"
                >
                  + Add Business Owner
                </button>
              </div>
            </>
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
            <h3 className="font-semibold text-gray-900 mb-3">Management Company</h3>
            <p className="text-gray-700">{companyInfo.name}</p>
            <p className="text-sm text-gray-600">
              {companyInfo.addressLine1}, {companyInfo.city}, {companyInfo.stateProvince} {companyInfo.postalCode}
            </p>
          </div>

          {setupFirstClient && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">First Client Business</h3>
                <p className="text-gray-700">{clientBusinessInfo.name}</p>
                <p className="text-sm text-gray-600">
                  {clientBusinessInfo.addressLine1}, {clientBusinessInfo.city}, {clientBusinessInfo.stateProvince} {clientBusinessInfo.postalCode}
                </p>
              </div>

              {businessOwners.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Business Owners</h3>
                  <ul className="space-y-2">
                    {businessOwners.map((owner, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        {owner.firstName} {owner.lastName} ({owner.ownershipPercent}%) - {owner.email}
                        {owner.grantFullAccess && <span className="text-blue-600 ml-2">(Full Access)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              {setupFirstClient
                ? "After registration, you'll be guided through setting up properties for your client"
                : "After registration, you can add client businesses and properties from your dashboard"}
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
              <p className="text-sm text-gray-600">Property Management Company Setup</p>
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
