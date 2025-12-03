import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Send, Check, X, Clock, AlertCircle, Settings as SettingsIcon, Activity } from 'lucide-react';
import { emailService, EmailConfiguration, EmailDiagnosticLog } from '../services/emailService';

export function EmailDiagnostics() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<EmailConfiguration | null>(null);
  const [logs, setLogs] = useState<EmailDiagnosticLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showConfigForm, setShowConfigForm] = useState(false);

  const [provider, setProvider] = useState<'smtp' | 'sendgrid' | 'ses'>('smtp');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('AI Rental Tools');
  const [smtpUseTls, setSmtpUseTls] = useState(true);
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  const [sesAccessKey, setSesAccessKey] = useState('');
  const [sesSecretKey, setSesSecretKey] = useState('');
  const [sesRegion, setSesRegion] = useState('us-east-1');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [configData, logsData, statsData] = await Promise.all([
        emailService.getConfiguration(),
        emailService.getDiagnosticLogs(20),
        emailService.getRecentTestResults(),
      ]);
      setConfig(configData);
      setLogs(logsData);
      setStats(statsData);

      if (configData) {
        setProvider(configData.provider);
        if (configData.provider === 'smtp') {
          setSmtpHost(configData.smtp_host || '');
          setSmtpPort(String(configData.smtp_port || 587));
          setSmtpUser(configData.smtp_user || '');
          setSmtpFromEmail(configData.smtp_from_email || '');
          setSmtpFromName(configData.smtp_from_name || 'AI Rental Tools');
          setSmtpUseTls(configData.smtp_use_tls);
        }
      }
    } catch (error) {
      console.error('Failed to load email data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const configData: any = {
        provider,
      };

      if (provider === 'smtp') {
        configData.smtp_host = smtpHost;
        configData.smtp_port = parseInt(smtpPort);
        configData.smtp_user = smtpUser;
        configData.smtp_password = smtpPassword;
        configData.smtp_from_email = smtpFromEmail;
        configData.smtp_from_name = smtpFromName;
        configData.smtp_use_tls = smtpUseTls;
      } else if (provider === 'sendgrid') {
        configData.sendgrid_api_key = sendgridApiKey;
        configData.smtp_from_email = smtpFromEmail;
        configData.smtp_from_name = smtpFromName;
      } else if (provider === 'ses') {
        configData.ses_access_key = sesAccessKey;
        configData.ses_secret_key = sesSecretKey;
        configData.ses_region = sesRegion;
        configData.smtp_from_email = smtpFromEmail;
        configData.smtp_from_name = smtpFromName;
      }

      await emailService.createConfiguration(configData);
      setShowConfigForm(false);
      await loadData();
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    try {
      await emailService.testConfiguration(testEmail);
      setTestEmail('');
      await loadData();
    } catch (error) {
      console.error('Failed to test email:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/super-admin/config')}
            className="flex items-center gap-2 text-blue-100 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to System Configuration
          </button>
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Email System Diagnostics</h1>
              <p className="text-blue-100 mt-1">Configure and test email delivery</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Tests (7d)</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_tests}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <Check className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Successful</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.successful_tests}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <X className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.failed_tests}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Avg Response</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.average_response_time}ms</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Current Configuration</h2>
                <button
                  onClick={() => setShowConfigForm(!showConfigForm)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <SettingsIcon className="w-4 h-4" />
                  {config ? 'Update Config' : 'Add Config'}
                </button>
              </div>
            </div>
            <div className="p-6">
              {config ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Provider</p>
                    <p className="font-semibold">{emailService.getProviderDisplayName(config.provider)}</p>
                  </div>
                  {config.provider === 'smtp' && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">SMTP Host</p>
                        <p className="font-semibold">{config.smtp_host}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">SMTP Port</p>
                        <p className="font-semibold">{config.smtp_port}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">From Email</p>
                        <p className="font-semibold">{config.smtp_from_email}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        config.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {config.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {config.last_test_at && (
                    <div>
                      <p className="text-sm text-gray-600">Last Tested</p>
                      <p className="font-semibold">{new Date(config.last_test_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">No email configuration found. Please add one to enable email features.</p>
              )}

              {showConfigForm && (
                <form onSubmit={handleSaveConfig} className="mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Provider</label>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="smtp">SMTP</option>
                        <option value="sendgrid">SendGrid</option>
                        <option value="ses">Amazon SES</option>
                      </select>
                    </div>

                    {provider === 'smtp' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                          <input
                            type="text"
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            placeholder="smtp.example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                            <input
                              type="number"
                              value={smtpPort}
                              onChange={(e) => setSmtpPort(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              required
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={smtpUseTls}
                                onChange={(e) => setSmtpUseTls(e.target.checked)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm font-medium text-gray-700">Use TLS</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username</label>
                          <input
                            type="text"
                            value={smtpUser}
                            onChange={(e) => setSmtpUser(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
                          <input
                            type="password"
                            value={smtpPassword}
                            onChange={(e) => setSmtpPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                          />
                        </div>
                      </>
                    )}

                    {provider === 'sendgrid' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">SendGrid API Key</label>
                        <input
                          type="password"
                          value={sendgridApiKey}
                          onChange={(e) => setSendgridApiKey(e.target.value)}
                          placeholder="SG...."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                    )}

                    {provider === 'ses' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">AWS Access Key</label>
                          <input
                            type="text"
                            value={sesAccessKey}
                            onChange={(e) => setSesAccessKey(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">AWS Secret Key</label>
                          <input
                            type="password"
                            value={sesSecretKey}
                            onChange={(e) => setSesSecretKey(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">AWS Region</label>
                          <input
                            type="text"
                            value={sesRegion}
                            onChange={(e) => setSesRegion(e.target.value)}
                            placeholder="us-east-1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                      <input
                        type="email"
                        value={smtpFromEmail}
                        onChange={(e) => setSmtpFromEmail(e.target.value)}
                        placeholder="noreply@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                      <input
                        type="text"
                        value={smtpFromName}
                        onChange={(e) => setSmtpFromName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save Configuration
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfigForm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Test Email Delivery</h2>
            </div>
            <div className="p-6">
              {config ? (
                <form onSubmit={handleTestEmail} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Test Email Address</label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                  >
                    <Send className="w-4 h-4" />
                    {isTesting ? 'Sending...' : 'Send Test Email'}
                  </button>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Test Email Contents:</p>
                        <p>A test email will be sent to verify your configuration is working correctly. Check your inbox (and spam folder) for the test message.</p>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <p className="text-gray-600">Configure email settings first to test email delivery.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Test History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date/Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Response Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.recipient_email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.provider_used ? emailService.getProviderDisplayName(log.provider_used) : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {log.response_time_ms ? `${log.response_time_ms}ms` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No test history yet. Send a test email to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
