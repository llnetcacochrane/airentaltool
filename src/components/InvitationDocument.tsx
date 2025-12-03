import { TenantInvitation } from '../types';
import { tenantInvitationService } from '../services/tenantInvitationService';
import { Home, Mail, Phone, MapPin, Calendar, QrCode } from 'lucide-react';

interface InvitationDocumentProps {
  invitation: TenantInvitation;
  propertyName: string;
  propertyAddress: string;
  unitNumber: string;
  organizationName: string;
  landlordName?: string;
  landlordPhone?: string;
  landlordEmail?: string;
}

export function InvitationDocument({
  invitation,
  propertyName,
  propertyAddress,
  unitNumber,
  organizationName,
  landlordName,
  landlordPhone,
  landlordEmail,
}: InvitationDocumentProps) {
  const invitationUrl = tenantInvitationService.getInvitationUrl(invitation.invitation_code);
  const qrCodeUrl = tenantInvitationService.getQRCodeUrl(invitation.invitation_code);
  const expirationDate = new Date(invitation.expires_at).toLocaleDateString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-8 print:p-0">
        <div className="space-y-8">
          <div className="border-b-4 border-blue-600 pb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome to Your New Home!
            </h1>
            <p className="text-lg text-gray-600">
              You've been invited to join our tenant portal
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-600" />
                Your Rental Property
              </h2>
              <div className="bg-blue-50 rounded-lg p-6 space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Property</p>
                  <p className="font-semibold text-gray-900">{propertyName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Address</p>
                  <p className="font-semibold text-gray-900">{propertyAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Unit</p>
                  <p className="font-semibold text-gray-900">{unitNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Managed By</p>
                  <p className="font-semibold text-gray-900">{organizationName}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                Quick Sign Up
              </h2>
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-4">Scan this QR code with your phone</p>
                <div className="bg-white p-4 rounded-lg inline-block shadow-sm mb-4">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-40 h-40 mx-auto"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Or visit the URL below
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Your Invitation Code</h2>
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 mb-4">
              <p className="text-sm text-blue-100 mb-2">Enter this code when signing up:</p>
              <p className="text-5xl font-bold font-mono tracking-widest text-center">
                {invitation.invitation_code}
              </p>
            </div>
            <div className="space-y-2 text-sm text-blue-100">
              <p className="flex items-center gap-2">
                <Calendar size={16} />
                Valid until {expirationDate}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Sign Up</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold mb-3">
                  1
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Visit Portal</h3>
                <p className="text-sm text-gray-600">
                  Go to the tenant portal URL or scan the QR code above
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold mb-3">
                  2
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Enter Code</h3>
                <p className="text-sm text-gray-600">
                  Use your unique invitation code shown above
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg font-bold mb-3">
                  3
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Complete Setup</h3>
                <p className="text-sm text-gray-600">
                  Fill in your details and start using the portal
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Portal Access URL</h2>
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Visit this website to get started:</p>
              <p className="font-mono text-blue-600 text-lg break-all">{invitationUrl}</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Portal Features</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  💰
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Pay Rent Online</h3>
                  <p className="text-xs text-gray-600">Secure online payments with payment history</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  🔧
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Maintenance Requests</h3>
                  <p className="text-xs text-gray-600">Submit and track maintenance issues</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  📄
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Lease Documents</h3>
                  <p className="text-xs text-gray-600">Access your lease and important documents</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  📱
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">24/7 Access</h3>
                  <p className="text-xs text-gray-600">Access from any device, anytime</p>
                </div>
              </div>
            </div>
          </div>

          {(landlordName || landlordPhone || landlordEmail) && (
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                {landlordName && (
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-600">Property Manager</p>
                      <p className="font-semibold text-gray-900">{landlordName}</p>
                    </div>
                  </div>
                )}
                {landlordPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-600">Phone</p>
                      <p className="font-semibold text-gray-900">{landlordPhone}</p>
                    </div>
                  </div>
                )}
                {landlordEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{landlordEmail}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-center text-sm text-gray-500 border-t pt-6 print:hidden">
            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold mb-4"
            >
              Print This Document
            </button>
            <p>
              This invitation is valid for 30 days. If you need assistance, please contact your property manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
