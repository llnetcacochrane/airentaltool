import { ReactNode } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield, ArrowLeft, LogOut, User, Home, Settings, Users, Package,
  Key, Mail, BarChart3, Layers, Inbox
} from 'lucide-react';
import { Footer } from './Footer';

interface SuperAdminLayoutProps {
  children: ReactNode;
  title: string | ReactNode;
  subtitle?: string;
  showBackButton?: boolean;
  actionButton?: ReactNode;
}

const menuItems = [
  { name: 'Dashboard', href: '/super-admin', icon: Home },
  { name: 'Clients', href: '/super-admin/clients', icon: Users },
  { name: 'Packages', href: '/super-admin/packages', icon: Package },
  { name: 'Features & Add-Ons', href: '/super-admin/features', icon: Layers },
  { name: 'System Config', href: '/super-admin/config', icon: Settings },
  { name: 'AI API Keys', href: '/super-admin/ai-keys', icon: Key },
  { name: 'Email Settings', href: '/super-admin/email-diagnostics', icon: Mail },
  { name: 'Email Accounts', href: '/super-admin/email-accounts', icon: Inbox },
];

export function SuperAdminLayout({
  children,
  title,
  subtitle,
  showBackButton = true,
  actionButton
}: SuperAdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { supabaseUser, logout, userProfile } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/super-admin') {
      return location.pathname === '/super-admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-gray-900 overflow-y-auto">
          {/* Sidebar Header */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-gray-800">
            <Shield className="w-8 h-8 text-red-500" />
            <span className="font-bold text-white">Super Admin</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? 'bg-red-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Back to App */}
          <div className="border-t border-gray-800 p-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
              Back to App
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile menu button */}
                <button
                  onClick={() => navigate('/super-admin')}
                  className="lg:hidden p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
                >
                  <Shield className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
                  {subtitle && <p className="text-red-100 mt-1 text-sm">{subtitle}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {actionButton}

                {/* User Profile & Logout */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white bg-opacity-20 rounded-lg">
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {userProfile?.first_name || supabaseUser?.email?.split('@')[0] || 'Admin'}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline text-sm font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden border-t border-red-500 overflow-x-auto">
            <div className="flex px-4 py-2 gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                      active
                        ? 'bg-white bg-opacity-20 text-white'
                        : 'text-red-100 hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
