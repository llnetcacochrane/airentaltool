import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Users, UserPlus, Building2, Mail, Save, X, Plus, Trash2, Edit3,
  UserCircle, Shield, CheckCircle, AlertCircle, MailCheck, ChevronDown, ChevronRight,
  Home, DoorOpen, FileText, Eye, ExternalLink, Globe, BarChart3
} from 'lucide-react';
import { UserEditor } from '../components/UserEditor';
import { SlidePanel } from '../components/SlidePanel';
import { SuperAdminLayout } from '../components/SuperAdminLayout';

interface BusinessUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  status: string;
  auth_user_id: string | null;
  created_at: string;
  is_active: boolean;
}

interface ClientAnalytics {
  user_id: string;
  user_email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_super_admin: boolean;
  business_count: number;
  total_properties: number;
  total_units: number;
  active_listings: number;
  total_applications: number;
  total_listing_views: number;
  businesses: Array<{
    id: string;
    name: string;
    public_page_enabled: boolean;
    public_page_slug: string | null;
    property_count: number;
    unit_count: number;
    active_listing_count: number;
    listings: Array<{
      id: string;
      title: string;
      slug: string;
      status: string;
      view_count: number;
      application_count: number;
    }>;
    users: BusinessUser[];
  }>;
}

interface Organization {
  org_id: string;
  org_name: string;
  owner_email: string;
  package_tier_name: string;
  package_tier_id: string;
}

interface PackageTier {
  id: string;
  tier_slug: string;
  tier_name: string;
}

