import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, Building2, FolderOpen, ChevronRight, Send, RefreshCw, XCircle, CheckCircle, Clock, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { clientService, Client } from '../services/clientService';
import { userInvitationService, InvitationWithBusiness } from '../services/userInvitationService';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { SlidePanel } from '../components/SlidePanel';

export default function PropertyOwners() {
  const { currentBusiness, supabaseUser, isPropertyManager } = useAuth();
  const { refreshBusinesses } = useBusiness();
  const [clients, setClients] = useState<Client[]>([]);
  const [invitations, setInvitations] = useState<InvitationWithBusiness[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPortfolios, setClientPortfolios] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    notes: '',
  });
  const [inviteFormData, setInviteFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [portfolioName, setPortfolioName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [activeTab, setActiveTab] = useState<'clients' | 'invitations'>('clients');

  useEffect(() => {
    if (currentBusiness) {
      loadData();
    }
  }, [currentBusiness?.id]);

  const loadData = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      await Promise.all([loadClients(), loadInvitations()]);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    if (!currentBusiness) return;
    try {
      const data = await clientService.getClients(currentBusiness.id);
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadInvitations = async () => {
    if (!currentBusiness) return;
    try {
      const data = await userInvitationService.getBusinessInvitations(currentBusiness.id, {
        type: 'property_owner',
      });
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const loadClientPortfolios = async (clientId: string) => {
    try {
      const portfolios = await clientService.getPortfoliosForClient(clientId);
      setClientPortfolios(portfolios);
    } catch (error) {
      console.error('Error loading client portfolios:', error);
      setClientPortfolios([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    setIsSubmitting(true);
    try {
      if (editingClient) {
        await clientService.updateClient(editingClient.id, formData);
      } else {
        await clientService.createClient(currentBusiness.id, formData);
      }
      setShowForm(false);
      setEditingClient(null);
      resetForm();
      await loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    setInviteError('');
    setIsSubmitting(true);

    try {
      // Check if invitation already exists
      const hasPending = await userInvitationService.hasPendingInvitation(
        currentBusiness.id,
        inviteFormData.email
      );
      if (hasPending) {
        setInviteError('An invitation has already been sent to this email address.');
        setIsSubmitting(false);
        return;
      }

      // Create invitation
      const invitation = await userInvitationService.createInvitation(
        currentBusiness.id,
        'property_owner',
        {
          email: inviteFormData.email,
          first_name: inviteFormData.first_name,
          last_name: inviteFormData.last_name,
          phone: inviteFormData.phone || undefined,
        },
        true // Send email
      );

      // Create client record and link to invitation
      const client = await clientService.createClient(currentBusiness.id, {
        first_name: inviteFormData.first_name,
        last_name: inviteFormData.last_name,
        email: inviteFormData.email,
        phone: inviteFormData.phone,
      });

      // Link invitation to client
      await userInvitationService.linkInvitationToClient(invitation.id, client.id);

      setShowInviteForm(false);
      resetInviteForm();
      await loadData();
    } catch (error) {
      console.error('Error sending invitation:', error);
      setInviteError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await userInvitationService.resendInvitation(invitationId);
      alert('Invitation resent successfully!');
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert(error instanceof Error ? error.message : 'Failed to resend invitation');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      await userInvitationService.cancelInvitation(invitationId);
      await loadInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert('Failed to cancel invitation');
    }
  };

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !currentBusiness || !supabaseUser) return;

    setIsSubmitting(true);
    try {
      await clientService.createPortfolioForClient(
        selectedClient.id,
        supabaseUser.id,
        currentBusiness.id,
        portfolioName
      );
      setShowPortfolioForm(false);
      setPortfolioName('');
      await loadClientPortfolios(selectedClient.id);
      await refreshBusinesses();
    } catch (error) {
      console.error('Error creating portfolio:', error);
      alert('Failed to create portfolio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this client? Their portfolios will remain but they will no longer appear in the active list.')) {
      try {
        await clientService.deactivateClient(id);
        loadClients();
        if (selectedClient?.id === id) {
          setShowDetailView(false);
          setSelectedClient(null);
        }
      } catch (error) {
        console.error('Error deactivating client:', error);
      }
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone || '',
      company_name: client.company_name || '',
      notes: client.notes || '',
    });
    setShowForm(true);
  };

  const handleViewClient = async (client: Client) => {
    setSelectedClient(client);
    setShowDetailView(true);
    await loadClientPortfolios(client.id);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_name: '',
      notes: '',
    });
  };

  const resetInviteForm = () => {
    setInviteFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
    });
    setInviteError('');
  };

  const getInvitationStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
            <Clock size={12} />
            Pending
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
            <CheckCircle size={12} />
            Accepted
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
            <AlertCircle size={12} />
            Expired
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
            <XCircle size={12} />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  // Get client invitation status
  const getClientInvitationStatus = (client: Client) => {
    const invitation = invitations.find(inv =>
      inv.email.toLowerCase() === client.email.toLowerCase()
    );
    return invitation;
  };

  // Page title changes based on client type
  const pageTitle = isPropertyManager ? 'Clients' : 'Property Owners';
  const pageDescription = isPropertyManager
    ? 'Manage your property owner clients and their portfolios'
    : 'Manage property owners who have read-only access to their properties';
  const addButtonText = isPropertyManager ? 'Add Client' : 'Add Owner';
  const emptyStateText = isPropertyManager
    ? 'No clients yet. Click "Add Client" to add your first property owner client.'
    : 'No property owners yet. Click "Add Owner" to create one.';

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-2xl sm:text-3xl font-bold text-gray-900">{pageTitle}</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {pageDescription}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  resetInviteForm();
                  setShowInviteForm(true);
                }}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Send size={18} />
                <span className="hidden sm:inline">Send Invite</span>
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setEditingClient(null);
                  setShowForm(true);
                }}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                {addButtonText}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-b -mb-px">
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition ${
                activeTab === 'clients'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {isPropertyManager ? 'Clients' : 'Property Owners'} ({clients.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition flex items-center gap-2 ${
                activeTab === 'invitations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Invitations
              {pendingInvitations.length > 0 && (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {pendingInvitations.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'clients' ? (
          // Clients/Property Owners Tab
          clients.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Building2 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No {pageTitle.toLowerCase()} yet</h3>
              <p className="text-gray-500 mb-6">{emptyStateText}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    resetInviteForm();
                    setShowInviteForm(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  <Send size={18} />
                  Send Invite
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setEditingClient(null);
                    setShowForm(true);
                  }}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus size={20} />
                  {addButtonText}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {clients.map((client) => {
                const invitation = getClientInvitationStatus(client);
                const hasPortalAccess = (client as any).portal_access_enabled;

                return (
                  <div
                    key={client.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer"
                    onClick={() => handleViewClient(client)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {client.first_name} {client.last_name}
                          </h3>
                          {client.company_name && (
                            <p className="text-sm text-gray-600 mt-1">{client.company_name}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {hasPortalAccess ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              <UserCheck size={12} />
                              Portal Access
                            </span>
                          ) : invitation ? (
                            getInvitationStatusBadge(invitation.status)
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                              No Invite
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} className="text-gray-400" />
                          <span className="truncate">{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewClient(client);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          View Details
                          <ChevronRight size={16} />
                        </button>
                        <div className="flex items-center gap-2">
                          {invitation?.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResendInvitation(invitation.id);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Resend Invitation"
                            >
                              <RefreshCw size={16} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(client);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeactivate(client.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Deactivate"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          // Invitations Tab
          invitations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Send className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations yet</h3>
              <p className="text-gray-500 mb-6">
                Send an invitation to give property owners access to view their properties.
              </p>
              <button
                onClick={() => {
                  resetInviteForm();
                  setShowInviteForm(true);
                }}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Send size={18} />
                Send Invite
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {invitation.first_name} {invitation.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{invitation.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getInvitationStatusBadge(invitation.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invitation.status === 'pending'
                          ? new Date(invitation.expires_at).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {invitation.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResendInvitation(invitation.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Resend"
                            >
                              <RefreshCw size={16} />
                            </button>
                            <button
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Cancel"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Send Invitation SlidePanel */}
      <SlidePanel
        isOpen={showInviteForm}
        onClose={() => {
          setShowInviteForm(false);
          resetInviteForm();
        }}
        title="Invite Property Owner"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowInviteForm(false);
                resetInviteForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="invite-form"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              An email will be sent to the property owner with a link to create their account.
              Once registered, they will have read-only access to view their properties, reports, and financials.
            </p>
          </div>

          {inviteError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{inviteError}</p>
            </div>
          )}

          <form id="invite-form" onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteFormData.first_name}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteFormData.last_name}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={inviteFormData.email}
                onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="owner@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="tel"
                value={inviteFormData.phone}
                onChange={(e) => setInviteFormData({ ...inviteFormData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>
          </form>
        </div>
      </SlidePanel>

      {/* Add/Edit Client Form SlidePanel */}
      <SlidePanel
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingClient(null);
          resetForm();
        }}
        title={editingClient ? 'Edit Client' : addButtonText}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingClient(null);
                resetForm();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="client-form"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingClient ? 'Save Changes' : 'Create'}
            </button>
          </div>
        }
      >
        <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>
      </SlidePanel>

      {/* Client Detail View SlidePanel */}
      <SlidePanel
        isOpen={showDetailView && !!selectedClient}
        onClose={() => {
          setShowDetailView(false);
          setSelectedClient(null);
        }}
        title={selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : ''}
        size="large"
        footer={selectedClient && (
          <div className="flex gap-3">
            <button
              onClick={() => handleEdit(selectedClient)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition"
            >
              <Edit2 size={16} />
              Edit Client
            </button>
            <button
              onClick={() => handleDeactivate(selectedClient.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
            >
              <Trash2 size={16} />
              Deactivate
            </button>
          </div>
        )}
      >
        {selectedClient && (
          <div className="space-y-6">
            {selectedClient.company_name && (
              <p className="text-gray-600">{selectedClient.company_name}</p>
            )}

            {/* Portal Access Status */}
            {(() => {
              const invitation = getClientInvitationStatus(selectedClient);
              const hasPortalAccess = (selectedClient as any).portal_access_enabled;

              return (
                <div className={`rounded-lg p-4 ${
                  hasPortalAccess
                    ? 'bg-green-50 border border-green-200'
                    : invitation?.status === 'pending'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {hasPortalAccess ? (
                        <>
                          <UserCheck className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-900">Portal Access Enabled</p>
                            <p className="text-sm text-green-700">This owner can view their properties and reports</p>
                          </div>
                        </>
                      ) : invitation?.status === 'pending' ? (
                        <>
                          <Clock className="w-5 h-5 text-yellow-600" />
                          <div>
                            <p className="font-medium text-yellow-900">Invitation Pending</p>
                            <p className="text-sm text-yellow-700">
                              Sent on {new Date(invitation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Mail className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">No Portal Access</p>
                            <p className="text-sm text-gray-600">Send an invitation to grant access</p>
                          </div>
                        </>
                      )}
                    </div>
                    {!hasPortalAccess && (
                      invitation?.status === 'pending' ? (
                        <button
                          onClick={() => handleResendInvitation(invitation.id)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition"
                        >
                          <RefreshCw size={14} />
                          Resend
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setInviteFormData({
                              first_name: selectedClient.first_name,
                              last_name: selectedClient.last_name,
                              email: selectedClient.email,
                              phone: selectedClient.phone || '',
                            });
                            setShowInviteForm(true);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <Send size={14} />
                          Send Invite
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Contact Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Contact Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={16} className="text-gray-400" />
                  <a href={`mailto:${selectedClient.email}`} className="text-blue-600 hover:underline">
                    {selectedClient.email}
                  </a>
                </div>
                {selectedClient.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={16} className="text-gray-400" />
                    <a href={`tel:${selectedClient.phone}`} className="text-blue-600 hover:underline">
                      {selectedClient.phone}
                    </a>
                  </div>
                )}
              </div>
              {selectedClient.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">{selectedClient.notes}</p>
                </div>
              )}
            </div>

            {/* Portfolios */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Portfolios</h3>
                <button
                  onClick={() => setShowPortfolioForm(true)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus size={16} />
                  Add Portfolio
                </button>
              </div>

              {clientPortfolios.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 text-center">
                  <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No portfolios yet</p>
                  <button
                    onClick={() => setShowPortfolioForm(true)}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create first portfolio
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientPortfolios.map((portfolio) => (
                    <div
                      key={portfolio.id}
                      className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">{portfolio.name}</h4>
                        <p className="text-sm text-gray-500">
                          {portfolio.properties?.[0]?.count || 0} properties
                        </p>
                      </div>
                      <Building2 size={20} className="text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* Create Portfolio SlidePanel */}
      <SlidePanel
        isOpen={showPortfolioForm && !!selectedClient}
        onClose={() => {
          setShowPortfolioForm(false);
          setPortfolioName('');
        }}
        title="Create Portfolio"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowPortfolioForm(false);
                setPortfolioName('');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="portfolio-form"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Portfolio'}
            </button>
          </div>
        }
      >
        {selectedClient && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Create a new portfolio for {selectedClient.first_name} {selectedClient.last_name}
            </p>
            <form id="portfolio-form" onSubmit={handleCreatePortfolio} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Portfolio Name *
                </label>
                <input
                  type="text"
                  required
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  placeholder={`${selectedClient.first_name}'s Properties`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
