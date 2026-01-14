import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { applicationTemplateService, ApplicationTemplate, ApplicationFormSchema } from '../services/applicationTemplateService';
import { PREDEFINED_AMENITIES } from '../services/listingService';
import { notificationService } from '../services/notificationService';
import {
  MapPin, Phone, Mail, ArrowRight, ArrowLeft, DoorClosed,
  Bed, Bath, Maximize, DollarSign, Calendar, CheckCircle,
  Globe, Home, Send, User, Briefcase, Lock, Eye, EyeOff, AlertCircle,
  Zap, Droplets, Flame, Wifi, Wind, Thermometer, Waves, Shield,
  Car, Mountain, Trees, Flower2, Package, Key, Camera, Tv, Plug,
  Dumbbell, Baby, Dog, Bike, Ship, Truck, Anchor, Building2, TreePine,
  Footprints, Container, Trash2, WashingMachine, Sparkles, Refrigerator,
  CookingPot, Microwave, Fan, DoorOpen, Grid3x3, Square, LayoutGrid,
  Sun, Sofa, ArrowUpFromLine, Warehouse, ParkingSquare, Accessibility,
  ArrowUpDown, UserCheck, Video, LucideIcon
} from 'lucide-react';

// Amenity config for structured amenity display
interface AmenityConfig {
  id: string;
  included: boolean;
  isKeyFeature?: boolean;
}

// Icon mapping for amenities
const AMENITY_ICONS: Record<string, LucideIcon> = {
  Zap, Droplets, Flame, Wifi, Wind, Thermometer, Waves, Shield,
  Car, Mountain, Trees, Flower2, Package, Key, Camera, Tv, Plug,
  Dumbbell, Baby, Dog, Bike, Ship, Truck, Anchor, Building2, TreePine,
  Footprints, Container, Trash2, WashingMachine, Sparkles, Refrigerator,
  CookingPot, Microwave, Fan, DoorOpen, Grid3x3, Square, LayoutGrid,
  Sun, Sofa, ArrowUpFromLine, Warehouse, ParkingSquare, Accessibility,
  ArrowUpDown, UserCheck, Video, Bath, Home, Lock, AlertCircle, AlertTriangle: AlertCircle
};

interface PublicListing {
  id: string;
  business_id: string;
  property_id: string;
  unit_id: string;
  title: string;
  display_title: string | null; // Custom display title override
  description: string;
  monthly_rent_cents: number;
  deposit_cents: number;
  pet_deposit_cents: number;
  available_date: string;
  lease_term_months: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  photos: string[];
  amenities: string[];
  amenities_config: AmenityConfig[] | null; // Structured amenity toggles
  pets_allowed: boolean;
  pet_policy: string;
  utilities_included: string[];
  application_count: number;
  unit: {
    unit_number: string;
    default_application_template_id: string | null;
  };
  property: {
    name: string;
    address: string;
    city: string;
    state_province: string;
    postal_code: string;
    public_page_slug: string;
    default_application_template_id: string | null;
  };
  business: {
    business_name: string;
    public_page_slug: string;
    public_page_contact_email: string;
    public_page_contact_phone: string;
  };
}

