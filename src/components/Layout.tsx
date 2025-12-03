import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { LogOut, Settings, ChevronDown, Building2, User } from 'lucide-react';
import { Footer } from './Footer';
import PortfolioSelector from './PortfolioSelector';

export function Layout() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { supabaseUser, currentOrganization, organizations, switchOrganization, logout, userProfile, isSuperAdmin } = useAuth();
  const { branding } = useBranding();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSwitchOrganization = async (orgId: string) => {
    await switchOrganization(orgId);
    setOrgDropdownOpen(false);
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition"
            >
              <img src={branding.logo_url} alt={branding.application_name} className="h-8" />
              <span className="font-bold text-xl text-gray-900 hidden sm:block">{branding.application_name}</span>
            </button>

            <div className="flex items-center gap-4">
              <PortfolioSelector />

              {isSuperAdmin && (
                <button
                  onClick={() => navigate('/super-admin')}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  <Building2 size={18} />
                  <span className="hidden sm:inline">Super Admin</span>
                </button>
              )}

              {organizations && organizations.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    <Building2 size={18} />
                    <span className="hidden sm:inline max-w-[150px] truncate">
                      {currentOrganization?.name}
                    </span>
                    <ChevronDown size={16} />
                  </button>

                  {orgDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOrgDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                        <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase">
                          Switch Organization
                        </div>
                        {organizations.map((org) => (
                          <button
                            key={org.id}
                            onClick={() => handleSwitchOrganization(org.id)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                              org.id === currentOrganization?.id
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-700'
                            }`}
                          >
                            {org.name}
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
  );
}
