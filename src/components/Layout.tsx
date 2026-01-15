import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, PackageType } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import {
  LogOut,
  Settings,
  ChevronDown,
  ChevronRight,
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
  Sparkles,
  Crown,
  DoorClosed,
  Calculator,
  Truck,
  FolderOpen,
  Receipt,
  Cog,
  LayoutGrid,
} from 'lucide-react';
import { Footer } from './Footer';
import BusinessSelector from './BusinessSelector';
import { GodModeBanner } from './GodModeBanner';
import { EmailVerificationReminder } from './EmailVerificationReminder';
import { FeaturePreviewModal, FEATURE_CATALOG } from './upsell/FeatureGate';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  tier?: string[];
  packageType?: PackageType | PackageType[]; // Show only for specific package types
  requiresFeature?: string; // Feature required to access (for upselling)
}

interface NavGroup {
  name: string;
  icon: React.ElementType;
  items: NavItem[];
  defaultOpen?: boolean;
}

// Collapsible navigation groups
const navigationGroups: NavGroup[] = [
  {
    name: 'Quick Setup',
    icon: Sparkles,
    items: [
      { name: 'Setup Wizard', href: '/welcome', icon: Sparkles },
      { name: 'Add Property', href: '/setup/add-property', icon: Building2 },
      { name: 'Add Unit', href: '/setup/add-unit', icon: DoorClosed },
    ],
  },
  {
    name: 'Portfolio',
    icon: FolderOpen,
    items: [
      { name: 'Businesses', href: '/businesses', icon: Briefcase },
      { name: 'Properties', href: '/properties', icon: Building2 },
      { name: 'Clients', href: '/property-owners', icon: UserCheck, packageType: 'management_company' },
    ],
    defaultOpen: true,
  },
  {
    name: 'Lease/Rental',
    icon: FileText,
    items: [
      { name: 'Applications', href: '/applications', icon: ClipboardList },
      { name: 'App Forms', href: '/application-templates', icon: ClipboardList },
      { name: 'Agreements', href: '/agreements', icon: FileText },
    ],
  },
  {
    name: 'Financials',
    icon: Receipt,
    items: [
      { name: 'Payments', href: '/payments', icon: CreditCard },
      { name: 'Expenses', href: '/expenses', icon: DollarSign },
      { name: 'Accounting', href: '/accounting', icon: Calculator },
      { name: 'Vendors', href: '/vendors', icon: Truck },
    ],
  },
  {
    name: 'Operations',
    icon: Cog,
    items: [
      { name: 'Maintenance', href: '/maintenance', icon: Wrench },
      { name: 'Reports', href: '/reports', icon: BarChart3, requiresFeature: 'advanced_reporting' },
    ],
  },
  {
    name: 'Tools',
    icon: LayoutGrid,
    items: [
      { name: 'Rent Optimizer', href: '/rent-optimization', icon: TrendingUp, requiresFeature: 'rent_optimization' },
      { name: 'Help Center', href: '/help', icon: HelpCircle },
    ],
  },
];

const accountNavigation: NavItem[] = [
  { name: 'Packages', href: '/packages', icon: Package },
  { name: 'Add-ons', href: '/addons', icon: Package },
];

