import { UserCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * God Mode Banner
 *
 * Sticky banner shown at the top when a super admin is impersonating a user
 * Provides quick exit from god mode
 */

export function GodModeBanner() {
  const navigate = useNavigate();
  const { refetch } = useAuth();

  // Check if currently impersonating
  const impersonatingUserId = sessionStorage.getItem('impersonating_user_id');
  const adminUserId = sessionStorage.getItem('admin_user_id');

  if (!impersonatingUserId || !adminUserId) {
    return null;
  }

  const handleExitGodMode = async () => {
    // Log the exit
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: adminUserId,
        action: 'exit_impersonation',
        target_user_id: impersonatingUserId,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });

    // Clear impersonation data
    sessionStorage.removeItem('impersonating_user_id');
    sessionStorage.removeItem('admin_user_id');

    // Refresh auth and navigate back
    await refetch();
    navigate('/super-admin/clients');
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-2 px-4 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <UserCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-semibold text-sm md:text-base">
            God Mode Active
          </span>
          <span className="hidden md:inline text-purple-200 text-sm">
            Viewing as another user
          </span>
        </div>
        <button
          onClick={handleExitGodMode}
          className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-semibold transition text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Exit God Mode</span>
          <span className="sm:hidden">Exit</span>
        </button>
      </div>
    </div>
  );
}
