import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rentalApplicationService } from '../services/rentalApplicationService';
import { fileStorageService } from '../services/fileStorageService';
import { RentalListing, RentalApplicationForm as ApplicationFormType, DocumentType } from '../types';
import { Check, AlertCircle, ArrowLeft, Send, Upload, X, FileText } from 'lucide-react';

export function ApplicationForm() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<RentalListing | null>(null);
  const [formTemplate, setFormTemplate] = useState<ApplicationFormType | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Array<{ file: File; type: DocumentType }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadListing();
  }, [code]);

  const loadListing = async () => {
    if (!code) return;

    try {
      setLoading(true);
      const listingData = await rentalApplicationService.getListing(code);

      if (!listingData) {
        setError('Listing not found');
        return;
      }

      setListing(listingData);

      // Load form template if specified, otherwise use default
      if (listingData.application_form_id) {
        // Would load custom form here
        // For now, use default schema
      }

      // Create default form template with schema
      const defaultForm: ApplicationFormType = {
        id: 'default',
        organization_id: listingData.organization_id,
        name: 'Default Application',
        description: '',
        form_schema: {
          sections: [
            {
              title: 'Personal Information',
              fields: [
                { id: 'first_name', label: 'First Name', type: 'text', required: true },
                { id: 'last_name', label: 'Last Name', type: 'text', required: true },
                { id: 'email', label: 'Email Address', type: 'email', required: true },
                { id: 'phone', label: 'Phone Number', type: 'tel', required: true },
                { id: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
              ],
            },
            {
              title: 'Employment Information',
              fields: [
                { id: 'employer', label: 'Current Employer', type: 'text', required: true },
                { id: 'job_title', label: 'Job Title', type: 'text', required: true },
                { id: 'monthly_income', label: 'Monthly Gross Income ($)', type: 'number', required: true },
                { id: 'employment_length', label: 'Years at Current Job', type: 'number', required: true },
              ],
            },
            {
              title: 'Rental History',
              fields: [
                { id: 'current_address', label: 'Current Address', type: 'textarea', required: true },
                { id: 'current_landlord', label: 'Current Landlord Name', type: 'text', required: false },
                { id: 'current_landlord_phone', label: 'Current Landlord Phone', type: 'tel', required: false },
                { id: 'move_in_date', label: 'Desired Move-In Date', type: 'date', required: true },
              ],
            },
            {
              title: 'Additional Information',
              fields: [
                {
                  id: 'pets',
                  label: 'Do you have pets?',
                  type: 'select',
                  options: ['No', 'Yes - Dog', 'Yes - Cat', 'Yes - Other'],
                  required: true,
                },
                { id: 'occupants', label: 'Number of Occupants (including you)', type: 'number', required: true },
                {
                  id: 'references',
                  label: 'Personal References (Name, Relationship, Phone)',
                  type: 'textarea',
                  required: false,
                },
              ],
            },
          ],
        },
        is_template: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setFormTemplate(defaultForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validateForm = (): boolean => {
    if (!formTemplate) return false;

    for (const section of formTemplate.form_schema.sections) {
      for (const field of section.fields) {
        // Skip validation for excluded fields
        if (field.included === false) continue;

        if (field.required && !formData[field.id]) {
          setError(`Please fill in: ${field.label}`);
          return false;
        }
      }
    }

    return true;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, docType: DocumentType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = fileStorageService.validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setFiles((prev) => [...prev, { file, type: docType }]);
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !listing) return;

    setSubmitting(true);
    setError('');

    try {
      // Submit application first
      const application = await rentalApplicationService.submitApplication(listing.id, {
        applicant_email: formData.email,
        applicant_first_name: formData.first_name,
        applicant_last_name: formData.last_name,
        applicant_phone: formData.phone,
        responses: formData,
      });

      // Upload documents if any
      if (files.length > 0) {
        await fileStorageService.uploadMultipleDocuments(application.id, files);
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.id] || '';

    const baseClasses =
      'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            className={`${baseClasses} min-h-24`}
            required={field.required}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            className={baseClasses}
            required={field.required}
          >
            <option value="">Select...</option>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            className={baseClasses}
            required={field.required}
            step={field.type === 'number' ? '0.01' : undefined}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application form...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for applying! Your application has been received and is being reviewed. You'll be notified by
            email once a decision has been made.
          </p>
          <button
            onClick={() => navigate('/tenant-portal')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Learn About Tenant Portal
          </button>
        </div>
      </div>
    );
  }

  if (!listing || !formTemplate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Not Available</h2>
          <p className="text-gray-600">{error || 'Unable to load application form'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(`/apply/${code}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Listing
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Rental Application</h1>
            <p className="text-gray-600">{listing.title}</p>
            <p className="text-sm text-gray-500 mt-2">
              All fields marked with <span className="text-red-500">*</span> are required
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {formTemplate.form_schema.sections.map((section, sectionIdx) => (
              <div key={sectionIdx} className="border-b border-gray-200 pb-8 last:border-0">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">{section.title}</h2>
                <div className="grid gap-6">
                  {section.fields
                    .filter((field) => field.included !== false)
                    .map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderField(field)}
                      </div>
                    ))}
                </div>
              </div>
            ))}

            {/* Document Upload Section */}
            <div className="border-b border-gray-200 pb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Supporting Documents (Optional)</h2>
              <p className="text-sm text-gray-600 mb-6">
                Upload documents to strengthen your application (ID, pay stubs, references, etc.)
              </p>

              <div className="grid gap-4">
                {(['id', 'proof_of_income', 'reference_letter', 'other'] as DocumentType[]).map((docType) => (
                  <div key={docType} className="flex items-center gap-4">
                    <label className="flex-1 flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">
                        {fileStorageService.getDocumentTypeLabel(docType)}
                      </span>
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, docType)}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                      />
                    </label>
                  </div>
                ))}
              </div>

              {/* Uploaded Files List */}
              {files.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Uploaded Documents ({files.length})</h3>
                  <div className="space-y-2">
                    {files.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.file.name}</p>
                            <p className="text-xs text-gray-500">
                              {fileStorageService.getDocumentTypeLabel(item.type)} •{' '}
                              {fileStorageService.formatFileSize(item.file.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Submit Application
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center mt-4">
                By submitting this application, you agree to a background and credit check
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
