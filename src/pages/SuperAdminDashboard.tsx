import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminService, AdminType } from '../services/superAdminService';
import { useAuth } from '../context/AuthContext';
import { Building2, Users, DollarSign, Activity, AlertCircle, Settings, Briefcase, Package, Mail } from 'lucide-react';
import { SuperAdminLayout } from '../components/SuperAdminLayout';

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { supabaseUser, switchOrganization } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [adminType, setAdminType] = useState<AdminType>('none');
  const [isSwitchingToOrg, setIsSwitchingToOrg] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [supabaseUser]);

  const checkAccess = async () => {
    try {
      const isSuperAdmin = await superAdminService.isSuperAdmin();
      if (!isSuperAdmin) {
        navigate('/dashboard');
        return;
      }

      setIsAuthorized(true);
      const type = await superAdminService.getAdminType();
      setAdminType(type);
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
      const [statsData, orgsData] = await Promise.all([
        superAdminService.getOrganizationStats(),
        superAdminService.getAllOrganizations(),
      ]);
      setStats(statsData);
      setOrganizations(orgsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleStatusChange = async (orgId: string, newStatus: string) => {
    try {
      await superAdminService.updateOrganizationStatus(orgId, newStatus);
      await loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleSwitchToAdminOrg = async () => {
    setIsSwitchingToOrg(true);
    try {
      const adminOrgId = await superAdminService.getOrCreateAdminOrg();
      if (adminOrgId) {
        localStorage.setItem('currentBusinessId', adminOrgId);
        navigate('/dashboard');
        window.location.reload();
      } else {
        throw new Error('No admin org ID returned');
      }
    } catch (error: any) {
      console.error('Failed to switch to admin org:', error);
      const message = error?.message || 'Unknown error';
      alert(`Failed to switch to admin organization: ${message}`);
    } finally {
      setIsSwitchingToOrg(false);
    }
  };

  const handleCreateNotification = () => {
    alert('System notifications feature coming soon!');
  };

  const handleViewSettings = () => {
    navigate('/super-admin/config');
  };

  const handleManageClients = () => {
    navigate('/super-admin/clients');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Verifying access...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const adminBadge = adminType !== 'none' ? (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
      adminType === 'both' ? 'bg-purple-500' :
      adminType === 'system' ? 'bg-blue-500' : 'bg-green-500'
    }`}>
      {adminType === 'both' ? 'System + SaaS Admin' :
       adminType === 'system' ? 'System Admin' : 'SaaS Admin'}
    </span>
  ) : null;

  const actionButton = (
    <button
      onClick={handleSwitchToAdminOrg}
      disabled={isSwitchingToOrg}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition disabled:bg-gray-500"
    >
      <Briefcase size={18} />
      {isSwitchingToOrg ? 'Switching...' : 'Switch to Admin Org'}
    </button>
  );

  return (
    <SuperAdminLayout
      title={
        <div className="flex items-center gap-3">
          <span>Super Admin Dashboard</span>
          {adminBadge}
        </div>
      }
      subtitle="Platform Management & Monitoring"
      actionButton={actionButton}
    >
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-yellow-900 font-semibold">Super Admin Mode Active</p>
            <p className="text-yellow-800 text-sm mt-1">
              You have full access to all organizations and platform settings. Use with caution.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            icon={Building2}
            title="Total Organizations"
            value={stats?.totalOrganizations || 0}
            subtitle={`${stats?.activeOrganizations || 0} active`}
            color="blue"
          />
          <StatCard
            icon={Users}
            title="Total Tenants"
            value={stats?.totalTenants || 0}
            subtitle="Across all organizations"
            color="green"
          />
          <StatCard
            icon={DollarSign}
            title="Total Payments"
            value={stats?.totalPayments || 0}
            subtitle="Platform-wide"
            color="purple"
          />
          <StatCard
            icon={Activity}
            title="Properties"
            value={stats?.totalProperties || 0}
            subtitle="Total managed"
            color="orange"
          />
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">All Organizations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Owner Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Properties
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Tenants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {org.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{org.owner_email || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        {org.account_tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <select
                        value={org.subscription_status}
                        onChange={(e) => handleStatusChange(org.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-semibold border-0 ${
                          org.subscription_status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : org.subscription_status === 'trial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="suspended">Suspended</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {org.total_properties}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{org.total_tenants}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => navigate(`/super-admin/organizations/${org.id}/package`)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Manage Package
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Quick Platform Actions
            </h3>
            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={handleManageClients}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
              >
                Manage Clients
              </button>
              <button
                onClick={() => navigate('/super-admin/packages')}
                className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
              >
                Manage Packages
              </button>
              <button
                onClick={handleViewSettings}
                className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
              >
                System Configuration
              </button>
              <button
                onClick={handleCreateNotification}
                className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
              >
                Create System Notification
              </button>
              <button
                onClick={() => navigate('/super-admin/email-accounts')}
                className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                Email Accounts
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Platform Health</h3>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Active Organizations</span>
                <span className="font-semibold text-green-600">
                  {stats?.activeOrganizations || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Trial Organizations</span>
                <span className="font-semibold text-yellow-600">
                  {stats?.trialOrganizations || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Suspended Organizations</span>
                <span className="font-semibold text-red-600">
                  {stats?.suspendedOrganizations || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: any;
  title: string;
  value: number | string;
  subtitle: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