export function Layout() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { supabaseUser, currentBusiness, businesses, switchBusiness, logout, userProfile, isSuperAdmin, packageType, hasFeature } = useAuth();
  const { branding } = useBranding();

  const userTier = userProfile?.selected_tier || 'free';

  // Initialize expanded groups based on defaultOpen and current route
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    navigationGroups.forEach(group => {
      // Auto-expand if defaultOpen or if current route is in this group
      const hasActiveItem = group.items.some(item => isActive(item.href));
      initialExpanded[group.name] = group.defaultOpen || hasActiveItem;
    });
    setExpandedGroups(initialExpanded);
  }, []); // Only run on mount

  // Auto-expand group when navigating to an item in it
  useEffect(() => {
    navigationGroups.forEach(group => {
      const hasActiveItem = group.items.some(item => isActive(item.href));
      if (hasActiveItem && !expandedGroups[group.name]) {
        setExpandedGroups(prev => ({ ...prev, [group.name]: true }));
      }
    });
  }, [location.pathname]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // Check if a nav item is locked (feature required but not available)
  const isNavLocked = (item: NavItem) => {
    return item.requiresFeature && !hasFeature(item.requiresFeature);
  };

  // Handle nav click - show upsell modal if locked, otherwise navigate
  const handleNavClick = (item: NavItem, e: React.MouseEvent) => {
    if (isNavLocked(item) && item.requiresFeature) {
      e.preventDefault();
      setShowFeatureModal(item.requiresFeature);
    }
  };

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

  // Filter nav items based on tier and package type
  const filterNavItems = (items: NavItem[]) => {
    return items.filter(item => {
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
  };

  // Check if a group has any active items
  const groupHasActiveItem = (group: NavGroup) => {
    return filterNavItems(group.items).some(item => isActive(item.href));
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-3 h-16 px-6 border-b border-gray-200">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition"
            >
              <img src={branding.logo_url} alt={branding.application_name} className="h-8" />
              <span className="font-bold text-gray-900 truncate">{branding.application_name}</span>
            </button>
          </div>

          {/* Navigation - scrollable */}
          <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
            {/* Dashboard - always visible at top */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive('/dashboard')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Home className={`w-5 h-5 ${isActive('/dashboard') ? 'text-blue-600' : 'text-gray-400'}`} />
              Dashboard
            </Link>

            {/* User Manager - top level */}
            <Link
              to="/users"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive('/users')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className={`w-5 h-5 ${isActive('/users') ? 'text-blue-600' : 'text-gray-400'}`} />
              User Manager
            </Link>

            {/* Collapsible Navigation Groups */}
            {navigationGroups.map((group) => {
              const filteredItems = filterNavItems(group.items);
              // Skip groups with no items after filtering
              if (filteredItems.length === 0) return null;

              const GroupIcon = group.icon;
              const isExpanded = expandedGroups[group.name];
              const hasActive = groupHasActiveItem(group);

              return (
                <div key={group.name} className="pt-2">
                  {/* Group Header - Clickable to expand/collapse */}
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                      hasActive ? 'text-blue-700 bg-blue-50/50' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GroupIcon className={`w-4 h-4 ${hasActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span>{group.name}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* Group Items - Collapsible */}
                  {isExpanded && (
                    <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-gray-100 pl-3">
                      {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        const locked = isNavLocked(item);
                        return (
                          <Link
                            key={item.name}
                            to={locked ? '#' : item.href}
                            onClick={(e) => handleNavClick(item, e)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                              locked
                                ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 hover:from-amber-100 hover:to-orange-100 border border-amber-200'
                                : active
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`w-4 h-4 ${locked ? 'text-amber-500' : active ? 'text-blue-600' : 'text-gray-400'}`} />
                              {item.name}
                            </div>
                            {locked && (
                              <div className="flex items-center gap-1 text-xs bg-amber-100 px-1.5 py-0.5 rounded">
                                <Crown size={10} />
                              </div>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Settings - always visible at bottom */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <Link
                to="/settings"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive('/settings')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className={`w-5 h-5 ${isActive('/settings') ? 'text-blue-600' : 'text-gray-400'}`} />
                Settings
              </Link>
            </div>
          </nav>

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

            <nav className="px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
              {/* Dashboard - always visible at top */}
              <Link
                to="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive('/dashboard')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Home className={`w-5 h-5 ${isActive('/dashboard') ? 'text-blue-600' : 'text-gray-400'}`} />
                Dashboard
              </Link>

              {/* User Manager - top level */}
              <Link
                to="/users"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive('/users')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className={`w-5 h-5 ${isActive('/users') ? 'text-blue-600' : 'text-gray-400'}`} />
                User Manager
              </Link>

              {/* Collapsible Navigation Groups */}
              {navigationGroups.map((group) => {
                const filteredItems = filterNavItems(group.items);
                // Skip groups with no items after filtering
                if (filteredItems.length === 0) return null;

                const GroupIcon = group.icon;
                const isExpanded = expandedGroups[group.name];
                const hasActive = groupHasActiveItem(group);

                return (
                  <div key={group.name} className="pt-2">
                    {/* Group Header - Clickable to expand/collapse */}
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                        hasActive ? 'text-blue-700 bg-blue-50/50' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GroupIcon className={`w-4 h-4 ${hasActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span>{group.name}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {/* Group Items - Collapsible */}
                    {isExpanded && (
                      <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-gray-100 pl-3">
                        {filteredItems.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.href);
                          const locked = isNavLocked(item);
                          return (
                            <Link
                              key={item.name}
                              to={locked ? '#' : item.href}
                              onClick={(e) => {
                                if (locked && item.requiresFeature) {
                                  e.preventDefault();
                                  setSidebarOpen(false);
                                  setShowFeatureModal(item.requiresFeature);
                                } else {
                                  setSidebarOpen(false);
                                }
                              }}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                                locked
                                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200'
                                  : active
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className={`w-4 h-4 ${locked ? 'text-amber-500' : active ? 'text-blue-600' : 'text-gray-400'}`} />
                                {item.name}
                              </div>
                              {locked && (
                                <div className="flex items-center gap-1 text-xs bg-amber-100 px-2 py-0.5 rounded-full">
                                  <Crown size={10} />
                                  <span>Upgrade</span>
                                </div>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Account section */}
              <div className="pt-4 mt-4 border-t border-gray-200">
                <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Account
                </p>
                <Link
                  to="/settings"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive('/settings')
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Settings className={`w-5 h-5 ${isActive('/settings') ? 'text-blue-600' : 'text-gray-400'}`} />
                  Settings
                </Link>
                {accountNavigation.map((item) => {
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
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* God Mode Banner (if impersonating) */}
        <GodModeBanner />

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
          {/* Email Verification Reminder - show if user email is not verified */}
          {supabaseUser && !supabaseUser.email_confirmed_at && (
            <div className="px-4 sm:px-6 lg:px-8 pt-6">
              <EmailVerificationReminder email={supabaseUser.email || ''} />
            </div>
          )}

          <Outlet />
        </main>

        <Footer />
      </div>

      {/* Feature Upgrade Modal */}
      {showFeatureModal && (
        <FeaturePreviewModal
          isOpen={true}
          onClose={() => setShowFeatureModal(null)}
          featureKey={showFeatureModal}
        />
      )}
    </div>
  );
}
