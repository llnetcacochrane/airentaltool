import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, KeyRound, RefreshCw, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { Footer } from '../components/Footer';

export function EmailVerificationPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    // Get email from URL params
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }

    // Get return URL if user came from a specific page (e.g., listing application)
    const returnParam = searchParams.get('return');
    if (returnParam) {
      setReturnUrl(decodeURIComponent(returnParam));
    }
  }, [searchParams]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Check if user is already verified (auto-check every 5 seconds)
  useEffect(() => {
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        // User is verified, determine redirect
        await determineRedirectAndNavigate(user.id);
      }
    };

    // Check immediately and then every 5 seconds
    checkVerification();
    const interval = setInterval(checkVerification, 5000);
    return () => clearInterval(interval);
  }, []);

  const determineRedirectAndNavigate = async (userId: string) => {
    try {
      // If we have a return URL (e.g., from listing page), go back there to complete application
      if (returnUrl) {
        navigate(returnUrl);
        return;
      }

      // Otherwise, determine the appropriate dashboard based on user type
      // Check if user is an applicant
      const { data: applicantRecords } = await supabase
        .from('business_users')
        .select('id, role')
        .eq('auth_user_id', userId)
        .eq('role', 'applicant')
        .limit(1);

      if (applicantRecords && applicantRecords.length > 0) {
        // Check if they also own businesses
        const { data: ownedBusinesses } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_user_id', userId)
          .limit(1);

        if (ownedBusinesses && ownedBusinesses.length > 0) {
          navigate('/dashboard');
        } else {
          navigate('/my-applications');
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error determining redirect:', err);
      navigate('/my-applications');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim() || !email) {
      setError('Please enter the verification code from your email');
      return;
    }

    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      // Supabase uses verifyOtp for email verification with token
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode.trim(),
        type: 'email',
      });

      if (verifyError) {
        // Try signup type if email type fails
        const { data: signupData, error: signupError } = await supabase.auth.verifyOtp({
          email,
          token: verificationCode.trim(),
          type: 'signup',
        });

        if (signupError) {
          throw new Error('Invalid verification code. Please check and try again.');
        }

        if (signupData.user) {
          setSuccess('Email verified successfully!');
          setTimeout(() => determineRedirectAndNavigate(signupData.user!.id), 1500);
        }
      } else if (data.user) {
        setSuccess('Email verified successfully!');
        setTimeout(() => determineRedirectAndNavigate(data.user!.id), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setError('Email address not found. Please try signing up again.');
      return;
    }

    setIsResending(true);
    setError('');
    setSuccess('');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (resendError) throw resendError;

      setSuccess('Verification email sent! Please check your inbox.');
      setCountdown(60); // 60 second cooldown
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-blue-600" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Check Your Email
            </h1>
            <p className="text-gray-600 text-center mb-6">
              We've sent a verification email to:
            </p>

            {/* Email Display */}
            {email && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6 text-center">
                <span className="font-medium text-gray-900">{email}</span>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Open the email we just sent you</li>
                <li>Click the verification link in the email</li>
                {returnUrl && (
                  <li className="font-medium">You'll be redirected back to complete your application</li>
                )}
                <li>Or enter the verification code below</li>
              </ol>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Code Entry Section */}
            <div className="space-y-4">
              {!showCodeInput ? (
                <button
                  onClick={() => setShowCodeInput(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  <KeyRound className="w-4 h-4" />
                  Enter Verification Code Instead
                </button>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      id="code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter the code from your email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-center text-lg tracking-widest font-mono"
                      autoComplete="one-time-code"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The code is in your verification email if the link doesn't work
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isVerifying || !verificationCode.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify Email
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Resend Email */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center mb-3">
                  Didn't receive the email? Check your spam folder or
                </p>
                <button
                  onClick={handleResendEmail}
                  disabled={isResending || countdown > 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-blue-300 text-blue-600 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Resend in {countdown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Resend Verification Email
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Help Link */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                Already verified?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
