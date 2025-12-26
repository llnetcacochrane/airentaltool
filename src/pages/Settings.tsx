import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { authService } from '../services/authService';
import { brandingService } from '../services/brandingService';
import { businessService } from '../services/businessService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UsageLimitsWidget } from '../components/UsageLimitsWidget';
import { AddressInput } from '../components/AddressInput';
import { supabase } from '../lib/supabase';
import { User, Building2, Users as UsersIcon, Bell, Lock, CreditCard, Palette, ArrowLeft, Globe, ExternalLink, Copy, Check, Trash2, AlertTriangle } from 'lucide-react';

export function Settings() {
  const { userProfile, supabaseUser, currentBusiness, currentRole, refreshBusinesses } = useAuth();
  const { branding, refreshBranding } = useBranding();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'profile');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [showDeleteBusinessConfirm, setShowDeleteBusinessConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
  });

  const [businessData, setBusinessData] = useState({
    business_name: '',
    legal_name: '',
    business_type: '',
    tax_id: '',
    registration_number: '',
    phone: '',
    email: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    currency: '',
    timezone: '',
    notes: '',
  });

  const [brandingData, setBrandingData] = useState({
    white_label_enabled: false,
    application_name: '',
    logo_url: '',
    primary_color: '',
  });

  const [publicPageData, setPublicPageData] = useState({
    public_page_enabled: false,
    public_page_slug: '',
    public_page_title: '',
    public_page_description: '',
    public_page_logo_url: '',
    public_page_header_image_url: '',
    public_page_contact_email: '',
    public_page_contact_phone: '',
  });

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (currentBusiness) {
      setBusinessData({
        business_name: currentBusiness.business_name || '',
        legal_name: currentBusiness.legal_name || '',
        business_type: currentBusiness.business_type || '',
        tax_id: currentBusiness.tax_id || '',
        registration_number: currentBusiness.registration_number || '',
        phone: currentBusiness.phone || '',
        email: currentBusiness.email || '',
        website: currentBusiness.website || '',
        address_line1: currentBusiness.address_line1 || '',
        address_line2: currentBusiness.address_line2 || '',
        city: currentBusiness.city || '',
        state: currentBusiness.state || '',
        postal_code: currentBusiness.postal_code || '',
        country: currentBusiness.country || '',
        currency: currentBusiness.currency || 'CAD',
        timezone: currentBusiness.timezone || 'America/Toronto',
        notes: currentBusiness.notes || '',
      });

      // Load public page data
      setPublicPageData({
        public_page_enabled: currentBusiness.public_page_enabled || false,
        public_page_slug: currentBusiness.public_page_slug || '',
        public_page_title: currentBusiness.public_page_title || '',
        public_page_description: currentBusiness.public_page_description || '',
        public_page_logo_url: currentBusiness.public_page_logo_url || '',
        public_page_header_image_url: currentBusiness.public_page_header_image_url || '',
        public_page_contact_email: currentBusiness.public_page_contact_email || '',
        public_page_contact_phone: currentBusiness.public_page_contact_phone || '',
      });
    }
  }, [currentBusiness]);

  // Effect to handle tab from URL
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    loadBrandingData();
  }, [currentBusiness?.id]);

  const loadBrandingData = async () => {
    // Branding is now tied to business, not organization
    // For now, we skip branding if no business
    if (!currentBusiness) return;

    // Try to load organization branding if business has org_id (backward compat)
    if (currentBusiness.organization_id) {
      try {
        const orgBranding = await brandingService.getOrganizationBranding(currentBusiness.organization_id);
        if (orgBranding) {
          setBrandingData({
            white_label_enabled: orgBranding.white_label_enabled,
            application_name: orgBranding.application_name || '',
            logo_url: orgBranding.logo_url || '',
            primary_color: orgBranding.primary_color || '',
          });
        }
      } catch (err) {
        console.error('Failed to load branding:', err);
      }
    }
  };

  const handleSaveBranding = async () => {
    if (!currentBusiness?.organization_id) {
      setMessage('Branding requires organization setup');
      return;
    }
    setIsSaving(true);
    setMessage('');
    try {
      await brandingService.upsertOrganizationBranding(currentBusiness.organization_id, brandingData);
      await refreshBranding();
      setMessage('Branding updated successfully');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update branding');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePublicPage = async () => {
    if (!currentBusiness) return;
    setIsSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          public_page_enabled: publicPageData.public_page_enabled,
          public_page_slug: publicPageData.public_page_slug || null,
          public_page_title: publicPageData.public_page_title || null,
          public_page_description: publicPageData.public_page_description || null,
          public_page_logo_url: publicPageData.public_page_logo_url || null,
          public_page_header_image_url: publicPageData.public_page_header_image_url || null,
          public_page_contact_email: publicPageData.public_page_contact_email || null,
          public_page_contact_phone: publicPageData.public_page_contact_phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentBusiness.id);

      if (error) throw error;
      await refreshBusinesses();
      setMessage('Public page settings updated successfully');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update public page settings');
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlug = () => {
    if (!businessData.business_name) return;
    const slug = businessData.business_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setPublicPageData({ ...publicPageData, public_page_slug: slug });
  };

  const copyPublicUrl = () => {
    if (publicPageData.public_page_slug) {
      navigator.clipboard.writeText(`${window.location.origin}/browse/${publicPageData.public_page_slug}`);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      if (userProfile) {
        await authService.updateUserProfile(userProfile.id, profileData);
        setMessage('Profile updated successfully');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBusiness = async () => {
    if (!currentBusiness) return;
    setIsSaving(true);
    setMessage('');
    try {
      await businessService.updateBusiness(currentBusiness.id, businessData);
      await refreshBusinesses();
      setMessage('Business updated successfully');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update business');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBusiness = async () => {
    if (!currentBusiness || deleteConfirmText !== currentBusiness.business_name) return;
    setIsDeleting(true);
    try {
      await businessService.deleteBusiness(currentBusiness.id);
      await refreshBusinesses();
      setShowDeleteBusinessConfirm(false);
      navigate('/businesses');
    } catch (err) {
      console.error('Failed to delete business:', err);
      alert('Failed to delete business. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const allTabs = [
    { id: 'profile', label: 'Profile', icon: User, requiresBusiness: false },
    { id: 'business', label: 'Business', icon: Building2, requiresBusiness: true },
    { id: 'public-page', label: 'Public Page', icon: Globe, requiresBusiness: true },
    { id: 'branding', label: 'Branding', icon: Palette, requiresBusiness: true },
    { id: 'team', label: 'Team Members', icon: UsersIcon, requiresBusiness: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, requiresBusiness: false },
    { id: 'security', label: 'Security', icon: Lock, requiresBusiness: false },
    { id: 'billing', label: 'Billing', icon: CreditCard, requiresBusiness: false },
  ];

  const tabs = allTabs.filter(tab => !tab.requiresBusiness || currentBusiness);

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft size={20} />
              <span>Back to Dashboard</span>
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and business preferences</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>

                {message && (
                  <div className={`mb-4 p-4 rounded-lg ${
                    message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={supabaseUser?.email || ''}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'business' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Business Details</h2>

                {message && (
                  <div className={`mb-4 p-4 rounded-lg ${
                    message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Business Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={businessData.business_name}
                        onChange={(e) => setBusinessData({ ...businessData, business_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Legal Name
                      </label>
                      <input
                        type="text"
                        value={businessData.legal_name}
                        onChange={(e) => setBusinessData({ ...businessData, legal_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Official legal name (if different from business name)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={businessData.email}
                        onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={businessData.phone}
                        onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <AddressInput
                    value={{
                      address_line1: businessData.address_line1,
                      address_line2: businessData.address_line2,
                      city: businessData.city,
                      state: businessData.state,
                      postal_code: businessData.postal_code,
                      country: businessData.country,
                    }}
                    onChange={(addressData) => setBusinessData({ ...businessData, ...addressData })}
                    required={true}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={businessData.website}
                        onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Business Type
                      </label>
                      <select
                        value={businessData.business_type}
                        onChange={(e) => setBusinessData({ ...businessData, business_type: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Type</option>
                        <option value="individual">Individual/Sole Proprietor</option>
                        <option value="llc">LLC</option>
                        <option value="corporation">Corporation</option>
                        <option value="partnership">Partnership</option>
                        <option value="trust">Trust</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tax ID / EIN
                      </label>
                      <input
                        type="text"
                        value={businessData.tax_id}
                        onChange={(e) => setBusinessData({ ...businessData, tax_id: e.target.value })}
                        placeholder="e.g., 12-3456789"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">For tax reporting purposes</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Registration Number
                      </label>
                      <input
                        type="text"
                        value={businessData.registration_number}
                        onChange={(e) => setBusinessData({ ...businessData, registration_number: e.target.value })}
                        placeholder="Business registration number"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={businessData.currency}
                        onChange={(e) => setBusinessData({ ...businessData, currency: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={businessData.timezone}
                        onChange={(e) => setBusinessData({ ...businessData, timezone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="America/Toronto">America/Toronto (EST/EDT)</option>
                        <option value="America/New_York">America/New_York (EST/EDT)</option>
                        <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                        <option value="America/Denver">America/Denver (MST/MDT)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                        <option value="America/Vancouver">America/Vancouver (PST/PDT)</option>
                        <option value="America/Edmonton">America/Edmonton (MST/MDT)</option>
                        <option value="America/Winnipeg">America/Winnipeg (CST/CDT)</option>
                        <option value="America/Halifax">America/Halifax (AST/ADT)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={businessData.notes}
                      onChange={(e) => setBusinessData({ ...businessData, notes: e.target.value })}
                      rows={3}
                      placeholder="Additional notes about your business"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Role
                    </label>
                    <span className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium capitalize">
                      {currentRole || 'Owner'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveBusiness}
                      disabled={isSaving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Business'}
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="mt-8 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Danger Zone
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Deleting this business will permanently remove all properties, units, tenants, and associated data. This action cannot be undone.
                  </p>
                  <button
                    onClick={() => setShowDeleteBusinessConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
                  >
                    <Trash2 size={18} />
                    Delete Business
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">White Label Branding</h2>
                <p className="text-gray-600 mb-6">Customize the application appearance for your business</p>

                {message && (
                  <div className={`mb-4 p-4 rounded-lg ${
                    message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Enable White Label Branding</p>
                      <p className="text-sm text-gray-600 mt-1">Customize logo, name, and colors for your business</p>
                    </div>
                    <button
                      onClick={() => setBrandingData({ ...brandingData, white_label_enabled: !brandingData.white_label_enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        brandingData.white_label_enabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          brandingData.white_label_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {brandingData.white_label_enabled && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Application Name
                        </label>
                        <input
                          type="text"
                          value={brandingData.application_name}
                          onChange={(e) => setBrandingData({ ...brandingData, application_name: e.target.value })}
                          placeholder="AI Rental Tools"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty to use default name</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Logo URL
                        </label>
                        <input
                          type="url"
                          value={brandingData.logo_url}
                          onChange={(e) => setBrandingData({ ...brandingData, logo_url: e.target.value })}
                          placeholder="/AiRentalTools-logo1t.svg"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">URL to your logo image (leave empty to use default)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Primary Color
                        </label>
                        <div className="flex gap-3 items-center">
                          <input
                            type="color"
                            value={brandingData.primary_color || '#2563eb'}
                            onChange={(e) => setBrandingData({ ...brandingData, primary_color: e.target.value })}
                            className="h-10 w-20 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandingData.primary_color}
                            onChange={(e) => setBrandingData({ ...brandingData, primary_color: e.target.value })}
                            placeholder="#2563eb"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Primary brand color in hex format</p>
                      </div>

                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>
                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                          <div className="flex items-center gap-3 mb-4">
                            <img
                              src={brandingData.logo_url || branding.logo_url}
                              alt="Logo preview"
                              className="h-8"
                              onError={(e) => { e.currentTarget.src = '/AiRentalTools-logo1t.svg'; }}
                            />
                            <span className="font-bold text-xl text-gray-900">
                              {brandingData.application_name || branding.application_name}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              style={{ backgroundColor: brandingData.primary_color || branding.primary_color }}
                              className="px-4 py-2 text-white rounded-lg font-medium"
                            >
                              Primary Button
                            </button>
                            <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium">
                              Secondary Button
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSaveBranding}
                      disabled={isSaving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Branding'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'public-page' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Public Business Page</h2>
                <p className="text-gray-600 mb-6">Configure your public-facing business page where prospects can browse available properties and apply for rentals.</p>

                {message && (
                  <div className={`mb-4 p-4 rounded-lg ${
                    message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="space-y-6">
                  {/* Enable Public Page Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Enable Public Business Page</p>
                      <p className="text-sm text-gray-600 mt-1">Allow prospects to view your properties and submit applications online</p>
                    </div>
                    <button
                      onClick={() => setPublicPageData({ ...publicPageData, public_page_enabled: !publicPageData.public_page_enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        publicPageData.public_page_enabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          publicPageData.public_page_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {publicPageData.public_page_enabled && (
                    <>
                      {/* Public Page URL */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Page URL Slug *
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1 flex items-center">
                            <span className="px-4 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-500 text-sm">
                              {window.location.origin}/browse/
                            </span>
                            <input
                              type="text"
                              value={publicPageData.public_page_slug}
                              onChange={(e) => setPublicPageData({ ...publicPageData, public_page_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                              placeholder="my-business"
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={generateSlug}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                          >
                            Auto-generate
                          </button>
                          {publicPageData.public_page_slug && (
                            <button
                              type="button"
                              onClick={copyPublicUrl}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                              {copiedSlug ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">URL-friendly identifier for your public page (letters, numbers, and hyphens only)</p>
                      </div>

                      {/* View Public Page Link */}
                      {publicPageData.public_page_slug && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-blue-900">Your Public Page</p>
                              <p className="text-sm text-blue-700">{window.location.origin}/browse/{publicPageData.public_page_slug}</p>
                            </div>
                            <a
                              href={`/browse/${publicPageData.public_page_slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                            >
                              <ExternalLink size={16} />
                              Preview Page
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Page Title */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Page Title
                        </label>
                        <input
                          type="text"
                          value={publicPageData.public_page_title}
                          onChange={(e) => setPublicPageData({ ...publicPageData, public_page_title: e.target.value })}
                          placeholder={businessData.business_name || 'Your Business Name'}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty to use your business name</p>
                      </div>

                      {/* Page Description */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Page Description
                        </label>
                        <textarea
                          value={publicPageData.public_page_description}
                          onChange={(e) => setPublicPageData({ ...publicPageData, public_page_description: e.target.value })}
                          rows={3}
                          placeholder="Welcome to our rental properties. Browse available units and apply online..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Contact Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Contact Email (Public)
                          </label>
                          <input
                            type="email"
                            value={publicPageData.public_page_contact_email}
                            onChange={(e) => setPublicPageData({ ...publicPageData, public_page_contact_email: e.target.value })}
                            placeholder="contact@yourbusiness.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Contact Phone (Public)
                          </label>
                          <input
                            type="tel"
                            value={publicPageData.public_page_contact_phone}
                            onChange={(e) => setPublicPageData({ ...publicPageData, public_page_contact_phone: e.target.value })}
                            placeholder="(555) 123-4567"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Branding */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Logo URL
                          </label>
                          <input
                            type="url"
                            value={publicPageData.public_page_logo_url}
                            onChange={(e) => setPublicPageData({ ...publicPageData, public_page_logo_url: e.target.value })}
                            placeholder="https://example.com/logo.png"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Header Image URL
                          </label>
                          <input
                            type="url"
                            value={publicPageData.public_page_header_image_url}
                            onChange={(e) => setPublicPageData({ ...publicPageData, public_page_header_image_url: e.target.value })}
                            placeholder="https://example.com/header.jpg"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                    <button
                      onClick={handleSavePublicPage}
                      disabled={isSaving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Public Page Settings'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Team Members</h2>
                <div className="text-center py-12 text-gray-500">
                  <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>Team management coming soon</p>
                  <p className="text-sm mt-2">Invite and manage team members with different roles</p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Payment Reminders</p>
                      <p className="text-sm text-gray-600">Get notified about upcoming payments</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Maintenance Alerts</p>
                      <p className="text-sm text-gray-600">Notifications for property maintenance</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        Update Password
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-600 mb-4">Add an extra layer of security to your account</p>
                    <button className="px-6 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <UsageLimitsWidget />

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Payment Method</h2>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="text-gray-600 text-sm">No payment method on file</p>
                    <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Add Payment Method
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Billing History</h2>
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No billing history yet</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Business Confirmation Modal */}
      {showDeleteBusinessConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-red-700 mb-2 flex items-center gap-2">
              <AlertTriangle size={20} />
              Delete Business
            </h3>
            <p className="text-gray-600 mb-4">
              This will permanently delete <strong>{currentBusiness?.business_name}</strong> and all associated data including properties, units, tenants, payments, and maintenance records.
            </p>
            <p className="text-gray-600 mb-4">
              To confirm, please type the business name: <strong>{currentBusiness?.business_name}</strong>
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type business name to confirm"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteBusinessConfirm(false);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBusiness}
                disabled={isDeleting || deleteConfirmText !== currentBusiness?.business_name}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Business'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
