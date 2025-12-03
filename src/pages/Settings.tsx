import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { authService } from '../services/authService';
import { brandingService } from '../services/brandingService';
import { useNavigate } from 'react-router-dom';
import { User, Building2, Users as UsersIcon, Bell, Lock, CreditCard, Palette, ArrowLeft } from 'lucide-react';

export function Settings() {
  const { userProfile, supabaseUser, currentOrganization, currentRole } = useAuth();
  const { branding, refreshBranding } = useBranding();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
  });

  const [brandingData, setBrandingData] = useState({
    white_label_enabled: false,
    application_name: '',
    logo_url: '',
    primary_color: '',
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
    loadBrandingData();
  }, [currentOrganization?.id]);

  const loadBrandingData = async () => {
    if (!currentOrganization) return;
    try {
      const orgBranding = await brandingService.getOrganizationBranding(currentOrganization.id);
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
  };

  const handleSaveBranding = async () => {
    if (!currentOrganization) return;
    setIsSaving(true);
    setMessage('');
    try {
      await brandingService.upsertOrganizationBranding(currentOrganization.id, brandingData);
      await refreshBranding();
      setMessage('Branding updated successfully');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update branding');
    } finally {
      setIsSaving(false);
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

  const allTabs = [
    { id: 'profile', label: 'Profile', icon: User, requiresOrg: false },
    { id: 'organization', label: 'Organization', icon: Building2, requiresOrg: true },
    { id: 'branding', label: 'Branding', icon: Palette, requiresOrg: true },
    { id: 'team', label: 'Team Members', icon: UsersIcon, requiresOrg: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, requiresOrg: false },
    { id: 'security', label: 'Security', icon: Lock, requiresOrg: false },
    { id: 'billing', label: 'Billing', icon: CreditCard, requiresOrg: false },
  ];

  const tabs = allTabs.filter(tab => !tab.requiresOrg || currentOrganization);

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
          <p className="text-gray-600 mt-1">Manage your account and organization preferences</p>
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

            {activeTab === 'organization' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Organization Details</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={currentOrganization?.name || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={currentOrganization?.company_name || ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Account Tier
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold capitalize">
                        {currentOrganization?.account_tier || 'Solo'}
                      </span>
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Upgrade Plan
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Role
                    </label>
                    <span className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium capitalize">
                      {currentRole}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">White Label Branding</h2>
                <p className="text-gray-600 mb-6">Customize the application appearance for your organization</p>

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
                      <p className="text-sm text-gray-600 mt-1">Customize logo, name, and colors for your organization</p>
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
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Billing & Subscription</h2>

                <div className="space-y-6">
                  <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg capitalize">{currentOrganization?.account_tier || 'Solo'} Plan</h3>
                        <p className="text-sm text-gray-600">Active subscription</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900">$0</p>
                        <p className="text-sm text-gray-600">per month</p>
                      </div>
                    </div>
                    <button className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                      Upgrade Plan
                    </button>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Payment Method</h3>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <p className="text-gray-600 text-sm">No payment method on file</p>
                      <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Add Payment Method
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Billing History</h3>
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No billing history yet</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
