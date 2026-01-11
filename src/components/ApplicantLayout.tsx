import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { supabase } from '../lib/supabase';
import {
  Home,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  MessageSquare,
  Clock,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface BusinessApplication {
  business_id: string;
  business_name: string;
  application_count: number;
  latest_status: string;
  unread_messages: number;
}

const navigation: NavItem[] = [
  { name: 'My Applications', href: '/my-applications', icon: Home },
  { name: 'Messages', href: '/my-applications/messages', icon: MessageSquare },
  { name: 'Profile', href: '/my-applications/profile', icon: User },
];

export function ApplicantLayout() {
  const { logout, supabaseUser, user } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [businessApplications, setBusinessApplications] = useState<BusinessApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBusinessApplications();
  }, [supabaseUser?.id]);

  const loadBusinessApplications = async () => {
    if (!supabaseUser?.id) return;
    setIsLoading(true);
    try {
      // Get all businesses where user has applicant role
      const { data: businessUsers, error: buError } = await supabase
        .from('business_users')
        .select(`
          business_id,
          businesses (
            id,
            business_name
          )
        `)
        .eq('auth_user_id', supabaseUser.id)
        .eq('role', 'applicant')
        .eq('status', 'active')
        .eq('is_active', true);

      if (buError) throw buError;

      // For each business, get application count and status
      const businessApps: BusinessApplication[] = [];
      for (const bu of businessUsers || []) {
        const { data: apps, error: appError } = await supabase
          .from('rental_applications')
          .select('id, status')
          .eq('applicant_email', supabaseUser.email)
          .eq('business_id', bu.business_id);

        if (!appError && apps) {
          businessApps.push({
            business_id: bu.business_id,
            business_name: (bu.businesses as any)?.business_name || 'Unknown Business',
            application_count: apps.length,
            latest_status: apps[0]?.status || 'submitted',
            unread_messages: 0, // TODO: implement message count
          });
        }
      }

      setBusinessApplications(businessApps);
    } catch (err) {
      console.error('Failed to load business applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/my-applications') {
      return location.pathname === '/my-applications';
    }
    return location.pathname.startsWith(href);
  };

  const firstName = user?.user_metadata?.first_name || supabaseUser?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || supabaseUser?.user_metadata?.last_name || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-gray-200">
            <img src={branding.logo_url} alt={branding.application_name} className="h-8" />
            <span className="font-bold text-gray-900">Applicant Portal</span>
          </div>

          {/* User Info */}
          <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {firstName} {lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {supabaseUser?.email}
                </p>
              </div>
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
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Businesses Applied To */}
          {businessApplications.length > 0 && (
            <div className="border-t border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Businesses Applied To
              </p>
              <div className="space-y-2">
                {businessApplications.map((ba) => (
                  <Link
                    key={ba.business_id}
                    to={`/my-applications?businessId=${ba.business_id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
                  >
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="truncate flex-1">{ba.business_name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                      {ba.application_count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Sign Out */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
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
            <img src={branding.logo_url} alt={branding.application_name} className="h-8" />
          </div>

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
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
                      {firstName} {lastName}
                    </p>
                    <p className="text-xs text-gray-500">{supabaseUser?.email}</p>
                  </div>
                  <Link
                    to="/my-applications/profile"
                    onClick={() => setProfileOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition flex items-center gap-2"
                  >
                    <User size={16} />
                    My Profile
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
                <img src={branding.logo_url} alt={branding.application_name} className="h-8" />
                <span className="font-bold text-gray-900">Applicant Portal</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {firstName} {lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {supabaseUser?.email}
                  </p>
                </div>
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
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile: Businesses Applied To */}
            {businessApplications.length > 0 && (
              <div className="border-t border-gray-200 px-4 py-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Businesses Applied To
                </p>
                <div className="space-y-2">
                  {businessApplications.map((ba) => (
                    <Link
                      key={ba.business_id}
                      to={`/my-applications?businessId=${ba.business_id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="truncate flex-1">{ba.business_name}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                        {ba.application_count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
