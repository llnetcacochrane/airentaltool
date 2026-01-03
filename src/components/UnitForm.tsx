import { useState } from 'react';
import { Unit, OccupancyStatus } from '../types';
import { SlidePanel } from './SlidePanel';

interface UnitFormProps {
  unit?: Unit;
  propertyId: string;
  onSubmit: (data: Partial<Unit>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string;
}

const occupancyStatuses: { value: OccupancyStatus; label: string }[] = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'maintenance', label: 'Under Maintenance' },
];

export function UnitForm({ unit, propertyId, onSubmit, onCancel, isSubmitting, error }: UnitFormProps) {
  const [formData, setFormData] = useState({
    unit_number: unit?.unit_number || '',
    floor_number: unit?.floor_number?.toString() || '',
    bedrooms: unit?.bedrooms?.toString() || '',
    bathrooms: unit?.bathrooms?.toString() || '',
    square_feet: unit?.square_feet?.toString() || '',
    monthly_rent_cents: unit?.monthly_rent_cents ? (unit.monthly_rent_cents / 100).toString() : '',
    security_deposit_cents: unit?.security_deposit_cents ? (unit.security_deposit_cents / 100).toString() : '',
    occupancy_status: unit?.occupancy_status || 'vacant' as OccupancyStatus,
    notes: unit?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.unit_number.trim()) {
      return;
    }

    const data: Partial<Unit> = {
      property_id: propertyId,
      unit_number: formData.unit_number.trim(),
      floor_number: formData.floor_number ? parseInt(formData.floor_number) : undefined,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : undefined,
      square_feet: formData.square_feet ? parseInt(formData.square_feet) : undefined,
      monthly_rent_cents: formData.monthly_rent_cents ? Math.round(parseFloat(formData.monthly_rent_cents) * 100) : undefined,
      security_deposit_cents: formData.security_deposit_cents ? Math.round(parseFloat(formData.security_deposit_cents) * 100) : undefined,
      occupancy_status: formData.occupancy_status,
      notes: formData.notes || undefined,
    };

    await onSubmit(data);
  };

  return (
    <SlidePanel
      isOpen={true}
      onClose={onCancel}
      title={unit ? 'Edit Unit' : 'Add Unit'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Number *
            </label>
            <input
              type="text"
              value={formData.unit_number}
              onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 101, A, 1A"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Floor Number
            </label>
            <input
              type="number"
              value={formData.floor_number}
              onChange={(e) => setFormData({ ...formData, floor_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bedrooms
            </label>
            <input
              type="number"
              value={formData.bedrooms}
              onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="2"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bathrooms
            </label>
            <input
              type="number"
              step="0.5"
              value={formData.bathrooms}
              onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1.5"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Square Feet
            </label>
            <input
              type="number"
              value={formData.square_feet}
              onChange={(e) => setFormData({ ...formData, square_feet: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="850"
              min="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Rent ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.monthly_rent_cents}
              onChange={(e) => setFormData({ ...formData, monthly_rent_cents: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1500.00"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Security Deposit ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.security_deposit_cents}
              onChange={(e) => setFormData({ ...formData, security_deposit_cents: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1500.00"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Occupancy Status
          </label>
          <select
            value={formData.occupancy_status}
            onChange={(e) => setFormData({ ...formData, occupancy_status: e.target.value as OccupancyStatus })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {occupancyStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any additional notes about this unit..."
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : unit ? 'Update Unit' : 'Add Unit'}
          </button>
        </div>
      </form>
    </SlidePanel>
  );
}
