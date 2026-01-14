import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { vendorService } from '../../services/vendorService';
import { Vendor, VendorType } from '../../types';
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  X,
  AlertCircle,
  FileText,
  DollarSign,
  CheckCircle,
  Users,
} from 'lucide-react';

export function VendorList() {
  const { currentBusiness } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<VendorType | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadVendors();
  }, [currentBusiness?.id]);

  const loadVendors = async () => {
    if (!currentBusiness) return;
    setIsLoading(true);
    try {
      const data = await vendorService.getVendors(currentBusiness.id, {
        isActive: showInactive ? undefined : true,
      });
      setVendors(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentBusiness) {
      loadVendors();
    }
  }, [showInactive]);

  const handleDeleteVendor = async (vendorId: string) => {
    try {
      await vendorService.deactivateVendor(vendorId);
      await loadVendors();
      setShowDeleteConfirm(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate vendor');
    }
  };

  const handleToggleActive = async (vendorId: string, currentActive: boolean) => {
    try {
      await vendorService.updateVendor(vendorId, { is_active: !currentActive });
      await loadVendors();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor');
    }
  };

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      searchTerm === '' ||
      vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || vendor.vendor_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const vendorTypes: VendorType[] = [
    'contractor',
    'supplier',
    'utility',
    'government',
    'professional_service',
    'property_management',
    'insurance',
    'bank',
    'other',
  ];

  const getTypeLabel = (type: VendorType) => {
    const labels: Record<VendorType, string> = {
      contractor: 'Contractor',
      supplier: 'Supplier',
      utility: 'Utility',
      government: 'Government',
      professional_service: 'Professional Service',
      property_management: 'Property Management',
      insurance: 'Insurance',
      bank: 'Bank',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: VendorType) => {
    const colors: Record<VendorType, string> = {
      contractor: 'bg-blue-100 text-blue-800',
      supplier: 'bg-green-100 text-green-800',
      utility: 'bg-yellow-100 text-yellow-800',
      government: 'bg-red-100 text-red-800',
      professional_service: 'bg-purple-100 text-purple-800',
      property_management: 'bg-indigo-100 text-indigo-800',
      insurance: 'bg-cyan-100 text-cyan-800',
      bank: 'bg-emerald-100 text-emerald-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(cents / 100);
  };

  const getTotalYTD = () => {
    return vendors.reduce((sum, v) => sum + v.total_paid_ytd_cents, 0);
  };

  const get1099EligibleCount = () => {
    return vendors.filter((v) => v.is_1099_eligible).length;
  };

  const getT5018EligibleCount = () => {
    return vendors.filter((v) => v.is_t5018_eligible).length;
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading vendors...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vendors</h1>
              <p className="text-gray-600 mt-1">{filteredVendors.length} vendors</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Add Vendor</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as VendorType | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {vendorTypes.map((type) => (
                  <option key={type} value={type}>
                    {getTypeLabel(type)}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Show inactive
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Total Vendors</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">YTD Payments</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(getTotalYTD())}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-600">1099 Eligible</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{get1099EligibleCount()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">T5018 Eligible</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{getT5018EligibleCount()}</p>
          </div>
        </div>

        {/* Vendors Grid */}
        {filteredVendors.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vendors Found</h3>
            <p className="text-gray-600 mb-6">
              {vendors.length === 0
                ? 'Add your first vendor to start tracking payments.'
                : 'No vendors match your search criteria.'}
            </p>
            {vendors.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                Add Vendor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className={`bg-white rounded-lg shadow hover:shadow-md transition cursor-pointer ${!vendor.is_active ? 'opacity-60' : ''}`}
                onClick={() => setSelectedVendor(vendor)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{vendor.vendor_name}</h3>
                        {vendor.vendor_code && (
                          <p className="text-xs text-gray-500 font-mono">{vendor.vendor_code}</p>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(vendor.vendor_type)}`}>
                      {getTypeLabel(vendor.vendor_type)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {vendor.contact_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        {vendor.contact_name}
                      </div>
                    )}
                    {vendor.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {vendor.email}
                      </div>
                    )}
                    {vendor.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {vendor.phone}
                      </div>
                    )}
                    {vendor.city && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {vendor.city}, {vendor.state_province}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">YTD Payments</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(vendor.total_paid_ytd_cents)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {vendor.is_1099_eligible && (
                        <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded">
                          1099
                        </span>
                      )}
                      {vendor.is_t5018_eligible && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded">
                          T5018
                        </span>
                      )}
                      {!vendor.is_active && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-gray-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedVendor.vendor_name}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedVendor.vendor_type)}`}>
                      {getTypeLabel(selectedVendor.vendor_type)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Contact Info</h3>
                  <div className="space-y-2">
                    {selectedVendor.contact_name && (
                      <p className="text-gray-900">{selectedVendor.contact_name}</p>
                    )}
                    {selectedVendor.email && (
                      <p className="text-gray-600">{selectedVendor.email}</p>
                    )}
                    {selectedVendor.phone && (
                      <p className="text-gray-600">{selectedVendor.phone}</p>
                    )}
                    {selectedVendor.website && (
                      <a
                        href={selectedVendor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedVendor.website}
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Address</h3>
                  <div className="text-gray-600">
                    {selectedVendor.address_line1 && <p>{selectedVendor.address_line1}</p>}
                    {selectedVendor.address_line2 && <p>{selectedVendor.address_line2}</p>}
                    <p>
                      {selectedVendor.city}, {selectedVendor.state_province}{' '}
                      {selectedVendor.postal_code}
                    </p>
                    <p>{selectedVendor.country}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Payment Info</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Currency</span>
                      <span className="font-medium text-gray-900">
                        {selectedVendor.currency_code}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Terms</span>
                      <span className="font-medium text-gray-900">
                        {selectedVendor.payment_terms?.replace('_', ' ') || 'Net 30'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Tax Info</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">1099 Eligible</span>
                      {selectedVendor.is_1099_eligible ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">T5018 Eligible</span>
                      {selectedVendor.is_t5018_eligible ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">W-9 on File</span>
                      {selectedVendor.w9_on_file ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">YTD Payments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedVendor.total_paid_ytd_cents)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">All Time Payments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedVendor.total_paid_all_time_cents)}
                  </p>
                </div>
              </div>

              {selectedVendor.notes && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Notes</h3>
                  <p className="text-gray-600">{selectedVendor.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(selectedVendor.id);
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  Delete
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleToggleActive(selectedVendor.id, selectedVendor.is_active)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                  >
                    {selectedVendor.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setSelectedVendor(null)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Vendor?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this vendor? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteVendor(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Vendor</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Vendor creation form coming soon. You can add vendors when creating expenses.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
