import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Activity } from 'lucide-react';

export function DiagnosticPanel() {
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnostics: any[] = [];

    // Test 1: Get current user
    try {
      const { data, error } = await supabase.auth.getUser();
      diagnostics.push({
        test: 'Get Current User',
        status: error ? 'fail' : 'pass',
        message: error ? error.message : `User: ${data.user?.email}`,
        data: data.user,
      });
    } catch (err) {
      diagnostics.push({
        test: 'Get Current User',
        status: 'fail',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // Test 2: Check super admin status
    try {
      const { data, error } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_active', true)
        .maybeSingle();

      diagnostics.push({
        test: 'Check Super Admin Status',
        status: error ? 'fail' : data ? 'pass' : 'warn',
        message: error ? error.message : data ? 'You are a super admin' : 'Not a super admin',
        data,
      });
    } catch (err) {
      diagnostics.push({
        test: 'Check Super Admin Status',
        status: 'fail',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // Test 3: Call check_my_super_admin_status
    try {
      const { data, error } = await supabase.rpc('check_my_super_admin_status');
      diagnostics.push({
        test: 'RPC: check_my_super_admin_status',
        status: error ? 'fail' : 'pass',
        message: error ? error.message : 'Success',
        data,
      });
    } catch (err) {
      diagnostics.push({
        test: 'RPC: check_my_super_admin_status',
        status: 'fail',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // Test 4: Get my organizations
    try {
      const { data, error } = await supabase.rpc('get_my_organizations');
      diagnostics.push({
        test: 'RPC: get_my_organizations',
        status: error ? 'fail' : 'pass',
        message: error ? error.message : `Found ${data?.length || 0} organizations`,
        data,
      });
    } catch (err) {
      diagnostics.push({
        test: 'RPC: get_my_organizations',
        status: 'fail',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // Test 5: Get all users (super admin only)
    try {
      const { data, error } = await supabase.rpc('get_all_users_with_orgs');
      diagnostics.push({
        test: 'RPC: get_all_users_with_orgs',
        status: error ? 'fail' : 'pass',
        message: error ? error.message : `Found ${data?.length || 0} users`,
        data: data?.slice(0, 3), // Only show first 3
      });
    } catch (err) {
      diagnostics.push({
        test: 'RPC: get_all_users_with_orgs',
        status: 'fail',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // Test 6: Get all organizations (super admin only)
    try {
      const { data, error } = await supabase.rpc('get_all_organizations_for_admin');
      diagnostics.push({
        test: 'RPC: get_all_organizations_for_admin',
        status: error ? 'fail' : 'pass',
        message: error ? error.message : `Found ${data?.length || 0} organizations`,
        data,
      });
    } catch (err) {
      diagnostics.push({
        test: 'RPC: get_all_organizations_for_admin',
        status: 'fail',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    setResults(diagnostics);
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">System Diagnostics</h1>
          <p className="text-gray-600 mb-4">
            Run diagnostics to check your authentication and super admin status.
          </p>
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
          >
            <Activity size={20} />
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                  result.status === 'pass'
                    ? 'border-green-500'
                    : result.status === 'warn'
                    ? 'border-yellow-500'
                    : 'border-red-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.status === 'pass' ? (
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{result.test}</h3>
                    <p className={`text-sm mb-2 ${
                      result.status === 'pass'
                        ? 'text-green-700'
                        : result.status === 'warn'
                        ? 'text-yellow-700'
                        : 'text-red-700'
                    }`}>
                      {result.message}
                    </p>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                          View Data
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
