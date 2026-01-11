import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { rentalApplicationService } from '../services/rentalApplicationService';
import { fileStorageService } from '../services/fileStorageService';
import { propertyService } from '../services/propertyService';
import { unitService } from '../services/unitService';
import { businessUserService } from '../services/businessUserService';
import { emailService } from '../services/emailService';
import { agreementService, AgreementTemplate } from '../services/agreementService';
import { RentalApplication, Property, Unit, BusinessUserMessage } from '../types';
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
  MessageSquare,
  Send,
} from 'lucide-react';

export function Applications() {
  const { currentBusiness, supabaseUser } = useAuth();
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

  // Messaging state
  const [showMessages, setShowMessages] = useState(false);
  const [messageApp, setMessageApp] = useState<RentalApplication | null>(null);
  const [messages, setMessages] = useState<BusinessUserMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Agreement template state for approval modal
  const [agreementTemplates, setAgreementTemplates] = useState<AgreementTemplate[]>([]);
  const [selectedAgreementTemplateId, setSelectedAgreementTemplateId] = useState<string>('');
  const [sendAgreementOnApproval, setSendAgreementOnApproval] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (currentBusiness?.id) {
      loadApplications();
      loadUnreadCounts();
    }
  }, [currentBusiness]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (showMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showMessages]);

  const loadUnreadCounts = async () => {
    if (!currentBusiness?.id) return;
    try {
      const counts = await businessUserService.getApplicationsWithMessageCounts(currentBusiness.id);
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Failed to load unread counts:', err);
    }
  };

  // Load agreement templates for the approval modal
  useEffect(() => {
    async function loadAgreementTemplates() {
      if (!currentBusiness?.id) return;
      setLoadingTemplates(true);
      try {
        const templates = await agreementService.getTemplates({
          business_id: currentBusiness.id,
          is_active: true,
        });
        setAgreementTemplates(templates);
      } catch (err) {
        console.error('Failed to load agreement templates:', err);
      } finally {
        setLoadingTemplates(false);
      }
    }
    loadAgreementTemplates();
  }, [currentBusiness?.id]);

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

  const handleApprove = async (app: RentalApplication) => {
    setSelectedApp(app);
    // Pre-fill lease details based on application data
    const desiredMoveIn = app.responses.move_in_date || '';
    setLeaseDetails({
      lease_start_date: desiredMoveIn,
      lease_end_date: '',
      monthly_rent_cents: 0, // Will need to get from listing
      move_in_date: desiredMoveIn, // Default to same as lease start
    });

    // Pre-select the unit's or property's default agreement template (cascade)
    const unit = units[app.unit_id];
    const property = properties[app.property_id];
    let defaultTemplateId = '';

    if (unit?.default_agreement_template_id) {
      defaultTemplateId = unit.default_agreement_template_id;
    } else if (property?.default_agreement_template_id) {
      defaultTemplateId = property.default_agreement_template_id;
    } else if (currentBusiness?.default_agreement_template_id) {
      defaultTemplateId = currentBusiness.default_agreement_template_id;
    }

    // Validate that the template still exists before selecting it
    const templateExists = defaultTemplateId && agreementTemplates.some(t => t.id === defaultTemplateId);
    setSelectedAgreementTemplateId(templateExists ? defaultTemplateId : '');

    setSendAgreementOnApproval(false);
    setShowModal(true);
  };

  const handleConvertToTenant = async () => {
    if (!selectedApp) return;

    setConverting(true);
    try {
      const result = await rentalApplicationService.approveAndConvertToTenant(
        selectedApp.id,
        leaseDetails,
        // Pass agreement options if a template is selected
        selectedAgreementTemplateId ? {
          sendAgreement: sendAgreementOnApproval,
          templateId: selectedAgreementTemplateId,
        } : undefined
      );

      let successMessage = `Success!\n\nTenant created: ${result.tenantId}\nInvitation Code: ${result.invitationCode}`;
      if (result.agreementId) {
        successMessage += `\n\nLease Agreement ${sendAgreementOnApproval ? 'sent' : 'created as draft'}: ${result.agreementId}`;
      }
      successMessage += '\n\nSend the invitation code to the tenant to complete their portal signup!';

      alert(successMessage);

      setShowModal(false);
      setSelectedAgreementTemplateId('');
      setSendAgreementOnApproval(false);
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

  const handleOpenMessages = async (app: RentalApplication) => {
    setMessageApp(app);
    setShowMessages(true);
    setLoadingMessages(true);
    try {
      const msgs = await businessUserService.getMessagesByApplication(app.id);
      setMessages(msgs);
      // Mark user messages as read
      await businessUserService.markApplicationMessagesRead(app.id, 'user');
      loadUnreadCounts();
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageApp || !newMessage.trim() || !currentBusiness?.id || !supabaseUser?.id) return;

    setSendingMessage(true);
    try {
      await businessUserService.sendApplicationMessage(
        currentBusiness.id,
        null, // No business_user_id for applicants without accounts
        messageApp.id,
        'manager',
        supabaseUser.id,
        newMessage.trim()
      );

      // Send email notification to applicant (fire and forget)
      const property = properties[messageApp.property_id];
      emailService.sendApplicantMessageNotification(
        messageApp.applicant_email,
        {
          applicantName: `${messageApp.applicant_first_name} ${messageApp.applicant_last_name}`,
          businessName: currentBusiness.business_name || 'Property Manager',
          propertyName: property?.name || 'your applied property',
          messagePreview: newMessage.trim(),
        }
      ).catch(err => console.error('Failed to send email notification:', err));

      setNewMessage('');
      // Reload messages
      const msgs = await businessUserService.getMessagesByApplication(messageApp.id);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
            {(() => {
              const appsWithScores = applications.filter((a) => a.ai_score);
              return appsWithScores.length > 0
                ? Math.round(
                    appsWithScores.reduce((sum, a) => sum + (a.ai_score || 0), 0) /
                      appsWithScores.length
                  )
                : 0;
            })()}
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
                      onClick={() => handleOpenMessages(app)}
                      className="relative flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <MessageSquare size={16} />
                      Message
                      {unreadCounts[app.id] > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {unreadCounts[app.id]}
                        </span>
                      )}
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
        onClose={() => {
          setShowModal(false);
          setSelectedAgreementTemplateId('');
          setSendAgreementOnApproval(false);
        }}
        title="Convert to Tenant"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedAgreementTemplateId('');
                setSendAgreementOnApproval(false);
              }}
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

            {/* Agreement Template Selection */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Lease Agreement</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agreement Template
                  </label>
                  <select
                    value={selectedAgreementTemplateId}
                    onChange={(e) => setSelectedAgreementTemplateId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={loadingTemplates}
                  >
                    <option value="">
                      {loadingTemplates ? 'Loading templates...' : 'No agreement (create manually later)'}
                    </option>
                    {agreementTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.template_name} ({template.agreement_type})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select a template to auto-generate a lease agreement
                  </p>
                </div>

                {selectedAgreementTemplateId && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="send-agreement"
                      checked={sendAgreementOnApproval}
                      onChange={(e) => setSendAgreementOnApproval(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="send-agreement" className="text-sm text-gray-700">
                      Send agreement to tenant immediately for signing
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                This will create a tenant record and generate a portal invitation code. The applicant will receive an
                email with instructions to complete their signup.
                {selectedAgreementTemplateId && (
                  <span className="block mt-2">
                    A lease agreement will be {sendAgreementOnApproval ? 'sent for signing' : 'created as a draft'} using the selected template.
                  </span>
                )}
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

      {/* Messages SlidePanel */}
      <SlidePanel
        isOpen={showMessages && !!messageApp}
        onClose={() => {
          setShowMessages(false);
          setMessageApp(null);
          setMessages([]);
          setNewMessage('');
        }}
        title={`Messages - ${messageApp?.applicant_first_name} ${messageApp?.applicant_last_name}`}
      >
        {messageApp && (
          <div className="flex flex-col h-full">
            {/* Applicant Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {messageApp.applicant_email}
              </p>
              {messageApp.applicant_phone && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Phone:</span> {messageApp.applicant_phone}
                </p>
              )}
              <p className="text-sm text-gray-600">
                <span className="font-medium">Property:</span> {properties[messageApp.property_id]?.name} - Unit {units[messageApp.unit_id]?.unit_number}
              </p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto mb-4 min-h-[300px] max-h-[400px] border border-gray-200 rounded-lg p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Send a message to the applicant</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'manager' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          msg.sender_type === 'manager'
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        {msg.subject && (
                          <p className={`text-xs font-medium mb-1 ${msg.sender_type === 'manager' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {msg.subject}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.sender_type === 'manager' ? 'text-blue-200' : 'text-gray-400'}`}>
                          {formatMessageTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {sendingMessage ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
