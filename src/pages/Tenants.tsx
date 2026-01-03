import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tenantService } from '../services/tenantService';
import { Tenant } from '../types';
import { TenantForm } from '../components/TenantForm';
import { EmptyStatePresets } from '../components/EmptyState';
import { SlidePanel } from '../components/SlidePanel';
import { Plus, Mail, Phone, Users, Edit2, Trash2, Briefcase, UserCheck, X } from 'lucide-react';
import { ExportButton } from '../components/ExportButton';
import { exportTenants } from '../utils/exportHelpers';
import { ExportFormat } from '../services/dataExportService';
import { useBulkSelection, BulkActionBar, CommonBulkActions } from '../components/BulkActionBar';
import { Checkbox } from '../components/Checkbox';

export function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const { currentBusiness } = useAuth();
  const bulkSelection = useBulkSelection(tenants);

  useEffect(() => {
    loadTenants();
  }, [currentBusiness?.id]);

  const loadTenants = async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const data = await tenantService.getBusinessTenants(currentBusiness.id);
      setTenants(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTenant = async (data: Partial<Tenant>) => {
    if (!currentBusiness || !data.unit_id) return;
    setIsSubmitting(true);
    try {
      await tenantService.createTenant(currentBusiness.id, data.unit_id, data);
      await loadTenants();
      setShowAddForm(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTenant = async (data: Partial<Tenant>) => {
    if (!editingTenant) return;
    setIsSubmitting(true);
    try {
      await tenantService.updateTenant(editingTenant.id, data);
      await loadTenants();
      setEditingTenant(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tenant? The unit will be marked as vacant if this is the last tenant. This action cannot be undone.')) {
      return;
    }
    setDeletingId(id);
    try {
      await tenantService.deleteTenant(id);
      await loadTenants();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenant');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        bulkSelection.selectedItems.map((tenant) =>
          tenantService.deleteTenant(tenant.id)
        )
      );
      await loadTenants();
      bulkSelection.clearSelection();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenants');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading tenants...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tenants</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">{tenants.length} total tenants</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-shrink-0">
            <ExportButton
              onExport={(format: ExportFormat) => exportTenants(tenants, format)}
              disabled={tenants.length === 0}
              variant="secondary"
              size="md"
            />
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex-1 sm:flex-initial whitespace-nowrap"
            >
              <Plus size={20} className="flex-shrink-0" />
              <span className="hidden sm:inline">Add Tenant</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-red-800 text-sm">{error}</p>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
              <X size={20} />
            </button>
          </div>
        )}

        {tenants.length === 0 ? (
          EmptyStatePresets.Tenants(() => setShowAddForm(true))
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="bg-white rounded-lg shadow p-4 relative">
                  <div className="absolute top-4 left-4 z-10">
                    <Checkbox
                      checked={bulkSelection.isSelected(tenant.id)}
                      onChange={() => bulkSelection.toggleSelection(tenant.id)}
                    />
                  </div>
                  <div className="flex items-start justify-between mb-3 ml-8">
                    <button
                      onClick={() => setSelectedTenant(tenant)}
                      className="font-semibold text-gray-900 hover:text-blue-600 text-left"
                    >
                      {tenant.first_name} {tenant.last_name}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingTenant(tenant)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(tenant.id)}
                        disabled={deletingId === tenant.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail size={14} />
                      <span className="truncate">{tenant.email}</span>
                    </div>
                    {tenant.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} />
                        {tenant.phone}
                      </div>
                    )}
                    {tenant.employer && (
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} />
                        {tenant.employer}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 w-12">
                      <Checkbox
                        checked={bulkSelection.isAllSelected}
                        indeterminate={bulkSelection.isSomeSelected}
                        onChange={(checked) => checked ? bulkSelection.selectAll() : bulkSelection.clearSelection()}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Occupation</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={bulkSelection.isSelected(tenant.id)}
                          onChange={() => bulkSelection.toggleSelection(tenant.id)}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => setSelectedTenant(tenant)}
                          className="font-medium text-gray-900 hover:text-blue-600 text-left"
                        >
                          {tenant.first_name} {tenant.last_name}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail size={14} />
                          {tenant.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {tenant.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone size={14} />
                            {tenant.phone}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {tenant.employer ? (
                          <div className="flex items-center gap-2">
                            <Briefcase size={14} />
                            {tenant.employer}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingTenant(tenant)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit tenant"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTenant(tenant.id)}
                            disabled={deletingId === tenant.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Delete tenant"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {(showAddForm || editingTenant) && (
        <TenantForm
          tenant={editingTenant || undefined}
          onSubmit={editingTenant ? handleUpdateTenant : handleAddTenant}
          onCancel={() => {
            setShowAddForm(false);
            setEditingTenant(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {selectedTenant && (
        <TenantDetailsModal
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onEdit={(tenant) => {
            setSelectedTenant(null);
            setEditingTenant(tenant);
          }}
        />
      )}

      <BulkActionBar
        selectedCount={bulkSelection.selectedCount}
        totalCount={tenants.length}
        onClearSelection={bulkSelection.clearSelection}
        onSelectAll={bulkSelection.selectAll}
        selectAllLabel="Select all tenants"
        actions={[
          CommonBulkActions.delete(handleBulkDelete),
        ]}
      />
    </div>
  );
}

function TenantDetailsModal({
  tenant,
  onClose,
  onEdit,
}: {
  tenant: Tenant;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
}) {
  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SlidePanel
      isOpen={true}
      onClose={onClose}
      title={`${tenant.first_name} ${tenant.last_name}`}
      size="large"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Close
          </button>
          <button
            onClick={() => onEdit(tenant)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Edit Tenant
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <UserCheck size={16} className="text-green-600" />
          <span className="text-sm text-gray-600">Active Tenant</span>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-gray-400" />
              <div>
                <dt className="text-gray-600 text-xs">Email</dt>
                <dd className="text-gray-900 font-medium">{tenant.email}</dd>
              </div>
            </div>
            {tenant.phone && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <div>
                  <dt className="text-gray-600 text-xs">Phone</dt>
                  <dd className="text-gray-900 font-medium">{tenant.phone}</dd>
                </div>
              </div>
            )}
            {tenant.employer_phone && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <div>
                  <dt className="text-gray-600 text-xs">Employer Phone</dt>
                  <dd className="text-gray-900 font-medium">{tenant.employer_phone}</dd>
                </div>
              </div>
            )}
          </dl>
        </div>

        {(tenant.employer || tenant.monthly_income_cents) && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Employment</h3>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              {tenant.employer && (
                <div>
                  <dt className="text-gray-600 text-xs">Employer</dt>
                  <dd className="text-gray-900 font-medium">{tenant.employer}</dd>
                </div>
              )}
              {tenant.monthly_income_cents && (
                <div>
                  <dt className="text-gray-600 text-xs">Monthly Income</dt>
                  <dd className="text-gray-900 font-medium">{formatCurrency(tenant.monthly_income_cents / 100)}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {(tenant.emergency_contact_name || tenant.emergency_contact_phone) && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Emergency Contact</h3>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              {tenant.emergency_contact_name && (
                <div>
                  <dt className="text-gray-600 text-xs">Name</dt>
                  <dd className="text-gray-900 font-medium">{tenant.emergency_contact_name}</dd>
                </div>
              )}
              {tenant.emergency_contact_phone && (
                <div>
                  <dt className="text-gray-600 text-xs">Phone</dt>
                  <dd className="text-gray-900 font-medium">{tenant.emergency_contact_phone}</dd>
                </div>
              )}
              {tenant.emergency_contact_relationship && (
                <div>
                  <dt className="text-gray-600 text-xs">Relationship</dt>
                  <dd className="text-gray-900 font-medium">{tenant.emergency_contact_relationship}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {(tenant.move_in_date || tenant.security_deposit_paid_cents) && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Lease Information</h3>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              {tenant.move_in_date && (
                <div>
                  <dt className="text-gray-600 text-xs">Move-In Date</dt>
                  <dd className="text-gray-900 font-medium">{formatDate(tenant.move_in_date)}</dd>
                </div>
              )}
              {tenant.security_deposit_paid_cents && (
                <div>
                  <dt className="text-gray-600 text-xs">Security Deposit Paid</dt>
                  <dd className="text-gray-900 font-medium">{formatCurrency(tenant.security_deposit_paid_cents / 100)}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {tenant.notes && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{tenant.notes}</p>
          </div>
        )}
      </div>
    </SlidePanel>
  );
}
