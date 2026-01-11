import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  Edit,
  Trash2,
  Copy,
  Star,
  Sparkles,
  Eye,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Save,
  Wand2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  applicationTemplateService,
  ApplicationTemplate,
  ApplicationFormSchema,
  ApplicationFormSection,
  ApplicationFormField,
  ApplicationType,
  DEFAULT_APPLICATION_SCHEMA,
} from '../services/applicationTemplateService';
import { PROPERTY_TYPE_OPTIONS } from '../types';
import { SlidePanel } from '../components/SlidePanel';

type ViewMode = 'list' | 'builder' | 'preview';

export default function ApplicationTemplates() {
  const { currentBusiness } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [templates, setTemplates] = useState<ApplicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ApplicationTemplate> | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ApplicationTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiOptions, setAiOptions] = useState({
    propertyType: PROPERTY_TYPE_OPTIONS[0].value, // Default to first option (single_family)
    targetTenants: 'general',
    specialRequirements: '',
  });

  useEffect(() => {
    if (currentBusiness?.id) {
      loadTemplates();
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      handleCreateNew();
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const loadTemplates = async () => {
    if (!currentBusiness?.id) return;
    try {
      setLoading(true);
      const data = await applicationTemplateService.getTemplates({
        business_id: currentBusiness.id,
      });
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate({
      business_id: currentBusiness?.id,
      template_name: '',
      description: '',
      application_type: 'standard',
      form_schema: DEFAULT_APPLICATION_SCHEMA,
      require_income_verification: true,
      require_employment_verification: true,
      require_rental_history: true,
      require_references: true,
      require_id_verification: false,
      require_credit_check_consent: true,
      require_background_check_consent: true,
      minimum_income_ratio: 3.0,
      custom_questions: [],
      is_active: true,
      is_default: false,
    });
    setViewMode('builder');
  };

  const handleEdit = (template: ApplicationTemplate) => {
    setEditingTemplate({ ...template });
    setViewMode('builder');
  };

  const handlePreview = (template: ApplicationTemplate) => {
    setPreviewTemplate(template);
    setViewMode('preview');
  };

  const handleSave = async () => {
    if (!editingTemplate || !currentBusiness?.id) return;

    try {
      setSaving(true);
      if (editingTemplate.id) {
        await applicationTemplateService.updateTemplate(editingTemplate.id, editingTemplate);
      } else {
        await applicationTemplateService.createTemplate({
          ...editingTemplate,
          business_id: currentBusiness.id,
        });
      }
      setViewMode('list');
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await applicationTemplateService.deleteTemplate(id);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await applicationTemplateService.duplicateTemplate(id);
      loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      alert('Failed to duplicate template');
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!currentBusiness?.id) return;
    try {
      await applicationTemplateService.setDefaultTemplate(id, currentBusiness.id);
      loadTemplates();
    } catch (error) {
      console.error('Error setting default:', error);
      alert('Failed to set as default');
    }
  };

  const handleGenerateWithAI = async () => {
    if (!currentBusiness?.id || !editingTemplate) return;

    try {
      setAiGenerating(true);
      const result = await applicationTemplateService.generateTemplateWithAI({
        businessId: currentBusiness.id,
        applicationType: editingTemplate.application_type as ApplicationType,
        propertyType: aiOptions.propertyType,
        targetTenants: aiOptions.targetTenants,
        specialRequirements: aiOptions.specialRequirements,
      });

      setEditingTemplate({
        ...editingTemplate,
        ...result.template,
      });
      setShowAIModal(false);
      alert(result.aiSuggestions || 'Template generated successfully!');
    } catch (error) {
      console.error('Error generating with AI:', error);
      alert('Failed to generate template with AI. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const updateFieldRequired = (sectionId: string, fieldId: string, required: boolean) => {
    if (!editingTemplate?.form_schema) return;

    const newSchema = JSON.parse(JSON.stringify(editingTemplate.form_schema)) as ApplicationFormSchema;
    const section = newSchema.sections.find(s => s.id === sectionId);
    if (section) {
      const field = section.fields.find(f => f.id === fieldId);
      if (field) {
        field.required = required;
      }
    }
    setEditingTemplate({ ...editingTemplate, form_schema: newSchema });
  };

  const updateFieldIncluded = (sectionId: string, fieldId: string, included: boolean) => {
    if (!editingTemplate?.form_schema) return;

    const newSchema = JSON.parse(JSON.stringify(editingTemplate.form_schema)) as ApplicationFormSchema;
    const section = newSchema.sections.find(s => s.id === sectionId);
    if (section) {
      const field = section.fields.find(f => f.id === fieldId);
      if (field) {
        field.included = included;
        // If field is excluded, it can't be required
        if (!included) {
          field.required = false;
        }
      }
    }
    setEditingTemplate({ ...editingTemplate, form_schema: newSchema });
  };

  const updateSectionIncluded = (sectionId: string, included: boolean) => {
    if (!editingTemplate?.form_schema) return;

    const newSchema = JSON.parse(JSON.stringify(editingTemplate.form_schema)) as ApplicationFormSchema;
    const section = newSchema.sections.find(s => s.id === sectionId);
    if (section) {
      section.included = included;
      // If section is excluded, all fields in it should also be marked as not required
      if (!included) {
        section.fields.forEach(field => {
          field.required = false;
        });
      }
    }
    setEditingTemplate({ ...editingTemplate, form_schema: newSchema });
  };

  const getApplicationTypeLabel = (type: ApplicationType): string => {
    const labels: Record<ApplicationType, string> = {
      standard: 'Standard Application',
      'short-term': 'Short-Term Rental',
      student: 'Student Housing',
      corporate: 'Corporate Housing',
      roommate: 'Roommate/Room Rental',
      'co-signer': 'Co-Signer Application',
    };
    return labels[type] || type;
  };

  const getApplicationTypeColor = (type: ApplicationType): string => {
    const colors: Record<ApplicationType, string> = {
      standard: 'bg-blue-100 text-blue-800',
      'short-term': 'bg-purple-100 text-purple-800',
      student: 'bg-green-100 text-green-800',
      corporate: 'bg-orange-100 text-orange-800',
      roommate: 'bg-pink-100 text-pink-800',
      'co-signer': 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // Template List View
  if (viewMode === 'list') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Application Templates</h1>
                <p className="text-sm sm:text-base text-gray-600">Create and manage rental application forms</p>
              </div>
            </div>
            <button
              onClick={handleCreateNew}
              className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Create Template</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <ClipboardList className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No application templates yet</h3>
            <p className="text-gray-600 mb-6">Create your first application template to start collecting tenant applications</p>
            <button
              onClick={handleCreateNew}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Your First Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white shadow rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {template.template_name}
                      </h3>
                      {template.is_default && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getApplicationTypeColor(template.application_type)}`}>
                      {getApplicationTypeLabel(template.application_type)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    {template.require_income_verification && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">Income</span>
                    )}
                    {template.require_employment_verification && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">Employment</span>
                    )}
                    {template.require_credit_check_consent && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">Credit</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Income Requirement:</span> {template.minimum_income_ratio}x rent
                  </div>
                  <div>
                    <span className="font-medium">Sections:</span> {template.form_schema?.sections?.length || 0}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handlePreview(template)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded hover:bg-blue-100 flex items-center justify-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDuplicate(template.id)}
                      className="bg-gray-50 text-gray-600 px-3 py-2 rounded hover:bg-gray-100"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {!template.is_default && (
                      <button
                        onClick={() => handleSetDefault(template.id)}
                        className="bg-yellow-50 text-yellow-600 px-3 py-2 rounded hover:bg-yellow-100"
                        title="Set as default"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="bg-red-50 text-red-600 px-3 py-2 rounded hover:bg-red-100"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Preview View
  if (viewMode === 'preview' && previewTemplate) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <button
            onClick={() => {
              setViewMode('list');
              setPreviewTemplate(null);
            }}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Templates
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{previewTemplate.template_name}</h1>
          <p className="text-gray-600">{previewTemplate.description}</p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-blue-600 text-white p-6">
            <h2 className="text-xl font-bold">Rental Application</h2>
            <p className="text-blue-100 text-sm mt-1">Please fill out all required fields</p>
          </div>

          <div className="p-6 space-y-8">
            {previewTemplate.form_schema?.sections?.map((section) => (
              <div key={section.id} className="border-b border-gray-200 pb-6 last:border-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h3>
                {section.description && (
                  <p className="text-sm text-gray-600 mb-4">{section.description}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {section.fields
                    .filter((field) => field.included !== false)
                    .map((field) => (
                      <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                            rows={3}
                            disabled
                            placeholder={field.placeholder}
                          />
                        ) : field.type === 'select' ? (
                          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" disabled>
                            <option>Select an option...</option>
                            {field.options?.map((opt) => (
                              <option key={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                            disabled
                            placeholder={field.placeholder}
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}

            {/* Custom Questions */}
            {previewTemplate.custom_questions && previewTemplate.custom_questions.filter(f => f.included !== false).length > 0 && (
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Questions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {previewTemplate.custom_questions
                    .filter((field) => field.included !== false)
                    .map((field) => (
                      <div key={field.id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                          disabled
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Consents */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Consent & Authorization</h3>
              {previewTemplate.require_credit_check_consent && (
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1" disabled />
                  <span className="text-sm text-gray-600">I authorize the landlord to conduct a credit check</span>
                </label>
              )}
              {previewTemplate.require_background_check_consent && (
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1" disabled />
                  <span className="text-sm text-gray-600">I authorize the landlord to conduct a background check</span>
                </label>
              )}
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" disabled />
                <span className="text-sm text-gray-600">I certify that all information provided is true and accurate</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Builder View
  if (viewMode === 'builder' && editingTemplate) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {editingTemplate.id ? 'Edit Template' : 'Create Application Template'}
              </h1>
              <p className="text-gray-600">Customize your rental application form</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAIModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                <span className="hidden sm:inline">Generate with AI</span>
                <span className="sm:hidden">AI</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('list');
                  setEditingTemplate(null);
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editingTemplate.template_name}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Basic Settings */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.template_name || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, template_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Standard Rental Application"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingTemplate.description || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                    placeholder="Describe this application template..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Type</label>
                  <select
                    value={editingTemplate.application_type || 'standard'}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, application_type: e.target.value as ApplicationType })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="standard">Standard Application</option>
                    <option value="short-term">Short-Term Rental</option>
                    <option value="student">Student Housing</option>
                    <option value="corporate">Corporate Housing</option>
                    <option value="roommate">Roommate/Room Rental</option>
                    <option value="co-signer">Co-Signer Application</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Income Ratio
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="10"
                      value={editingTemplate.minimum_income_ratio || 3}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, minimum_income_ratio: parseFloat(e.target.value) })}
                      className="w-24 border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <span className="text-gray-600">x monthly rent</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification Requirements</h2>
              <div className="space-y-3">
                {[
                  { key: 'require_income_verification', label: 'Income Verification' },
                  { key: 'require_employment_verification', label: 'Employment Verification' },
                  { key: 'require_rental_history', label: 'Rental History' },
                  { key: 'require_references', label: 'References' },
                  { key: 'require_id_verification', label: 'ID Verification' },
                  { key: 'require_credit_check_consent', label: 'Credit Check Consent' },
                  { key: 'require_background_check_consent', label: 'Background Check Consent' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={(editingTemplate as any)[item.key] || false}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, [item.key]: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Form Schema */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Form Sections & Fields</h2>
              <p className="text-sm text-gray-600 mb-4">
                Toggle required fields and customize what information you collect from applicants.
              </p>

              <div className="space-y-4">
                {editingTemplate.form_schema?.sections?.map((section) => (
                  <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className={`flex items-center justify-between p-4 ${section.included !== false ? 'bg-gray-50' : 'bg-gray-200'}`}>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="flex items-center gap-3 hover:bg-gray-100 transition-colors rounded px-2 py-1 -ml-2"
                      >
                        {expandedSections.has(section.id) ? (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                        <span className={`font-medium ${section.included !== false ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                          {section.title}
                        </span>
                        {section.included !== false && (
                          <span className="text-sm text-gray-500">
                            ({section.fields.filter(f => f.included !== false && f.required).length} required / {section.fields.filter(f => f.included !== false).length} included)
                          </span>
                        )}
                      </button>
                      <label
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-sm text-gray-600">Include Section</span>
                        <input
                          type="checkbox"
                          checked={section.included !== false}
                          onChange={(e) => updateSectionIncluded(section.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
                        />
                      </label>
                    </div>

                    {expandedSections.has(section.id) && (
                      <div className={`p-4 border-t border-gray-200 ${section.included === false ? 'opacity-50' : ''}`}>
                        {section.included === false && (
                          <p className="text-sm text-amber-600 mb-3 bg-amber-50 p-2 rounded">
                            This section is excluded from the application form
                          </p>
                        )}
                        {section.description && (
                          <p className="text-sm text-gray-600 mb-4">{section.description}</p>
                        )}
                        <div className="space-y-2">
                          {section.fields.map((field) => {
                            const isSectionIncluded = section.included !== false;
                            const isFieldIncluded = field.included !== false;
                            const isEffectivelyIncluded = isSectionIncluded && isFieldIncluded;
                            return (
                              <div
                                key={field.id}
                                className={`flex items-center justify-between py-2 px-3 rounded ${
                                  isEffectivelyIncluded ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${isEffectivelyIncluded ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                                    {field.label}
                                  </span>
                                  <span className="text-xs text-gray-400">({field.type})</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <label className={`flex items-center gap-2 ${!isSectionIncluded ? 'opacity-50' : ''}`}>
                                    <span className="text-xs text-gray-500">Included</span>
                                    <input
                                      type="checkbox"
                                      checked={isFieldIncluded}
                                      disabled={!isSectionIncluded}
                                      onChange={(e) => updateFieldIncluded(section.id, field.id, e.target.checked)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                  </label>
                                  <label className={`flex items-center gap-2 ${!isEffectivelyIncluded ? 'opacity-50' : ''}`}>
                                    <span className="text-xs text-gray-500">Required</span>
                                    <input
                                      type="checkbox"
                                      checked={field.required}
                                      disabled={!isEffectivelyIncluded}
                                      onChange={(e) => updateFieldRequired(section.id, field.id, e.target.checked)}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h2>
              <textarea
                value={editingTemplate.terms_and_conditions || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, terms_and_conditions: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={6}
                placeholder="Enter terms and conditions that applicants must agree to..."
              />
            </div>
          </div>
        </div>

        {/* AI Generation SlidePanel */}
        <SlidePanel
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          title="Generate with AI"
          subtitle="Tell us about your property and target tenants, and AI will customize the application template for you."
          size="small"
          footer={
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={() => setShowAIModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateWithAI}
                disabled={aiGenerating}
                className="w-full sm:w-auto bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {aiGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
              <select
                value={aiOptions.propertyType}
                onChange={(e) => setAiOptions({ ...aiOptions, propertyType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
              >
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Tenants</label>
              <select
                value={aiOptions.targetTenants}
                onChange={(e) => setAiOptions({ ...aiOptions, targetTenants: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
              >
                <option value="general">General / All Applicants</option>
                <option value="families">Families</option>
                <option value="professionals">Young Professionals</option>
                <option value="students">Students</option>
                <option value="seniors">Seniors</option>
                <option value="corporate">Corporate / Business</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Requirements (optional)
              </label>
              <textarea
                value={aiOptions.specialRequirements}
                onChange={(e) => setAiOptions({ ...aiOptions, specialRequirements: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base"
                rows={4}
                placeholder="e.g., Pet-friendly, no smoking, parking required, furnished..."
              />
            </div>
          </div>
        </SlidePanel>
      </div>
    );
  }

  return null;
}
