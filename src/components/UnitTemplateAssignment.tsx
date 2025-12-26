import { useState, useEffect } from 'react';
import { FileText, Check, X, Eye, Loader, AlertCircle } from 'lucide-react';
import { agreementService, AgreementTemplate } from '../services/agreementService';
import { agreementPlaceholderService } from '../services/agreementPlaceholderService';
import { useAuth } from '../context/AuthContext';

interface UnitTemplateAssignmentProps {
  unitId: string;
  unitNumber: string;
  propertyName?: string;
  onUpdate?: () => void;
  compact?: boolean;
}

export function UnitTemplateAssignment({
  unitId,
  unitNumber,
  propertyName,
  onUpdate,
  compact = false,
}: UnitTemplateAssignmentProps) {
  const { currentBusiness } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<AgreementTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  useEffect(() => {
    loadData();
  }, [unitId, currentBusiness?.id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load available templates
      const templatesData = await agreementService.getTemplates({
        business_id: currentBusiness?.id,
        is_active: true,
      });
      setTemplates(templatesData);

      // Load current assignment
      const current = await agreementService.getUnitDefaultTemplate(unitId);
      setCurrentTemplate(current);
      setSelectedTemplateId(current?.id || '');
    } catch (error) {
      console.error('Error loading template data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await agreementService.setUnitDefaultTemplate(
        unitId,
        selectedTemplateId || null
      );

      // Update current template display
      if (selectedTemplateId) {
        const template = templates.find((t) => t.id === selectedTemplateId);
        setCurrentTemplate(template || null);
      } else {
        setCurrentTemplate(null);
      }

      onUpdate?.();
    } catch (error) {
      console.error('Error saving template assignment:', error);
      alert('Failed to save template assignment');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const content = template.template_content || template.generated_text || '';
      const preview = agreementPlaceholderService.getPreviewWithSampleData(content);
      setPreviewContent(preview);
      setShowPreview(true);
    }
  };

  const hasChanges = selectedTemplateId !== (currentTemplate?.id || '');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="w-5 h-5 animate-spin text-blue-600" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <FileText className="w-4 h-4 text-gray-400" />
        <select
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">No template assigned</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.template_name}
            </option>
          ))}
        </select>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-medium text-gray-900">Agreement Template</h3>
            <p className="text-sm text-gray-500">
              Unit {unitNumber}
              {propertyName && ` - ${propertyName}`}
            </p>
          </div>
        </div>
        {currentTemplate && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            <Check className="w-3 h-3" />
            Template Assigned
          </span>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <AlertCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600 text-sm">No agreement templates available.</p>
          <p className="text-gray-500 text-xs mt-1">
            Create a template in the Agreements section first.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {/* No template option */}
            <label
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedTemplateId === ''
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="template"
                value=""
                checked={selectedTemplateId === ''}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-700">No template</p>
                <p className="text-sm text-gray-500">
                  Agreements will be created manually for this unit
                </p>
              </div>
            </label>

            {/* Template options */}
            {templates.map((template) => (
              <label
                key={template.id}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplateId === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  value={template.id}
                  checked={selectedTemplateId === template.id}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{template.template_name}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePreview(template.id);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      {template.agreement_type}
                    </span>
                    {template.default_rent_amount && (
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        ${(template.default_rent_amount / 100).toFixed(0)}/mo
                      </span>
                    )}
                    {template.default_lease_term_months && (
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {template.default_lease_term_months} months
                      </span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {hasChanges && (
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                onClick={() => setSelectedTemplateId(currentTemplate?.id || '')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Template Preview (Sample Data)</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="prose max-w-none whitespace-pre-wrap text-sm">
                {previewContent}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                This preview shows sample data. Actual values will be populated when issuing the agreement.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline badge showing template assignment status
 */
export function UnitTemplateBadge({ unitId }: { unitId: string }) {
  const [template, setTemplate] = useState<AgreementTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await agreementService.getUnitDefaultTemplate(unitId);
        setTemplate(data);
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [unitId]);

  if (loading) return null;

  if (!template) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
        <FileText className="w-3 h-3" />
        No template
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
      <FileText className="w-3 h-3" />
      {template.template_name}
    </span>
  );
}
