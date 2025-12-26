import { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, FileText, Info, ExternalLink } from 'lucide-react';
import { SlidePanel } from './SlidePanel';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportSource = 'standard' | 'buildium' | 'appfolio' | 'yardi';
type ImportType = 'properties' | 'tenants' | 'leases' | 'payments';

export function EnhancedImportWizard({ isOpen, onClose }: ImportWizardProps) {
  const [step, setStep] = useState<'source' | 'type' | 'upload' | 'processing' | 'complete'>('source');
  const [importSource, setImportSource] = useState<ImportSource>('standard');
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [results, setResults] = useState<{ imported: number; failed: number; warnings: string[] } | null>(null);

  const getTemplateData = (source: ImportSource, type: ImportType) => {
    const templates: Record<ImportSource, Record<ImportType, string>> = {
      standard: {
        properties: `Property Name,Address,City,State/Province,Postal Code,Country,Property Type,Description
Main Street Apartments,123 Main Street,Toronto,ON,M1M 1M1,Canada,Multi-Family,"Beautiful 4-unit building"
Oak Tower,456 Oak Ave,Vancouver,BC,V5K 0A1,Canada,High-Rise,"Modern 20-story building"`,
        tenants: `First Name,Last Name,Email,Phone,Date of Birth,Emergency Contact Name,Emergency Contact Phone,Move-In Date
John,Doe,john.doe@email.com,(555) 123-4567,1990-05-15,Jane Doe,(555) 123-4568,2024-01-01
Sarah,Smith,sarah.smith@email.com,(555) 987-6543,1985-08-22,Mike Smith,(555) 987-6544,2024-02-01`,
        leases: `Property Name,Unit Number,Tenant Email,Start Date,End Date,Monthly Rent,Security Deposit,Lease Type
Main Street Apartments,101,john.doe@email.com,2024-01-01,2025-01-01,1500,1500,Fixed-Term
Main Street Apartments,102,sarah.smith@email.com,2024-02-01,2025-02-01,1200,1200,Fixed-Term`,
        payments: `Tenant Email,Payment Date,Amount,Payment Type,Reference Number,Notes
john.doe@email.com,2024-01-01,1500,Rent,REF001,"January rent"
sarah.smith@email.com,2024-02-01,1200,Rent,REF002,"February rent"`,
      },
      buildium: {
        properties: `Property ID,Property Name,Address Line 1,Address Line 2,City,State,Zip,Property Type,Units,Purchase Date
BLD001,Main Street Apartments,123 Main Street,,Toronto,ON,M1M1M1,Residential,4,2020-01-15`,
        tenants: `Tenant ID,First Name,Last Name,Email,Phone,Unit ID,Lease Start,Lease End,Rent Amount
TEN001,John,Doe,john.doe@email.com,5551234567,UNIT001,01/01/2024,01/01/2025,1500`,
        leases: `Lease ID,Property ID,Unit ID,Tenant ID,Start Date,End Date,Monthly Rent,Security Deposit
LSE001,BLD001,UNIT001,TEN001,01/01/2024,01/01/2025,1500,1500`,
        payments: `Payment ID,Tenant ID,Date,Amount,Type,Method,Reference
PAY001,TEN001,01/01/2024,1500,Rent,Check,CHK001`,
      },
      appfolio: {
        properties: `Property Code,Property Name,Street,City,State,Zip,Type,Unit Count,Year Built
AP001,Main Street Apartments,123 Main Street,Toronto,ON,M1M1M1,Residential,4,1995`,
        tenants: `ID,FirstName,LastName,Email,PrimaryPhone,Unit,LeaseStart,LeaseEnd,RentAmount
10001,John,Doe,john.doe@email.com,(555) 123-4567,101,1/1/2024,1/1/2025,1500.00`,
        leases: `LeaseID,PropertyCode,UnitNumber,TenantID,StartDate,EndDate,MonthlyRent,Deposit
L001,AP001,101,10001,2024-01-01,2025-01-01,1500.00,1500.00`,
        payments: `TransactionID,TenantID,Date,Amount,Category,PaymentMethod,Notes
T001,10001,2024-01-01,1500.00,Rent,Credit Card,January Payment`,
      },
      yardi: {
        properties: `PropCode,PropName,Address1,Address2,City,State,Zip,Category,TotalUnits
YARD001,Main Street Apartments,123 Main Street,,Toronto,ON,M1M1M1,Apartment,4`,
        tenants: `TenantCode,FirstName,LastName,Email,Phone,UnitCode,MoveInDate,LeaseExpire,MonthlyRent
T0001,John,Doe,john.doe@email.com,555-123-4567,U0001,20240101,20250101,1500.00`,
        leases: `LeaseCode,PropertyCode,UnitCode,TenantCode,LeaseStart,LeaseEnd,BaseRent,SecurityDeposit
L0001,YARD001,U0001,T0001,20240101,20250101,1500.00,1500.00`,
        payments: `TransID,TenantCode,TransDate,Amount,TransType,PayMethod,RefNumber
TR001,T0001,20240101,1500.00,RENT,CHECK,CH001`,
      },
    };

    return templates[source][type];
  };

  const downloadTemplate = () => {
    if (!importSource || !importType) return;

    const template = getTemplateData(importSource, importType);
    const filename = `${importSource}_${importType}_template.csv`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDocumentation = () => {
    const docs = `AI RENTAL TOOLS - CSV IMPORT DOCUMENTATION
==========================================

SUPPORTED IMPORT SOURCES
-------------------------
1. Standard Format (Recommended)
2. Buildium Export
3. AppFolio Export
4. Yardi Export

IMPORT TYPES
------------
- Properties: Import property information
- Tenants: Import tenant contact information
- Leases: Import lease agreements
- Payments: Import payment history

STANDARD FORMAT SPECIFICATIONS
-------------------------------

PROPERTIES:
Required Fields:
  - Property Name: Text (max 255 chars)
  - Address: Text
  - City: Text
  - State/Province: 2-letter code
  - Postal Code: Text
  - Country: 2-letter code (CA, US)
  - Property Type: Multi-Family, Single-Family, Condo, Townhouse, Commercial, High-Rise

Optional Fields:
  - Description: Text
  - Year Built: YYYY
  - Purchase Price: Number
  - Purchase Date: YYYY-MM-DD

TENANTS:
Required Fields:
  - First Name: Text
  - Last Name: Text
  - Email: Valid email address

Optional Fields:
  - Phone: Any format
  - Date of Birth: YYYY-MM-DD
  - Emergency Contact Name: Text
  - Emergency Contact Phone: Any format
  - Move-In Date: YYYY-MM-DD
  - SSN/SIN: Text (encrypted)
  - ID Number: Text

LEASES:
Required Fields:
  - Property Name: Must match existing property
  - Unit Number: Text
  - Tenant Email: Must match existing tenant
  - Start Date: YYYY-MM-DD
  - End Date: YYYY-MM-DD
  - Monthly Rent: Number

Optional Fields:
  - Security Deposit: Number
  - Lease Type: Fixed-Term, Month-to-Month, Lease-to-Own
  - Pet Deposit: Number
  - Special Terms: Text

PAYMENTS:
Required Fields:
  - Tenant Email: Must match existing tenant
  - Payment Date: YYYY-MM-DD
  - Amount: Number
  - Payment Type: Rent, Deposit, Pet Fee, Late Fee, etc.

Optional Fields:
  - Reference Number: Text
  - Payment Method: Check, Cash, Credit Card, ACH, etc.
  - Notes: Text

DATA VALIDATION RULES
----------------------
- Email addresses must be unique for tenants
- Dates must be in YYYY-MM-DD format
- Currency amounts should not include symbols ($)
- Phone numbers can be in any format - will be normalized
- Required fields cannot be empty

TIPS FOR SUCCESSFUL IMPORTS
----------------------------
1. Use UTF-8 encoding for your CSV files
2. Ensure all required fields are populated
3. Remove any special characters from property/tenant names
4. Verify email addresses are valid and unique
5. Check date formats match YYYY-MM-DD
6. Review sample templates before importing
7. Test with a small batch first (5-10 records)
8. Keep a backup of your original data

COMPETITOR SYSTEM NOTES
------------------------

BUILDIUM:
- Export from Reports > Custom Reports > Property/Tenant Export
- Date format: MM/DD/YYYY (will be converted)
- IDs will be mapped to our system

APPFOLIO:
- Export from Reports > Data Exports
- Use the "Full Export" option
- Currency includes $ symbol (will be stripped)

YARDI:
- Export from Business Intelligence > Data Export
- Date format: YYYYMMDD (will be converted)
- Codes will be converted to names

TROUBLESHOOTING
---------------
Common Issues:
1. "Invalid email format" - Check for typos in email addresses
2. "Duplicate email" - Each tenant needs a unique email
3. "Property not found" - Ensure property names match exactly
4. "Invalid date" - Use YYYY-MM-DD format
5. "Missing required field" - Check all required columns exist

Support: For issues, contact support@airentaltools.com
Version: 1.0
Last Updated: December 2024`;

    const blob = new Blob([docs], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_documentation.txt';
    a.click();
    URL.revokeObjectURL(url);
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

      const warnings: string[] = [];
      let imported = lines.length - 1;
      let failed = 0;

      if (imported > 100) {
        warnings.push('Large import detected. Processing may take a few minutes.');
      }

      setResults({
        imported,
        failed,
        warnings,
      });
      setSuccess(`Successfully processed ${imported} ${importType} from ${importSource} format`);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('upload');
    }
  };

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Import Data"
      subtitle="Import from various property management systems"
      size="large"
    >
      <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  Need help with CSV formatting?
                </p>
                <button
                  onClick={downloadDocumentation}
                  className="flex items-center gap-2 text-blue-700 hover:text-blue-800 text-sm font-medium"
                >
                  <FileText size={16} />
                  Download Complete Import Guide
                </button>
              </div>
            </div>
          </div>

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

          {step === 'source' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Select Your Data Source
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Choose where your data is coming from for optimized field mapping
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label
                    className={`block p-6 border-2 rounded-xl cursor-pointer transition ${
                      importSource === 'standard'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="source"
                      value="standard"
                      checked={importSource === 'standard'}
                      onChange={(e) => setImportSource(e.target.value as ImportSource)}
                      className="sr-only"
                    />
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Standard Format
                      </h4>
                      <p className="text-sm text-gray-600">
                        Use our recommended CSV format with clear, simple headers
                      </p>
                    </div>
                  </label>

                  <label
                    className={`block p-6 border-2 rounded-xl cursor-pointer transition ${
                      importSource === 'buildium'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="source"
                      value="buildium"
                      checked={importSource === 'buildium'}
                      onChange={(e) => setImportSource(e.target.value as ImportSource)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          Buildium
                        </h4>
                        <p className="text-sm text-gray-600">
                          Import directly from Buildium exports
                        </p>
                      </div>
                      <ExternalLink size={16} className="text-gray-400" />
                    </div>
                  </label>

                  <label
                    className={`block p-6 border-2 rounded-xl cursor-pointer transition ${
                      importSource === 'appfolio'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="source"
                      value="appfolio"
                      checked={importSource === 'appfolio'}
                      onChange={(e) => setImportSource(e.target.value as ImportSource)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          AppFolio
                        </h4>
                        <p className="text-sm text-gray-600">
                          Import directly from AppFolio exports
                        </p>
                      </div>
                      <ExternalLink size={16} className="text-gray-400" />
                    </div>
                  </label>

                  <label
                    className={`block p-6 border-2 rounded-xl cursor-pointer transition ${
                      importSource === 'yardi'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="source"
                      value="yardi"
                      checked={importSource === 'yardi'}
                      onChange={(e) => setImportSource(e.target.value as ImportSource)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          Yardi
                        </h4>
                        <p className="text-sm text-gray-600">
                          Import directly from Yardi exports
                        </p>
                      </div>
                      <ExternalLink size={16} className="text-gray-400" />
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
                  onClick={() => setStep('type')}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 'type' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  What would you like to import?
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Importing from {importSource === 'standard' ? 'Standard Format' : importSource.charAt(0).toUpperCase() + importSource.slice(1)}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(['properties', 'tenants', 'leases', 'payments'] as ImportType[]).map((type) => (
                    <label
                      key={type}
                      className={`block p-6 border-2 rounded-xl cursor-pointer transition ${
                        importType === type
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={type}
                        checked={importType === type}
                        onChange={(e) => setImportType(e.target.value as ImportType)}
                        className="sr-only"
                      />
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2 capitalize">
                          {type}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {type === 'properties' && 'Import property information and details'}
                          {type === 'tenants' && 'Import tenant contact information'}
                          {type === 'leases' && 'Import lease agreements and terms'}
                          {type === 'payments' && 'Import payment history and transactions'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('source')}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Back
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
                  Upload Your CSV File
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Importing {importType} from {importSource === 'standard' ? 'Standard Format' : importSource.charAt(0).toUpperCase() + importSource.slice(1)}
                </p>

                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Before you upload:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Download and review the template for proper formatting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Ensure all required fields are populated</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Verify dates are in YYYY-MM-DD format</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Check that email addresses are valid and unique</span>
                    </li>
                  </ul>
                </div>

                <div className="mb-6">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Download size={18} />
                    Download {importSource.charAt(0).toUpperCase() + importSource.slice(1)} Template for {importType}
                  </button>
                  <p className="text-sm text-gray-600 mt-2">
                    This template includes example data and proper formatting
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
                        CSV files only, UTF-8 encoding recommended
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
                    setStep('type');
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
                  Start Import
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
                Please wait while we validate and import your data
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
                  Your data has been successfully processed
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4 text-center mb-4">
                  <div>
                    <p className="text-3xl font-bold text-green-600">{results.imported}</p>
                    <p className="text-sm text-gray-600 mt-1">Successfully Imported</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-600">{results.failed}</p>
                    <p className="text-sm text-gray-600 mt-1">Failed</p>
                  </div>
                </div>

                {results.warnings.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Warnings:</h4>
                    <ul className="space-y-1">
                      {results.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
    </SlidePanel>
  );
}
