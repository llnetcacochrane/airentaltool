import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Save, Eye, ArrowLeft, Loader } from 'lucide-react';
import { aiService } from '../services/aiService';
import { agreementService, AgreementTemplate } from '../services/agreementService';

interface AgreementBuilderProps {
  templateId?: string;
  onSave?: (template: AgreementTemplate) => void;
  onCancel?: () => void;
}

export function AgreementBuilder({ templateId, onSave, onCancel }: AgreementBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(false);
  const [template, setTemplate] = useState<Partial<AgreementTemplate>>({
    template_name: '',
    agreement_title: 'Residential Lease Agreement',
    agreement_type: 'lease',
    payment_frequency: 'monthly',
    content: {},
    is_active: true,
    is_default: false,
    version: 1,
  });

  const [formData, setFormData] = useState({
    propertyOwnerName: '',
    rentalAmount: '',
    paymentFrequency: 'monthly',
    leaseTermMonths: '12',
    securityDeposit: '',
    petPolicy: 'No pets allowed',
    houseRules: '',
    cancellationPolicy: '',
    damagePolicy: '',
    refundPolicy: '',
    utilitiesIncluded: [] as string[],
    amenities: [] as string[],
    parkingDetails: '',
    maxOccupants: '',
    propertyDescription: '',
    additionalTerms: '',
  });

  const [generatedText, setGeneratedText] = useState('');

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await agreementService.getTemplate(templateId!);
      setTemplate(data);
      setGeneratedText(data.generated_text || '');

      if (data.content) {
        setFormData({
          propertyOwnerName: data.content.propertyOwnerName || '',
          rentalAmount: data.default_rent_amount?.toString() || '',
          paymentFrequency: data.payment_frequency || 'monthly',
          leaseTermMonths: data.default_lease_term_months?.toString() || '12',
          securityDeposit: data.default_security_deposit?.toString() || '',
          petPolicy: data.pet_policy || 'No pets allowed',
          houseRules: data.house_rules || '',
          cancellationPolicy: data.cancellation_policy || '',
          damagePolicy: data.damage_policy || '',
          refundPolicy: data.refund_policy || '',
          utilitiesIncluded: data.utilities_included || [],
          amenities: data.amenities || [],
          parkingDetails: data.parking_details || '',
          maxOccupants: data.max_occupants?.toString() || '',
          propertyDescription: data.property_description || '',
          additionalTerms: data.content.additionalTerms || '',
        });
      }
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateWithAI = async () => {
    if (!formData.propertyOwnerName || !formData.rentalAmount) {
      alert('Please fill in at least property owner name and rental amount');
      return;
    }

    try {
      setGenerating(true);

      const prompt = `Generate a comprehensive residential lease agreement with the following details:

Property Owner: ${formData.propertyOwnerName}
Rental Amount: $${formData.rentalAmount} ${formData.paymentFrequency}
Lease Term: ${formData.leaseTermMonths} months
Security Deposit: $${formData.securityDeposit || '0'}
Pet Policy: ${formData.petPolicy}
House Rules: ${formData.houseRules || 'Standard residential rules'}
Cancellation Policy: ${formData.cancellationPolicy || 'Standard 30-day notice'}
Damage Policy: ${formData.damagePolicy || 'Tenant responsible for damages beyond normal wear and tear'}
Refund Policy: ${formData.refundPolicy || 'Security deposit refunded within 30 days after move-out inspection'}
Utilities Included: ${formData.utilitiesIncluded.join(', ') || 'None'}
Amenities: ${formData.amenities.join(', ') || 'None'}
Parking: ${formData.parkingDetails || 'Street parking available'}
Max Occupants: ${formData.maxOccupants || 'As per local regulations'}
Property Description: ${formData.propertyDescription || 'Residential property'}
Additional Terms: ${formData.additionalTerms || 'None'}

Please generate a professional, legally-sound lease agreement that includes:
1. Parties section
2. Property description
3. Lease term and rent details
4. Security deposit terms
5. Maintenance responsibilities
6. Rules and policies
7. Termination clauses
8. Signatures section

Format the agreement professionally with proper sections and legal language.`;

      const result = await aiService.generateText({
        prompt,
        context: 'lease_agreement',
        max_tokens: 3000,
      });

      setGeneratedText(result.text);
      setTemplate(prev => ({
        ...prev,
        generated_text: result.text,
        ai_prompt_used: prompt,
        ai_model_used: result.model || 'openai',
        ai_generated_at: new Date().toISOString(),
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

    if (!generatedText) {
      alert('Please generate agreement text first');
      return;
    }

    try {
      setLoading(true);

      const templateData: Partial<AgreementTemplate> = {
        ...template,
        content: formData,
        generated_text: generatedText,
        default_rent_amount: parseFloat(formData.rentalAmount) || 0,
        default_security_deposit: parseFloat(formData.securityDeposit) || 0,
        default_lease_term_months: parseInt(formData.leaseTermMonths) || 12,
        payment_frequency: formData.paymentFrequency as any,
        pet_policy: formData.petPolicy,
        house_rules: formData.houseRules,
        cancellation_policy: formData.cancellationPolicy,
        damage_policy: formData.damagePolicy,
        refund_policy: formData.refundPolicy,
        utilities_included: formData.utilitiesIncluded,
        amenities: formData.amenities,
        parking_details: formData.parkingDetails,
        max_occupants: parseInt(formData.maxOccupants) || undefined,
      };

      let saved: AgreementTemplate;
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
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Template'}
          </button>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-2">{template.agreement_title}</h1>
          <p className="text-center text-gray-600 mb-8">
            {template.agreement_type?.replace('-', ' ').toUpperCase()}
          </p>

          <div className="prose max-w-none whitespace-pre-wrap">
            {generatedText}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {templateId ? 'Edit Agreement Template' : 'Create Agreement Template'}
              </h1>
              <p className="text-gray-600">Use AI to generate a professional lease agreement</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  onChange={(e) => setTemplate(prev => ({ ...prev, template_name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Standard Residential Lease"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={template.description}
                  onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Brief description of this template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agreement Type
                </label>
                <select
                  value={template.agreement_type}
                  onChange={(e) => setTemplate(prev => ({ ...prev, agreement_type: e.target.value as any }))}
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
            <h2 className="text-lg font-semibold mb-4">Basic Terms</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Owner Name *
                </label>
                <input
                  type="text"
                  value={formData.propertyOwnerName}
                  onChange={(e) => handleInputChange('propertyOwnerName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rental Amount *
                  </label>
                  <input
                    type="number"
                    value={formData.rentalAmount}
                    onChange={(e) => handleInputChange('rentalAmount', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Frequency
                  </label>
                  <select
                    value={formData.paymentFrequency}
                    onChange={(e) => handleInputChange('paymentFrequency', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Term (months)
                  </label>
                  <input
                    type="number"
                    value={formData.leaseTermMonths}
                    onChange={(e) => handleInputChange('leaseTermMonths', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit
                  </label>
                  <input
                    type="number"
                    value={formData.securityDeposit}
                    onChange={(e) => handleInputChange('securityDeposit', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Policies & Rules</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Policy
                </label>
                <select
                  value={formData.petPolicy}
                  onChange={(e) => handleInputChange('petPolicy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="No pets allowed">No pets allowed</option>
                  <option value="Cats allowed with deposit">Cats allowed with deposit</option>
                  <option value="Dogs allowed with deposit">Dogs allowed with deposit</option>
                  <option value="Pets allowed with deposit">All pets allowed with deposit</option>
                  <option value="Pets allowed - no deposit">Pets allowed - no deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  House Rules
                </label>
                <textarea
                  value={formData.houseRules}
                  onChange={(e) => handleInputChange('houseRules', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Quiet hours 10pm-7am, No smoking indoors..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cancellation Policy
                </label>
                <textarea
                  value={formData.cancellationPolicy}
                  onChange={(e) => handleInputChange('cancellationPolicy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="30-day written notice required..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Occupants
                </label>
                <input
                  type="number"
                  value={formData.maxOccupants}
                  onChange={(e) => handleInputChange('maxOccupants', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="4"
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Property Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Description
                </label>
                <textarea
                  value={formData.propertyDescription}
                  onChange={(e) => handleInputChange('propertyDescription', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="3 bedroom, 2 bathroom house with garage..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parking Details
                </label>
                <input
                  type="text"
                  value={formData.parkingDetails}
                  onChange={(e) => handleInputChange('parkingDetails', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2-car garage, 2 driveway spaces"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Terms
                </label>
                <textarea
                  value={formData.additionalTerms}
                  onChange={(e) => handleInputChange('additionalTerms', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any additional terms or conditions..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Generated Agreement</h2>
              {generatedText && (
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

            {generatedText ? (
              <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {generatedText}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Click "Generate with AI" to create your agreement</p>
              </div>
            )}

            {generatedText && (
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
      </div>
    </div>
  );
}
