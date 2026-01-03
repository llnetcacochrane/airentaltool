import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rentalApplicationService } from '../services/rentalApplicationService';
import { fileStorageService } from '../services/fileStorageService';
import { propertyService } from '../services/propertyService';
import { unitService } from '../services/unitService';
import { RentalApplication, Property, Unit } from '../types';
import { EmptyStatePresets } from '../components/EmptyState';
import { SlidePanel } from '../components/SlidePanel';
import {
  Users,
  TrendingUp,
  Check,
  X,
  Eye,
  Star,
  AlertCircle,
  Loader,
  CheckCircle,
} from 'lucide-react';

export function Applications() {
  const { currentBusiness } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<RentalApplication[]>([]);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [units, setUnits] = useState<Record<string, Unit>>({});
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<RentalApplication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [converting, setConverting] = useState(false);
  const [leaseDetails, setLeaseDetails] = useState({
    lease_start_date: '',
    lease_end_date: '',
    monthly_rent_cents: 0,
    move_in_date: '',
  });

  // Create listing state
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [creatingListing, setCreatingListing] = useState(false);
  const [listingForm, setListingForm] = useState({
    property_id: '',
    unit_id: '',
    title: '',
    description: '',
    monthly_rent_cents: 0,
    security_deposit_cents: 0,
    available_date: '',
    lease_term_months: 12,
    amenities: [] as string[],
    pet_policy: '',
    parking_included: false,
    utilities_included: [] as string[],
    accept_applications: true,
    application_fee_cents: 0,
  });

  useEffect(() => {
    if (currentBusiness?.id) {
      loadApplications();
    }
  }, [currentBusiness]);

  // Handle create-listing action from query params
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create-listing') {
      setShowCreateListing(true);
      loadPropertiesAndUnits();
      // Remove the query param
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const loadPropertiesAndUnits = async () => {
    if (!currentBusiness?.id) return;

    try {
      setLoadingProperties(true);
      const [propsData, unitsData] = await Promise.all([
        propertyService.getPropertiesByBusiness(currentBusiness.id),
        unitService.getUnitsByBusiness(currentBusiness.id),
      ]);
      setAllProperties(propsData);
      setAllUnits(unitsData);
    } catch (error) {
      console.error('Failed to load properties/units:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const loadApplications = async () => {
    if (!currentBusiness?.id) return;

    try {
      setLoading(true);
      const apps = await rentalApplicationService.getApplicationsByOrganization(currentBusiness.id);
      setApplications(apps);

      // Load property and unit details
      const propertyIds = [...new Set(apps.map((a) => a.property_id))];
      const unitIds = [...new Set(apps.map((a) => a.unit_id))];

      const [propertyData, unitData] = await Promise.all([
        Promise.all(propertyIds.map((id) => propertyService.getProperty(id))),
        Promise.all(unitIds.map((id) => unitService.getUnit(id))),
      ]);

      const propertyMap: Record<string, Property> = {};
      propertyData.forEach((p) => {
        if (p) propertyMap[p.id] = p;
      });
      setProperties(propertyMap);

      const unitMap: Record<string, Unit> = {};
      unitData.forEach((u) => {
        if (u) unitMap[u.id] = u;
      });
      setUnits(unitMap);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'reviewing':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleViewDetails = async (app: RentalApplication) => {
    const documents = await fileStorageService.getApplicationDocuments(app.id);

    let detailsText = `Application Details:\n\n`;
    detailsText += `Name: ${app.applicant_first_name} ${app.applicant_last_name}\n`;
    detailsText += `Email: ${app.applicant_email}\n`;
    detailsText += `Phone: ${app.applicant_phone || 'N/A'}\n`;
    detailsText += `AI Score: ${app.ai_score || 'N/A'}/100\n\n`;

    detailsText += `Employment:\n`;
    detailsText += `- Employer: ${app.responses.employer || 'N/A'}\n`;
    detailsText += `- Job Title: ${app.responses.job_title || 'N/A'}\n`;
    detailsText += `- Monthly Income: $${Number(app.responses.monthly_income || 0).toLocaleString()}\n`;
    detailsText += `- Employment Length: ${app.responses.employment_length || 'N/A'} years\n\n`;

    detailsText += `Rental History:\n`;
    detailsText += `- Current Address: ${app.responses.current_address || 'N/A'}\n`;
    detailsText += `- Current Landlord: ${app.responses.current_landlord || 'N/A'}\n`;
    detailsText += `- Desired Move-In: ${app.responses.move_in_date || 'N/A'}\n\n`;

    detailsText += `Additional:\n`;
    detailsText += `- Pets: ${app.responses.pets || 'N/A'}\n`;
    detailsText += `- Occupants: ${app.responses.occupants || 'N/A'}\n`;
    detailsText += `- References: ${app.responses.references || 'None provided'}\n\n`;

    if (documents.length > 0) {
      detailsText += `Uploaded Documents (${documents.length}):\n`;
      documents.forEach(doc => {
        detailsText += `- ${fileStorageService.getDocumentTypeLabel(doc.document_type)}: ${doc.file_name}\n`;
      });
    } else {
      detailsText += `No documents uploaded\n`;
    }

    alert(detailsText);
  };

  const handleApprove = (app: RentalApplication) => {
    setSelectedApp(app);
    // Pre-fill lease details based on application data
    const desiredMoveIn = app.responses.move_in_date || '';
    setLeaseDetails({
      lease_start_date: desiredMoveIn,
      lease_end_date: '',
      monthly_rent_cents: 0, // Will need to get from listing
      move_in_date: desiredMoveIn, // Default to same as lease start
    });
    setShowModal(true);
  };

  const handleConvertToTenant = async () => {
    if (!selectedApp) return;

    setConverting(true);
    try {
      const result = await rentalApplicationService.approveAndConvertToTenant(selectedApp.id, leaseDetails);

      alert(
        `Success!\n\nTenant created: ${result.tenantId}\nInvitation Code: ${result.invitationCode}\n\nSend this code to the tenant to complete their portal signup!`
      );

      setShowModal(false);
      loadApplications();
    } catch (error) {
      alert('Failed to convert application: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setConverting(false);
    }
  };

  const handleReject = async (appId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    try {
      await rentalApplicationService.rejectApplication(appId, reason || undefined);
      loadApplications();
    } catch (error) {
      alert('Failed to reject application');
    }
  };

  const handleUpdateRating = async (appId: string, rating: number) => {
    try {
      await rentalApplicationService.updateApplication(appId, { landlord_rating: rating });
      loadApplications();
    } catch (error) {
      alert('Failed to update rating');
    }
  };

  const handleCreateListing = async () => {
    if (!currentBusiness?.id) return;

    if (!listingForm.property_id || !listingForm.unit_id) {
      alert('Please select a property and unit');
      return;
    }

    if (!listingForm.title || listingForm.monthly_rent_cents === 0) {
      alert('Please fill in the required fields (Title and Monthly Rent)');
      return;
    }

    try {
      setCreatingListing(true);
      await rentalApplicationService.createListing(currentBusiness.id, {
        ...listingForm,
        status: 'active',
      });
      alert('Listing created successfully!');
      setShowCreateListing(false);
      setListingForm({
        property_id: '',
        unit_id: '',
        title: '',
        description: '',
        monthly_rent_cents: 0,
        security_deposit_cents: 0,
        available_date: '',
        lease_term_months: 12,
        amenities: [],
        pet_policy: '',
        parking_included: false,
        utilities_included: [],
        accept_applications: true,
        application_fee_cents: 0,
      });
      loadApplications();
    } catch (error: any) {
      console.error('Failed to create listing:', error);
      alert(`Failed to create listing: ${error.message || 'Unknown error'}`);
    } finally {
      setCreatingListing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const pendingApps = applications.filter((a) => a.status === 'submitted' || a.status === 'reviewing');
  const approvedApps = applications.filter((a) => a.status === 'approved');
  const rejectedApps = applications.filter((a) => a.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rental Applications</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Applications</p>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{applications.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Pending Review</p>
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{pendingApps.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Approved</p>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{approvedApps.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Avg AI Score</p>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {applications.length > 0
              ? Math.round(
                  applications.filter((a) => a.ai_score).reduce((sum, a) => sum + (a.ai_score || 0), 0) /
                    applications.filter((a) => a.ai_score).length
                )
              : 0}
          </p>
        </div>
      </div>

      {/* Pending Applications */}
      {pendingApps.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Applications</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingApps.map((app) => {
              const property = properties[app.property_id];
              const unit = units[app.unit_id];

              return (
                <div key={app.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {app.applicant_first_name} {app.applicant_last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{app.applicant_email}</p>
                      {property && unit && (
                        <p className="text-sm text-gray-500 mt-1">
                          {property.name} - Unit {unit.unit_number}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {app.ai_score && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600">AI Score</p>
                          <p className={`text-xl sm:text-2xl font-bold ${getScoreColor(app.ai_score)}`}>{app.ai_score}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleUpdateRating(app.id, star)}
                            className="focus:outline-none"
                          >
                            <Star
                              size={20}
                              className={
                                app.landlord_rating && star <= app.landlord_rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Monthly Income</p>
                      <p className="font-semibold text-gray-900">
                        ${Number(app.responses.monthly_income || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Employer</p>
                      <p className="font-semibold text-gray-900">{app.responses.employer || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Employment Length</p>
                      <p className="font-semibold text-gray-900">{app.responses.employment_length || 0} years</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Desired Move-In</p>
                      <p className="font-semibold text-gray-900">
                        {app.responses.move_in_date
                          ? new Date(app.responses.move_in_date).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleViewDetails(app)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Eye size={16} />
                      View Details
                    </button>

                    <button
                      onClick={() => handleApprove(app)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Check size={16} />
                      Approve & Convert to Tenant
                    </button>

                    <button
                      onClick={() => handleReject(app.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversion SlidePanel */}
      <SlidePanel
        isOpen={showModal && !!selectedApp}
        onClose={() => setShowModal(false)}
        title="Convert to Tenant"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(false)}
              disabled={converting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConvertToTenant}
              disabled={converting || !leaseDetails.lease_start_date || !leaseDetails.lease_end_date}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {converting ? 'Converting...' : 'Convert to Tenant'}
            </button>
          </div>
        }
      >
        {selectedApp && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Applicant:</span> {selectedApp.applicant_first_name} {selectedApp.applicant_last_name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {selectedApp.applicant_email}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lease Start Date</label>
                <input
                  type="date"
                  value={leaseDetails.lease_start_date}
                  onChange={(e) => setLeaseDetails({ ...leaseDetails, lease_start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lease End Date</label>
                <input
                  type="date"
                  value={leaseDetails.lease_end_date}
                  onChange={(e) => setLeaseDetails({ ...leaseDetails, lease_end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent ($)</label>
                <input
                  type="number"
                  value={leaseDetails.monthly_rent_cents / 100}
                  onChange={(e) =>
                    setLeaseDetails({ ...leaseDetails, monthly_rent_cents: Math.round(Number(e.target.value) * 100) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Move-in Date</label>
                <input
                  type="date"
                  value={leaseDetails.move_in_date}
                  onChange={(e) => setLeaseDetails({ ...leaseDetails, move_in_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">When the tenant will physically move in (can differ from lease start)</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                This will create a tenant record and generate a portal invitation code. The applicant will receive an
                email with instructions to complete their signup.
              </p>
            </div>
          </div>
        )}
      </SlidePanel>

      {pendingApps.length === 0 && applications.length === 0 && (
        EmptyStatePresets.Applications()
      )}

      {pendingApps.length === 0 && applications.length > 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Applications</h3>
          <p className="text-gray-600">New applications will appear here for review</p>
        </div>
      )}

      {/* Create Listing Modal */}
      <SlidePanel
        isOpen={showCreateListing}
        onClose={() => setShowCreateListing(false)}
        title="Create Rental Listing"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              Create a listing to accept online applications for your vacant units. You'll receive a unique link to share with prospective tenants.
            </p>
          </div>

          {/* Property and Unit Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property *
              </label>
              <select
                value={listingForm.property_id}
                onChange={(e) => {
                  setListingForm({ ...listingForm, property_id: e.target.value, unit_id: '' });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loadingProperties}
              >
                <option value="">Select property...</option>
                {allProperties.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.name} - {prop.address_line1}, {prop.city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <select
                value={listingForm.unit_id}
                onChange={(e) => setListingForm({ ...listingForm, unit_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!listingForm.property_id || loadingProperties}
              >
                <option value="">Select unit...</option>
                {allUnits
                  .filter((unit) => unit.property_id === listingForm.property_id)
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Listing Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Listing Title *
            </label>
            <input
              type="text"
              value={listingForm.title}
              onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Spacious 2BR Downtown Apartment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={listingForm.description}
              onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Describe the property, amenities, and features..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Rent *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  value={listingForm.monthly_rent_cents / 100}
                  onChange={(e) =>
                    setListingForm({
                      ...listingForm,
                      monthly_rent_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                    })
                  }
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security Deposit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  value={listingForm.security_deposit_cents / 100}
                  onChange={(e) =>
                    setListingForm({
                      ...listingForm,
                      security_deposit_cents: Math.round(parseFloat(e.target.value || '0') * 100),
                    })
                  }
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Date
              </label>
              <input
                type="date"
                value={listingForm.available_date}
                onChange={(e) => setListingForm({ ...listingForm, available_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lease Term (months)
              </label>
              <input
                type="number"
                value={listingForm.lease_term_months}
                onChange={(e) =>
                  setListingForm({ ...listingForm, lease_term_months: parseInt(e.target.value) || 12 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pet Policy
            </label>
            <select
              value={listingForm.pet_policy}
              onChange={(e) => setListingForm({ ...listingForm, pet_policy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select policy...</option>
              <option value="no_pets">No Pets</option>
              <option value="cats_only">Cats Only</option>
              <option value="dogs_only">Dogs Only</option>
              <option value="cats_and_dogs">Cats and Dogs</option>
              <option value="negotiable">Negotiable</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="parking"
              checked={listingForm.parking_included}
              onChange={(e) =>
                setListingForm({ ...listingForm, parking_included: e.target.checked })
              }
              className="rounded"
            />
            <label htmlFor="parking" className="text-sm font-medium text-gray-700">
              Parking Included
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="accept-applications"
              checked={listingForm.accept_applications}
              onChange={(e) =>
                setListingForm({ ...listingForm, accept_applications: e.target.checked })
              }
              className="rounded"
            />
            <label htmlFor="accept-applications" className="text-sm font-medium text-gray-700">
              Accept Applications Immediately
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => setShowCreateListing(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={creatingListing}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateListing}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              disabled={creatingListing}
            >
              {creatingListing ? 'Creating...' : 'Create Listing'}
            </button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
