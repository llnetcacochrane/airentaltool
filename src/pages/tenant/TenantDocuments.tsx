import { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { tenantPortalService, TenantDocument } from '../../services/tenantPortalService';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  File,
  FolderOpen,
  Search,
  ExternalLink,
} from 'lucide-react';

export function TenantDocuments() {
  const { tenantData } = useTenant();
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    if (tenantData) {
      loadDocuments();
    }
  }, [tenantData]);

  const loadDocuments = async () => {
    if (!tenantData) return;

    setIsLoading(true);
    try {
      const data = await tenantPortalService.getDocuments(tenantData.tenant_id, tenantData.unit_id);
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'lease':
        return <FileText className="w-6 h-6 text-blue-600" />;
      case 'agreement':
        return <FileText className="w-6 h-6 text-green-600" />;
      default:
        return <File className="w-6 h-6 text-gray-600" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      lease: 'Lease Agreement',
      agreement: 'Signed Agreement',
      id: 'Identification',
      proof_of_income: 'Proof of Income',
      reference_letter: 'Reference Letter',
      other: 'Other Document',
    };
    return labels[type] || type;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || doc.document_type === selectedType;
    return matchesSearch && matchesType;
  });

  const documentTypes = ['all', ...new Set(documents.map(d => d.document_type))];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-600 mt-1">Access your lease and other important documents</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {documentTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Documents' : getDocumentTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-12 text-center">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedType !== 'all'
                ? 'No documents match your search criteria.'
                : 'No documents have been shared with you yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {getDocumentIcon(doc.document_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{doc.file_name}</h3>
                    <p className="text-sm text-gray-500">{getDocumentTypeLabel(doc.document_type)}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                      <Calendar className="w-3 h-3" />
                      {formatDate(doc.uploaded_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  {doc.file_url && (
                    <>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </a>
                      <a
                        href={doc.file_url}
                        download={doc.file_name}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lease Information */}
        {tenantData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Lease Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500">Property</p>
                <p className="font-medium text-gray-900">{tenantData.property_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Unit</p>
                <p className="font-medium text-gray-900">{tenantData.unit_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lease Start</p>
                <p className="font-medium text-gray-900">
                  {tenantData.lease_start_date ? formatDate(tenantData.lease_start_date) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lease End</p>
                <p className="font-medium text-gray-900">
                  {tenantData.lease_end_date ? formatDate(tenantData.lease_end_date) : 'Month-to-Month'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-50 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Need a Copy of Your Documents?</h3>
              <p className="text-sm text-blue-700 mb-3">
                If you need additional copies of your lease agreement or other documents, please contact your property manager.
              </p>
              <a
                href="/my-rental/messages"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Contact Manager
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
