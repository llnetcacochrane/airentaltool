import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserCircle, LogOut, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Super Admin God Mode - User Impersonation
 *
 * Allows super admins to view the application as another user
 * Creates an audit trail of all impersonation sessions
 */

export function ImpersonateUser() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, isSuperAdmin, refetch } = useAuth();
  const [impersonatedUser, setImpersonatedUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard');
      return;
    }

    const startImpersonation = async () => {
      if (!userId) {
        setError('No user ID provided');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch the user to impersonate
        const { data: targetUser, error: userError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError) throw userError;
        if (!targetUser) throw new Error('User not found');

        setImpersonatedUser(targetUser);

        // Log the impersonation for audit trail
        await supabase
          .from('admin_audit_log')
          .insert({
            admin_user_id: user?.id,
            action: 'impersonate_user',
            target_user_id: userId,
            metadata: {
              target_email: targetUser.email,
              timestamp: new Date().toISOString(),
            },
          });

        // Store impersonation data in session storage
        sessionStorage.setItem('impersonating_user_id', userId);
        sessionStorage.setItem('admin_user_id', user?.id || '');

        // Redirect to dashboard to view as this user
        setIsLoading(false);
        navigate('/dashboard');
      } catch (err) {
        console.error('Impersonation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to start impersonation');
        setIsLoading(false);
      }
    };

    startImpersonation();
  }, [userId, isSuperAdmin, user, navigate]);

  const handleExitGodMode = async () => {
    // Clear impersonation data
    sessionStorage.removeItem('impersonating_user_id');
    sessionStorage.removeItem('admin_user_id');

    // Log the exit
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: user?.id,
        action: 'exit_impersonation',
        target_user_id: userId,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });

    // Refresh auth context and redirect to super admin
    await refetch();
    navigate('/super-admin/users');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Starting impersonation session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Impersonation Failed</h2>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => navigate('/super-admin/users')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Return to User Management
          </button>
        </div>
      </div>
    );
  }

  // Banner component that will be shown when impersonating
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCircle className="w-5 h-5" />
            <span className="font-semibold">
              God Mode Active: Viewing as {impersonatedUser?.first_name} {impersonatedUser?.last_name}
            </span>
            <span className="text-purple-200 text-sm">
              ({impersonatedUser?.email})
            </span>
          </div>
          <button
            onClick={handleExitGodMode}
            className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            Exit God Mode
          </button>
        </div>
      </div>
    </div>
  );
}
