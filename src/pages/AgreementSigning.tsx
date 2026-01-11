import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, CheckCircle, Download, AlertCircle, Loader } from 'lucide-react';
import { agreementService, LeaseAgreement, AgreementSignature } from '../services/agreementService';
import { DigitalSignature } from '../components/DigitalSignature';
import { pdfGenerationService } from '../services/pdfGenerationService';
import { useToast } from '../components/Toast';

export default function AgreementSigning() {
  const { agreementId } = useParams<{ agreementId: string }>();
  const toast = useToast();
  const [agreement, setAgreement] = useState<LeaseAgreement | null>(null);
  const [signatures, setSignatures] = useState<AgreementSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  // Note: signing state is managed but not currently displayed to user - could add loading state in future
  const [, setSigning] = useState(false);

  useEffect(() => {
    loadAgreement();
  }, [agreementId]);

  const loadAgreement = async () => {
    try {
      setLoading(true);
      // Use getAgreementForSigning which allows unauthenticated access for signing
      const [agreementData, signaturesData] = await Promise.all([
        agreementService.getAgreementForSigning(agreementId!),
        agreementService.getSignatures(agreementId!),
      ]);
      setAgreement(agreementData);
      setSignatures(signaturesData);

      if (agreementData.status === 'sent') {
        await agreementService.markAgreementViewed(agreementId!);
        setAgreement(prev => prev ? { ...prev, status: 'viewed' } : null);
      }
    } catch (error) {
      // SECURITY: Don't expose error details to users
      if (import.meta.env.DEV) console.error('Error loading agreement:', error);
      toast.error('Failed to load agreement', 'Please check your access permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (signatureData: string, method: 'digital' | 'typed') => {
    try {
      setSigning(true);
      await agreementService.signAgreement(agreementId!, 'tenant', signatureData, method);
      setShowSignatureModal(false);
      loadAgreement();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error signing agreement:', error);
      toast.error('Failed to sign agreement', 'Please try again or contact support.');
    } finally {
      setSigning(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!agreement) return;
    try {
      await pdfGenerationService.generateAgreementPDF(agreement);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF', 'Please try again.');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Agreement Not Found</h2>
          <p className="text-gray-600">This agreement does not exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  const isSigned = agreement.tenant_signed;
  const isFullyExecuted = agreement.landlord_signed && agreement.tenant_signed;
  const canSign = !isSigned && ['sent', 'viewed'].includes(agreement.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Lease Agreement</h1>
                <p className="text-sm text-gray-600">
                  {isFullyExecuted ? 'Fully Executed' : isSigned ? 'Awaiting Landlord Signature' : 'Ready for Your Signature'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(isSigned || isFullyExecuted) && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">You Signed</span>
                </div>
              )}
              <button
                onClick={handleDownloadPDF}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isSigned && canSign && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Action Required: Sign Your Lease Agreement</h3>
                <p className="text-blue-800 mb-4">
                  Please review the agreement below carefully. Once you're ready, click the "Sign Agreement" button to provide your electronic signature.
                </p>
                {agreement.signature_deadline && (
                  <p className="text-sm text-blue-700 mb-4">
                    Signature Deadline: {formatDate(agreement.signature_deadline)}
                  </p>
                )}
                <button
                  onClick={() => setShowSignatureModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Sign Agreement
                </button>
              </div>
            </div>
          </div>
        )}

        {isFullyExecuted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">Agreement Fully Executed</h3>
                <p className="text-green-800">
                  This agreement has been signed by all parties and is now in effect.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">{agreement.agreement_title}</h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Landlord Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><span className="font-medium">Name:</span> {agreement.landlord_name}</div>
                  <div><span className="font-medium">Email:</span> {agreement.landlord_email}</div>
                  {agreement.landlord_phone && (
                    <div><span className="font-medium">Phone:</span> {agreement.landlord_phone}</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Tenant Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><span className="font-medium">Name:</span> {agreement.tenant_name}</div>
                  <div><span className="font-medium">Email:</span> {agreement.tenant_email}</div>
                  {agreement.tenant_phone && (
                    <div><span className="font-medium">Phone:</span> {agreement.tenant_phone}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Property Information</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div><span className="font-medium">Address:</span> {agreement.property_address}</div>
                {agreement.property_description && (
                  <div><span className="font-medium">Description:</span> {agreement.property_description}</div>
                )}
              </div>
            </div>

            <div className="mb-8 pb-8 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Lease Terms</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div><span className="font-medium">Start Date:</span> {formatDate(agreement.start_date)}</div>
                <div><span className="font-medium">End Date:</span> {formatDate(agreement.end_date)}</div>
                <div><span className="font-medium">Rent Amount:</span> {formatCurrency(agreement.rent_amount)}</div>
                <div><span className="font-medium">Payment Frequency:</span> {agreement.payment_frequency}</div>
                <div><span className="font-medium">Security Deposit:</span> {formatCurrency(agreement.security_deposit)}</div>
                <div><span className="font-medium">Payment Due Day:</span> Day {agreement.payment_due_day} of each month</div>
                {agreement.late_fee_amount && (
                  <>
                    <div><span className="font-medium">Late Fee:</span> {formatCurrency(agreement.late_fee_amount)}</div>
                    <div><span className="font-medium">Grace Period:</span> {agreement.late_fee_grace_days} days</div>
                  </>
                )}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Agreement Details</h3>
              <div className="prose max-w-none text-sm text-gray-700 whitespace-pre-wrap">
                {agreement.final_content || agreement.generated_text}
              </div>
            </div>

            {signatures.length > 0 && (
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Signatures</h3>
                <div className="space-y-6">
                  {signatures.map((signature) => (
                    <div key={signature.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium text-gray-900">{signature.signer_name}</div>
                          <div className="text-sm text-gray-600">{signature.signer_type}</div>
                        </div>
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm">Signed</span>
                        </div>
                      </div>
                      {signature.signature_method === 'digital' && signature.signature_data ? (
                        <img
                          src={signature.signature_data}
                          alt={`${signature.signer_name}'s signature`}
                          className="h-20 border-b border-gray-300"
                        />
                      ) : (
                        <div className="text-3xl font-serif italic border-b border-gray-300 py-2">
                          {signature.signature_data}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        Signed on {formatDate(signature.signed_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSignatureModal && (
        <DigitalSignature
          signerName={agreement.tenant_name}
          onSign={handleSign}
          onCancel={() => setShowSignatureModal(false)}
        />
      )}
    </div>
  );
}
