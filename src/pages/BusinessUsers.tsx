import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { businessUserService, BusinessUserWithStats } from '../services/businessUserService';
import { unitService } from '../services/unitService';
import { propertyService } from '../services/propertyService';
import { Unit, Property, BusinessUserStatus, BusinessUserRole } from '../types';
import { SlidePanel } from '../components/SlidePanel';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  ArrowUpCircle,
  MessageSquare,
  MoreVertical,
  Check,
  X,
  Clock,
  AlertCircle,
  Home,
  ChevronDown,
  Send,
} from 'lucide-react';

interface PromotionData {
  user: BusinessUserWithStats;
  unitId: string;
  leaseStartDate: string;
  monthlyRentCents: number;
}

export function BusinessUsers() {
  const { currentBusiness } = useAuth();
  const [users, setUsers] = useState<BusinessUserWithStats[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<BusinessUserWithStats[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BusinessUserStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<BusinessUserRole | 'all'>('all');

  // Panel states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPromotePanel, setShowPromotePanel] = useState(false);
  const [showMessagePanel, setShowMessagePanel] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BusinessUserWithStats | null>(null);

  // Form states
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [promotionData, setPromotionData] = useState<PromotionData | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total_users: 0,
    pending_users: 0,
    active_users: 0,
    tenants: 0,
    unread_messages: 0,
  });

  useEffect(() => {
    if (currentBusiness) {
      loadData();
    }
  }, [currentBusiness]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter, roleFilter]);

  const loadData = async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const [usersData, statsData, propertiesData] = await Promise.all([
        businessUserService.getBusinessUsers(currentBusiness.id),
        businessUserService.getBusinessUserStats(currentBusiness.id),
        propertyService.getPropertiesByBusiness(currentBusiness.id),
      ]);
      setUsers(usersData);
      setStats(statsData);
      setProperties(propertiesData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(term) ||
          u.first_name.toLowerCase().includes(term) ||
          u.last_name.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setIsSubmitting(true);
    setError('');

    try {
      await businessUserService.createBusinessUser(currentBusiness.id, newUserForm);
      setSuccess('User added successfully');
      setShowAddUser(false);
      setNewUserForm({ email: '', first_name: '', last_name: '', phone: '' });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (userId: string, status: BusinessUserStatus) => {
    try {
      await businessUserService.updateUserStatus(userId, status);
      loadData();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const handleOpenPromote = async (user: BusinessUserWithStats) => {
    setSelectedUser(user);
    setPromotionData({
      user,
      unitId: '',
      leaseStartDate: new Date().toISOString().split('T')[0],
      monthlyRentCents: 0,
    });
    setSelectedPropertyId('');
    setShowPromotePanel(true);
  };

  const handlePropertyChange = async (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    if (propertyId) {
      const propertyUnits = await unitService.getUnitsByProperty(propertyId);
      // Filter to vacant units only
      setUnits(propertyUnits.filter((u) => u.occupancy_status === 'vacant'));
    } else {
      setUnits([]);
    }
  };

  const handlePromoteToTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotionData?.user || !promotionData.unitId) return;
    setIsSubmitting(true);
    setError('');

    try {
      await businessUserService.promoteToTenant(
        promotionData.user.id,
        promotionData.unitId,
        promotionData.leaseStartDate,
        promotionData.monthlyRentCents || undefined
      );
      setSuccess(`${promotionData.user.first_name} has been promoted to tenant!`);
      setShowPromotePanel(false);
      setPromotionData(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenMessage = (user: BusinessUserWithStats) => {
    setSelectedUser(user);
    setMessageText('');
    setShowMessagePanel(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !selectedUser || !messageText.trim()) return;
    setIsSubmitting(true);

    try {
      const user = (await import('../lib/supabase')).supabase.auth.getUser();
      const userId = (await user).data.user?.id;

      await businessUserService.sendMessage(
        currentBusiness.id,
        selectedUser.id,
        'manager',
        userId || '',
        messageText
      );
      setSuccess('Message sent');
      setShowMessagePanel(false);
      setMessageText('');
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: BusinessUserStatus) => {
    const styles: Record<BusinessUserStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role: BusinessUserRole) => {
    const styles: Record<BusinessUserRole, string> = {
      user: 'bg-blue-100 text-blue-800',
      tenant: 'bg-purple-100 text-purple-800',
      applicant: 'bg-orange-100 text-orange-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role]}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  if (!currentBusiness) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-2xl sm:text-3xl font-bold text-gray-900">Business Users</h1>
                <p className="text-gray-600">Manage users who have signed up for your business</p>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Business Selected</h3>
            <p className="text-gray-600">Please select a business to manage its users.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-2xl sm:text-3xl font-bold text-gray-900">Business Users</h1>
                <p className="text-gray-600">Manage users for {currentBusiness.business_name}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <UserPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Add User</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center gap-2">
            <Check className="w-5 h-5" />
            {success}
            <button onClick={() => setSuccess('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={() => setError('')} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total_users}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.pending_users}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.active_users}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <Home className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.tenants}</p>
                <p className="text-sm text-gray-600">Tenants</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.unread_messages}</p>
                <p className="text-sm text-gray-600">Unread Messages</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as BusinessUserStatus | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as BusinessUserRole | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="applicant">Applicant</option>
                <option value="tenant">Tenant</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
            <p className="text-gray-600 mb-4">
              {users.length === 0
                ? 'No users have signed up yet. Enable your public page to allow signups.'
                : 'No users match your search criteria.'}
            </p>
            {users.length === 0 && (
              <a
                href="/public-page"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Configure Public Page
              </a>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {user.first_name.charAt(0)}
                              {user.last_name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            {user.unread_messages && user.unread_messages > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                                <MessageSquare className="w-3 h-3" />
                                {user.unread_messages} unread
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {user.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(user.id, 'active')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Approve"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                          )}
                          {user.role !== 'tenant' && user.status === 'active' && (
                            <button
                              onClick={() => handleOpenPromote(user)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                              title="Promote to Tenant"
                            >
                              <ArrowUpCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenMessage(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Send Message"
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                          {user.status === 'active' && (
                            <button
                              onClick={() => handleUpdateStatus(user.id, 'suspended')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Suspend"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add User Panel */}
      <SlidePanel
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        title="Add New User"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddUser(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleAddUser}
              disabled={isSubmitting || !newUserForm.email || !newUserForm.first_name || !newUserForm.last_name}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add User'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={newUserForm.first_name}
                onChange={(e) => setNewUserForm({ ...newUserForm, first_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={newUserForm.last_name}
                onChange={(e) => setNewUserForm({ ...newUserForm, last_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={newUserForm.phone}
              onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
      </SlidePanel>

      {/* Promote to Tenant Panel */}
      <SlidePanel
        isOpen={showPromotePanel}
        onClose={() => {
          setShowPromotePanel(false);
          setPromotionData(null);
        }}
        title="Promote to Tenant"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowPromotePanel(false);
                setPromotionData(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handlePromoteToTenant}
              disabled={isSubmitting || !promotionData?.unitId}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Promoting...' : 'Promote to Tenant'}
            </button>
          </div>
        }
      >
        {promotionData && (
          <form onSubmit={handlePromoteToTenant} className="space-y-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-700">
                Promoting <strong>{promotionData.user.first_name} {promotionData.user.last_name}</strong> to tenant status.
                Select a vacant unit to assign them to.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property *
              </label>
              <select
                value={selectedPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit *
              </label>
              <select
                value={promotionData.unitId}
                onChange={(e) => {
                  const unit = units.find((u) => u.id === e.target.value);
                  setPromotionData({
                    ...promotionData,
                    unitId: e.target.value,
                    monthlyRentCents: unit?.monthly_rent_cents || 0,
                  });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                disabled={!selectedPropertyId}
              >
                <option value="">Select a unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.unit_number} - ${(u.monthly_rent_cents / 100).toFixed(2)}/mo
                  </option>
                ))}
              </select>
              {selectedPropertyId && units.length === 0 && (
                <p className="text-sm text-yellow-600 mt-1">
                  No vacant units available in this property.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lease Start Date *
              </label>
              <input
                type="date"
                value={promotionData.leaseStartDate}
                onChange={(e) =>
                  setPromotionData({ ...promotionData, leaseStartDate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rent ($)
              </label>
              <input
                type="number"
                value={promotionData.monthlyRentCents / 100}
                onChange={(e) =>
                  setPromotionData({
                    ...promotionData,
                    monthlyRentCents: Math.round(parseFloat(e.target.value) * 100),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                step="0.01"
                min="0"
              />
            </div>
          </form>
        )}
      </SlidePanel>

      {/* Message Panel */}
      <SlidePanel
        isOpen={showMessagePanel}
        onClose={() => {
          setShowMessagePanel(false);
          setSelectedUser(null);
        }}
        title={`Message ${selectedUser?.first_name || 'User'}`}
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowMessagePanel(false);
                setSelectedUser(null);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={isSubmitting || !messageText.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Sending message to <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>
              </p>
              <p className="text-xs text-gray-500">{selectedUser.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Type your message here..."
                required
              />
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

export default BusinessUsers;
