import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { maintenanceService, MaintenanceRequest } from '../services/maintenanceService';
import { propertyService } from '../services/propertyService';
import { tenantService } from '../services/tenantService';
import { Wrench, Plus, AlertCircle, Clock, CheckCircle, X, Calendar } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function Maintenance() {
  const { currentOrganization } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (currentOrganization) {
      loadData();
    }
  }, [currentOrganization]);

  const loadData = async () => {
    if (!currentOrganization) return;
    setIsLoading(true);
    try {
      const [requestsData, propertiesData, tenantsData] = await Promise.all([
        maintenanceService.getRequests(currentOrganization.id),
        propertyService.getAllProperties(currentOrganization.id),
        tenantService.getAllTenants(currentOrganization.id),
      ]);
      setRequests(requestsData);
      setProperties(propertiesData);
      setTenants(tenantsData);
    } catch (err) {
      console.error('Failed to load maintenance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (request: MaintenanceRequest) => {
    setEditingRequest(request);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRequest(null);
  };

  const handleSaveSuccess = () => {
    handleCloseForm();
    loadData();
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'acknowledged':
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <X className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
              <p className="text-gray-600 mt-1">Manage property maintenance requests</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              New Request
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="All"
            count={requests.length}
          />
          <FilterButton
            active={filter === 'submitted'}
            onClick={() => setFilter('submitted')}
            label="New"
            count={requests.filter(r => r.status === 'submitted').length}
          />
          <FilterButton
            active={filter === 'in_progress'}
            onClick={() => setFilter('in_progress')}
            label="In Progress"
            count={requests.filter(r => r.status === 'in_progress').length}
          />
          <FilterButton
            active={filter === 'completed'}
            onClick={() => setFilter('completed')}
            label="Completed"
            count={requests.filter(r => r.status === 'completed').length}
          />
        </div>

        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No maintenance requests</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? 'Get started by creating your first maintenance request'
                : `No ${filter.replace('_', ' ')} requests found`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Create Request
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-6 cursor-pointer"
                onClick={() => handleEdit(request)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(request.status)}
                      <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(
                          request.priority
                        )}`}
                      >
                        {request.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3 line-clamp-2">{request.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(request.submitted_at).toLocaleDateString()}
                      </span>
                      {request.property && (
                        <span>Property: {request.property.name}</span>
                      )}
                      {request.tenant && (
                        <span>
                          Tenant: {request.tenant.first_name} {request.tenant.last_name}
                        </span>
                      )}
                      {request.assigned_to && (
                        <span>Assigned: {request.assigned_to}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-medium text-gray-900 capitalize mb-1">
                      {request.status.replace('_', ' ')}
                    </div>
                    {request.estimated_cost && (
                      <div className="text-sm text-gray-600">
                        Est: ${request.estimated_cost.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <MaintenanceForm
          request={editingRequest}
          properties={properties}
          tenants={tenants}
          organizationId={currentOrganization?.id || ''}
          onClose={handleCloseForm}
          onSuccess={handleSaveSuccess}
        />
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label} ({count})
    </button>
  );
}

function MaintenanceForm({
  request,
  properties,
  tenants,
  organizationId,
  onClose,
  onSuccess,
}: {
  request: MaintenanceRequest | null;
  properties: any[];
  tenants: any[];
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    title: request?.title || '',
    description: request?.description || '',
    property_id: request?.property_id || '',
    tenant_id: request?.tenant_id || '',
    category: request?.category || 'general',
    priority: request?.priority || 'medium',
    status: request?.status || 'submitted',
    assigned_to: request?.assigned_to || '',
    estimated_cost: request?.estimated_cost?.toString() || '',
    notes: request?.notes || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data: any = {
        ...formData,
        organization_id: organizationId,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        tenant_id: formData.tenant_id || null,
      };

      if (request) {
        await maintenanceService.updateRequest(request.id, data);
      } else {
        await maintenanceService.createRequest(data);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {request ? 'Edit Request' : 'New Maintenance Request'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property *
              </label>
              <select
                value={formData.property_id}
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tenant (Optional)
              </label>
              <select
                value={formData.tenant_id}
                onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.first_name} {tenant.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="general">General</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC</option>
                <option value="appliance">Appliance</option>
                <option value="structural">Structural</option>
                <option value="pest_control">Pest Control</option>
                <option value="landscaping">Landscaping</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' | 'emergency' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'submitted' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="submitted">Submitted</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned To
              </label>
              <input
                type="text"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                placeholder="Vendor or person name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Cost
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {isSubmitting ? 'Saving...' : request ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
