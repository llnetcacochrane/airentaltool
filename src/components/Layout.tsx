import { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, PackageType } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import {
  LogOut,
  Settings,
  ChevronDown,
  Building2,
  User,
  Home,
  Users,
  CreditCard,
  Wrench,
  FileText,
  BarChart3,
  Menu,
  X,
  Briefcase,
  DollarSign,
  ClipboardList,
  TrendingUp,
  Package,
  HelpCircle,
  UserCheck,
} from 'lucide-react';
import { Footer } from './Footer';
import BusinessSelector from './BusinessSelector';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  tier?: string[];
  packageType?: PackageType | PackageType[]; // Show only for specific package types
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Clients', href: '/property-owners', icon: UserCheck, packageType: 'management_company' }, // Property Managers manage clients
  { name: 'Businesses', href: '/businesses', icon: Briefcase, tier: ['basic', 'landlord', 'professional', 'management-company'] },
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'Tenants', href: '/tenants', icon: Users },
  { name: 'Applications', href: '/applications', icon: ClipboardList },
  { name: 'Agreements', href: '/agreements', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Expenses', href: '/expenses', icon: DollarSign },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

const secondaryNavigation: NavItem[] = [
  { name: 'Rent Optimization', href: '/rent-optimization', icon: TrendingUp },
  { name: 'Add-ons', href: '/addons', icon: Package },
  { name: 'Help Center', href: '/help', icon: HelpCircle },
];

export function Layout() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { supabaseUser, currentBusiness, businesses, switchBusiness, logout, userProfile, isSuperAdmin, packageType } = useAuth();
  const { branding } = useBranding();

  const userTier = userProfile?.selected_tier || 'free';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSwitchBusiness = async (businessId: string) => {
    await switchBusiness(businessId);
    setBusinessDropdownOpen(false);
    navigate('/dashboard');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const filteredNavigation = navigation.filter(item => {
    // Filter by tier if specified
    if (item.tier && !item.tier.includes(userTier)) {
      return false;
    }
    // Filter by package type if specified
    if (item.packageType) {
      const allowedTypes = Array.isArray(item.packageType) ? item.packageType : [item.packageType];
      if (!packageType || !allowedTypes.includes(packageType)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-gray-200">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition"
            >
              <img src={branding.logo_url} alt={branding.application_name} className="h-8" />
              <span className="font-bold text-gray-900 truncate">{branding.application_name}</span>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            <div className="space-y-1">
              {filteredNavigation.map((item) => {
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
            </div>

            <div className="pt-4 mt-4 border-t border-gray-200">
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Tools
              </p>
              {secondaryNavigation.map((item) => {
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
            </div>
          </nav>

          {/* Settings link at bottom */}
          <div className="border-t border-gray-200 p-4">
            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                location.pathname === '/settings'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5 text-gray-400" />
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <img src={branding.logo_url} alt={branding.application_name} className="h-8" />
                <span className="font-bold text-gray-900">{branding.application_name}</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="px-4 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
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

              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Tools
                </p>
                {secondaryNavigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
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
              </div>

              <div className="pt-4 mt-4 border-t border-gray-200">
                <Link
                  to="/settings"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    location.pathname === '/settings'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="w-5 h-5 text-gray-400" />
                  Settings
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Desktop: empty left side */}
              <div className="hidden lg:block" />

              {/* Right side controls */}
              <div className="flex items-center gap-4">
                <BusinessSelector />

                {isSuperAdmin && (
                  <button
                    onClick={() => navigate('/super-admin')}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  >
                    <Building2 size={18} />
                    <span className="hidden sm:inline">Super Admin</span>
                  </button>
                )}

                {businesses && businesses.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setBusinessDropdownOpen(!businessDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                      <Briefcase size={18} />
                      <span className="hidden sm:inline max-w-[150px] truncate">
                        {currentBusiness?.business_name}
                      </span>
                      <ChevronDown size={16} />
                    </button>

                    {businessDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setBusinessDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                          <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase">
                            Switch Business
                          </div>
                          {businesses.map((biz) => (
                            <button
                              key={biz.id}
                              onClick={() => handleSwitchBusiness(biz.id)}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                                biz.id === currentBusiness?.id
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-700'
                              }`}
                            >
                              {biz.business_name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    <User size={18} />
                    <span className="hidden sm:inline">
                      {userProfile?.first_name || supabaseUser?.email?.split('@')[0] || 'User'}
                    </span>
                    <ChevronDown size={16} />
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
                            {userProfile?.first_name && userProfile?.last_name
                              ? `${userProfile.first_name} ${userProfile.last_name}`
                              : 'User'}
                          </p>
                          <p className="text-xs text-gray-500">{supabaseUser?.email}</p>
                        </div>
                        <button
                          onClick={() => {
                            navigate('/settings');
                            setProfileOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition flex items-center gap-2"
                        >
                          <Settings size={16} />
                          Settings
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition flex items-center gap-2"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
