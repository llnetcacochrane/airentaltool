import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { ExportFormat } from '../services/dataExportService';

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  formats?: ExportFormat[];
  label?: string;
}

/**
 * ExportButton component - Dropdown button for exporting data
 */
export function ExportButton({
  onExport,
  disabled = false,
  variant = 'secondary',
  size = 'md',
  formats = ['csv', 'excel-csv', 'pdf', 'json'],
  label = 'Export',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      await onExport(format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300',
      ghost: 'text-gray-700 hover:bg-gray-100',
    };
    return variants[variant];
  };

  const getSizeClasses = () => {
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };
    return sizes[size];
  };

  const formatIcons: Record<ExportFormat, React.ElementType> = {
    csv: FileSpreadsheet,
    'excel-csv': FileSpreadsheet,
    pdf: FileText,
    json: File,
  };

  const formatLabels: Record<ExportFormat, string> = {
    csv: 'CSV',
    'excel-csv': 'Excel CSV',
    pdf: 'PDF',
    json: 'JSON',
  };

  return (
    <div className="relative inline-block">
      {/* Main button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className={`
          inline-flex items-center justify-center gap-2 font-semibold rounded-lg
          transition-all duration-200 ease-in-out
          disabled:opacity-50 disabled:cursor-not-allowed
          ${getVariantClasses()}
          ${getSizeClasses()}
        `}
      >
        <Download className="w-4 h-4" />
        <span>{isExporting ? 'Exporting...' : label}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-slideInDown">
            <div className="px-3 py-2 text-xs text-gray-500 font-semibold uppercase border-b border-gray-100">
              Export Format
            </div>

            {formats.map(format => {
              const Icon = formatIcons[format];
              return (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  disabled={isExporting}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span>{formatLabels[format]}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * QuickExportButton - Single format export button (no dropdown)
 */
interface QuickExportButtonProps {
  onExport: () => void;
  format: ExportFormat;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function QuickExportButton({
  onExport,
  format,
  disabled = false,
  variant = 'secondary',
  size = 'md',
}: QuickExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getVariantClasses = () => {
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300',
      ghost: 'text-gray-700 hover:bg-gray-100',
    };
    return variants[variant];
  };

  const getSizeClasses = () => {
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };
    return sizes[size];
  };

  const formatIcons: Record<ExportFormat, React.ElementType> = {
    csv: FileSpreadsheet,
    'excel-csv': FileSpreadsheet,
    pdf: FileText,
    json: File,
  };

  const formatLabels: Record<ExportFormat, string> = {
    csv: 'Export CSV',
    'excel-csv': 'Export Excel',
    pdf: 'Export PDF',
    json: 'Export JSON',
  };

  const Icon = formatIcons[format];

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold rounded-lg
        transition-all duration-200 ease-in-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantClasses()}
        ${getSizeClasses()}
      `}
    >
      <Icon className="w-4 h-4" />
      <span>{isExporting ? 'Exporting...' : formatLabels[format]}</span>
    </button>
  );
}
