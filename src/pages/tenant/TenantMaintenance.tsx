import { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { tenantPortalService, TenantMaintenanceRequest } from '../../services/tenantPortalService';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
  ChevronDown,
  ChevronUp,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { SlidePanel } from '../../components/SlidePanel';

const CATEGORIES = [
  { value: 'plumbing', label: 'Plumbing', description: 'Leaks, clogs, water issues' },
  { value: 'electrical', label: 'Electrical', description: 'Power, outlets, lighting' },
  { value: 'hvac', label: 'HVAC', description: 'Heating, cooling, ventilation' },
  { value: 'appliance', label: 'Appliances', description: 'Stove, fridge, dishwasher' },
  { value: 'structural', label: 'Structural', description: 'Doors, windows, walls' },
  { value: 'pest_control', label: 'Pest Control', description: 'Insects, rodents' },
  { value: 'security', label: 'Security', description: 'Locks, alarms, safety' },
  { value: 'other', label: 'Other', description: 'Any other issue' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', description: 'Non-urgent, can wait' },
  { value: 'medium', label: 'Medium', description: 'Should be fixed soon' },
  { value: 'high', label: 'High', description: 'Needs prompt attention' },
  { value: 'emergency', label: 'Emergency', description: 'Immediate danger or major damage' },
];

export function TenantMaintenance() {
  const { tenantData } = useTenant();
  const [requests, setRequests] = useState<TenantMaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as const,
    entry_allowed: true,
    entry_notes: '',
  });

  useEffect(() => {
    if (tenantData) {
      loadRequests();
    }
  }, [tenantData]);

  const loadRequests = async () => {
    if (!tenantData) return;

    setIsLoading(true);
    try {
      const data = await tenantPortalService.getMaintenanceRequests(tenantData.tenant_id);
      setRequests(data);
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantData) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await tenantPortalService.submitMaintenanceRequest(
        tenantData.tenant_id,
        tenantData.property_id,
        tenantData.unit_id,
        tenantData.organization_id,
        newRequest
      );

      setShowNewRequestModal(false);
      setNewRequest({
        title: '',
        description: '',
        category: '',
        priority: 'medium',
        entry_allowed: true,
        entry_notes: '',
      });
      loadRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      setSubmitError('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      submitted: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Clock className="w-3 h-3" /> },
      acknowledged: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <CheckCircle2 className="w-3 h-3" /> },
      in_progress: { bg: 'bg-purple-100', text: 'text-purple-800', icon: <Wrench className="w-3 h-3" /> },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle2 className="w-3 h-3" /> },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <X className="w-3 h-3" /> },
    };

    const style = styles[status] || styles.submitted;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      emergency: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority] || styles.medium}`}>
        {priority}
      </span>
    );
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'active') {
      return ['submitted', 'acknowledged', 'in_progress'].includes(request.status);
    }
    if (filter === 'completed') {
      return ['completed', 'cancelled'].includes(request.status);
    }
    return true;
  });

  const activeCount = requests.filter(r => ['submitted', 'acknowledged', 'in_progress'].includes(r.status)).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading maintenance requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
              <p className="text-sm text-gray-600 mt-1">Submit and track maintenance requests</p>
            </div>
            <button
              onClick={() => setShowNewRequestModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              New Request
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                <p className="text-sm text-gray-500">Total Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
                <p className="text-sm text-gray-500">Active Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {filteredRequests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests Found</h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all'
                  ? "You haven't submitted any maintenance requests yet."
                  : `No ${filter} maintenance requests.`}
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => setShowNewRequestModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Submit a Request
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredRequests.map((request) => (
                <div key={request.id} className="px-6 py-4">
                  <button
                    onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          request.status === 'completed' ? 'bg-green-100' :
                          request.priority === 'emergency' ? 'bg-red-100' :
                          request.priority === 'high' ? 'bg-orange-100' : 'bg-blue-100'
                        }`}>
                          <Wrench className={`w-5 h-5 ${
                            request.status === 'completed' ? 'text-green-600' :
                            request.priority === 'emergency' ? 'text-red-600' :
                            request.priority === 'high' ? 'text-orange-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900">{request.title}</p>
                            {getPriorityBadge(request.priority)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {getCategoryLabel(request.category)} • Submitted {formatDate(request.submitted_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(request.status)}
                        {expandedRequest === request.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {expandedRequest === request.id && (
                    <div className="mt-4 pl-14 space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Description</p>
                        <p className="text-gray-900">{request.description}</p>
                      </div>

                      {request.images && request.images.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Photos</p>
                          <div className="flex gap-2 flex-wrap">
                            {request.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt={`Request photo ${idx + 1}`}
                                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Status</p>
                          <p className="font-medium text-gray-900 capitalize">{request.status.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Priority</p>
                          <p className="font-medium text-gray-900 capitalize">{request.priority}</p>
                        </div>
                        {request.completed_at && (
                          <div>
                            <p className="text-gray-500">Completed</p>
                            <p className="font-medium text-gray-900">{formatDate(request.completed_at)}</p>
                          </div>
                        )}
                      </div>

                      {request.notes && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Manager Notes</p>
                              <p className="text-gray-900 text-sm">{request.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Request SlidePanel */}
      <SlidePanel
        isOpen={showNewRequestModal}
        onClose={() => setShowNewRequestModal(false)}
        title="New Maintenance Request"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowNewRequestModal(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="maintenance-form"
              disabled={isSubmitting || !newRequest.title || !newRequest.category || !newRequest.description}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        }
      >
        <form id="maintenance-form" onSubmit={handleSubmitRequest} className="space-y-6">
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{submitError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newRequest.title}
              onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
              placeholder="Brief description of the issue"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setNewRequest({ ...newRequest, category: cat.value })}
                  className={`p-3 text-left rounded-lg border transition ${
                    newRequest.category === cat.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm text-gray-900">{cat.label}</p>
                  <p className="text-xs text-gray-500">{cat.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITIES.map(priority => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setNewRequest({ ...newRequest, priority: priority.value as any })}
                  className={`p-3 text-left rounded-lg border transition ${
                    newRequest.priority === priority.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm text-gray-900">{priority.label}</p>
                  <p className="text-xs text-gray-500">{priority.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={newRequest.description}
              onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
              placeholder="Provide details about the issue..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={newRequest.entry_allowed}
                onChange={(e) => setNewRequest({ ...newRequest, entry_allowed: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Allow maintenance staff to enter my unit when I am not home
              </span>
            </label>
          </div>

          {newRequest.entry_allowed && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entry Notes (Optional)
              </label>
              <input
                type="text"
                value={newRequest.entry_notes}
                onChange={(e) => setNewRequest({ ...newRequest, entry_notes: e.target.value })}
                placeholder="e.g., Spare key under mat, call before entering"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </form>
      </SlidePanel>
      {showNewRequestModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowNewRequestModal(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">New Maintenance Request</h2>
                <button
                  onClick={() => setShowNewRequestModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitRequest} className="p-6 space-y-6">
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">{submitError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                    placeholder="Brief description of the issue"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setNewRequest({ ...newRequest, category: cat.value })}
                        className={`p-3 text-left rounded-lg border transition ${
                          newRequest.category === cat.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-sm text-gray-900">{cat.label}</p>
                        <p className="text-xs text-gray-500">{cat.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRIORITIES.map(priority => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => setNewRequest({ ...newRequest, priority: priority.value as any })}
                        className={`p-3 text-left rounded-lg border transition ${
                          newRequest.priority === priority.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-sm text-gray-900">{priority.label}</p>
                        <p className="text-xs text-gray-500">{priority.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    placeholder="Provide details about the issue..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={newRequest.entry_allowed}
                      onChange={(e) => setNewRequest({ ...newRequest, entry_allowed: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Allow maintenance staff to enter my unit when I'm not home
                    </span>
                  </label>
                </div>

                {newRequest.entry_allowed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entry Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={newRequest.entry_notes}
                      onChange={(e) => setNewRequest({ ...newRequest, entry_notes: e.target.value })}
                      placeholder="e.g., Spare key under mat, call before entering"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowNewRequestModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newRequest.title || !newRequest.category || !newRequest.description}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
