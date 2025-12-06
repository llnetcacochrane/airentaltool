import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { propertyService } from '../services/propertyService';
import { Property } from '../types';
import { PropertyForm } from '../components/PropertyForm';
import { UnitManagement } from '../components/UnitManagement';
import { EmptyStatePresets } from '../components/EmptyState';
import { Plus, MapPin, Home, Edit2, Trash2, Bed, Bath, Maximize, Calendar, X, DoorClosed } from 'lucide-react';

export function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { currentBusiness } = useAuth();

  useEffect(() => {
    loadData();
  }, [currentBusiness?.id]);

  const loadData = async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const propertiesData = await propertyService.getBusinessProperties(currentBusiness.id);
      setProperties(propertiesData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProperty = async (data: Partial<Property>) => {
    if (!currentBusiness) return;
    setIsSubmitting(true);
    try {
      await propertyService.createProperty(currentBusiness.id, data);
      await loadData();
      setShowAddForm(false);
      setError('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add property';
      if (errorMsg.includes('LIMIT_REACHED')) {
        setError('You have reached the property limit for your package. Please upgrade to add more properties.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProperty = async (data: Partial<Property>) => {
    if (!editingProperty) return;
    setIsSubmitting(true);
    try {
      await propertyService.updateProperty(editingProperty.id, data);
      await loadData();
      setEditingProperty(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update property');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property? This will also delete all associated units and tenants. This action cannot be undone.')) {
      return;
    }
    setDeletingId(id);
    try {
      await propertyService.deleteProperty(id);
      await loadData();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete property');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading properties...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Properties</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">{properties.length} total properties</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
          >
            <Plus size={20} />
            Add Property
          </button>
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

        {properties.length === 0 ? (
          EmptyStatePresets.Properties(() => setShowAddForm(true))
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div key={property.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{property.name}</h3>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin size={14} />
                        {property.city}, {property.state}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      property.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {property.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{property.address_line1}</p>

                  {(property.bedrooms || property.bathrooms || property.square_feet) && (
                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                      {property.bedrooms && (
                        <div className="flex items-center gap-1">
                          <Bed size={16} />
                          <span>{property.bedrooms} bed</span>
                        </div>
                      )}
                      {property.bathrooms && (
                        <div className="flex items-center gap-1">
                          <Bath size={16} />
                          <span>{property.bathrooms} bath</span>
                        </div>
                      )}
                      {property.square_feet && (
                        <div className="flex items-center gap-1">
                          <Maximize size={16} />
                          <span>{property.square_feet} sq ft</span>
                        </div>
                      )}
                    </div>
                  )}

                  {property.year_built && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-4">
                      <Calendar size={14} />
                      Built in {property.year_built}
                    </p>
                  )}

                  {property.notes && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{property.notes}</p>
                  )}

                  <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setViewingProperty(property)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      <DoorClosed size={16} />
                      Manage Units
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingProperty(property)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                      >
                        <Edit2 size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(property.id)}
                        disabled={deletingId === property.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                        {deletingId === property.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showAddForm || editingProperty) && (
        <PropertyForm
          property={editingProperty || undefined}
          onSubmit={editingProperty ? handleUpdateProperty : handleAddProperty}
          onCancel={() => {
            setShowAddForm(false);
            setEditingProperty(null);
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {viewingProperty && currentBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-6xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{viewingProperty.name}</h2>
                <p className="text-sm text-gray-600">{viewingProperty.address_line1}</p>
              </div>
              <button
                onClick={() => setViewingProperty(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <UnitManagement
              propertyId={viewingProperty.id}
              organizationId={currentBusiness.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