export function PublicUnitPage() {
  const { businessSlug, propertySlug, unitId } = useParams();
  const navigate = useNavigate();
  const { supabaseUser, isAuthenticated } = useAuth();
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  const [applicationData, setApplicationData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    current_address: '',
    move_in_date: '',
    monthly_income: '',
    employer_name: '',
    has_pets: false,
    message: '',
  });

  // Application template state
  const [applicationTemplate, setApplicationTemplate] = useState<ApplicationTemplate | null>(null);
  const [templateResponses, setTemplateResponses] = useState<Record<string, any>>({});

  useEffect(() => {
    loadPublicListingData();
  }, [businessSlug, propertySlug, unitId]);

  // Load application template when listing is loaded
  useEffect(() => {
    async function loadApplicationTemplate() {
      if (!listing) return;

      // Priority: Unit template > Property template > Business default
      const templateId = listing.unit?.default_application_template_id ||
                        listing.property?.default_application_template_id;

      if (templateId) {
        try {
          const template = await applicationTemplateService.getTemplate(templateId);
          if (template) {
            setApplicationTemplate(template);
            // Initialize template responses with empty values
            const initialResponses: Record<string, any> = {};
            template.form_schema?.sections?.forEach(section => {
              section.fields?.forEach(field => {
                initialResponses[field.id] = field.type === 'checkbox' ? false : '';
              });
            });
            setTemplateResponses(initialResponses);
          }
        } catch (err) {
          console.error('Failed to load application template:', err);
        }
      } else {
        // Try to get business default template
        try {
          const templates = await applicationTemplateService.getTemplates({
            business_id: listing.business_id,
            is_active: true
          });
          const defaultTemplate = templates.find(t => t.is_default);
          if (defaultTemplate) {
            setApplicationTemplate(defaultTemplate);
            const initialResponses: Record<string, any> = {};
            defaultTemplate.form_schema?.sections?.forEach(section => {
              section.fields?.forEach(field => {
                initialResponses[field.id] = field.type === 'checkbox' ? false : '';
              });
            });
            setTemplateResponses(initialResponses);
          }
        } catch (err) {
          console.error('Failed to load default template:', err);
        }
      }
    }
    loadApplicationTemplate();
  }, [listing]);

  const loadPublicListingData = async () => {
    if (!businessSlug || !propertySlug || !unitId) return;
    setIsLoading(true);
    try {
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select(`
          *,
          unit:units(unit_number, default_application_template_id),
          property:properties(
            name,
            address_line1,
            city,
            state,
            postal_code,
            public_page_slug,
            default_application_template_id
          ),
          business:businesses(
            business_name,
            public_page_slug,
            public_page_contact_email,
            public_page_contact_phone
          )
        `)
        .eq('unit_id', unitId)
        .eq('status', 'active')
        .maybeSingle();

      if (listingError) throw listingError;
      if (!listingData) {
        setError('Listing not found or not available');
        setIsLoading(false);
        return;
      }

      // Validate that the slugs match
      if (listingData.property?.public_page_slug !== propertySlug ||
          listingData.business?.public_page_slug !== businessSlug) {
        setError('Listing not found or not available');
        setIsLoading(false);
        return;
      }

      setListing(listingData);

      // Track view
      await supabase.from('listing_views').insert({
        listing_id: listingData.id,
        ip_address: null,
        user_agent: navigator.userAgent,
      });
    } catch (err) {
      console.error('Failed to load public listing data:', err);
      setError('Failed to load listing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyNowClick = () => {
    if (isAuthenticated && supabaseUser) {
      // User is logged in, pre-fill application data and show form
      setApplicationData({
        first_name: supabaseUser.user_metadata?.first_name || '',
        last_name: supabaseUser.user_metadata?.last_name || '',
        email: supabaseUser.email || '',
        phone: supabaseUser.user_metadata?.phone || '',
        current_address: '',
        move_in_date: '',
        monthly_income: '',
        employer_name: '',
        has_pets: false,
        message: '',
      });
      setShowApplicationForm(true);
    } else {
      // User not logged in, show auth modal
      setShowAuthModal(true);
      setAuthMode('register');
      setAuthError('');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    setIsSubmitting(true);
    setAuthError('');

    try {
      if (authMode === 'register') {
        // Validate password confirmation
        if (authData.password !== authData.confirmPassword) {
          setAuthError('Passwords do not match');
          setIsSubmitting(false);
          return;
        }

        if (authData.password.length < 6) {
          setAuthError('Password must be at least 6 characters');
          setIsSubmitting(false);
          return;
        }

        // Sign up new user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: authData.email,
          password: authData.password,
          options: {
            data: {
              first_name: authData.first_name,
              last_name: authData.last_name,
              phone: authData.phone,
            },
          },
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error('Registration failed');

        // Create business_user record as applicant
        const { error: businessUserError } = await supabase
          .from('business_users')
          .insert({
            business_id: listing.business_id,
            auth_user_id: signUpData.user.id,
            email: authData.email,
            first_name: authData.first_name,
            last_name: authData.last_name,
            phone: authData.phone,
            role: 'applicant',
            status: 'active',
          });

        if (businessUserError) {
          console.error('Business user creation error:', businessUserError);
          // Continue anyway, the user is created
        }

        // Notify property manager about new applicant
        if (listing.business.public_page_contact_email) {
          try {
            await notificationService.sendNewApplicantNotification(
              listing.business_id,
              listing.business.public_page_contact_email,
              `${authData.first_name} ${authData.last_name}`,
              authData.email,
              authData.phone
            );
          } catch (notifErr) {
            console.error('Failed to send new applicant notification:', notifErr);
            // Continue anyway - notification failure shouldn't block registration
          }
        }

        // Check if email confirmation is required
        // If user was created but email not confirmed, redirect to verification pending
        if (signUpData.user && !signUpData.user.email_confirmed_at) {
          // Redirect to email verification pending page
          const returnUrl = encodeURIComponent(window.location.pathname);
          navigate(`/email-verification-pending?email=${encodeURIComponent(authData.email)}&return=${returnUrl}`);
          return;
        }

        // If email is already confirmed (rare - might be disabled in Supabase settings)
        // Pre-fill application data and show form
        setApplicationData({
          first_name: authData.first_name,
          last_name: authData.last_name,
          email: authData.email,
          phone: authData.phone,
          current_address: '',
          move_in_date: '',
          monthly_income: '',
          employer_name: '',
          has_pets: false,
          message: '',
        });

        setShowAuthModal(false);
        setShowApplicationForm(true);
      } else {
        // Login existing user
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: authData.email,
          password: authData.password,
        });

        if (signInError) throw signInError;
        if (!signInData.user) throw new Error('Login failed');

        // Check if user already has a business_user record for this business
        const { data: existingBU } = await supabase
          .from('business_users')
          .select('id')
          .eq('business_id', listing.business_id)
          .eq('auth_user_id', signInData.user.id)
          .maybeSingle();

        if (!existingBU) {
          // Create business_user record as applicant if not exists
          await supabase
            .from('business_users')
            .insert({
              business_id: listing.business_id,
              auth_user_id: signInData.user.id,
              email: signInData.user.email,
              first_name: signInData.user.user_metadata?.first_name || '',
              last_name: signInData.user.user_metadata?.last_name || '',
              phone: signInData.user.user_metadata?.phone || '',
              role: 'applicant',
              status: 'active',
            });
        }

        // Pre-fill application data
        setApplicationData({
          first_name: signInData.user.user_metadata?.first_name || '',
          last_name: signInData.user.user_metadata?.last_name || '',
          email: signInData.user.email || '',
          phone: signInData.user.user_metadata?.phone || '',
          current_address: '',
          move_in_date: '',
          monthly_income: '',
          employer_name: '',
          has_pets: false,
          message: '',
        });

        setShowAuthModal(false);
        setShowApplicationForm(true);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;

    setIsSubmitting(true);
    try {
      // First, try to create a tenant prospect for better tracking
      let prospectId = null;
      try {
        const { data: prospect, error: prospectError } = await supabase
          .from('tenant_prospects')
          .insert({
            first_name: applicationData.first_name,
            last_name: applicationData.last_name,
            email: applicationData.email,
            phone: applicationData.phone,
            current_address: applicationData.current_address || null,
            preferred_move_in_date: applicationData.move_in_date || null,
            monthly_income_cents: applicationData.monthly_income ? parseInt(applicationData.monthly_income) * 100 : null,
            employer_name: applicationData.employer_name || null,
            has_pets: applicationData.has_pets,
            notes: applicationData.message || null,
            profile_completed: true,
            is_active: true,
          })
          .select('id')
          .single();

        if (!prospectError && prospect) {
          prospectId = prospect.id;
        }
      } catch (prospectErr) {
        // Prospect creation is optional, continue with application
        console.log('Prospect creation skipped:', prospectErr);
      }

      // Build the responses object (required by rental_applications schema)
      // Merge basic applicant data with template responses
      const responses = {
        // Basic applicant info (always included)
        first_name: applicationData.first_name,
        last_name: applicationData.last_name,
        email: applicationData.email,
        phone: applicationData.phone,
        // Template-specific responses
        ...templateResponses,
        // Fallback fields (when no template is used)
        ...((!applicationTemplate) && {
          current_address: applicationData.current_address,
          move_in_date: applicationData.move_in_date,
          monthly_income: applicationData.monthly_income,
          employer: applicationData.employer_name,
          pets: applicationData.has_pets ? 'Yes' : 'No',
          occupants: 1,
          references: applicationData.message,
        }),
      };

      // Create the rental application
      // Note: listing_id and organization_id are null for public page submissions
      // The new business-centric architecture uses business_id instead
      const { error: applicationError } = await supabase
        .from('rental_applications')
        .insert({
          listing_id: null, // null for public page submissions (uses public_listing_id instead)
          public_listing_id: listing.id, // reference to 'listings' table
          unit_id: listing.unit_id,
          property_id: listing.property_id,
          organization_id: null, // null for business-centric architecture
          business_id: listing.business_id,
          status: 'submitted',
          application_type: 'unit_specific',
          prospect_id: prospectId,
          applicant_email: applicationData.email,
          applicant_phone: applicationData.phone,
          applicant_first_name: applicationData.first_name,
          applicant_last_name: applicationData.last_name,
          responses: responses,
        });

      if (applicationError) {
        console.error('Application creation error:', applicationError);
        throw applicationError;
      }

      // Update listing application count
      await supabase
        .from('listings')
        .update({ application_count: (listing.application_count || 0) + 1 })
        .eq('id', listing.id);

      // Notify property manager about new application
      if (listing.business.public_page_contact_email) {
        try {
          await notificationService.sendApplicationSubmittedNotification(
            listing.business_id,
            listing.business.public_page_contact_email,
            `${applicationData.first_name} ${applicationData.last_name}`,
            applicationData.email,
            applicationData.phone,
            listing.property.name,
            listing.unit.unit_number
          );
        } catch (notifErr) {
          console.error('Failed to send application submitted notification:', notifErr);
          // Continue anyway - notification failure shouldn't block application
        }
      }

      setSubmitSuccess(true);
      setShowApplicationForm(false);

      // Redirect to applicant dashboard after a short delay
      setTimeout(() => {
        navigate('/my-applications');
      }, 2000);
    } catch (err) {
      console.error('Failed to submit application:', err);
      alert('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to render dynamic form fields from template
  const renderTemplateField = (field: any) => {
    const value = templateResponses[field.id] ?? '';
    const onChange = (newValue: any) => {
      setTemplateResponses(prev => ({ ...prev, [field.id]: newValue }));
    };

    const baseInputClass = "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base";

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <input
            type={field.type}
            required={field.required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            required={field.required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={baseInputClass}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            required={field.required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
          />
        );
      case 'select':
        return (
          <select
            required={field.required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            required={field.required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={baseInputClass}
          />
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{field.label}</span>
          </label>
        );
      default:
        return (
          <input
            type="text"
            required={field.required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
          />
        );
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

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DoorClosed className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This listing is not available'}</p>
          <button
            onClick={() => navigate(`/browse/${businessSlug}/${propertySlug}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Back to Property
          </button>
        </div>
      </div>
    );
  }

  const photos = listing.photos || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO Meta Tags */}
      <title>{listing.display_title || listing.title} - {listing.property.name}</title>
      <meta name="description" content={listing.description || `${listing.bedrooms} bed, ${listing.bathrooms} bath unit available for rent`} />

      {/* Back Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(`/browse/${businessSlug}/${propertySlug}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to {listing.property.name}</span>
          </button>
        </div>
      </div>

      {/* Photo Gallery */}
      {photos.length > 0 ? (
        <div className="relative h-96 bg-gray-900 overflow-hidden">
          <img
            src={photos[currentPhotoIndex]}
            alt={`${listing.display_title || listing.title} - Photo ${currentPhotoIndex + 1}`}
            className="w-full h-full object-cover"
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 text-gray-900" />
              </button>
              <button
                onClick={() => setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition shadow-lg"
              >
                <ArrowRight className="w-5 h-5 text-gray-900" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`w-2 h-2 rounded-full transition ${
                      index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="h-96 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <DoorClosed className="w-24 h-24 text-white/30" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                    {listing.display_title || listing.title}
                  </h1>
                  <p className="text-gray-600">Unit {listing.unit.unit_number}</p>
                </div>
                <div className="text-right">
                  {listing.monthly_rent_cents > 0 ? (
                    <>
                      <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                        ${(listing.monthly_rent_cents / 100).toLocaleString()}
                      </p>
                      <p className="text-gray-600">per month</p>
                    </>
                  ) : (
                    <p className="text-xl sm:text-2xl font-bold text-gray-600">Contact for pricing</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-5 h-5" />
                <span>
                  {listing.property.address_line1}, {listing.property.city}, {listing.property.state}
                </span>
              </div>
            </div>

            {/* Key Features */}
            {(() => {
              // Get key feature amenities from config
              const keyFeatureAmenities = listing.amenities_config
                ? listing.amenities_config
                    .filter(a => a.isKeyFeature)
                    .map(a => {
                      const predefined = PREDEFINED_AMENITIES.find(p => p.id === a.id);
                      return predefined ? { label: predefined.label, icon: predefined.icon } : null;
                    })
                    .filter(Boolean) as { label: string; icon: string }[]
                : [];

              // Build list of standard key features (beds, baths, sqft, date)
              const standardFeatures = [];
              if (listing.bedrooms > 0) {
                standardFeatures.push({ icon: Bed, value: listing.bedrooms, label: 'Bedrooms' });
              }
              if (listing.bathrooms > 0) {
                standardFeatures.push({ icon: Bath, value: listing.bathrooms, label: 'Bathrooms' });
              }
              if (listing.square_feet) {
                standardFeatures.push({ icon: Maximize, value: listing.square_feet, label: 'Sq Ft' });
              }
              if (listing.available_date) {
                standardFeatures.push({
                  icon: Calendar,
                  value: new Date(listing.available_date).toLocaleDateString(),
                  label: 'Available',
                  isDate: true
                });
              }

              // Only show if there are features to display
              if (standardFeatures.length === 0 && keyFeatureAmenities.length === 0) return null;

              return (
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Key Features</h2>

                  {/* Standard features grid (beds, baths, etc) */}
                  {standardFeatures.length > 0 && (
                    <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(standardFeatures.length, 4)} gap-4 sm:gap-6 ${keyFeatureAmenities.length > 0 ? 'mb-6 pb-6 border-b border-gray-100' : ''}`}>
                      {standardFeatures.map((feature, idx) => (
                        <div key={idx} className="text-center">
                          <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-2" />
                          <p className={`${feature.isDate ? 'text-sm' : 'text-xl sm:text-2xl'} font-bold text-gray-900`}>
                            {feature.value}
                          </p>
                          <p className="text-sm text-gray-600">{feature.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Key Feature Amenities with icons */}
                  {keyFeatureAmenities.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {keyFeatureAmenities.map((feature, idx) => {
                        const IconComponent = AMENITY_ICONS[feature.icon] || CheckCircle;
                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <IconComponent className="w-6 h-6 text-amber-600 flex-shrink-0" />
                            <span className="font-medium text-amber-800">{feature.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Description */}
            {listing.description && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">About This Unit</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

            {/* Amenities (excluding key features) */}
            {(() => {
              // Get amenities to display - prefer amenities_config, fall back to amenities array
              // Exclude items marked as key features
              const amenitiesToShow = listing.amenities_config && listing.amenities_config.length > 0
                ? listing.amenities_config
                    .filter(a => a.included && !a.isKeyFeature)
                    .map(a => {
                      const predefined = PREDEFINED_AMENITIES.find(p => p.id === a.id);
                      return predefined ? { label: predefined.label, icon: predefined.icon } : { label: a.id, icon: 'CheckCircle' };
                    })
                : (listing.amenities || []).map(a => ({ label: a, icon: 'CheckCircle' }));

              if (amenitiesToShow.length === 0) return null;

              return (
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {amenitiesToShow.map((amenity, index) => {
                      const IconComponent = AMENITY_ICONS[amenity.icon] || CheckCircle;
                      return (
                        <div key={index} className="flex items-center gap-2 text-gray-700">
                          <IconComponent className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span>{amenity.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Utilities */}
            {listing.utilities_included && listing.utilities_included.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Utilities Included</h2>
                <div className="grid grid-cols-2 gap-3">
                  {listing.utilities_included.map((utility, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="capitalize">{utility}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pet Policy */}
            {listing.pets_allowed && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Pet Policy</h2>
                <div className="flex items-start gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Pets Allowed</p>
                    {listing.pet_policy && <p className="text-sm text-gray-600">{listing.pet_policy}</p>}
                    {listing.pet_deposit_cents > 0 && (
                      <p className="text-sm text-gray-600 mt-2">
                        Pet deposit: ${(listing.pet_deposit_cents / 100).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Pricing Card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Pricing Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Rent</span>
                    <span className="font-semibold">
                      {listing.monthly_rent_cents > 0
                        ? `$${(listing.monthly_rent_cents / 100).toLocaleString()}`
                        : 'Contact for pricing'}
                    </span>
                  </div>
                  {listing.deposit_cents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Security Deposit</span>
                      <span className="font-semibold">${(listing.deposit_cents / 100).toLocaleString()}</span>
                    </div>
                  )}
                  {listing.lease_term_months && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lease Term</span>
                      <span className="font-semibold">{listing.lease_term_months} months</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleApplyNowClick}
                  className="w-full mt-6 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Apply Now
                </button>

                {submitSuccess && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm font-medium">
                      Application submitted! We'll contact you soon.
                    </p>
                  </div>
                )}
              </div>

              {/* Contact Card */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Us</h3>
                <div className="space-y-3">
                  {listing.business.public_page_contact_phone && (
                    <a
                      href={`tel:${listing.business.public_page_contact_phone}`}
                      className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition"
                    >
                      <Phone className="w-5 h-5" />
                      <span>{listing.business.public_page_contact_phone}</span>
                    </a>
                  )}
                  {listing.business.public_page_contact_email && (
                    <a
                      href={`mailto:${listing.business.public_page_contact_email}`}
                      className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition"
                    >
                      <Mail className="w-5 h-5" />
                      <span className="text-sm">{listing.business.public_page_contact_email}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Application Form Modal */}
        {showApplicationForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Apply for This Unit</h2>
                    {applicationTemplate && (
                      <p className="text-sm text-gray-500 mt-1">{applicationTemplate.template_name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowApplicationForm(false)}
                    className="text-gray-400 hover:text-gray-600 transition p-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitApplication} className="p-4 sm:p-6 space-y-6">
                {/* Basic applicant info - always shown */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-sm font-medium text-blue-900 mb-3">Applicant Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        value={applicationData.first_name}
                        onChange={(e) => setApplicationData({ ...applicationData, first_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={applicationData.last_name}
                        onChange={(e) => setApplicationData({ ...applicationData, last_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        value={applicationData.email}
                        onChange={(e) => setApplicationData({ ...applicationData, email: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                      <input
                        type="tel"
                        required
                        value={applicationData.phone}
                        onChange={(e) => setApplicationData({ ...applicationData, phone: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic template sections */}
                {applicationTemplate?.form_schema?.sections
                  ?.filter(section => section.included !== false)
                  .map((section) => {
                    // Filter fields by included status
                    const includedFields = section.fields?.filter(field => field.included !== false) || [];
                    if (includedFields.length === 0) return null;

                    return (
                      <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">{section.title}</h3>
                        {section.description && (
                          <p className="text-sm text-gray-500 mb-4">{section.description}</p>
                        )}
                        <div className="space-y-4">
                          {includedFields.map((field) => (
                            <div key={field.id}>
                              {field.type !== 'checkbox' && (
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {field.label} {field.required && '*'}
                                </label>
                              )}
                              {renderTemplateField(field)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                {/* Fallback form if no template */}
                {!applicationTemplate && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Address</label>
                      <input
                        type="text"
                        value={applicationData.current_address}
                        onChange={(e) => setApplicationData({ ...applicationData, current_address: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Desired Move-in Date</label>
                        <input
                          type="date"
                          value={applicationData.move_in_date}
                          onChange={(e) => setApplicationData({ ...applicationData, move_in_date: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income</label>
                        <input
                          type="number"
                          value={applicationData.monthly_income}
                          onChange={(e) => setApplicationData({ ...applicationData, monthly_income: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                          placeholder="$"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employer</label>
                      <input
                        type="text"
                        value={applicationData.employer_name}
                        onChange={(e) => setApplicationData({ ...applicationData, employer_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={applicationData.has_pets}
                          onChange={(e) => setApplicationData({ ...applicationData, has_pets: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">I have pets</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                      <textarea
                        value={applicationData.message}
                        onChange={(e) => setApplicationData({ ...applicationData, message: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        placeholder="Tell us a bit about yourself..."
                      />
                    </div>
                  </>
                )}

                {/* Terms and conditions from template */}
                {applicationTemplate?.terms_and_conditions && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Terms and Conditions</h3>
                    <div className="text-sm text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {applicationTemplate.terms_and_conditions}
                    </div>
                    <label className="flex items-center gap-2 mt-3">
                      <input
                        type="checkbox"
                        required
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">I agree to the terms and conditions *</span>
                    </label>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApplicationForm(false)}
                    className="w-full sm:flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Application
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {authMode === 'register' ? 'Create Your Account' : 'Sign In'}
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {authMode === 'register'
                        ? 'An account is required to submit your application'
                        : 'Sign in to continue your application'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition p-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <form onSubmit={handleAuth} className="p-4 sm:p-6 space-y-4">
                {/* Account creation info banner */}
                {authMode === 'register' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-blue-800">
                        <p className="font-medium">Why create an account?</p>
                        <ul className="mt-1 text-blue-700 space-y-0.5">
                          <li>• Track your application status in real-time</li>
                          <li>• Receive updates via email when reviewed</li>
                          <li>• Access your tenant portal if approved</li>
                        </ul>
                        <p className="mt-2 text-xs">A verification email will be sent to confirm your account.</p>
                      </div>
                    </div>
                  </div>
                )}
                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {authError}
                  </div>
                )}

                {authMode === 'register' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={authData.first_name}
                          onChange={(e) => setAuthData({ ...authData, first_name: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={authData.last_name}
                        onChange={(e) => setAuthData({ ...authData, last_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={authData.email}
                      onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {authMode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={authData.phone}
                        onChange={(e) => setAuthData({ ...authData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={authData.password}
                      onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {authMode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={authData.confirmPassword}
                        onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? (authMode === 'register' ? 'Creating Account...' : 'Signing In...')
                    : (authMode === 'register' ? 'Create Account & Continue' : 'Sign In & Continue')}
                </button>

                <div className="text-center text-sm text-gray-600">
                  {authMode === 'register' ? (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setAuthError('');
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Sign In
                      </button>
                    </>
                  ) : (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('register');
                          setAuthError('');
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Create Account
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
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
                  © {new Date().getFullYear()} {listing.business.business_name}
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
