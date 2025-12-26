import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Mail, Plus, Trash2, Key, ExternalLink, RefreshCw, Check, X, Eye, EyeOff } from 'lucide-react';
import { SuperAdminLayout } from '../components/SuperAdminLayout';
import { SlidePanel } from '../components/SlidePanel';

interface EmailAccount {
  id: number;
  email: string;
  display_name: string | null;
  quota_bytes: number;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

interface Domain {
  id: number;
  name: string;
  is_active: boolean;
}

export function EmailAccounts() {
  const navigate = useNavigate();
  const { supabaseUser } = useAuth();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);

  // Create form state
  const [newUsername, setNewUsername] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    try {
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', supabaseUser?.id)
        .eq('is_active', true)
        .single();

      if (!superAdmin) {
        navigate('/dashboard');
        return;
      }

      await loadData();
    } catch (error) {
      console.error('Access check failed:', error);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // Load domains
      const { data: domainsData } = await supabase
        .from('virtual_domains')
        .select('*')
        .order('name');

      setDomains(domainsData || []);
      if (domainsData && domainsData.length > 0) {
        setNewDomain(domainsData[0].name);
      }

      // Load email accounts
      const { data: accountsData } = await supabase
        .from('virtual_mailboxes')
        .select('*')
        .order('email');

      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleCreateAccount = async () => {
    if (!newUsername || !newDomain || !newPassword) {
      alert('Please fill in all required fields');
      return;
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-email-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'create',
          username: newUsername,
          domain: newDomain,
          password: newPassword,
          display_name: newDisplayName || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account');
      }

      alert('Email account created successfully!');
      setShowCreatePanel(false);
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      await loadData();
    } catch (error: any) {
      console.error('Failed to create account:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (account: EmailAccount) => {
    if (!confirm(`Are you sure you want to delete ${account.email}? This will permanently delete all emails.`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-email-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'delete',
          account_id: account.id,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      alert('Email account deleted successfully');
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedAccount || !newPassword) {
      alert('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-email-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'change_password',
          account_id: selectedAccount.id,
          password: newPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to change password');
      }

      alert('Password changed successfully!');
      setShowPasswordPanel(false);
      setSelectedAccount(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (account: EmailAccount) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-email-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'toggle_active',
          account_id: account.id,
          is_active: !account.is_active,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update account');
      }

      await loadData();
    } catch (error: any) {
      console.error('Failed to toggle account:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading email accounts...</p>
      </div>
    );
  }

  const actionButton = (
    <div className="flex gap-2">
      <a
        href="https://webmail.airentaltool.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition font-semibold"
      >
        <ExternalLink className="w-5 h-5" />
        Open Webmail
      </a>
      <button
        onClick={() => setShowCreatePanel(true)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition font-semibold"
      >
        <Plus className="w-5 h-5" />
        Create Email Account
      </button>
    </div>
  );

  return (
    <SuperAdminLayout
      title="Email Accounts"
      subtitle="Manage email accounts for airentaltool.com"
      actionButton={actionButton}
    >
      {/* Create Account Panel */}
      <SlidePanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        title="Create Email Account"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <div className="flex">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg"
                placeholder="username"
              />
              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                @{newDomain}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domain
            </label>
            <select
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {domains.map((domain) => (
                <option key={domain.id} value={domain.name}>
                  {domain.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg pr-10"
                placeholder="Min 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Support Team"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowCreatePanel(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateAccount}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </SlidePanel>

      {/* Change Password Panel */}
      <SlidePanel
        isOpen={showPasswordPanel}
        onClose={() => {
          setShowPasswordPanel(false);
          setSelectedAccount(null);
          setNewPassword('');
        }}
        title={`Change Password: ${selectedAccount?.email}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg pr-10"
                placeholder="Min 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 mt-6">
          <button
            onClick={() => {
              setShowPasswordPanel(false);
              setSelectedAccount(null);
              setNewPassword('');
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleChangePassword}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </SlidePanel>

      {/* Email Accounts Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Email Accounts</h2>
            <p className="text-sm text-gray-600 mt-1">{accounts.length} accounts</p>
          </div>
          <button
            onClick={loadData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No email accounts yet</p>
            <button
              onClick={() => setShowCreatePanel(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Account
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Email Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Display Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Quota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{account.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {account.display_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatBytes(account.quota_bytes)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(account)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          account.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {account.is_active ? (
                          <>
                            <Check className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            Disabled
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(account.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedAccount(account);
                            setShowPasswordPanel(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Change Password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Access Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Webmail Access</h3>
        <p className="text-blue-800 text-sm mb-2">
          Users can access their email at: <a href="https://webmail.airentaltool.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">https://webmail.airentaltool.com</a>
        </p>
        <p className="text-blue-700 text-sm">
          IMAP: mail.airentaltool.com:993 (SSL) | SMTP: mail.airentaltool.com:587 (STARTTLS)
        </p>
      </div>
    </SuperAdminLayout>
  );
}