export function SuperAdminClients() {
  const navigate = useNavigate();
  const { supabaseUser } = useAuth();
  const [clients, setClients] = useState<ClientAnalytics[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [packageTiers, setPackageTiers] = useState<PackageTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newClientFirstName, setNewClientFirstName] = useState('');
  const [newClientLastName, setNewClientLastName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientCity, setNewClientCity] = useState('');
  const [newClientProvince, setNewClientProvince] = useState('');
  const [newClientPostal, setNewClientPostal] = useState('');
  const [newClientOrg, setNewClientOrg] = useState('');
  const [newClientRole, setNewClientRole] = useState('member');
  const [newClientPackage, setNewClientPackage] = useState('');
  const [createNewOrg, setCreateNewOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    try {
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', supabaseUser?.id)
        .eq('is_active', true)
        .single();

      if (!superAdmin) {
        navigate('/dashboard');
        return;
      }

      await loadData();
    } catch (error) {
      console.error('Access check failed:', error);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // Load user analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .rpc('get_user_analytics_for_admin');

      if (analyticsError) {
        console.error('Analytics error:', analyticsError);
        // Fallback to old method if new function doesn't exist
        const { data: clientsData, error: clientsError } = await supabase
          .rpc('get_all_users_with_orgs');
        if (!clientsError && clientsData) {
          // Map old format to new format
          setClients(clientsData.map((u: any) => ({
            ...u,
            business_count: 0,
            total_properties: 0,
            total_units: 0,
            active_listings: 0,
            total_applications: 0,
            total_listing_views: 0,
            businesses: []
          })));
        }
      } else {
        setClients(analyticsData || []);
      }

      const { data: orgsData, error: orgsError } = await supabase
        .rpc('get_all_organizations_for_admin');

      if (orgsError) throw orgsError;

      setOrganizations(orgsData || []);

      const { data: tiersData } = await supabase
        .from('package_tiers')
        .select('id, tier_slug, tier_name')
        .eq('is_active', true)
        .order('display_order');

      setPackageTiers(tiersData || []);

    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const toggleClientExpanded = (userId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedClients(newExpanded);
  };

  const getPublicPageUrl = (slug: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/apply/${slug}`;
  };

  const handleCreateClient = async () => {
    if (!newClientEmail || !newClientPassword) {
      alert('Email and password are required');
      return;
    }

    if (!createNewOrg && !newClientOrg) {
      alert('Please select an organization or choose to create a new one');
      return;
    }

    if (createNewOrg && !newOrgName) {
      alert('Please enter an organization name');
      return;
    }

    if (createNewOrg && !newClientPackage) {
      alert('Please select a package tier for the new organization');
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newClientEmail,
        password: newClientPassword,
        email_confirm: true
      });

      if (authError) throw authError;

      const userId = authData.user.id;

      await supabase
        .from('user_profiles')
        .update({
          first_name: newClientFirstName,
          last_name: newClientLastName,
          phone: newClientPhone,
          address_line1: newClientAddress,
          city: newClientCity,
          state_province: newClientProvince,
          postal_code: newClientPostal
        })
        .eq('user_id', userId);

      let orgId = newClientOrg;

      if (createNewOrg) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: newOrgName,
            owner_id: userId,
            is_active: true
          })
          .select()
          .single();

        if (orgError) throw orgError;
        orgId = orgData.id;

        const { error: packageError } = await supabase.rpc('assign_package_to_organization', {
          p_org_id: orgId,
          p_tier_slug: newClientPackage
        });

        if (packageError) throw packageError;

        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: orgId,
            user_id: userId,
            role: 'owner',
            is_active: true
          });

        if (memberError) throw memberError;
      } else {
        const { error: assignError } = await supabase.rpc('assign_user_to_organization_admin', {
          p_user_id: userId,
          p_organization_id: orgId,
          p_role: newClientRole
        });

        if (assignError) throw assignError;
      }

      alert('Client created successfully!');
      setShowCreateClient(false);
      setNewClientEmail('');
      setNewClientPassword('');
      setNewClientFirstName('');
      setNewClientLastName('');
      setNewClientPhone('');
      setNewClientAddress('');
      setNewClientCity('');
      setNewClientProvince('');
      setNewClientPostal('');
      setNewClientOrg('');
      setNewClientRole('member');
      setNewClientPackage('');
      setCreateNewOrg(false);
      setNewOrgName('');
      await loadData();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      alert(`Failed to create user: ${error.message}`);
    }
  };

  const handleAddClientToOrg = async (userId: string) => {
    if (!selectedOrg) {
      alert('Please select an organization');
      return;
    }

    try {
      const { error } = await supabase.rpc('assign_user_to_organization_admin', {
        p_user_id: userId,
        p_organization_id: selectedOrg,
        p_role: selectedRole
      });

      if (error) throw error;

      alert('User added to organization successfully!');
      setEditingClient(null);
      setSelectedOrg('');
      setSelectedRole('member');
      await loadData();
    } catch (error: any) {
      console.error('Failed to add user:', error);
      alert(`Failed to add user: ${error.message}`);
    }
  };

  const handleToggleSuperAdmin = async (userId: string, isSuperAdmin: boolean) => {
    if (!confirm(`Are you sure you want to ${isSuperAdmin ? 'revoke' : 'grant'} super admin access?`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('toggle_super_admin_status', {
        p_user_id: userId,
        p_make_admin: !isSuperAdmin
      });

      if (error) throw error;

      alert(`Super admin access ${isSuperAdmin ? 'revoked' : 'granted'} successfully!`);
      await loadData();
    } catch (error: any) {
      console.error('Failed to toggle super admin:', error);
      alert(`Failed to update super admin status: ${error.message}`);
    }
  };

  const handleDeleteClient = async (userId: string, userEmail: string) => {
    if (userId === supabaseUser?.id) {
      alert('You cannot delete your own account');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete ${userEmail}? This action cannot be undone and will remove all associated data.`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_user_admin', {
        p_user_id: userId
      });

      if (error) throw error;

      alert(`User ${userEmail} deleted successfully`);
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      alert(`Failed to delete user: ${error.message}`);
    }
  };

  const handleVerifyClientEmail = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to manually verify the email for ${userEmail}?`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify email');
      }

      alert(`Email verified successfully for ${userEmail}`);
      await loadData();
    } catch (error: any) {
      console.error('Failed to verify email:', error);
      alert(`Failed to verify email: ${error.message}`);
    }
  };

  const handleResendVerification = async (userEmail: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });

      if (error) throw error;

      alert(`Verification email sent to ${userEmail}`);
    } catch (error: any) {
      console.error('Failed to resend verification:', error);
      alert(`Failed to resend verification: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading clients...</p>
      </div>
    );
  }

  const actionButton = (
    <button
      onClick={() => setShowCreateClient(true)}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition font-semibold"
    >
      <Plus className="w-5 h-5" />
      <span className="hidden sm:inline">Create New Client</span>
      <span className="sm:hidden">Add</span>
    </button>
  );

  return (
    <SuperAdminLayout
      title="Client Management"
      subtitle="Manage clients, view analytics, and access public pages"
      actionButton={actionButton}
    >

      <SlidePanel
        isOpen={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        title="Create New Client"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCreateClient(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateClient}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Client
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="client@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              value={newClientPassword}
              onChange={(e) => setNewClientPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Min 6 characters"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={newClientFirstName}
                onChange={(e) => setNewClientFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={newClientLastName}
                onChange={(e) => setNewClientLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Doe"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={newClientAddress}
              onChange={(e) => setNewClientAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={newClientCity}
                onChange={(e) => setNewClientCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Toronto"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Province
              </label>
              <input
                type="text"
                value={newClientProvince}
                onChange={(e) => setNewClientProvince(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="ON"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={newClientPostal}
                onChange={(e) => setNewClientPostal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="M1M 1M1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createNewOrg"
              checked={createNewOrg}
              onChange={(e) => setCreateNewOrg(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="createNewOrg" className="text-sm font-medium text-gray-700">
              Create a new organization for this user
            </label>
          </div>
          {createNewOrg ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Company Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Package Tier *
                </label>
                <select
                  value={newClientPackage}
                  onChange={(e) => setNewClientPackage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select package tier...</option>
                  {packageTiers.map((tier) => (
                    <option key={tier.id} value={tier.tier_slug}>
                      {tier.tier_name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Organization *
                </label>
                <select
                  value={newClientOrg}
                  onChange={(e) => setNewClientOrg(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select organization...</option>
                  {organizations.map((org) => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.org_name} ({org.package_tier_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={newClientRole}
                  onChange={(e) => setNewClientRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="member">Member</option>
                  <option value="property_manager">Property Manager</option>
                  <option value="accounting">Accounting</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </>
          )}
        </div>
      </SlidePanel>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">All Clients</h2>
          <p className="text-sm text-gray-600 mt-1">
            {clients.length} total clients • Click a row to see details
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {clients.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
              <p className="text-gray-600 mb-4">
                Clients are users who own at least one business. Create a new client to get started.
              </p>
              <button
                onClick={() => setShowCreateClient(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Plus className="w-5 h-5" />
                Create New Client
              </button>
            </div>
          ) : (
            clients.map((client) => (
            <div key={client.user_id} className="hover:bg-gray-50">
              {/* Main Row */}
              <div
                className="px-4 sm:px-6 py-4 cursor-pointer"
                onClick={() => toggleClientExpanded(client.user_id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <button className="text-gray-400 hover:text-gray-600">
                      {expandedClients.has(client.user_id) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{client.user_email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {client.email_confirmed_at ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 text-xs">
                            <AlertCircle className="w-3 h-3" /> Unverified
                          </span>
                        )}
                        {client.is_super_admin && (
                          <span className="flex items-center gap-1 bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-xs font-medium">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Analytics Summary */}
                  <div className="flex items-center gap-4 sm:gap-6 pl-8 sm:pl-0">
                    <div className="flex items-center gap-1.5 text-gray-600" title="Businesses">
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm font-medium">{client.business_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600" title="Properties">
                      <Home className="w-4 h-4" />
                      <span className="text-sm font-medium">{client.total_properties}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600" title="Units">
                      <DoorOpen className="w-4 h-4" />
                      <span className="text-sm font-medium">{client.total_units}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600" title="Active Listings">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-medium">{client.active_listings}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600" title="Views">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-medium">{client.total_listing_views}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pl-8 sm:pl-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditingClientId(client.user_id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                      title="Edit client"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/super-admin/impersonate/${client.user_id}`)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded transition"
                      title="Impersonate"
                      disabled={client.user_id === supabaseUser?.id}
                    >
                      <UserCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleSuperAdmin(client.user_id, client.is_super_admin)}
                      className={`p-2 rounded transition ${
                        client.is_super_admin
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={client.is_super_admin ? 'Revoke admin' : 'Grant admin'}
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.user_id, client.user_email)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete client"
                      disabled={client.user_id === supabaseUser?.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedClients.has(client.user_id) && (
                <div className="px-4 sm:px-6 pb-4 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                    {/* Client Details */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Account Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">User ID:</span>
                          <span className="text-gray-900 font-mono text-xs">{client.user_id.slice(0, 12)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created:</span>
                          <span className="text-gray-900">{new Date(client.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Last Sign In:</span>
                          <span className="text-gray-900">
                            {client.last_sign_in_at ? new Date(client.last_sign_in_at).toLocaleString() : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Applications:</span>
                          <span className="text-gray-900 font-medium">{client.total_applications}</span>
                        </div>
                        {!client.email_confirmed_at && (
                          <div className="flex gap-2 pt-2 border-t">
                            <button
                              onClick={() => handleVerifyClientEmail(client.user_id, client.user_email)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              <MailCheck className="w-3 h-3" /> Verify Email
                            </button>
                            <button
                              onClick={() => handleResendVerification(client.user_email)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              <Mail className="w-3 h-3" /> Resend
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Businesses & Public Pages */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Businesses & Public Pages
                      </h4>
                      {client.businesses && client.businesses.length > 0 ? (
                        <div className="space-y-3">
                          {client.businesses.map((business) => (
                            <div key={business.id} className="border border-gray-100 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">{business.name}</span>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{business.property_count} props</span>
                                  <span>•</span>
                                  <span>{business.unit_count} units</span>
                                  <span>•</span>
                                  <span>{business.active_listing_count} listings</span>
                                </div>
                              </div>
                              {business.public_page_enabled && business.listings && business.listings.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <p className="text-xs text-gray-500 mb-2">Public Listings:</p>
                                  <div className="space-y-1.5">
                                    {business.listings.filter(l => l.status === 'active').map((listing) => (
                                      <div key={listing.id} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-700 truncate flex-1">{listing.title}</span>
                                        <div className="flex items-center gap-2 ml-2">
                                          <span className="text-xs text-gray-400">{listing.view_count} views</span>
                                          {listing.slug && (
                                            <a
                                              href={getPublicPageUrl(listing.slug)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <ExternalLink className="w-3 h-3" />
                                              View
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!business.public_page_enabled && (
                                <p className="text-xs text-gray-400 mt-2">Public page disabled</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No businesses</p>
                      )}
                    </div>
                  </div>

                  {/* Business Users Section */}
                  {client.businesses && client.businesses.length > 0 && (
                    <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Users in Client's Businesses
                      </h4>
                      <div className="space-y-4">
                        {client.businesses.map((business) => (
                          <div key={`users-${business.id}`} className="border border-gray-100 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900 text-sm">{business.name}</span>
                              <span className="text-xs text-gray-500">
                                {business.users?.length || 0} users
                              </span>
                            </div>
                            {business.users && business.users.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-100">
                                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500">Name</th>
                                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500">Email</th>
                                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500">Role</th>
                                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {business.users.filter(u => u.is_active).map((user) => (
                                      <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="py-2 px-2 text-gray-900">
                                          {user.first_name} {user.last_name}
                                        </td>
                                        <td className="py-2 px-2 text-gray-600 text-xs">
                                          {user.email}
                                        </td>
                                        <td className="py-2 px-2">
                                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            user.role === 'tenant' ? 'bg-green-100 text-green-800' :
                                            user.role === 'applicant' ? 'bg-blue-100 text-blue-800' :
                                            user.role === 'property_owner' ? 'bg-purple-100 text-purple-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {user.role}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2">
                                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            user.status === 'active' ? 'bg-green-100 text-green-800' :
                                            user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {user.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No users in this business</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setEditingClient(editingClient === client.user_id ? null : client.user_id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add to Org
                    </button>
                    {editingClient === client.user_id && (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedOrg}
                          onChange={(e) => setSelectedOrg(e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">Select organization...</option>
                          {organizations.map((org) => (
                            <option key={org.org_id} value={org.org_id}>
                              {org.org_name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddClientToOrg(client.user_id);
                          }}
                          className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingClient(null);
                            setSelectedOrg('');
                            setSelectedRole('member');
                          }}
                          className="p-1.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
          )}
        </div>
      </div>

      {editingClientId && (
        <UserEditor
          userId={editingClientId}
          onClose={() => setEditingClientId(null)}
          onSave={loadData}
        />
      )}
    </SuperAdminLayout>
  );
}
