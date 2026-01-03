import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';
import { affiliateService } from '../services/affiliateService';
import type { AffiliateApplication as AffiliateAppData, AffiliateSettings, AffiliatePayoutMethod } from '../types';
import {
  Users,
  DollarSign,
  BarChart3,
  Clock,
  CheckCircle,
  ArrowRight,
  Gift,
  TrendingUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export function AffiliateApplication() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<AffiliateSettings | null>(null);
  const [existingAffiliate, setExistingAffiliate] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<AffiliateAppData>({
    company_name: '',
    website_url: '',
    promotional_methods: '',
    payout_method: 'paypal',
    payout_email: '',
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [settingsData, affiliate] = await Promise.all([
          affiliateService.getSettings(),
          isAuthenticated ? affiliateService.getCurrentAffiliate() : null,
        ]);

        setSettings(settingsData);
        setExistingAffiliate(!!affiliate);

        // Pre-fill email if user is logged in
        if (user?.email) {
          setFormData(prev => ({ ...prev, payout_email: user.email || '' }));
        }
      } catch (err) {
        console.error('Error loading affiliate data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent('/affiliate-application')}`);
      return;
    }

    if (!acceptedTerms) {
      setError('You must accept the affiliate terms and conditions.');
      return;
    }

    if (!formData.payout_email) {
      setError('Payout email is required.');
      return;
    }

    if (!formData.promotional_methods) {
      setError('Please describe how you plan to promote AI Rental Tools.');
      return;
    }

    setIsSubmitting(true);

    try {
      await affiliateService.applyToBeAffiliate(formData);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPercentage = (basisPoints: number) => {
    return `${(basisPoints / 100).toFixed(0)}%`;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
        <Footer />
      </div>
    );
  }

  // Show existing affiliate message
  if (existingAffiliate) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              You're Already an Affiliate!
            </h1>
            <p className="text-gray-600 mb-6">
              You already have an affiliate account. Visit your affiliate portal to manage your referrals and earnings.
            </p>
            <Link
              to="/affiliate-portal"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Go to Affiliate Portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Application Submitted!
            </h1>
            <p className="text-gray-600 mb-6">
              Thank you for applying to our affiliate program. We'll review your application and get back to you within 1-2 business days.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Return to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Check if program is active
  if (settings && !settings.program_active) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Program Currently Closed
            </h1>
            <p className="text-gray-600 mb-6">
              Our affiliate program is not currently accepting new applications. Please check back later.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Return Home
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Join Our Affiliate Program
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Earn {settings ? formatPercentage(settings.commission_percentage) : '20%'} commission for every customer you refer.
            {settings?.commission_type === 'recurring' && ' Recurring commissions on monthly subscriptions!'}
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              <span>{settings ? formatPercentage(settings.commission_percentage) : '20%'} Commission</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>{settings?.cookie_duration_days || 30} Day Cookie</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              <span>Monthly Payouts</span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-8">
            Why Partner With Us?
          </h2>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">High Commissions</h3>
              <p className="text-gray-600 text-sm">
                Earn {settings ? formatPercentage(settings.commission_percentage) : '20%'} on every sale.
                {settings?.commission_type === 'recurring' &&
                  (settings.recurring_months
                    ? ` Recurring for ${settings.recurring_months} months.`
                    : ' Lifetime recurring commissions.')}
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Real-Time Tracking</h3>
              <p className="text-gray-600 text-sm">
                Access your affiliate dashboard to track clicks, conversions, and earnings in real-time.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Dedicated Support</h3>
              <p className="text-gray-600 text-sm">
                Get marketing materials and dedicated support to help you succeed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6 text-center">
              Apply to Become an Affiliate
            </h2>

            {!isAuthenticated && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  You need to be logged in to apply.{' '}
                  <Link
                    to={`/login?redirect=${encodeURIComponent('/affiliate-application')}`}
                    className="font-semibold underline"
                  >
                    Log in
                  </Link>{' '}
                  or{' '}
                  <Link to="/register" className="font-semibold underline">
                    create an account
                  </Link>
                  .
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company/Business Name <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Your company or business name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  How will you promote AI Rental Tools? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.promotional_methods}
                  onChange={(e) => setFormData(prev => ({ ...prev, promotional_methods: e.target.value }))}
                  placeholder="Describe your marketing channels, audience, and promotional strategies..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Payout Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.payout_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payout_method: e.target.value as AffiliatePayoutMethod }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="paypal">PayPal</option>
                  <option value="e_transfer">Interac e-Transfer</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payout Email (PayPal/e-Transfer) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.payout_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, payout_email: e.target.value }))}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div className="pt-4 border-t">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the affiliate program terms and conditions. I understand that commissions are earned when referred customers make payments, and payouts are processed monthly once I reach the minimum threshold of{' '}
                    {settings ? formatCurrency(settings.minimum_payout_cents) : '$50.00'}.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isAuthenticated}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* FAQ Section */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Frequently Asked Questions
            </h3>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-medium text-gray-900 mb-1">How do I get paid?</h4>
                <p className="text-sm text-gray-600">
                  Payouts are processed {settings?.payout_schedule || 'monthly'} via your chosen payout method once you reach the minimum threshold of {settings ? formatCurrency(settings.minimum_payout_cents) : '$50.00'}.
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-medium text-gray-900 mb-1">How long does attribution last?</h4>
                <p className="text-sm text-gray-600">
                  We use a {settings?.cookie_duration_days || 30}-day cookie. If someone clicks your link and signs up within {settings?.attribution_window_days || 30} days, you'll receive credit for the referral.
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-medium text-gray-900 mb-1">Are commissions recurring?</h4>
                <p className="text-sm text-gray-600">
                  {settings?.commission_type === 'recurring'
                    ? settings.recurring_months
                      ? `Yes! You earn commission on subscription payments for ${settings.recurring_months} months after the initial signup.`
                      : 'Yes! You earn commission on every subscription payment for as long as the customer stays subscribed.'
                    : 'Commissions are paid one-time on the first subscription payment.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default AffiliateApplication;
