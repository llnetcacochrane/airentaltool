import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Building2, Mail, Calendar, Save, X, Plus, Trash2, Edit3, UserCircle, Shield, CheckCircle, AlertCircle, MailCheck } from 'lucide-react';
import { UserEditor } from '../components/UserEditor';
import { SlidePanel } from '../components/SlidePanel';
import { SuperAdminLayout } from '../components/SuperAdminLayout';

interface User {
  user_id: string;
  user_email: string;
  created_at: string;
  is_super_admin: boolean;
  email_confirmed_at: string | null;
  organizations: Array<{
    org_id: string;
    org_name: string;
    role: string;
    is_active: boolean;
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

export function SuperAdminUsers() {
  const navigate = useNavigate();
  const { supabaseUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [packageTiers, setPackageTiers] = useState<PackageTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserAddress, setNewUserAddress] = useState('');
  const [newUserCity, setNewUserCity] = useState('');
  const [newUserProvince, setNewUserProvince] = useState('');
  const [newUserPostal, setNewUserPostal] = useState('');
  const [newUserOrg, setNewUserOrg] = useState('');
  const [newUserRole, setNewUserRole] = useState('member');
  const [newUserPackage, setNewUserPackage] = useState('');
  const [createNewOrg, setCreateNewOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

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
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_all_users_with_orgs');

      if (usersError) throw usersError;

      setUsers(usersData || []);

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

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      alert('Email and password are required');
      return;
    }

    if (!createNewOrg && !newUserOrg) {
      alert('Please select an organization or choose to create a new one');
      return;
    }

    if (createNewOrg && !newOrgName) {
      alert('Please enter an organization name');
      return;
    }

    if (createNewOrg && !newUserPackage) {
      alert('Please select a package tier for the new organization');
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true
      });

      if (authError) throw authError;

      const userId = authData.user.id;

      await supabase
        .from('user_profiles')
        .update({
          first_name: newUserFirstName,
          last_name: newUserLastName,
          phone: newUserPhone,
          address_line1: newUserAddress,
          city: newUserCity,
          state_province: newUserProvince,
          postal_code: newUserPostal
        })
        .eq('user_id', userId);

      let orgId = newUserOrg;

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
          p_tier_slug: newUserPackage
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
          p_role: newUserRole
        });

        if (assignError) throw assignError;
      }

      alert('User created successfully!');
      setShowCreateUser(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserPhone('');
      setNewUserAddress('');
      setNewUserCity('');
      setNewUserProvince('');
      setNewUserPostal('');
      setNewUserOrg('');
      setNewUserRole('member');
      setNewUserPackage('');
      setCreateNewOrg(false);
      setNewOrgName('');
      await loadData();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      alert(`Failed to create user: ${error.message}`);
    }
  };

  const handleAddUserToOrg = async (userId: string) => {
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
      setEditingUser(null);
      setSelectedOrg('');
      setSelectedRole('member');
      await loadData();
    } catch (error: any) {
      console.error('Failed to add user:', error);
      alert(`Failed to add user: ${error.message}`);
    }
  };

  const handleRemoveUserFromOrg = async (userId: string, orgId: string) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('remove_user_from_organization_admin', {
        p_user_id: userId,
        p_organization_id: orgId
      });

      if (error) throw error;

      alert('User removed from organization successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Failed to remove user:', error);
      alert(`Failed to remove user: ${error.message}`);
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

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userId === supabaseUser?.id) {
      alert('You cannot delete your own account');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete ${userEmail}? This action cannot be undone and will remove all associated data.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('delete_user_admin', {
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

  const handleVerifyEmail = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to manually verify the email for ${userEmail}?`)) {
      return;
    }

    try {
      // Call edge function to verify email
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
        <p className="text-gray-500">Loading users...</p>
      </div>
    );
  }

  const actionButton = (
    <button
      onClick={() => setShowCreateUser(true)}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition font-semibold"
    >
      <Plus className="w-5 h-5" />
      Create New User
    </button>
  );

  return (
    <SuperAdminLayout
      title="User Management"
      subtitle="Manage users and their organization memberships"
      actionButton={actionButton}
    >

      <SlidePanel
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        title="Create New User"
      >
        <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
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
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
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
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
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
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
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
                  value={newUserAddress}
                  onChange={(e) => setNewUserAddress(e.target.value)}
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
                    value={newUserCity}
                    onChange={(e) => setNewUserCity(e.target.value)}
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
                    value={newUserProvince}
                    onChange={(e) => setNewUserProvince(e.target.value)}
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
                    value={newUserPostal}
                    onChange={(e) => setNewUserPostal(e.target.value)}
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
                      value={newUserPackage}
                      onChange={(e) => setNewUserPackage(e.target.value)}
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
                      value={newUserOrg}
                      onChange={(e) => setNewUserOrg(e.target.value)}
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
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
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
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateUser(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create User
              </button>
            </div>
      </SlidePanel>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">All Users</h2>
          <p className="text-sm text-gray-600 mt-1">
            {users.length} total users
          </p>
        </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Email Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Organizations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Super Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.user_email}</p>
                          <p className="text-xs text-gray-500">{user.user_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.email_confirmed_at ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Verified</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">Unverified</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleVerifyEmail(user.user_id, user.user_email)}
                              className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                              title="Manually verify email"
                            >
                              <MailCheck className="w-3 h-3" />
                              Verify
                            </button>
                            <button
                              onClick={() => handleResendVerification(user.user_email)}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                              title="Resend verification email"
                            >
                              <Mail className="w-3 h-3" />
                              Resend
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {user.organizations.length === 0 ? (
                          <span className="text-sm text-gray-400">No organizations</span>
                        ) : (
                          user.organizations.map((org) => (
                            <div key={org.org_id} className="flex items-center gap-2 text-sm">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-900">{org.org_name}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                org.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                org.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {org.role}
                              </span>
                              <button
                                onClick={() => handleRemoveUserFromOrg(user.user_id, org.org_id)}
                                className="text-red-600 hover:text-red-800"
                                title="Remove from organization"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                        {editingUser === user.user_id && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                            <select
                              value={selectedOrg}
                              onChange={(e) => setSelectedOrg(e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="">Select organization...</option>
                              {organizations.map((org) => (
                                <option key={org.org_id} value={org.org_id}>
                                  {org.org_name} ({org.package_tier_name})
                                </option>
                              ))}
                            </select>
                            <select
                              value={selectedRole}
                              onChange={(e) => setSelectedRole(e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="member">Member</option>
                              <option value="property_manager">Property Manager</option>
                              <option value="accounting">Accounting</option>
                              <option value="admin">Admin</option>
                              <option value="owner">Owner</option>
                            </select>
                            <button
                              onClick={() => handleAddUserToOrg(user.user_id)}
                              className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null);
                                setSelectedOrg('');
                                setSelectedRole('member');
                              }}
                              className="p-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleSuperAdmin(user.user_id, user.is_super_admin)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          user.is_super_admin
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {user.is_super_admin ? 'Revoke' : 'Grant'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingUserId(user.user_id)}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          title="Edit user"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => navigate(`/super-admin/impersonate/${user.user_id}`)}
                          className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                          title="Impersonate this user (God Mode)"
                          disabled={user.user_id === supabaseUser?.id}
                        >
                          <UserCircle className="w-4 h-4" />
                          Impersonate
                        </button>
                        <button
                          onClick={() => setEditingUser(editingUser === user.user_id ? null : user.user_id)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          title="Add to organization"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add to Org
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.user_id, user.user_email)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete user"
                          disabled={user.user_id === supabaseUser?.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {editingUserId && (
        <UserEditor
          userId={editingUserId}
          onClose={() => setEditingUserId(null)}
          onSave={loadData}
        />
      )}
    </SuperAdminLayout>
  );
}
