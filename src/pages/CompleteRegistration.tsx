import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { userInvitationService } from '../services/userInvitationService';
import { ValidatedInvitation } from '../types';
import { UserPlus, Building2, Home, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';

// Canadian provinces/territories
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

// US States
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

interface RegistrationFormData {
  password: string;
  confirmPassword: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
}

export function CompleteRegistration() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [isValidating, setIsValidating] = useState(true);
  const [invitation, setInvitation] = useState<ValidatedInvitation | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [formData, setFormData] = useState<RegistrationFormData>({
    password: '',
    confirmPassword: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: 'Canada',
  });

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setValidationError('No invitation token provided. Please check the link in your email.');
        setIsValidating(false);
        return;
      }

      try {
        const result = await userInvitationService.validateInvitationToken(token);
        if (!result) {
          setValidationError('This invitation link is invalid or has expired. Please contact the sender for a new invitation.');
        } else {
          setInvitation(result);
          // Pre-fill phone if available
          if (result.phone) {
            setFormData(prev => ({ ...prev, phone: result.phone || '' }));
          }
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setValidationError('An error occurred while validating your invitation. Please try again later.');
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const updateField = (field: keyof RegistrationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStateProvinceOptions = () => {
    if (formData.country === 'Canada') {
      return CANADIAN_PROVINCES;
    } else if (formData.country === 'United States') {
      return US_STATES;
    }
    return [];
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    updateField('phone', formatted);
  };

  const getInvitationTypeDisplay = (type: string) => {
    switch (type) {
      case 'property_owner':
        return { label: 'Property Owner', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-100' };
      case 'tenant':
        return { label: 'Tenant', icon: Home, color: 'text-green-600', bg: 'bg-green-100' };
      case 'team_member':
        return { label: 'Team Member', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' };
      default:
        return { label: 'User', icon: UserPlus, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const validateForm = (): string | null => {
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    // Password strength validation
    if (!/[A-Z]/.test(formData.password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(formData.password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(formData.password)) return 'Password must contain at least one number';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';

    // Phone validation - must have at least 10 digits
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) return 'Please enter a valid phone number';

    if (!formData.addressLine1.trim()) return 'Address is required';
    if (formData.addressLine1.length > 255) return 'Address is too long';
    if (!formData.city.trim()) return 'City is required';
    if (formData.city.length > 100) return 'City name is too long';
    if (!formData.stateProvince.trim()) return 'State/Province is required';
    if (!formData.postalCode.trim()) return 'Postal code is required';

    // Postal code format validation
    if (formData.country === 'Canada') {
      const canadaPostalRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
      if (!canadaPostalRegex.test(formData.postalCode)) {
        return 'Please enter a valid Canadian postal code (e.g., A1A 1A1)';
      }
    } else if (formData.country === 'United States') {
      const usZipRegex = /^\d{5}(-\d{4})?$/;
      if (!usZipRegex.test(formData.postalCode)) {
        return 'Please enter a valid US ZIP code (e.g., 12345 or 12345-6789)';
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !token) return;

    setFormError('');
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          data: {
            first_name: invitation.first_name,
            last_name: invitation.last_name,
            phone: formData.phone,
            invitation_type: invitation.invitation_type,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // 2. Accept the invitation (links auth user to business)
      await userInvitationService.acceptInvitation(token, authData.user.id);

      // 3. Create user profile with address
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          email: invitation.email,
          phone: formData.phone,
          address_line1: formData.addressLine1,
          address_line2: formData.addressLine2 || null,
          city: formData.city,
          state_province: formData.stateProvince,
          postal_code: formData.postalCode,
          country: formData.country,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Non-fatal - continue anyway
      }

      setIsComplete(true);

    } catch (err) {
      console.error('Registration error:', err);
      setFormError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Validating Invitation</h2>
            <p className="text-gray-600">Please wait while we verify your invitation...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (validationError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">{validationError}</p>
            <Link
              to="/login"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Go to Login
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Success state
  if (isComplete) {
    const typeInfo = getInvitationTypeDisplay(invitation?.invitation_type || '');
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Registration Complete!</h2>
            <p className="text-gray-600 mb-4">
              Your account has been created successfully. Please check your email to verify your account, then you can sign in.
            </p>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${typeInfo.bg} ${typeInfo.color} mb-6`}>
              <typeInfo.icon className="w-4 h-4" />
              <span className="font-medium">{typeInfo.label}</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              at <span className="font-medium">{invitation?.business_name}</span>
            </p>
            <Link
              to="/login"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Go to Login
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Registration form
  const typeInfo = getInvitationTypeDisplay(invitation?.invitation_type || '');
  const TypeIcon = typeInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <UserPlus className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Complete Registration</h1>
            </div>

            {/* Invitation Info Card */}
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${typeInfo.bg}`}>
                  <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">You've been invited as a</p>
                  <p className={`font-semibold ${typeInfo.color}`}>{typeInfo.label}</p>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm text-gray-500">Business</p>
                <p className="font-medium text-gray-900">{invitation?.business_name}</p>
              </div>
              {invitation?.invitation_type === 'tenant' && invitation?.unit_number && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm text-gray-500">Unit</p>
                  <p className="font-medium text-gray-900">
                    {invitation.unit_number}
                    {invitation.property_name && ` at ${invitation.property_name}`}
                  </p>
                </div>
              )}
            </div>

            {formError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pre-filled Info (Read-only) */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
                  Your Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={invitation?.first_name || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={invitation?.last_name || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={invitation?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
              </div>

              {/* Account Setup */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
                  Set Up Your Account
                </h3>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      placeholder="Min 8 chars, upper+lower+number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      placeholder="Confirm password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">
                  Your Address
                </h3>

                <div>
                  <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="addressLine1"
                    type="text"
                    value={formData.addressLine1}
                    onChange={(e) => updateField('addressLine1', e.target.value)}
                    placeholder="123 Main Street"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2 <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="addressLine2"
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => updateField('addressLine2', e.target.value)}
                    placeholder="Apt, Suite, Unit, etc."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="country"
                    value={formData.country}
                    onChange={(e) => {
                      updateField('country', e.target.value);
                      updateField('stateProvince', '');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  >
                    <option value="Canada">Canada</option>
                    <option value="United States">United States</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="Toronto"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="stateProvince" className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.country === 'United States' ? 'State' : 'Province'} <span className="text-red-500">*</span>
                    </label>
                    {formData.country === 'Other' ? (
                      <input
                        id="stateProvince"
                        type="text"
                        value={formData.stateProvince}
                        onChange={(e) => updateField('stateProvince', e.target.value)}
                        placeholder="State/Province"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        required
                      />
                    ) : (
                      <select
                        id="stateProvince"
                        value={formData.stateProvince}
                        onChange={(e) => updateField('stateProvince', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        required
                      >
                        <option value="">Select {formData.country === 'United States' ? 'State' : 'Province'}</option>
                        {getStateProvinceOptions().map(option => (
                          <option key={option.code} value={option.code}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="w-full sm:w-1/2">
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.country === 'United States' ? 'ZIP Code' : 'Postal Code'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value.toUpperCase())}
                    placeholder={formData.country === 'United States' ? '12345' : 'A1A 1A1'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition mt-6 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default CompleteRegistration;
