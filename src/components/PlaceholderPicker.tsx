import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Info } from 'lucide-react';
import {
  agreementPlaceholderService,
  PlaceholderDefinition,
} from '../services/agreementPlaceholderService';

interface PlaceholderPickerProps {
  onInsert?: (placeholder: string) => void;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  landlord: { label: 'Landlord / Business', icon: '🏢' },
  tenant: { label: 'Tenant', icon: '👤' },
  property: { label: 'Property', icon: '🏠' },
  lease: { label: 'Lease Terms', icon: '📄' },
  dates: { label: 'Dates', icon: '📅' },
};

export function PlaceholderPicker({ onInsert, compact = false }: PlaceholderPickerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['landlord', 'tenant', 'property', 'lease', 'dates'])
  );

  const placeholdersByCategory = agreementPlaceholderService.getPlaceholdersByCategory();

  const handleCopy = async (placeholder: PlaceholderDefinition) => {
    const syntax = agreementPlaceholderService.getPlaceholderSyntax(placeholder.key);

    try {
      await navigator.clipboard.writeText(syntax);
      setCopiedKey(placeholder.key);
      setTimeout(() => setCopiedKey(null), 2000);

      if (onInsert) {
        onInsert(syntax);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (compact) {
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">Available Placeholders</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {agreementPlaceholderService.getAvailablePlaceholders().map((p) => (
            <button
              key={p.key}
              onClick={() => handleCopy(p)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono hover:bg-blue-200 transition-colors"
              title={p.description}
            >
              {copiedKey === p.key ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {`{{${p.key}}}`}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Template Placeholders</h3>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Click a placeholder to copy it. Paste into your template where you want the value to
          appear.
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {Object.entries(placeholdersByCategory).map(([category, placeholders]) => (
          <div key={category} className="border-b border-gray-100 last:border-b-0">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>{CATEGORY_LABELS[category]?.icon || '📁'}</span>
                <span className="text-sm font-medium text-gray-700">
                  {CATEGORY_LABELS[category]?.label || category}
                </span>
                <span className="text-xs text-gray-500">({placeholders.length})</span>
              </div>
              {expandedCategories.has(category) ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {expandedCategories.has(category) && (
              <div className="divide-y divide-gray-50">
                {placeholders.map((placeholder) => (
                  <div
                    key={placeholder.key}
                    className="px-4 py-2 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-mono">
                            {`{{${placeholder.key}}}`}
                          </code>
                          <span className="text-sm text-gray-700">{placeholder.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{placeholder.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Example: <span className="italic">{placeholder.example}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy(placeholder)}
                        className={`ml-3 p-2 rounded-lg transition-colors ${
                          copiedKey === placeholder.key
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                        }`}
                        title={copiedKey === placeholder.key ? 'Copied!' : 'Click to copy'}
                      >
                        {copiedKey === placeholder.key ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Inline placeholder display for preview mode
 */
export function PlaceholderHighlight({ text }: { text: string }) {
  // Replace placeholders with styled spans
  const parts = text.split(/(\{\{[A-Z_]+\}\})/g);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.match(/^\{\{[A-Z_]+\}\}$/)) {
          return (
            <span
              key={index}
              className="inline-block bg-blue-100 text-blue-800 px-1 rounded font-mono text-sm mx-0.5"
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

/**
 * Placeholder validation status display
 */
export function PlaceholderValidation({ template }: { template: string }) {
  const validation = agreementPlaceholderService.validateTemplatePlaceholders(template);

  if (!template) return null;

  return (
    <div className="mt-2">
      {validation.valid ? (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <Check className="w-4 h-4" />
          <span>All {validation.usedPlaceholders.length} placeholders are valid</span>
        </div>
      ) : (
        <div className="text-red-600 text-sm">
          <p className="font-medium">Unknown placeholders found:</p>
          <ul className="list-disc list-inside mt-1">
            {validation.unknownPlaceholders.map((p) => (
              <li key={p} className="font-mono">
                {`{{${p}}}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
