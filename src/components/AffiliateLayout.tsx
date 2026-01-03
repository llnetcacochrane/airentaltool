import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { affiliateService } from '../services/affiliateService';
import type { Affiliate } from '../types';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  CreditCard,
  Settings,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/affiliate-portal', icon: LayoutDashboard },
  { name: 'Referrals', href: '/affiliate-portal/referrals', icon: Users },
  { name: 'Commissions', href: '/affiliate-portal/commissions', icon: DollarSign },
  { name: 'Payouts', href: '/affiliate-portal/payouts', icon: CreditCard },
  { name: 'Resources', href: '/affiliate-portal/resources', icon: FileText },
  { name: 'Settings', href: '/affiliate-portal/settings', icon: Settings },
];

export function AffiliateLayout() {
  const { logout, supabaseUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadAffiliate() {
      try {
        const data = await affiliateService.getCurrentAffiliate();
        setAffiliate(data);
      } catch (err) {
        console.error('Error loading affiliate:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAffiliate();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/affiliate-portal') {
      return location.pathname === '/affiliate-portal';
    }
    return location.pathname.startsWith(href);
  };

  const copyReferralLink = () => {
    if (affiliate?.referral_code) {
      const url = affiliateService.getReferralUrl(affiliate.referral_code);
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // No affiliate account
  if (!affiliate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            No Affiliate Account
          </h1>
          <p className="text-gray-600 mb-6">
            You don't have an affiliate account yet. Apply to become an affiliate to start earning commissions.
          </p>
          <Link
            to="/affiliate-application"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Apply to Become an Affiliate
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Pending approval
  if (affiliate.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Application Pending
          </h1>
          <p className="text-gray-600 mb-6">
            Your affiliate application is being reviewed. You'll receive an email once it's approved.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Rejected or suspended
  if (affiliate.status === 'rejected' || affiliate.status === 'suspended') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Account {affiliate.status === 'rejected' ? 'Rejected' : 'Suspended'}
          </h1>
          <p className="text-gray-600 mb-4">
            {affiliate.status === 'rejected'
              ? 'Your affiliate application was not approved.'
              : 'Your affiliate account has been suspended.'}
          </p>
          {(affiliate.rejection_reason || affiliate.suspension_reason) && (
            <p className="text-sm text-gray-500 mb-6 bg-gray-50 p-3 rounded">
              Reason: {affiliate.rejection_reason || affiliate.suspension_reason}
            </p>
          )}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-gray-200">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            <span className="font-bold text-gray-900">Affiliate Portal</span>
          </div>

          {/* Referral Link */}
          <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Your Referral Code</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded text-sm font-mono text-gray-800">
                {affiliate.referral_code}
              </code>
              <button
                onClick={copyReferralLink}
                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                title="Copy referral link"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-green-600' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Back to Main App */}
          <div className="border-t border-gray-200 p-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              <ExternalLink className="w-5 h-5 text-gray-400" />
              Back to Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition mt-1"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <DollarSign className="w-7 h-7 text-green-600" />
            <span className="font-bold text-gray-900">Affiliate Portal</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <User className="w-4 h-4 text-green-600" />
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {affiliate.company_name || 'Affiliate'}
                    </p>
                    <p className="text-xs text-gray-500">{supabaseUser?.email}</p>
                  </div>
                  <Link
                    to="/affiliate-portal/settings"
                    onClick={() => setProfileOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Settings
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setProfileOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition flex items-center gap-2"
                  >
                    <ExternalLink size={16} />
                    Back to Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <DollarSign className="w-7 h-7 text-green-600" />
                <span className="font-bold text-gray-900">Affiliate Portal</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Referral Code */}
            <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Your Referral Code</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded text-sm font-mono text-gray-800">
                  {affiliate.referral_code}
                </code>
                <button
                  onClick={copyReferralLink}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  title="Copy referral link"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <nav className="px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      active
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-green-600' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <Outlet context={{ affiliate }} />
        </main>
      </div>
    </div>
  );
}

export default AffiliateLayout;
