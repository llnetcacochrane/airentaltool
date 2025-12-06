import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { rentalApplicationService } from '../services/rentalApplicationService';
import { fileStorageService } from '../services/fileStorageService';
import { propertyService } from '../services/propertyService';
import { unitService } from '../services/unitService';
import { RentalApplication, Property, Unit } from '../types';
import { EmptyStatePresets } from '../components/EmptyState';
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Check,
  X,
  Eye,
  Star,
  AlertCircle,
  Loader,
  CheckCircle,
  FileText,
  Download,
} from 'lucide-react';

export function Applications() {
  const { session } = useAuth();
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
  });

  useEffect(() => {
    if (session?.current_organization_id) {
      loadApplications();
    }
  }, [session]);

  const loadApplications = async () => {
    if (!session?.current_organization_id) return;

    try {
      setLoading(true);
      const apps = await rentalApplicationService.getApplicationsByOrganization(session.current_organization_id);
      setApplications(apps);

      // Load property and unit details
      const propertyIds = [...new Set(apps.map((a) => a.property_id))];
      const unitIds = [...new Set(apps.map((a) => a.unit_id))];

      const [propertyData, unitData] = await Promise.all([
        Promise.all(propertyIds.map((id) => propertyService.getProperty(id))),
        Promise.all(unitIds.map((id) => unitService.getUnit(id))),
      ]);

      const propertyMap: Record<string, Property> = {};
      propertyData.forEach((p) => (propertyMap[p.id] = p));
      setProperties(propertyMap);

      const unitMap: Record<string, Unit> = {};
      unitData.forEach((u) => (unitMap[u.id] = u));
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
    // Pre-fill lease details based on listing
    setLeaseDetails({
      lease_start_date: app.responses.move_in_date || '',
      lease_end_date: '',
      monthly_rent_cents: 0, // Will need to get from listing
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const pendingApps = applications.filter((a) => a.status === 'submitted' || a.status === 'reviewing');
  const approvedApps = applications.filter((a) => a.status === 'approved');
  const rejectedApps = applications.filter((a) => a.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rental Applications</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Applications</p>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Pending Review</p>
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{pendingApps.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Approved</p>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{approvedApps.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Avg AI Score</p>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
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
                          <p className={`text-2xl font-bold ${getScoreColor(app.ai_score)}`}>{app.ai_score}</p>
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

      {/* Conversion Modal */}
      {showModal && selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Convert to Tenant</h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Applicant: {selectedApp.applicant_first_name} {selectedApp.applicant_last_name}
              </p>
              <p className="text-sm text-gray-600">Email: {selectedApp.applicant_email}</p>
            </div>

            <div className="space-y-4 mb-6">
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
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                This will create a tenant record and generate a portal invitation code. The applicant will receive an
                email with instructions to complete their signup.
              </p>
            </div>

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
          </div>
        </div>
      )}

      {pendingApps.length === 0 && applications.length === 0 && (
        EmptyStatePresets.Applications()
      )}

      {pendingApps.length === 0 && applications.length > 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Applications</h3>
          <p className="text-gray-600">New applications will appear here for review</p>
        </div>
      )}
    </div>
  );
}
