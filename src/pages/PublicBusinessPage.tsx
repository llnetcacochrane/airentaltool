import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { businessUserService } from '../services/businessUserService';
import {
  MapPin, Phone, Mail, Home, DoorClosed, ArrowRight,
  Building2, Globe, UserPlus, LogIn, X, Check
} from 'lucide-react';

interface PublicBusiness {
  id: string;
  business_name: string;
  public_page_title: string;
  public_page_description: string;
  public_page_logo_url: string;
  public_page_header_image_url: string;
  public_page_contact_email: string;
  public_page_contact_phone: string;
  address: string;
  city: string;
  state_province: string;
  country: string;
  public_page_custom_content: any;
}

interface PublicProperty {
  id: string;
  name: string;
  address: string;
  city: string;
  state_province: string;
  property_type: string;
  public_page_slug: string;
  public_page_title: string;
  public_page_description: string;
  public_page_photos: string[];
  total_units: number;
  available_units?: number;
}

export function PublicBusinessPage() {
  const { businessSlug } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // User signup state
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupForm, setSignupForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [signupMode, setSignupMode] = useState<'signup' | 'login'>('signup');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');

  useEffect(() => {
    loadPublicBusinessData();
  }, [businessSlug]);

  const loadPublicBusinessData = async () => {
    if (!businessSlug) return;
    setIsLoading(true);
    try {
      // Get public business data
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('public_page_slug', businessSlug)
        .eq('public_page_enabled', true)
        .eq('is_active', true)
        .maybeSingle();

      if (businessError) throw businessError;
      if (!businessData) {
        setError('Business not found or not publicly available');
        setIsLoading(false);
        return;
      }

      setBusiness(businessData);

      // Get public properties for this business
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('business_id', businessData.id)
        .eq('public_page_enabled', true)
        .eq('is_active', true);

      if (propertiesError) throw propertiesError;

      // For each property, get available unit count
      const propertiesWithAvailability = await Promise.all(
        (propertiesData || []).map(async (property) => {
          const { count } = await supabase
            .from('units')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', property.id)
            .eq('occupancy_status', 'vacant')
            .eq('is_active', true);

          return {
            ...property,
            available_units: count || 0,
          };
        })
      );

      setProperties(propertiesWithAvailability);
    } catch (err) {
      console.error('Failed to load public business data:', err);
      setError('Failed to load business information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setSignupError('');
    setSignupLoading(true);

    try {
      if (signupMode === 'signup') {
        // Validate passwords match
        if (signupForm.password !== signupForm.confirmPassword) {
          setSignupError('Passwords do not match');
          setSignupLoading(false);
          return;
        }

        if (signupForm.password.length < 6) {
          setSignupError('Password must be at least 6 characters');
          setSignupLoading(false);
          return;
        }

        // Check if user already exists
        const existingUser = await businessUserService.findUserByEmail(signupForm.email);

        if (existingUser) {
          // User exists in system - check if in this business
          const inThisBusiness = existingUser.businesses.find(
            (b) => b.business_id === business.id
          );

          if (inThisBusiness) {
            setSignupError('You already have an account with this business. Please log in instead.');
            setSignupMode('login');
            setSignupLoading(false);
            return;
          }
        }

        // Create Supabase auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: signupForm.email,
          password: signupForm.password,
          options: {
            data: {
              first_name: signupForm.first_name,
              last_name: signupForm.last_name,
            },
          },
        });

        if (authError) throw authError;

        // Create business user record
        await businessUserService.createBusinessUser(business.id, {
          email: signupForm.email,
          first_name: signupForm.first_name,
          last_name: signupForm.last_name,
          phone: signupForm.phone,
          auth_user_id: authData.user?.id,
        });

        setSignupSuccess('Account created! Please check your email to verify your account.');
        setSignupForm({
          email: '',
          first_name: '',
          last_name: '',
          phone: '',
          password: '',
          confirmPassword: '',
        });
      } else {
        // Login mode
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: signupForm.email,
          password: signupForm.password,
        });

        if (loginError) throw loginError;

        // Check if user is associated with this business
        const businessUser = await businessUserService.getBusinessUserByEmail(
          business.id,
          signupForm.email
        );

        if (!businessUser) {
          // Link user to this business
          if (data.user) {
            await businessUserService.createBusinessUser(business.id, {
              email: signupForm.email,
              first_name: data.user.user_metadata.first_name || signupForm.email.split('@')[0],
              last_name: data.user.user_metadata.last_name || '',
              auth_user_id: data.user.id,
            });
          }
        }

        setSignupSuccess('Logged in successfully!');
        setTimeout(() => {
          navigate('/my-rental');
        }, 1500);
      }
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSignupLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This page is not available'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const pageTitle = business.public_page_title || business.business_name;
  const pageDescription = business.public_page_description || `Browse available rental properties at ${business.business_name}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />

      {/* Header Image */}
      {business.public_page_header_image_url && (
        <div className="relative h-64 sm:h-96 bg-gray-900 overflow-hidden">
          <img
            src={business.public_page_header_image_url}
            alt={business.business_name}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
        </div>
      )}

      {/* Business Header */}
      <div className={`bg-white border-b border-gray-200 ${business.public_page_header_image_url ? '-mt-32 relative z-10' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start gap-4 sm:gap-6">
            {business.public_page_logo_url && (
              <img
                src={business.public_page_logo_url}
                alt={business.business_name}
                className="w-24 h-24 rounded-lg object-cover border-4 border-white shadow-lg"
              />
            )}
            <div className="flex-1">
              <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${business.public_page_header_image_url ? 'text-white' : 'text-gray-900'}`}>
                {pageTitle}
              </h1>
              <p className={`text-lg mb-4 ${business.public_page_header_image_url ? 'text-gray-200' : 'text-gray-600'}`}>
                {pageDescription}
              </p>

              {/* Contact Information */}
              <div className={`flex flex-wrap gap-4 text-sm ${business.public_page_header_image_url ? 'text-gray-300' : 'text-gray-600'}`}>
                {business.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{business.city}, {business.state_province}</span>
                  </div>
                )}
                {business.public_page_contact_phone && (
                  <a
                    href={`tel:${business.public_page_contact_phone}`}
                    className="flex items-center gap-2 hover:text-blue-600 transition"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{business.public_page_contact_phone}</span>
                  </a>
                )}
                {business.public_page_contact_email && (
                  <a
                    href={`mailto:${business.public_page_contact_email}`}
                    className="flex items-center gap-2 hover:text-blue-600 transition"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{business.public_page_contact_email}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Sign Up / Login Button */}
            <div className="flex-shrink-0">
              <button
                onClick={() => setShowSignupModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                Sign Up / Login
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Signup/Login Modal */}
      {showSignupModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowSignupModal(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <button
                onClick={() => setShowSignupModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {signupMode === 'signup' ? 'Create an Account' : 'Welcome Back'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {signupMode === 'signup'
                    ? `Sign up to apply for properties at ${business.business_name}`
                    : 'Log in to your account'}
                </p>
              </div>

              {/* Tab Switch */}
              <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSignupMode('signup')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                    signupMode === 'signup'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  onClick={() => setSignupMode('login')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                    signupMode === 'login'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Log In
                </button>
              </div>

              {signupError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {signupError}
                </div>
              )}

              {signupSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {signupSuccess}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                {signupMode === 'signup' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={signupForm.first_name}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, first_name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={signupForm.last_name}
                        onChange={(e) =>
                          setSignupForm({ ...signupForm, last_name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {signupMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={signupForm.phone}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, phone: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, password: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                </div>

                {signupMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={signupForm.confirmPassword}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, confirmPassword: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      minLength={6}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {signupLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : signupMode === 'signup' ? (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create Account
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Log In
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-gray-500 mt-4">
                By signing up, you agree to receive communications from {business.business_name}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Content */}
      {business.public_page_custom_content?.sections && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
            {business.public_page_custom_content.sections.map((section: any, index: number) => (
              <div key={index} className="mb-6 last:mb-0">
                {section.title && (
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
                )}
                {section.content && (
                  <div className="text-gray-600 whitespace-pre-wrap">{section.content}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Properties List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Available Properties</h2>
          <p className="text-gray-600">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} available
          </p>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Home className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Available</h3>
            <p className="text-gray-600">Please check back later for new listings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {properties.map((property) => (
              <button
                key={property.id}
                onClick={() => navigate(`/browse/${businessSlug}/${property.public_page_slug}`)}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 hover:border-blue-200 overflow-hidden text-left"
              >
                {/* Property Image */}
                {property.public_page_photos && property.public_page_photos.length > 0 ? (
                  <div className="relative h-48 bg-gray-200 overflow-hidden">
                    <img
                      src={property.public_page_photos[0]}
                      alt={property.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {property.available_units > 0 && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-full">
                        {property.available_units} Available
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative h-48 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Home className="w-12 h-12 sm:w-16 sm:h-16 text-white/50" />
                    {property.available_units > 0 && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-full">
                        {property.available_units} Available
                      </div>
                    )}
                  </div>
                )}

                {/* Property Info */}
                <div className="p-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                    {property.public_page_title || property.name}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      {property.address_line1}, {property.city}, {property.state}
                    </span>
                  </div>
                  {property.public_page_description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {property.public_page_description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <DoorClosed className="w-4 h-4" />
                        <span>{property.total_units} {property.total_units === 1 ? 'unit' : 'units'}</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <span className="capitalize">{property.property_type}</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">
                <a href="https://app.airentaltool.com" className="hover:text-blue-600 transition">
                  © {new Date().getFullYear()} {business.business_name}
                </a>. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span>Powered by</span>
              <a href="https://app.airentaltool.com" className="flex items-center gap-2 hover:text-blue-600 transition">
                <Globe className="w-4 h-4" />
                <span className="font-semibold">AI Rental Tools</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
