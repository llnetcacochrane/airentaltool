import { useState } from 'react';
import { Mail, CheckCircle, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailVerificationReminderProps {
  email: string;
  onDismiss?: () => void;
}

export function EmailVerificationReminder({ email, onDismiss }: EmailVerificationReminderProps) {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const handleResendEmail = async () => {
    setIsResending(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setMessage({
          type: 'error',
          text: 'Failed to resend verification email. Please try again.',
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Verification email sent! Please check your inbox.',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An error occurred. Please try again later.',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Mail className="h-5 w-5 text-amber-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            Email Verification Required
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>
              We sent a verification email to <strong>{email}</strong>.
              Please check your inbox and click the verification link to activate your account.
            </p>
          </div>

          {message && (
            <div className={`mt-3 p-2 rounded ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={isResending}
              className="text-sm font-medium text-amber-800 hover:text-amber-900 underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? 'Sending...' : 'Resend verification email'}
            </button>
            <span className="text-amber-700">•</span>
            <a
              href="/help"
              className="text-sm font-medium text-amber-800 hover:text-amber-900 underline"
            >
              Need help?
            </a>
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={handleDismiss}
              className="inline-flex text-amber-400 hover:text-amber-500 focus:outline-none"
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
