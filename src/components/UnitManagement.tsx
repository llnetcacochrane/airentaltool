import { useState, useEffect } from 'react';
import { Unit, OccupancyStatus } from '../types';
import { unitService } from '../services/unitService';
import { Plus, Edit2, Trash2, X, DoorClosed } from 'lucide-react';

interface UnitManagementProps {
  propertyId: string;
  organizationId: string;
}

export function UnitManagement({ propertyId, organizationId }: UnitManagementProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    unit_number: '',
    floor_number: '',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    monthly_rent_cents: '',
    security_deposit_cents: '',
    occupancy_status: 'vacant' as OccupancyStatus,
    notes: '',
  });

  useEffect(() => {
    loadUnits();
  }, [propertyId]);

  const loadUnits = async () => {
    setIsLoading(true);
    try {
      const data = await unitService.getUnitsByProperty(propertyId);
      setUnits(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load units');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      unit_number: '',
      floor_number: '',
      bedrooms: '',
      bathrooms: '',
      square_feet: '',
      monthly_rent_cents: '',
      security_deposit_cents: '',
      occupancy_status: 'vacant',
      notes: '',
    });
    setEditingUnit(null);
    setShowForm(false);
  };

  const handleEdit = (unit: Unit) => {
    setFormData({
      unit_number: unit.unit_number,
      floor_number: unit.floor_number?.toString() || '',
      bedrooms: unit.bedrooms?.toString() || '',
      bathrooms: unit.bathrooms?.toString() || '',
      square_feet: unit.square_feet?.toString() || '',
      monthly_rent_cents: unit.monthly_rent_cents ? (unit.monthly_rent_cents / 100).toString() : '',
      security_deposit_cents: unit.security_deposit_cents ? (unit.security_deposit_cents / 100).toString() : '',
      occupancy_status: unit.occupancy_status,
      notes: unit.notes || '',
    });
    setEditingUnit(unit);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = {
        unit_number: formData.unit_number,
        floor_number: formData.floor_number ? parseInt(formData.floor_number) : undefined,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : undefined,
        square_feet: formData.square_feet ? parseInt(formData.square_feet) : undefined,
        monthly_rent_cents: formData.monthly_rent_cents ? Math.round(parseFloat(formData.monthly_rent_cents) * 100) : undefined,
        security_deposit_cents: formData.security_deposit_cents ? Math.round(parseFloat(formData.security_deposit_cents) * 100) : undefined,
        occupancy_status: formData.occupancy_status,
        notes: formData.notes || undefined,
      };

      if (editingUnit) {
        await unitService.updateUnit(editingUnit.id, data);
      } else {
        await unitService.createUnit(organizationId, propertyId, data);
      }

      await loadUnits();
      resetForm();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save unit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) {
      return;
    }
    setDeletingId(id);
    try {
      await unitService.deleteUnit(id);
      await loadUnits();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete unit');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading units...</div>;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Units ({units.length})</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm"
        >
          <Plus size={16} />
          Add Unit
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-red-800 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <X size={16} />
          </button>
        </div>
      )}

      {units.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
          <DoorClosed className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No units added yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <Plus size={16} />
            Add First Unit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit) => (
            <div key={unit.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{unit.unit_number}</h4>
                  {unit.floor_number !== null && (
                    <p className="text-xs text-gray-500">Floor {unit.floor_number}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  unit.occupancy_status === 'occupied'
                    ? 'bg-red-100 text-red-800'
                    : unit.occupancy_status === 'vacant'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {unit.occupancy_status}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-600 mb-3">
                {unit.bedrooms !== null && unit.bathrooms !== null && (
                  <p>{unit.bedrooms} bed, {unit.bathrooms} bath</p>
                )}
                {unit.square_feet && <p>{unit.square_feet} sq ft</p>}
                {unit.monthly_rent_cents && (
                  <p className="font-semibold text-gray-900">
                    ${(unit.monthly_rent_cents / 100).toFixed(2)}/mo
                  </p>
                )}
              </div>

              {unit.notes && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{unit.notes}</p>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(unit)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-900 rounded hover:bg-gray-200 transition text-xs font-medium"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(unit.id)}
                  disabled={deletingId === unit.id}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition text-xs font-medium disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {deletingId === unit.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {editingUnit ? 'Edit Unit' : 'Add Unit'}
              </h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.unit_number}
                    onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="e.g., 101, A-12"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Occupancy Status
                  </label>
                  <select
                    value={formData.occupancy_status}
                    onChange={(e) => setFormData({ ...formData, occupancy_status: e.target.value as OccupancyStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Rent ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthly_rent_cents}
                    onChange={(e) => setFormData({ ...formData, monthly_rent_cents: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    min="0"
                    placeholder="0.00"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    min="0"
                    placeholder="0.00"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Any additional information about this unit"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingUnit ? 'Update Unit' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
