import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, Building2, FolderOpen, X, ChevronRight } from 'lucide-react';
import { clientService, Client } from '../services/clientService';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import { EmptyStatePresets } from '../components/EmptyState';

export default function PropertyOwners() {
  const { currentBusiness, supabaseUser, isPropertyManager } = useAuth();
  const { refreshBusinesses } = useBusiness();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPortfolios, setClientPortfolios] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
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
  const [portfolioName, setPortfolioName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentBusiness) {
      loadClients();
    }
  }, [currentBusiness?.id]);

  const loadClients = async () => {
    if (!currentBusiness) return;
    try {
      setLoading(true);
      const data = await clientService.getClients(currentBusiness.id);
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
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

  // Page title changes based on client type
  const pageTitle = isPropertyManager ? 'Clients' : 'Property Owners';
  const pageDescription = isPropertyManager
    ? 'Manage your property owner clients and their portfolios'
    : 'Manage property owners who have read-only access to their properties';
  const addButtonText = isPropertyManager ? 'Add Client' : 'Add Owner';
  const emptyStateText = isPropertyManager
    ? 'No clients yet. Click "Add Client" to add your first property owner client.'
    : 'No property owners yet. Click "Add Owner" to create one.';

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {pageDescription}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingClient(null);
              setShowForm(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
          >
            <Plus size={20} />
            {addButtonText}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {clients.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {pageTitle.toLowerCase()} yet</h3>
            <p className="text-gray-500 mb-6">{emptyStateText}</p>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
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
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      Active
                    </span>
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
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Client Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingClient ? 'Edit Client' : addButtonText}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingClient(null);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex gap-3 pt-4">
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
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingClient ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Detail View Modal */}
      {showDetailView && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedClient.first_name} {selectedClient.last_name}
                </h2>
                {selectedClient.company_name && (
                  <p className="text-gray-600">{selectedClient.company_name}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowDetailView(false);
                  setSelectedClient(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
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
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
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
                <div className="bg-gray-50 rounded-lg p-6 text-center">
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

            <div className="flex gap-3 pt-4 border-t border-gray-200">
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
          </div>
        </div>
      )}

      {/* Create Portfolio Modal */}
      {showPortfolioForm && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create Portfolio</h2>
              <button
                onClick={() => {
                  setShowPortfolioForm(false);
                  setPortfolioName('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Create a new portfolio for {selectedClient.first_name} {selectedClient.last_name}
            </p>
            <form onSubmit={handleCreatePortfolio} className="space-y-4">
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
              <div className="flex gap-3 pt-4">
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
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Portfolio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
