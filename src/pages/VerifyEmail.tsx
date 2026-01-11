import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Loader2, ArrowRight, FileText, Home } from 'lucide-react';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'already-verified'>('verifying');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [isApplicant, setIsApplicant] = useState(false);
  const [redirectPath, setRedirectPath] = useState('/login');

  useEffect(() => {
    verifyEmail();
  }, []);

  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0) {
      navigate(redirectPath);
    }
  }, [status, countdown, navigate, redirectPath]);

  const verifyEmail = async () => {
    try {
      // Get token from URL or hash
      const token = searchParams.get('token') || window.location.hash.split('access_token=')[1]?.split('&')[0];
      const type = searchParams.get('type');

      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email and try again.');
        return;
      }

      if (type === 'signup') {
        // This is handled automatically by Supabase Auth
        // The token in the URL confirms the email
        const { data: userData, error } = await supabase.auth.getUser();

        if (error) {
          setStatus('error');
          setMessage('Email verification failed. The link may have expired.');
        } else {
          // Check if user is an applicant (has business_users records with applicant role)
          if (userData?.user) {
            const { data: businessUserRecords } = await supabase
              .from('business_users')
              .select('id, role')
              .eq('auth_user_id', userData.user.id)
              .eq('role', 'applicant')
              .limit(1);

            if (businessUserRecords && businessUserRecords.length > 0) {
              // User is an applicant - redirect to applications portal
              setIsApplicant(true);
              setRedirectPath('/my-applications');
              setMessage('Your email has been verified! You can now view your applications.');
            } else {
              // Check if they're a business owner
              const { data: ownedBusinesses } = await supabase
                .from('businesses')
                .select('id')
                .eq('owner_user_id', userData.user.id)
                .limit(1);

              if (ownedBusinesses && ownedBusinesses.length > 0) {
                setRedirectPath('/dashboard');
                setMessage('Your email has been verified! You can now access your dashboard.');
              } else {
                setMessage('Your email has been verified successfully!');
              }
            }
          } else {
            setMessage('Your email has been verified successfully!');
          }
          setStatus('success');
        }
      } else {
        setStatus('success');
        setMessage('Your email has been verified!');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage('An unexpected error occurred during verification.');
    }
  };

  const handleResendEmail = async () => {
    try {
      const email = searchParams.get('email');
      if (!email) {
        setMessage('Cannot resend verification email. Email address not found.');
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setMessage('Failed to resend verification email. Please try again.');
      } else {
        setMessage('Verification email sent! Please check your inbox.');
        setStatus('success');
      }
    } catch (error) {
      setMessage('An error occurred while resending the email.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Status Icon */}
          <div className="flex items-center justify-center mb-6">
            {status === 'verifying' && (
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
            {status === 'verifying' && 'Verifying Your Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </h1>

          {/* Message */}
          <p className="text-gray-600 text-center mb-6">
            {status === 'verifying' && 'Please wait while we verify your email address...'}
            {status === 'success' && message}
            {status === 'error' && message}
          </p>

          {/* Success - Auto redirect countdown */}
          {status === 'success' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-sm text-green-800">
                  Redirecting in {countdown} seconds...
                </p>
              </div>
              {isApplicant ? (
                <button
                  onClick={() => navigate('/my-applications')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  <FileText className="w-4 h-4" />
                  View My Applications
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : redirectPath === '/dashboard' ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Continue to Login
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Error - Resend option */}
          {status === 'error' && (
            <div className="space-y-4">
              <button
                onClick={handleResendEmail}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Resend Verification Email
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Help text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Need help?{' '}
              <a href="/help" className="text-blue-600 hover:text-blue-700 underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
