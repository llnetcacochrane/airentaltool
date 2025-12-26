import { useState, useEffect, useRef } from 'react';
import { FileText, Sparkles, Save, Eye, ArrowLeft, Loader } from 'lucide-react';
import { aiService } from '../services/aiService';
import { agreementService } from '../services/agreementService';
import { agreementPlaceholderService } from '../services/agreementPlaceholderService';
import { PlaceholderPicker, PlaceholderValidation } from './PlaceholderPicker';
import { useAuth } from '../context/AuthContext';

interface AgreementBuilderProps {
  templateId?: string;
  onSave?: (template: any) => void;
  onCancel?: () => void;
}

export function AgreementBuilder({ templateId, onSave, onCancel }: AgreementBuilderProps) {
  const { currentBusiness } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'placeholders' | 'sample'>('placeholders');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [template, setTemplate] = useState<{
    template_name: string;
    description: string;
    agreement_title: string;
    agreement_type: 'lease' | 'sublease' | 'month-to-month' | 'short-term';
    template_content: string;
    default_lease_term_months: number;
    default_rent_amount: number;
    default_security_deposit: number;
    payment_frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
    pet_policy: string;
    house_rules: string;
    cancellation_policy: string;
    damage_policy: string;
    refund_policy: string;
    parking_details: string;
    max_occupants: number | undefined;
    is_active: boolean;
    is_default: boolean;
  }>({
    template_name: '',
    description: '',
    agreement_title: 'Residential Lease Agreement',
    agreement_type: 'lease',
    template_content: '',
    default_lease_term_months: 12,
    default_rent_amount: 0,
    default_security_deposit: 0,
    payment_frequency: 'monthly',
    pet_policy: '',
    house_rules: '',
    cancellation_policy: '',
    damage_policy: '',
    refund_policy: '',
    parking_details: '',
    max_occupants: undefined,
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await agreementService.getTemplate(templateId!);
      setTemplate({
        template_name: data.template_name || '',
        description: data.description || '',
        agreement_title: data.agreement_title || 'Residential Lease Agreement',
        agreement_type: data.agreement_type || 'lease',
        template_content: data.template_content || data.generated_text || '',
        default_lease_term_months: data.default_lease_term_months || 12,
        default_rent_amount: data.default_rent_amount || 0,
        default_security_deposit: data.default_security_deposit || 0,
        payment_frequency: data.payment_frequency || 'monthly',
        pet_policy: data.pet_policy || '',
        house_rules: data.house_rules || '',
        cancellation_policy: data.cancellation_policy || '',
        damage_policy: data.damage_policy || '',
        refund_policy: data.refund_policy || '',
        parking_details: data.parking_details || '',
        max_occupants: data.max_occupants,
        is_active: data.is_active ?? true,
        is_default: data.is_default ?? false,
      });
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setTemplate((prev) => ({ ...prev, [field]: value }));
  };

  const insertPlaceholder = (placeholder: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = template.template_content;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + placeholder + after;

      setTemplate((prev) => ({ ...prev, template_content: newText }));

      // Set cursor position after inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  const handleGenerateWithAI = async () => {
    try {
      setGenerating(true);

      const prompt = `Generate a professional residential lease agreement template with placeholder variables.

IMPORTANT: Use these exact placeholder formats for dynamic content:
- {{LANDLORD_NAME}} - Landlord's full name
- {{LANDLORD_EMAIL}} - Landlord's email
- {{LANDLORD_PHONE}} - Landlord's phone
- {{BUSINESS_NAME}} - Business/company name
- {{TENANT_NAME}} - Tenant's full name
- {{TENANT_EMAIL}} - Tenant's email
- {{TENANT_PHONE}} - Tenant's phone
- {{PROPERTY_NAME}} - Property name
- {{PROPERTY_ADDRESS}} - Full property address
- {{UNIT_NUMBER}} - Unit number
- {{BEDROOMS}} - Number of bedrooms
- {{BATHROOMS}} - Number of bathrooms
- {{SQUARE_FEET}} - Square footage
- {{START_DATE}} - Lease start date
- {{END_DATE}} - Lease end date
- {{RENT_AMOUNT}} - Monthly rent amount
- {{SECURITY_DEPOSIT}} - Security deposit amount
- {{PAYMENT_FREQUENCY}} - Payment frequency
- {{PAYMENT_DUE_DAY}} - Day of month rent is due
- {{LATE_FEE_AMOUNT}} - Late fee amount
- {{LATE_FEE_GRACE_DAYS}} - Grace period for late fee
- {{PET_POLICY}} - Pet policy
- {{HOUSE_RULES}} - House rules
- {{PARKING_DETAILS}} - Parking information
- {{MAX_OCCUPANTS}} - Maximum occupants allowed
- {{CURRENT_DATE}} - Current date
- {{SIGNATURE_DEADLINE}} - Deadline for signing

Template Settings:
- Agreement Type: ${template.agreement_type}
- Payment Frequency: ${template.payment_frequency}
${template.pet_policy ? `- Pet Policy: ${template.pet_policy}` : ''}
${template.house_rules ? `- House Rules: ${template.house_rules}` : ''}
${template.parking_details ? `- Parking: ${template.parking_details}` : ''}

Generate a complete lease agreement that includes:
1. Title and parties section (using {{LANDLORD_NAME}}, {{TENANT_NAME}}, etc.)
2. Property description (using {{PROPERTY_ADDRESS}}, {{UNIT_NUMBER}}, etc.)
3. Lease term section (using {{START_DATE}}, {{END_DATE}}, etc.)
4. Rent and payment terms (using {{RENT_AMOUNT}}, {{PAYMENT_DUE_DAY}}, etc.)
5. Security deposit terms
6. Maintenance and repairs responsibilities
7. Rules and policies (using {{PET_POLICY}}, {{HOUSE_RULES}}, etc.)
8. Termination clauses
9. Signatures section with date placeholders

Format it professionally with clear section headers. Use the placeholders exactly as shown above.`;

      const result = await aiService.generateForFeature('document_generation', {
        prompt,
        systemPrompt:
          'You are a legal document expert. Generate professional lease agreement templates using the exact placeholder format provided. Ensure the document is comprehensive and legally sound.',
        max_tokens: 4000,
        temperature: 0.7,
      });

      setTemplate((prev) => ({
        ...prev,
        template_content: result.text,
      }));
    } catch (error: any) {
      console.error('Error generating agreement:', error);
      alert(error.message || 'Failed to generate agreement with AI');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!template.template_name) {
      alert('Please enter a template name');
      return;
    }

    if (!template.template_content) {
      alert('Please add template content');
      return;
    }

    // Validate placeholders
    const validation = agreementPlaceholderService.validateTemplatePlaceholders(
      template.template_content
    );
    if (!validation.valid) {
      const proceed = confirm(
        `Warning: Unknown placeholders found: ${validation.unknownPlaceholders.join(', ')}\n\nThese will not be replaced when generating agreements. Continue anyway?`
      );
      if (!proceed) return;
    }

    try {
      setLoading(true);

      const templateData: Partial<import('../services/agreementService').AgreementTemplate> = {
        ...template,
        business_id: currentBusiness?.id,
        default_rent_amount: template.default_rent_amount || undefined,
        default_security_deposit: template.default_security_deposit || undefined,
      };

      let saved;
      if (templateId) {
        saved = await agreementService.updateTemplate(templateId, templateData);
      } else {
        saved = await agreementService.createTemplate(templateData);
      }

      alert('Template saved successfully!');
      onSave?.(saved);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const getPreviewContent = () => {
    if (previewMode === 'sample') {
      return agreementPlaceholderService.getPreviewWithSampleData(template.template_content);
    }
    return template.template_content;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (preview) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setPreview(false)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Editor
          </button>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('placeholders')}
                className={`px-3 py-1 rounded text-sm ${
                  previewMode === 'placeholders'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Show Placeholders
              </button>
              <button
                onClick={() => setPreviewMode('sample')}
                className={`px-3 py-1 rounded text-sm ${
                  previewMode === 'sample'
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Sample Data
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-2">{template.agreement_title}</h1>
          <p className="text-center text-gray-600 mb-8">
            {template.agreement_type?.replace('-', ' ').toUpperCase()}
          </p>

          <div className="prose max-w-none whitespace-pre-wrap">
            {previewMode === 'placeholders' ? (
              <PreviewWithHighlightedPlaceholders content={template.template_content} />
            ) : (
              getPreviewContent()
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {templateId ? 'Edit Agreement Template' : 'Create Agreement Template'}
              </h1>
              <p className="text-gray-600">
                Create a reusable template with placeholders for dynamic content
              </p>
            </div>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-gray-600 hover:text-gray-800">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Settings */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Template Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={template.template_name}
                  onChange={(e) => handleInputChange('template_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Standard 12-Month Lease"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={template.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Brief description of this template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agreement Title
                </label>
                <input
                  type="text"
                  value={template.agreement_title}
                  onChange={(e) => handleInputChange('agreement_title', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Residential Lease Agreement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agreement Type
                </label>
                <select
                  value={template.agreement_type}
                  onChange={(e) => handleInputChange('agreement_type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lease">Lease Agreement</option>
                  <option value="month-to-month">Month-to-Month</option>
                  <option value="short-term">Short-Term Rental</option>
                  <option value="sublease">Sublease Agreement</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Default Terms</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Rent ($)
                  </label>
                  <input
                    type="number"
                    value={template.default_rent_amount || ''}
                    onChange={(e) =>
                      handleInputChange('default_rent_amount', parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit ($)
                  </label>
                  <input
                    type="number"
                    value={template.default_security_deposit || ''}
                    onChange={(e) =>
                      handleInputChange(
                        'default_security_deposit',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Term (months)
                  </label>
                  <input
                    type="number"
                    value={template.default_lease_term_months}
                    onChange={(e) =>
                      handleInputChange('default_lease_term_months', parseInt(e.target.value) || 12)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Frequency
                  </label>
                  <select
                    value={template.payment_frequency}
                    onChange={(e) => handleInputChange('payment_frequency', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pet Policy</label>
                <input
                  type="text"
                  value={template.pet_policy}
                  onChange={(e) => handleInputChange('pet_policy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="No pets allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">House Rules</label>
                <textarea
                  value={template.house_rules}
                  onChange={(e) => handleInputChange('house_rules', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Quiet hours 10pm-7am..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Occupants
                </label>
                <input
                  type="number"
                  value={template.max_occupants || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'max_occupants',
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="4"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Template Content */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Template Content</h2>
              {template.template_content && (
                <button
                  onClick={() => setPreview(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              )}
            </div>

            <button
              onClick={handleGenerateWithAI}
              disabled={generating}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
            >
              {generating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate with AI
                </>
              )}
            </button>

            <textarea
              ref={textareaRef}
              value={template.template_content}
              onChange={(e) => handleInputChange('template_content', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              rows={20}
              placeholder="Enter your agreement template here. Use placeholders like {{TENANT_NAME}} for dynamic content..."
            />

            <PlaceholderValidation template={template.template_content} />

            {template.template_content && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Placeholder Picker */}
        <div className="space-y-6">
          <PlaceholderPicker onInsert={insertPlaceholder} />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">How Placeholders Work</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                1. Click a placeholder to copy it, then paste into your template where you want the
                value to appear.
              </li>
              <li>
                2. When you issue an agreement to a tenant, placeholders will be automatically
                replaced with actual values.
              </li>
              <li>
                3. You can also use "Generate with AI" to create a template that already includes
                appropriate placeholders.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Preview component that highlights placeholders
 */
function PreviewWithHighlightedPlaceholders({ content }: { content: string }) {
  // Split content by placeholders and render with highlighting
  const parts = content.split(/(\{\{[A-Z_]+\}\})/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(/^\{\{[A-Z_]+\}\}$/)) {
          return (
            <span
              key={index}
              className="inline-block bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-mono text-sm mx-0.5"
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
