import { useState, useEffect } from 'react';
import { Tenant, TenantType, Unit } from '../types';
import { unitService } from '../services/unitService';
import { useAuth } from '../context/AuthContext';
import { SlidePanel } from './SlidePanel';

interface TenantFormProps {
  tenant?: Tenant;
  onSubmit: (data: Partial<Tenant>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const tenantTypes: { value: TenantType; label: string }[] = [
  { value: 'primary', label: 'Primary Tenant' },
  { value: 'co_tenant', label: 'Co-Tenant' },
  { value: 'occupant', label: 'Occupant' },
  { value: 'guarantor', label: 'Guarantor' },
];

export function TenantForm({ tenant, onSubmit, onCancel, isSubmitting }: TenantFormProps) {
  const { currentBusiness } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  const [formData, setFormData] = useState({
    unit_id: tenant?.unit_id || '',
    tenant_type: tenant?.tenant_type || 'primary' as TenantType,
    first_name: tenant?.first_name || '',
    last_name: tenant?.last_name || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    employer: tenant?.employer || '',
    employer_phone: tenant?.employer_phone || '',
    monthly_income_cents: tenant?.monthly_income_cents ? (tenant.monthly_income_cents / 100).toString() : '',
    emergency_contact_name: tenant?.emergency_contact_name || '',
    emergency_contact_phone: tenant?.emergency_contact_phone || '',
    emergency_contact_relationship: tenant?.emergency_contact_relationship || '',
    move_in_date: tenant?.move_in_date || '',
    move_out_date: tenant?.move_out_date || '',
    security_deposit_paid_cents: tenant?.security_deposit_paid_cents ? (tenant.security_deposit_paid_cents / 100).toString() : '',
    has_portal_access: tenant?.has_portal_access ?? true,
    notes: tenant?.notes || '',
  });

  useEffect(() => {
    loadUnits();
  }, [currentBusiness?.id]);

  const loadUnits = async () => {
    if (!currentBusiness) {
      setIsLoadingUnits(false);
      return;
    }
    try {
      const data = await unitService.getAllUnits(currentBusiness.id);
      // When editing a tenant, show all units (they might want to move to an occupied unit for co-tenant situations)
      // When creating a new tenant, only show vacant units
      if (tenant) {
        // Editing mode: show all units
        setUnits(data);
      } else {
        // Create mode: only show vacant units
        setUnits(data.filter(u => u.occupancy_status === 'vacant'));
      }
    } catch (error) {
      console.error('Failed to load units:', error);
    } finally {
      setIsLoadingUnits(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.unit_id) {
      alert('Please select a unit');
      return;
    }

    const data: Partial<Tenant> = {
      unit_id: formData.unit_id,
      tenant_type: formData.tenant_type,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      employer: formData.employer || undefined,
      employer_phone: formData.employer_phone || undefined,
      monthly_income_cents: formData.monthly_income_cents ? Math.round(parseFloat(formData.monthly_income_cents) * 100) : undefined,
      emergency_contact_name: formData.emergency_contact_name || undefined,
      emergency_contact_phone: formData.emergency_contact_phone || undefined,
      emergency_contact_relationship: formData.emergency_contact_relationship || undefined,
      move_in_date: formData.move_in_date || undefined,
      move_out_date: formData.move_out_date || undefined,
      security_deposit_paid_cents: formData.security_deposit_paid_cents ? Math.round(parseFloat(formData.security_deposit_paid_cents) * 100) : undefined,
      has_portal_access: formData.has_portal_access,
      notes: formData.notes || undefined,
    };

    await onSubmit(data);
  };

  if (isLoadingUnits) {
    return (
      <SlidePanel
        isOpen={true}
        onClose={onCancel}
        title={tenant ? 'Edit Tenant' : 'Add Tenant'}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading units...</p>
        </div>
      </SlidePanel>
    );
  }

  // Only show "no units" error when creating a new tenant (not editing)
  if (units.length === 0 && !tenant) {
    return (
      <SlidePanel
        isOpen={true}
        onClose={onCancel}
        title="No Available Units"
        footer={
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        }
      >
        <div className="text-center py-8">
          <p className="text-gray-600">
            You need to have vacant units before adding tenants. Units are created within properties.
          </p>
        </div>
      </SlidePanel>
    );
  }

  return (
    <SlidePanel
      isOpen={true}
      onClose={onCancel}
      title={tenant ? 'Edit Tenant' : 'Add Tenant'}
      size="large"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="tenant-form"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : tenant ? 'Update Tenant' : 'Add Tenant'}
          </button>
        </div>
      }
    >
      <form id="tenant-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a unit...</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_number} - {unit.occupancy_status}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {tenant ? 'All units shown - select where to assign this tenant' : 'Only vacant units are shown'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tenant Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tenant_type}
                onChange={(e) => setFormData({ ...formData, tenant_type: e.target.value as TenantType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {tenantTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Move In Date
              </label>
              <input
                type="date"
                value={formData.move_in_date}
                onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Move Out Date
              </label>
              <input
                type="date"
                value={formData.move_out_date}
                onChange={(e) => setFormData({ ...formData, move_out_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Employment Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employer
              </label>
              <input
                type="text"
                value={formData.employer}
                onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employer Phone
              </label>
              <input
                type="tel"
                value={formData.employer_phone}
                onChange={(e) => setFormData({ ...formData, employer_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Income ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.monthly_income_cents}
                onChange={(e) => setFormData({ ...formData, monthly_income_cents: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security Deposit Paid ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.security_deposit_paid_cents}
                onChange={(e) => setFormData({ ...formData, security_deposit_paid_cents: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="0.00"
              />
            </div>

            <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Emergency Contact</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact Relationship
              </label>
              <input
                type="text"
                value={formData.emergency_contact_relationship}
                onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Parent, Spouse, Friend"
              />
            </div>

            <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_portal_access}
                  onChange={(e) => setFormData({ ...formData, has_portal_access: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Grant tenant portal access
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-6 mt-1">
                Allow tenant to view rent statements and submit maintenance requests online
              </p>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional information about this tenant"
              />
            </div>
          </div>

        </form>
    </SlidePanel>
  );
}
