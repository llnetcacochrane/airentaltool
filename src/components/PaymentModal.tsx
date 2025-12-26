import { useState, useEffect, useRef } from 'react';
import { CreditCard, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { squarePaymentService, SquareConfig } from '../services/squarePaymentService';
import { paypalPaymentService, PayPalConfig } from '../services/paypalPaymentService';
import { SlidePanel } from './SlidePanel';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string, method: 'square' | 'paypal') => void;
  amountCents: number;
  currency?: string;
  organizationId: string;
  tenantId?: string;
  leaseId?: string;
  paymentType?: 'rent' | 'security_deposit' | 'pet_deposit' | 'late_fee' | 'utility' | 'other';
  description?: string;
}

type PaymentMethod = 'card' | 'paypal' | null;

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  amountCents,
  currency = 'USD',
  organizationId,
  tenantId,
  leaseId,
  paymentType = 'rent',
  description,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Payment gateway availability
  const [squareAvailable, setSquareAvailable] = useState(false);
  const [paypalAvailable, setPaypalAvailable] = useState(false);
  const [squareConfig, setSquareConfig] = useState<SquareConfig | null>(null);
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);

  // Square card instance
  const squareCardRef = useRef<any>(null);
  const paypalButtonsRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      checkPaymentGateways();
    }
    return () => {
      cleanup();
    };
  }, [isOpen, organizationId]);

  const cleanup = () => {
    if (squareCardRef.current) {
      try {
        squareCardRef.current.destroy();
      } catch (e) {}
      squareCardRef.current = null;
    }
    if (paypalButtonsRef.current) {
      try {
        paypalButtonsRef.current.close();
      } catch (e) {}
      paypalButtonsRef.current = null;
    }
  };

  const checkPaymentGateways = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check Square
      const sqConfig = await squarePaymentService.getSquareConfig(organizationId);
      if (sqConfig && sqConfig.application_id && sqConfig.location_id) {
        setSquareConfig(sqConfig);
        setSquareAvailable(true);
      }

      // Check PayPal
      const ppConfig = await paypalPaymentService.getPayPalConfig(organizationId);
      if (ppConfig && ppConfig.client_id) {
        setPaypalConfig(ppConfig);
        setPaypalAvailable(true);
      }

      if (!sqConfig && !ppConfig) {
        setError('No payment methods are currently configured. Please contact property management.');
      }
    } catch (err) {
      setError('Failed to load payment options');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSquare = async () => {
    if (!squareConfig) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load SDK
      await squarePaymentService.loadSquareSDK();

      // Create card form
      const card = await squarePaymentService.createCardPaymentForm('square-card-container', squareConfig);
      if (card) {
        squareCardRef.current = card;
      } else {
        setError('Failed to initialize card payment form');
      }
    } catch (err) {
      setError('Failed to initialize Square payment');
    } finally {
      setIsLoading(false);
    }
  };

  const initializePayPal = async () => {
    if (!paypalConfig) return;

    setIsLoading(true);
    setError(null);

    try {
      const buttons = await paypalPaymentService.createPayPalButtons(
        'paypal-button-container',
        organizationId,
        {
          amount_cents: amountCents,
          currency,
          tenant_id: tenantId,
          lease_id: leaseId,
          payment_type: paymentType,
          description,
        },
        (response) => {
          setSuccess(true);
          setIsProcessing(false);
          setTimeout(() => {
            onSuccess(response.order_id || '', 'paypal');
          }, 1500);
        },
        (err) => {
          setError(err);
          setIsProcessing(false);
        },
        () => {
          setIsProcessing(false);
        }
      );

      if (buttons) {
        paypalButtonsRef.current = buttons;
      }
    } catch (err) {
      setError('Failed to initialize PayPal');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMethod === 'card' && squareAvailable) {
      initializeSquare();
    } else if (selectedMethod === 'paypal' && paypalAvailable) {
      initializePayPal();
    }
  }, [selectedMethod]);

  const handleSquarePayment = async () => {
    if (!squareCardRef.current || !squareConfig) return;

    setIsProcessing(true);
    setError(null);

    try {
      const tokenResult = await squarePaymentService.tokenizeCard(squareCardRef.current);

      if ('error' in tokenResult) {
        setError(tokenResult.error);
        setIsProcessing(false);
        return;
      }

      const result = await squarePaymentService.processPayment(organizationId, {
        amount_cents: amountCents,
        currency,
        source_id: tokenResult.token,
        tenant_id: tenantId,
        lease_id: leaseId,
        payment_type: paymentType,
        description,
        idempotency_key: squarePaymentService.generateIdempotencyKey(),
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess(result.payment_id || '', 'square');
        }, 1500);
      } else {
        setError(result.error || 'Payment failed');
      }
    } catch (err) {
      setError('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Make a Payment"
      size="medium"
      footer={
        !success ? (
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-600 hover:text-gray-900 transition"
          >
            Cancel
          </button>
        ) : undefined
      }
    >

          {/* Success State */}
          {success && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600">Your payment of {formatCurrency(amountCents)} has been processed.</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !success && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading payment options...</p>
            </div>
          )}

          {/* Payment Content */}
          {!isLoading && !success && (
            <>
              {/* Amount Display */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Amount Due</span>
                  <span className="text-2xl font-bold text-blue-900">
                    {formatCurrency(amountCents)}
                  </span>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Payment Method Selection */}
              {!selectedMethod && (squareAvailable || paypalAvailable) && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 font-medium">Select payment method:</p>

                  {squareAvailable && (
                    <button
                      onClick={() => setSelectedMethod('card')}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-gray-700" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Credit/Debit Card</p>
                        <p className="text-sm text-gray-500">Visa, Mastercard, Amex, Discover</p>
                      </div>
                    </button>
                  )}

                  {paypalAvailable && (
                    <button
                      onClick={() => setSelectedMethod('paypal')}
                      className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                    >
                      <div className="w-12 h-12 bg-[#0070ba] rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">P</span>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">PayPal</p>
                        <p className="text-sm text-gray-500">Pay with your PayPal account</p>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Square Card Form */}
              {selectedMethod === 'card' && (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      cleanup();
                      setSelectedMethod(null);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    ← Back to payment methods
                  </button>

                  <div id="square-card-container" className="min-h-[100px]"></div>

                  <button
                    onClick={handleSquarePayment}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Pay {formatCurrency(amountCents)}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* PayPal Buttons */}
              {selectedMethod === 'paypal' && (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      cleanup();
                      setSelectedMethod(null);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    ← Back to payment methods
                  </button>

                  <div id="paypal-button-container" className="min-h-[150px]"></div>

                  {isProcessing && (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                      <p className="text-sm text-gray-600 mt-2">Processing payment...</p>
                    </div>
                  )}
                </div>
              )}

              {/* No Payment Methods */}
              {!squareAvailable && !paypalAvailable && !error && (
                <div className="text-center py-6">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Online payment is not currently available. Please contact your property manager for alternative payment options.
                  </p>
                </div>
              )}
            </>
          )}

    </SlidePanel>
  );
}
