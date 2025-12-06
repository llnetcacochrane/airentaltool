import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { tenantInvitationService } from '../services/tenantInvitationService';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';
import { InvitationDetails } from '../types';
import { Check, AlertCircle, Home, ArrowLeft } from 'lucide-react';

export function TenantSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<'code' | 'details' | 'success'>('code');
  const [invitationCode, setInvitationCode] = useState(searchParams.get('code') || '');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  useEffect(() => {
    // Auto-validate if code provided in URL
    if (invitationCode && !invitation) {
      handleValidateCode();
    }
  }, []);

  const handleValidateCode = async () => {
    if (!invitationCode.trim()) {
      setError('Please enter your invitation code');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const details = await tenantInvitationService.validateInvitationCode(invitationCode.trim().toUpperCase());

      if (!details) {
        setError('Invalid or expired invitation code. Please check the code and try again.');
        return;
      }

      setInvitation(details);
      setFormData({
        ...formData,
        email: details.tenant_email || '',
        firstName: details.tenant_first_name || '',
        lastName: details.tenant_last_name || '',
      });
      setStep('details');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate invitation code');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Create auth account
      const user = await authService.register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );

      if (user) {
        // Link the tenant record to this user
        // First, find the tenant record associated with this invitation
        const { data: invitationData } = await supabase
          .from('tenant_invitations')
          .select('tenant_id')
          .eq('id', invitation.invitation_id)
          .maybeSingle();

        if (invitationData?.tenant_id) {
          // Update the existing tenant record with the user_id
          await supabase
            .from('tenants')
            .update({
              user_id: user.id,
              email: formData.email,
              first_name: formData.firstName,
              last_name: formData.lastName,
              phone: formData.phone,
              has_portal_access: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invitationData.tenant_id);
        } else {
          // Create a new tenant record linked to this user
          await supabase
            .from('tenants')
            .insert({
              organization_id: invitation.organization_id,
              unit_id: invitation.unit_id,
              user_id: user.id,
              first_name: formData.firstName,
              last_name: formData.lastName,
              email: formData.email,
              phone: formData.phone,
              tenant_type: 'primary',
              has_portal_access: true,
              status: 'active',
              security_deposit_paid_cents: 0,
            });
        }

        // Mark invitation as accepted
        await tenantInvitationService.acceptInvitation(invitation.invitation_id, user.id);
      }

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Created Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Your tenant portal account has been created. Please check your email to verify your account, then log in to access your dashboard.
          </p>
          <Link
            to="/login"
            className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition mb-3"
          >
            Go to Login
          </Link>
          <p className="text-sm text-gray-500">
            After logging in, you'll be directed to your tenant dashboard at <span className="font-medium">/my-rental</span>
          </p>
        </div>
      </div>
    );
  }

  if (step === 'details' && invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <button
            onClick={() => setStep('code')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Registration</h2>
          <p className="text-gray-600 mb-6">You're joining the tenant portal for:</p>

          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <Home className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{invitation.property_name}</h3>
                <p className="text-sm text-gray-600 mb-1">{invitation.property_address}</p>
                <p className="text-sm text-gray-600">Unit {invitation.unit_number}</p>
                <p className="text-xs text-gray-500 mt-2">Managed by {invitation.organization_name}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                minLength={8}
                required
              />
              <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Join Your Tenant Portal</h2>
          <p className="text-gray-600">
            Enter the invitation code provided by your landlord
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invitation Code
          </label>
          <input
            type="text"
            value={invitationCode}
            onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
            placeholder="e.g., ABC123XY"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono tracking-wider text-center"
            maxLength={8}
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            The 8-character code from your landlord
          </p>
        </div>

        <button
          onClick={handleValidateCode}
          disabled={isValidating || !invitationCode.trim()}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {isValidating ? 'Validating...' : 'Continue'}
        </button>

        <div className="text-center">
          <Link to="/tenant-portal" className="text-sm text-blue-600 hover:text-blue-700">
            Learn more about the tenant portal
          </Link>
        </div>
      </div>
    </div>
  );
}
