import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Plus, Send, CheckCircle, Clock, Eye, Edit, Trash2, Download } from 'lucide-react';
import { agreementService, AgreementTemplate, LeaseAgreement } from '../services/agreementService';
import { AgreementBuilder } from '../components/AgreementBuilder';
import { IssueAgreement } from '../components/IssueAgreement';
import { pdfGenerationService } from '../services/pdfGenerationService';
import { EmptyStatePresets } from '../components/EmptyState';

type ViewMode = 'templates' | 'issued' | 'pending' | 'builder' | 'issue';

export default function Agreements() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('templates');
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [issuedAgreements, setIssuedAgreements] = useState<LeaseAgreement[]>([]);
  const [pendingAgreements, setPendingAgreements] = useState<LeaseAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>();
  const [issueTemplateId, setIssueTemplateId] = useState<string | undefined>();

  useEffect(() => {
    loadData();
  }, [viewMode]);

  // Handle action query params (e.g., ?action=create)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      setViewMode('builder');
      // Remove the query param
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (viewMode === 'templates') {
        const data = await agreementService.getTemplates({ is_active: true });
        setTemplates(data);
      } else if (viewMode === 'issued') {
        const data = await agreementService.getExecutedAgreements();
        setIssuedAgreements(data);
      } else if (viewMode === 'pending') {
        const data = await agreementService.getPendingSignatures();
        setPendingAgreements(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingTemplateId(undefined);
    setViewMode('builder');
  };

  const handleEdit = (templateId: string) => {
    setEditingTemplateId(templateId);
    setViewMode('builder');
  };

  const handleSaveTemplate = () => {
    setViewMode('templates');
    setEditingTemplateId(undefined);
    loadData();
  };

  const handleCancelBuilder = () => {
    setViewMode('templates');
    setEditingTemplateId(undefined);
  };

  const handleIssueAgreement = (templateId?: string) => {
    setIssueTemplateId(templateId);
    setViewMode('issue');
  };

  const handleIssueComplete = () => {
    setViewMode('pending');
    setIssueTemplateId(undefined);
    loadData();
  };

  const handleCancelIssue = () => {
    setViewMode('templates');
    setIssueTemplateId(undefined);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await agreementService.deleteTemplate(id);
      loadData();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handleDownloadPDF = async (agreement: LeaseAgreement) => {
    try {
      await pdfGenerationService.generateAgreementPDF(agreement);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (viewMode === 'builder') {
    return (
      <AgreementBuilder
        templateId={editingTemplateId}
        onSave={handleSaveTemplate}
        onCancel={handleCancelBuilder}
      />
    );
  }

  if (viewMode === 'issue') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <IssueAgreement
          preselectedTemplateId={issueTemplateId}
          onComplete={handleIssueComplete}
          onCancel={handleCancelIssue}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Lease Agreements</h1>
              <p className="text-sm sm:text-base text-gray-600">Create templates and manage tenant agreements</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {viewMode === 'templates' && templates.length > 0 && (
              <button
                onClick={() => handleIssueAgreement()}
                className="bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Issue Agreement</span>
              </button>
            )}
            {viewMode === 'templates' && (
              <button
                onClick={handleCreateNew}
                className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Create Template</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 sm:gap-4 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setViewMode('templates')}
            className={`px-3 sm:px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
              viewMode === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setViewMode('pending')}
            className={`px-3 sm:px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
              viewMode === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Pending Signatures
          </button>
          <button
            onClick={() => setViewMode('issued')}
            className={`px-3 sm:px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
              viewMode === 'issued'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            Signed Agreements
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {viewMode === 'templates' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {templates.length === 0 ? (
                <div className="col-span-full">
                  {EmptyStatePresets.Agreements()}
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white shadow rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {template.template_name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {template.agreement_type}
                        </span>
                      </div>
                      {template.is_default && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4 text-sm text-gray-600">
                      {template.default_rent_amount && (
                        <div>Rent: {formatCurrency(template.default_rent_amount)} / {template.payment_frequency}</div>
                      )}
                      {template.default_lease_term_months && (
                        <div>Term: {template.default_lease_term_months} months</div>
                      )}
                      {template.default_security_deposit && (
                        <div>Deposit: {formatCurrency(template.default_security_deposit)}</div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleIssueAgreement(template.id)}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Use Template
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(template.id)}
                          className="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded hover:bg-blue-100 flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="bg-red-50 text-red-600 px-4 py-2 rounded hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {viewMode === 'pending' && (
            <div className="space-y-4">
              {pendingAgreements.length === 0 ? (
                <div className="text-center py-8 sm:py-12 bg-white rounded-lg shadow">
                  <Clock className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No pending signatures</h3>
                  <p className="text-sm sm:text-base text-gray-600 px-4">All agreements are signed or no agreements have been sent yet</p>
                </div>
              ) : (
                pendingAgreements.map((agreement) => (
                  <div
                    key={agreement.id}
                    className="bg-white shadow rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                          {agreement.agreement_title}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-4">
                          <div>
                            <span className="font-medium">Tenant:</span> {agreement.tenant_name}
                          </div>
                          <div>
                            <span className="font-medium">Property:</span> {agreement.property_address}
                          </div>
                          <div>
                            <span className="font-medium">Rent:</span> {formatCurrency(agreement.rent_amount)} / {agreement.payment_frequency}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span>{' '}
                            <span className={`px-2 py-1 rounded text-xs ${
                              agreement.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                              agreement.status === 'viewed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {agreement.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500">
                          {agreement.sent_at && (
                            <div>Sent: {formatDate(agreement.sent_at)}</div>
                          )}
                          {agreement.viewed_at && (
                            <div>Viewed: {formatDate(agreement.viewed_at)}</div>
                          )}
                          {agreement.signature_deadline && (
                            <div>Deadline: {formatDate(agreement.signature_deadline)}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="bg-blue-50 text-blue-600 px-3 sm:px-4 py-2 rounded hover:bg-blue-100 flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(agreement)}
                          className="bg-gray-50 text-gray-600 px-3 sm:px-4 py-2 rounded hover:bg-gray-100"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {viewMode === 'issued' && (
            <div className="space-y-4">
              {issuedAgreements.length === 0 ? (
                <div className="text-center py-8 sm:py-12 bg-white rounded-lg shadow">
                  <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No signed agreements yet</h3>
                  <p className="text-sm sm:text-base text-gray-600 px-4">Signed agreements will appear here</p>
                </div>
              ) : (
                issuedAgreements.map((agreement) => (
                  <div
                    key={agreement.id}
                    className="bg-white shadow rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                          {agreement.agreement_title}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-4">
                          <div>
                            <span className="font-medium">Tenant:</span> {agreement.tenant_name}
                          </div>
                          <div>
                            <span className="font-medium">Property:</span> {agreement.property_address}
                          </div>
                          <div>
                            <span className="font-medium">Rent:</span> {formatCurrency(agreement.rent_amount)}
                          </div>
                          <div>
                            <span className="font-medium">Term:</span> {formatDate(agreement.start_date)} - {formatDate(agreement.end_date)}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs">
                          {agreement.landlord_signed && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>Landlord Signed {formatDate(agreement.landlord_signed_at!)}</span>
                            </div>
                          )}
                          {agreement.tenant_signed && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>Tenant Signed {formatDate(agreement.tenant_signed_at!)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="bg-blue-50 text-blue-600 px-3 sm:px-4 py-2 rounded hover:bg-blue-100 flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(agreement)}
                          className="bg-gray-50 text-gray-600 px-3 sm:px-4 py-2 rounded hover:bg-gray-100"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
