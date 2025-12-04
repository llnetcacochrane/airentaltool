import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  X, Save, User, Building2, Package, Shield, Settings, Briefcase,
  Mail, Phone, MapPin, Calendar, Key, CheckCircle, XCircle, Edit2,
  Trash2, Plus, AlertCircle
} from 'lucide-react';

interface UserEditorProps {
  userId: string;
  onClose: () => void;
  onSave: () => void;
}

interface UserProfile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  selected_tier: string | null;
  is_super_admin: boolean;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
  package_tier_id: string | null;
  package_tier_name: string | null;
}

interface Business {
  id: string;
  business_name: string;
  business_type: string | null;
  is_active: boolean;
}

interface FeatureFlag {
  feature_key: string;
  is_enabled: boolean;
}

interface Portfolio {
  id: string;
  name: string;
  is_default: boolean;
}

interface PackageTier {
  id: string;
  tier_slug: string;
  tier_name: string;
  tier_description: string | null;
}

export function UserEditor({ userId, onClose, onSave }: UserEditorProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'organizations' | 'package' | 'features' | 'businesses'>('profile');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [packageTiers, setPackageTiers] = useState<PackageTier[]>([]);
  const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [selectedOrgToAdd, setSelectedOrgToAdd] = useState('');
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState('member');

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [profileData, orgsData, portfoliosData, businessData, tierData, availableOrgsData] = await Promise.all([
        loadUserProfile(),
        loadUserOrganizations(),
        loadUserPortfolios(),
        loadUserBusinesses(),
        loadPackageTiers(),
        loadAvailableOrganizations(),
      ]);

      const defaultPortfolio = portfoliosData.find((p: Portfolio) => p.is_default);
      await loadUserFeatures(defaultPortfolio?.id);
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('is_active')
      .eq('user_id', userId)
      .maybeSingle();

    const userData: UserProfile = {
      user_id: userId,
      email: authUser?.user?.email || '',
      first_name: profile?.first_name || null,
      last_name: profile?.last_name || null,
      phone: profile?.phone || null,
      address_line1: profile?.address_line1 || null,
      city: profile?.city || null,
      state_province: profile?.state_province || null,
      postal_code: profile?.postal_code || null,
      country: profile?.country || 'CA',
      selected_tier: profile?.selected_tier || null,
      is_super_admin: superAdmin?.is_active || false,
      created_at: authUser?.user?.created_at || new Date().toISOString(),
    };

    setUserProfile(userData);
    setEditedProfile(userData);
    return userData;
  };

  const loadUserOrganizations = async () => {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        is_active,
        organizations!inner(
          id,
          name,
          package_tier_id,
          package_tiers(tier_name)
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    const orgs: Organization[] = (data || []).map((item: any) => ({
      id: item.organizations.id,
      name: item.organizations.name,
      role: item.role,
      is_active: item.is_active,
      package_tier_id: item.organizations.package_tier_id,
      package_tier_name: item.organizations.package_tiers?.tier_name || null,
    }));

    setOrganizations(orgs);
    return orgs;
  };

  const loadUserPortfolios = async () => {
    const { data, error } = await supabase
      .from('portfolios')
      .select('id, name, is_default')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (error) throw error;

    setPortfolios(data || []);
    return data || [];
  };

  const loadUserBusinesses = async () => {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, business_name, business_type, is_active')
      .eq('created_by', userId);

    if (error) throw error;

    setBusinesses(data || []);
    return data || [];
  };

  const loadUserFeatures = async (portfolioId?: string) => {
    if (!portfolioId) {
      const { data: effectiveFeatures, error } = await supabase
        .rpc('get_effective_user_features', { p_user_id: userId });

      if (error) {
        console.error('Error loading effective features:', error);
        setFeatures([]);
        return;
      }

      const formattedFeatures: FeatureFlag[] = (effectiveFeatures || []).map((f: any) => ({
        feature_key: f.feature_key,
        is_enabled: f.is_enabled,
      }));

      setFeatures(formattedFeatures);
      return;
    }

    const { data, error } = await supabase
      .from('portfolio_feature_flags')
      .select('feature_key, is_enabled')
      .eq('portfolio_id', portfolioId);

    if (error) throw error;

    setFeatures(data || []);
  };

  const loadPackageTiers = async () => {
    const { data, error } = await supabase
      .from('package_tiers')
      .select('id, tier_slug, tier_name, tier_description')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;

    setPackageTiers(data || []);
    return data || [];
  };

  const loadAvailableOrganizations = async () => {
    const { data, error } = await supabase.rpc('get_all_organizations_for_admin');

    if (error) throw error;

    setAvailableOrgs(data || []);
    return data || [];
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          first_name: editedProfile.first_name,
          last_name: editedProfile.last_name,
          phone: editedProfile.phone,
          address_line1: editedProfile.address_line1,
          city: editedProfile.city,
          state_province: editedProfile.state_province,
          postal_code: editedProfile.postal_code,
          country: editedProfile.country,
          selected_tier: editedProfile.selected_tier,
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      setSuccessMessage('Profile updated successfully');
      await loadUserProfile();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEmail = async (newEmail: string) => {
    if (!confirm('Are you sure you want to update this user\'s email? They will need to verify the new email.')) {
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        email: newEmail,
      });

      if (error) throw error;

      setSuccessMessage('Email updated successfully');
      await loadUserProfile();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update email');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSuperAdmin = async () => {
    if (!confirm(`Are you sure you want to ${userProfile?.is_super_admin ? 'revoke' : 'grant'} super admin access?`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('toggle_super_admin_status', {
        p_user_id: userId,
        p_make_admin: !userProfile?.is_super_admin,
      });

      if (error) throw error;

      setSuccessMessage(`Super admin access ${userProfile?.is_super_admin ? 'revoked' : 'granted'}`);
      await loadUserProfile();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle super admin');
    }
  };

  const handleAddToOrganization = async () => {
    if (!selectedOrgToAdd) {
      setError('Please select an organization');
      return;
    }

    try {
      const { error } = await supabase.rpc('assign_user_to_organization_admin', {
        p_user_id: userId,
        p_organization_id: selectedOrgToAdd,
        p_role: selectedRoleToAdd,
      });

      if (error) throw error;

      setSuccessMessage('User added to organization');
      setShowAddOrg(false);
      setSelectedOrgToAdd('');
      setSelectedRoleToAdd('member');
      await loadUserOrganizations();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user to organization');
    }
  };

  const handleRemoveFromOrganization = async (orgId: string) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('remove_user_from_organization_admin', {
        p_user_id: userId,
        p_organization_id: orgId,
      });

      if (error) throw error;

      setSuccessMessage('User removed from organization');
      await loadUserOrganizations();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  const handleUpdateOrgRole = async (orgId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('organization_id', orgId);

      if (error) throw error;

      setSuccessMessage('Role updated successfully');
      await loadUserOrganizations();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleUpdateOrgPackage = async (orgId: string, tierSlug: string) => {
    try {
      const { error } = await supabase.rpc('assign_package_to_organization', {
        p_org_id: orgId,
        p_tier_slug: tierSlug,
      });

      if (error) throw error;

      setSuccessMessage('Package updated successfully');
      await loadUserOrganizations();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update package');
    }
  };

  const handleToggleFeature = async (portfolioId: string, featureKey: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('portfolio_feature_flags')
        .upsert({
          portfolio_id: portfolioId,
          feature_key: featureKey,
          is_enabled: enabled,
          enabled_by_admin: true,
        });

      if (error) throw error;

      setSuccessMessage('Feature updated successfully');
      await loadUserFeatures(portfolioId);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feature');
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit User</h2>
              <p className="text-sm text-gray-600">{userProfile?.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}

        <div className="border-b border-gray-200">
          <div className="px-6 flex gap-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === 'profile'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </div>
            </button>
            <button
              onClick={() => setActiveTab('organizations')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === 'organizations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organizations ({organizations.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('package')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === 'package'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Package & Tier
              </div>
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === 'features'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Features
              </div>
            </button>
            <button
              onClick={() => setActiveTab('businesses')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === 'businesses'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Businesses ({businesses.length})
              </div>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className={`w-5 h-5 ${userProfile?.is_super_admin ? 'text-red-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-medium text-gray-900">Super Admin Access</p>
                    <p className="text-sm text-gray-600">
                      {userProfile?.is_super_admin ? 'This user has super admin privileges' : 'Standard user access'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleSuperAdmin}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    userProfile?.is_super_admin
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {userProfile?.is_super_admin ? 'Revoke Access' : 'Grant Access'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editedProfile.email || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {editedProfile.email !== userProfile?.email && (
                    <button
                      onClick={() => handleUpdateEmail(editedProfile.email!)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Update Email
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Account Created
                  </label>
                  <input
                    type="text"
                    value={new Date(userProfile?.created_at || '').toLocaleDateString()}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editedProfile.first_name || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editedProfile.last_name || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editedProfile.phone || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Address
                  </label>
                  <input
                    type="text"
                    value={editedProfile.address_line1 || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, address_line1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={editedProfile.city || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={editedProfile.state_province || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, state_province: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={editedProfile.postal_code || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    value={editedProfile.country || 'CA'}
                    onChange={(e) => setEditedProfile({ ...editedProfile, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CA">Canada</option>
                    <option value="US">United States</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'organizations' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Organization Memberships</h3>
                <button
                  onClick={() => setShowAddOrg(!showAddOrg)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add to Organization
                </button>
              </div>

              {showAddOrg && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Organization
                      </label>
                      <select
                        value={selectedOrgToAdd}
                        onChange={(e) => setSelectedOrgToAdd(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Choose organization...</option>
                        {availableOrgs.map((org) => (
                          <option key={org.org_id} value={org.org_id}>
                            {org.org_name} - {org.package_tier_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        value={selectedRoleToAdd}
                        onChange={(e) => setSelectedRoleToAdd(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="member">Member</option>
                        <option value="property_manager">Property Manager</option>
                        <option value="accounting">Accounting</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleAddToOrganization}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddOrg(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {organizations.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Not a member of any organizations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {organizations.map((org) => (
                    <div key={org.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{org.name}</h4>
                          <p className="text-sm text-gray-600">Package: {org.package_tier_name || 'None'}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFromOrganization(org.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Remove from organization"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                          </label>
                          <select
                            value={org.role}
                            onChange={(e) => handleUpdateOrgRole(org.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="member">Member</option>
                            <option value="property_manager">Property Manager</option>
                            <option value="accounting">Accounting</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                          </label>
                          <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                            org.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {org.is_active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'package' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">User Package Tier</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Tier
                  </label>
                  <select
                    value={editedProfile.selected_tier || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, selected_tier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">No tier selected</option>
                    {packageTiers.map((tier) => (
                      <option key={tier.id} value={tier.tier_slug}>
                        {tier.tier_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-600 mt-2">
                    This is the tier shown during onboarding/signup
                  </p>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {isSaving ? 'Saving...' : 'Save Tier'}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Packages</h3>
                {organizations.length === 0 ? (
                  <p className="text-gray-600 text-center py-8 bg-gray-50 rounded-lg">
                    No organizations to manage
                  </p>
                ) : (
                  <div className="space-y-3">
                    {organizations.map((org) => (
                      <div key={org.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">{org.name}</h4>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Package Tier
                        </label>
                        <select
                          value={org.package_tier_id || ''}
                          onChange={(e) => {
                            const selectedTier = packageTiers.find(t => t.id === e.target.value);
                            if (selectedTier) {
                              handleUpdateOrgPackage(org.id, selectedTier.tier_slug);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="">No package assigned</option>
                          {packageTiers.map((tier) => (
                            <option key={tier.id} value={tier.id}>
                              {tier.tier_name} - {tier.tier_description}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Feature Flags</h3>
              <p className="text-sm text-gray-600">
                Features are based on the user's package tier. You can override individual features below.
              </p>

              {portfolios.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">User has no portfolios yet</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Portfolio
                    </label>
                    <select
                      onChange={(e) => loadUserFeatures(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      defaultValue={portfolios.find(p => p.is_default)?.id || ''}
                    >
                      <option value="">Choose portfolio...</option>
                      {portfolios.map((portfolio) => (
                        <option key={portfolio.id} value={portfolio.id}>
                          {portfolio.name} {portfolio.is_default ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    {[
                      { key: 'basic_properties', label: 'Basic Property Management' },
                      { key: 'basic_tenants', label: 'Basic Tenant Management' },
                      { key: 'basic_rent_tracking', label: 'Basic Rent Tracking' },
                      { key: 'basic_maintenance', label: 'Basic Maintenance Requests' },
                      { key: 'unlimited_units', label: 'Unlimited Units' },
                      { key: 'businesses', label: 'Business Entities' },
                      { key: 'expense_tracking', label: 'Expense Tracking' },
                      { key: 'document_storage', label: 'Document Storage' },
                      { key: 'property_owners', label: 'Property Owners' },
                      { key: 'ai_recommendations', label: 'AI Recommendations' },
                      { key: 'rent_optimization', label: 'Rent Optimization' },
                      { key: 'advanced_reporting', label: 'Advanced Reporting' },
                      { key: 'bulk_operations', label: 'Bulk Operations' },
                      { key: 'white_label', label: 'White Label Branding' },
                      { key: 'api_access', label: 'API Access' },
                      { key: 'custom_integrations', label: 'Custom Integrations' },
                      { key: 'priority_support', label: 'Priority Support' },
                    ].map((feature) => {
                      const isEnabled = features.find(f => f.feature_key === feature.key)?.is_enabled || false;
                      const selectedPortfolio = portfolios.find(p => p.is_default)?.id;

                      return (
                        <div key={feature.key} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            {isEnabled ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-gray-400" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{feature.label}</p>
                              <p className="text-sm text-gray-600">Feature key: {feature.key}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => selectedPortfolio && handleToggleFeature(selectedPortfolio, feature.key, !isEnabled)}
                            disabled={!selectedPortfolio}
                            className={`px-4 py-2 rounded-lg font-medium text-sm ${
                              isEnabled
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } disabled:opacity-50`}
                          >
                            {isEnabled ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'businesses' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">User Businesses</h3>
              {businesses.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No businesses created by this user</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {businesses.map((business) => (
                    <div key={business.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{business.business_name}</h4>
                          {business.business_type && (
                            <p className="text-sm text-gray-600 mt-1">{business.business_type}</p>
                          )}
                          <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded text-xs font-semibold ${
                            business.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {business.is_active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            window.open(`/business/${business.id}`, '_blank');
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View business"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <p className="text-sm text-gray-600">
            User ID: <code className="bg-gray-200 px-2 py-1 rounded text-xs">{userId}</code>
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
            <button
              onClick={() => {
                onSave();
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
