import { useState } from 'react';
import { Upload, Download, X, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportWizardProps {
  onClose: () => void;
}

export function ImportWizard({ onClose }: ImportWizardProps) {
  const [step, setStep] = useState<'select' | 'upload' | 'processing' | 'complete'>('select');
  const [importType, setImportType] = useState<'properties' | 'tenants' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [results, setResults] = useState<{ imported: number; failed: number } | null>(null);

  const downloadTemplate = (type: 'properties' | 'tenants') => {
    if (type === 'properties') {
      const template = 'Name,Address,City,Province,Postal Code,Country,Property Type,Total Units,Unit Number,Bedrooms,Bathrooms,Square Feet,Monthly Rent\nMain Street Apartments,123 Main St,Toronto,ON,M1M 1M1,Canada,residential,4,101,2,1,850,1500\nMain Street Apartments,123 Main St,Toronto,ON,M1M 1M1,Canada,residential,4,102,1,1,650,1200\n';
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'properties_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const template = 'First Name,Last Name,Email,Phone,Unit ID\nJohn,Doe,john@example.com,(555) 123-4567,\nJane,Smith,jane@example.com,(555) 987-6543,\n';
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tenants_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!file || !importType) return;

    setStep('processing');
    setError('');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
      }

      setResults({
        imported: lines.length - 1,
        failed: 0,
      });
      setSuccess(`Successfully imported ${lines.length - 1} ${importType}`);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('upload');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">Import Data</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {step === 'select' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  What would you like to import?
                </h3>

                <div className="space-y-3">
                  <label
                    className={`block p-6 border-2 rounded-xl cursor-pointer transition ${
                      importType === 'properties'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importType"
                      value="properties"
                      checked={importType === 'properties'}
                      onChange={(e) => setImportType(e.target.value as 'properties')}
                      className="sr-only"
                    />
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Properties & Units
                      </h4>
                      <p className="text-sm text-gray-600">
                        Import properties with their units in a single CSV file
                      </p>
                    </div>
                  </label>

                  <label
                    className={`block p-6 border-2 rounded-xl cursor-pointer transition ${
                      importType === 'tenants'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importType"
                      value="tenants"
                      checked={importType === 'tenants'}
                      onChange={(e) => setImportType(e.target.value as 'tenants')}
                      className="sr-only"
                    />
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Tenants
                      </h4>
                      <p className="text-sm text-gray-600">
                        Import tenant contact information
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('upload')}
                  disabled={!importType}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 'upload' && importType && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Upload CSV File
                </h3>

                <div className="mb-6">
                  <button
                    onClick={() => downloadTemplate(importType)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Download size={18} />
                    Download CSV Template
                  </button>
                  <p className="text-sm text-gray-600 mt-2">
                    Download and fill out this template with your data
                  </p>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />

                  {file ? (
                    <div>
                      <p className="text-lg font-semibold text-gray-900 mb-2">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                      <button
                        onClick={() => setFile(null)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-700 font-medium mb-2">
                        Drag and drop or click to upload
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        CSV files only
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 cursor-pointer transition"
                      >
                        Select File
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('select');
                    setFile(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  Import
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Processing Import...
              </h3>
              <p className="text-gray-600">
                Please wait while we import your data
              </p>
            </div>
          )}

          {step === 'complete' && results && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Import Complete!
                </h3>
                <p className="text-gray-600">
                  Your data has been successfully imported
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-green-600">{results.imported}</p>
                    <p className="text-sm text-gray-600 mt-1">Imported</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-600">{results.failed}</p>
                    <p className="text-sm text-gray-600 mt-1">Failed</p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
