import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { affiliateService } from '../../services/affiliateService';
import type { Affiliate } from '../../types';
import {
  Settings,
  CreditCard,
  Building,
  Globe,
  Mail,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface OutletContext {
  affiliate: Affiliate;
}

export function AffiliateSettings() {
  const { affiliate } = useOutletContext<OutletContext>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company_name: affiliate.company_name || '',
    website_url: affiliate.website_url || '',
    promotional_methods: affiliate.promotional_methods || '',
    payout_method: affiliate.payout_method || 'e_transfer',
    payout_email: affiliate.payout_email || '',
  });

  useEffect(() => {
    setFormData({
      company_name: affiliate.company_name || '',
      website_url: affiliate.website_url || '',
      promotional_methods: affiliate.promotional_methods || '',
      payout_method: affiliate.payout_method || 'e_transfer',
      payout_email: affiliate.payout_email || '',
    });
  }, [affiliate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await affiliateService.updateProfile(affiliate.id, formData);
      setSuccess('Settings updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Affiliate Settings</h1>
          <p className="text-gray-600 mt-1">
            Update your affiliate profile and payout preferences.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
                <p className="text-sm text-gray-500">Your affiliate code: <span className="font-mono font-semibold text-green-600">{affiliate.referral_code}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Your company or business name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="url"
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="https://yoursite.com"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Promotional Methods
              </label>
              <textarea
                name="promotional_methods"
                value={formData.promotional_methods}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Describe how you plan to promote AI Rental Tools (e.g., blog posts, social media, email marketing)"
              />
            </div>
          </div>

          {/* Payout Settings Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Payout Settings</h3>
                <p className="text-sm text-gray-500">Configure how you want to receive payouts</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payout Method
                </label>
                <select
                  name="payout_method"
                  value={formData.payout_method}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="e_transfer">Interac e-Transfer (Canada)</option>
                  <option value="paypal">PayPal</option>
                  <option value="bank_transfer">Bank Transfer (Wire)</option>
                  <option value="check">Check</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payout Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="payout_email"
                    value={formData.payout_email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="email@example.com"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  For e-Transfer and PayPal, payments will be sent to this email.
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </form>

        {/* Account Status */}
        <div className="mt-8 bg-gray-50 rounded-xl p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Account Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Status</p>
              <p className={`font-semibold capitalize ${
                affiliate.status === 'approved' ? 'text-green-600' :
                affiliate.status === 'pending' ? 'text-amber-600' :
                'text-red-600'
              }`}>
                {affiliate.status}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Member Since</p>
              <p className="font-semibold text-gray-900">
                {new Date(affiliate.created_at).toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Total Referrals</p>
              <p className="font-semibold text-gray-900">{affiliate.total_signups || 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Total Earned</p>
              <p className="font-semibold text-green-600">
                {affiliateService.formatCurrency(affiliate.total_commission_earned_cents || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AffiliateSettings;
