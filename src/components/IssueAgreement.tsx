import React, { useState, useEffect } from 'react';
import { FileText, Send, ArrowLeft, Check, Calendar, DollarSign, User, Home, Loader, AlertCircle } from 'lucide-react';
import { agreementService, AgreementTemplate, LeaseAgreement } from '../services/agreementService';
import { tenantService } from '../services/tenantService';
import { propertyService } from '../services/propertyService';
import { unitService } from '../services/unitService';
import { useAuth } from '../context/AuthContext';
import { Tenant, Property, Unit } from '../types';

interface IssueAgreementProps {
  onComplete?: () => void;
  onCancel?: () => void;
  preselectedTemplateId?: string;
  preselectedTenantId?: string;
}

type Step = 'template' | 'tenant' | 'details' | 'review';

export function IssueAgreement({ onComplete, onCancel, preselectedTemplateId, preselectedTenantId }: IssueAgreementProps) {
  const { currentOrganization, userProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('template');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Data
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  // Selections
  const [selectedTemplate, setSelectedTemplate] = useState<AgreementTemplate | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Agreement details
  const [agreementDetails, setAgreementDetails] = useState({
    startDate: '',
    endDate: '',
    rentAmount: '',
    securityDeposit: '',
    paymentDueDay: '1',
    lateFeeAmount: '',
    lateFeeGraceDays: '5',
    signatureDeadline: '',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setAgreementDetails(prev => ({
        ...prev,
        rentAmount: selectedTemplate.default_rent_amount?.toString() || '',
        securityDeposit: selectedTemplate.default_security_deposit?.toString() || '',
      }));
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedProperty) {
      loadUnitsForProperty(selectedProperty.id);
    }
  }, [selectedProperty]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [templatesData, tenantsData, propertiesData] = await Promise.all([
        agreementService.getTemplates({ is_active: true }),
        tenantService.getAllUserTenants(),
        propertyService.getAllUserProperties(),
      ]);

      setTemplates(templatesData);
      setTenants(tenantsData);
      setProperties(propertiesData);

      // Handle preselection
      if (preselectedTemplateId) {
        const template = templatesData.find(t => t.id === preselectedTemplateId);
        if (template) {
          setSelectedTemplate(template);
          setCurrentStep('tenant');
        }
      }

      if (preselectedTenantId) {
        const tenant = tenantsData.find(t => t.id === preselectedTenantId);
        if (tenant) {
          setSelectedTenant(tenant);
          // Load tenant's unit and property
          if (tenant.unit_id) {
            const unit = await unitService.getUnit(tenant.unit_id);
            if (unit) {
              setSelectedUnit(unit);
              const property = propertiesData.find(p => p.id === unit.property_id);
              if (property) {
                setSelectedProperty(property);
                await loadUnitsForProperty(property.id);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUnitsForProperty = async (propertyId: string) => {
    try {
      const unitsData = await unitService.getUnitsByProperty(propertyId);
      setUnits(unitsData);
    } catch (err) {
      console.error('Error loading units:', err);
    }
  };

  const handleSelectTemplate = (template: AgreementTemplate) => {
    setSelectedTemplate(template);
    setCurrentStep('tenant');
  };

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    // Auto-select property and unit if tenant has them
    if (tenant.unit_id) {
      const unit = units.find(u => u.id === tenant.unit_id);
      if (unit) {
        setSelectedUnit(unit);
        const property = properties.find(p => p.id === unit.property_id);
        if (property) setSelectedProperty(property);
      }
    }
    setCurrentStep('details');
  };

  const handleDetailsSubmit = () => {
    if (!agreementDetails.startDate || !agreementDetails.endDate || !agreementDetails.rentAmount) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setCurrentStep('review');
  };

  const handleSendAgreement = async () => {
    if (!selectedTemplate || !selectedTenant || !selectedProperty || !selectedUnit) {
      setError('Missing required selections');
      return;
    }

    try {
      setSending(true);
      setError('');

      const landlordName = userProfile?.first_name && userProfile?.last_name
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : currentOrganization?.name || 'Property Manager';

      // Create the agreement
      const agreement = await agreementService.createAgreement({
        template_id: selectedTemplate.id,
        tenant_id: selectedTenant.id,
        unit_id: selectedUnit.id,
        property_id: selectedProperty.id,
        landlord_name: landlordName,
        landlord_email: userProfile?.email || '',
        landlord_phone: userProfile?.phone || '',
        tenant_name: `${selectedTenant.first_name} ${selectedTenant.last_name}`,
        tenant_email: selectedTenant.email,
        tenant_phone: selectedTenant.phone || '',
        agreement_title: selectedTemplate.agreement_title,
        agreement_type: selectedTemplate.agreement_type,
        content: selectedTemplate.content,
        generated_text: selectedTemplate.generated_text || '',
        start_date: agreementDetails.startDate,
        end_date: agreementDetails.endDate,
        rent_amount: parseFloat(agreementDetails.rentAmount),
        security_deposit: parseFloat(agreementDetails.securityDeposit || '0'),
        payment_frequency: selectedTemplate.payment_frequency,
        payment_due_day: parseInt(agreementDetails.paymentDueDay),
        late_fee_amount: parseFloat(agreementDetails.lateFeeAmount || '0'),
        late_fee_grace_days: parseInt(agreementDetails.lateFeeGraceDays || '5'),
        property_address: `${selectedProperty.address}, ${selectedProperty.city}, ${selectedProperty.state} ${selectedProperty.zip_code}`,
        property_description: selectedUnit.unit_number ? `Unit ${selectedUnit.unit_number}` : undefined,
        status: 'draft',
        requires_signature: true,
        signature_deadline: agreementDetails.signatureDeadline || undefined,
        reminder_count: 0,
      });

      // Send the agreement
      await agreementService.sendAgreement(agreement.id);

      onComplete?.();
    } catch (err: any) {
      console.error('Error sending agreement:', err);
      setError(err.message || 'Failed to send agreement');
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStepNumber = (step: Step) => {
    const steps: Step[] = ['template', 'tenant', 'details', 'review'];
    return steps.indexOf(step) + 1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          {onCancel && (
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Issue Agreement</h1>
              <p className="text-gray-600">Create and send a lease agreement to a tenant</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {(['template', 'tenant', 'details', 'review'] as Step[]).map((step, index) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-2 ${getStepNumber(currentStep) >= index + 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  getStepNumber(currentStep) > index + 1 ? 'bg-blue-600 text-white' :
                  getStepNumber(currentStep) === index + 1 ? 'border-2 border-blue-600 text-blue-600' :
                  'border-2 border-gray-300 text-gray-400'
                }`}>
                  {getStepNumber(currentStep) > index + 1 ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className="text-sm font-medium capitalize hidden sm:inline">{step}</span>
              </div>
              {index < 3 && <div className={`flex-1 h-0.5 ${getStepNumber(currentStep) > index + 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Step: Select Template */}
      {currentStep === 'template' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Select a Template</h2>

          {templates.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">No templates available</p>
              <p className="text-sm text-gray-500">Create an agreement template first in the Templates tab</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`text-left p-4 border-2 rounded-lg transition hover:border-blue-300 ${
                    selectedTemplate?.id === template.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900">{template.template_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{template.description || 'No description'}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-100 rounded">{template.agreement_type}</span>
                    {template.default_rent_amount && (
                      <span>{formatCurrency(template.default_rent_amount)}/{template.payment_frequency}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Select Tenant */}
      {currentStep === 'tenant' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Select a Tenant</h2>
            <button
              onClick={() => setCurrentStep('template')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Back
            </button>
          </div>

          {tenants.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <User className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">No active tenants</p>
              <p className="text-sm text-gray-500">Add tenants first before issuing agreements</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleSelectTenant(tenant)}
                  className={`w-full text-left p-4 border-2 rounded-lg transition hover:border-blue-300 flex items-center gap-4 ${
                    selectedTenant?.id === tenant.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{tenant.first_name} {tenant.last_name}</h3>
                    <p className="text-sm text-gray-600">{tenant.email}</p>
                  </div>
                  {tenant.status && (
                    <span className={`px-2 py-1 text-xs rounded ${
                      tenant.status === 'active' ? 'bg-green-100 text-green-700' :
                      tenant.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {tenant.status}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Agreement Details */}
      {currentStep === 'details' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Agreement Details</h2>
            <button
              onClick={() => setCurrentStep('tenant')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Back
            </button>
          </div>

          <div className="bg-white shadow rounded-lg p-6 space-y-6">
            {/* Property Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Home className="w-4 h-4 inline mr-1" />
                Property *
              </label>
              <select
                value={selectedProperty?.id || ''}
                onChange={(e) => {
                  const property = properties.find(p => p.id === e.target.value);
                  setSelectedProperty(property || null);
                  setSelectedUnit(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name || property.address}
                  </option>
                ))}
              </select>
            </div>

            {selectedProperty && units.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                <select
                  value={selectedUnit?.id || ''}
                  onChange={(e) => {
                    const unit = units.find(u => u.id === e.target.value);
                    setSelectedUnit(unit || null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number || 'Main Unit'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Lease Term */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Start Date *
                </label>
                <input
                  type="date"
                  value={agreementDetails.startDate}
                  onChange={(e) => setAgreementDetails(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  End Date *
                </label>
                <input
                  type="date"
                  value={agreementDetails.endDate}
                  onChange={(e) => setAgreementDetails(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Monthly Rent *
                </label>
                <input
                  type="number"
                  value={agreementDetails.rentAmount}
                  onChange={(e) => setAgreementDetails(prev => ({ ...prev, rentAmount: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Security Deposit</label>
                <input
                  type="number"
                  value={agreementDetails.securityDeposit}
                  onChange={(e) => setAgreementDetails(prev => ({ ...prev, securityDeposit: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Due Day</label>
                <select
                  value={agreementDetails.paymentDueDay}
                  onChange={(e) => setAgreementDetails(prev => ({ ...prev, paymentDueDay: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Late Fee Amount</label>
                <input
                  type="number"
                  value={agreementDetails.lateFeeAmount}
                  onChange={(e) => setAgreementDetails(prev => ({ ...prev, lateFeeAmount: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (days)</label>
                <input
                  type="number"
                  value={agreementDetails.lateFeeGraceDays}
                  onChange={(e) => setAgreementDetails(prev => ({ ...prev, lateFeeGraceDays: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Signature Deadline (optional)</label>
              <input
                type="date"
                value={agreementDetails.signatureDeadline}
                onChange={(e) => setAgreementDetails(prev => ({ ...prev, signatureDeadline: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={handleDetailsSubmit}
            disabled={!selectedProperty || !selectedUnit}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Continue to Review
          </button>
        </div>
      )}

      {/* Step: Review and Send */}
      {currentStep === 'review' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Review Agreement</h2>
            <button
              onClick={() => setCurrentStep('details')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Back
            </button>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{selectedTemplate?.agreement_title}</h3>
              <p className="text-gray-600 mt-1">{selectedTemplate?.template_name}</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Parties */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Landlord</h4>
                  <p className="text-gray-900">
                    {userProfile?.first_name && userProfile?.last_name
                      ? `${userProfile.first_name} ${userProfile.last_name}`
                      : currentOrganization?.name || 'Property Manager'}
                  </p>
                  <p className="text-sm text-gray-500">{userProfile?.email}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Tenant</h4>
                  <p className="text-gray-900">{selectedTenant?.first_name} {selectedTenant?.last_name}</p>
                  <p className="text-sm text-gray-500">{selectedTenant?.email}</p>
                </div>
              </div>

              {/* Property */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Property</h4>
                <p className="text-gray-900">
                  {selectedProperty?.address}, {selectedProperty?.city}, {selectedProperty?.state} {selectedProperty?.zip_code}
                </p>
                {selectedUnit?.unit_number && (
                  <p className="text-sm text-gray-500">Unit {selectedUnit.unit_number}</p>
                )}
              </div>

              {/* Terms */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Lease Term</h4>
                  <p className="text-gray-900">
                    {new Date(agreementDetails.startDate).toLocaleDateString()} - {new Date(agreementDetails.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Monthly Rent</h4>
                  <p className="text-gray-900 text-xl font-semibold">
                    {formatCurrency(parseFloat(agreementDetails.rentAmount || '0'))}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Security Deposit</h4>
                  <p className="text-gray-900">{formatCurrency(parseFloat(agreementDetails.securityDeposit || '0'))}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Payment Due</h4>
                  <p className="text-gray-900">Day {agreementDetails.paymentDueDay} of each month</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Late Fee</h4>
                  <p className="text-gray-900">
                    {agreementDetails.lateFeeAmount ? `${formatCurrency(parseFloat(agreementDetails.lateFeeAmount))} after ${agreementDetails.lateFeeGraceDays} days` : 'None'}
                  </p>
                </div>
              </div>

              {agreementDetails.signatureDeadline && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Signature Deadline</h4>
                  <p className="text-gray-900">{new Date(agreementDetails.signatureDeadline).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600 mb-4">
                An email will be sent to <strong>{selectedTenant?.email}</strong> with a link to view and sign this agreement.
              </p>
              <button
                onClick={handleSendAgreement}
                disabled={sending}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Sending Agreement...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Agreement to Tenant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
